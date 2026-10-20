let procedures = [];
let filteredProcedures = [];

const searchInput = document.getElementById("searchInput");
const fieldContainer = document.getElementById("fieldContainer");

const totalCount = document.getElementById("totalCount");
const fullCount = document.getElementById("fullCount");
const partialCount = document.getElementById("partialCount");

const modal = document.getElementById("detailModal");
const modalBody = document.getElementById("modalBody");


// ===============================
// KHỞI ĐỘNG
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
  updateClock();
  setInterval(updateClock, 1000);

  setupTheme();

  await loadData();

  setupSearch();
  setupModal();
});


// ===============================
// ĐỒNG HỒ
// ===============================

function updateClock() {
  const clock = document.getElementById("clock");

  if (!clock) return;

  const now = new Date();

  const date = now.toLocaleDateString("vi-VN");
  const time = now.toLocaleTimeString("vi-VN");

  clock.textContent = `${date} ${time}`;
}


// ===============================
// ĐỌC DỮ LIỆU TTHC
// ===============================

async function loadData() {
  try {
    const response = await fetch("data/tthc.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    procedures = await response.json();

    if (!Array.isArray(procedures)) {
      throw new Error("data/tthc.json không phải mảng dữ liệu");
    }

    filteredProcedures = [...procedures];

    updateStatistics();

    renderFields();

  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <div style="
          background:#fff;
          padding:25px;
          border-radius:10px;
          color:#c40000;
          font-weight:bold;
        ">
          Không tải được dữ liệu TTHC.
          <br><br>
          Kiểm tra file:
          <b>data/tthc.json</b>
        </div>
      `;
    }
  }
}


// ===============================
// THỐNG KÊ
// ===============================

function updateStatistics() {
  const total = procedures.length;

  const full = procedures.filter(
    item => normalize(item.mucDichVu) === "toan trinh"
  ).length;

  const partial = procedures.filter(
    item => normalize(item.mucDichVu) === "mot phan"
  ).length;

  if (totalCount) {
    totalCount.textContent = total;
  }

  if (fullCount) {
    fullCount.textContent = full;
  }

  if (partialCount) {
    partialCount.textContent = partial;
  }
}


// ===============================
// HIỂN THỊ LĨNH VỰC
// ===============================

function renderFields(list = filteredProcedures) {
  if (!fieldContainer) return;

  const groups = {};

  list.forEach(item => {
    const field = item.linhVuc || "Chưa xác định";

    if (!groups[field]) {
      groups[field] = [];
    }

    groups[field].push(item);
  });

  const fields = Object.entries(groups).sort((a, b) =>
    a[0].localeCompare(b[0], "vi")
  );

  if (fields.length === 0) {
    fieldContainer.innerHTML = `
      <div style="
        background:white;
        padding:30px;
        border-radius:10px;
        text-align:center;
        font-weight:bold;
      ">
        Không tìm thấy thủ tục hành chính.
      </div>
    `;

    return;
  }

  fieldContainer.innerHTML = fields.map(([field, items]) => {

    const agency = getMainAgency(items);

    return `
      <div
        class="field-card"
        data-field="${escapeHtml(field)}"
      >
        <div class="field-name">
          ${escapeHtml(field)}
        </div>

        <div class="field-count">
          ${items.length}
        </div>

        <div class="field-agency">
          ${escapeHtml(agency)}
        </div>
      </div>
    `;

  }).join("");

  document.querySelectorAll(".field-card").forEach(card => {

    card.addEventListener("click", () => {

      const field = card.dataset.field;

      showFieldProcedures(field);

    });

  });
}


// ===============================
// CƠ QUAN CHỦ TRÌ
// ===============================

function getMainAgency(items) {

  const counter = {};

  items.forEach(item => {

    const agency =
      item.coQuanChuTri ||
      "Chưa cập nhật";

    counter[agency] =
      (counter[agency] || 0) + 1;

  });

  const sorted = Object.entries(counter)
    .sort((a, b) => b[1] - a[1]);

  return sorted.length
    ? sorted[0][0]
    : "Chưa cập nhật";
}


// ===============================
// HIỂN THỊ TTHC THEO LĨNH VỰC
// ===============================

function showFieldProcedures(field) {

  const items = filteredProcedures.filter(
    item => (item.linhVuc || "Chưa xác định") === field
  );

  const title = document.getElementById("contentTitle");

  if (title) {
    title.textContent =
      `${field} — ${items.length} thủ tục`;
  }

  fieldContainer.innerHTML = `
    <div class="procedure-list">
      ${items.map(item => procedureHtml(item)).join("")}
    </div>
  `;

  document.querySelectorAll(".procedure-item").forEach(item => {

    item.addEventListener("click", () => {

      const index = Number(item.dataset.index);

      showDetail(items[index]);

    });

  });
}


// ===============================
// HTML TỪNG TTHC
// ===============================

function procedureHtml(item) {

  const index = filteredProcedures.indexOf(item);

  const type =
    normalize(item.mucDichVu) === "toan trinh"
      ? "full"
      : "partial";

  return `
    <div
      class="procedure-item"
      data-index="${index}"
    >

      <div class="procedure-code">
        ${escapeHtml(item.ma || "")}
      </div>

      <div class="procedure-name">
        ${escapeHtml(item.ten || "")}
      </div>

      <div class="procedure-meta">

        <span class="badge ${type}">
          ${escapeHtml(item.mucDichVu || "Chưa cập nhật")}
        </span>

        <span class="badge">
          ${escapeHtml(item.coQuanChuTri || "Chưa cập nhật")}
        </span>

      </div>

    </div>
  `;
}


// ===============================
// CHI TIẾT TTHC
// ===============================

function showDetail(item) {

  if (!modal || !modalBody) return;

  const onlineUrl = normalizeUrl(item.url);

  modalBody.innerHTML = `

    <div class="detail-title">
      ${escapeHtml(item.ten || "")}
    </div>

    <div class="detail-grid">

      ${detailRow("Mã TTHC", item.ma)}

      ${detailRow(
        "Lĩnh vực",
        item.linhVuc
      )}

      ${detailRow(
        "Cơ quan chủ trì",
        item.coQuanChuTri
      )}

      ${detailRow(
        "Cơ quan thực hiện",
        item.coQuanThucHien
      )}

      ${detailRow(
        "Mã cơ quan",
        item.maCoQuan
      )}

      ${detailRow(
        "Mức dịch vụ",
        item.mucDichVu
      )}

      ${detailRow(
        "Cấp thực hiện",
        item.cap
      )}

      ${detailRow(
        "Loại TTHC",
        item.loai
      )}

      ${detailRow(
        "Mức độ",
        item.mucDo
      )}

      ${detailRow(
        "Trạng thái",
        item.trangThai
      )}

      ${detailRow(
        "Nguồn",
        item.nguon
      )}

      ${detailRow(
        "Mã thực hiện",
        item.maThucHien
      )}

    </div>

    ${
      onlineUrl
        ? `
          <a
            class="online-btn"
            href="${escapeAttribute(onlineUrl)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            CHỌN DỊCH VỤ CÔNG TRỰC TUYẾN
          </a>
        `
        : ""
    }

  `;

  modal.classList.add("show");
}


function detailRow(label, value) {

  return `
    <div class="detail-label">
      ${escapeHtml(label)}
    </div>

    <div class="detail-value">
      ${escapeHtml(value || "Chưa cập nhật")}
    </div>
  `;
}


// ===============================
// TÌM KIẾM
// ===============================

function setupSearch() {

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {

    const keyword =
      normalize(searchInput.value);

    if (!keyword) {

      filteredProcedures =
        [...procedures];

      updateStatistics();

      renderFields();

      const title =
        document.getElementById("contentTitle");

      if (title) {
        title.textContent =
          "DANH SÁCH LĨNH VỰC";
      }

      return;
    }

    filteredProcedures =
      procedures.filter(item => {

        const text = [
          item.ma,
          item.ten,
          item.linhVuc,
          item.coQuanChuTri,
          item.coQuanThucHien,
          item.maThucHien
        ]
          .filter(Boolean)
          .join(" ");

        return normalize(text)
          .includes(keyword);

      });

    renderFields(filteredProcedures);

    const title =
      document.getElementById("contentTitle");

    if (title) {

      title.textContent =
        `KẾT QUẢ TÌM KIẾM — ${filteredProcedures.length} TTHC`;

    }

  });
}


// ===============================
// MODAL
// ===============================

function setupModal() {

  if (!modal) return;

  const close =
    document.getElementById("modalClose");

  if (close) {

    close.addEventListener("click", () => {

      modal.classList.remove("show");

    });

  }

  modal.addEventListener("click", event => {

    if (event.target === modal) {

      modal.classList.remove("show");

    }

  });

  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

      modal.classList.remove("show");

    }

  });
}


// ===============================
// GIAO DIỆN SÁNG / TỐI
// ===============================

function setupTheme() {

  const button =
    document.getElementById("themeBtn");

  if (!button) return;

  button.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    button.textContent =
      document.body.classList.contains("dark")
        ? "☀️"
        : "🌙";

  });

}


// ===============================
// CHUẨN HÓA URL
// ===============================

function normalizeUrl(url) {

  if (!url) return "";

  url = String(url).trim();

  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return "https://" + url;
}


// ===============================
// BỎ DẤU TIẾNG VIỆT
// ===============================

function normalize(value) {

  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}


// ===============================
// HTML AN TOÀN
// ===============================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

  return escapeHtml(value);
}
