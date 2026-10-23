(() => {
  // Dữ liệu TTHC Mường Lay được đồng bộ trực tiếp từ Điều phối DVC Siêu tốc.
  // Nguồn hiện tại trả về 424 TTHC của Mường Lay; không khóa cứng 428 nữa.
  const LIVE_API = '/api/dieuphoi-tthc';
  const STATIC_SOURCE = 'data/tthc_430_2026-10-20.json';
  const OLD_SOURCE = 'data/tthc.json';
  const originalFetch = window.fetch.bind(window);
  let livePromise = null;
  let liveData = null;

  const isTthcStatic = url => {
    const s = String(url || '');
    return s.includes(OLD_SOURCE) || s.includes(STATIC_SOURCE) || s.includes('data/tthc_428_');
  };

  async function loadLiveData(force = false) {
    if (!force && livePromise) return livePromise;
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
      console.info('TTHC Mường Lay: đã đồng bộ trực tiếp từ Điều phối DVC Siêu tốc', {
        total: body.total,
        toanTrinh: body.full,
        motPhan: body.partial,
        source: body.sourceData,
        fetchedAt: body.fetchedAt
      });
      return liveData;
    }).catch(error => {
      livePromise = null;
      console.error('Không đồng bộ được TTHC từ Điều phối:', error);
      throw error;
    });
    return livePromise;
  }

  // Cho phép trang hiện tại vẫn gọi data/tthc.json hoặc data/tthc_430... nhưng
  // thực tế nhận dữ liệu live từ Điều phối.
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (isTthcStatic(url)) {
      try {
        const data = liveData || await loadLiveData(false);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-TTHC-Master': 'DieuPhoi-Live'
          }
        });
      } catch (e) {
        console.error('Không có dữ liệu TTHC live:', e);
        return new Response(JSON.stringify([]), {
          status: 503,
          headers: {'Content-Type':'application/json'}
        });
      }
    }
    return originalFetch(input, init);
  };

  // API công khai để nút Đồng bộ có thể yêu cầu lấy dữ liệu mới ngay lập tức.
  window.syncTthcFromDieuPhoi = async function() {
    livePromise = null;
    return loadLiveData(true);
  };

  loadLiveData(false).catch(() => {});
})();
