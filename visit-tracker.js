/* Ghi nhận 1 lượt truy cập cho mỗi phiên trình duyệt */
(() => {
  const KEY = 'tthc_visit_session_20261023';
  try {
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, '1');
      fetch('/api/visits', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        cache: 'no-store',
        keepalive: true
      }).catch(() => {});
    }
  } catch (_) {}
})();
