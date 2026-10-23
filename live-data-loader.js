(() => {
  // Danh mục chuẩn Mường Lay ngày 23/10/2026: 428 TTHC.
  // File catalog-428-levels.txt được tạo trực tiếp từ Excel danh mục mới.
  const STATIC_SOURCE = 'data/tthc_430_2026-10-20.json';
  const OLD_SOURCE = 'data/tthc.json';
  const CATALOG_SOURCE = 'data/catalog-428-levels.txt';
  const originalFetch = window.fetch.bind(window);
  let livePromise = null;
  let liveData = null;

  const isTthcStatic = url => {
    const s = String(url || '');
    return s.includes(OLD_SOURCE) || s.includes(STATIC_SOURCE) || s.includes('data/tthc_428_');
  };

  async function loadMaster428() {
    if (livePromise) return livePromise;
    livePromise = Promise.all([
      originalFetch(STATIC_SOURCE + '?v=' + Date.now(), {cache:'no-store'}),
      originalFetch(CATALOG_SOURCE + '?v=' + Date.now(), {cache:'no-store'})
    ]).then(async ([dataResponse, catalogResponse]) => {
      if (!dataResponse.ok) throw new Error('TTHC nguồn HTTP ' + dataResponse.status);
      if (!catalogResponse.ok) throw new Error('Danh mục chuẩn HTTP ' + catalogResponse.status);
      const source = await dataResponse.json();
      const text = await catalogResponse.text();
      if (!Array.isArray(source)) throw new Error('Nguồn TTHC không đúng định dạng');

      const catalog = new Map();
      text.split(';').forEach(pair => {
        const p = pair.indexOf('=');
        if (p > 0) catalog.set(pair.slice(0,p).trim(), pair.slice(p+1).trim());
      });
      if (catalog.size !== 428) throw new Error('Danh mục chuẩn phải có 428 mã, hiện có ' + catalog.size);

      const sourceByCode = new Map();
      source.forEach(item => {
        if (item && item.ma) sourceByCode.set(String(item.ma).trim(), item);
      });

      liveData = [...catalog.entries()].map(([code, level]) => {
        const item = sourceByCode.get(code) || {ma: code};
        const noOnline = level === 'Chưa cung cấp DVC';
        return {
          ...item,
          ma: code,
          mucDichVu: level,
          noOnlineService: noOnline,
          dvcqgId: noOnline ? '' : String(item.dvcqgId || item.dvcqg_id || '').trim(),
          url: noOnline ? '' : item.url
        };
      });

      window.tthcMaster428 = liveData;
      window.tthcLiveData = liveData;
      console.info('TTHC Mường Lay: đã nạp danh mục chuẩn 428 ngày 23/10/2026', {
        total: liveData.length,
        toanTrinh: liveData.filter(x => x.mucDichVu === 'Toàn trình').length,
        motPhan: liveData.filter(x => x.mucDichVu === 'Một phần').length,
        chuaCungCap: liveData.filter(x => x.mucDichVu === 'Chưa cung cấp DVC').length
      });
      return liveData;
    }).catch(e => {
      console.error('Không nạp được danh mục chuẩn 428:', e);
      livePromise = null;
      throw e;
    });
    return livePromise;
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (isTthcStatic(url)) {
      try {
        const data = liveData || await loadMaster428();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {'Content-Type':'application/json','X-TTHC-Master':'428-2026-10-23'}
        });
      } catch (e) {
        return originalFetch(input, init);
      }
    }
    return originalFetch(input, init);
  };
})();
