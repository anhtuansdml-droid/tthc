(() => {
  const panel=document.getElementById('tthcChatPanel');
  const launcher=document.getElementById('tthcChatLauncher');
  const close=document.getElementById('tthcChatClose');
  const messages=document.getElementById('tthcChatMessages');
  const input=document.getElementById('tthcChatInput');
  const send=document.getElementById('tthcChatSend');
  if(!panel||!launcher||!messages||!input||!send)return;

  let procedures=[];
  const groups=[
    {words:['khai sinh','mới sinh','sinh con','đẻ','trẻ sơ sinh','giấy khai sinh'],terms:['khai sinh']},
    {words:['khai tử','người mất','qua đời','tử vong','giấy báo tử'],terms:['khai tử']},
    {words:['kết hôn','đăng ký kết hôn','lấy vợ','lấy chồng','đám cưới'],terms:['kết hôn']},
    {words:['hộ kinh doanh','mở cửa hàng','mở quán','đăng ký kinh doanh','buôn bán'],terms:['hộ kinh doanh','đăng ký kinh doanh']},
    {words:['xây nhà','xây dựng','xin phép xây dựng','giấy phép xây dựng'],terms:['xây dựng','giấy phép xây dựng']},
    {words:['đất','sổ đỏ','sổ hồng','đất đai','chuyển nhượng đất','tặng cho đất','sang tên đất'],terms:['đất đai','đăng ký đất đai','chuyển nhượng','tặng cho']},
    {words:['an toàn thực phẩm','vệ sinh an toàn thực phẩm','đủ điều kiện an toàn thực phẩm','giấy chứng nhận an toàn thực phẩm'],terms:['an toàn thực phẩm']},
    {words:['trợ cấp','người cao tuổi','người già','bảo trợ xã hội','khuyết tật','hộ nghèo'],terms:['trợ cấp','bảo trợ xã hội','người cao tuổi','khuyết tật']},
    {words:['căn cước','cccd','thẻ căn cước','định danh'],terms:['căn cước','định danh']},
    {words:['thường trú','tạm trú','cư trú','chuyển hộ khẩu','nhập khẩu'],terms:['cư trú','thường trú','tạm trú']},
    {words:['chứng thực','sao y','bản sao','công chứng'],terms:['chứng thực','sao y']},
    {words:['hộ tịch','giấy tờ hộ tịch'],terms:['hộ tịch']},
    {words:['người có công','thương binh','liệt sĩ','thân nhân liệt sĩ'],terms:['người có công','liệt sĩ','thương binh']},
    {words:['đăng ký xe','xe máy','ô tô','phương tiện'],terms:['đăng ký xe','phương tiện']}
  ];

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.]+/g,' ').trim()}
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function submitUrl(item){
    const uuid=String(item?.dvcqgId||item?.dvcqg_id||'').trim();
    if(!uuid)return '';
    const params=new URLSearchParams({
      formalityId:uuid,
      searchType:'PROVINCE',
      provinceCode:'11',
      wardCode:'03151',
      commune:'WARD',
      showAdvanced:'false',
      isProvince:'0',
      isMinistry:'0'
    });
    return `https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?${params.toString()}`;
  }

  function searchUrl(item){
    const ma=String(item?.ma||'').trim();
    return ma ? `https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh?keyword=${encodeURIComponent(ma)}` : 'https://ndc.dichvucong.gov.vn/';
  }

  function addMessage(text,who='bot',results=[]){
    const box=document.createElement('div');box.className='tthc-msg '+who;box.textContent=text;
    if(results.length){
      const list=document.createElement('div');list.className='tthc-results';
      results.slice(0,3).forEach(r=>{
        const card=document.createElement('div');
        card.className='tthc-result';
        const direct=submitUrl(r);
        card.innerHTML=`<b>${escapeHtml(r.ten||'')}</b><small>${escapeHtml(r.ma||'')} · ${escapeHtml(r.linhVuc||'')} · ${escapeHtml(r.mucDichVu||'Chưa cập nhật')}</small><div class="tthc-result-actions"><a class="tthc-submit" href="${escapeHtml(direct||searchUrl(r))}" target="_blank" rel="noopener noreferrer">➤ NỘP HỒ SƠ TRỰC TUYẾN</a><button type="button" class="tthc-detail">XEM CHI TIẾT</button></div>`;
        card.querySelector('.tthc-detail').addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('tthc:open',{detail:r.ma}));panel.classList.remove('show')});
        list.appendChild(card);
      });
      box.appendChild(list);
    }
    messages.appendChild(box);messages.scrollTop=messages.scrollHeight;
  }

  function findMatches(q){
    const nq=norm(q);
    const active=groups.filter(g=>g.words.some(w=>nq.includes(norm(w))));
    const tokens=nq.split(/\s+/).filter(x=>x.length>2);
    return procedures.map(p=>{
      const text=norm([p.ma,p.ten,p.linhVuc,p.coQuanChuTri,p.coQuanThucHien,p.mucDichVu].join(' '));
      let score=0;
      tokens.forEach(t=>{if(text.includes(t))score+=1});
      active.forEach(g=>g.terms.forEach(t=>{if(text.includes(norm(t)))score+=7}));
      if(nq.includes(norm(p.ma||'')) && p.ma)score+=100;
      return {p,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.p);
  }

  async function loadData(){
    const urls=['data/tthc-live.json','data/tthc_430_2026-10-20.json','data/tthc.json'];
    for(const u of urls){try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)continue;const d=await r.json();if(Array.isArray(d)&&d.length){procedures=d;break}}catch(_){} }
  }

  function reply(q){
    const results=findMatches(q);
    if(!results.length){
      return {text:'Tôi chưa xác định được chính xác thủ tục từ nhu cầu này. Anh/chị có thể nói rõ thêm mình muốn làm việc gì, ví dụ: “mới sinh con”, “mở hộ kinh doanh”, “xin phép xây nhà”, “làm giấy tờ đất”… Nếu cần cán bộ hỗ trợ trực tiếp, gọi 0932 293 502.',results:[]};
    }
    if(results.length===1)return {text:'Tôi tìm thấy thủ tục có thể phù hợp với nhu cầu của anh/chị:',results};
    return {text:`Tôi tìm thấy ${results.length} thủ tục có thể phù hợp. Anh/chị xem các lựa chọn dưới đây:`,results};
  }

  async function ask(){
    const q=input.value.trim();if(!q)return;
    input.value='';addMessage(q,'user');send.disabled=true;send.textContent='…';
    if(!procedures.length)await loadData();
    const out=reply(q);addMessage(out.text,'bot',out.results);
    send.disabled=false;send.textContent='GỬI';input.focus();
  }

  launcher.addEventListener('click',()=>{panel.classList.add('show');input.focus()});
  close?.addEventListener('click',()=>panel.classList.remove('show'));
  send.addEventListener('click',ask);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});
  document.querySelectorAll('.tthc-suggest').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q||b.textContent;ask()}));
  addMessage('Xin chào! Tôi là Trợ lý TTHC Mường Lay. Bạn không cần biết tên thủ tục — chỉ cần mô tả việc mình muốn làm, tôi sẽ tìm thủ tục phù hợp trong danh mục đang niêm yết.');
  loadData();
})();