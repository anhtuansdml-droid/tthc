/* GIAO DIỆN CHI TIẾT TTHC - đối chiếu danh mục từ Điều phối, liên kết chi tiết DVCQG */
(function () {
  const DVCQG_BASE = "https://ndc.dichvucong.gov.vn/thu-tuc-hanh-chinh/";
  const DVCQG_SEARCH_BASE = "https://ndc.dichvucong.gov.vn/tim-kiem-thu-tuc-hanh-chinh";
  const DVCQG_PROVINCE_CODE = "11";   // Tỉnh Điện Biên
  const DVCQG_WARD_CODE = "03151";    // Phường Mường Lay
  const DVCQG_COMMUNE = "WARD";
  const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=";
  let detailIndex = new Map();
  let detailReady = null;

  function esc(value) {
    return String(value ?? "Chưa có dữ liệu").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function value(item, keys) {
    for (const key of keys) {
      const v = item?.[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "Chưa có dữ liệu";
  }
  function serviceLevel(item) {
    const s = String(item?.mucDichVu || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (s === "toan trinh") return "Toàn trình";
    if (s === "mot phan") return "Một phần";
    return "Chưa cung cấp DVC";
  }
  function lines(v) {
    const text = String(v ?? "").trim();
    if (!text || text === "Chưa có dữ liệu") return `<div class="detail-empty">Chưa có dữ liệu</div>`;
    return `<div class="detail-text">${esc(text).replace(/\n/g, "<br>")}</div>`;
  }
  function info(label, v, wide) {
    return `<div class="dvc-info-item ${wide ? "wide" : ""}"><span>${label}</span><strong>${esc(v || "Chưa có dữ liệu")}</strong></div>`;
  }
  function tableMethods(text) {
    const raw = String(text ?? "").trim();
    if (!raw) return `<div class="detail-empty">Chưa có dữ liệu</div>`;
    const parts = raw.split(/\s+(?=(?:ONLINE|DIRECT|POSTAL)\s*[—-])/i);
    if (parts.length < 2) return lines(raw);
    return `<div class="dvc-table-wrap"><table class="dvc-table"><thead><tr><th>HÌNH THỨC</th><th>THỜI GIAN GIẢI QUYẾT</th><th>PHÍ / LỆ PHÍ</th><th>MÔ TẢ THÊM</th></tr></thead><tbody>${parts.map(p => {
      const m = p.match(/^(ONLINE|DIRECT|POSTAL)\s*[—-]\s*([^—-]+)(?:\s*[—-]\s*(.*))?$/i);
      if (!m) return `<tr><td colspan="4">${esc(p)}</td></tr>`;
      const labels = { ONLINE: "Trực tuyến", DIRECT: "Trực tiếp", POSTAL: "Bưu chính" };
      return `<tr><td class="dvc-red">${labels[m[1].toUpperCase()]}</td><td class="dvc-red">${esc(m[2])}</td><td>${esc(value(window.__dvcCurrentItem, ["phiLePhi", "fees"]))}</td><td>${esc(m[3] || "Không có")}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  async function loadDetails() {
    try {
      const res = await fetch("data/tthc_detail.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = await res.json();
      detailIndex = new Map(rows.map(x => [String(x.ma || x.maThucHien || "").trim(), x]));
      console.log(`Đã tải ${detailIndex.size} bộ dữ liệu chi tiết TTHC`);
    } catch (e) {
      console.warn("Không tải được dữ liệu chi tiết TTHC:", e);
    }
  }
  detailReady = loadDetails();

  function buildSubmitUrl(item) {
    const uuid = String(item?.dvcqgId || "").trim();
    if (!uuid) return "";
    const params = new URLSearchParams({
      formalityId: uuid,
      searchType: "PROVINCE",
      provinceCode: DVCQG_PROVINCE_CODE,
      wardCode: DVCQG_WARD_CODE,
      commune: DVCQG_COMMUNE,
      showAdvanced: "false",
      isProvince: "0",
      isMinistry: "0"
    });
    return `${DVCQG_SEARCH_BASE}?${params.toString()}`;
  }

  async function showDetailFull(baseItem) {
    await detailReady;
    const modal = document.getElementById("detailModal");
    const body = document.getElementById("modalBody");
    if (!modal || !body || !baseItem) return;

    const item = { ...baseItem, ...(detailIndex.get(String(baseItem.ma || "").trim()) || {}) };
    window.__dvcCurrentItem = item;
    const noOnline = typeof window.isNoOnlineService === "function" ? window.isNoOnlineService(item) : String(item.mucDo || "").includes("Chưa cung cấp");
    const uuid = String(item.dvcqgId || "").trim();
    const url = !noOnline && uuid ? DVCQG_BASE + encodeURIComponent(uuid) : "";
    const submitUrl = !noOnline && uuid ? buildSubmitUrl(item) : "";
    const searchUrl = item.ma ? `${DVCQG_SEARCH_BASE}?keyword=${encodeURIComponent(item.ma)}` : "";

    const decision = value(item, ["soQuyetDinh", "quyetDinh", "decision_no", "soQuyetDinhBanHanh"]);
    const result = value(item, ["ketQua", "results", "sanPham"]);
    const time = value(item, ["thoiHan", "thoiGianGiaiQuyet", "processingTime"]);
    const target = value(item, ["doiTuong", "doiTuongThucHien", "target_objects"]);
    const receive = value(item, ["diaChiTiepNhan", "noiTiepNhan", "diaChi"]);
    const methods = value(item, ["cachThuc", "cachThucThucHien", "execution_methods"]);
    const steps = value(item, ["trinhTu", "trinhTuThucHien", "execution_steps"]);
    const dossiers = value(item, ["thanhPhanHoSo", "hoSo", "profile_components"]);
    const conditions = value(item, ["yeuCauDieuKien", "dieuKien", "requirements_conditions"]);
    const fees = value(item, ["phiLePhi", "fees", "lePhi"]);
    const legal = value(item, ["canCuPhapLy", "legal_basis"]);
    const agencies = value(item, ["coQuanThucHien", "executing_agencies"]);
    const coordinating = value(item, ["coQuanPhoiHop", "coQuanPhoiHopThucHien", "coordinating_agencies"]);
    const service = serviceLevel(item);

    body.innerHTML = `
      <div class="dvc-detail-shell">
        <div class="dvc-detail-head"><div class="dvc-head-title"><span>●</span> THÔNG TIN CHI TIẾT THỦ TỤC HÀNH CHÍNH</div><div class="dvc-head-actions">${submitUrl ? `<a class="dvc-submit-btn" href="${esc(submitUrl)}" target="_blank" rel="noopener noreferrer">➤ Nộp hồ sơ trực tuyến</a>` : ""}<button type="button" class="dvc-back-btn" aria-label="Quay lại" title="Quay lại chọn thủ tục khác" onclick="document.getElementById('detailModal')?.classList.remove('show'); window.scrollTo({top: 0, behavior: 'smooth'});">↩ QUAY LẠI</button><button type="button" class="dvc-close-btn" aria-label="Đóng" title="Đóng" onclick="document.getElementById('detailModal')?.classList.remove('show')">×</button></div></div>
        <div class="dvc-detail-scroll">
          <div class="dvc-summary"><div class="dvc-summary-main"><h1>${esc(item.ten || "")}</h1><div class="dvc-field-line"><b>Lĩnh vực:</b><span>${esc(item.linhVuc || "Chưa cập nhật")}</span></div></div>${submitUrl ? `<div class="dvc-qr"><img src="${QR_BASE + encodeURIComponent(submitUrl)}" alt="QR nộp hồ sơ trực tuyến"><strong>QUÉT ĐỂ NỘP<br>TRỰC TUYẾN</strong></div>` : ""}</div>
          <div class="dvc-info-grid">
            ${info("Mã TTHC:", item.ma)}${info("Số Quyết định:", decision)}${info("Kết quả thực hiện:", result, true)}${info("Cơ quan ban hành:", item.coQuanChuTri)}${info("Cơ quan thực hiện:", agencies, true)}${info("Cấp thực hiện:", item.cap)}${info("Loại thủ tục:", service)}${info("Nguồn/Quy định:", "Cổng Dịch vụ công Quốc gia")}${info("Trạng thái:", item.trangThai)}${info("Thời hạn:", time)}${info("Đối tượng thực hiện:", target, true)}${info("Cơ quan phối hợp:", coordinating, true)}${info("Địa chỉ tiếp nhận:", receive, true)}
          </div>
          <div class="dvc-tabs"><button class="dvc-tab active" data-tab="method">☷ Cách thức & Trình tự</button><button class="dvc-tab" data-tab="dossier">▰ Thành phần hồ sơ</button><button class="dvc-tab" data-tab="condition">● Yêu cầu & Điều kiện</button><button class="dvc-tab" data-tab="legal">⚖ Căn cứ pháp lý</button></div>
          <div class="dvc-tab-content active" id="dvc-tab-method"><h2>1. CÁCH THỨC THỰC HIỆN</h2>${tableMethods(methods)}<h2>2. TRÌNH TỰ THỰC HIỆN</h2>${lines(steps)}</div>
          <div class="dvc-tab-content" id="dvc-tab-dossier"><h2>THÀNH PHẦN HỒ SƠ</h2>${lines(dossiers)}</div>
          <div class="dvc-tab-content" id="dvc-tab-condition"><h2>YÊU CẦU VÀ ĐIỀU KIỆN</h2>${lines(conditions)}</div>
          <div class="dvc-tab-content" id="dvc-tab-legal"><h2>CĂN CỨ PHÁP LÝ</h2>${lines(legal)}</div>
          <div class="dvc-extra-grid"><div><b>PHÍ / LỆ PHÍ</b>${lines(fees)}</div><div><b>KẾT QUẢ THỰC HIỆN</b>${lines(result)}</div></div>
          ${url ? `<div class="dvc-source-actions"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">MỞ TRANG TTHC GỐC TRÊN CỔNG DVC QUỐC GIA ↗</a>${searchUrl ? `<a class="secondary" href="${esc(searchUrl)}" target="_blank" rel="noopener noreferrer">TRA CỨU THEO MÃ ${esc(item.ma)}</a>` : ""}</div>` : `<div class="dvc-source-actions"><a class="secondary" href="${esc(searchUrl)}" target="_blank" rel="noopener noreferrer">TRA CỨU MÃ ${esc(item.ma)} TRÊN CỔNG DVC QUỐC GIA ↗</a></div>`}
        </div>
      </div>`;

    body.querySelectorAll(".dvc-tab").forEach(btn => btn.addEventListener("click", () => {
      body.querySelectorAll(".dvc-tab").forEach(x => x.classList.remove("active"));
      body.querySelectorAll(".dvc-tab-content").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      body.querySelector(`#dvc-tab-${btn.dataset.tab}`)?.classList.add("active");
    }));
    modal.classList.add("show");
  }
  window.showDetail = showDetailFull;
})();
