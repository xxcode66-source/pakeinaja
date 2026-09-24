// Validasi/pembersihan input produk (dipakai endpoint tambah & edit)
// Mendukung dua tipe: 'single' (barang satuan) dan 'bundle' (paket beberapa barang + 1 bonus di akhir).
export const sanitizeProduct = (body = {}) => {
  const type = body.type === 'bundle' ? 'bundle' : 'single';

  // Bundle: maks 20 item, tiap item punya nama + gambar. Item TERAKHIR dianggap bonus.
  const bundleItems = type === 'bundle' && Array.isArray(body.bundleItems)
    ? body.bundleItems
        .filter(it => it && typeof it.image === 'string' && it.image)
        .slice(0, 20)
        .map((it, i, arr) => ({
          name: String(it.name || '').trim().slice(0, 60) || `Item ${i + 1}`,
          image: it.image,
          bonus: arr.length >= 2 && i === arr.length - 1,
        }))
    : [];

  const singleImages = Array.isArray(body.images)
    ? body.images.filter(u => typeof u === 'string' && u).slice(0, 8)
    : [];

  // Untuk bundle, pakai gambar tiap item sebagai galeri/cover — sekaligus memastikan
  // blob item ikut terhapus saat sold/delete (lewat mediaUrlsOf yang membaca images).
  const images = type === 'bundle' ? bundleItems.map(it => it.image) : singleImages;

  return {
    name: String(body.name || '').trim().slice(0, 120),
    price: Math.max(0, Number(body.price) || 0),
    priceOld: Number(body.priceOld) > 0 ? Number(body.priceOld) : null,
    description: String(body.description || '').trim().slice(0, 500),
    badge: ['BEST SELLER', 'BARU', 'PREMI'].includes(body.badge) ? body.badge : null,
    rating: Math.min(5, Math.max(0, Number(body.rating) || 5)),
    type,
    bundleItems,
    images,
    video: typeof body.video === 'string' && body.video ? body.video : null,
  };
};
