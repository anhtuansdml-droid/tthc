import crypto from 'node:crypto';

const DVC_API='https://dichvucong.gov.vn/api/v1/submitting/formality/list-all-public-formality-by-citizen';
const STATIC_DATA='https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/tthc_430_2026-10-20.json';
const LIVE_PATH='data/tthc-live.json';
const META_PATH='data/tthc-sync-meta.json';
const DVC_DETAIL_BASE='https://dichvucong.gov.vn/thu-tuc-hanh-chinh/';
// Nguồn CSV mà Điều phối đang dùng cho Điện Biên (gid 226385689).
const DIEUPHOI_CSV='https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=226385689&single=true&output=csv';
const EXPECTED_TOTAL=428;

function json(res,status,body){return res.status(status).json(body)}
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function tokenValid(req){const auth=req.headers.authorization||'';const supplied=auth.startsWith('Bearer ')?auth.slice(7):'';if(process.env.CRON_SECRET&&supplied===process.env.CRON_SECRET)return true;if(!supplied)return false;const p=supplied.split('.');if(p.length!==3||p[0]!=='admin')return false;const exp=Number(p[1]);if(!Number.isFinite(exp)||exp<Date.now())return false;const payload=`${p[0]}.${p[1]}`;const expected=crypto.createHmac('sha256',process.env.ADMIN_PASSWORD||'').update(payload).digest('base64url');const a=Buffer.from(p[2]),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function githubSettings(){
 const token=String(process.env.GITHUB_TOKEN||'').trim();
 if(!token)throw new Error('Chưa cấu hình GITHUB_TOKEN trên Vercel.');
 return {token,repo:String(process.env.GITHUB_REPO||'anhtuansdml-droid/tthc').trim(),branch:'main'};
}
async function readSnapshot(){
 const {token,repo,branch}=githubSettings();
 const url='https://api.github.com/repos/'+repo+'/contents/'+LIVE_PATH+'?ref='+encodeURIComponent(branch);
 const r=await fetch(url,{cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'TTHC-Muong-Lay-Sync'}});
 if(r.status===404)return null;
 if(!r.ok)throw new Error('Không đọc được bộ danh mục lưu trên GitHub (HTTP '+r.status+').');
 const item=await r.json();
 const data=JSON.parse(Buffer.from(String(item.content||'').replace(/\s/g,''),'base64').toString('utf8'));
 if(Array.isArray(data))return {procedures:data,meta:{ok:true,total:data.length,mode:'legacy'}};
 if(!data||!Array.isArray(data.procedures))throw new Error('Bản danh mục GitHub bị lỗi cấu trúc, không tự ghi đè.');
 return data;
}
async function getBlob(path){
 const snapshot=await readSnapshot();
 if(!snapshot)return null;
 if(path===LIVE_PATH)return snapshot.procedures;
 if(path===META_PATH)return snapshot.meta||null;
 return null;
}
async function getJson(url,timeout=15000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',redirect:'follow',signal:c.signal,headers:{'user-agent':'TTHC-Muong-Lay/1.0'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(t)}}
async function getText(url,timeout=15000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',redirect:'follow',signal:c.signal,headers:{'user-agent':'TTHC-Muong-Lay/1.0'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text()}finally{clearTimeout(t)}}
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(quoted){if(ch==='"'&&next==='"'){cell+='"';i++;continue}if(ch==='"'){quoted=false;continue}cell+=ch;continue}if(ch==='"'){quoted=true;continue}if(ch===','){row.push(cell);cell='';continue}if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';continue}if(ch==='\r')continue;cell+=ch}if(cell!==''||row.length){row.push(cell);rows.push(row)}if(!rows.length)return[];const headers=rows[0].map(x=>String(x||'').replace(/^\uFEFF/, '').trim());return rows.slice(1).filter(r=>r.some(x=>String(x||'').trim()!=='')).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]??'');return o})}
function key(v){return norm(v).replace(/[^a-z0-9]+/g,'')}
function first(obj,aliases){const ks=Object.keys(obj||{});const wanted=aliases.map(key);const k=ks.find(x=>wanted.includes(key(x)));return k===undefined?'':obj[k]}
function mapRow(row,old={}){const ma=String(first(row,['MaTTHC','Mã TTHC','Ma TTHC','code','ma','MaThuTuc','Ma thu tuc'])||old.ma||'').trim();const ten=String(first(row,['TenTTHC','Tên TTHC','Ten TTHC','Tên thủ tục hành chính','procedureName','name','ten'])||old.ten||'').trim();const uuid=String(first(row,['DVCQGId','UUID','DVCQG ID','dvcqgId','formalityUuid','formalityUUID'])||old.dvcqgId||'').trim();const agency=String(first(row,['TenCQTH','Tên CQTH','Cơ quan thực hiện','Co quan thuc hien','executingAgencies','executingAgency','coQuanThucHien'])||old.coQuanThucHien||'').trim();const agencyCode=String(first(row,['MaCQTH','Mã CQTH','Mã cơ quan','Ma co quan','departmentCode','maCoQuan'])||old.maCoQuan||'').trim();const mucDo=String(first(row,['MucDo','Mức độ','Muc do','Mức độ dịch vụ công','Dịch vụ công','DVC','serviceLevel','onlineLevel','mucDichVu'])||old.mucDichVu||old.mucDo||'Chưa cung cấp DVC').trim();return {...old,ma,ten,linhVuc:String(first(row,['LinhVuc','Lĩnh vực','Linh vuc','categoryName','category'])||old.linhVuc||'Chưa xác định').trim(),coQuanChuTri:String(first(row,['CoQuanChuTri','Cơ quan chủ trì','Co quan chu tri','departmentPromulgate'])||old.coQuanChuTri||'').trim(),cap:String(first(row,['CapThucHien','Cấp thực hiện','Cap thuc hien','executionLevel','level'])||old.cap||'Cấp Xã').trim(),loai:String(first(row,['LoaiTTHC','Loại thủ tục','Loai thu tuc','procedureType','type'])||old.loai||'TTHC Tiêu chuẩn').trim(),mucDo:String(first(row,['MucDo','Mức độ','Muc do','serviceType'])||old.mucDo||mucDo).trim(),maThucHien:String(first(row,['MaThucHien','Mã thực hiện','Ma thuc hien','executionCode'])||old.maThucHien||ma).trim(),coQuanThucHien:agency||old.coQuanThucHien||'UBND phường Mường Lay',maCoQuan:agencyCode||old.maCoQuan||'H18.111',mucDichVu:mucDo,dvcqgId:uuid,url:String(first(row,['CitizenURL','Citizen Url','URL','url','Link'])||old.url||(uuid?DVC_DETAIL_BASE+encodeURIComponent(uuid):'')).trim(),trangThai:String(first(row,['TrangThai','Trạng thái','Trang thai','status'])||old.trangThai||'Chính thức').trim(),nguon:'Dữ liệu Điều phối DVC - CSV Điện Biên'}}
function filterMoungLay(rows){const mapped=rows.map(r=>mapRow(r,{})).filter(x=>x.ma&&x.ten);const hasAgency= mapped.some(x=>x.maCoQuan==='H18.111'||norm(x.coQuanThucHien).includes('mường lay')||norm(x.coQuanThucHien).includes('muong lay'));if(!hasAgency)return mapped;return mapped.filter(x=>x.maCoQuan==='H18.111'||norm(x.coQuanThucHien).includes('mường lay')||norm(x.coQuanThucHien).includes('muong lay')).filter(x=>!norm(x.coQuanThucHien).includes('ban chqs')&&!norm(x.coQuanThucHien).includes('ban chi huy quan su'))}
function preserveCurrentSet(data,oldData){if(data.length===EXPECTED_TOTAL)return data;const oldCodes=new Set(oldData.map(x=>String(x.ma||'').trim()).filter(Boolean));if(data.length>EXPECTED_TOTAL)return data.filter(x=>oldCodes.has(x.ma));return data}
async function syncFromDieuphoi(oldData){const text=await getText(DIEUPHOI_CSV,20000);const sourceRows=parseCSV(text);if(!sourceRows.length)throw new Error('Nguồn Điều phối trả về CSV rỗng.');let data=filterMoungLay(sourceRows);data=preserveCurrentSet(data,oldData);if(data.length!==EXPECTED_TOTAL)throw new Error(`Nguồn Điều phối hiện trả về ${data.length} TTHC, chưa khớp danh mục chuẩn ${EXPECTED_TOTAL}. Website chưa thay đổi.`);const oldByCode=new Map(oldData.map(x=>[String(x.ma||'').trim(),x]));data=data.map(x=>mapRow(sourceRows.find(r=>String(first(r,['MaTTHC','Mã TTHC','Ma TTHC','code','ma'])).trim()===x.ma)||{},oldByCode.get(x.ma)||x));return {data,source:DIEUPHOI_CSV}}
async function dvcPage(lastId=''){const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(DVC_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit:100,lastId,q:'',categoryId:'',departmentCode:'H18.111'}),signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`DVCQG HTTP ${r.status}`);return await r.json()}finally{clearTimeout(t)}}
function extractRows(payload){if(Array.isArray(payload))return payload;for(const k of ['items','data','rows','procedures','results'])if(Array.isArray(payload?.[k]))return payload[k];if(Array.isArray(payload?.data?.items))return payload.data.items;return[]}
async function syncFromDVC(oldData){const rows=[];let lastId='';for(let i=0;i<5;i++){const p=await dvcPage(lastId);const r=extractRows(p);if(!r.length)break;rows.push(...r);const next=String(p?.lastId||p?.data?.lastId||r[r.length-1]?.id||r[r.length-1]?.formalityId||'');if(!next||next===lastId||r.length<100)break;lastId=next}const oldByCode=new Map(oldData.map(x=>[x.ma,x]));let data=rows.map(r=>mapRow(r,oldByCode.get(String(first(r,['code','ma','maThuTuc','formalityCode','procedureCode'])).trim())||{})).filter(x=>x.ma&&x.ten).filter(x=>{const a=norm(x.coQuanThucHien);return x.maCoQuan==='H18.111'||a.includes('mường lay')||a.includes('muong lay')}).filter(x=>!norm(x.coQuanThucHien).includes('ban chqs')&&!norm(x.coQuanThucHien).includes('ban chi huy quan su'));const unique=new Map(data.map(x=>[x.ma,x]));data=[...unique.values()];data=preserveCurrentSet(data,oldData);if(data.length!==EXPECTED_TOTAL)throw new Error(`DVCQG trả ${data.length} TTHC, chưa khớp ${EXPECTED_TOTAL}.`);return data}
function stats(data,extra={}){return {ok:true,syncedAt:new Date().toISOString(),total:data.length,full:data.filter(x=>norm(x.mucDichVu)==='toan trinh').length,partial:data.filter(x=>norm(x.mucDichVu)==='mot phan').length,noOnline:data.filter(x=>norm(`${x.mucDichVu} ${x.mucDo}`).includes('chua cung cap')).length,...extra}}
async function saveLive(data,meta){
 const {token,repo,branch}=githubSettings();
 const url='https://api.github.com/repos/'+repo+'/contents/'+LIVE_PATH;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'TTHC-Muong-Lay-Sync'};
 const current=await fetch(url+'?ref='+encodeURIComponent(branch),{cache:'no-store',headers});
 let sha=null;
 if(current.ok)sha=(await current.json()).sha;
 else if(current.status!==404)throw new Error('Không thể kiểm tra phiên bản danh mục cũ (HTTP '+current.status+').');
 const snapshot={version:2,meta,procedures:data};
 const payload={message:'Cap nhat danh muc TTHC Muong Lay - '+data.length+' thu tuc',branch,content:Buffer.from(JSON.stringify(snapshot,null,2)+'\n','utf8').toString('base64')};
 if(sha)payload.sha=sha;
 const r=await fetch(url,{method:'PUT',headers,body:JSON.stringify(payload)});
 const result=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error('Không lưu được danh mục vào GitHub: '+(result.message||'HTTP '+r.status));
 return result.commit?.sha||'';
}
function normalizeImportedRows(rows){
 if(!Array.isArray(rows)||rows.length>5000)throw new Error('File không có mảng TTHC hợp lệ hoặc vượt 5.000 dòng.');
 const found=new Map();
 for(let i=0;i<rows.length;i++){
  const row=mapRow(rows[i],{});
  if(!row.ma||!row.ten)throw new Error('Dòng '+(i+1)+' thiếu mã hoặc tên TTHC. Không thay thế dữ liệu cũ.');
  if(found.has(row.ma))throw new Error('Mã TTHC bị trùng trong file: '+row.ma+'. Hãy sửa trước khi tải.');
  found.set(row.ma,row);
 }
 if(found.size<20)throw new Error('Danh mục có '+found.size+' thủ tục; cần ít nhất 20 thủ tục để thay toàn bộ.');
 return [...found.values()];
}
async function importCatalog(rows,sourceName='Danh mục do quản trị viên tải lên',confirmReplace=false){
 const oldData=await getBlob(LIVE_PATH)||[];
 const oldMap=new Map(oldData.map(x=>[x.ma,x]));
 // Dữ liệu tệp mới chưa được xác minh đường dẫn: không công bố QR/link từ Excel
 // cho đến khi đối chiếu mã và tên TTHC với Cổng DVCQG.
 const data=normalizeImportedRows(rows).map(item=>{
  const previous=oldMap.get(item.ma);
  if(previous&&norm(previous.ten)===norm(item.ten)){
   for(const key of ['linhVuc','coQuanChuTri','coQuanThucHien','maCoQuan','cap','mucDichVu','mucDo']){
    if((!item[key]||item[key]==='Chưa xác định'||item[key]==='Chưa cung cấp DVC')&&previous[key])item[key]=previous[key];
   }
  }
  if(item.mucDichVu==='Chưa cung cấp DVC'&&!String(rows.find(x=>String(x.ma||'').trim()===item.ma)?.mucDichVu||'').trim()&&!String(rows.find(x=>String(x.ma||'').trim()===item.ma)?.mucDo||'').trim()){
   item.mucDichVu='Chưa xác định mức dịch vụ công';
   item.mucDo=item.mucDichVu;
  }
  return {...item,url:'',dvcqgId:'',urlNopHoSo:'',linkStatus:'chua_xac_minh',linkType:'',linkCheckedAt:''};
 });
 const newCodes=new Set(data.map(x=>x.ma));
 const removed=oldData.filter(x=>!newCodes.has(x.ma));
 if(oldData.length>=20&&removed.length/oldData.length>0.25&&!confirmReplace)throw new Error('File sẽ loại '+removed.length+'/'+oldData.length+' TTHC cũ (>25%). Cần xác nhận đặc biệt để tránh mất danh mục.');
 const keys=['ten','linhVuc','coQuanThucHien','cap','mucDo','mucDichVu','trangThai'];
 const changed=data.filter(x=>oldMap.has(x.ma)&&keys.some(k=>String(x[k]??'')!==String(oldMap.get(x.ma)[k]??''))).length;
 const catalogHash=crypto.createHash('sha256').update(JSON.stringify(data.map(x=>[x.ma,x.ten]))).digest('hex');
 const meta=stats(data,{mode:'manual-import',source:String(sourceName).slice(0,200),added:data.filter(x=>!oldMap.has(x.ma)).length,removed:removed.length,changed,catalogHash,verified:false,linked:0,verification:'Chưa đối chiếu Cổng DVCQG'});
 const commit=await saveLive(data,meta);
 return {...meta,commit};
}
async function syncNow(){const currentMeta=await getBlob(META_PATH);if(currentMeta?.mode==='manual-import')return {...currentMeta,warning:'Danh mục Excel do quản trị viên cập nhật đang được bảo vệ; đồng bộ tự động không ghi đè. Sử dụng đối chiếu DVCQG để rà soát.'};const oldData=await getBlob(LIVE_PATH);if(!Array.isArray(oldData)||oldData.length!==EXPECTED_TOTAL)throw new Error('Không tìm thấy dữ liệu hiện tại 428 TTHC để làm bản đối chiếu an toàn.');let data,mode='dieuphoi-sheet',source=DIEUPHOI_CSV,warning='';try{const r=await syncFromDieuphoi(oldData);data=r.data}catch(e){console.error('DIEUPHOI_SYNC_FAILED',e);try{data=await syncFromDVC(oldData);mode='dvcqg-fallback';source=DVC_API;warning='Nguồn Điều phối tạm thời không phản hồi đúng 428 TTHC; đã giữ danh mục 428 và làm mới dữ liệu từ DVCQG.'}catch(e2){console.error('DVC_FALLBACK_FAILED',e2);data=oldData;mode='safe-cache';source='data/tthc-live.json';warning='Nguồn đồng bộ tạm thời lỗi; giữ nguyên dữ liệu 428 hiện tại, không làm mất dữ liệu.'}}const oldMap=new Map(oldData.map(x=>[x.ma,x]));const meta=stats(data,{mode,source,warning,added:data.filter(x=>!oldMap.has(x.ma)).length,removed:oldData.filter(x=>!data.some(y=>y.ma===x.ma)).length,changed:data.filter(x=>oldMap.has(x.ma)).length});await saveLive(data,meta);return meta}
async function syncDieuphoi(){return syncNow()}
export default async function handler(req,res){try{const action=req.query?.action||'';if(req.method==='GET'&&action==='data'){const live=await getBlob(LIVE_PATH);if(live&&Array.isArray(live))return json(res,200,{ok:true,procedures:live});return json(res,404,{ok:false,message:'Chưa nhập danh mục quản trị; sử dụng nguồn công khai mặc định.'})}if(req.method==='GET'&&action==='status'){const meta=await getBlob(META_PATH);return json(res,200,meta||{ok:true,syncedAt:null,total:0})}if(req.method!=='POST'||!tokenValid(req))return json(res,401,{ok:false,message:'Không có quyền đồng bộ.'});if(action==='import')return json(res,200,await importCatalog(req.body?.procedures,req.body?.sourceName,req.body?.confirmReplace===true));if(action==='dieuphoi')return json(res,200,await syncDieuphoi());return json(res,200,await syncNow())}catch(e){console.error('SYNC_ERROR',e);return json(res,500,{ok:false,message:e?.message||String(e)})}}
