/* Đọc cấu hình giao diện từ API cùng tên miền; tránh phụ thuộc deployment/domain cũ. */
(async function(){
  try{
    const api='/api/admin';let r=await fetch(api+'?v='+Date.now(),{cache:'no-store',credentials:'same-origin'});if(!r.ok)r=await fetch('data/site-config.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const c=await r.json(),h=c.header||{},f=c.footer||{},d=c.display||{},q=s=>document.querySelector(s),logo=q('.logo img'),pano=q('.header-pano'),h1=q('.header-title h1'),sub=q('.header-title p'),slogan=q('.header-slogan');
    if(logo&&h.logo)logo.src=h.logo;
    if(pano&&h.background)pano.style.backgroundImage='linear-gradient(90deg,rgba(255,255,255,.88) 0%,rgba(255,255,255,.68) 18%,rgba(255,255,255,.30) 38%,rgba(255,255,255,.03) 60%,rgba(255,255,255,0) 75%),url("'+h.background.replace(/"/g,'\\"')+'")';
    if(h1){h1.textContent=h.title||h1.textContent;h1.style.color=h.titleColor||'#c5161d'}if(sub){sub.textContent=h.subtitle||sub.textContent;sub.style.color=h.subtitleColor||'#c5161d'}if(slogan){slogan.textContent=h.slogan||slogan.textContent;slogan.style.color=h.sloganColor||'#c5161d'}
    const ft=q('.footer-banner'),ftTitle=q('.footer-banner-title'),lines=document.querySelectorAll('.footer-banner-sub'),ftAuthor=q('.footer-banner-author');if(ft&&f.background)ft.style.backgroundImage='linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.12)),url("'+f.background.replace(/"/g,'\\"')+'")';if(ftTitle&&f.title)ftTitle.textContent=f.title;if(lines[0]&&f.subtitle)lines[0].textContent=f.subtitle;if(lines[1])lines[1].innerHTML='Nguồn dữ liệu: <a class="footer-banner-source" href="'+(f.sourceUrl||'https://dichvucong.gov.vn/')+'" target="_blank" rel="noopener noreferrer">'+(f.sourceText||'Cổng Dịch vụ công Quốc gia')+'</a>';if(ftAuthor)ftAuthor.innerHTML='Tác giả: <strong>'+(f.author||'')+'</strong><br>'+(f.unit||'');
    const clock=q('#clock'),stats=q('#statsBtn');if(clock)clock.style.display=d.showClock===false?'none':'';if(stats)stats.style.display=d.showStats===false?'none':'';document.documentElement.style.setProperty('--admin-columns',String(d.columns||4));
    applyVisualEditor(c.visualEditor||{});
  }catch(e){console.warn('Không tải được cấu hình giao diện',e)}
})();

function applyVisualEditor(visual){
  const items=visual?.elements||{};Object.keys(items).forEach(selector=>{try{const el=document.querySelector(selector),o=items[selector];if(!el)return;el.style.transform=`translate(${Number(o.x||0)}px,${Number(o.y||0)}px) rotate(${Number(o.rotate||0)}deg)`;if(Number(o.width)>0)el.style.width=Number(o.width)+'px';if(Number(o.height)>0)el.style.height=Number(o.height)+'px';if(Number(o.fontSize)>0)el.style.fontSize=Number(o.fontSize)+'px';if(o.color)el.style.color=o.color;el.style.display=o.visible===false?'none':'';if(typeof o.text==='string'&&el.children.length===0&&!el.matches('input,textarea'))el.textContent=o.text;if(o.url){if(el.tagName==='IMG')el.src=o.url;else if(el.tagName==='A')el.href=o.url}}catch(e){console.warn('Không áp dụng được phần tử giao diện',selector,e)}});
}