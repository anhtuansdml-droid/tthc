const DATA_URL = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/tthc_430_2026-10-20.json';

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
  'dat dai':['dat','so do','giay chung nhan quyen su dung dat','chuyen nhuong dat','tang cho dat'],
  'an toan thuc pham':['an toan ve sinh thuc pham','ve sinh an toan thuc pham','giay an toan thuc pham','du dieu kien an toan thuc pham'],
  'bao tro xa hoi':['tro cap','bao tro','nguoi cao tuoi','nguoi khuyet tat','ho ngheo'],
  'nguoi co cong':['thuong binh','liet si','nguoi co cong','che do nguoi co cong'],
  'cu tru':['thuong tru','tam tru','chuyen ho khau','cu tru','dang ky thuong tru'],
  'chung thuc':['chung thuc','sao y','chung thuc ban sao','photo cong chung'],
  'ho tich':['ho tich','khai tu','xac nhan tinh trang hon nhan','thay doi ho tich']
};

function expandQuery(q) {
  const n=norm(q);
  const out=new Set(tokens(q));
  for(const [key,vals] of Object.entries(aliases)) {
    if(n.includes(norm(key)) || vals.some(v=>n.includes(norm(v)))) {
      tokens(key).forEach(x=>out.add(x));
      vals.forEach(v=>tokens(v).forEach(x=>out.add(x)));
    }
  }
  return [...out];
}

function score(item,q) {
  const n=norm(q);
  const text=norm([item.ma,item.ten,item.linhVuc,item.coQuanChuTri,item.coQuanThucHien].join(' '));
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

function fallback(q,data){
  const ranked=data.map(x=>({...x,_score:score(x,q)})).filter(x=>x._score>0).sort((a,b)=>b._score-a._score).slice(0,5);
  return {
    mode:'local',
    message: ranked.length
      ? 'Tôi đã tìm các thủ tục phù hợp với nhu cầu bạn mô tả. Bạn có thể chọn thủ tục gần đúng nhất để xem chi tiết.'
      : 'Tôi chưa tìm thấy thủ tục phù hợp trong danh mục TTHC đang niêm yết. Bạn có thể mô tả thêm nhu cầu hoặc gọi 0932 293 502 để được hỗ trợ.',
    results:ranked.map(x=>({ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,url:x.dvcqgId?`https://ndc.dichvucong.gov.vn/thu-tuc-hanh-chinh/${encodeURIComponent(x.dvcqgId)}`:''}))
  };
}

async function askAI(q,candidates){
  if(!process.env.OPENAI_API_KEY) return null;
  const model=process.env.OPENAI_MODEL||'gpt-6-luna';
  const prompt=`Bạn là Trợ lý TTHC của Trung tâm Phục vụ hành chính công phường Mường Lay. Người dân không nhất thiết biết tên thủ tục, họ mô tả nhu cầu bằng ngôn ngữ đời thường. Hãy hiểu ý định và chọn tối đa 3 thủ tục phù hợp NHẤT chỉ từ danh sách được cung cấp. Không được bịa thủ tục hoặc mã. Nếu chưa đủ thông tin, hãy nói rõ và đặt 1 câu hỏi làm rõ. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.\n\nNhu cầu người dân:\n${q}\n\nDanh sách ứng viên:\n${JSON.stringify(candidates.map((x,i)=>({i,ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu})),null,2)}`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.OPENAI_API_KEY},body:JSON.stringify({model,input:prompt,max_output_tokens:500})});
  if(!r.ok) throw new Error('AI API HTTP '+r.status);
  const data=await r.json();
  const text=data.output_text||((data.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('\n'))||'';
  return {mode:'ai',message:text,results:candidates.map(x=>({ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,url:x.dvcqgId?`https://ndc.dichvucong.gov.vn/thu-tuc-hanh-chinh/${encodeURIComponent(x.dvcqgId)}`:''}))};
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Method not allowed'});
  try{
    const q=String(req.body?.message||'').trim();
    if(!q) return res.status(400).json({ok:false,message:'Vui lòng nhập nhu cầu cần tra cứu.'});
    const data=await loadData();
    const ranked=data.map(x=>({...x,_score:score(x,q)})).sort((a,b)=>b._score-a._score).slice(0,10);
    let answer=await askAI(q,ranked).catch(()=>null);
    if(!answer) answer=fallback(q,data);
    return res.status(200).json({ok:true,...answer});
  }catch(e){return res.status(500).json({ok:false,message:e?.message||'Không thể tra cứu lúc này.'});}
}
