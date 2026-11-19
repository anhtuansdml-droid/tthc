(() => {
  const section = document.querySelector('.statistics');
  if (!section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const formatter = new Intl.NumberFormat('vi-VN');
  const counters = [...section.querySelectorAll('.stat-number')].map(element => ({
    element, target: null, started: false
  }));

  function readTarget(element) {
    const digits = String(element.textContent || '').replace(/[^0-9]/g, '');
    return digits ? Number(digits) : null;
  }

  function run(counter) {
    if (counter.started || counter.target === null) return;
    counter.started = true;
    const { element, target } = counter;
    if (reduceMotion || target <= 0) {
      element.textContent = formatter.format(Math.max(0, target));
      return;
    }

    const duration = 1250;
    const start = performance.now();
    element.classList.add('is-counting');

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = formatter.format(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(frame);
      else {
        element.textContent = formatter.format(target);
        element.classList.remove('is-counting');
      }
    }
    requestAnimationFrame(frame);
  }

  const visibility = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      counters.forEach(run);
      visibility.disconnect();
    }
  }, { threshold: 0.2 });
  visibility.observe(section);

  const changes = new MutationObserver(() => {
    for (const counter of counters) {
      if (counter.started) continue;
      const next = readTarget(counter.element);
      if (next !== null && next > 0) {
        counter.target = next;
        if (reduceMotion) run(counter);
      }
    }
  });
  counters.forEach(counter => {
    const initial = readTarget(counter.element);
    if (initial !== null && initial > 0) counter.target = initial;
    changes.observe(counter.element, { childList: true, characterData: true, subtree: true });
  });

  if (reduceMotion) counters.forEach(run);
})();
