(() => {
  const statsBtn = document.getElementById('statsBtn');
  const statsModal = document.getElementById('statsModal');
  const statsClose = document.getElementById('statsClose');
  const statsBody = document.getElementById('statsBody');
  if (!statsBtn || !statsModal || !statsBody) return;

  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').toLowerCase().trim();

  function noOnline(item) {
    const s = norm(`${item?.mucDichVu || ''} ${item?.mucDo || ''}`);
    return s.includes('chua cung cap dvc') || s.includes('chua cung cap dich vu cong');
  }

  function serviceType(item) {
    if (noOnline(item)) return 'none';
    const s = norm(item?.mucDichVu);
    if (s === 'toan trinh') return 'full';
    if (s === 'mot phan') return 'partial';
    return 'other';
  }

  function esc(v) {
    const d = document.createElement('div'); d.textContent = String(v ?? ''); return d.innerHTML;
  }

  function openStats() {
    const data = Array.isArray(window.procedures) ? window.procedures : [];
    const total = data.length;
    const full = data.filter(x => serviceType(x) === 'full').length;
    const partial = data.filter(x => serviceType(x) === 'partial').length;
    const none = data.filter(x => serviceType(x) === 'none').length;
    const other = total - full - partial - none;
    const withDvc = data.filter(x => !noOnline(x) && String(x.dvcqgId || '').trim()).length;

    const fields = new Map();
    data.forEach(x => { const k = x.linhVuc || 'Chưa xác định'; fields.set(k, (fields.get(k)||0)+1); });
    const fieldRows = [...fields.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20);
    const maxField = fieldRows[0]?.[1] || 1;

    const agencies = new Map();
    data.forEach(x => { const k = x.coQuanChuTri || 'Chưa cập nhật'; agencies.set(k, (agencies.get(k)||0)+1); });
    const agencyRows = [...agencies.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15);

    const pct = n => total ? `${(n*100/total).toFixed(1)}%` : '0%';
    const today = new Date().toLocaleString('vi-VN');

    statsBody.innerHTML = `
      <div class="stats-summary">
        <div class="stats-box"><div class="n">${total}</div><div class="l">TỔNG SỐ TTHC</div></div>
        <div class="stats-box full"><div class="n">${full}</div><div class="l">DỊCH VỤ CÔNG TOÀN TRÌNH · ${pct(full)}</div></div>
        <div class="stats-box partial"><div class="n">${partial}</div><div class="l">DỊCH VỤ CÔNG MỘT PHẦN · ${pct(partial)}</div></div>
        <div class="stats-box none"><div class="n">${none}</div><div class="l">CHƯA CUNG CẤP DVC · ${pct(none)}</div></div>
      </div>
      <div class="stats-grid">
        <section class="stats-panel">
          <h3>📊 Cơ cấu dịch vụ công</h3>
          ${[['Toàn trình',full],['Một phần',partial],['Chưa cung cấp DVC',none],['Khác/chưa phân loại',other]].map(([name,n])=>`
            <div class="stats-row"><div><div class="stats-row-name">${name}</div><div class="stats-bar-wrap"><div class="stats-bar" style="width:${total ? Math.min(100,n*100/total):0}%"></div></div></div><div class="stats-row-num">${n}</div></div>`).join('')}
          <div class="stats-note">Có <b>${withDvc}</b> TTHC đã có mã/liên kết DVCQG trong dữ liệu website.</div>
        </section>
        <section class="stats-panel">
          <h3>📚 Top lĩnh vực có nhiều TTHC</h3>
          <div class="stats-more">
            ${fieldRows.map(([name,n])=>`<div class="stats-row"><div><div class="stats-row-name">${esc(name)}</div><div class="stats-bar-wrap"><div class="stats-bar" style="width:${Math.max(4,n*100/maxField)}%"></div></div></div><div class="stats-row-num">${n}</div></div>`).join('')}
          </div>
        </section>
        <section class="stats-panel">
          <h3>🏛 Cơ quan chủ trì</h3>
          <div class="stats-more"><table class="stats-table"><thead><tr><th>Cơ quan</th><th>Số TTHC</th></tr></thead><tbody>${agencyRows.map(([name,n])=>`<tr><td>${esc(name)}</td><td>${n}</td></tr>`).join('')}</tbody></table></div>
        </section>
        <section class="stats-panel">
          <h3>ℹ️ Ghi chú dữ liệu</h3>
          <table class="stats-table"><tbody>
            <tr><td>Danh sách TTHC</td><td>430</td></tr>
            <tr><td>Cập nhật danh sách</td><td>20/10/2026</td></tr>
            <tr><td>DVCQG đã gắn mã/liên kết</td><td>${withDvc}</td></tr>
            <tr><td>Nguồn</td><td>Cổng DVCQG</td></tr>
          </tbody></table>
          <div class="stats-note">Số liệu được tính trực tiếp từ dữ liệu TTHC đang được website tải. Thủ tục chưa cung cấp dịch vụ công được giữ riêng và không hiển thị nút nộp trực tuyến.</div>
        </section>
      </div>
      <div class="stats-footer-line">Thời điểm xem thống kê: ${today}</div>`;

    statsModal.classList.add('show');
    statsModal.setAttribute('aria-hidden','false');
  }

  function closeStats() {
    statsModal.classList.remove('show');
    statsModal.setAttribute('aria-hidden','true');
  }

  statsBtn.addEventListener('click', openStats);
  if (statsClose) statsClose.addEventListener('click', closeStats);
  statsModal.addEventListener('click', e => { if (e.target === statsModal) closeStats(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && statsModal.classList.contains('show')) closeStats(); });
})();
