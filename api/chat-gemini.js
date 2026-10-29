const DATA_URL = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/tthc_430_2026-10-20.json';
const AI_MODELS = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const MAX_QUERY_LENGTH = 2000;

function norm(v='') { return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').trim(); }
function tokens(v='') { return norm(v).replace(/[^a-z0-9.]+/g,' ').split(/\s+/).filter(x=>x.length>1); }
const aliases = {
  'sinh con':['khai sinh','giay khai sinh','tre moi sinh','con moi sinh','em be','be moi sinh'],
  'khai sinh':['dang ky khai sinh','lam khai sinh','giay khai sinh','khai sinh cho con'],
  'ket hon':['dang ky ket hon','cuoi','dang ky cuoi','lam dang ky ket hon'],
  'ly hon':['ly hon','thuan tinh ly hon','ly hon don phuong'],
  'ho kinh doanh':['mo ho kinh doanh','dang ky ho kinh doanh','mo cua hang','ban tap hoa','mo quan'],
  'xay nha':['xay dung','xay nha','giay phep xay dung','xin phep xay nha'],
  'dat dai':['dat','so do','giay chung nhan quyen su dung dat','chuyen nhuong dat','tang cho dat','sang ten dat'],
  'an toan thuc pham':['an toan ve sinh thuc pham','ve sinh an toan thuc pham','giay an toan thuc pham','du dieu kien an toan thuc pham'],
  'bao tro xa hoi':['tro cap','bao tro','nguoi cao tuoi','nguoi khuyet tat','ho ngheo'],
  'nguoi co cong':['thuong binh','liet si','nguoi co cong','che do nguoi co cong'],
  'cu tru':['thuong tru','tam tru','chuyen ho khau','cu tru','dang ky thuong tru','nhap khau'],
  'chung thuc':['chung thuc','sao y','chung thuc ban sao','photo cong chung'],
  'ho tich':['ho tich','khai tu','xac nhan tinh trang hon nhan','thay doi ho tich'],
  'can cuoc':['can cuoc','cccd','the can cuoc','dinh danh']
};
function detectIntents(q) { const n=norm(q); return Object.entries(aliases).filter(([key,vals])=>n.includes(norm(key)) || vals.some(v=>n.includes(norm(v)))).map(([key,vals])=>({key,vals})); }
function expandQuery(q) { const out=new Set(tokens(q)); for(const {key,vals} of detectIntents(q)){ tokens(key).forEach(x=>out.add(x)); vals.forEach(v=>tokens(v).forEach(x=>out.add(x))); } return [...out]; }
function score(item,q) {
  const n=norm(q), title=norm(item.ten), field=norm(item.linhVuc), text=norm([item.ma,item.ten,item.linhVuc,item.coQuanChuTri,item.coQuanThucHien].join(' '));
  let s=0;
  if(item.ma && n.includes(norm(item.ma))) s+=300;
  if(item.ten && n.includes(norm(item.ten))) s+=260;
  const intents=detectIntents(q);
  for(const intent of intents){
    const key=norm(intent.key), isKhaiSinh=key==='khai sinh'||key==='sinh con';
    if(title.includes(key)) s+=180;
    for(const phrase of intent.vals){
      const p=norm(phrase);
      if(title.includes(p)) s+=isKhaiSinh && p==='dang ky khai sinh'?260:120;
      else if(field.includes(p)) s+=30;
      else if(text.includes(p)) s+=12;
    }
    if(isKhaiSinh && (n.includes('dang ky') || n.includes('lam khai sinh') || n.includes('cho con') || n.includes('sinh con'))){
      if(title.includes('dang ky khai sinh')) s+=500;
      if(title.includes('lien thong') && title.includes('khai sinh')) s+=180;
      if(title.includes('cap ban sao') || title.includes('trich luc') || title.includes('ban sao')) s-=260;
    }
  }
  for(const t of expandQuery(q)){ if(title.includes(t)) s+=6; if(field.includes(t)) s+=3; if(text.includes(t)) s+=1; }
  return s;
}
async function loadData(){ const r=await fetch(DATA_URL+'?v='+Date.now(),{cache:'no-store'}); if(!r.ok) throw new Error('Không tải được danh mục TTHC'); const data=await r.json(); if(!Array.isArray(data)) throw new Error('Dữ liệu TTHC không hợp lệ'); return data; }
function resultOf(x){ return {ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,dvcqgId:x.dvcqgId||x.dvcqg_id||'',url:x.url||''}; }
function fallback(q,data){
  const intents=detectIntents(q); let ranked=data.map(x=>({...x,_score:score(x,q)})).filter(x=>x._score>0);
  if(intents.length){ const strong=ranked.filter(x=>intents.some(i=>{ const title=norm(x.ten),field=norm(x.linhVuc); return title.includes(norm(i.key)) || i.vals.some(v=>title.includes(norm(v)) || field.includes(norm(v))); })); if(strong.length) ranked=strong; }
  ranked.sort((a,b)=>b._score-a._score); const results=ranked.slice(0,3).map(resultOf); const intent=intents[0]?.key;
  const label=intent==='khai sinh'||intent==='sinh con'?'đăng ký khai sinh':intent==='ket hon'?'đăng ký kết hôn':intent==='ho kinh doanh'?'đăng ký hộ kinh doanh':intent==='dat dai'?'thủ tục đất đai':intent==='chung thuc'?'chứng thực':intent==='cu tru'?'thủ tục cư trú':intent==='xay nha'?'thủ tục xây dựng':intent||'';
  return {mode:'local',message:results.length?(label?'Tôi hiểu anh/chị đang cần '+label+'. Dưới đây là các thủ tục khớp nhất với nhu cầu này:':'Tôi đã đối chiếu nhu cầu với danh mục TTHC. Dưới đây là các thủ tục khớp nhất:'):'Tôi chưa tìm thấy thủ tục phù hợp trong danh mục TTHC đang niêm yết. Anh/chị mô tả thêm việc cần làm để tôi tra cứu chính xác hơn.',results};
}
function parseJson(text){ const cleaned=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim(); try{return JSON.parse(cleaned)}catch(_){ const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}'); if(a>=0&&b>a)try{return JSON.parse(cleaned.slice(a,b+1))}catch(_2){} } return null; }
function candidatePayload(candidates){ return candidates.map((x,i)=>({index:i,ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,cap:x.cap,coQuanChuTri:x.coQuanChuTri,coQuanThucHien:x.coQuanThucHien})); }
async function askGemini(q,candidates,previousInteractionId){
  const key=process.env.GEMINI_API_KEY; if(!key) throw new Error('Thiếu biến môi trường GEMINI_API_KEY');
  const systemInstruction='Bạn là Trợ lý TTHC chính thức của Trung tâm Phục vụ hành chính công phường Mường Lay. Chỉ được chọn thủ tục từ danh sách ứng viên của lượt hiện tại. Không được bịa mã, tên, phí, thời hạn, thành phần hồ sơ hoặc cơ quan. Phải ưu tiên ứng viên khớp trực tiếp với nhu cầu của người dân; tuyệt đối không chọn thủ tục khác lĩnh vực chỉ vì có từ khóa chung. Nếu người dân nói đăng ký/làm khai sinh cho con, ưu tiên thủ tục có tên "Đăng ký khai sinh"; không ưu tiên "Cấp bản sao Trích lục hộ tịch, bản sao Giấy khai sinh" vì đó là nhu cầu cấp bản sao/trích lục. Nếu nhu cầu chưa rõ, hỏi đúng 1 câu làm rõ và trả indices là []. Nếu có thủ tục phù hợp, chọn tối đa 3 ứng viên và giải thích ngắn gọn bằng tiếng Việt. Nếu dữ liệu chưa đủ cho câu hỏi chi tiết, hướng người dân mở XEM CHI TIẾT hoặc tra cứu Cổng DVC Quốc gia.';
  const input='Nhu cầu hiện tại của người dân:\n'+q+'\n\nDanh sách ứng viên TTHC của lượt này:\n'+JSON.stringify(candidatePayload(candidates),null,2);
  const base={input,system_instruction:systemInstruction,generation_config:{thinking_level:'low'},response_format:{type:'text',mime_type:'application/json',schema:{type:'object',properties:{message:{type:'string'},indices:{type:'array',items:{type:'integer'}}},required:['message','indices']}}};
  let lastError=null;
  for(const model of AI_MODELS){ const body={...base,model}; if(previousInteractionId) body.previous_interaction_id=previousInteractionId; for(let attempt=0;attempt<2;attempt++){ const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)}); const raw=await response.text(); if(response.ok){ const interaction=JSON.parse(raw),parsed=parseJson(interaction?.output_text); if(!parsed||!Array.isArray(parsed.indices)||typeof parsed.message!=='string') throw new Error('Gemini trả về dữ liệu không đúng định dạng'); const selected=parsed.indices.filter(i=>Number.isInteger(i)&&i>=0&&i<candidates.length).slice(0,3).map(i=>candidates[i]); return {mode:'gemini',message:parsed.message,results:selected.map(resultOf),interactionId:interaction.id||''}; } lastError=new Error('Gemini API '+response.status+': '+raw.slice(0,500)); if(![429,500,502,503,504].includes(response.status)) break; await new Promise(r=>setTimeout(r,attempt===0?1200:2500)); } }
  throw lastError||new Error('Gemini không phản hồi');
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Method not allowed'});
  try{
    const q=String(req.body?.message||'').trim(); if(!q)return res.status(400).json({ok:false,message:'Vui lòng nhập nhu cầu cần tra cứu.'}); if(q.length>MAX_QUERY_LENGTH)return res.status(413).json({ok:false,message:`Nội dung quá dài. Vui lòng nhập tối đa ${MAX_QUERY_LENGTH} ký tự.`});
    const data=await loadData(); const ranked=data.map(x=>({...x,_score:score(x,q)})).sort((a,b)=>b._score-a._score); const intents=detectIntents(q);
    const focused=intents.length?ranked.filter(x=>intents.some(i=>{const t=norm(x.ten),f=norm(x.linhVuc);return t.includes(norm(i.key))||i.vals.some(v=>t.includes(norm(v))||f.includes(norm(v)))})):ranked;
    const candidates=(focused.length?focused:ranked).slice(0,12); const previousInteractionId=String(req.body?.previousInteractionId||'').trim(); let answer;
    try{ answer=await askGemini(q,candidates,previousInteractionId); }catch(err){ console.error('GEMINI_API_ERROR',err?.message||err); answer=null; }
    if(!answer)answer=fallback(q,data); return res.status(200).json({ok:true,...answer});
  }catch(e){ console.error('Chat error:',e); return res.status(500).json({ok:false,message:'Không thể tra cứu lúc này. Anh/chị có thể thử lại sau hoặc gọi 0932 293 502 để được hỗ trợ.'}); }
}
