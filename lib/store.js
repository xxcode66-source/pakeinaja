// Lapisan penyimpanan: semuanya di Vercel Blob, tanpa database.
// - catalog kecil disimpan sebagai satu file JSON (overwrite saat ada perubahan)
// - gambar/video disimpan sebagai blob terpisah, dihapus saat barang sold/delete/replace
import { put, list, del } from '@vercel/blob';

const CATALOG_PATH = 'pakein/catalog.json';
export const IMG_PREFIX = 'pakein/img/';

// Cache URL catalog antar-invocation (hangat = hemat pemanggilan list())
let catalogUrl = null;

export const emptyCatalog = () => ({
  products: [],
  stats: { soldCount: 0, revenue: 0, soldHistory: [] },
});

async function findCatalogUrl() {
  if (catalogUrl) return catalogUrl;
  const { blobs } = await list({ prefix: CATALOG_PATH });
  const hit = blobs.find(b => b.pathname === CATALOG_PATH) || blobs[0];
  if (!hit) return null;
  catalogUrl = hit.url;
  return catalogUrl;
}

export async function readCatalog() {
  try {
    const url = await findCatalogUrl();
    if (!url) return emptyCatalog();
    const res = await fetch(`${url}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return emptyCatalog();
    const raw = await res.json();
    const base = emptyCatalog();
    return {
      products: Array.isArray(raw.products) ? raw.products : [],
      stats: { ...base.stats, ...(raw.stats || {}) },
    };
  } catch (err) {
    console.error('readCatalog failed:', err);
    return emptyCatalog();
  }
}

export async function writeCatalog(catalog) {
  const res = await put(CATALOG_PATH, JSON.stringify(catalog), {
    access: 'public',
    addRandomSuffix: false,
    overwrite: true,
    allowOverwrite: true,
  });
  catalogUrl = res.url;
  return res;
}

// Hapus file blob yang sudah tidak dipakai (hemat storage gratisan)
export async function deleteBlobs(urls) {
  const blobUrls = (urls || []).filter(
    u => typeof u === 'string' && u.includes('.blob.vercel-storage.com')
  );
  if (!blobUrls.length) return;
  try {
    await del(blobUrls);
  } catch (err) {
    console.error('deleteBlobs failed:', err);
  }
}

// Auth admin sederhana: Bearer token dibandingkan env ADMIN_TOKEN
export function requireAdmin(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return true;
  res.status(401).json({ success: false, error: 'Unauthorized' });
  return false;
}

// Baca raw body (untuk upload gambar/video tanpa library multipart)
export async function readRawBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const err = new Error('File terlalu besar');
      err.code = 'FILE_TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Kumpulkan semua URL blob milik satu produk (untuk dibersihkan)
export function mediaUrlsOf(product) {
  if (!product) return [];
  return [...(product.images || []), ...(product.video ? [product.video] : [])];
}
