// GET /api/sold — riwayat barang yang sudah terjual (social proof, tanpa gambar biar hemat)
import { readCatalog } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const catalog = await readCatalog();
    const limit = Math.min(Number(req.query?.limit) || 24, 100);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      total: catalog.stats.soldCount || 0,
      items: (catalog.stats.soldHistory || []).slice(0, limit),
    });
  } catch (err) {
    console.error('sold handler failed:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat riwayat terjual' });
  }
}
