(() => {
  let bound = false;

  function bind() {
    if (bound || !Array.isArray(window.procedures) || !window.procedures.length) return;
    const cards = [...document.querySelectorAll('.statistics .stat-card')];
    if (cards.length < 3) return;
    bound = true;

    const configs = [
      { label: 'TẤT CẢ THỦ TỤC HÀNH CHÍNH', get: data => data },
      { label: 'DỊCH VỤ CÔNG TOÀN TRÌNH', get: data => data.filter(item => normalize(item.mucDichVu) === 'toan trinh') },
      { label: 'DỊCH VỤ CÔNG MỘT PHẦN', get: data => data.filter(item => normalize(item.mucDichVu) === 'mot phan') }
    ];

    cards.slice(0, 3).forEach((card, index) => {
      card.classList.add('stat-card-clickable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Xem ${configs[index].label.toLowerCase()}`);

      const activate = () => {
        const items = configs[index].get(window.procedures);
        showStatisticsProcedureList(configs[index].label, items);
      };

      card.addEventListener('click', activate);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  function showStatisticsProcedureList(label, items) {
    if (!window.procedures || !fieldContainer) return;

    filteredProcedures = [...items];
    const title = document.getElementById('contentTitle');
    if (title) {
      title.innerHTML = `<span>${label} — ${items.length} thủ tục</span> <button type="button" class="stat-back-btn" id="statBackBtn">← DANH SÁCH LĨNH VỰC</button>`;
    }

    fieldContainer.innerHTML = `
      <div class="procedure-list statistics-procedure-list">
        ${items.map((item, index) => procedureHtml(item, index)).join('')}
      </div>`;

    fieldContainer.querySelectorAll('.procedure-item').forEach(element => {
      element.addEventListener('click', () => showDetail(items[Number(element.dataset.index)]));
    });

    const back = document.getElementById('statBackBtn');
    if (back) {
      back.addEventListener('click', () => {
        filteredProcedures = [...procedures];
        if (title) title.textContent = 'DANH SÁCH LĨNH VỰC';
        renderFields();
        window.scrollTo({ top: document.querySelector('.main')?.offsetTop || 0, behavior: 'smooth' });
      });
    }

    window.scrollTo({ top: document.querySelector('.main')?.offsetTop || 0, behavior: 'smooth' });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    const timer = setInterval(() => {
      bind();
      if (bound) clearInterval(timer);
    }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  });
})();
