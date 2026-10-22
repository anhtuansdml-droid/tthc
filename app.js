const DATA_SOURCE_URL = "https://dichvucong.gov.vn/";
const DATA_SOURCE_NAME = "Cổng Dịch vụ công Quốc gia";
const DVCQG_BASE_URL = "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/";
const DVCQG_SEARCH_URL = "https://dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh";
const CONFIG_STORAGE_KEY = "tthc_muong_lay_visible_fields_v1";

let procedures = [];
let filteredProcedures = [];
let visibleFields = new Set();

const searchInput = document.getElementById("searchInput");
const fieldContainer = document.getElementById("fieldContainer");
const totalCount = document.getElementById("totalCount");
const fullCount = document.getElementById("fullCount");
const partialCount = document.getElementById("partialCount");
const modal = document.getElementById("detailModal");
const modalBody = document.getElementById("modalBody");
const configModal = document.getElementById("configModal");
const configFieldList = document.getElementById("configFieldList");
const configSearch = document.getElementById("configSearch");
const configAgency = document.getElementById("configAgency");
const configSelectAll = document.getElementById("configSelectAll");


document.addEventListener("DOMContentLoaded", async () => {
  updateClock();
  setInterval(updateClock, 1000);
  setupTheme();
  setupSourceLink();
  setupModal();
  setupConfig();
  await loadData();
  setupSearch();
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

function isNoOnlineService(item) {
  const service = normalize(`${item?.mucDichVu || ""} ${item?.mucDo || ""}`);
  return service.includes("chua cung cap dvc") || service.includes("chua cung cap dich vu cong");
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
      const noOnlineService = isNoOnlineService(item);
      const dvcqgId = noOnlineService
        ? ""
        : String(item.dvcqgId || item.dvcqg_id || oldItem.dvcqgId || "").trim();

      return {
        ...oldItem,
        ...item,
        dvcqgId,
        url: buildDvcqgUrl(dvcqgId),
        nguon: "Danh sách TTHC cấp xã ngày 20/10/2026"
      };
    });

    window.procedures = procedures;
    loadVisibleFields();
    filteredProcedures = [...procedures];
    updateStatistics();
    setupConfigOptions();
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

function getFieldNames(items = procedures) {
  return [...new Set(items.map(item => item.linhVuc || "Chưa xác định"))]
    .sort((a, b) => a.localeCompare(b, "vi"));
}

function getFieldsForDisplay(list) {
  return list.filter(item => visibleFields.has(item.linhVuc || "Chưa xác định"));
}

function renderFields(list = filteredProcedures) {
  if (!fieldContainer) return;
  const displayList = getFieldsForDisplay(list);
  const groups = {};
  displayList.forEach(item => {
    const field = item.linhVuc || "Chưa xác định";
    if (!groups[field]) groups[field] = [];
    groups[field].push(item);
  });

  const fields = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], "vi"));
  if (!fields.length) {
    fieldContainer.innerHTML = `<div class="empty-state">Không có lĩnh vực nào đang được cấu hình hiển thị.</div>`;
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
  const items = getFieldsForDisplay(filteredProcedures)
    .filter(item => (item.linhVuc || "Chưa xác định") === field);
  const title = document.getElementById("contentTitle");
  if (title) title.textContent = `${field} — ${items.length} thủ tục`;

  fieldContainer.innerHTML = `<div class="procedure-list">${items.map((item, index) => procedureHtml(item, index)).join("")}</div>`;

  document.querySelectorAll(".procedure-item").forEach(element => {
    element.addEventListener("click", () => showDetail(items[Number(element.dataset.index)]));
  });
}

function procedureHtml(item, index) {
  const noOnlineService = isNoOnlineService(item);
  const normalizedService = normalize(item.mucDichVu);
  const type = normalizedService === "toan trinh" ? "full" : normalizedService === "mot phan" ? "partial" : "none";
  const serviceLabel = noOnlineService ? "CHƯA CUNG CẤP DỊCH VỤ CÔNG" : (item.mucDichVu || "Chưa cập nhật");

  return `
    <div class="procedure-item" data-index="${index}">
      <div class="procedure-code">${escapeHtml(item.ma || "")}</div>
      <div class="procedure-name">${escapeHtml(item.ten || "")}</div>
      <div class="procedure-meta">
        <span class="badge ${type}">${escapeHtml(serviceLabel)}</span>
        <span class="badge">${escapeHtml(item.coQuanChuTri || "Chưa cập nhật")}</span>
      </div>
    </div>`;
}

function showDetail(item) {
  if (!modal || !modalBody || !item) return;

  const noOnlineService = isNoOnlineService(item);
  const onlineUrl = noOnlineService ? "" : buildDvcqgUrl(item.dvcqgId);
  const searchUrl = noOnlineService ? "" : buildDvcqgSearchUrl(item);

  modalBody.innerHTML = `
    <div class="detail-title">${escapeHtml(item.ten || "")}</div>
    <div class="detail-grid">
      ${detailRow("Mã TTHC", item.ma)}
      ${detailRow("Lĩnh vực", item.linhVuc)}
      ${detailRow("Cơ quan chủ trì", item.coQuanChuTri)}
      ${detailRow("Cơ quan thực hiện", item.coQuanThucHien)}
      ${detailRow("Mã cơ quan", item.maCoQuan)}
      ${detailRow("Mức dịch vụ", noOnlineService ? "CHƯA CUNG CẤP DỊCH VỤ CÔNG" : item.mucDichVu)}
      ${detailRow("Cấp thực hiện", item.cap)}
      ${detailRow("Loại TTHC", item.loai)}
      ${detailRow("Mức độ", item.mucDo)}
      ${detailRow("Trạng thái", item.trangThai)}
      ${detailRow("Nguồn dữ liệu", item.nguon || "Danh sách TTHC cấp xã ngày 20/10/2026")}
      ${detailRow("Mã thực hiện", item.maThucHien)}
    </div>
    ${noOnlineService
      ? `<div style="margin-top:20px;padding:16px;border-radius:8px;background:#fff7e6;color:#8a4b00;font-weight:700">CHƯA CUNG CẤP DỊCH VỤ CÔNG</div>`
      : onlineUrl
        ? `<a class="online-btn" href="${escapeAttribute(onlineUrl)}" target="_blank" rel="noopener noreferrer">CHỌN DỊCH VỤ CÔNG TRỰC TUYẾN</a>`
        : `<div style="margin-top:20px;padding:14px;border-radius:8px;background:#fff7e6;color:#8a4b00;font-weight:600">TTHC này chưa xác định được mã liên kết chi tiết trên Cổng Dịch vụ công Quốc gia.</div>`
    }
    ${!noOnlineService && searchUrl
      ? `<a class="online-btn" style="margin-top:10px;background:#444" href="${escapeAttribute(searchUrl)}" target="_blank" rel="noopener noreferrer">TRA CỨU TTHC NÀY TRÊN CỔNG DVC QUỐC GIA</a>`
      : ""}`;

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
      const haystack = normalize(`${item.ma || ""} ${item.ten || ""} ${item.linhVuc || ""} ${item.coQuanChuTri || ""}`);
      return haystack.includes(keyword);
    });
    updateStatistics();
    renderFields(filteredProcedures);
    const title = document.getElementById("contentTitle");
    if (title) title.textContent = `KẾT QUẢ TÌM KIẾM — ${filteredProcedures.length} thủ tục`;
  });
}

function setupModal() {
  const close = document.getElementById("modalClose");
  if (close) close.addEventListener("click", () => modal?.classList.remove("show"));
  if (modal) modal.addEventListener("click", event => { if (event.target === modal) modal.classList.remove("show"); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") modal?.classList.remove("show"); });
}

function setupTheme() {
  const button = document.getElementById("themeBtn");
  const saved = localStorage.getItem("tthc_theme");
  if (saved === "dark") document.body.classList.add("dark");
  if (!button) return;
  button.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("tthc_theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

function loadVisibleFields() {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  const all = getFieldNames(procedures);
  if (!saved) {
    visibleFields = new Set(all);
    return;
  }
  try {
    const parsed = JSON.parse(saved);
    visibleFields = new Set(all.filter(field => parsed.includes(field)));
    if (!visibleFields.size) visibleFields = new Set(all);
  } catch {
    visibleFields = new Set(all);
  }
}

function setupConfig() {
  const open = document.getElementById("configBtn");
  const close = document.getElementById("configClose");
  const cancel = document.getElementById("configCancel");
  const save = document.getElementById("configSave");
  if (open) open.addEventListener("click", () => { renderConfigFieldList(); configModal?.classList.add("show"); });
  if (close) close.addEventListener("click", () => configModal?.classList.remove("show"));
  if (cancel) cancel.addEventListener("click", () => configModal?.classList.remove("show"));
  if (save) save.addEventListener("click", () => {
    const checked = [...document.querySelectorAll(".config-field-checkbox:checked")].map(input => input.value);
    visibleFields = new Set(checked);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify([...visibleFields]));
    configModal?.classList.remove("show");
    renderFields(filteredProcedures);
  });
  if (configSearch) configSearch.addEventListener("input", renderConfigFieldList);
  if (configAgency) configAgency.addEventListener("change", renderConfigFieldList);
  if (configSelectAll) configSelectAll.addEventListener("change", () => {
    document.querySelectorAll(".config-field-checkbox").forEach(input => input.checked = configSelectAll.checked);
  });
  if (configModal) configModal.addEventListener("click", event => { if (event.target === configModal) configModal.classList.remove("show"); });
}

function setupConfigOptions() {
  if (!configAgency) return;
  const agencies = [...new Set(procedures.map(item => item.coQuanChuTri || "Chưa cập nhật"))].sort((a,b)=>a.localeCompare(b,"vi"));
  configAgency.innerHTML = `<option value="">-- Tất cả Cơ quan chủ trì --</option>` + agencies.map(a => `<option value="${escapeAttribute(a)}">${escapeHtml(a)}</option>`).join("");
}

function renderConfigFieldList() {
  if (!configFieldList) return;
  const keyword = normalize(configSearch?.value || "");
  const agency = configAgency?.value || "";
  const fields = getFieldNames(procedures).filter(field => {
    if (keyword && !normalize(field).includes(keyword)) return false;
    if (agency) {
      return procedures.some(item => (item.linhVuc || "Chưa xác định") === field && (item.coQuanChuTri || "Chưa cập nhật") === agency);
    }
    return true;
  });
  if (!fields.length) { configFieldList.innerHTML = `<div class="config-empty">Không tìm thấy lĩnh vực phù hợp.</div>`; return; }
  configFieldList.innerHTML = fields.map(field => {
    const count = procedures.filter(item => (item.linhVuc || "Chưa xác định") === field).length;
    const checked = visibleFields.has(field) ? "checked" : "";
    return `<label class="config-field-item"><input class="config-field-checkbox" type="checkbox" value="${escapeAttribute(field)}" ${checked}><span class="config-field-text"><strong>${escapeHtml(field)}</strong><small>${count} thủ tục</small></span></label>`;
  }).join("");
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
