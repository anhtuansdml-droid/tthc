from pathlib import Path
import re

p = Path('hard-refresh.js')
if p.exists():
    s = p.read_text(encoding='utf-8')
    pattern = r"function loadNewLogo\(\) \{.*?\n  \}"
    replacement = '''function loadNewLogo() {
    const logoUrl = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/update-20261023/uploads/site/1793084294405-4d2124e7-logo-removebg-preview.png?v=20261028-logo-clean';
    if (!document.getElementById('cleanLogoCropStyle')) {
      const style = document.createElement('style');
      style.id = 'cleanLogoCropStyle';
      style.textContent = `
        /* Logo CCHC đứng riêng: không ô vuông, không vòng trắng */
        .header-title{position:relative!important;display:block!important;width:100%!important;min-width:0!important;padding-left:190px!important;box-sizing:border-box!important}
        .header-title>div:first-child{position:absolute!important;left:0!important;top:50%!important;transform:translateY(-50%)!important;width:165px!important;height:165px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important;padding:0!important;margin:0!important}
        .header-title>div:first-child .logo{width:165px!important;height:165px!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important}
        .header-title>div:first-child .logo img{width:125%!important;height:125%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center center!important;transform:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important}
        .tthc-promo-logo,.tthc-promo-mini-logo{width:125%!important;height:125%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center!important;transform:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important}
        .header-title>div:last-child{width:100%!important;box-sizing:border-box!important}
        #centerBannerLogoStyle{display:none!important}
        @media(max-width:1150px){
          .header-title{padding-left:145px!important}
          .header-title>div:first-child,.header-title>div:first-child .logo{width:125px!important;height:125px!important}
          .header-title>div:first-child .logo img{width:125%!important;height:125%!important}
        }
        @media(max-width:700px){
          .header-title{padding-left:0!important;padding-top:95px!important}
          .header-title>div:first-child{position:absolute!important;left:50%!important;top:0!important;transform:translateX(-50%)!important;width:85px!important;height:85px!important}
          .header-title>div:first-child .logo{width:85px!important;height:85px!important}
        }
      `;
      document.head.appendChild(style);
    }

    const apply = () => {
      document.querySelectorAll('.logo img, .tthc-promo-logo, .tthc-promo-mini-logo').forEach(img => {
        img.src = logoUrl;
        img.style.objectPosition = 'center center';
        img.style.transform = 'none';
      });
      const old = document.getElementById('centerBannerLogoStyle');
      if (old) old.remove();
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
