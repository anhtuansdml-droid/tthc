import { put, list } from '@vercel/blob';
import crypto from 'node:crypto';

const DEFAULT_CONFIG_URL = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/site-config.json';
const LIVE_CONFIG_PATH = 'config/site-config.json';
const ALLOWED_ORIGINS = new Set([
  'https://anhtuansdml-droid.github.io',
  'https://tthc-anhtuansdml-9137.vercel.app'
]);

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}
function json(res, status, body) { return res.status(status).json(body); }
function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return req.body;
}
function sign(payload) { return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(payload).digest('base64url'); }
function makeToken() {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}
function validToken(req, body = {}) {
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : String(body.token || '');
  if (!supplied) return false;
  const parts = supplied.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function fetchBlobJson(url) {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('Blob response ' + r.status);
  return await r.json();
}

async function readConfig() {
  // Đọc file LIVE cố định trước. Đây là nguồn cấu hình duy nhất sau khi quản trị viên lưu.
  try {
    const found = await list({ prefix: LIVE_CONFIG_PATH, limit: 20 });
    const exact = (found.blobs || []).find(b => b.pathname === LIVE_CONFIG_PATH && b.url);
    if (exact?.url) return await fetchBlobJson(exact.url);
  } catch (_) {}

  // Tương thích với các bản cấu hình versioned đã tạo trước đây.
  try {
    const found = await list({ prefix: 'config/site-config-', limit: 50 });
    const blobs = (found.blobs || []).filter(b => b.url);
    blobs.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
    if (blobs[0]?.url) return await fetchBlobJson(blobs[0].url);
  } catch (_) {}

  const r = await fetch(DEFAULT_CONFIG_URL + '?v=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('Không đọc được cấu hình mặc định');
  return await r.json();
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const action = req.query?.action || '';
    const body = parseBody(req);

    if (req.method === 'GET') return json(res, 200, await readConfig());

    if (req.method === 'POST' && action === 'login') {
      const { username, password } = body;
      if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
        return json(res, 401, { ok: false, message: 'Sai tài khoản hoặc mật khẩu.' });
      }
      return json(res, 200, { ok: true, token: makeToken(), expiresIn: 28800 });
    }

    if (req.method === 'POST' && !validToken(req, body)) {
      return json(res, 401, { ok: false, message: 'Phiên quản trị đã hết hạn.' });
    }

    if (req.method === 'POST' && action === 'config') {
      const config = body.config || body;
      if (!config || typeof config !== 'object') return json(res, 400, { ok: false, message: 'Dữ liệu cấu hình không hợp lệ.' });

      // Ghi vào một pathname cố định để website luôn đọc đúng cấu hình mới nhất.
      // cacheControlMaxAge=0 + cache-bust ở GET giúp thay đổi hiển thị ngay sau khi lưu.
      const blob = await put(LIVE_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 0
      });
      return json(res, 200, { ok: true, url: blob.url, savedAt: new Date().toISOString() });
    }

    if (req.method === 'POST' && action === 'upload') {
      const type = String(req.query?.type || 'image').replace(/[^a-z0-9_-]/gi, '');
      const { data, contentType } = body;
      if (!data) return json(res, 400, { ok: false, message: 'Không nhận được ảnh.' });
      const file = Buffer.from(String(data).replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (!file.length) return json(res, 400, { ok: false, message: 'Ảnh không hợp lệ.' });
      if (file.length > 5 * 1024 * 1024) return json(res, 413, { ok: false, message: 'Ảnh vượt quá 5 MB.' });
      const mime = String(contentType || 'image/jpeg');
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const blob = await put(`images/${type}.${ext}`, file, {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: mime, cacheControlMaxAge: 86400
      });
      return json(res, 200, { ok: true, url: blob.url + (blob.url.includes('?') ? '&' : '?') + 'v=' + Date.now() });
    }

    return json(res, 405, { ok: false, message: 'Method không được hỗ trợ.' });
  } catch (e) {
    console.error('ADMIN_API_ERROR', e);
    return json(res, 500, { ok: false, message: e?.message || 'Lỗi máy chủ.' });
  }
}
