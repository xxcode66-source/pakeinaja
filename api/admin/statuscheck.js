// GET /api/admin/_status — diagnostik koneksi Blob (butuh ADMIN_TOKEN)
// Cek: env token ada? tulis-baca-hapus blob probe berhasil?
import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  // DIAGNOSTIK sementara: boleh dibuka tanpa login (hanya menampilkan boolean & pesan error, TIDAK menampilkan token).
  // Setelah beres, endpoint ini sebaiknya dihapus/dikunci lagi dengan requireAdmin.
  const out = {
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasAdminToken: !!process.env.ADMIN_TOKEN,
    build: (process.env.VERCEL_GIT_COMMIT_SHA || 'n/a').slice(0, 7),
    steps: {},
  };

  // Diagnostik format token (AMAN: tidak membocorkan rahasia, hanya prefiks/panjang/casing)
  const t = process.env.BLOB_READ_WRITE_TOKEN || '';
  out.tokenInfo = {
    length: t.length,
    startsWithCorrectPrefix: t.startsWith('vercel_blob_rw_'),
    hasQuotes: /"|'/.test(t),
    hasWhitespace: t !== t.trim() || /\s/.test(t),
    prefixAndStore: t.slice(0, 31), // 'vercel_blob_rw_' + ID store (16)
    lastChar: JSON.stringify(t.slice(-1)),
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
