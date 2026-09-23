// GET /api/products?search=&price_range= — etalase publik (index.html)
import { readCatalog } from '../lib/store.js';

const PRICE_RANGES = {
  murce: p => p.price < 26000,
  medium: p => p.price >= 26000 && p.price <= 35000,
  premi: p => p.price > 35000,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const catalog = await readCatalog();
    const { search = '', price_range: range = '' } = req.query || {};

    let data = catalog.products.slice().sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );

    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter(p =>
        [p.name, p.description].some(f => String(f || '').toLowerCase().includes(q))
      );
    }
    if (range && PRICE_RANGES[range]) {
      data = data.filter(PRICE_RANGES[range]);
    }

    res.setHeader('Cache-Control', 'no-store'); // data harus selalu segar (perubahan admin langsung tampil)
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('products handler failed:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat produk' });
  }
}
