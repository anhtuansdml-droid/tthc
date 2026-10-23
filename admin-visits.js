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
        @media(max-width:800px){.visit-kpis{grid-template-columns:repeat(2,1fr)}.visit-head{align-items:flex-start}.visit-head span{display:none}}
      `;document.head.appendChild(st);
    }
    const panel=document.createElement('section');panel.id=panelId;panel.className='visit-stats-panel';
    panel.innerHTML=`<div class="visit-head"><div><h2>📊 THỐNG KÊ LƯỢT TRUY CẬP</h2><span>Lượt truy cập được ghi nhận theo phiên trình duyệt, theo ngày</span></div><button id="visitRefresh" class="visit-refresh">↻ LÀM MỚI</button></div><div id="visitBody"><div class="visit-loading">Đang tải dữ liệu thống kê...</div></div>`;
    wrap.insertBefore(panel,wrap.firstElementChild);
    document.getElementById('visitRefresh').onclick=load;
    load();
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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
