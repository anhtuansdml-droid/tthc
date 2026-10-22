(() => {
  const panel=document.getElementById('tthcChatPanel');
  const launcher=document.getElementById('tthcChatLauncher');
  const close=document.getElementById('tthcChatClose');
  const messages=document.getElementById('tthcChatMessages');
  const input=document.getElementById('tthcChatInput');
  const send=document.getElementById('tthcChatSend');
  if(!panel||!launcher||!messages||!input||!send)return;

  const MODEL='onnx-community/Qwen2.5-0.5B-Instruct';
  let generator=null,loadingPromise=null,transformers=null;
  let procedures=[];
  let history=[];

  const groups=[
    {words:['khai sinh','mới sinh','sinh con','đẻ','trẻ sơ sinh','giấy khai sinh'],terms:['khai sinh','trẻ em']},
    {words:['khai tử','người mất','qua đời','tử vong','giấy báo tử'],terms:['khai tử','tử']},
    {words:['kết hôn','đăng ký kết hôn','lấy vợ','lấy chồng','đám cưới'],terms:['kết hôn','hôn nhân']},
    {words:['hộ kinh doanh','mở cửa hàng','mở quán','đăng ký kinh doanh','buôn bán','tạp hóa'],terms:['hộ kinh doanh','đăng ký kinh doanh']},
    {words:['xây nhà','xây dựng','xin phép xây dựng','giấy phép xây dựng'],terms:['xây dựng','giấy phép xây dựng']},
    {words:['đất','sổ đỏ','sổ hồng','đất đai','chuyển nhượng đất','tặng cho đất','sang tên đất'],terms:['đất đai','đăng ký đất đai','chuyển nhượng','tặng cho']},
    {words:['an toàn thực phẩm','vệ sinh an toàn thực phẩm','đủ điều kiện an toàn thực phẩm','giấy chứng nhận an toàn thực phẩm'],terms:['an toàn thực phẩm']},
    {words:['trợ cấp','người cao tuổi','người già','bảo trợ xã hội','khuyết tật','hộ nghèo','chế độ'],terms:['trợ cấp','bảo trợ xã hội','người cao tuổi','khuyết tật','hộ nghèo']},
    {words:['căn cước','cccd','thẻ căn cước','định danh'],terms:['căn cước','định danh']},
    {words:['thường trú','tạm trú','cư trú','chuyển hộ khẩu','nhập khẩu'],terms:['cư trú','thường trú','tạm trú']},
    {words:['chứng thực','sao y','bản sao','công chứng'],terms:['chứng thực','sao y']},
    {words:['hộ tịch','giấy tờ hộ tịch'],terms:['hộ tịch']},
    {words:['người có công','thương binh','liệt sĩ','thân nhân liệt sĩ'],terms:['người có công','liệt sĩ','thương binh']},
    {words:['đăng ký xe','xe máy','ô tô','phương tiện'],terms:['đăng ký xe','phương tiện']}
  ];

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.]+/g,' ').trim()}
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function submitUrl(item){const uuid=String(item?.dvcqgId||item?.dvcqg_id||'').trim();if(!uuid)return '';const p=new URLSearchParams({formalityId:uuid,searchType:'PROVINCE',provinceCode:'11',wardCode:'03151',commune:'WARD',showAdvanced:'false',isProvince:'0',isMinistry:'0'});return `https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?${p.toString()}`}
  function searchUrl(item){const ma=String(item?.ma||'').trim();return ma?`https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?keyword=${encodeURIComponent(ma)}`:'https://ndc.dichvucong.gov.vn/'}

  function addMessage(text,who='bot',results=[]){
    const box=document.createElement('div');box.className='tthc-msg '+who;box.textContent=text;
    if(results.length){const list=document.createElement('div');list.className='tthc-results';results.slice(0,3).forEach(r=>{const card=document.createElement('div');card.className='tthc-result';const direct=submitUrl(r);card.innerHTML=`<b>${escapeHtml(r.ten||'')}</b><small>${escapeHtml(r.ma||'')} · ${escapeHtml(r.linhVuc||'')} · ${escapeHtml(r.mucDichVu||'Chưa cập nhật')}</small><div class="tthc-result-actions"><a class="tthc-submit" href="${escapeHtml(direct||searchUrl(r))}" target="_blank" rel="noopener noreferrer">➤ NỘP HỒ SƠ TRỰC TUYẾN</a><button type="button" class="tthc-detail">XEM CHI TIẾT</button></div>`;card.querySelector('.tthc-detail').addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('tthc:open',{detail:r.ma}));panel.classList.remove('show')});list.appendChild(card)});box.appendChild(list)}
    messages.appendChild(box);messages.scrollTop=messages.scrollHeight;
  }

  async function loadData(){const urls=['data/tthc-live.json','data/tthc_430_2026-10-20.json','data/tthc.json'];for(const u of urls){try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)continue;const d=await r.json();if(Array.isArray(d)&&d.length){procedures=d;break}}catch(_){} }}
  function findCandidates(q){const nq=norm(q),active=groups.filter(g=>g.words.some(w=>nq.includes(norm(w)))),tokens=nq.split(/\s+/).filter(x=>x.length>2);return procedures.map(p=>{const text=norm([p.ma,p.ten,p.linhVuc,p.coQuanChuTri,p.coQuanThucHien,p.mucDichVu].join(' '));let score=0;tokens.forEach(t=>{if(text.includes(t))score++});active.forEach(g=>g.terms.forEach(t=>{if(text.includes(norm(t)))score+=8}));if(nq.includes(norm(p.ma||''))&&p.ma)score+=100;return{p,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(x=>x.p)}
  function cleanJson(text){const s=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();try{return JSON.parse(s)}catch(_){const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1))}catch(__){}}}return null}
  async function getDevice(){try{if(navigator.gpu){const a=await navigator.gpu.requestAdapter();if(a)return'webgpu'}}catch(_){}return'wasm'}

  async function getGenerator(){
    if(generator)return generator;
    if(!loadingPromise){
      loadingPromise=(async()=>{
        addMessage('⏳ Đang khởi động AI lần đầu. Vui lòng chờ một chút, mô hình sẽ được lưu trong bộ nhớ đệm để những lần sau nhanh hơn.','bot');
        try{
          transformers=transformers||await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1');
          const device=await getDevice();
          generator=await transformers.pipeline('text-generation',MODEL,{dtype:'q4',device});
          return generator;
        }catch(e){addMessage('⚠️ Không tải được mô hình AI trên trình duyệt. Tôi sẽ chuyển sang chế độ tra cứu TTHC thông thường.','bot');throw e}
      })().catch(e=>{loadingPromise=null;throw e});
    }
    return loadingPromise;
  }

  async function askGenerativeAI(q,candidates){
    const g=await getGenerator();
    const candidateText=candidates.map((x,i)=>({index:i,ma:x.ma,ten:x.ten,linhVuc:x.linhVuc,mucDichVu:x.mucDichVu,coQuanThucHien:x.coQuanThucHien}));
    const system=`Bạn là Trợ lý TTHC của Trung tâm Phục vụ hành chính công phường Mường Lay. Trả lời tiếng Việt, ngắn gọn, dễ hiểu. Hiểu nhu cầu đời thường rồi chọn tối đa 3 thủ tục CHỈ trong danh sách ứng viên. Tuyệt đối không bịa tên, mã hoặc thủ tục ngoài danh sách. Nếu chưa đủ thông tin, hỏi đúng 1 câu và indices=[]. Nếu không phù hợp, indices=[]. Chỉ trả JSON: {"message":"...","indices":[0,1]}.`;
    const context=history.slice(-4).map(x=>({role:x.role,content:x.content}));
    const output=await g([{role:'system',content:system},...context,{role:'user',content:`Nhu cầu: ${q}\nỨng viên TTHC:\n${JSON.stringify(candidateText)}`}],{max_new_tokens:220,temperature:0.2,do_sample:false});
    const generated=output?.[0]?.generated_text;const raw=Array.isArray(generated)?generated.at(-1)?.content:(generated||'');const parsed=cleanJson(raw);if(!parsed||!Array.isArray(parsed.indices)||typeof parsed.message!=='string')throw new Error('AI trả về dữ liệu không hợp lệ');const selected=parsed.indices.filter(i=>Number.isInteger(i)&&i>=0&&i<candidates.length).slice(0,3).map(i=>candidates[i]);return{text:parsed.message,results:selected};
  }
  function fallback(q){const results=findCandidates(q).slice(0,3);if(!results.length)return{text:'Tôi chưa tìm thấy thủ tục phù hợp trong danh mục đang niêm yết. Anh/chị có thể mô tả rõ hơn nhu cầu hoặc gọi 0932 293 502 để được cán bộ hỗ trợ.',results:[]};return{text:'Tôi tìm thấy một số thủ tục có thể phù hợp với nhu cầu của anh/chị:',results}}

  async function ask(){const q=input.value.trim();if(!q)return;input.value='';addMessage(q,'user');send.disabled=true;send.textContent='…';if(!procedures.length)await loadData();const candidates=findCandidates(q);let out;try{out=candidates.length?await askGenerativeAI(q,candidates):fallback(q)}catch(e){console.warn('AI browser fallback:',e);out=fallback(q)}history.push({role:'user',content:q});history.push({role:'assistant',content:out.text});addMessage(out.text,'bot',out.results);send.disabled=false;send.textContent='GỬI';input.focus()}

  launcher.addEventListener('click',()=>{panel.classList.add('show');input.focus()});
  close?.addEventListener('click',()=>panel.classList.remove('show'));
  send.addEventListener('click',ask);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});
  document.querySelectorAll('.tthc-suggest').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q||b.textContent;ask()}));
  addMessage('Xin chào! Tôi là Trợ lý AI TTHC Mường Lay. Bạn không cần biết tên thủ tục — chỉ cần nói việc mình muốn làm. Tôi sẽ hiểu nhu cầu và đối chiếu với danh mục TTHC đang niêm yết.');
  loadData();
})();
