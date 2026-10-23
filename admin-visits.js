(() => {
  const API='/api/visits';
  const styleId='visit-stats-style';
  const panelId='visitStatsPanel';
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function inject(){
    if(document.getElementById(panelId)) return;
    const wrap=document.querySelector('.wrap');
    if(!wrap) return;
    if(!document.getElementById(styleId)){
      const st=document.createElement('style');st.id=styleId;st.textContent=`
        .visit-stats-panel{background:#fff;border:1px solid #e1e6ed;border-radius:14px;margin-bottom:14px;padding:20px;box-shadow:0 4px 16px #17203308}
        .visit-head{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #edf0f3;padding-bottom:12px;margin-bottom:15px}
        .visit-head h2{margin:0;color:#99131a;font-size:16px}.visit-head span{font-size:11px;color:#8a94a3}
        .visit-refresh{border:1px solid #d6dde6;background:#fff;color:#293444;border-radius:8px;padding:8px 11px;font-weight:800;cursor:pointer}.visit-refresh:hover{background:#fff8f8;border-color:#d8a2a6}
        .visit-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
        .visit-kpi{border:1px solid #e1e6ed;border-radius:11px;padding:14px;background:#fbfcfd}.visit-kpi small{display:block;color:#778397;font-size:10px;font-weight:900;letter-spacing:.4px}.visit-kpi strong{display:block;margin-top:5px;font-size:25px;color:#bd131b}.visit-kpi.today{background:linear-gradient(135deg,#fff8f8,#fff);border-color:#f0c5c8}.visit-kpi.today strong{color:#c9151d}
        .visit-chart{border:1px solid #edf0f3;border-radius:11px;padding:15px;background:#fafbfd}.visit-chart-title{font-size:11px;font-weight:900;color:#536174;margin-bottom:12px}.visit-bars{height:180px;display:flex;align-items:flex-end;gap:5px;overflow-x:auto;padding:0 3px 25px}.visit-bar-wrap{min-width:22px;height:100%;display:flex;align-items:flex-end;justify-content:flex-end;flex-direction:column;position:relative}.visit-bar{width:100%;min-height:2px;background:linear-gradient(180deg,#d71920,#9f1017);border-radius:5px 5px 2px 2px}.visit-bar-label{position:absolute;bottom:-23px;font-size:8px;color:#7f8996;transform:rotate(-42deg);white-space:nowrap;transform-origin:top center}.visit-bar-value{font-size:8px;color:#8f1118;margin-bottom:3px}.visit-foot{margin-top:10px;color:#8a94a3;font-size:10px;display:flex;justify-content:space-between;gap:10px}.visit-loading{color:#7a8594;font-size:12px;padding:25px;text-align:center}
        .dieuphoi-sync-box{margin-top:12px;padding:12px 14px;border:1px solid #ead08a;border-radius:10px;background:linear-gradient(135deg,#fffaf0,#fff);display:flex;align-items:center;justify-content:space-between;gap:12px}.dieuphoi-sync-box strong{display:block;color:#8b5a00;font-size:13px}.dieuphoi-sync-box span{display:block;color:#7d6a43;font-size:10px;margin-top:3px}.dieuphoi-sync-btn{border:0;border-radius:9px;padding:10px 14px;background:linear-gradient(135deg,#b5121b,#df171e);color:#fff;font-weight:900;cursor:pointer;white-space:nowrap;box-shadow:0 5px 13px #b5121b30}.dieuphoi-sync-btn:hover{transform:translateY(-1px);box-shadow:0 7px 17px #b5121b38}.dieuphoi-sync-btn:disabled{opacity:.7;cursor:wait;transform:none}.dieuphoi-sync-msg{font-size:11px;font-weight:800;color:#8b5a00;margin-top:8px}.dieuphoi-sync-msg.ok{color:#13723b}.dieuphoi-sync-msg.err{color:#a3121a}
        @media(max-width:800px){.visit-kpis{grid-template-columns:repeat(2,1fr)}.visit-head{align-items:flex-start}.visit-head span{display:none}.dieuphoi-sync-box{align-items:stretch;flex-direction:column}.dieuphoi-sync-btn{width:100%}}
      `;document.head.appendChild(st);
    }
    const panel=document.createElement('section');panel.id=panelId;panel.className='visit-stats-panel';
    panel.innerHTML=`<div class="visit-head"><div><h2>📊 THỐNG KÊ LƯỢT TRUY CẬP</h2><span>Lượt truy cập được ghi nhận theo phiên trình duyệt, theo ngày</span></div><button id="visitRefresh" class="visit-refresh">↻ LÀM MỚI</button></div><div id="visitBody"><div class="visit-loading">Đang tải dữ liệu thống kê...</div></div>`;
    wrap.insertBefore(panel,wrap.firstElementChild);
    document.getElementById('visitRefresh').onclick=load;
    setTimeout(injectDieuphoiButton,200);
    load();
  }
  function injectDieuphoiButton(){
    const box=document.querySelector('.sync-box');
    if(!box||document.getElementById('dieuphoiFastSync'))return;
    const row=document.createElement('div');row.className='dieuphoi-sync-box';
    row.innerHTML=`<div><strong>⚡ ĐỒNG BỘ TỪ ĐIỀU PHỐI SIÊU TỐC</strong><span>Lấy trực tiếp danh mục TTHC từ Điều phối DVC và cập nhật dữ liệu website.</span><div id="dieuphoiSyncMsg" class="dieuphoi-sync-msg">Sẵn sàng đồng bộ.</div></div><button id="dieuphoiFastSync" class="dieuphoi-sync-btn" type="button">⚡ ĐỒNG BỘ ĐIỀU PHỐI SIÊU TỐC</button>`;
    box.appendChild(row);
    document.getElementById('dieuphoiFastSync').onclick=syncDieuphoi;
  }
  async function syncDieuphoi(){
    const btn=document.getElementById('dieuphoiFastSync'),msg=document.getElementById('dieuphoiSyncMsg');
    const token=sessionStorage.getItem('tthc_admin_token')||'';
    if(!token){msg.className='dieuphoi-sync-msg err';msg.textContent='⚠ Chưa đăng nhập quản trị.';return}
    if(!confirm('Đồng bộ trực tiếp dữ liệu từ Điều phối DVC?\n\nDanh mục TTHC hiện tại sẽ được đối chiếu và cập nhật theo dữ liệu nguồn.'))return;
    btn.disabled=true;btn.textContent='⏳ ĐANG ĐỒNG BỘ...';msg.className='dieuphoi-sync-msg';msg.textContent='Đang lấy dữ liệu trực tiếp từ Điều phối DVC...';
    try{
      const r=await fetch('/api/sync?action=dieuphoi',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store'});
      const m=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(m.message||`Máy chủ trả về HTTP ${r.status}`);
      msg.className='dieuphoi-sync-msg ok';msg.textContent=`✓ Đồng bộ xong: ${Number(m.total||0).toLocaleString('vi-VN')} TTHC · +${m.added||0} mới · ${m.changed||0} thay đổi · ${m.removed||0} bãi bỏ.`;
      const ids=[['syncTime',m.syncedAt?new Date(m.syncedAt).toLocaleString('vi-VN'):'—'],['syncTotal',m.total??'—'],['syncFull',m.full??'—'],['syncPartial',m.partial??'—']];ids.forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v});
      const sm=document.getElementById('syncMessage');if(sm){sm.style.display='block';sm.textContent='✓ Đã đồng bộ trực tiếp từ Điều phối DVC.'}
    }catch(e){msg.className='dieuphoi-sync-msg err';msg.textContent='✕ Đồng bộ lỗi: '+(e.message||'Không xác định')}
    finally{btn.disabled=false;btn.textContent='⚡ ĐỒNG BỘ ĐIỀU PHỐI SIÊU TỐC'}
  }
  function fmt(n){return Number(n||0).toLocaleString('vi-VN')}
  async function load(){
    const body=document.getElementById('visitBody');if(!body)return;
    body.innerHTML='<div class="visit-loading">Đang cập nhật thống kê...</div>';
    try{
      const r=await fetch(API+'?v='+Date.now(),{cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.message||'Không đọc được thống kê');
      const max=Math.max(1,...(d.daily||[]).map(x=>Number(x.count)||0));
      const bars=(d.daily||[]).map(x=>{const h=Math.max(2,Math.round((Number(x.count)||0)/max*145));const label=x.date.slice(8,10)+'/'+x.date.slice(5,7);return `<div class="visit-bar-wrap"><div class="visit-bar-value">${fmt(x.count)}</div><div class="visit-bar" style="height:${h}px" title="${esc(x.date)}: ${fmt(x.count)} lượt"></div><div class="visit-bar-label">${label}</div></div>`}).join('');
      const updated=d.updatedAt?new Date(d.updatedAt).toLocaleString('vi-VN'):'Chưa có';
      body.innerHTML=`<div class="visit-kpis"><div class="visit-kpi today"><small>HÔM NAY</small><strong>${fmt(d.today)}</strong></div><div class="visit-kpi"><small>HÔM QUA</small><strong>${fmt(d.yesterday)}</strong></div><div class="visit-kpi"><small>7 NGÀY GẦN NHẤT</small><strong>${fmt(d.last7)}</strong></div><div class="visit-kpi"><small>TỔNG LƯỢT TRUY CẬP</small><strong>${fmt(d.total)}</strong></div></div><div class="visit-chart"><div class="visit-chart-title">LƯỢT TRUY CẬP 30 NGÀY GẦN NHẤT</div><div class="visit-bars">${bars||'<span class="visit-loading">Chưa có dữ liệu</span>'}</div></div><div class="visit-foot"><span>Thống kê theo ngày, không lưu IP hoặc thông tin cá nhân.</span><span>Cập nhật: ${esc(updated)}</span></div>`;
    }catch(e){body.innerHTML=`<div class="visit-loading">⚠ ${esc(e.message||'Không tải được thống kê.')}</div>`}
  }
  function tryInject(){inject();setTimeout(injectDieuphoiButton,600)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryInject);else tryInject();
})();
