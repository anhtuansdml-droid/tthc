(() => {
  const statsBtn = document.getElementById('statsBtn');
  const statsModal = document.getElementById('statsModal');
  const statsClose = document.getElementById('statsClose');
  const statsBody = document.getElementById('statsBody');
  if (!statsBtn || !statsModal || !statsBody) return;

  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  const fmt = value => Number(value || 0).toLocaleString('vi-VN');
  const esc = value => { const d = document.createElement('div'); d.textContent = String(value ?? ''); return d.innerHTML; };

  function isInternal(item) {
    const s = norm(`${item?.loai || ''} ${item?.tinhChat || ''} ${item?.phanLoai || ''}`);
    return s.includes('noi bo') || s.includes('nội bộ');
  }
  function isOnline(item) {
    const s = norm(`${item?.mucDichVu || ''} ${item?.mucDo || ''}`);
    return !s.includes('chua cung cap') && !s.includes('khong cung cap');
  }
  function serviceLevel(item) {
    const s = norm(item?.mucDichVu || item?.mucDo || '');
    if (s.includes('toan trinh')) return 'full';
    if (s.includes('mot phan')) return 'partial';
    return 'other';
  }
  function level(item) {
    const s = norm(`${item?.cap || ''} ${item?.capThucHien || ''}`);
    if (s.includes('tinh') || s.includes('thanh pho') || s.includes('cap tinh')) return 'province';
    if (s.includes('xa') || s.includes('phuong') || s.includes('thi tran') || s.includes('cap xa')) return 'commune';
    return 'other';
  }
  function statusGroup(item) {
    const s = norm(`${item?.trangThai || ''} ${item?.status || ''} ${item?.loaiBienDong || ''} ${item?.bienDong || ''}`);
    if (s.includes('bai bo') || s.includes('thu hoi') || s.includes('ngung')) return 'removed';
    if (s.includes('sua doi') || s.includes('bo sung') || s.includes('sua, bo sung')) return 'changed';
    if (s.includes('ban hanh moi') || s.includes('moi ban hanh') || s === 'moi') return 'new';
    return 'none';
  }

  async function loadSourceData() {
    const bust = Date.now();
    const [dataRes, statusRes] = await Promise.all([
      fetch('/api/sync?action=data&v=' + bust, { cache: 'no-store' }),
      fetch('/api/sync?action=status&v=' + bust, { cache: 'no-store' }).catch(() => null)
    ]);
    if (!dataRes.ok) throw new Error('Không tải được dữ liệu Điều phối DVC');
    const payload = await dataRes.json();
    const data = Array.isArray(payload) ? payload : payload.procedures;
    if (!Array.isArray(data)) throw new Error('Dữ liệu TTHC không đúng định dạng');
    let meta = {};
    try { if (statusRes?.ok) meta = await statusRes.json(); } catch (_) {}
    return { data, meta };
  }

  function csvDownload(rows, filename) {
    const cols = ['STT', 'Mã TTHC', 'Tên thủ tục', 'Lĩnh vực', 'Cơ quan công bố', 'Cơ quan thực hiện', 'Cấp thực hiện', 'Mức độ DVC'];
    const out = [cols, ...rows.map((x, i) => [i + 1, x.ma, x.ten, x.linhVuc, x.coQuanChuTri, x.coQuanThucHien, x.cap, x.mucDichVu || x.mucDo])];
    const csv = '\ufeff' + out.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function card(icon, title, value, cls, sub = '') {
    return `<div class="source-stat-card ${cls || ''}"><div class="source-stat-head"><span class="source-dot"></span><span>${title}</span></div><div class="source-stat-number">${fmt(value)}</div>${sub ? `<div class="source-stat-sub">${sub}</div>` : ''}<span class="source-stat-watermark">${icon}</span></div>`;
  }

  async function openStats() {
    statsBody.innerHTML = `<div class="stats-loading"><div class="stats-spinner"></div><strong>Đang đồng bộ dữ liệu thống kê từ Điều phối DVC...</strong><span>Vui lòng chờ trong giây lát</span></div>`;
    statsModal.classList.add('show');
    statsModal.setAttribute('aria-hidden', 'false');
    try {
      const { data: allData, meta } = await loadSourceData();
      const includeInternal = true;
      const data = includeInternal ? allData : allData.filter(x => !isInternal(x));
      const total = data.length;
      const province = data.filter(x => level(x) === 'province').length;
      const commune = data.filter(x => level(x) === 'commune').length;
      const online = data.filter(isOnline);
      const dvcTotal = online.length;
      const dvcProvince = online.filter(x => level(x) === 'province').length;
      const dvcCommune = online.filter(x => level(x) === 'commune').length;
      const full = online.filter(x => serviceLevel(x) === 'full').length;
      const partial = online.filter(x => serviceLevel(x) === 'partial').length;
      const newCount = Number(meta?.added ?? data.filter(x => statusGroup(x) === 'new').length) || 0;
      const changed = Number(meta?.changed ?? data.filter(x => statusGroup(x) === 'changed').length) || 0;
      const removed = Number(meta?.removed ?? data.filter(x => statusGroup(x) === 'removed').length) || 0;
      const updated = meta?.syncedAt ? new Date(meta.syncedAt) : new Date();
      const updatedText = Number.isNaN(updated.getTime()) ? 'Đang cập nhật' : updated.toLocaleString('vi-VN');
      const sourceText = meta?.source === 'https://dieuphoi.netlify.app' || meta?.source === 'https://dieuphoi.netlify.app/niemyet' ? 'Điều phối DVC' : 'Điều phối DVC / Cổng DVCQG';

      statsBody.innerHTML = `
        <div class="source-stats-toolbar">
          <div class="source-stats-title"><span class="source-red-icon">▰</span><div><strong>THỐNG KÊ THỦ TỤC HÀNH CHÍNH</strong><small>(Cập nhật lúc ${esc(updatedText)})</small></div></div>
          <label class="internal-switch"><input id="statsInternalToggle" type="checkbox" checked><span class="switch-ui"></span><b>Tính cả TTHC Nội bộ</b></label>
        </div>
        <div class="source-summary-grid">
          ${card('▱', 'TỔNG SỐ TTHC ĐANG HIỆU LỰC', total, 'neutral')}
          ${card('▦', 'THỰC HIỆN TẠI CẤP TỈNH', province, 'blue')}
          ${card('⌂', 'THỰC HIỆN TẠI CẤP XÃ', commune, 'green')}
        </div>
        <div class="source-section-heading"><span>⌁</span><strong>THEO DÕI BIẾN ĐỘNG</strong><div class="source-filters"><span>◉ Tỉnh/Thành phố</span><span>▣ Dữ liệu đồng bộ gần nhất</span></div></div>
        <div class="source-change-grid">
          ${card('+', 'BAN HÀNH MỚI', newCount, 'new')}
          ${card('✎', 'SỬA ĐỔI - BỔ SUNG', changed, 'changed')}
          ${card('▱', 'BÃI BỎ', removed, 'removed')}
        </div>
        <section class="source-dvc-panel">
          <div class="source-dvc-head"><div><span class="source-blue-icon">◔</span><strong>THỐNG KÊ DỊCH VỤ CÔNG</strong><small>(Cập nhật lúc ${esc(updatedText)})</small></div><div class="source-export"><button id="exportProvinceStats">▣ Tải DS Cấp Tỉnh</button><button id="exportCommuneStats">▣ Tải DS Cấp Xã</button></div></div>
          <div class="source-dvc-grid">
            ${card('▱', 'TỔNG SỐ DVC', dvcTotal, 'orange')}
            ${card('▥', 'DVC CẤP TỈNH / CẤP XÃ', `${fmt(dvcProvince)} / ${fmt(dvcCommune)}`, 'gold', 'Các TTHC đang cung cấp dịch vụ công')}
            <div class="source-stat-card green split-card"><div class="source-stat-head"><span class="source-dot"></span><span>TOÀN TRÌNH / MỘT PHẦN (TỔNG SỐ)</span></div><div class="source-split-number"><b>${fmt(full)}</b><i>/</i><b>${fmt(partial)}</b></div><span class="source-stat-watermark">↯</span></div>
          </div>
        </section>
        <div class="source-data-note"><strong>Nguồn dữ liệu:</strong> ${esc(sourceText)} · Dữ liệu được lấy từ danh mục đang đồng bộ qua hệ thống Điều phối DVC. <span>Tổng bản ghi: ${fmt(allData.length)}</span></div>
      `;

      const toggle = document.getElementById('statsInternalToggle');
      toggle?.addEventListener('change', async () => {
        if (!toggle.checked) {
          const filtered = allData.filter(x => !isInternal(x));
          renderQuickRefresh(filtered, meta, 'Không tính TTHC nội bộ');
        } else {
          renderQuickRefresh(allData, meta, 'Tính cả TTHC nội bộ');
        }
      });
      document.getElementById('exportProvinceStats')?.addEventListener('click', () => csvDownload(data.filter(x => level(x) === 'province'), 'TTHC_cap_tinh.csv'));
      document.getElementById('exportCommuneStats')?.addEventListener('click', () => csvDownload(data.filter(x => level(x) === 'commune'), 'TTHC_cap_xa.csv'));
    } catch (e) {
      statsBody.innerHTML = `<div class="stats-error"><strong>Không tải được dữ liệu thống kê.</strong><span>${esc(e?.message || 'Lỗi không xác định')}</span><button id="statsRetry">↻ THỬ LẠI</button></div>`;
      document.getElementById('statsRetry')?.addEventListener('click', openStats);
    }
  }

  function renderQuickRefresh(data, meta, label) {
    const cards = statsBody.querySelectorAll('.source-stat-card');
    if (!cards.length) return openStats();
    const total = data.length;
    const province = data.filter(x => level(x) === 'province').length;
    const commune = data.filter(x => level(x) === 'commune').length;
    const online = data.filter(isOnline);
    const dvcTotal = online.length;
    const dvcProvince = online.filter(x => level(x) === 'province').length;
    const dvcCommune = online.filter(x => level(x) === 'commune').length;
    const full = online.filter(x => serviceLevel(x) === 'full').length;
    const partial = online.filter(x => serviceLevel(x) === 'partial').length;
    const nums = [...document.querySelectorAll('.source-summary-grid .source-stat-number')];
    if (nums[0]) nums[0].textContent = fmt(total);
    if (nums[1]) nums[1].textContent = fmt(province);
    if (nums[2]) nums[2].textContent = fmt(commune);
    const dvcNums = statsBody.querySelectorAll('.source-dvc-grid .source-stat-number');
    if (dvcNums[0]) dvcNums[0].textContent = fmt(dvcTotal);
    if (dvcNums[1]) dvcNums[1].textContent = `${fmt(dvcProvince)} / ${fmt(dvcCommune)}`;
    const split = statsBody.querySelector('.source-split-number');
    if (split) split.innerHTML = `<b>${fmt(full)}</b><i>/</i><b>${fmt(partial)}</b>`;
    const switchLabel = statsBody.querySelector('.internal-switch b');
    if (switchLabel) switchLabel.textContent = label;
  }

  function closeStats() {
    statsModal.classList.remove('show');
    statsModal.setAttribute('aria-hidden', 'true');
  }

  statsBtn.addEventListener('click', openStats);
  if (statsClose) statsClose.addEventListener('click', closeStats);
  statsModal.addEventListener('click', e => { if (e.target === statsModal) closeStats(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && statsModal.classList.contains('show')) closeStats(); });
})();
