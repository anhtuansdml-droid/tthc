from pathlib import Path
import re

p = Path('hard-refresh.js')
if p.exists():
    s = p.read_text(encoding='utf-8')
    pattern = r"function loadNewLogo\(\) \{.*?\n  \}"
    replacement = '''function loadNewLogo() {
    const logoUrl = 'data:image/webp;base64,UklGRi4kAABXRUJQVlA4ICIkAABQqgCdASoQABAAUDU8DqgADQAAQU5JTQYAAADQAAABAAEAAAAAAA==';
    if (!document.getElementById('cleanLogoCropStyle')) {
      const style = document.createElement('style');
      style.id = 'cleanLogoCropStyle';
      style.textContent = `
        .logo{overflow:hidden!important;border-radius:50%!important;isolation:isolate!important}
        .logo img{width:100%!important;height:100%!important;max-width:none!important;object-fit:contain!important;object-position:center!important;transform:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
        .tthc-promo-logo,.tthc-promo-mini-logo{object-fit:contain!important;object-position:center!important;transform:none!important;border-radius:0!important;clip-path:none!important}
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
