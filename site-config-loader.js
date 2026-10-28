/* Đọc cấu hình giao diện từ API cùng tên miền; tránh phụ thuộc deployment/domain cũ. */
(async function(){
  try{
    const api='/api/admin';
    let r=await fetch(api+'?v='+Date.now(),{cache:'no-store',credentials:'same-origin'});
    if(!r.ok) r=await fetch('data/site-config.json?v='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const c=await r.json(),h=c.header||{},f=c.footer||{},d=c.display||{};
    const q=s=>document.querySelector(s);
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
    const elements={...(c.elements||{}),...((c.layout&&c.layout.elements)||{})};
    const selectors={headerLogo:'.header-title .logo img',headerTitle:'.header-title h1',headerSubtitle:'.header-title p',headerSlogan:'.header-slogan',clock:'#clock',homeBtn:'.home-btn',searchBox:'.search-box',configBtn:'#configBtn',guideBtn:'.pakn-btn',statsBtn:'#statsBtn',refreshBtn:'#deepRefreshBtn',supportBtn:'.support-btn',adminBtn:'.admin-link',promo:'.tthc-promo-banner',promoTitle:'.tthc-promo-title',promoSubtitle:'.tthc-promo-subtitle',statsSection:'.statistics',sectionTitle:'.section-title h2',fieldGrid:'#fieldContainer',footer:'.footer-banner',footerTitle:'.footer-banner-title',footerAuthor:'.footer-banner-author',chat:'#tthcChatLauncher'};
    Object.keys(elements).forEach(id=>{const c=elements[id],el=q(selectors[id]);if(!el||!c)return;el.style.setProperty('transform',`translate(${Number(c.x)||0}px,${Number(c.y)||0}px) scale(${Number(c.scale)||1}) rotate(${Number(c.rotate)||0}deg)`,'important');el.style.position='relative';el.style.display=c.hidden?'none':'';if(Number(c.width)>0)el.style.width=Number(c.width)+'px';if(Number(c.height)>0)el.style.height=Number(c.height)+'px';if(Number(c.fontSize)>0)el.style.fontSize=Number(c.fontSize)+'px';if(c.text&&['headerLogo','footer'].indexOf(id)<0&&!['clock','searchBox'].includes(id))el.textContent=c.text;if(c.image&&id==='headerLogo')el.src=c.image});
  }catch(e){console.warn('Không tải được cấu hình giao diện',e)}
  try{
    if(!document.querySelector('script[data-visit-tracker]')){
      const s=document.createElement('script');s.src='/visit-tracker.js?v=20261023-01';s.async=true;s.dataset.visitTracker='1';document.head.appendChild(s);
    }
  }catch(e){console.warn('Không khởi tạo được bộ thống kê truy cập',e)}
})();
