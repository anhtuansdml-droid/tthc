import { GoogleGenAI } from '@google/genai';

const DATA_URL = '/data/tthc_430_2026-10-20.json';
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_QUERY_LENGTH = 2000;

function norm(v='') {
  return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').trim();
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
  const data=await r.json();
  if(!Array.isArray(data)) throw new Error('Dữ liệu TTHC không hợp lệ');
  return data;
}
function resultOf(x){return {ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,dvcqgId:x.dvcqgId||x.dvcqg_id||'',url:x.url||''};}
function fallback(q,data){
  const ranked=data.map(x=>({...x,_score:score(x,q)})).filter(x=>x._score>0).sort((a,b)=>b._score-a._score).slice(0,3);
  return {mode:'local',message:ranked.length?'Tôi đã tìm thấy một số thủ tục có thể phù hợp với nhu cầu của bạn. Bạn hãy chọn thủ tục gần nhất để xem chi tiết.':'Tôi chưa tìm thấy thủ tục phù hợp trong danh mục TTHC đang niêm yết. Bạn có thể mô tả thêm nhu cầu hoặc gọi 0932 293 502 để được hỗ trợ.',results:ranked.map(resultOf)};
}
function parseJson(text){
  const cleaned=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(cleaned)}catch(_){
    const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');
    if(a>=0&&b>a)try{return JSON.parse(cleaned.slice(a,b+1))}catch(_2){}
  }
  return null;
}
function candidatePayload(candidates){
  return candidates.map((x,i)=>({index:i,ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,cap:x.cap,coQuanChuTri:x.coQuanChuTri,coQuanThucHien:x.coQuanThucHien}));
}
async function askGemini(q,candidates,previousInteractionId){
  const key=process.env.GEMINI_API_KEY;
  if(!key)return null;
  const ai=new GoogleGenAI({apiKey:key});
  const input=`Bạn là Trợ lý TTHC chính thức của Trung tâm Phục vụ hành chính công phường Mường Lay.\n\nNGUYÊN TẮC BẮT BUỘC:\n1. Chỉ được xác định thủ tục từ danh sách ứng viên được cung cấp trong lượt này. Không được bịa mã, tên, phí, thời hạn, thành phần hồ sơ hoặc cơ quan.\n2. Nếu người dân hỏi thông tin chi tiết nhưng ứng viên không chứa thông tin đó, hãy nói rõ dữ liệu hiện có chưa đủ và hướng họ mở “XEM CHI TIẾT” hoặc tra cứu trên Cổng DVC Quốc gia.\n3. Nếu nhu cầu chưa đủ rõ, hãy hỏi đúng 1 câu làm rõ và trả indices là [].\n4. Nếu có thủ tục phù hợp, chọn tối đa 3 ứng viên và giải thích ngắn gọn, dễ hiểu bằng tiếng Việt.\n5. Không đưa ra kết luận pháp lý ngoài dữ liệu được cung cấp.\n6. Ưu tiên thủ tục cấp xã/phường và bối cảnh Mường Lay khi dữ liệu ứng viên thể hiện.\n\nTrả về JSON đúng schema, không markdown.\n\nNhu cầu hiện tại của người dân:\n${q}\n\nDanh sách ứng viên TTHC của lượt này:\n${JSON.stringify(candidatePayload(candidates),null,2)}`;
  const request={
    model:AI_MODEL,
    input,
    generation_config:{thinking_level:'medium'},
    response_format:{
      type:'text',
      mime_type:'application/json',
      schema:{
        type:'object',
        properties:{message:{type:'string'},indices:{type:'array',items:{type:'integer'}}},
        required:['message','indices']
      }
    }
  };
  if(previousInteractionId)request.previous_interaction_id=previousInteractionId;
  let interaction;
  try { interaction=await ai.interactions.create(request); }
  catch(err) {
    if(previousInteractionId){ delete request.previous_interaction_id; interaction=await ai.interactions.create(request); }
    else throw err;
  }
  const parsed=parseJson(interaction?.output_text);
  if(!parsed||!Array.isArray(parsed.indices)||typeof parsed.message!=='string')return null;
  const selected=parsed.indices.filter(i=>Number.isInteger(i)&&i>=0&&i<candidates.length).slice(0,3).map(i=>candidates[i]);
  return {mode:'gemini',message:parsed.message,results:selected.map(resultOf),interactionId:interaction.id||''};
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Method not allowed'});
  try{
    const q=String(req.body?.message||'').trim();
    if(!q)return res.status(400).json({ok:false,message:'Vui lòng nhập nhu cầu cần tra cứu.'});
    if(q.length>MAX_QUERY_LENGTH)return res.status(413).json({ok:false,message:`Nội dung quá dài. Vui lòng nhập tối đa ${MAX_QUERY_LENGTH} ký tự.`});
    const data=await loadData();
    const ranked=data.map(x=>({...x,_score:score(x,q)})).sort((a,b)=>b._score-a._score).slice(0,12);
    const previousInteractionId=String(req.body?.previousInteractionId||'').trim();
    let answer=await askGemini(q,ranked,previousInteractionId).catch(err=>{console.warn('Gemini unavailable:',err?.message||err);return null});
    if(!answer)answer=fallback(q,data);
    return res.status(200).json({ok:true,...answer});
  }catch(e){
    console.error('Chat error:',e);
    return res.status(500).json({ok:false,message:'Không thể tra cứu lúc này. Anh/chị có thể thử lại sau hoặc gọi 0932 293 502 để được hỗ trợ.'});
  }
}
