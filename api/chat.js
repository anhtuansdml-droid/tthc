const DATA_URL = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/tthc_430_2026-10-20.json';
const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/responses';
const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-5.4-mini';

function norm(v='') {
  return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function tokens(v='') {
  return norm(v).replace(/[^a-z0-9.]+/g,' ').split(/\s+/).filter(x=>x.length>1);
}
const aliases = {
  'sinh con':['khai sinh','giay khai sinh','tre moi sinh','con moi sinh','em be','be moi sinh'],
  'khai sinh':['dang ky khai sinh','lam khai sinh','giay khai sinh'],
  'ket hon':['dang ky ket hon','cuoi','dang ky cuoi'],
  'ly hon':['ly hon','thuan tinh ly hon','ly hon don phuong'],
  'ho kinh doanh':['mo ho kinh doanh','dang ky ho kinh doanh','mo cua hang','ban tap hoa'],
  'xay nha':['xay dung','xay nha','giay phep xay dung','xin phep xay nha'],
  'dat dai':['dat','so do','giay chung nhan quyen su dung dat','chuyen nhuong dat','tang cho dat','sang ten dat'],
  'an toan thuc pham':['an toan ve sinh thuc pham','ve sinh an toan thuc pham','giay an toan thuc pham','du dieu kien an toan thuc pham'],
  'bao tro xa hoi':['tro cap','bao tro','nguoi cao tuoi','nguoi khuyet tat','ho ngheo'],
  'nguoi co cong':['thuong binh','liet si','nguoi co cong','che do nguoi co cong'],
  'cu tru':['thuong tru','tam tru','chuyen ho khau','cu tru','dang ky thuong tru'],
  'chung thuc':['chung thuc','sao y','chung thuc ban sao','photo cong chung'],
  'ho tich':['ho tich','khai tu','xac nhan tinh trang hon nhan','thay doi ho tich']
};
function expandQuery(q) {
  const n=norm(q), out=new Set(tokens(q));
  for(const [key,vals] of Object.entries(aliases)) if(n.includes(norm(key)) || vals.some(v=>n.includes(norm(v)))) {
    tokens(key).forEach(x=>out.add(x)); vals.forEach(v=>tokens(v).forEach(x=>out.add(x)));
  }
  return [...out];
}
function score(item,q) {
  const n=norm(q), text=norm([item.ma,item.ten,item.linhVuc,item.coQuanChuTri,item.coQuanThucHien].join(' '));
  let s=0;
  if(item.ma && n.includes(norm(item.ma))) s+=100;
  if(item.ten && n.includes(norm(item.ten))) s+=80;
  for(const t of expandQuery(q)) {
    if(norm(item.ten).includes(t)) s+=8;
    if(norm(item.linhVuc).includes(t)) s+=5;
    if(text.includes(t)) s+=2;
  }
  return s;
}
async function loadData(){
  const r=await fetch(DATA_URL+'?v='+Date.now(),{cache:'no-store'});
  if(!r.ok) throw new Error('Không tải được danh mục TTHC');
  return await r.json();
}
function resultOf(x){return {ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,url:x.dvcqgId?`https://ndc.dichvucong.gov.vn/thu-tuc-hanh-chinh/${encodeURIComponent(x.dvcqgId)}`:''};}
function fallback(q,data){
  const ranked=data.map(x=>({...x,_score:score(x,q)})).filter(x=>x._score>0).sort((a,b)=>b._score-a._score).slice(0,3);
  return {mode:'local',message:ranked.length?'Tôi đã tìm thấy một số thủ tục có thể phù hợp với nhu cầu của bạn. Bạn hãy chọn thủ tục gần nhất để xem chi tiết.':'Tôi chưa tìm thấy thủ tục phù hợp trong danh mục TTHC đang niêm yết. Bạn có thể mô tả thêm nhu cầu hoặc gọi 0932 293 502 để được hỗ trợ.',results:ranked.map(resultOf)};
}
function gatewayToken(){return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || ''}
function parseJson(text){
  const cleaned=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(cleaned)}catch(_){
    const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');
    if(a>=0&&b>a)try{return JSON.parse(cleaned.slice(a,b+1))}catch(_2){}
  }
  return null;
}
async function askAI(q,candidates){
  const token=gatewayToken();
  if(!token)return null;
  const prompt=`Bạn là Trợ lý TTHC của Trung tâm Phục vụ hành chính công phường Mường Lay. Người dân không nhất thiết biết tên thủ tục; họ mô tả nhu cầu bằng ngôn ngữ đời thường. Hãy hiểu đúng ý định và chọn tối đa 3 thủ tục phù hợp nhất CHỈ từ danh sách ứng viên bên dưới. Không được bịa tên, mã hoặc thông tin TTHC. Nếu chưa đủ thông tin để chọn chắc chắn, hãy hỏi đúng 1 câu làm rõ và để indices là []. Trả về JSON thuần túy, không markdown, theo đúng mẫu: {"message":"câu trả lời ngắn gọn bằng tiếng Việt","indices":[0,1]}. Nếu có thể xác định được thủ tục, message phải nói ngắn gọn vì sao phù hợp.\n\nNhu cầu người dân:\n${q}\n\nỨng viên:\n${JSON.stringify(candidates.map((x,i)=>({index:i,ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu})),null,2)}`;
  const r=await fetch(AI_GATEWAY_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({model:AI_MODEL,input:prompt,max_output_tokens:500})});
  if(!r.ok) throw new Error('AI Gateway HTTP '+r.status);
  const data=await r.json();
  const text=data.output_text||((data.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('\n'))||'';
  const parsed=parseJson(text);
  if(!parsed||!Array.isArray(parsed.indices)||typeof parsed.message!=='string')return null;
  const selected=parsed.indices.filter(i=>Number.isInteger(i)&&i>=0&&i<candidates.length).slice(0,3).map(i=>candidates[i]);
  return {mode:'ai',message:parsed.message,results:selected.map(resultOf)};
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Method not allowed'});
  try{
    const q=String(req.body?.message||'').trim();
    if(!q) return res.status(400).json({ok:false,message:'Vui lòng nhập nhu cầu cần tra cứu.'});
    const data=await loadData();
    const ranked=data.map(x=>({...x,_score:score(x,q)})).sort((a,b)=>b._score-a._score).slice(0,12);
    let answer=await askAI(q,ranked).catch(()=>null);
    if(!answer) answer=fallback(q,data);
    return res.status(200).json({ok:true,...answer});
  }catch(e){return res.status(500).json({ok:false,message:'Không thể tra cứu lúc này. Anh/chị có thể gọi 0932 293 502 để được hỗ trợ.'});}
}
