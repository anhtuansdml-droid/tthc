const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQk2DNzNnpsDR4wTrzBjoy7aKtDKDeubqvnyBdlJstAzxobagxsvSo8kJX2TI9dXHlBMbUjO2htStuw/pub?gid=226385689&single=true&output=csv';

const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();

function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  const s = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  row.push(cell);
  if (row.some(x => String(x).trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(x => String(x).trim());
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}

function findHeader(headers, names) {
  const map = new Map(headers.map(h => [norm(h), h]));
  for (const name of names) { const hit = map.get(norm(name)); if (hit) return hit; }
  return '';
}

function normalizeRows(rows) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const codeKey = findHeader(headers, ['MaTTHC', 'Mã TTHC', 'Mã thủ tục hành chính', 'ma thu tuc']);
  const nameKey = findHeader(headers, ['Tên TTHC', 'TenTTHC', 'Tên thủ tục hành chính', 'TenThuTuc']);
  const agencyKey = findHeader(headers, ['TenCQTH', 'TênCQTH', 'Tên cơ quan thực hiện', 'Cơ quan thực hiện']);
  const publisherKey = findHeader(headers, ['Cơ quan công bố', 'CoQuanCongBo', 'TenCQCB', 'Tên cơ quan công bố', 'Cơ quan chủ trì', 'CoQuanChuTri']);
  const levelKey = findHeader(headers, ['MucDo', 'Mức độ', 'Mức độ cung cấp']);
  const statusKey = findHeader(headers, ['Trạng thái', 'TrangThai']);
  const fieldKey = findHeader(headers, ['LinhVuc', 'Lĩnh vực']);
  const capKey = findHeader(headers, ['CapThucHien', 'Cấp thực hiện']);
  const agencyCodeKey = findHeader(headers, ['MaCQTH', 'Mã cơ quan thực hiện']);
  const serviceCodeKey = findHeader(headers, ['MaDVC', 'Mã DVC']);
  const serviceNameKey = findHeader(headers, ['TenDVC', 'Tên DVC']);
  const typeKey = findHeader(headers, ['LoaiHeThong', 'Loại hệ thống']);
  const urlKey = findHeader(headers, ['Citizen URL', 'URL', 'url']);
  if (!codeKey || !nameKey || !levelKey) return [];

  const selected = agencyKey
    ? rows.filter(r => {
        const agency = norm(r[agencyKey]);
        const agencyCode = agencyCodeKey ? norm(r[agencyCodeKey]) : '';
        return agency.includes('muong lay') || agencyCode === 'h18.111';
      })
    : rows;

  const unique = new Map();
  for (const r of selected) {
    const code = String(r[codeKey] || '').trim();
    if (!code || unique.has(code)) continue;
    const implementingAgency = agencyKey ? String(r[agencyKey] || '').trim() : '';
    const publishedBy = publisherKey ? String(r[publisherKey] || '').trim() : '';
    const level = String(r[levelKey] || '').trim();
    unique.set(code, {
      ma: code,
      ten: nameKey ? String(r[nameKey] || '').trim() : '',
      linhVuc: fieldKey ? String(r[fieldKey] || '').trim() : 'Chưa cập nhật',
      coQuanChuTri: publishedBy || implementingAgency || 'UBND phường Mường Lay',
      coQuanThucHien: implementingAgency || 'UBND phường Mường Lay',
      maCoQuan: agencyCodeKey ? String(r[agencyCodeKey] || '').trim() : 'H18.111',
      cap: capKey ? String(r[capKey] || '').trim() : 'Cấp xã',
      mucDichVu: level,
      mucDo: level,
      trangThai: statusKey ? String(r[statusKey] || '').trim() : 'Chính thức',
      loai: typeKey ? String(r[typeKey] || '').trim() : 'Bộ thủ tục từ Google Sheets',
      maThucHien: serviceCodeKey ? String(r[serviceCodeKey] || '').trim() : '',
      tenDVC: serviceNameKey ? String(r[serviceNameKey] || '').trim() : '',
      url: urlKey ? String(r[urlKey] || '').trim() : '',
      nguon: 'Google Sheets - Bộ thủ tục hành chính mới'
    });
  }
  return [...unique.values()];
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const response = await fetch(SHEET_URL + '&_t=' + Date.now(), {
      cache: 'no-store',
      redirect: 'follow',
      headers: { 'user-agent': 'TTHC-Muong-Lay-Sheet-Sync/1.0' }
    });
    if (!response.ok) throw new Error(`Google Sheets HTTP ${response.status}`);
    const rows = normalizeRows(parseCSV(await response.text()));
    if (!rows.length) throw new Error('Google Sheets không trả về danh sách TTHC phù hợp. Kiểm tra tên cột và dữ liệu Mường Lay.');
    const full = rows.filter(x => norm(x.mucDichVu) === 'toan trinh').length;
    const partial = rows.filter(x => norm(x.mucDichVu) === 'mot phan').length;
    return res.status(200).json({ ok: true, source: SHEET_URL, sourceData: 'Google Sheets - Bộ thủ tục hành chính mới', fetchedAt: new Date().toISOString(), total: rows.length, full, partial, rows });
  } catch (e) {
    return res.status(502).json({ ok: false, message: e?.message || 'Không lấy được Google Sheets', source: SHEET_URL });
  }
}
