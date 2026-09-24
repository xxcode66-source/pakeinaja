// GET /api/admin/export — unduh cadangan seluruh katalog (barang + statistik) sebagai JSON.
// Dilindungi ADMIN_TOKEN. Buat restore: salin isinya balik ke Blob, atau cukup simpan sebagai asuransi.
import { readCatalogStrict, requireAdmin } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  try {
    const catalog = await readCatalogStrict();
    const backup = {
      _kind: 'pakeinaja-backup',
      exportedAt: new Date().toISOString(),
      products: catalog.products,
      stats: catalog.stats,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="pakeinaja-backup-${stamp}.json"`);
    return res.status(200).json(backup);
  } catch (err) {
    console.error('admin/export failed:', err);
    return res.status(503).json({ success: false, error: 'Gagal membaca katalog untuk backup — coba lagi.' });
  }
}
