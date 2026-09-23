// POST /api/admin/stats — reset statistik terjual & omzet (barang aktif tidak terpengaruh)
import { readCatalog, writeCatalog, requireAdmin } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  try {
    if (req.body?.reset !== true) {
      return res.status(400).json({ success: false, error: 'Body { reset: true } wajib diisi' });
    }
    const catalog = await readCatalog();
    catalog.stats = { soldCount: 0, revenue: 0, soldHistory: [] };
    await writeCatalog(catalog);
    return res.json({ success: true, stats: catalog.stats });
  } catch (err) {
    console.error('admin/stats failed:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan di server' });
  }
}
