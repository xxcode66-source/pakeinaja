// GET /api/admin/_status — diagnostik koneksi Blob (butuh ADMIN_TOKEN)
// Cek: env token ada? tulis-baca-hapus blob probe berhasil?
import { put, list, del } from '@vercel/blob';
import { requireAdmin } from '../../lib/store.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const out = {
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasAdminToken: !!process.env.ADMIN_TOKEN,
    steps: {},
  };

  const probePath = 'pakein/_probe.txt';
  try {
    const b = await put(probePath, 'ok-' + Date.now(), { access: 'public', addRandomSuffix: false, overwrite: true, allowOverwrite: true });
    out.steps.put = { ok: true, url: b.url };
  } catch (err) {
    out.steps.put = { ok: false, error: String(err && (err.message || err)) };
  }

  try {
    const { blobs } = await list({ prefix: 'pakein/' });
    out.steps.list = { ok: true, count: blobs.length };
  } catch (err) {
    out.steps.list = { ok: false, error: String(err && (err.message || err)) };
  }

  try {
    await del([probePath]);
    out.steps.del = { ok: true };
  } catch (err) {
    out.steps.del = { ok: false, error: String(err && (err.message || err)) };
  }

  return res.json({ success: true, ...out });
}
