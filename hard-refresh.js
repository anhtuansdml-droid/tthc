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

  function loadTthcUpdater() {
    if (document.getElementById('updateTthcScript')) return;
    const script = document.createElement('script');
    script.id = 'updateTthcScript';
    script.src = 'update-tthc.js?v=20261026-02';
    script.defer = true;
    document.head.appendChild(script);
  }

  function loadPremiumTitleFix() {
    if (document.getElementById('premiumTitleFix')) return;
    const style = document.createElement('style');
    style.id = 'premiumTitleFix';
    style.textContent = `
      .header-title{grid-template-columns:auto minmax(0,1fr)!important;gap:16px!important;align-items:center!important}
      .header-title>div:last-child{padding:15px 22px 13px!important;min-width:0!important}
      .header-title h1{font-size:clamp(24px,3vw,48px)!important;line-height:1.04!important;letter-spacing:-.8px!important;white-space:nowrap!important;word-break:keep-all!important;overflow:visible!important;text-wrap:nowrap!important}
      .header-title p{font-size:clamp(14px,1.45vw,25px)!important;line-height:1.08!important;white-space:nowrap!important;word-break:keep-all!important;overflow:visible!important}
      .header-slogan{font-size:clamp(14px,1.25vw,22px)!important;line-height:1.05!important;margin-top:7px!important;white-space:nowrap!important}
      @media(max-width:1150px){
        .header-title>div:last-child{padding:13px 18px 11px!important}
        .header-title h1{font-size:clamp(22px,3.05vw,42px)!important}
        .header-title p{font-size:clamp(13px,1.55vw,21px)!important}
      }
      @media(max-width:700px){
        .header-title{gap:6px!important}
        .header-title>div:last-child{padding:9px 8px 8px!important;border-radius:16px!important}
        .header-title h1{font-size:clamp(17px,5.3vw,28px)!important;letter-spacing:-.35px!important}
        .header-title p{font-size:clamp(11px,3.35vw,17px)!important}
        .header-slogan{font-size:clamp(11px,3vw,16px)!important;letter-spacing:1.5px!important}
      }
      @media(max-width:420px){
        .header-title h1{font-size:17px!important;letter-spacing:-.45px!important}
        .header-title p{font-size:11px!important}
        .header-slogan{font-size:11px!important;letter-spacing:1px!important}
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('deepRefreshBtn');
    if (btn) btn.addEventListener('click', deepRefresh);
    loadLunarClock();
    loadTthcUpdater();
    loadPremiumTitleFix();
  });
})();
