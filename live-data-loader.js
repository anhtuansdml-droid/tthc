(() => {
  // Dữ liệu TTHC Mường Lay có thể được cập nhật trực tiếp từ Google Sheets.
  // Khi người dùng bấm CẬP NHẬT TTHC, bộ dữ liệu mới được lưu tại máy và ưu tiên dùng ở các lần tải sau.
  const LIVE_API = '/api/dieuphoi-tthc';
  const STATIC_SOURCE = 'data/tthc_430_2026-10-20.json';
  const OLD_SOURCE = 'data/tthc.json';
  const LOCAL_KEY = 'tthc_sheet_data';
  const originalFetch = window.fetch.bind(window);
  let livePromise = null;
  let liveData = null;

  const isTthcStatic = url => {
    const s = String(url || '');
    return s.includes(OLD_SOURCE) || s.includes(STATIC_SOURCE) || s.includes('data/tthc_428_');
  };

  function getLocalSheetData() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.rows) || !saved.rows.length) return null;
      return saved;
    } catch (_) {
      return null;
    }
  }

  const cardStyle = document.createElement('style');
  cardStyle.textContent = `
    .field-card{min-height:245px;padding:18px 16px 66px}
    .field-card:before{width:54px;height:54px;font-size:29px;margin-bottom:13px}
    .field-name{font-size:20px;line-height:1.28;min-height:52px;font-weight:900}
    .field-count{font-size:16px;padding:6px 10px;right:12px;top:16px}
    .field-agency{margin-top:10px;min-height:44px;font-size:15px;line-height:1.35;color:#3f4f63;font-weight:800;display:block}
    .field-agency:before{content:'Thuộc: ';color:#a90000;font-weight:900}
    .field-card:after{left:16px;right:16px;bottom:13px;height:42px;font-size:16px}
    @media(max-width:1000px){.field-card{min-height:235px}.field-name{font-size:19px}.field-agency{font-size:14px}}
    @media(max-width:700px){.field-card{min-height:225px;padding-bottom:62px}.field-name{font-size:18px}.field-agency{font-size:14px}}
    @media(max-width:480px){.field-card{min-height:210px}.field-name{font-size:18px}}
  `;
  document.head.appendChild(cardStyle);

  async function loadLiveData(force = false) {
    if (!force && livePromise) return livePromise;
    if (!force) {
      const local = getLocalSheetData();
      if (local) {
        liveData = local.rows;
        window.tthcLiveData = liveData;
        window.tthcMaster = liveData;
        window.tthcSyncMeta = {
          ok: true,
          source: local.source,
          sourceData: 'Google Sheets - Bộ thủ tục hành chính mới',
          fetchedAt: local.fetchedAt,
          total: local.total,
          full: local.full,
          partial: local.partial,
          rows: liveData
        };
        console.info('TTHC Mường Lay: sử dụng bộ thủ tục đã cập nhật từ Google Sheets', window.tthcSyncMeta);
        return liveData;
      }
    }

    const endpoint = LIVE_API + '?refresh=' + (force ? 'true' : 'false') + '&v=' + Date.now();
    livePromise = originalFetch(endpoint, { cache: 'no-store' }).then(async response => {
      let body = {};
      try { body = await response.json(); } catch (_) {}
      if (!response.ok || !body.ok) throw new Error(body.message || ('Điều phối HTTP ' + response.status));
      if (!Array.isArray(body.rows) || !body.rows.length) throw new Error('Điều phối không trả về danh sách TTHC Mường Lay');
      liveData = body.rows;
      window.tthcLiveData = liveData;
      window.tthcMaster = liveData;
      window.tthcSyncMeta = body;
      console.info('TTHC Mường Lay: đã đồng bộ từ nguồn dữ liệu mặc định', {
        total: body.total,
        toanTrinh: body.full,
        motPhan: body.partial,
        source: body.sourceData,
        fetchedAt: body.fetchedAt
      });
      return liveData;
    }).catch(error => {
      livePromise = null;
      console.error('Không đồng bộ được TTHC:', error);
      throw error;
    });
    return livePromise;
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (isTthcStatic(url)) {
      try {
        const data = liveData || await loadLiveData(false);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-TTHC-Master': getLocalSheetData() ? 'GoogleSheets-Updated' : 'DieuPhoi-Live'
          }
        });
      } catch (e) {
        console.error('Không có dữ liệu TTHC live:', e);
        return new Response(JSON.stringify([]), { status: 503, headers: {'Content-Type':'application/json'} });
      }
    }
    return originalFetch(input, init);
  };

  window.syncTthcFromDieuPhoi = async function() {
    livePromise = null;
    return loadLiveData(true);
  };

  loadLiveData(false).catch(() => {});
})();
