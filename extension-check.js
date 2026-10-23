(() => {
  const EXTENSION_ID = 'ckgdeilnlgobkfcilepinjoejcgjhmng';
  const EXTENSION_NAME = 'Ẩm Siêu Tốc - Trợ lý Nộp hồ sơ DVC';
  const EXTENSION_VERSION = '1.1.3';

  function injectStyle() {
    if (document.getElementById('tthc-extension-check-style')) return;
    const style = document.createElement('style');
    style.id = 'tthc-extension-check-style';
    style.textContent = `
      .tthc-extension-status{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border:1px solid #20a64a;background:#fff;color:#087d2e;border-radius:7px;font:800 14px/1 Arial,sans-serif;cursor:pointer;white-space:nowrap;box-sizing:border-box;transition:.18s ease;box-shadow:0 1px 3px rgba(0,0,0,.05)}
      .tthc-extension-status:hover{background:#f0fff5;transform:translateY(-1px)}
      .tthc-extension-status .dot{font-size:15px;line-height:1}
      .tthc-extension-status.checking{border-color:#d9a400;color:#9a7200;background:#fffdf1}
      .tthc-extension-status.offline{border-color:#d64545;color:#b42318;background:#fff7f7}
      .tthc-extension-status.unknown{border-color:#8a8f98;color:#555;background:#fafafa}
      .tthc-extension-pop{position:fixed;z-index:2147483647;right:20px;top:90px;width:310px;background:#fff;border:1px solid #d9dee7;border-radius:12px;box-shadow:0 12px 35px rgba(0,0,0,.18);padding:15px;color:#20252b;font:14px/1.45 Arial,sans-serif}
      .tthc-extension-pop strong{display:block;font-size:15px;margin-bottom:5px}.tthc-extension-pop small{color:#68717d;display:block}.tthc-extension-pop .ok{color:#087d2e;font-weight:800}.tthc-extension-pop .warn{color:#9a7200;font-weight:800}.tthc-extension-pop .bad{color:#b42318;font-weight:800}
      .tthc-extension-pop-actions{display:flex;gap:8px;margin-top:12px}.tthc-extension-pop button{border:1px solid #d5dbe3;background:#fff;border-radius:7px;padding:7px 10px;cursor:pointer;font-weight:700}.tthc-extension-pop button.primary{background:#087d2e;color:#fff;border-color:#087d2e}
      @media(max-width:760px){.tthc-extension-status{height:34px;padding:0 9px;font-size:12px}.tthc-extension-pop{left:12px;right:12px;top:75px;width:auto}}
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    if (document.getElementById('tthcExtensionStatus')) return document.getElementById('tthcExtensionStatus');
    const nav = document.querySelector('.nav-inner');
    if (!nav) return null;
    const btn = document.createElement('button');
    btn.id = 'tthcExtensionStatus';
    btn.type = 'button';
    btn.className = 'tthc-extension-status checking';
    btn.innerHTML = '<span class="dot">⟳</span><span>Đang kiểm tra...</span>';
    btn.title = EXTENSION_NAME;
    nav.appendChild(btn);
    return btn;
  }

  function setState(btn, state, label, icon) {
    btn.className = `tthc-extension-status ${state}`;
    btn.innerHTML = `<span class="dot">${icon}</span><span>${label}</span>`;
  }

  function pingExtension(timeout = 1600) {
    return new Promise(resolve => {
      let finished = false;
      const done = result => { if (!finished) { finished = true; clearTimeout(timer); resolve(result); } };
      const timer = setTimeout(() => done({ok:false, reason:'timeout'}), timeout);

      try {
        if (!window.chrome?.runtime?.sendMessage) return done({ok:false, reason:'unsupported'});
        chrome.runtime.sendMessage(EXTENSION_ID, { type:'TTHC_EXTENSION_PING', source:'tthcmuonglay' }, response => {
          const err = chrome.runtime.lastError;
          if (err) return done({ok:false, reason:'not-connected', error:err.message});
          done({ok:true, response:response || {}});
        });
      } catch (e) {
        done({ok:false, reason:'exception', error:e?.message || String(e)});
      }
    });
  }

  function showInfo(connected) {
    document.querySelector('.tthc-extension-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'tthc-extension-pop';
    pop.innerHTML = connected
      ? `<strong>🧩 ${EXTENSION_NAME}</strong><div class="ok">● Extension đã cài và đang hoạt động</div><small>Phiên bản: ${EXTENSION_VERSION}</small><small>ID: ${EXTENSION_ID}</small><div class="tthc-extension-pop-actions"><button class="primary" data-close>Đóng</button><button data-recheck>Kiểm tra lại</button></div>`
      : `<strong>🧩 ${EXTENSION_NAME}</strong><div class="warn">● Đã có Extension ID nhưng trang chưa nhận được phản hồi</div><small>Phiên bản: ${EXTENSION_VERSION}</small><small>ID: ${EXTENSION_ID}</small><small style="margin-top:7px">Nếu Extension đang cài mà vẫn báo như vậy, Extension cần cho phép website này giao tiếp qua <b>externally_connectable</b>.</small><div class="tthc-extension-pop-actions"><button data-close>Đóng</button><button class="primary" data-recheck>Kiểm tra lại</button></div>`;
    document.body.appendChild(pop);
    pop.querySelector('[data-close]')?.addEventListener('click', () => pop.remove());
    pop.querySelector('[data-recheck]')?.addEventListener('click', async () => { pop.remove(); await check(); });
  }

  async function check() {
    const btn = createButton();
    if (!btn) return;
    setState(btn,'checking','Đang kiểm tra...','⟳');
    const result = await pingExtension();
    if (result.ok) setState(btn,'','Extension đã cài','✓');
    else setState(btn,'offline','Extension chưa kết nối','!');
    btn.onclick = () => showInfo(result.ok);
  }

  function init() {
    injectStyle();
    check();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
