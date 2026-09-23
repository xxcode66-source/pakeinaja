// Validasi/pembersihan input produk (dipakai endpoint tambah & edit)
export const sanitizeProduct = (body = {}) => ({
  name: String(body.name || '').trim().slice(0, 120),
  price: Math.max(0, Number(body.price) || 0),
  priceOld: Number(body.priceOld) > 0 ? Number(body.priceOld) : null,
  description: String(body.description || '').trim().slice(0, 500),
  badge: ['BEST SELLER', 'BARU', 'PREMI'].includes(body.badge) ? body.badge : null,
  rating: Math.min(5, Math.max(0, Number(body.rating) || 5)),
  images: Array.isArray(body.images) ? body.images.filter(u => typeof u === 'string' && u).slice(0, 8) : [],
  video: typeof body.video === 'string' && body.video ? body.video : null,
});
