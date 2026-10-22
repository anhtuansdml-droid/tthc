const DATA_SOURCE_URL = "https://dichvucong.gov.vn/";
const DATA_SOURCE_NAME = "Cổng Dịch vụ công Quốc gia";
const DVCQG_BASE_URL = "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/";
const DVCQG_SEARCH_URL = "https://dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh";
const LIVE_DATA_URL = "https://tthc-anhtuansdml-9137.vercel.app/api/sync?action=data";
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
    let newData = null;
    try {
      const liveResponse = await fetch(LIVE_DATA_URL + "&v=" + Date.now(), { cache: "no-store" });
      if (liveResponse.ok) {
        const livePayload = await liveResponse.json();
        if (Array.isArray(livePayload.procedures) && livePayload.procedures.length) newData = livePayload.procedures;
      }
    } catch (liveError) {
      console.warn("LIVE_TTHC_UNAVAILABLE", liveError);
    }

    const [oldResponse, fallbackResponse] = await Promise.all([
      fetch("data/tthc.json", { cache: "no-store" }),
      fetch("data/tthc_430_2026-10-20.json", { cache: "no-store" })
    ]);
    if (!oldResponse.ok) throw new Error(`Không tải được data/tthc.json: HTTP ${oldResponse.status}`);
    if (!fallbackResponse.ok) throw new Error(`Không tải được dữ liệu dự phòng: HTTP ${fallbackResponse.status}`);
    const oldData = await oldResponse.json();
    if (!newData) newData = await fallbackResponse.json();
    if (!Array.isArray(oldData) || !Array.isArray(newData)) throw new Error("Dữ liệu TTHC không đúng định dạng mảng JSON");

    const oldByCode = new Map();
    oldData.forEach(item => { if (item && item.ma) oldByCode.set(String(item.ma).trim(), item); });

    procedures = newData.map(item => {
      const code = String(item.ma || "").trim();
      const oldItem = oldByCode.get(code) || {};
      return { ...oldItem, ...item, ma: code, noOnlineService: isNoOnlineService(item) };
    }).filter(item => item.ma);

    filteredProcedures = procedures;
    renderStats();
    renderFields();
  } catch (error) {
    console.error(error);
    procedures = [];
    filteredProcedures = [];
    renderStats();
    renderFields();
    const msg = document.getElementById("dataError");
    if (msg) msg.textContent = "Không tải được danh mục TTHC. Vui lòng tải lại trang.";
  }
}
