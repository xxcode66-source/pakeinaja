// POST /api/admin/sell — tandai barang terjual:
// barang hilang dari etalase, counter +1, omzet bertambah, media blob dibersihkan
import { readCatalogStrict, writeCatalog, requireAdmin, deleteBlobs, mediaUrlsOf } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  try {
    const id = Number(req.body?.id);
    if (!id) return res.status(400).json({ success: false, error: 'id wajib diisi' });

    const catalog = await readCatalogStrict();
    const idx = catalog.products.findIndex(p => Number(p.id) === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Barang tidak ditemukan' });

    const [sold] = catalog.products.splice(idx, 1);
    catalog.stats.soldCount = (catalog.stats.soldCount || 0) + 1;
    catalog.stats.revenue = (catalog.stats.revenue || 0) + (Number(sold.price) || 0);
    catalog.stats.soldHistory = [
      { id: sold.id, name: sold.name, price: Number(sold.price) || 0, soldAt: new Date().toISOString() },
      ...(catalog.stats.soldHistory || []),
    ].slice(0, 500); // riwayat dibatasi biar file catalog tetap kecil

    await writeCatalog(catalog);
    await deleteBlobs(mediaUrlsOf(sold));
    return res.json({ success: true, stats: catalog.stats });
  } catch (err) {
    console.error('admin/sell failed:', err);
    return res.status(503).json({ success: false, error: 'Gagal memproses. Katalog tidak diubah demi keamanan data — coba lagi.' });
  }
}
