(() => {
  const TOKEN_KEY = 'tthc_admin_token';
  const SHEET_API = '/api/google-sheet-tthc';
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQk2DNzNnpsDR4wTrzBjoy7aKtDKDeubqvnyBdlJstAzxobagxsvSo8kJX2TI9dXHlBMbUjO2htStuw/pub?gid=226385689&single=true&output=csv';
  let gateOpen = false;
  let allowNextStats = false;
  let allowNextStatsSync = false;

  function tokenUsable() {
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    if (!token) return false;
    const parts = token.split('.');
    const exp = Number(parts[1]);
    if (parts.length !== 3 || !Number.isFinite(exp) || exp <= Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      return false;
    }
    return true;
  }

  function injectStyle() {
    if (document.getElementById('adminGateStyle')) return;
    const style = document.createElement('style');
    style.id = 'adminGateStyle';
    style.textContent = `
      .admin-gate-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,18,32,.58);backdrop-filter:blur(5px)}
      .admin-gate-card{width:min(430px,100%);background:#fff;border-radius:18px;border:1px solid #ead7d8;box-shadow:0 24px 70px rgba(0,0,0,.28);overflow:hidden;animation:adminGateIn .18s ease-out}
      .admin-gate-head{padding:20px 22px 16px;background:linear-gradient(135deg,#fff7f7,#fff);border-bottom:1px solid #f0e1e2;display:flex;gap:13px;align-items:center}
      .admin-gate-icon{width:46px;height:46px;border-radius:13px;background:#b5121b;color:#fff;display:grid;place-items:center;font-size:22px;box-shadow:0 6px 15px rgba(181,18,27,.2)}
      .admin-gate-head strong{display:block;color:#8f1017;font-size:17px}.admin-gate-head small{display:block;margin-top:3px;color:#7a8491;font-size:11px}
      .admin-gate-body{padding:20px 22px 22px}.admin-gate-label{display:block;color:#4c5868;font-size:12px;font-weight:900;margin:0 0 7px}.admin-gate-input{width:100%;height:44px;box-sizing:border-box;border:1px solid #ccd3dc;border-radius:9px;padding:0 13px;font-size:15px;outline:none}.admin-gate-input:focus{border-color:#b5121b;box-shadow:0 0 0 3px rgba(181,18,27,.10)}
      .admin-gate-msg{min-height:20px;margin-top:9px;color:#b5121b;font-size:12px;font-weight:800}.admin-gate-note{margin-top:4px;color:#8a94a3;font-size:10px;line-height:1.45}
      .admin-gate-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:15px}.admin-gate-cancel,.admin-gate-submit{height:40px;border-radius:9px;padding:0 16px;font-weight:900;cursor:pointer}.admin-gate-cancel{border:1px solid #d5dbe2;background:#fff;color:#4b5868}.admin-gate-submit{border:0;background:#b5121b;color:#fff;box-shadow:0 5px 13px rgba(181,18,27,.22)}.admin-gate-submit:disabled{opacity:.65;cursor:wait}
      .update-tthc-btn{height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;white-space:nowrap;box-sizing:border-box;border:1px solid #a90f18;border-radius:8px;padding:0 10px;background:#fff;color:#a90f18;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.10);transition:.16s ease}.update-tthc-btn:hover{background:#fff4f4;transform:translateY(-1px);box-shadow:0 4px 10px rgba(169,15,24,.16)}.update-tthc-btn:disabled{opacity:.7;cursor:wait;transform:none}
      .update-tthc-status{position:fixed;right:18px;bottom:18px;z-index:99999;max-width:min(420px,calc(100vw - 36px));padding:12px 15px;border-radius:10px;background:#172033;color:#fff;font-size:14px;font-weight:800;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.22)}
      @media(max-width:760px){.update-tthc-btn{width:100%;height:38px;min-width:0;font-size:11px;padding:0 5px}.admin-gate-card{border-radius:14px}.admin-gate-body{padding:18px}.admin-gate-head{padding:17px 18px}}
      @keyframes adminGateIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  function openGate(label) {
    if (gateOpen) return Promise.resolve(false);
    if (tokenUsable()) return Promise.resolve(true);
    gateOpen = true;
    injectStyle();
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'admin-gate-overlay';
      overlay.innerHTML = `<div class="admin-gate-card" role="dialog" aria-modal="true" aria-label="Xác thực quản trị"><div class="admin-gate-head"><div class="admin-gate-icon">🔐</div><div><strong>XÁC THỰC QUẢN TRỊ</strong><small>${label || 'Chức năng này'} yêu cầu mật khẩu quản trị.</small></div></div><div class="admin-gate-body"><label class="admin-gate-label" for="adminGateUser">Tài khoản quản trị</label><input id="adminGateUser" class="admin-gate-input" value="admin" autocomplete="username"><label class="admin-gate-label" for="adminGatePass" style="margin-top:13px">Mật khẩu quản trị</label><input id="adminGatePass" class="admin-gate-input" type="password" placeholder="Nhập mật khẩu" autocomplete="current-password"><div id="adminGateMsg" class="admin-gate-msg"></div><div class="admin-gate-note">🔒 Mật khẩu không được lưu trên trình duyệt. Phiên xác thực chỉ lưu mã phiên tạm thời.</div><div class="admin-gate-actions"><button type="button" class="admin-gate-cancel" id="adminGateCancel">HỦY</button><button type="button" class="admin-gate-submit" id="adminGateSubmit">XÁC NHẬN</button></div></div></div>`;
      document.body.appendChild(overlay);
      const user = overlay.querySelector('#adminGateUser');
      const pass = overlay.querySelector('#adminGatePass');
      const msg = overlay.querySelector('#adminGateMsg');
      const submit = overlay.querySelector('#adminGateSubmit');
      const close = ok => { overlay.remove(); gateOpen = false; resolve(ok); };
      overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
      overlay.querySelector('#adminGateCancel').onclick = () => close(false);
      async function verify() {
        const username = user.value.trim() || 'admin';
        const password = pass.value;
        if (!password) { msg.textContent = 'Vui lòng nhập mật khẩu quản trị.'; pass.focus(); return; }
        submit.disabled = true; submit.textContent = 'ĐANG KIỂM TRA...'; msg.textContent = '';
        try {
          const r = await fetch('/api/admin?action=login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),cache:'no-store'});
          const data = await r.json().catch(() => ({}));
          if (!r.ok || !data.ok || !data.token) throw new Error(data.message || 'Sai tài khoản hoặc mật khẩu.');
          sessionStorage.setItem(TOKEN_KEY, data.token);
          close(true);
        } catch (e) {
          msg.textContent = '✕ ' + (e.message || 'Không xác thực được.');
          pass.select();
          submit.disabled = false; submit.textContent = 'XÁC NHẬN';
        }
      }
      submit.onclick = verify;
      pass.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); if (e.key === 'Escape') close(false); });
      user.addEventListener('keydown', e => { if (e.key === 'Enter') pass.focus(); });
      setTimeout(() => pass.focus(), 40);
    });
  }

  function showStatus(message, ok = true) {
    const old = document.getElementById('updateTthcStatus');
    if (old) old.remove();
    const box = document.createElement('div'); box.id = 'updateTthcStatus'; box.className = 'update-tthc-status'; box.textContent = message;
    if (!ok) box.style.background = '#9f1239';
    document.body.appendChild(box);
    if (ok) setTimeout(() => box.remove(), 3500);
  }

  async function updateNow(button) {
    const ok = await openGate('Cập nhật TTHC');
    if (!ok) return;
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    button.disabled = true; button.textContent = '⟳ ĐANG CẬP NHẬT...';
    showStatus('Đang lấy bộ thủ tục mới từ Google Sheets...');
    try {
      const response = await fetch(`${SHEET_API}?_t=${Date.now()}`, {cache:'no-store',headers:{Authorization:'Bearer '+token}});
      const body = await response.json();
      if (!response.ok || !body.ok || !Array.isArray(body.rows) || !body.rows.length) throw new Error(body.message || 'Nguồn dữ liệu không trả về danh sách TTHC.');
      const full = Number(body.full || 0), partial = Number(body.partial || 0), total = Number(body.total || body.rows.length);
      localStorage.setItem('tthc_sheet_data', JSON.stringify({source:SHEET_URL,total,full,partial,fetchedAt:body.fetchedAt||new Date().toISOString(),rows:body.rows}));
      localStorage.setItem('tthc_last_sync', JSON.stringify({source:SHEET_URL,total,full,partial,fetchedAt:body.fetchedAt||new Date().toISOString()}));
      showStatus(`Đã cập nhật ${total} TTHC từ bộ dữ liệu mới (${full} toàn trình, ${partial} một phần). Trang sẽ tải lại...`);
      setTimeout(() => { const u = new URL(window.location.href); u.searchParams.set('_tthc_sync', Date.now().toString()); window.location.replace(u.toString()); }, 900);
    } catch (error) {
      console.error('Cập nhật TTHC thất bại:', error);
      showStatus('Cập nhật thất bại: ' + (error?.message || error), false);
      button.disabled = false; button.textContent = '⟳ CẬP NHẬT TTHC';
    }
  }

  function ensureUpdateButton() {
    const navInner = document.querySelector('.nav-inner');
    if (!navInner || document.getElementById('updateTthcBtn')) return;
    const button = document.createElement('button');
    button.id = 'updateTthcBtn'; button.className = 'update-tthc-btn'; button.type = 'button';
    button.title = 'Cập nhật danh mục TTHC - yêu cầu mật khẩu quản trị'; button.textContent = '⟳ CẬP NHẬT TTHC';
    button.addEventListener('click', () => updateNow(button));
    const refresh = document.getElementById('deepRefreshBtn');
    navInner.insertBefore(button, refresh || null);
  }

  async function gateStatsClick(e) {
    if (allowNextStats) { allowNextStats = false; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    const ok = await openGate('Xem thống kê');
    if (ok) { allowNextStats = true; document.getElementById('statsBtn')?.click(); }
  }

  async function gateStatsSyncClick(e) {
    if (allowNextStatsSync) { allowNextStatsSync = false; return; }
    const target = e.target?.closest?.('#statsSyncBtn');
    if (!target) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const ok = await openGate('Đồng bộ dữ liệu thống kê');
    if (ok) { allowNextStatsSync = true; target.click(); }
  }

  function init() {
    injectStyle();
    ensureUpdateButton();
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn && statsBtn.dataset.adminGateBound !== '1') {
      statsBtn.dataset.adminGateBound = '1'; statsBtn.addEventListener('click', gateStatsClick, true);
    }
    if (document.documentElement.dataset.adminGateDelegated !== '1') {
      document.documentElement.dataset.adminGateDelegated = '1';
      document.addEventListener('click', gateStatsSyncClick, true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
