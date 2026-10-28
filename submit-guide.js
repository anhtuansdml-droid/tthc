/* HƯỚNG DẪN NỘP HỒ SƠ - nguồn Google Sheet published */
(function () {
  const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=0&single=true&output=csv";
  let rows = [];
  let ready = null;

  const norm = v => String(v ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function parseCsv(text) {
    const out = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (quoted) {
        if (c === '"' && n === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ""; }
      else if (c === '\n') { row.push(cell.replace(/\r$/, "")); out.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell.length || row.length) { row.push(cell); out.push(row); }
    if (!out.length) return [];
    const headers = out.shift().map(x => String(x || "").trim());
    return out.filter(r => r.some(x => String(x || "").trim())).map(r => {
      const o = {};
      headers.forEach((h, i) => { o[h] = String(r[i] ?? "").trim(); });
      return o;
    });
  }

  function get(row, aliases) {
    const entries = Object.entries(row || {});
    for (const alias of aliases) {
      const a = norm(alias);
      const exact = entries.find(([k, v]) => norm(k) === a && String(v).trim());
      if (exact) return String(exact[1]).trim();
    }
    for (const alias of aliases) {
      const a = norm(alias);
      const partial = entries.find(([k, v]) => norm(k).includes(a) && String(v).trim());
      if (partial) return String(partial[1]).trim();
    }
    return "";
  }

  function keyOf(item) {
    return norm(item?.ma || item?.maThucHien || item?.maTTHC || "");
  }

  function findRow(item) {
    if (!rows.length) return null;
    const code = keyOf(item);
    const name = norm(item?.ten || item?.tenTTHC || "");
    let row = rows.find(r => {
      const c = norm(get(r, ["Mã TTHC", "Ma TTHC", "Mã thủ tục", "Ma thu tuc", "Mã", "Ma"]));
      return code && c && (c === code || c.includes(code) || code.includes(c));
    });
    if (row) return row;
    if (name) row = rows.find(r => {
      const n = norm(get(r, ["Tên TTHC", "Ten TTHC", "Tên thủ tục", "Ten thu tuc", "Tên", "Ten"]));
      return n && (n === name || n.includes(name) || name.includes(n));
    });
    return row || null;
  }

  function hostLabel(url) {
    try {
      const u = new URL(url);
      const h = u.hostname.toLowerCase();
      if (h.includes("dichvucong.gov.vn")) return "Cổng Dịch vụ công Quốc gia";
      if (h.includes("motcua.dienbien.gov.vn")) return "Hệ thống thông tin giải quyết TTHC tỉnh Điện Biên";
      if (h.includes("moh.gov.vn") || h.includes("dichvucong.moh.gov.vn")) return "Hệ thống dịch vụ công Bộ Y tế";
      if (h.includes("moj.gov.vn") || h.includes("dichvucong.moj.gov.vn")) return "Hệ thống dịch vụ công Bộ Tư pháp";
      if (h.includes("mps.gov.vn") || h.includes("dichvucong.bocongan.gov.vn")) return "Hệ thống dịch vụ công Bộ Công an";
      if (h.includes("dangkykinhdoanh.gov.vn")) return "Hệ thống đăng ký kinh doanh";
      return h;
    } catch (_) { return ""; }
  }

  function first(row, groups) {
    for (const aliases of groups) {
      const v = get(row, aliases);
      if (v) return v;
    }
    return "";
  }

  function buildCard(item, row) {
    const receive = first(row, [["Cơ quan tiếp nhận", "Co quan tiep nhan", "Nơi tiếp nhận", "Noi tiep nhan", "Đơn vị tiếp nhận", "Don vi tiep nhan"]]);
    const resolve = first(row, [["Cơ quan giải quyết", "Co quan giai quyet", "Cơ quan thực hiện", "Co quan thuc hien", "Đơn vị giải quyết", "Don vi giai quyet"]]);
    const place = first(row, [["Địa điểm nộp", "Dia diem nop", "Địa chỉ tiếp nhận", "Dia chi tiep nhan", "Nơi nộp hồ sơ", "Noi nop ho so"]]);
    const method = first(row, [["Hình thức nộp", "Hinh thuc nop", "Cách thức nộp", "Cach thuc nop", "Cách thức thực hiện", "Cach thuc thuc hien"]]);
    const system = first(row, [["Hệ thống nộp", "He thong nop", "Hệ thống tiếp nhận", "He thong tiep nhan", "Cổng dịch vụ công", "Cong dich vu cong", "Hệ thống"]]);
    const ministry = first(row, [["Bộ/ngành quản lý", "Bo nganh quan ly", "Cơ quan quản lý hệ thống", "Co quan quan ly he thong", "Bộ quản lý", "Bo quan ly", "Cơ quan chủ quản", "Co quan chu quan"]]);
    const submitUrl = first(row, [["Link nộp hồ sơ", "Link nop ho so", "URL nộp hồ sơ", "URL nop ho so", "Đường link nộp", "Duong link nop", "Link trực tuyến", "Link truc tuyen", "Link"]]);
    const time = first(row, [["Thời hạn", "Thoi han", "Thời gian giải quyết", "Thoi gian giai quyet"]]);
    const fee = first(row, [["Phí/lệ phí", "Phi le phi", "Phí", "Phi", "Lệ phí", "Le phi"]]);
    const dossier = first(row, [["Thành phần hồ sơ", "Thanh phan ho so", "Hồ sơ", "Ho so"]]);
    const note = first(row, [["Lưu ý", "Luu y", "Ghi chú", "Ghi chu", "Hướng dẫn", "Huong dan"]]);
    const source = first(row, [["Nguồn", "Nguon", "Nguồn dữ liệu", "Nguon du lieu"]]);

    const derivedSystem = system || hostLabel(submitUrl);
    const lines = [];
    if (receive) lines.push(["🏛 Cơ quan tiếp nhận", receive]);
    if (resolve) lines.push(["⚖ Cơ quan giải quyết", resolve]);
    if (place) lines.push(["📍 Nơi/địa chỉ nộp", place]);
    if (method) lines.push(["📝 Hình thức nộp", method]);
    if (derivedSystem) lines.push(["🌐 Hệ thống tiếp nhận", derivedSystem]);
    if (ministry) lines.push(["🏢 Bộ/cơ quan quản lý hệ thống", ministry]);
    if (time) lines.push(["⏱ Thời hạn giải quyết", time]);
    if (fee) lines.push(["💰 Phí/lệ phí", fee]);

    if (!lines.length && !submitUrl && !dossier && !note) return "";

    const rowsHtml = lines.map(([label, val]) => `<div class="submit-guide-row"><span>${label}</span><strong>${esc(val)}</strong></div>`).join("");
    const dossierHtml = dossier ? `<div class="submit-guide-long"><b>📄 Hồ sơ cần chuẩn bị</b><div>${esc(dossier).replace(/\n/g, "<br>")}</div></div>` : "";
    const noteHtml = note ? `<div class="submit-guide-long"><b>⚠ Lưu ý khi nộp</b><div>${esc(note).replace(/\n/g, "<br>")}</div></div>` : "";
    const sourceHtml = source ? `<div class="submit-guide-source">Nguồn hướng dẫn: ${esc(source)}</div>` : "";
    const button = submitUrl ? `<a class="submit-guide-button" href="${esc(submitUrl)}" target="_blank" rel="noopener noreferrer">➤ MỞ ĐÚNG HỆ THỐNG ĐỂ NỘP HỒ SƠ</a>` : `<div class="submit-guide-warning">Chưa có link nộp trực tuyến riêng trong nguồn hướng dẫn. Có thể sử dụng nút "Nộp hồ sơ trực tuyến" ở phía trên để tra cứu trên Cổng DVC Quốc gia.</div>`;

    return `<section class="submit-guide-card"><div class="submit-guide-title"><span>🚀</span><div><b>HƯỚNG DẪN NỘP HỒ SƠ</b><small>Xác định đúng nơi nộp và đúng hệ thống tiếp nhận</small></div></div>${rowsHtml ? `<div class="submit-guide-grid">${rowsHtml}</div>` : ""}${dossierHtml}${noteHtml}${button}${sourceHtml}</section>`;
  }

  async function load() {
    try {
      const res = await fetch(SHEET_CSV, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      rows = parseCsv(text);
      console.log("[NỘP HỒ SƠ] Đã tải", rows.length, "dòng từ Google Sheet");
    } catch (e) {
      console.warn("[NỘP HỒ SƠ] Không tải được Google Sheet:", e);
      rows = [];
    }
    return rows;
  }
  ready = load();

  function installHook() {
    if (typeof window.showDetail !== "function" || window.__submitGuideHooked) return;
    const original = window.showDetail;
    window.showDetail = async function (item) {
      window.__submitGuideCurrentItem = item;
      const result = await original(item);
      await ready;
      const modalBody = document.getElementById("modalBody");
      if (!modalBody) return result;
      const row = findRow(item);
      if (!row) {
        console.info("[NỘP HỒ SƠ] Không tìm thấy dòng Google Sheet cho", item?.ma, item?.ten);
        return result;
      }
      const card = buildCard(item, row);
      if (!card) return result;
      const old = modalBody.querySelector(".submit-guide-card");
      if (old) old.remove();
      const tabs = modalBody.querySelector(".dvc-tabs");
      if (tabs) tabs.insertAdjacentHTML("beforebegin", card);
      else modalBody.insertAdjacentHTML("afterbegin", card);
      return result;
    };
    window.__submitGuideHooked = true;
  }

  const timer = setInterval(() => {
    installHook();
    if (window.__submitGuideHooked) clearInterval(timer);
  }, 50);
})();
