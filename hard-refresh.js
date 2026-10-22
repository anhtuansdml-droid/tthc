(() => {
  function deepRefresh() {
    const btn = document.getElementById('deepRefreshBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⟳ ĐANG LÀM MỚI...';
    }

    try {
      localStorage.removeItem('tthc_theme');
      sessionStorage.clear();
    } catch (_) {}

    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    url.searchParams.set('_cache', Math.random().toString(36).slice(2));

    setTimeout(() => {
      window.location.replace(url.toString());
    }, 250);
  }

  function loadLunarClock() {
    if (!document.getElementById('lunarClockStyle')) {
      const style = document.createElement('style');
      style.id = 'lunarClockStyle';
      style.textContent = `
        .clock{display:flex!important;flex-direction:column;align-items:flex-end;gap:2px;line-height:1.12;min-width:185px}
        .clock-solar{font-size:1em;font-weight:900}
        .clock-lunar{font-size:.82em;font-weight:700;opacity:.95}
        .clock-time{font-size:.82em;font-weight:700;opacity:.95}
        @media(max-width:760px){.clock{min-width:112px;gap:1px}.clock-solar{font-size:1em}.clock-lunar,.clock-time{font-size:.78em}}
      `;
      document.head.appendChild(style);
    }
    const script = document.createElement('script');
    script.src = 'clock-lunar.js?v=20261022-17';
    script.defer = true;
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('deepRefreshBtn');
    if (btn) btn.addEventListener('click', deepRefresh);
    loadLunarClock();
  });
})();
