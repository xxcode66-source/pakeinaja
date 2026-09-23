// /api/admin/products — GET: daftar penuh + statistik, POST: tambah barang
import { readCatalog, writeCatalog, requireAdmin } from '../../lib/store.js';
import { sanitizeProduct } from '../../lib/validate.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const catalog = await readCatalog();

    if (req.method === 'GET') {
      return res.json({ success: true, products: catalog.products, stats: catalog.stats });
    }

    if (req.method === 'POST') {
      const product = { id: Date.now(), createdAt: new Date().toISOString(), ...sanitizeProduct(req.body) };
      if (!product.name) return res.status(400).json({ success: false, error: 'Nama barang wajib diisi' });
      if (!product.price) return res.status(400).json({ success: false, error: 'Harga wajib diisi' });
      catalog.products.push(product);
      await writeCatalog(catalog);
      return res.json({ success: true, product });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('admin/products failed:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan di server' });
  }
}
