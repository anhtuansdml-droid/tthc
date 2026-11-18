import crypto from 'node:crypto';

export const config={maxDuration:60};
const DVC_API='https://dichvucong.gov.vn/api/v1/submitting/formality/list-all-public-formality-by-citizen';
const CATALOG='data/tthc-live.json';
const REPORT='data/tthc-verify.json';

function settings(){
 const token=String(process.env.GITHUB_TOKEN||'').trim();
 if(!token)throw new Error('Thiếu GITHUB_TOKEN. Không thể đọc dữ liệu kiểm tra.');
 return {token,repo:String(process.env.GITHUB_REPO||'anhtuansdml-droid/tthc').trim(),branch:'main'};
}
function authValid(req){
 const auth=String(req.headers.authorization||'');
 const supplied=auth.startsWith('Bearer ')?auth.slice(7):'';
 const p=supplied.split('.');
 if(p.length!==3||p[0]!=='admin'||!process.env.ADMIN_PASSWORD)return false;
 const exp=Number(p[1]);
 if(!Number.isFinite(exp)||exp<Date.now())return false;
 const original=p[0]+'.'+p[1];
 const expected=crypto.createHmac('sha256',process.env.ADMIN_PASSWORD).update(original).digest('base64url');
 const a=Buffer.from(p[2]),b=Buffer.from(expected);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function headers(token){return {Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'TTHC-Muong-Lay-Verify'}}
async function githubRead(path){
 const s=settings();
 const r=await fetch('https://api.github.com/repos/'+s.repo+'/contents/'+path+'?ref='+s.branch,{cache:'no-store',headers:headers(s.token)});
 if(r.status===404)return {data:null,sha:null};
 if(!r.ok)throw new Error('Không đọc được '+path+' trên GitHub (HTTP '+r.status+').');
 const v=await r.json();
 return {data:JSON.parse(Buffer.from(String(v.content||'').replace(/\s/g,''),'base64').toString('utf8')),sha:v.sha};
}
async function githubWrite(path,obj,expectedSha=null){
 const s=settings();
 const old=await githubRead(path);
 if(expectedSha!==null&&old.sha!==expectedSha)throw new Error('Danh mục đã thay đổi trong lúc đối chiếu. Không ghi đè bộ dữ liệu mới; hãy kiểm tra lại.');
 const p={branch:s.branch,message:'Luu bao cao doi chieu TTHC voi Cong DVCQG',content:Buffer.from(JSON.stringify(obj,null,2)+'\n','utf8').toString('base64')};
 if(old.sha)p.sha=old.sha;
 const r=await fetch('https://api.github.com/repos/'+s.repo+'/contents/'+path,{method:'PUT',headers:headers(s.token),body:JSON.stringify(p)});
 if(!r.ok){const x=await r.json().catch(()=>({}));throw new Error('Không lưu được kết quả đối chiếu: '+(x.message||r.status))}
}
function norm(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function codeKey(v){return String(v??'').trim().toLowerCase().replace(/\s+/g,'')}
function fields(item,keys){for(const key of keys){const v=item?.[key];if(v!==undefined&&v!==null&&String(v).trim())return String(v).trim()}return ''}
function records(payload){
 if(Array.isArray(payload))return payload;
 for(const key of ['items','rows','procedures','results','list','records','content','data']){
  const v=payload?.[key];
  if(Array.isArray(v))return v;
  if(v&&typeof v==='object'){
   const a=records(v);
   if(a.length)return a;
  }
 }
 return [];
}
function cursor(payload){
 for(const item of [payload,payload?.data,payload?.result]){
  if(!item||typeof item!=='object')continue;
  for(const key of ['nextCursor','lastId','nextId','nextPageToken']){
   if(item[key]!==undefined&&item[key]!==null&&String(item[key]).trim())return String(item[key]);
  }
 }
 return '';
}
async function page(lastId){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),7000);
 try{
  const r=await fetch(DVC_API,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',Accept:'application/json','User-Agent':'TTHC-Muong-Lay/1.0'},body:JSON.stringify({limit:100,lastId,q:'',categoryId:'',departmentCode:'H18.111'})});
  if(!r.ok)throw new Error('Cổng DVCQG phản hồi HTTP '+r.status+'.');
  const body=await r.json().catch(()=>{throw new Error('Cổng DVCQG không trả dữ liệu JSON. Có thể hệ thống đang giới hạn truy cập.')});
  if(body?.success===false||body?.error)throw new Error('Cổng DVCQG thông báo lỗi khi lấy danh mục.');
  return body;
 }finally{clearTimeout(timer)}
}
function officialURL(item){
 const raw=fields(item,['sourceUrl','source_url','url','detailUrl','citizenUrl']);
 if(raw){try{const u=new URL(raw);if(u.protocol==='https:'&&(u.hostname==='dichvucong.gov.vn'||u.hostname.endsWith('.dichvucong.gov.vn')))return u.href}catch(_){}}
 const fid=fields(item,['formalityId','formality_id','formalityUUID','formalityUuid','uuid','id']);
 return /^[0-9a-f-]{30,40}$/i.test(fid)?'https://dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?formalityId='+encodeURIComponent(fid):'';
}
async function verify(){
 const catalogFile=await githubRead(CATALOG);
 const snapshot=catalogFile.data;
 if(!snapshot||!Array.isArray(snapshot.procedures)||!snapshot.procedures.length)throw new Error('Chưa có danh mục Excel được lưu. Hãy nhập file trước khi đối chiếu.');
 const local=snapshot.procedures;
 const remote=[];
 let lastId='',finished=false,pages=0;
 const seenCursors=new Set();
 for(let i=0;i<7;i++){
  const body=await page(lastId);
  const rows=records(body);
  pages++;
  if(!Array.isArray(rows))throw new Error('Cấu trúc phản hồi Cổng DVCQG không hợp lệ.');
  remote.push(...rows);
  // API có thể trả lastId hoặc chỉ trả id của bản ghi cuối làm con trỏ.
  const next=cursor(body)||fields(rows[rows.length-1],['id','formalityId','_id']);
  if(rows.length<100||body?.hasMore===false||body?.data?.hasMore===false){finished=true;break}
  if(!next||next===lastId||seenCursors.has(next))break;
  seenCursors.add(next);
  lastId=next;
 }
 if(!remote.length)throw new Error('Cổng DVCQG không trả về bản ghi nào. Không thể kết luận thủ tục không tồn tại.');
 const byCode=new Map();
 for(const item of remote){
  const code=fields(item,['code','ma','maTTHC','maThuTuc','formalityCode','procedureCode','formality_code','codeFormality']);
  if(!code)continue;
  const k=codeKey(code);
  if(!byCode.has(k))byCode.set(k,[]);
  byCode.get(k).push(item);
 }
 if(!byCode.size)throw new Error('Phản hồi Cổng DVCQG không có mã TTHC để đối chiếu; không ghi nhận kết quả.');
 const results=local.map(item=>{
  const ma=String(item.ma??'').trim(),ten=String(item.ten??'').trim();
  const options=byCode.get(codeKey(ma))||[];
  if(!options.length)return {ma,ten,status:finished?'chua_tim_thay':'chua_xac_minh',detail:'Không có mã tương ứng trong dữ liệu Cổng trả về.'};
  const match=options.find(x=>norm(fields(x,['name','ten','tenTTHC','procedureName','formalityName','title']))===norm(ten));
  const candidate=match||options[0];
  const nationalName=fields(candidate,['name','ten','tenTTHC','procedureName','formalityName','title']);
  const uuid=fields(candidate,['formalityId','formality_id','formalityUuid','formalityUUID','uuid','id']);
  const status=!nationalName?'khop_ma':match?'khop':'khac_ten';
  const preferred=fields(candidate,['submitUrl','onlineSubmissionUrl','applyUrl','registrationUrl','filingUrl','onlineServiceUrl']);
  let url='',linkType='';
  if(status==='khop'){
   const proposal=preferred||officialURL(candidate);
   try{
    const target=new URL(proposal);
    const officialHost=target.hostname==='dichvucong.gov.vn'||target.hostname.endsWith('.dichvucong.gov.vn');
    const formalityId=target.searchParams.get('formalityId')||target.searchParams.get('formalityCaseId');
    const specificPath=/\/(?:thu-tuc-hanh-chinh|nop-ho-so|thuc-hien-dich-vu|submit|apply)\/[0-9a-z-]{15,}/i.test(target.pathname);
    const submissionPath=/\/(?:nop-ho-so|thuc-hien-dich-vu|submit|apply)(?:\/|$)/i.test(target.pathname);
    // Không tạo QR cho trang chủ hoặc trang tìm kiếm chung thiếu định danh TTHC.
    if(target.protocol==='https:'&&officialHost&&(formalityId||specificPath||(preferred&&submissionPath))){
     url=target.toString();
     linkType=preferred&&submissionPath?'nop_ho_so':'tra_cuu';
    }
   }catch(_){}
  }
  return {ma,ten,status,tenDVCQG:nationalName,dvcqgId:status==='khop'?uuid:'',url,linkType};
 });
 const counts={khop:0,khop_ma:0,khac_ten:0,chua_tim_thay:0,chua_xac_minh:0};
 for(const row of results)counts[row.status]++;
 const verifiedAt=new Date().toISOString();
 const linked=results.filter(x=>x.status==='khop'&&x.url).length;
 const submitLinks=results.filter(x=>x.status==='khop'&&x.url&&x.linkType==='nop_ho_so').length;
 const report={ok:true,verifiedAt,catalogHash:snapshot.meta?.catalogHash||'',total:local.length,
   remoteRows:remote.length,pages,complete:finished,source:DVC_API,counts,linked,submitLinks,
   warning:finished?'':'Cổng DVCQG chưa xác nhận đã trả hết các trang. Thủ tục chưa tìm thấy chỉ được đánh dấu chưa xác minh; không suy luận thủ tục đã bãi bỏ.',
   results};
 // Cập nhật URL & UUID từng thủ tục vào dữ liệu DÙNG CHUNG, không chỉ lưu báo cáo.
 // Mỗi URL chỉ được gắn khi khớp chính xác cả mã và tên trên Cổng.
 const matchByCode=new Map(results.map(x=>[x.ma,x]));
 const updated=snapshot.procedures.map(item=>{
   const match=matchByCode.get(item.ma);
   const approved=match?.status==='khop'&&!!match.url;
   return {...item,
     url:approved?match.url:'',
     dvcqgId:approved?match.dvcqgId:'',
     urlNopHoSo:approved&&match.linkType==='nop_ho_so'?match.url:'',
     linkStatus:approved?'khop':(match?.status||'chua_xac_minh'),
     linkType:approved?match.linkType:'',
     linkCheckedAt:verifiedAt};
 });
 const updatedCatalog={...snapshot,procedures:updated,
  meta:{...(snapshot.meta||{}),verified:true,verifiedAt,linked,submitLinks,verification:'Đối chiếu theo mã và tên trên Cổng DVCQG'}};
 await githubWrite(CATALOG,updatedCatalog,catalogFile.sha);
 await githubWrite(REPORT,report);
 return report;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET'){
   const report=(await githubRead(REPORT)).data;
   const current=(await githubRead(CATALOG)).data;
   if(!report||report.catalogHash!==current?.meta?.catalogHash)return res.status(200).json({ok:true,verified:false,message:'Chưa đối chiếu danh mục vừa tải.'});
   return res.status(200).json({...report,verified:true});
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,message:'Phương thức không hỗ trợ.'});
  if(!authValid(req))return res.status(401).json({ok:false,message:'Phiên quản trị không hợp lệ.'});
  return res.status(200).json(await verify());
 }catch(e){
  console.error('TTHC_VERIFY_ERROR',e?.message||String(e));
  return res.status(502).json({ok:false,message:e?.message||'Không thể đối chiếu Cổng DVCQG. Danh mục đã nhập vẫn được giữ nguyên.'});
 }
}
