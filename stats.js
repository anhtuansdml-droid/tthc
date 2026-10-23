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

    async function fetchStats(includeInternal = true) {
      const url = `/api/dieuphoi-stats?includeInternal=${includeInternal ? 'true' : 'false'}&v=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store' });
      let body = {};
      try { body = await r.json(); } catch (_) {}
      if (!r.ok) throw new Error(body.message || `Điều phối DVC HTTP ${r.status}`);
      return body;
    }

    function card(icon, title, value, cls, sub = '') {
      const display = typeof value === 'number' ? fmt(value) : value;
      return `<div class="source-stat-card ${cls || ''}"><div class="source-stat-head"><span class="source-dot"></span><span>${title}</span></div><div class="source-stat-number">${display}</div>${sub ? `<div class="source-stat-sub">${sub}</div>` : ''}<span class="source-stat-watermark">${icon}</span></div>`;
    }

    function render(data, includeInternal) {
      const updated = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
      const updatedText = Number.isNaN(updated.getTime()) ? 'Đang cập nhật' : updated.toLocaleString('vi-VN');
      const internalText = data.internal ? ` · Có ${fmt(data.internal)} TTHC nội bộ trong nguồn` : '';
      statsBody.innerHTML = `
        <div class="source-stats-toolbar"><div class="source-stats-title"><span class="source-red-icon">▰</span><div><strong>THỐNG KÊ THỦ TỤC HÀNH CHÍNH</strong><small>(Cập nhật lúc ${esc(updatedText)})</small></div></div><label class="internal-switch"><input id="statsInternalToggle" type="checkbox" ${includeInternal ? 'checked' : ''}><span class="switch-ui"></span><b>Tính cả TTHC Nội bộ</b></label></div>
        <div class="source-summary-grid">${card('▱','TỔNG SỐ TTHC ĐANG HIỆU LỰC',data.total,'neutral')}${card('▦','THỰC HIỆN TẠI CẤP TỈNH',data.province,'blue')}${card('⌂','THỰC HIỆN TẠI CẤP XÃ',data.commune,'green')}</div>
        <div class="source-section-heading"><span>⌁</span><strong>THEO DÕI BIẾN ĐỘNG</strong><div class="source-filters"><span>◉ Tỉnh/Thành phố</span><span>▣ Dữ liệu nguồn trực tiếp</span></div></div>
        <div class="source-change-grid">${card('+','BAN HÀNH MỚI',data.newCount,'new')}${card('✎','SỬA ĐỔI - BỔ SUNG',data.changed,'changed')}${card('▱','BÃI BỎ',data.removed,'removed')}</div>
        <section class="source-dvc-panel"><div class="source-dvc-head"><div><span class="source-blue-icon">◔</span><strong>THỐNG KÊ DỊCH VỤ CÔNG</strong><small>(Cập nhật lúc ${esc(updatedText)})</small></div></div><div class="source-dvc-grid">${card('▱','TỔNG SỐ DVC',data.dvcTotal,'orange')}${card('▥','DVC CẤP TỈNH / CẤP XÃ',`${fmt(data.dvcProvince)} / ${fmt(data.dvcCommune)}`,'gold','Các TTHC đang cung cấp dịch vụ công')}<div class="source-stat-card green split-card"><div class="source-stat-head"><span class="source-dot"></span><span>TOÀN TRÌNH / MỘT PHẦN (TỔNG SỐ)</span></div><div class="source-split-number"><b>${fmt(data.full)}</b><i>/</i><b>${fmt(data.partial)}</b></div><span class="source-stat-watermark">↯</span></div></div></section>
        <div class="source-data-note"><strong>Nguồn dữ liệu:</strong> Điều phối DVC tại <b>dieuphoi.netlify.app</b> · Bộ dữ liệu được đọc trực tiếp từ nguồn và làm mới tự động. ${internalText}<span>${includeInternal ? 'Đang tính cả TTHC nội bộ' : 'Đang không tính TTHC nội bộ'}</span></div>`;
      document.getElementById('statsInternalToggle')?.addEventListener('change', async e => { showLoading('Đang cập nhật lại thống kê...'); try { render(await fetchStats(e.target.checked), e.target.checked); } catch (err) { showError(err); } });
    }

    function showLoading(text='Đang lấy dữ liệu thống kê từ Điều phối DVC...') {
      statsBody.innerHTML = `<div class="stats-loading"><div class="stats-spinner"></div><strong>${text}</strong><span>Hệ thống đang đối chiếu dữ liệu nguồn trực tiếp</span></div>`;
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
      try { render(await fetchStats(true), true); } catch (err) { showError(err); }
    }
    function closeStats() { statsModal.classList.remove('show'); statsModal.setAttribute('aria-hidden','true'); document.body.classList.remove('stats-open'); }

    statsBtn.addEventListener('click', openStats);
    statsClose?.addEventListener('click', closeStats);
    statsModal.addEventListener('click', e => { if (e.target === statsModal) closeStats(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && statsModal.classList.contains('show')) closeStats(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStats, {once:true}); else initStats();
})();
