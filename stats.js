(() => {
  function initStats() {
    const statsBtn = document.getElementById('statsBtn');
    const statsModal = document.getElementById('statsModal');
    const statsClose = document.getElementById('statsClose');
    const statsBody = document.getElementById('statsBody');
    if (!statsBtn || !statsModal || !statsBody) return;
    if (statsBtn.dataset.statsBound === '1') return;
    statsBtn.dataset.statsBound = '1';

    const fmt = value => Number(value || 0).toLocaleString('vi-VN');
    const esc = value => { const d = document.createElement('div'); d.textContent = String(value ?? ''); return d.innerHTML; };

    async function fetchStats(refresh = false) {
      const url = `/api/dieuphoi-tthc?refresh=${refresh ? 'true' : 'false'}&v=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store' });
      let body = {};
      try { body = await r.json(); } catch (_) {}
      if (!r.ok || !body.ok) throw new Error(body.message || `Điều phối DVC HTTP ${r.status}`);
      return body;
    }

    function card(icon, title, value, cls, sub = '') {
      const display = typeof value === 'number' ? fmt(value) : value;
      return `<div class="source-stat-card ${cls || ''}"><div class="source-stat-head"><span class="source-dot"></span><span>${title}</span></div><div class="source-stat-number">${display}</div>${sub ? `<div class="source-stat-sub">${sub}</div>` : ''}<span class="source-stat-watermark">${icon}</span></div>`;
    }

    function render(data) {
      const updated = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
      const updatedText = Number.isNaN(updated.getTime()) ? 'Đang cập nhật' : updated.toLocaleString('vi-VN');
      statsBody.innerHTML = `
        <div class="source-stats-toolbar">
          <div class="source-stats-title"><span class="source-red-icon">▰</span><div><strong>THỐNG KÊ TTHC MƯỜNG LAY</strong><small>(Đồng bộ lúc ${esc(updatedText)})</small></div></div>
          <button id="statsSyncBtn" class="stats-sync-btn" type="button">↻ &nbsp;ĐỒNG BỘ TỪ ĐIỀU PHỐI SIÊU TỐC</button>
        </div>

        <div class="source-summary-grid">
          ${card('▱','TỔNG SỐ TTHC MƯỜNG LAY',data.total,'neutral','Dữ liệu lấy trực tiếp từ Điều phối DVC')}
          ${card('⌂','TTHC CÓ CẤP XÃ',data.commune,'green')}
          ${card('▦','TTHC CÓ CẤP TỈNH',data.province,'blue')}
        </div>

        <div class="source-section-heading"><span>▣</span><strong>DỊCH VỤ CÔNG</strong><div class="source-filters"><span>Điều phối DVC Siêu tốc</span><span>Không dùng danh mục 428 cũ</span></div></div>
        <div class="source-dvc-panel" style="margin-top:0">
          <div class="source-dvc-head"><div><span class="source-blue-icon">◔</span><strong>THỐNG KÊ DỊCH VỤ CÔNG MƯỜNG LAY</strong><small>Đồng bộ trực tiếp từ nguồn CSV</small></div></div>
          <div class="source-dvc-grid">
            ${card('▱','TỔNG SỐ DVC',data.dvcTotal,'orange')}
            ${card('▥','DVC CẤP TỈNH / CẤP XÃ',`${fmt(data.dvcProvince)} / ${fmt(data.dvcCommune)}`,'gold','TTHC có phạm vi thực hiện tương ứng')}
            <div class="source-stat-card green split-card"><div class="source-stat-head"><span class="source-dot"></span><span>TOÀN TRÌNH / MỘT PHẦN</span></div><div class="source-split-number"><b>${fmt(data.full)}</b><i>/</i><b>${fmt(data.partial)}</b></div><span class="source-stat-watermark">↯</span></div>
          </div>
        </div>

        <div class="source-data-note"><strong>Nguồn:</strong> Điều phối DVC Siêu tốc · <b>${fmt(data.total)} TTHC Mường Lay</b> · <span>Nhấn “Đồng bộ” để lấy dữ liệu mới nhất</span></div>`;

      document.getElementById('statsSyncBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('statsSyncBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⟳  ĐANG ĐỒNG BỘ...'; }
        showLoading('Đang lấy dữ liệu mới nhất từ Điều phối Siêu tốc...');
        try {
          const data = await fetchStats(true);
          render(data);
          if (typeof window.syncTthcFromDieuPhoi === 'function') {
            await window.syncTthcFromDieuPhoi().catch(() => {});
            setTimeout(() => location.reload(), 150);
          }
        } catch (err) {
          showError(err);
        }
      });
    }

    function showLoading(text='Đang lấy dữ liệu thống kê từ Điều phối Siêu tốc...') {
      statsBody.innerHTML = `<div class="stats-loading"><div class="stats-spinner"></div><strong>${text}</strong><span>Hệ thống đang đọc trực tiếp dữ liệu CSV nguồn</span></div>`;
    }
    function showError(error) {
      statsBody.innerHTML = `<div class="stats-error"><strong>Không lấy được dữ liệu từ Điều phối DVC.</strong><span>${esc(error?.message || 'Lỗi không xác định')}</span><button id="statsRetry">↻ THỬ LẠI</button></div>`;
      document.getElementById('statsRetry')?.addEventListener('click', openStats);
    }
    async function openStats(e) {
      e?.preventDefault(); e?.stopPropagation();
      statsModal.classList.add('show');
      statsModal.setAttribute('aria-hidden','false');
      document.body.classList.add('stats-open');
      showLoading();
      try { render(await fetchStats(false)); } catch (err) { showError(err); }
    }
    function closeStats() { statsModal.classList.remove('show'); statsModal.setAttribute('aria-hidden','true'); document.body.classList.remove('stats-open'); }

    statsBtn.addEventListener('click', openStats);
    statsClose?.addEventListener('click', closeStats);
    statsModal.addEventListener('click', e => { if (e.target === statsModal) closeStats(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && statsModal.classList.contains('show')) closeStats(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStats, {once:true}); else initStats();
})();
