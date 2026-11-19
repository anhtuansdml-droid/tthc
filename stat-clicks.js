(() => {
  let bound = false;
  let activeItems = [];
  let activeLabel = '';
  let page = 1;
  const pageSize = 10;
  let previousFocus = null;

  const configs = [
    { label: 'Tất cả thủ tục hành chính', get: data => data },
    { label: 'Dịch vụ công toàn trình', get: data => data.filter(item => norm(item.mucDichVu) === 'toan trinh') },
    { label: 'Dịch vụ công một phần', get: data => data.filter(item => norm(item.mucDichVu) === 'mot phan') }
  ];

  function norm(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function level(item) {
    if (typeof window.isNoOnlineService === 'function' && window.isNoOnlineService(item)) return 'Chưa cung cấp dịch vụ công';
    const value = norm(item.mucDichVu);
    return value === 'toan trinh' ? 'Toàn trình' : value === 'mot phan' ? 'Một phần' : (item.mucDichVu || 'Chưa cập nhật');
  }

  function ensurePopup() {
    if (document.getElementById('statProcedurePopup')) return;
    const root = document.createElement('div');
    root.id = 'statProcedurePopup';
    root.className = 'stat-popup';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="stat-popup-backdrop" data-popup-close></div>
      <section class="stat-popup-dialog" role="dialog" aria-modal="true" aria-labelledby="statPopupTitle">
        <header class="stat-popup-header">
          <div class="stat-popup-heading">
            <span class="stat-popup-kicker">TRA CỨU DANH MỤC</span>
            <h2 id="statPopupTitle"></h2>
            <p id="statPopupSummary"></p>
          </div>
          <button class="stat-popup-close" type="button" aria-label="Đóng cửa sổ">×</button>
        </header>
        <div class="stat-popup-tools">
          <label class="stat-popup-search"><span aria-hidden="true">⌕</span><input id="statPopupSearch" type="search" placeholder="Tìm theo mã, tên, lĩnh vực hoặc cơ quan..." autocomplete="off"></label>
          <span class="stat-popup-hint">Chọn một thủ tục để xem chi tiết</span>
        </div>
        <div class="stat-popup-list" id="statPopupList" role="list"></div>
        <footer class="stat-popup-footer">
          <span class="stat-popup-page-info" id="statPopupPageInfo"></span>
          <div class="stat-popup-pagination">
            <button type="button" id="statPopupPrev">‹ Trước</button>
            <button type="button" id="statPopupNext">Tiếp ›</button>
          </div>
        </footer>
      </section>`;
    document.body.appendChild(root);

    root.querySelector('.stat-popup-close').addEventListener('click', closePopup);
    root.querySelector('[data-popup-close]').addEventListener('click', closePopup);
    root.querySelector('#statPopupSearch').addEventListener('input', () => { page = 1; renderPopup(); });
    root.querySelector('#statPopupPrev').addEventListener('click', () => { page = Math.max(1, page - 1); renderPopup(); });
    root.querySelector('#statPopupNext').addEventListener('click', () => { page += 1; renderPopup(); });
    root.querySelector('#statPopupList').addEventListener('click', event => {
      const row = event.target.closest('[data-procedure-index]');
      if (!row) return;
      const item = activeItems[Number(row.dataset.procedureIndex)];
      closePopup();
      if (item && typeof showDetailFull === 'function') showDetailFull(item);
      else if (item && typeof showDetail === 'function') showDetail(item);
    });
    document.addEventListener('keydown', event => {
      if (!root.classList.contains('is-open')) return;
      if (event.key === 'Escape') closePopup();
      if (event.key === 'Tab') trapFocus(event, root);
    });
  }

  function trapFocus(event, root) {
    const focusable = [...root.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openPopup(config, items, trigger) {
    ensurePopup();
    previousFocus = trigger || document.activeElement;
    activeLabel = config.label;
    activeItems = items;
    page = 1;
    document.getElementById('statPopupSearch').value = '';
    document.getElementById('statProcedurePopup').classList.add('is-open');
    document.getElementById('statProcedurePopup').setAttribute('aria-hidden', 'false');
    document.body.classList.add('stat-popup-open');
    renderPopup();
    document.getElementById('statPopupSearch').focus({ preventScroll: true });
  }

  function closePopup() {
    const root = document.getElementById('statProcedurePopup');
    if (!root || !root.classList.contains('is-open')) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stat-popup-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }

  function renderPopup() {
    const search = norm(document.getElementById('statPopupSearch').value);
    const filtered = activeItems.map((item, index) => ({ item, index })).filter(({item}) => {
      const haystack = norm([item.ma, item.ten, item.linhVuc, item.coQuanChuTri, item.coQuanThucHien].join(' '));
      return !search || haystack.includes(search);
    });
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pageCount);
    const start = (page - 1) * pageSize;
    const shown = filtered.slice(start, start + pageSize);
    document.getElementById('statPopupTitle').textContent = activeLabel;
    document.getElementById('statPopupSummary').textContent = search
      ? `Tìm thấy ${filtered.length.toLocaleString('vi-VN')} thủ tục phù hợp`
      : `${activeItems.length.toLocaleString('vi-VN')} thủ tục trong danh mục`;
    document.getElementById('statPopupList').innerHTML = shown.length ? shown.map(({item,index}) => `
      <button class="stat-popup-row" type="button" role="listitem" data-procedure-index="${index}">
        <span class="stat-popup-code">${esc(item.ma || 'Chưa có mã')}</span>
        <span class="stat-popup-main"><strong>${esc(item.ten || 'Chưa có tên thủ tục')}</strong><span>${esc(item.linhVuc || 'Chưa cập nhật lĩnh vực')} · ${esc(item.coQuanThucHien || item.coQuanChuTri || 'Chưa cập nhật cơ quan')}</span></span>
        <span class="stat-popup-level ${norm(level(item)).replace(/\s+/g,'-')}">${esc(level(item))}</span>
        <span class="stat-popup-chevron" aria-hidden="true">›</span>
      </button>`).join('') : '<div class="stat-popup-empty">Không tìm thấy thủ tục phù hợp. Thử từ khóa khác.</div>';
    document.getElementById('statPopupPageInfo').textContent = filtered.length
      ? `Hiển thị ${start + 1}–${Math.min(start + pageSize, filtered.length)} / ${filtered.length.toLocaleString('vi-VN')}`
      : '0 thủ tục';
    document.getElementById('statPopupPrev').disabled = page <= 1;
    document.getElementById('statPopupNext').disabled = page >= pageCount;
  }

  function bind() {
    if (bound || !Array.isArray(window.procedures) || !window.procedures.length) return;
    const cards = [...document.querySelectorAll('.statistics .stat-card')];
    if (cards.length < 3) return;
    bound = true;
    cards.slice(0, 3).forEach((card, index) => {
      card.classList.add('stat-card-clickable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-label', `Mở danh sách: ${configs[index].label}`);
      const activate = () => openPopup(configs[index], configs[index].get(window.procedures), card);
      card.addEventListener('click', activate);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    const timer = setInterval(() => { bind(); if (bound) clearInterval(timer); }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  });
})();
