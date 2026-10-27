import crypto from 'node:crypto';

const DEFAULT_CONFIG_URL = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/site-config.json';
const ALLOWED_ORIGINS = new Set([
  'https://tthcmuonglay.vercel.app',
  'https://anhtuansdml-droid.github.io'
]);
function cors(req,res){const origin=req.headers.origin||'';if(ALLOWED_ORIGINS.has(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS')}
function json(res,status,body){return res.status(status).json(body)}
function parseBody(req){if(!req.body)return {};if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch(_){return {}}}return req.body}
function sign(payload){return crypto.createHmac('sha256',process.env.ADMIN_PASSWORD||'').update(payload).digest('base64url')}
function makeToken(){const exp=Date.now()+8*60*60*1000;const payload=`admin.${exp}`;return `${payload}.${sign(payload)}`}
function validToken(req,body={}){const header=req.headers.authorization||'';const supplied=header.startsWith('Bearer ')?header.slice(7):String(body.token||'');if(!supplied)return false;const parts=supplied.split('.');if(parts.length!==3||parts[0]!=='admin')return false;const exp=Number(parts[1]);if(!Number.isFinite(exp)||exp<Date.now())return false;const expected=sign(`${parts[0]}.${parts[1]}`);const a=Buffer.from(parts[2]),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
async function readConfig(){
  // Không phụ thuộc Vercel Blob: Blob store đang bị suspend nên GET /api/admin
  // phải luôn có cấu hình dự phòng từ GitHub.
  const r=await fetch(DEFAULT_CONFIG_URL+'?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('Không đọc được cấu hình giao diện mặc định');
  return await r.json();
}
async function probeSource(sourceUrl){const target=new URL(sourceUrl);if(target.hostname!=='dieuphoi.netlify.app')throw new Error('Nguồn thử nghiệm phải thuộc dieuphoi.netlify.app');const r=await fetch(target.href,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'TTHC-Muong-Lay-Admin/1.0'}});const html=await r.text();const scripts=[];for(const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){try{scripts.push(new URL(m[1],target.href).href)}catch(_){}}return {ok:r.ok,httpStatus:r.status,htmlBytes:Buffer.byteLength(html,'utf8'),scripts,dataCandidates:[],notes:['Đã kiểm tra nguồn Điều phối.']}}
export default async function handler(req,res){cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();try{const action=req.query?.action||'';const body=parseBody(req);if(req.method==='GET')return json(res,200,await readConfig());if(req.method==='POST'&&action==='login'){const {username,password}=body;if(username!==process.env.ADMIN_USER||password!==process.env.ADMIN_PASSWORD)return json(res,401,{ok:false,message:'Sai tài khoản hoặc mật khẩu.'});return json(res,200,{ok:true,token:makeToken(),expiresIn:28800})}if(req.method==='POST'&&!validToken(req,body))return json(res,401,{ok:false,message:'Phiên quản trị đã hết hạn.'});if(req.method==='POST'&&action==='probe-source')return json(res,200,await probeSource(String(body.sourceUrl||'https://dieuphoi.netlify.app/niemyet')));if(req.method==='POST'&&action==='config')return json(res,503,{ok:false,message:'Tạm thời không lưu cấu hình bằng Vercel Blob vì kho Blob đang bị tạm ngưng. Cấu hình hiện tại vẫn được giữ nguyên.'});if(req.method==='POST'&&action==='upload')return json(res,503,{ok:false,message:'Tạm thời không tải ảnh bằng Vercel Blob vì kho Blob đang bị tạm ngưng.'});return json(res,405,{ok:false,message:'Method không được hỗ trợ.'});}catch(e){console.error('ADMIN_API_ERROR',e);return json(res,500,{ok:false,message:e?.message||'Lỗi máy chủ.'})}}
