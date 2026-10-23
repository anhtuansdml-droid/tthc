(() => {
  const EXTENSION_ID = 'ckgdeilnlgobkfcilepinjoejcgjhmng';
  const EXTENSION_NAME = 'Ẩm Siêu Tốc - Trợ lý Nộp hồ sơ DVC';
  const EXPECTED_VERSION = '1.1.3';

  function setState(button, state, label, detail) {
    if (!button) return;
    button.className = `extension-status ${state}`;
    button.innerHTML = `<span class="ext-dot">${state === 'is-ok' ? '✓' : state === 'is-checking' ? '…' : '!'}</span><span>${label}</span>`;
    button.dataset.detail = detail || '';
  }

  function checkExtension() {
    const button = document.getElementById('extensionStatusBtn');
    const popover = document.getElementById('extensionStatusPopover');
    if (!button) return;

    setState(button, 'is-checking', 'Đang kiểm tra...', 'Đang kiểm tra Extension Ẩm Siêu Tốc.');

    let finished = false;
    const finish = (ok, version) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (ok) {
        const v = version || EXPECTED_VERSION;
        setState(button, 'is-ok', 'Extension đã cài', `Extension đang hoạt động. Phiên bản: ${v}`);
        if (popover) popover.innerHTML = `<h4>🧩 ${EXTENSION_NAME}</h4><p>Trạng thái: <strong class="ext-version">✓ Đã cài và đang hoạt động</strong></p><p>Phiên bản: <strong class="ext-version">${v}</strong></p><p>ID: ${EXTENSION_ID}</p><button class="extension-status-retry" type="button" id="extensionStatusRetry">↻ Kiểm tra lại</button>`;
      } else {
        setState(button, 'is-off', 'Extension chưa kết nối', 'Không nhận được phản hồi từ Extension.');
        if (popover) popover.innerHTML = `<h4>🧩 ${EXTENSION_NAME}</h4><p>Trạng thái: <strong style="color:#b42323">Chưa kết nối</strong></p><p>Website chưa nhận được phản hồi từ Extension ID <strong>${EXTENSION_ID}</strong>.</p><p>Nếu Extension đã cài, cần cho phép Extension giao tiếp với tên miền của trang.</p><button class="extension-status-retry" type="button" id="extensionStatusRetry">↻ Kiểm tra lại</button>`;
      }
      bindRetry();
    };

    const timer = setTimeout(() => finish(false), 1400);

    try {
      if (!window.chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
        finish(false);
        return;
      }
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'TTHC_EXTENSION_PING', source: 'tthc-muong-lay' }, (response) => {
        if (chrome.runtime.lastError) {
          finish(false);
          return;
        }
        finish(!!response, response && (response.version || response.extensionVersion));
      });
    } catch (_) {
      finish(false);
    }
  }

  function bindRetry() {
    const retry = document.getElementById('extensionStatusRetry');
    if (retry && !retry.dataset.bound) {
      retry.dataset.bound = '1';
      retry.addEventListener('click', (e) => { e.stopPropagation(); checkExtension(); });
    }
  }

  function init() {
    const button = document.getElementById('extensionStatusBtn');
    const popover = document.getElementById('extensionStatusPopover');
    if (!button || !popover || button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('open');
      if (popover.classList.contains('open')) checkExtension();
    });
    document.addEventListener('click', () => popover.classList.remove('open'));
    checkExtension();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
