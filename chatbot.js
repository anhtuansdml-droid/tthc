(() => {
  const panel=document.getElementById('tthcChatPanel'),launcher=document.getElementById('tthcChatLauncher'),close=document.getElementById('tthcChatClose'),messages=document.getElementById('tthcChatMessages'),input=document.getElementById('tthcChatInput'),send=document.getElementById('tthcChatSend');
  if(!panel||!launcher||!messages||!input||!send)return;
  const API='/api/chat';
  let procedures=[],history=[],dragMoved=false;
  const groups=[
    {words:['khai sinh','mới sinh','sinh con','đẻ','trẻ sơ sinh'],terms:['khai sinh','trẻ em']},
    {words:['khai tử','người mất','qua đời','tử vong'],terms:['khai tử','tử']},
    {words:['kết hôn','lấy vợ','lấy chồng','đám cưới'],terms:['kết hôn','hôn nhân']},
    {words:['hộ kinh doanh','mở cửa hàng','mở quán','đăng ký kinh doanh','buôn bán','tạp hóa'],terms:['hộ kinh doanh','đăng ký kinh doanh']},
    {words:['xây nhà','xây dựng','xin phép xây dựng'],terms:['xây dựng','giấy phép xây dựng']},
    {words:['đất','sổ đỏ','sổ hồng','đất đai','chuyển nhượng đất','tặng cho đất','sang tên đất'],terms:['đất đai','đăng ký đất đai','chuyển nhượng','tặng cho']},
    {words:['an toàn thực phẩm','vệ sinh an toàn thực phẩm','giấy chứng nhận an toàn thực phẩm'],terms:['an toàn thực phẩm']},
    {words:['trợ cấp','người cao tuổi','người già','bảo trợ xã hội','khuyết tật','hộ nghèo','chế độ'],terms:['trợ cấp','bảo trợ xã hội','người cao tuổi','khuyết tật','hộ nghèo']},
    {words:['căn cước','cccd','thẻ căn cước','định danh'],terms:['căn cước','định danh']},
    {words:['thường trú','tạm trú','cư trú','chuyển hộ khẩu','nhập khẩu'],terms:['cư trú','thường trú','tạm trú']},
    {words:['chứng thực','sao y','bản sao','công chứng'],terms:['chứng thực','sao y']},
    {words:['hộ tịch'],terms:['hộ tịch']},
    {words:['người có công','thương binh','liệt sĩ'],terms:['người có công','liệt sĩ','thương binh']}
  ];
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.]+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function submitUrl(x){const u=String(x?.dvcqgId||x?.dvcqg_id||'').trim();if(!u)return '';return 'https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?'+new URLSearchParams({formalityId:u,searchType:'PROVINCE',provinceCode:'11',wardCode:'03151',commune:'WARD',showAdvanced:'false',isProvince:'0',isMinistry:'0'}).toString()}
  function searchUrl(x){const m=String(x?.ma||'').trim();return m?'https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?keyword='+encodeURIComponent(m):'https://ndc.dichvucong.gov.vn/'}
  function addMessage(text,who='bot',results=[]){const box=document.createElement('div');box.className='tthc-msg '+who;box.textContent=text;if(results.length){const list=document.createElement('div');list.className='tthc-results';results.slice(0,3).forEach(r=>{const card=document.createElement('div');card.className='tthc-result';card.innerHTML='<b>'+esc(r.ten||'')+'</b><small>'+esc(r.ma||'')+' · '+esc(r.linhVuc||'')+' · '+esc(r.mucDichVu||'Chưa cập nhật')+'</small><div class="tthc-result-actions"><a class="tthc-submit" href="'+esc(submitUrl(r)||searchUrl(r))+'" target="_blank" rel="noopener noreferrer">➤ NỘP HỒ SƠ TRỰC TUYẾN</a><button type="button" class="tthc-detail">XEM CHI TIẾT</button></div>';card.querySelector('.tthc-detail').onclick=()=>{window.dispatchEvent(new CustomEvent('tthc:open',{detail:r.ma}));panel.classList.remove('show')};list.appendChild(card)});box.appendChild(list)}messages.appendChild(box);messages.scrollTop=messages.scrollHeight}
  async function loadData(){if(procedures.length)return;for(const u of ['data/tthc-live.json','data/tthc_430_2026-10-20.json','data/tthc.json']){try{const r=await fetch(u,{cache:'no-store'});if(r.ok){const d=await r.json();if(Array.isArray(d)&&d.length){procedures=d;return}}}catch(e){}}}
  function findCandidates(q){const nq=norm(q),active=groups.filter(g=>g.words.some(w=>nq.includes(norm(w)))),tokens=nq.split(/\s+/).filter(x=>x.length>2);return procedures.map(p=>{const text=norm([p.ma,p.ten,p.linhVuc,p.coQuanChuTri,p.coQuanThucHien,p.mucDichVu].join(' '));let score=0;tokens.forEach(t=>{if(text.includes(t))score++});active.forEach(g=>g.terms.forEach(t=>{if(text.includes(norm(t)))score+=8}));return{p,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(x=>x.p)}
  async function askServer(q){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:history.slice(-6)}),signal:controller.signal});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();const results=Array.isArray(d.results)?d.results:[];return{text:d.message||d.answer||'',results};}finally{clearTimeout(timer)}}
  function fallback(q){const results=findCandidates(q).slice(0,3);return results.length?{text:'Tôi tìm thấy một số thủ tục có thể phù hợp với nhu cầu của anh/chị:',results}:{text:'Tôi chưa tìm thấy thủ tục phù hợp trong danh mục đang niêm yết. Anh/chị có thể mô tả rõ hơn nhu cầu hoặc gọi 0932 293 502 để được cán bộ hỗ trợ.',results:[]}}
  async function ask(){const q=input.value.trim();if(!q)return;input.value='';addMessage(q,'user');send.disabled=true;send.textContent='…';await loadData();let out;try{out=await askServer(q);if(!out.text)throw new Error('AI không trả lời')}catch(e){console.warn('AI server unavailable, fallback:',e);out=fallback(q)}history.push({role:'user',content:q});history.push({role:'assistant',content:out.text});addMessage(out.text,'bot',out.results);send.disabled=false;send.textContent='GỬI';input.focus()}

  function keepInViewport(){
    const r=launcher.getBoundingClientRect(),pad=8;
    let x=Math.max(pad,Math.min(r.left,window.innerWidth-r.width-pad));
    let y=Math.max(pad,Math.min(r.top,window.innerHeight-r.height-pad));
    launcher.style.left=x+'px';launcher.style.top=y+'px';launcher.style.right='auto';launcher.style.bottom='auto';
  }
  function positionPanel(){
    if(!panel.classList.contains('show'))return;
    const r=launcher.getBoundingClientRect(),pw=Math.min(420,window.innerWidth-28),ph=Math.min(650,window.innerHeight-110),gap=12,pad=10;
    let left=r.left+Math.min(r.width/2,pw/2)-pw/2;
    left=Math.max(pad,Math.min(left,window.innerWidth-pw-pad));
    let top=r.top-ph-gap;
    if(top<pad)top=Math.min(window.innerHeight-ph-pad,r.bottom+gap);
    top=Math.max(pad,Math.min(top,window.innerHeight-ph-pad));
    panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';panel.style.bottom='auto';
  }
  function saveLauncherPosition(){try{localStorage.setItem('tthc-chat-position',JSON.stringify({left:launcher.style.left,top:launcher.style.top}))}catch(e){}}
  function restoreLauncherPosition(){try{const p=JSON.parse(localStorage.getItem('tthc-chat-position')||'null');if(p&&p.left&&p.top){launcher.style.left=p.left;launcher.style.top=p.top;launcher.style.right='auto';launcher.style.bottom='auto';keepInViewport();}}catch(e){}}

  let drag={active:false,startX:0,startY:0,startLeft:0,startTop:0};
  launcher.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    const r=launcher.getBoundingClientRect();
    drag={active:true,startX:e.clientX,startY:e.clientY,startLeft:r.left,startTop:r.top};dragMoved=false;launcher.classList.add('dragging');launcher.setPointerCapture?.(e.pointerId);e.preventDefault();
  });
  launcher.addEventListener('pointermove',e=>{
    if(!drag.active)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4)dragMoved=true;
    let x=drag.startLeft+dx,y=drag.startTop+dy,pad=8;
    x=Math.max(pad,Math.min(x,window.innerWidth-launcher.offsetWidth-pad));
    y=Math.max(pad,Math.min(y,window.innerHeight-launcher.offsetHeight-pad));
    launcher.style.left=x+'px';launcher.style.top=y+'px';launcher.style.right='auto';launcher.style.bottom='auto';
    positionPanel();
  });
  function endDrag(){if(!drag.active)return;drag.active=false;launcher.classList.remove('dragging');keepInViewport();saveLauncherPosition();positionPanel();}
  launcher.addEventListener('pointerup',endDrag);launcher.addEventListener('pointercancel',endDrag);
  launcher.addEventListener('click',e=>{if(dragMoved){e.preventDefault();e.stopPropagation();dragMoved=false;return}panel.classList.add('show');positionPanel();input.focus()});
  close.onclick=()=>panel.classList.remove('show');send.onclick=ask;input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}};document.querySelectorAll('.tthc-suggest').forEach(b=>b.onclick=()=>{input.value=b.dataset.q||b.textContent;ask()});
  window.addEventListener('resize',()=>{keepInViewport();positionPanel()});
  restoreLauncherPosition();
  addMessage('Xin chào! Tôi là Trợ lý AI TTHC Mường Lay. Bạn không cần biết tên thủ tục — chỉ cần nói việc mình muốn làm. Tôi sẽ hiểu nhu cầu và đối chiếu với danh mục TTHC đang niêm yết.');loadData();
})();
