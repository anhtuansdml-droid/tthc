(() => {
  const tbody = document.getElementById('feeRows');
  const search = document.getElementById('feeSearch');
  const typeFilter = document.getElementById('feeType');
  const count = document.getElementById('feeCount');
  let items = [];
  let filteredRows = [];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function getGroups() {
    const groups = []; let currentSection = null; let currentGroup = null;
    for (const item of items) {
      if (item.type === 'section') { currentSection = {...item, groups:[]}; groups.push(currentSection); currentGroup = null; }
      else if (item.type === 'group') { currentGroup = {...item, section:currentSection?.stt || '', details:[]}; currentSection?.groups.push(currentGroup); }
      else if (item.type === 'detail' && currentGroup) currentGroup.details.push(item);
    }
    return groups;
  }
  function currentRows() {
    const query = normalize(search.value), selectedSection = typeFilter.value, result = []; let detailCount = 0;
    for (const section of getGroups()) {
      if (selectedSection && section.stt !== selectedSection) continue;
      const sectionRows = [];
      for (const group of section.groups) {
        const groupMatch = query && normalize(group.stt + ' ' + group.name + ' ' + group.note).includes(query);
        const detailRows = group.details.filter(item => !query || groupMatch || normalize([item.stt,item.name,item.direct,item.online,item.note,group.name].join(' ')).includes(query));
        if (detailRows.length || (!group.details.length && (!query || groupMatch))) {
          sectionRows.push({kind:'group',item:group});
          detailRows.forEach(item => sectionRows.push({kind:'detail',item}));
          detailCount += detailRows.length;
        }
      }
      if (sectionRows.length) result.push({kind:'section',item:section},...sectionRows);
    }
    return {rows:result,detailCount};
  }
  function render() {
    const view=currentRows(); filteredRows=view.rows; count.textContent=new Intl.NumberFormat('vi-VN').format(view.detailCount);
    if (!view.rows.length) { tbody.innerHTML='<tr><td colspan="5" class="fee-empty">Không tìm thấy khoản thu phù hợp.</td></tr>'; return; }
    tbody.innerHTML=view.rows.map(row=>{
      const item=row.item;
      if(row.kind==='section') return '<tr class="fee-section"><td>'+escapeHTML(item.stt)+'</td><td colspan="4"><strong>'+escapeHTML(item.name)+'</strong>'+(item.note?'<small>'+escapeHTML(item.note)+'</small>':'')+'</td></tr>';
      if(row.kind==='group') return '<tr class="fee-group"><td>'+escapeHTML(item.stt)+'</td><td colspan="4">'+escapeHTML(item.name)+(item.note?'<div class="fee-note">'+escapeHTML(item.note)+'</div>':'')+'</td></tr>';
      return '<tr class="fee-detail"><td>'+escapeHTML(item.stt)+'</td><td>'+escapeHTML(item.name)+'</td><td class="fee-amount">'+escapeHTML(item.direct||'—')+'</td><td class="fee-online">'+escapeHTML(item.online||'—')+'</td><td class="fee-note">'+escapeHTML(item.note||'—')+'</td></tr>';
    }).join('');
  }
  function downloadCSV() {
    const rows=[['STT','Nội dung thu','Nộp trực tiếp / bưu chính','Nộp trực tuyến','Ghi chú / căn cứ']];
    filteredRows.forEach(row=>{const item=row.item;if(row.kind==='section'||row.kind==='group')rows.push([item.stt,item.name,'','',item.note]);else rows.push([item.stt,item.name,item.direct,item.online,item.note]);});
    const csv='\\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\\r\\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='Bang_phi_le_phi_Muong_Lay_2026-11-19.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  search.addEventListener('input',render); typeFilter.addEventListener('change',render);
  document.getElementById('feeExport').addEventListener('click',downloadCSV);
  document.getElementById('feePrint').addEventListener('click',()=>window.print());
  fetch('/data/phi-le-phi-20261119.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('HTTP '+response.status);return response.json();}).then(data=>{items=Array.isArray(data.items)?data.items:[];render();}).catch(()=>{tbody.innerHTML='<tr><td colspan="5" class="fee-empty">Chưa tải được dữ liệu phí, lệ phí. Vui lòng làm mới trang.</td></tr>';});
})();
