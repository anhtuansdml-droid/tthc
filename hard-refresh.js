(() => {
  function deepRefresh() {
    const btn = document.getElementById('deepRefreshBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⟳ ĐANG LÀM MỚI...';
    }

    try {
      localStorage.removeItem('tthc_theme');
      sessionStorage.clear();
    } catch (_) {}

    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    url.searchParams.set('_cache', Math.random().toString(36).slice(2));

    setTimeout(() => {
      window.location.replace(url.toString());
    }, 250);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('deepRefreshBtn');
    if (btn) btn.addEventListener('click', deepRefresh);
  });
})();
