(() => {
  // Luôn ưu tiên dữ liệu đồng bộ từ Điều phối DVC trên chính tên miền TTHC Mường Lay.
  // Sau khi bấm "ĐỒNG BỘ ĐIỀU PHỐI SIÊU TỐC", danh mục mới nhất (hiện 428 TTHC) sẽ được dùng ngay.
  const LIVE_API = '/api/sync?action=data';
  const STATUS_API = '/api/sync?action=status';
  const originalFetch = window.fetch.bind(window);
  let livePromise = null;
  let liveData = null;
  const isTthcStatic = url => {
    const s = String(url || '');
    return s.includes('data/tthc.json') || s.includes('data/tthc_430_2026-10-20.json') || s.includes('data/tthc_428_');
  };
  async function loadLive() {
    if (livePromise) return livePromise;
    livePromise = Promise.all([
      originalFetch(LIVE_API + '&v=' + Date.now(), { cache:'no-store' }).then(r => { if (!r.ok) throw new Error('LIVE TTHC HTTP ' + r.status); return r.json(); }),
      originalFetch(STATUS_API + '&v=' + Date.now(), { cache:'no-store' }).then(r => { if (!r.ok) throw new Error('LIVE STATUS HTTP ' + r.status); return r.json(); })
    ])
      .then(([x,status]) => {
        if (!x || !Array.isArray(x.procedures)) throw new Error('LIVE TTHC không đúng định dạng');
        // Chỉ dùng dữ liệu live khi trạng thái đã đồng bộ thành công từ Điều phối DVC.
        if (status?.mode !== 'dieuphoi' || status?.source !== 'https://dieuphoi.netlify.app/niemyet') {
          throw new Error('Chưa có dữ liệu Điều phối hợp lệ; chờ đồng bộ Điều phối.');
        }
        liveData = x.procedures;
        window.tthcLiveData = liveData;
        return liveData;
      })
      .catch(e => { console.warn('Không dùng dữ liệu TTHC live:', e); livePromise = null; throw e; });
    return livePromise;
  }
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (isTthcStatic(url)) {
      try {
        const data = liveData || await loadLive();
        return new Response(JSON.stringify(data), { status:200, headers:{'Content-Type':'application/json'} });
      } catch (_) {
        return originalFetch(input, init);
      }
    }
    return originalFetch(input, init);
  };
})();
