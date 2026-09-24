// /api/admin/products/:id — PATCH: edit barang, DELETE: hapus barang
// Gambar/video yang diganti/dihapus ikut dihapus dari Blob (storage tetap hemat)
import { readCatalogStrict, writeCatalog, requireAdmin, deleteBlobs, mediaUrlsOf } from '../../../lib/store.js';
import { sanitizeProduct } from '../../../lib/validate.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const id = Number(req.params.id);
    const catalog = await readCatalogStrict();
    const idx = catalog.products.findIndex(p => Number(p.id) === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Barang tidak ditemukan' });
    const old = catalog.products[idx];

    if (req.method === 'PATCH') {
      const updated = { ...old, ...sanitizeProduct({ ...old, ...req.body }), id: old.id, createdAt: old.createdAt };
      const removed = mediaUrlsOf(old).filter(u => !mediaUrlsOf(updated).includes(u));
      catalog.products[idx] = updated;
      await writeCatalog(catalog);
      await deleteBlobs(removed);
      return res.json({ success: true, product: updated });
    }

    if (req.method === 'DELETE') {
      catalog.products.splice(idx, 1);
      await writeCatalog(catalog);
      await deleteBlobs(mediaUrlsOf(old));
      return res.json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('admin/products/[id] failed:', err);
    const info = [err?.name, err?.code, err?.statusCode, err?.message].filter(Boolean).join(' | ');
    return res.status(503).json({ success: false, error: 'DEBUG: ' + (info || String(err)) + ' — katalog tidak diubah.' });
  }
}
