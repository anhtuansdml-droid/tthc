const SHEET_SOURCES = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=0&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=166163611&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=308386425&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=1839871631&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=1133276101&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=1982128869&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQk2DNzNnpsDR4wTrzBjoy7aKtDKDeubqvnyBdlJstAzxobagxsvSo8kJX2TI9dXHlBMbUjO2htStuw/pub?gid=226385689&single=true&output=csv'
];
const FALLBACK_SOURCE = 'data/tthc_430_2026-10-20.json';
let cache = { at: 0, value: null };
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

function normalizeSheet(rows) {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);
  const codeKey = findHeader(headers, ['MaTTHC', 'Mã TTHC', 'ma thu tuc']);
  const nameKey = findHeader(headers, ['Tên TTHC', 'TenTTHC', 'Tên thủ tục hành chính']);
  const agencyKey = findHeader(headers, ['TenCQTH', 'TênCQTH', 'Tên cơ quan thực hiện']);
  const publisherKey = findHeader(headers, ['Cơ quan công bố', 'CoQuanCongBo', 'TenCQCB', 'Tên cơ quan công bố', 'Cơ quan chủ trì', 'CoQuanChuTri']);
  const levelKey = findHeader(headers, ['MucDo', 'Mức độ']);
  const statusKey = findHeader(headers, ['Trạng thái', 'TrangThai']);
  const fieldKey = findHeader(headers, ['LinhVuc', 'Lĩnh vực']);
  const capKey = findHeader(headers, ['CapThucHien', 'Cấp thực hiện']);
  const agencyCodeKey = findHeader(headers, ['MaCQTH', 'Mã cơ quan thực hiện']);
  const serviceCodeKey = findHeader(headers, ['MaDVC', 'Mã DVC']);
  const serviceNameKey = findHeader(headers, ['TenDVC', 'Tên DVC']);
  const typeKey = findHeader(headers, ['LoaiHeThong', 'Loại hệ thống']);
  const urlKey = findHeader(headers, ['Citizen URL', 'URL', 'url']);
  if (!codeKey || !nameKey || !agencyKey || !levelKey) return null;

  const selected = rows.filter(r => norm(r[agencyKey]).includes('muong lay'));
  const unique = new Map();
  for (const r of selected) {
    const code = String(r[codeKey] || '').trim();
    if (!code || unique.has(code)) continue;
    const publishedBy = publisherKey ? String(r[publisherKey] || '').trim() : '';
    const implementingAgency = String(r[agencyKey] || '').trim();
    unique.set(code, {
      ma: code,
      ten: String(r[nameKey] || '').trim(),
      linhVuc: fieldKey ? String(r[fieldKey] || '').trim() : '',
      coQuanChuTri: publishedBy || implementingAgency,
      coQuanThucHien: implementingAgency,
      maCoQuan: agencyCodeKey ? String(r[agencyCodeKey] || '').trim() : '',
      cap: capKey ? String(r[capKey] || '').trim() : '',
      mucDichVu: String(r[levelKey] || '').trim(),
      mucDo: String(r[levelKey] || '').trim(),
      trangThai: statusKey ? String(r[statusKey] || '').trim() : '',
      loai: typeKey ? String(r[typeKey] || '').trim() : '',
      maThucHien: serviceCodeKey ? String(r[serviceCodeKey] || '').trim() : '',
      tenDVC: serviceNameKey ? String(r[serviceNameKey] || '').trim() : '',
      url: urlKey ? String(r[urlKey] || '').trim() : '',
      nguon: 'Điều phối DVC Siêu tốc'
    });
  }
  return { rows: [...unique.values()], totalRows: rows.length };
}

async function getSource(url) {
  const r = await fetch(url + '&_t=' + Date.now(), {
    redirect: 'follow', cache: 'no-store',
    headers: { 'user-agent': 'TTHC-Muong-Lay-Sync/2.3' }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return parseCSV(await r.text());
}

async function loadFallback() {
  const r = await fetch(new URL(`../${FALLBACK_SOURCE}`, import.meta.url));
  if (!r.ok) throw new Error(`Fallback HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : []);
}

async function build(force = false) {
  if (!force && cache.value && Date.now() - cache.at < 60000) return cache.value;
  const live = [];
  const errors = [];
  for (const source of SHEET_SOURCES) {
    try {
      const normalized = normalizeSheet(await getSource(source));
      if (normalized?.rows?.length) live.push(normalized);
    } catch (e) {
      errors.push(e?.message || 'source error');
    }
  }

  // Luôn ưu tiên bộ TTHC mới nhất từ Điều phối DVC Siêu tốc.
  live.sort((a, b) => b.rows.length - a.rows.length);
  let rows = live[0]?.rows || [];
  let source = 'Điều phối DVC Siêu tốc';

  // Chỉ dùng dữ liệu tĩnh khi tất cả nguồn Google Sheets đều lỗi.
  if (!rows.length) {
    rows = await loadFallback();
    source = FALLBACK_SOURCE;
  }

  const full = rows.filter(x => norm(x.mucDo) === 'toan trinh').length;
  const partial = rows.filter(x => norm(x.mucDo) === 'mot phan').length;
  const result = {
    ok: true,
    source,
    sourceData: source,
    fetchedAt: new Date().toISOString(),
    total: rows.length,
    province: 0,
    commune: rows.length,
    dvcTotal: rows.length,
    dvcProvince: 0,
    dvcCommune: rows.length,
    full,
    partial,
    newCount: 0,
    changed: 0,
    removed: 0,
    sourceCount: live.length,
    sourceErrors: errors.length,
    rows
  };
  cache = { at: Date.now(), value: result };
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    return res.status(200).json(await build(String(req.query?.refresh || '') === 'true'));
  } catch (e) {
    return res.status(502).json({ ok: false, message: e?.message || 'Không lấy được dữ liệu DVC', source: 'Điều phối DVC Siêu tốc' });
  }
}
