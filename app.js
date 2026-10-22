const DATA_SOURCE_URL = "https://dichvucong.gov.vn/";
const DATA_SOURCE_NAME = "Cổng Dịch vụ công Quốc gia";
const DVCQG_BASE_URL = "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/";
const DVCQG_SEARCH_URL = "https://dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh";

let procedures = [];
let filteredProcedures = [];

const searchInput = document.getElementById("searchInput");
const fieldContainer = document.getElementById("fieldContainer");
const totalCount = document.getElementById("totalCount");
const fullCount = document.getElementById("fullCount");
const partialCount = document.getElementById("partialCount");
const modal = document.getElementById("detailModal");
const modalBody = document.getElementById("modalBody");

document.addEventListener("DOMContentLoaded", async () => {
  updateClock();
  setInterval(updateClock, 1000);
  setupTheme();
  setupSourceLink();
  await loadData();
  setupSearch();
  setupModal();
});

function updateClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;
  const now = new Date();
  clock.textContent = `${now.toLocaleDateString("vi-VN")} ${now.toLocaleTimeString("vi-VN")}`;
}

function setupSourceLink() {
  const sourceLink = document.getElementById("sourceLink");
  if (!sourceLink) return;
  sourceLink.href = DATA_SOURCE_URL;
  sourceLink.textContent = DATA_SOURCE_NAME;
}

async function loadData() {
  try {
    const [oldResponse, newResponse] = await Promise.all([
      fetch("data/tthc.json", { cache: "no-store" }),
      fetch("data/tthc_430_2026-10-20.json", { cache: "no-store" })
    ]);

    if (!oldResponse.ok) throw new Error(`Không tải được data/tthc.json: HTTP ${oldResponse.status}`);
    if (!newResponse.ok) throw new Error(`Không tải được data/tthc_430_2026-10-20.json: HTTP ${newResponse.status}`);

    const oldData = await oldResponse.json();
    const newData = await newResponse.json();

    if (!Array.isArray(oldData) || !Array.isArray(newData)) {
      throw new Error("Dữ liệu TTHC không đúng định dạng mảng JSON");
    }

    const oldByCode = new Map();
    oldData.forEach(item => {
      if (item && item.ma) oldByCode.set(String(item.ma).trim(), item);
    });

    procedures = newData.map(item => {
      const code = String(item.ma || "").trim();
      const oldItem = oldByCode.get(code) || {};
      const dvcqgId = String(item.dvcqgId || item.dvcqg_id || oldItem.dvcqgId || "").trim();
      return {
        ...oldItem,
        ...item,
        dvcqgId,
        url: buildDvcqgUrl(dvcqgId),
        nguon: "Danh sách TTHC cấp xã ngày 20/10/2026"
      };
    });

    filteredProcedures = [...procedures];
    updateStatistics();
    renderFields();
  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);
    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <div style="background:#fff;padding:25px;border-radius:10px;color:#c40000;font-weight:bold">
          Không tải được dữ liệu TTHC.<br><br>
          ${escapeHtml(error.message)}
        </div>`;
    }
  }
}

function buildDvcqgUrl(dvcqgId) {
  const id = String(dvcqgId || "").trim();
  return id ? DVCQG_BASE_URL + encodeURIComponent(id) : "";
}

function buildDvcqgSearchUrl(item) {
  const params = new URLSearchParams();
  if (item && item.ma) params.set("keyword", String(item.ma).trim());
  else if (item && item.ten) params.set("keyword", String(item.ten).trim());
  return params.toString() ? `${DVCQG_SEARCH_URL}?${params.toString()}` : DVCQG_SEARCH_URL;
}

function updateStatistics() {
  const total = procedures.length;
  const full = procedures.filter(item => normalize(item.mucDichVu) === "toan trinh").length;
  const partial = procedures.filter(item => normalize(item.mucDichVu) === "mot phan").length;
  if (totalCount) totalCount.textContent = total;
  if (fullCount) fullCount.textContent = full;
  if (partialCount) partialCount.textContent = partial;
}

function renderFields(list = filteredProcedures) {
  if (!fieldContainer) return;
  const groups = {};
  list.forEach(item => {
    const field = item.linhVuc || "Chưa xác định";
    if (!groups[field]) groups[field] = [];
    groups[field].push(item);
  });

  const fields = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], "vi"));
  if (!fields.length) {
    fieldContainer.innerHTML = `<div style="background:white;padding:30px;border-radius:10px;text-align:center;font-weight:bold">Không tìm thấy thủ tục hành chính.</div>`;
    return;
  }

  fieldContainer.innerHTML = fields.map(([field, items]) => `
    <div class="field-card" data-field="${escapeHtml(field)}">
      <div class="field-name">${escapeHtml(field)}</div>
      <div class="field-count">${items.length}</div>
      <div class="field-agency">${escapeHtml(getMainAgency(items))}</div>
    </div>
  `).join("");

  document.querySelectorAll(".field-card").forEach(card => {
    card.addEventListener("click", () => showFieldProcedures(card.dataset.field));
  });
}

function getMainAgency(items) {
  const counter = {};
  items.forEach(item => {
    const agency = item.coQuanChuTri || "Chưa cập nhật";
    counter[agency] = (counter[agency] || 0) + 1;
  });
  const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : "Chưa cập nhật";
}

function showFieldProcedures(field) {
  const items = filteredProcedures.filter(item => (item.linhVuc || "Chưa xác định") === field);
  const title = document.getElementById("contentTitle");
  if (title) title.textContent = `${field} — ${items.length} thủ tục`;

  fieldContainer.innerHTML = `<div class="procedure-list">${items.map((item, index) => procedureHtml(item, index)).join("")}</div>`;

  document.querySelectorAll(".procedure-item").forEach(element => {
    element.addEventListener("click", () => showDetail(items[Number(element.dataset.index)]));
  });
}

function procedureHtml(item, index) {
  const normalizedService = normalize(item.mucDichVu);
  const type = normalizedService === "toan trinh" ? "full" : "partial";
  return `
    <div class="procedure-item" data-index="${index}">
      <div class="procedure-code">${escapeHtml(item.ma || "")}</div>
      <div class="procedure-name">${escapeHtml(item.ten || "")}</div>
      <div class="procedure-meta">
        <span class="badge ${type}">${escapeHtml(item.mucDichVu || "Chưa cập nhật")}</span>
        <span class="badge">${escapeHtml(item.coQuanChuTri || "Chưa cập nhật")}</span>
      </div>
    </div>`;
}

function showDetail(item) {
  if (!modal || !modalBody || !item) return;
  const onlineUrl = buildDvcqgUrl(item.dvcqgId);
  const searchUrl = buildDvcqgSearchUrl(item);

  modalBody.innerHTML = `
    <div class="detail-title">${escapeHtml(item.ten || "")}</div>
    <div class="detail-grid">
      ${detailRow("Mã TTHC", item.ma)}
      ${detailRow("Lĩnh vực", item.linhVuc)}
      ${detailRow("Cơ quan chủ trì", item.coQuanChuTri)}
      ${detailRow("Cơ quan thực hiện", item.coQuanThucHien)}
      ${detailRow("Mã cơ quan", item.maCoQuan)}
      ${detailRow("Mức dịch vụ", item.mucDichVu)}
      ${detailRow("Cấp thực hiện", item.cap)}
      ${detailRow("Loại TTHC", item.loai)}
      ${detailRow("Mức độ", item.mucDo)}
      ${detailRow("Trạng thái", item.trangThai)}
      ${detailRow("Nguồn dữ liệu", item.nguon || "Danh sách TTHC cấp xã ngày 20/10/2026")}
      ${detailRow("Mã thực hiện", item.maThucHien)}
    </div>
    ${onlineUrl
      ? `<a class="online-btn" href="${escapeAttribute(onlineUrl)}" target="_blank" rel="noopener noreferrer">CHỌN DỊCH VỤ CÔNG TRỰC TUYẾN</a>`
      : `<div style="margin-top:20px;padding:14px;border-radius:8px;background:#fff7e6;color:#8a4b00;font-weight:600">TTHC này chưa xác định được mã liên kết chi tiết trên Cổng Dịch vụ công Quốc gia.</div>`
    }
    <a class="online-btn" style="margin-top:10px;background:#444" href="${escapeAttribute(searchUrl)}" target="_blank" rel="noopener noreferrer">TRA CỨU TTHC NÀY TRÊN CỔNG DVC QUỐC GIA</a>`;

  modal.classList.add("show");
}

function detailRow(label, value) {
  return `<div class="detail-label">${escapeHtml(label)}</div><div class="detail-value">${escapeHtml(value || "Chưa cập nhật")}</div>`;
}

function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener("input", () => {
    const keyword = normalize(searchInput.value);
    if (!keyword) {
      filteredProcedures = [...procedures];
      updateStatistics();
      renderFields();
      const title = document.getElementById("contentTitle");
      if (title) title.textContent = "DANH SÁCH LĨNH VỰC";
      return;
    }

    filteredProcedures = procedures.filter(item => {
      const text = [item.ma, item.ten, item.linhVuc, item.coQuanChuTri, item.coQuanThucHien, item.maThucHien].filter(Boolean).join(" ");
      return normalize(text).includes(keyword);
    });

    renderFields(filteredProcedures);
    const title = document.getElementById("contentTitle");
    if (title) title.textContent = `KẾT QUẢ TÌM KIẾM — ${filteredProcedures.length} TTHC`;
  });
}

function setupModal() {
  if (!modal) return;
  const close = document.getElementById("modalClose");
  if (close) close.addEventListener("click", () => modal.classList.remove("show"));
  modal.addEventListener("click", event => {
    if (event.target === modal) modal.classList.remove("show");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") modal.classList.remove("show");
  });
}

function setupTheme() {
  const button = document.getElementById("themeBtn");
  if (!button) return;
  button.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    button.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
