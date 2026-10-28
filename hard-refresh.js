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
    const logoUrl = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/update-20261023/uploads/site/1793084294405-4d2124e7-logo-removebg-preview.png?v=20261028-02';
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
