import { put, list } from '@vercel/blob';
import crypto from 'node:crypto';

const DEFAULT_CONFIG_URL = 'https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/site-config.json';
const ALLOWED_ORIGINS = new Set([
  'https://anhtuansdml-droid.github.io',
  'https://tthc-coral.vercel.app',
  'https://tthc-anhtuansdml-9137.vercel.app'
]);

function cors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.has(origin) ? origin : 'null');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
}

function json(res, status, body) {
  res.status(status).json(body);
}

function sign(payload) {
  return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(payload).digest('base64url');
}

function makeToken() {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function validToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const token = header.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function readConfig() {
  try {
    const found = await list({ prefix: 'config/site-config.json', limit: 1 });
    if (found.blobs && found.blobs[0]?.url) {
      const r = await fetch(found.blobs[0].url, { cache: 'no-store' });
      if (r.ok) return await r.json();
    }
  } catch (_) {}
  const r = await fetch(DEFAULT_CONFIG_URL, { cache: 'no-store' });
  if (!r.ok) throw new Error('Không đọc được cấu hình mặc định');
  return await r.json();
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST' && req.url.split('?')[0].endsWith('/api/admin')) {
      const action = req.query?.action || 'login';
      if (action === 'login') {
        const { username, password } = req.body || {};
        if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
          return json(res, 401, { ok: false, message: 'Sai tài khoản hoặc mật khẩu.' });
        }
        return json(res, 200, { ok: true, token: makeToken(), expiresIn: 28800 });
      }
      if (!validToken(req)) return json(res, 401, { ok: false, message: 'Phiên quản trị đã hết hạn.' });

      if (action === 'config') {
        const config = req.body;
        if (!config || typeof config !== 'object') return json(res, 400, { ok: false, message: 'Dữ liệu cấu hình không hợp lệ.' });
        const blob = await put('config/site-config.json', JSON.stringify(config, null, 2) + '\n', {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json; charset=utf-8',
          cacheControlMaxAge: 60
        });
        return json(res, 200, { ok: true, url: blob.url });
      }
    }

    if (req.method === 'GET') {
      const config = await readConfig();
      return json(res, 200, config);
    }

    if (req.method === 'POST' && req.query?.action === 'upload') {
      if (!validToken(req)) return json(res, 401, { ok: false, message: 'Phiên quản trị đã hết hạn.' });
      const type = String(req.query?.type || 'image').replace(/[^a-z0-9_-]/gi, '');
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const raw = req.body;
      const file = Buffer.isBuffer(raw) ? raw : Buffer.from(raw || '');
      if (!file.length) return json(res, 400, { ok: false, message: 'Không nhận được ảnh.' });
      if (file.length > 5 * 1024 * 1024) return json(res, 413, { ok: false, message: 'Ảnh vượt quá 5 MB.' });
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const blob = await put(`images/${type}.${ext}`, file, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        cacheControlMaxAge: 86400
      });
      return json(res, 200, { ok: true, url: blob.url });
    }

    return json(res, 405, { ok: false, message: 'Method không được hỗ trợ.' });
  } catch (e) {
    console.error(e);
    return json(res, 500, { ok: false, message: e?.message || 'Lỗi máy chủ.' });
  }
}
