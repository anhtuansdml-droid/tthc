from pathlib import Path
import re

p = Path('hard-refresh.js')
if p.exists():
    s = p.read_text(encoding='utf-8')
    pattern = r"function loadNewLogo\(\) \{.*?\n  \}"
    replacement = '''function loadNewLogo() {
    const logoUrl = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/update-20261023/uploads/site/1793084294405-4d2124e7-logo-removebg-preview.png?v=20261028-logo-100';
    if (!document.getElementById('cleanLogoCropStyle')) {
      const style = document.createElement('style');
      style.id = 'cleanLogoCropStyle';
      style.textContent = `
        /* Logo CCHC: kích thước 100%, căn chính giữa ô logo */
        .logo{overflow:hidden!important;border-radius:50%!important;isolation:isolate!important;background:transparent!important;display:flex!important;align-items:center!important;justify-content:center!important}
        .logo img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:cover!important;object-position:center center!important;transform:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important}
        .tthc-promo-logo,.tthc-promo-mini-logo{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:cover!important;object-position:center center!important;transform:none!important;border-radius:0!important;clip-path:none!important;display:block!important}
      `;
      document.head.appendChild(style);
    }

    /* Xóa logo từng bị chèn ở giữa ảnh banner */
    const removeCenterLogo = () => {
      const old = document.getElementById('centerBannerLogoStyle');
      if (old) old.remove();
    };
    removeCenterLogo();

    const apply = () => {
      document.querySelectorAll('.logo img, .tthc-promo-logo, .tthc-promo-mini-logo').forEach(img => {
        img.src = logoUrl;
        img.style.objectPosition = 'center center';
        img.style.transform = 'none';
      });
      removeCenterLogo();
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
