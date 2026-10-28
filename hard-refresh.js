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
      .header-title{grid-template-columns:clamp(96px,10vw,150px) minmax(0,1fr)!important;gap:14px!important;align-items:center!important;width:100%!important;min-width:0!important}
      .header-title>div:last-child{padding:11px 18px 10px!important;min-width:0!important;width:100%!important;box-sizing:border-box!important}
      .header-title h1{font-size:clamp(22px,3.05vw,40px)!important;line-height:1.02!important;letter-spacing:-.55px!important;white-space:nowrap!important;word-break:keep-all!important;overflow:visible!important;text-wrap:nowrap!important}
      .header-title p{font-size:clamp(14px,1.72vw,22px)!important;line-height:1.06!important;white-space:nowrap!important;word-break:keep-all!important;overflow:visible!important}
      .header-slogan{font-size:clamp(13px,1.25vw,20px)!important;line-height:1.05!important;margin-top:6px!important;white-space:nowrap!important}
      @media(max-width:1150px){
        .header-title{grid-template-columns:112px minmax(0,1fr)!important;gap:10px!important}
        .header-title>div:last-child{padding:10px 14px 9px!important}
        .header-title h1{font-size:clamp(21px,3.15vw,36px)!important}
        .header-title p{font-size:clamp(13px,1.75vw,20px)!important}
      }
      @media(max-width:700px){
        .header-title{grid-template-columns:1fr!important;gap:8px!important}
        .header-title>div:last-child{width:100%!important;padding:9px 7px 8px!important;border-radius:16px!important}
        .header-title h1{font-size:clamp(17px,5vw,27px)!important;letter-spacing:-.35px!important}
        .header-title p{font-size:clamp(11px,3.15vw,16px)!important}
        .header-slogan{font-size:clamp(11px,2.9vw,15px)!important;letter-spacing:1.5px!important}
      }
      @media(max-width:420px){
        .header-title h1{font-size:17px!important;letter-spacing:-.4px!important}
        .header-title p{font-size:11px!important}
        .header-slogan{font-size:11px!important;letter-spacing:1px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function loadNewLogo() {
    const logoUrl = 'data:image/webp;base64,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';
    const apply = () => {
      document.querySelectorAll('.logo img,.tthc-promo-logo,.tthc-promo-mini-logo').forEach((img) => {
        img.src = logoUrl;
        img.removeAttribute('srcset');
      });
      const style = document.getElementById('newLogoStyle') || document.createElement('style');
      style.id = 'newLogoStyle';
      style.textContent = `.logo img{content:url("${logoUrl}")!important}`;
      if (!style.parentNode) document.head.appendChild(style);
    };
    apply();
    setTimeout(apply, 100);
    setTimeout(apply, 500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('deepRefreshBtn');
    if (btn) btn.addEventListener('click', deepRefresh);
    loadLunarClock();
    loadTthcUpdater();
    loadPremiumTitleFix();
    loadNewLogo();
  });
})();
