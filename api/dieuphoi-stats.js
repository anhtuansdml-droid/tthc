const SOURCE = 'https://dieuphoi.netlify.app/niemyet';
let memory = { at: 0, value: null };

const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
const first = (o, keys) => { for (const k of keys) if (o && o[k] != null && String(o[k]).trim() !== '') return o[k]; return ''; };

async function getText(url, timeout = 12000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: c.signal, cache: 'no-store', headers: { 'user-agent': 'TTHC-Muong-Lay-Stats/1.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { url: r.url, text: await r.text(), contentType: r.headers.get('content-type') || '' };
  } finally { clearTimeout(t); }
}

function urlsFrom(text, base) {
  const out = new Set();
  const re = /(https?:\/\/[^\s"'`<>]+|(?:\.?\/?[^\s"'`<>]+\.(?:json|csv)(?:\?[^\s"'`<>]*)?))/gi;
  for (const m of text.matchAll(re)) {
    try {
      const u = new URL(m[1], base);
      if (/^https?:$/.test(u.protocol)) out.add(u.href);
    } catch (_) {}
  }
  return [...out];
}

function candidateArrays(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    if (value.some(x => x && typeof x === 'object' && (x.code || x.ma || x.formalityCode || x.procedureCode || x.formalityId))) out.push(value);
    value.slice(0, 5).forEach(x => candidateArrays(x, out));
  } else Object.values(value).forEach(x => candidateArrays(x, out));
  return out;
}

function rowsFrom(payload) {
  const arrays = candidateArrays(payload);
  return arrays.sort((a, b) => b.length - a.length)[0] || [];
}

function procedureRows(rows) {
  return rows.filter(x => {
    const code = String(first(x, ['code','ma','maThuTuc','formalityCode','procedureCode']) || '').trim();
    const name = String(first(x, ['procedureName','name','ten','tenThuTuc','formalityName']) || '').trim();
    return code && name;
  });
}

function mapRow(x) {
  return {
    code: String(first(x, ['code','ma','maThuTuc','formalityCode','procedureCode']) || '').trim(),
    name: String(first(x, ['procedureName','name','ten','tenThuTuc','formalityName']) || '').trim(),
    level: String(first(x, ['executionLevel','cap','level','capThucHien','executionLevelName']) || '').trim(),
    service: String(first(x, ['onlineLevel','mucDichVu','mucDo','serviceLevel','serviceType']) || '').trim(),
    status: String(first(x, ['status','trangThai','state','procedureStatus']) || '').trim(),
    type: String(first(x, ['procedureType','loai','type','classification','phanLoai']) || '').trim(),
    change: String(first(x, ['changeType','bienDong','loaiBienDong','changeStatus']) || '').trim(),
    updatedAt: String(first(x, ['updatedAt','updateDate','lastModified','modifiedDate']) || '').trim()
  };
}

function levelOf(x) {
  const s = norm(x.level);
  if (s.includes('cap tinh') || s.includes('cap tinh') || s.includes('tinh') || s.includes('thanh pho')) return 'province';
  if (s.includes('cap xa') || s.includes('xa') || s.includes('phuong') || s.includes('thi tran')) return 'commune';
  return 'other';
}
function serviceOf(x) {
  const s = norm(x.service);
  if (s.includes('toan trinh')) return 'full';
  if (s.includes('mot phan')) return 'partial';
  return 'other';
}
function changeOf(x) {
  const s = norm(`${x.change} ${x.status}`);
  if (s.includes('bai bo') || s.includes('thu hoi') || s.includes('ngung')) return 'removed';
  if (s.includes('sua doi') || s.includes('bo sung') || s.includes('sua, bo sung')) return 'changed';
  if (s.includes('ban hanh moi') || s.includes('moi ban hanh') || s === 'moi') return 'new';
  return 'none';
}

async function discover() {
  const page = await getText(SOURCE, 15000);
  const scripts = [];
  for (const m of page.text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try { scripts.push(new URL(m[1], SOURCE).href); } catch (_) {}
  }
  const candidates = new Set(urlsFrom(page.text, SOURCE));
  for (const src of scripts.slice(0, 20)) {
    try {
      const s = await getText(src, 9000);
      for (const u of urlsFrom(s.text, src)) candidates.add(u);
    } catch (_) {}
  }
  return { scripts, candidates: [...candidates].slice(0, 100) };
}

async function build() {
  const d = await discover();
  let best = [];
  let sourceData = '';
  const checked = [];
  for (const url of d.candidates) {
    try {
      const r = await getText(url, 10000);
      const text = r.text.trim();
      if (!/^[[{]/.test(text)) continue;
      let payload;
      try { payload = JSON.parse(text); } catch (_) { continue; }
      const rows = procedureRows(rowsFrom(payload));
      checked.push({ url, count: rows.length });
      if (rows.length > best.length) { best = rows; sourceData = url; }
    } catch (_) {}
  }
  if (best.length < 20) throw new Error(`Không tìm thấy bộ dữ liệu TTHC từ Điều phối. Đã kiểm tra ${d.candidates.length} nguồn.`);

  const data = best.map(mapRow);
  const unique = [...new Map(data.map(x => [x.code, x])).values()];
  const online = unique.filter(x => !norm(`${x.service} ${x.status}`).includes('chua cung cap'));
  const result = {
    ok: true,
    source: SOURCE,
    sourceData,
    fetchedAt: new Date().toISOString(),
    total: unique.length,
    province: unique.filter(x => levelOf(x) === 'province').length,
    commune: unique.filter(x => levelOf(x) === 'commune').length,
    dvcTotal: online.length,
    dvcProvince: online.filter(x => levelOf(x) === 'province').length,
    dvcCommune: online.filter(x => levelOf(x) === 'commune').length,
    full: online.filter(x => serviceOf(x) === 'full').length,
    partial: online.filter(x => serviceOf(x) === 'partial').length,
    newCount: unique.filter(x => changeOf(x) === 'new').length,
    changed: unique.filter(x => changeOf(x) === 'changed').length,
    removed: unique.filter(x => changeOf(x) === 'removed').length,
    internal: unique.filter(x => norm(`${x.type} ${x.status}`).includes('noi bo')).length,
    recordsChecked: checked.sort((a,b) => b.count - a.count).slice(0, 10)
  };
  memory = { at: Date.now(), value: result };
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (memory.value && Date.now() - memory.at < 60000) return res.status(200).json(memory.value);
    return res.status(200).json(await build());
  } catch (e) {
    return res.status(502).json({ ok: false, message: e?.message || 'Không lấy được dữ liệu Điều phối DVC', source: SOURCE });
  }
}
