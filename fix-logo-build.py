from pathlib import Path
import re

p = Path('hard-refresh.js')
if p.exists():
    s = p.read_text(encoding='utf-8')
    pattern = r"function loadNewLogo\(\) \{.*?\n  \}"
    replacement = '''function loadNewLogo() {
    const logoUrl = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/update-20261023/uploads/site/1793084294405-4d2124e7-logo-removebg-preview.png?v=20261028-center';
    if (!document.getElementById('cleanLogoCropStyle')) {
      const style = document.createElement('style');
      style.id = 'cleanLogoCropStyle';
      style.textContent = `
        .logo{overflow:hidden!important;border-radius:50%!important;isolation:isolate!important;background:transparent!important}
        .logo img{width:160%!important;height:160%!important;max-width:none!important;object-fit:cover!important;object-position:center!important;transform:translate(-18.75%,-18.75%)!important;border:0!important;border-radius:0!important;box-shadow:none!important}
        .tthc-promo-logo,.tthc-promo-mini-logo{width:160%!important;height:160%!important;object-fit:cover!important;object-position:center!important;transform:translate(-18.75%,-18.75%)!important;border-radius:0!important;clip-path:none!important}
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById('centerBannerLogoStyle')) {
      const centerStyle = document.createElement('style');
      centerStyle.id = 'centerBannerLogoStyle';
      centerStyle.textContent = `
        .header-pano::after{
          content:"";
          position:absolute;
          z-index:4;
          left:50%;
          top:48%;
          width:205px;
          height:205px;
          transform:translate(-50%,-50%);
          border-radius:50%;
          background-image:url("${logoUrl}");
          background-repeat:no-repeat;
          background-position:center;
          background-size:145% 145%;
          border:4px solid #e0b52b;
          box-shadow:0 8px 24px rgba(0,0,0,.28),0 0 0 5px rgba(255,255,255,.45);
          pointer-events:none;
        }
        @media(min-width:1200px){.header-pano::after{width:225px;height:225px;top:47%}}
        @media(max-width:760px){.header-pano::after{width:92px;height:92px;border-width:2px;box-shadow:0 4px 12px rgba(0,0,0,.25),0 0 0 3px rgba(255,255,255,.4);top:46%}}
        @media(max-width:420px){.header-pano::after{width:72px;height:72px}}
      `;
      document.head.appendChild(centerStyle);
    }

    const apply = () => {
      document.querySelectorAll('.logo img, .tthc-promo-logo, .tthc-promo-mini-logo').forEach(img => {
        img.src = logoUrl;
      });
    };
    apply();
    if (document.body) {
      const observer = new MutationObserver(apply);
      observer.observe(document.body, {childList:true, subtree:true});
    }
  }'''
    s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
    if n == 1:
        p.write_text(s, encoding='utf-8')
