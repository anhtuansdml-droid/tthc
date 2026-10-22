(() => {
  // Giữ đồng hồ hiển thị ổn định, chỉ thay đổi nội dung giây mà không thay toàn bộ DOM.
  function install() {
    const clock = document.getElementById('clock');
    if (!clock || clock.dataset.stableClockInstalled) return;
    clock.dataset.stableClockInstalled = '1';

    const sync = () => {
      const solar = clock.querySelector('.clock-solar');
      const lunar = clock.querySelector('.clock-lunar');
      const time = clock.querySelector('.clock-time');
      if (!solar || !lunar || !time) return;

      const display = `${solar.textContent.trim()}\n${lunar.textContent.trim()}\n${time.textContent.trim()}`;
      if (clock.dataset.clockDisplay !== display) {
        clock.dataset.clockDisplay = display;
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(clock, { childList: true, subtree: true, characterData: true });
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
