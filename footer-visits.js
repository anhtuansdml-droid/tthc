/* ===== THỐNG KÊ LƯỢT TRUY CẬP Ở CUỐI TRANG ===== */
(() => {
  const init = () => {
    const footer = document.querySelector('.footer');
    if (!footer || document.getElementById('footerVisitStats')) return;

    const box = document.createElement('div');
    box.id = 'footerVisitStats';
    box.className = 'footer-visit-stats';
    box.innerHTML = `
      <div class="footer-visit-title">📊 THỐNG KÊ TRUY CẬP</div>
      <div class="footer-visit-items">
        <div><span>Hôm nay</span><strong id="visitToday">—</strong></div>
        <div><span>Hôm qua</span><strong id="visitYesterday">—</strong></div>
        <div><span>7 ngày</span><strong id="visitLast7">—</strong></div>
        <div><span>Tổng lượt</span><strong id="visitTotal">—</strong></div>
      </div>
    `;
    footer.prepend(box);

    fetch('/api/visits?v=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(data => {
        if (!data || data.ok === false) return;
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');
        const set = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = fmt(value);
        };
        set('visitToday', data.today);
        set('visitYesterday', data.yesterday);
        set('visitLast7', data.last7);
        set('visitTotal', data.total);
      })
      .catch(() => {});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
