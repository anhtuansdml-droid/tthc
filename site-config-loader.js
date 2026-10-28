/* Đọc cấu hình giao diện từ API cùng tên miền; tránh phụ thuộc deployment/domain cũ. */
(async function(){
  try{
    const api='/api/admin';
    let r=await fetch(api+'?v='+Date.now(),{cache:'no-store',credentials:'same-origin'});
    if(!r.ok) r=await fetch('data/site-config.json?v='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const c=await r.json(),h=c.header||{},f=c.footer||{},d=c.display||{},l=c.layout||{},n=c.nav||{};
    const q=s=>document.querySelector(s);
    const root=document.documentElement;
    const num=(v,fallback)=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:fallback};
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
    const clock=q('#clock'),stats=q('#statsBtn');if(clock)clock.style.display=d.showClock===false?'none':'';if(stats)stats.style.display=d.showStats===false?'none':'';root.style.setProperty('--admin-columns',String(d.columns||4));

    /* ===== TRÌNH THIẾT KẾ TỰ DO: khung trang ===== */
    const targets={header:q('.header'),nav:q('.nav'),promo:q('.tthc-promo-banner'),stats:q('.statistics'),main:q('.main'),footer:q('.footer-banner')};
    const blocks=Array.isArray(l.blocks)&&l.blocks.length?l.blocks:[
      {id:'header',order:1,width:100,marginTop:0,marginBottom:0,hidden:false},{id:'nav',order:2,width:100,marginTop:0,marginBottom:12,hidden:false},{id:'promo',order:3,width:100,marginTop:0,marginBottom:18,hidden:false},{id:'stats',order:4,width:94,marginTop:0,marginBottom:18,hidden:false},{id:'main',order:5,width:100,marginTop:0,marginBottom:18,hidden:false},{id:'footer',order:6,width:100,marginTop:0,marginBottom:0,hidden:false}
    ].slice().sort((a,b)=>(a.order||0)-(b.order||0));
    const first=Object.values(targets).find(Boolean);
    let flow=q('.site-layout-root');
    if(!flow&&first){
      flow=document.createElement('div');flow.className='site-layout-root';flow.style.width='100%';flow.style.maxWidth=num(l.maxWidth,1500)+'px';flow.style.margin='0 auto';flow.style.padding='0 '+num(l.paddingX,16)+'px';flow.style.boxSizing='border-box';
      first.parentNode.insertBefore(flow,first);
      Object.values(targets).forEach(el=>{if(el)flow.appendChild(el)});
    }
    if(flow){flow.style.gap=num(l.gap,18)+'px';flow.style.maxWidth=num(l.maxWidth,1500)+'px';flow.style.paddingLeft=num(l.paddingX,16)+'px';flow.style.paddingRight=num(l.paddingX,16)+'px';flow.style.display='flex';flow.style.flexDirection='column';
      blocks.forEach((b,i)=>{const el=targets[b.id];if(!el)return;el.style.order=String(i+1);el.style.width=Math.min(100,Math.max(40,Number(b.width)||100))+'%';el.style.alignSelf='center';el.style.marginTop=(Number(b.marginTop)||0)+'px';el.style.marginBottom=(Number(b.marginBottom)||0)+'px';el.style.display=b.hidden?'none':''});
    }

    /* ===== THANH CHỨC NĂNG ===== */
    const navInner=q('.nav-inner');
    if(navInner){
      const map={home:'.home-btn',search:'.search-box',config:'#configBtn',guide:'.pakn-btn',stats:'#statsBtn',refresh:'#deepRefreshBtn',support:'.support-btn',admin:'.admin-link'};
      const order=Array.isArray(n.order)?n.order:['home','search','config','guide','stats','refresh','support','admin'];
      order.forEach((id,i)=>{const el=navInner.querySelector(map[id]);if(el)el.style.order=String(i+1)});
      navInner.style.gap=num(n.gap,12)+'px';
      navInner.querySelectorAll('button,.support-btn,.admin-link').forEach(el=>{el.style.minHeight=num(n.height,42)+'px';el.style.borderRadius=num(n.radius,10)+'px';el.style.fontSize=num(n.fontSize,14)+'px';el.style.boxSizing='border-box'});
      const search=navInner.querySelector('.search-box');if(search){search.style.minHeight=num(n.height,42)+'px';search.style.boxSizing='border-box'}
      navInner.style.flexWrap='wrap';
    }
    root.style.setProperty('--admin-layout-gap',num(l.gap,18)+'px');
  }catch(e){console.warn('Không tải được cấu hình giao diện',e)}
  try{
    if(!document.querySelector('script[data-visit-tracker]')){
      const s=document.createElement('script');s.src='/visit-tracker.js?v=20261023-01';s.async=true;s.dataset.visitTracker='1';document.head.appendChild(s);
    }
  }catch(e){console.warn('Không khởi tạo được bộ thống kê truy cập',e)}
})();

document.addEventListener('click',function(e){
  const btn=e.target.closest('.pakn-btn');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();window.open('https://ndc.dichvucong.gov.vn/huong-dan-su-dung/huong-dan-chung','_blank','noopener,noreferrer');
},true);
