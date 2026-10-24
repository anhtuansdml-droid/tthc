/* Đọc cấu hình giao diện từ API cùng tên miền; tránh phụ thuộc deployment/domain cũ. */
(async function(){
  try{
    const api='/api/admin';
    let r=await fetch(api+'?v='+Date.now(),{cache:'no-store',credentials:'same-origin'});
    if(!r.ok) r=await fetch('data/site-config.json?v='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const c=await r.json(),h=c.header||{},f=c.footer||{},d=c.display||{};
    const q=s=>document.querySelector(s);
    const root=document.documentElement;
    const num=(v,fallback)=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:fallback};
    root.style.setProperty('--admin-header-width',num(h.backgroundWidth,100)+'%');
    root.style.setProperty('--admin-header-height',num(h.backgroundHeight,250)+'px');
    root.style.setProperty('--admin-header-mobile-height',num(h.backgroundMobileHeight,165)+'px');
    root.style.setProperty('--admin-footer-width',num(f.backgroundWidth,100)+'%');
    root.style.setProperty('--admin-footer-height',num(f.backgroundHeight,300)+'px');
    root.style.setProperty('--admin-footer-mobile-height',num(f.backgroundMobileHeight,330)+'px');
    const logo=q('.logo img'),pano=q('.header-pano'),h1=q('.header-title h1'),sub=q('.header-title p'),slogan=q('.header-slogan');
    if(logo&&h.logo)logo.src=h.logo;
    if(pano&&h.background)pano.style.backgroundImage='linear-gradient(90deg,rgba(255,255,255,.88) 0%,rgba(255,255,255,.68) 18%,rgba(255,255,255,.30) 38%,rgba(255,255,255,.03) 60%,rgba(255,255,255,0) 75%),url("'+h.background.replace(/"/g,'\\"')+'")';
    if(h1){h1.textContent=h.title||h1.textContent;if(h.titleColor)h1.style.color=h.titleColor}
    if(sub){sub.textContent=h.subtitle||sub.textContent;if(h.subtitleColor)sub.style.color=h.subtitleColor}
    if(slogan){slogan.textContent=h.slogan||slogan.textContent;if(h.sloganColor)slogan.style.color=h.sloganColor}
    const ftTitle=q('.footer-banner-title'),lines=document.querySelectorAll('.footer-banner-sub'),ftAuthor=q('.footer-banner-author');
    if(ftTitle&&f.title)ftTitle.textContent=f.title;
    if(lines[0]&&f.subtitle)lines[0].textContent=f.subtitle;
    if(lines[1])lines[1].innerHTML='Nguồn dữ liệu: <a class="footer-banner-source" href="'+(f.sourceUrl||'https://dichvucong.gov.vn/')+'" target="_blank" rel="noopener noreferrer">'+(f.sourceText||'Cổng Dịch vụ công Quốc gia')+'</a>';
    if(ftAuthor)ftAuthor.innerHTML='Tác giả: <strong>'+(f.author||'')+'</strong><br>'+(f.unit||'');
    const ft=q('.footer-banner');if(ft&&f.background)ft.style.backgroundImage='linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.12)),url("'+f.background.replace(/"/g,'\\"')+'")';
    const clock=q('#clock'),stats=q('#statsBtn');if(clock)clock.style.display=d.showClock===false?'none':'';if(stats)stats.style.display=d.showStats===false?'none':'';document.documentElement.style.setProperty('--admin-columns',String(d.columns||4));
  }catch(e){console.warn('Không tải được cấu hình giao diện',e)}
  try{
    if(!document.querySelector('script[data-visit-tracker]')){
      const s=document.createElement('script');s.src='/visit-tracker.js?v=20261023-01';s.async=true;s.dataset.visitTracker='1';document.head.appendChild(s);
    }
  }catch(e){console.warn('Không khởi tạo được bộ thống kê truy cập',e)}
})();
