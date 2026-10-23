/* Ghi nhận 1 lượt truy cập cho mỗi phiên trình duyệt + kiểm tra Extension Ẩm Siêu Tốc */
(() => {
  const KEY = 'tthc_visit_session_20261023';
  try {
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY,'1');
      fetch('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',keepalive:true}).catch(() => {});
    }
  } catch (_) {}

  const EXTENSION_ID = 'ckgdeilnlgobkfcilepinjoejcgjhmng';
  const nav = document.querySelector('.nav-inner');
  if (!nav || document.getElementById('extensionStatusBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'extensionStatusBtn';
  btn.type = 'button';
  btn.className = 'extension-status-btn extension-checking';
  btn.title = 'Kiểm tra Extension Ẩm Siêu Tốc';
  btn.innerHTML = '<span class="extension-status-dot">●</span> Đang kiểm tra Extension...';
  nav.appendChild(btn);

  const setStatus = (kind, text, version = '') => {
    btn.className = `extension-status-btn extension-${kind}`;
    btn.innerHTML = `<span class="extension-status-dot">${kind === 'installed' ? '✓' : kind === 'checking' ? '●' : '!'}</span> ${text}${version ? ` <small>v${version}</small>` : ''}`;
  };

  const ping = () => new Promise((resolve) => {
    let finished = false;
    const done = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => done({ok:false}), 1200);
    try {
      if (!window.chrome?.runtime?.sendMessage) return done({ok:false, unsupported:true});
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'TTHC_EXTENSION_PING', source: location.origin }, response => {
        if (chrome.runtime?.lastError) return done({ok:false});
        if (response?.ok) return done({ok:true, version:response.version || ''});
        done({ok:false});
      });
    } catch (_) { done({ok:false}); }
  });

  const check = async () => {
    setStatus('checking', 'Đang kiểm tra Extension...');
    const result = await ping();
    if (result.ok) {
      setStatus('installed', 'Extension đã cài', result.version || '1.1.3');
      btn.title = 'Ẩm Siêu Tốc đang hoạt động. Bấm để kiểm tra lại.';
    } else {
      setStatus('missing', 'Extension chưa kết nối');
      btn.title = 'Chưa nhận được phản hồi từ Ẩm Siêu Tốc. Bấm để kiểm tra lại.';
    }
  };

  btn.addEventListener('click', check);
  check();

  const style = document.createElement('style');
  style.textContent = `
    .extension-status-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #38a169;background:#fff;border-radius:7px;padding:8px 12px;font-weight:800;white-space:nowrap;cursor:pointer;transition:.18s ease}
    .extension-status-btn:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.12)}
    .extension-status-dot{font-size:13px;line-height:1}
    .extension-checking{border-color:#d69e2e;color:#9c6500;background:#fffaf0}
    .extension-installed{border-color:#38a169;color:#087a3d;background:#f6fffa}
    .extension-missing{border-color:#c53030;color:#b42318;background:#fff7f7}
    .extension-status-btn small{font-weight:700;opacity:.8}
    @media(max-width:900px){.extension-status-btn{font-size:12px;padding:7px 9px}}
    @media(max-width:650px){.extension-status-btn{width:100%;justify-content:center}}
  `;
  document.head.appendChild(style);
})();
