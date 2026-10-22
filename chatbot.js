(() => {
  const panel=document.getElementById('tthcChatPanel');
  const launcher=document.getElementById('tthcChatLauncher');
  const close=document.getElementById('tthcChatClose');
  const messages=document.getElementById('tthcChatMessages');
  const input=document.getElementById('tthcChatInput');
  const send=document.getElementById('tthcChatSend');
  if(!panel||!launcher||!messages||!input||!send)return;

  const suggestions=['Tôi mới sinh con, cần làm giấy tờ gì?','Tôi muốn mở hộ kinh doanh','Tôi muốn xin phép xây nhà','Tôi cần làm giấy tờ đất'];
  function addMessage(text,who='bot',results=[]){
    const box=document.createElement('div');box.className='tthc-msg '+who;box.textContent=text;
    if(results.length){const list=document.createElement('div');list.className='tthc-results';results.slice(0,3).forEach(r=>{const a=document.createElement('a');a.className='tthc-result';a.href='#';a.innerHTML=`<b>${escapeHtml(r.ten||'')}</b><small>${escapeHtml(r.ma||'')} · ${escapeHtml(r.linhVuc||'')} · ${escapeHtml(r.mucDichVu||'Chưa cập nhật')}</small>`;a.addEventListener('click',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('tthc:open',{detail:r.ma}));panel.classList.remove('show');});list.appendChild(a)});box.appendChild(list)}
    messages.appendChild(box);messages.scrollTop=messages.scrollHeight;
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function setLoading(v){send.disabled=v;send.textContent=v?'…':'GỬI';}
  async function ask(){const q=input.value.trim();if(!q)return;input.value='';addMessage(q,'user');setLoading(true);try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.message||'Không thể tra cứu');addMessage(data.message||'Đã tìm thấy kết quả phù hợp.', 'bot', data.results||[]);}catch(e){addMessage('Xin lỗi, hiện tôi chưa thể tra cứu. Anh/chị có thể thử lại hoặc gọi 0932 293 502 để được hỗ trợ.','bot')}finally{setLoading(false);input.focus();}}
  launcher.addEventListener('click',()=>{panel.classList.add('show');input.focus()});close?.addEventListener('click',()=>panel.classList.remove('show'));send.addEventListener('click',ask);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});
  document.querySelectorAll('.tthc-suggest').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q||b.textContent;ask()}));
  addMessage('Xin chào! Tôi là Trợ lý TTHC Mường Lay. Bạn không cần biết tên thủ tục — chỉ cần mô tả việc mình muốn làm, tôi sẽ tìm thủ tục phù hợp trong danh mục đang niêm yết.');
})();
