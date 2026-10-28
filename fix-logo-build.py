from pathlib import Path
import re

p = Path('hard-refresh.js')
if p.exists():
    s = p.read_text(encoding='utf-8')
    pattern = r"function loadNewLogo\(\) \{.*?\n  \}"
    replacement = '''function loadNewLogo() {
    const logoUrl = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/update-20261023/uploads/site/1793084294405-4d2124e7-logo-removebg-preview.png?v=20261028-03';
    if (!document.getElementById('cleanLogoCropStyle')) {
      const style = document.createElement('style');
      style.id = 'cleanLogoCropStyle';
      style.textContent = `
        .logo{overflow:hidden!important;border-radius:50%!important;isolation:isolate!important}
        .logo img{width:145%!important;height:145%!important;max-width:none!important;object-fit:cover!important;object-position:center!important;transform:translate(-15.5%,-15.5%)!important;border:0!important;border-radius:0!important;box-shadow:none!important}
        .tthc-promo-logo,.tthc-promo-mini-logo{object-fit:cover!important;object-position:center!important;transform:scale(1.42)!important;border-radius:50%!important;clip-path:circle(35.5% at 50% 50%)!important}
      `;
      document.head.appendChild(style);
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
