const SHEET_SOURCES = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=0&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=166163611&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=308386425&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=1839871631&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=1133276101&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlBaBQWrwlVYTKY0zr2t7M-xnplWarLHSWjdDznpg32V1aZUrnxyirY-HNGo11jozXX7ZnUhsoBBoS/pub?gid=1982128869&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQk2DNzNnpsDR4wTrzBjoy7aKtDKDeubqvnyBdlJstAzxobagxsvSo8kJX2TI9dXHlBMbUjO2htStuw/pub?gid=226385689&single=true&output=csv'
];
const NEW_CODE_SOURCE = 'data/tthc_401_codes_2026-10-29.json';
const FALLBACK_SOURCE = 'data/tthc_430_2026-10-20.json';
const TARGET_TOTAL = 401;
const TARGET_FULL = 311;
const TARGET_PARTIAL = 90;
let cache = { at: 0, value: null };
const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();

function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false; const s=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){const ch=s[i]; if(quoted){if(ch==='"'){if(s[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=ch;} else if(ch==='"') quoted=true; else if(ch===','){row.push(cell);cell='';} else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';} else if(ch!=='\r') cell+=ch;}
  row.push(cell); if(row.some(x=>String(x).trim()!=='')) rows.push(row); if(!rows.length)return [];
  const headers=rows[0].map(x=>String(x).trim()); return rows.slice(1).map(v=>Object.fromEntries(headers.map((h,i)=>[h,v[i]??''])));
}
function findHeader(headers,names){const m=new Map(headers.map(h=>[norm(h),h]));for(const n of names){const k=m.get(norm(n));if(k)return k;}return '';}
function normalizeSheet(rows,wanted){
  if(!rows.length)return [];
  const headers=Object.keys(rows[0]);
  const codeKey=findHeader(headers,['MaTTHC','Mã TTHC','ma thu tuc']);
  const nameKey=findHeader(headers,['Tên TTHC','TenTTHC','Tên thủ tục hành chính']);
  const agencyKey=findHeader(headers,['TenCQTH','TênCQTH','Tên cơ quan thực hiện']);
  const publisherKey=findHeader(headers,['Cơ quan công bố','CoQuanCongBo','TenCQCB','Tên cơ quan công bố','Cơ quan chủ trì','CoQuanChuTri']);
  const levelKey=findHeader(headers,['MucDo','Mức độ']);
  const statusKey=findHeader(headers,['Trạng thái','TrangThai']);
  const fieldKey=findHeader(headers,['LinhVuc','Lĩnh vực']);
  const capKey=findHeader(headers,['CapThucHien','Cấp thực hiện']);
  const agencyCodeKey=findHeader(headers,['MaCQTH','Mã cơ quan thực hiện']);
  const serviceCodeKey=findHeader(headers,['MaDVC','Mã DVC']);
  const serviceNameKey=findHeader(headers,['TenDVC','Tên DVC']);
  const typeKey=findHeader(headers,['LoaiHeThong','Loại hệ thống']);
  const urlKey=findHeader(headers,['Citizen URL','URL','url']);
  if(!codeKey||!nameKey||!agencyKey||!levelKey)return [];
  const out=new Map();
  for(const r of rows){const code=String(r[codeKey]||'').trim();if(!wanted.has(code)||out.has(code))continue;const agency=String(r[agencyKey]||'').trim();if(!norm(agency).includes('muong lay'))continue;out.set(code,{ma:code,ten:String(r[nameKey]||'').trim(),linhVuc:fieldKey?String(r[fieldKey]||'').trim():'',coQuanChuTri:publisherKey?String(r[publisherKey]||'').trim()||agency:agency,coQuanThucHien:agency,maCoQuan:agencyCodeKey?String(r[agencyCodeKey]||'').trim():'',cap:capKey?String(r[capKey]||'').trim():'',mucDichVu:String(r[levelKey]||'').trim(),mucDo:String(r[levelKey]||'').trim(),trangThai:statusKey?String(r[statusKey]||'').trim():'',loai:typeKey?String(r[typeKey]||'').trim():'',maThucHien:serviceCodeKey?String(r[serviceCodeKey]||'').trim():'',tenDVC:serviceNameKey?String(r[serviceNameKey]||'').trim():'',url:urlKey?String(r[urlKey]||'').trim():'',nguon:'Bộ TTHC mới ngày 25/10/2026'});}return [...out.values()];
}
async function getSource(url){const r=await fetch(url+'&_t='+Date.now(),{cache:'no-store',redirect:'follow',headers:{'user-agent':'TTHC-Muong-Lay-Sync/3.0'}});if(!r.ok)throw new Error('HTTP '+r.status);return parseCSV(await r.text());}
async function loadFallback(){const r=await fetch(new URL(`../${FALLBACK_SOURCE}`,import.meta.url));if(!r.ok)throw new Error('Fallback HTTP '+r.status);const d=await r.json();return Array.isArray(d)?d:(Array.isArray(d?.rows)?d.rows:[]);}
async function loadCodes(){const r=await fetch(new URL(`../${NEW_CODE_SOURCE}`,import.meta.url));if(!r.ok)throw new Error('Code list HTTP '+r.status);const d=await r.json();if(!Array.isArray(d)||d.length!==TARGET_TOTAL)throw new Error('Danh sách mã mới không đủ '+TARGET_TOTAL+' mã');return d.map(x=>String(x).trim()).filter(Boolean);}
function stats(rows){return {full:rows.filter(x=>norm(x.mucDo||x.mucDichVu)==='toan trinh').length,partial:rows.filter(x=>norm(x.mucDo||x.mucDichVu)==='mot phan').length};}
async function build(force=false){if(!force&&cache.value&&Date.now()-cache.at<60000)return cache.value;const codes=await loadCodes();const wanted=new Set(codes);let rows=[];let used=0;const errors=[];
  for(const src of SHEET_SOURCES){try{const got=normalizeSheet(await getSource(src),wanted);if(got.length>rows.length){rows=got;used=1;}}catch(e){errors.push(e?.message||'source error');}}
  if(rows.length!==TARGET_TOTAL){const fallback=await loadFallback();const by=new Map(fallback.map(x=>[String(x.ma||'').trim(),x]));rows=codes.map(code=>by.get(code)).filter(Boolean);}
  const s=stats(rows);const result={ok:true,source:used?'Google Sheets - Bộ thủ tục hành chính mới':FALLBACK_SOURCE,sourceData:'Bộ TTHC mới ngày 25/10/2026',fetchedAt:new Date().toISOString(),total:rows.length,province:0,commune:rows.length,dvcTotal:rows.length,dvcProvince:0,dvcCommune:rows.length,full:s.full,partial:s.partial,newCount:0,changed:0,removed:Math.max(0,TARGET_TOTAL-rows.length),sourceCount:used,sourceErrors:errors.length,rows};cache={at:Date.now(),value:result};return result;}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Access-Control-Allow-Origin','*');if(req.method==='OPTIONS')return res.status(204).end();try{return res.status(200).json(await build(String(req.query?.refresh||'')==='true'));}catch(e){return res.status(502).json({ok:false,message:e?.message||'Không lấy được dữ liệu TTHC mới',source:'Bộ TTHC mới ngày 25/10/2026'});}}
