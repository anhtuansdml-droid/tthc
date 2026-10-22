(() => {
  const LIVE_API = 'https://tthc-anhtuansdml-9137.vercel.app/api/sync?action=data';
  const originalFetch = window.fetch.bind(window);
  let livePromise = null;
  let liveData = null;
  const isTthcStatic = url => {
    const s = String(url || '');
    return s.includes('data/tthc.json') || s.includes('data/tthc_430_2026-10-20.json');
  };
  async function loadLive() {
    if (livePromise) return livePromise;
    livePromise = originalFetch(LIVE_API + '&v=' + Date.now(), { cache:'no-store' })
      .then(r => { if (!r.ok) throw new Error('LIVE TTHC HTTP ' + r.status); return r.json(); })
      .then(x => {
        if (!x || !Array.isArray(x.procedures)) throw new Error('LIVE TTHC không đúng định dạng');
        liveData = x.procedures;
        window.tthcLiveData = liveData;
        return liveData;
      })
      .catch(e => { console.warn('Không tải được dữ liệu TTHC live, dùng file tĩnh:', e); livePromise = null; throw e; });
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
