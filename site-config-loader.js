/* Đọc cấu hình giao diện do trang /admin/ quản lý */
(async function(){
  try {
    const r = await fetch('data/site-config.json?v=' + Date.now(), {cache:'no-store'});
    if(!r.ok) return;
    const c = await r.json();
    const h = c.header || {}, f = c.footer || {}, d = c.display || {};
    const q = s => document.querySelector(s);
    const logo = q('.logo img');
    const pano = q('.header-pano');
    const h1 = q('.header-title h1');
    const sub = q('.header-title p');
    const slogan = q('.header-slogan');
    if(logo && h.logo) logo.src = h.logo;
    if(pano && h.background) pano.style.backgroundImage = 'linear-gradient(90deg,rgba(255,255,255,.88) 0%,rgba(255,255,255,.68) 18%,rgba(255,255,255,.30) 38%,rgba(255,255,255,.03) 60%,rgba(255,255,255,0) 75%),url("'+h.background.replace(/"/g,'\\"')+'")';
    if(h1){ h1.textContent=h.title||h1.textContent; if(h.titleColor) h1.style.color=h.titleColor; }
    if(sub){ sub.textContent=h.subtitle||sub.textContent; if(h.subtitleColor) sub.style.color=h.subtitleColor; }
    if(slogan){ slogan.textContent=h.slogan||slogan.textContent; if(h.sloganColor) slogan.style.color=h.sloganColor; }
    const ftTitle=q('.footer-banner-title'), ftSub=q('.footer-banner-sub'), ftAuthor=q('.footer-banner-author');
    if(ftTitle && f.title) ftTitle.textContent=f.title;
    if(ftSub){
      const lines=ftSub.parentElement.querySelectorAll('.footer-banner-sub');
      if(lines[0] && f.subtitle) lines[0].textContent=f.subtitle;
      if(lines[1]) lines[1].innerHTML='Nguồn dữ liệu: <a class="footer-banner-source" href="'+(f.sourceUrl||'https://dichvucong.gov.vn/')+'" target="_blank" rel="noopener noreferrer">'+(f.sourceText||'Cổng Dịch vụ công Quốc gia')+'</a>';
    }
    if(ftAuthor) ftAuthor.innerHTML='Tác giả: <strong>'+ (f.author||'') +'</strong><br>'+ (f.unit||'');
    const clock=q('#clock'); if(clock && d.showClock===false) clock.style.display='none';
    const stats=q('#statsBtn'); if(stats && d.showStats===false) stats.style.display='none';
    if(d.columns) document.documentElement.style.setProperty('--admin-columns', String(d.columns));
  }catch(e){ console.warn('Không tải được site-config.json',e); }
})();
