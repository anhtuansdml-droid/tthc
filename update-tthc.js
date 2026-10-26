(() => {
  const API = '/api/google-sheet-tthc';
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQk2DNzNnpsDR4wTrzBjoy7aKtDKDeubqvnyBdlJstAzxobagxsvSo8kJX2TI9dXHlBMbUjO2htStuw/pub?gid=226385689&single=true&output=csv';

  function injectStyle() {
    if (document.getElementById('updateTthcStyle')) return;
    const style = document.createElement('style');
    style.id = 'updateTthcStyle';
    style.textContent = `
      .update-tthc-btn{height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;white-space:nowrap;box-sizing:border-box;border:1px solid #a90f18;border-radius:8px;padding:0 10px;background:#fff;color:#a90f18;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.10);transition:.16s ease}
      .update-tthc-btn:hover{background:#fff4f4;transform:translateY(-1px);box-shadow:0 4px 10px rgba(169,15,24,.16)}
      .update-tthc-btn:disabled{opacity:.7;cursor:wait;transform:none}
      .update-tthc-status{position:fixed;right:18px;bottom:18px;z-index:99999;max-width:min(420px,calc(100vw - 36px));padding:12px 15px;border-radius:10px;background:#172033;color:#fff;font-size:14px;font-weight:800;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.22)}
      @media(min-width:1400px){.update-tthc-btn{min-width:122px}}
      @media(min-width:1100px) and (max-width:1399px){.update-tthc-btn{height:39px;min-width:112px;padding:0 7px;font-size:11px}}
      @media(max-width:760px){.update-tthc-btn{width:100%;height:38px;min-width:0;font-size:11px;padding:0 5px}}
    `;
    document.head.appendChild(style);
  }

  function showStatus(message, ok = true) {
    const old = document.getElementById('updateTthcStatus');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'updateTthcStatus';
    box.className = 'update-tthc-status';
    box.textContent = message;
    if (!ok) box.style.background = '#9f1239';
    document.body.appendChild(box);
    if (ok) setTimeout(() => box.remove(), 3500);
  }

  async function updateNow(button) {
    button.disabled = true;
    button.textContent = '⟳ ĐANG CẬP NHẬT...';
    showStatus('Đang lấy bộ thủ tục mới từ Google Sheets...');
    try {
      const url = `${API}?_t=${Date.now()}`;
      const response = await fetch(url, {cache:'no-store'});
      const body = await response.json();
      if (!response.ok || !body.ok || !Array.isArray(body.rows) || !body.rows.length) throw new Error(body.message || 'Nguồn dữ liệu không trả về danh sách TTHC.');
      const full = Number(body.full || 0), partial = Number(body.partial || 0), total = Number(body.total || body.rows.length);
      try {
        localStorage.setItem('tthc_sheet_data', JSON.stringify({source:SHEET_URL,total,full,partial,fetchedAt:body.fetchedAt||new Date().toISOString(),rows:body.rows}));
        localStorage.setItem('tthc_last_sync', JSON.stringify({source:SHEET_URL,total,full,partial,fetchedAt:body.fetchedAt||new Date().toISOString()}));
      } catch (_) {}
      showStatus(`Đã cập nhật ${total} TTHC từ bộ dữ liệu mới (${full} toàn trình, ${partial} một phần). Trang sẽ tải lại...`);
      setTimeout(() => {
        const u = new URL(window.location.href);
        u.searchParams.set('_tthc_sync', Date.now().toString());
        window.location.replace(u.toString());
      }, 900);
    } catch (error) {
      console.error('Cập nhật TTHC thất bại:', error);
      showStatus('Cập nhật thất bại: ' + (error?.message || error), false);
      button.disabled = false;
      button.textContent = '⟳ CẬP NHẬT TTHC';
    }
  }

  function init() {
    injectStyle();
    const navInner = document.querySelector('.nav-inner');
    if (!navInner || document.getElementById('updateTthcBtn')) return;
    const button = document.createElement('button');
    button.id = 'updateTthcBtn';
    button.className = 'update-tthc-btn';
    button.type = 'button';
    button.title = 'Lấy bộ thủ tục hành chính mới nhất từ Google Sheets';
    button.textContent = '⟳ CẬP NHẬT TTHC';
    button.addEventListener('click', () => updateNow(button));
    const refresh = document.getElementById('deepRefreshBtn');
    navInner.insertBefore(button, refresh || null);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
