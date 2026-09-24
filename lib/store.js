// Lapisan penyimpanan: semuanya di Vercel Blob, tanpa database.
// - catalog kecil disimpan sebagai satu file JSON (overwrite saat ada perubahan)
// - gambar/video disimpan sebagai blob terpisah, dihapus saat barang sold/delete/replace
import { put, list, del } from '@vercel/blob';

const CATALOG_PATH = 'pakein/catalog.json';
export const IMG_PREFIX = 'pakein/img/';

// Cache URL catalog antar-invocation (hangat = hemat pemanggilan list())
let catalogUrl = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Coba ulang operasi Blob beberapa kali untuk mengatasi kegagalan sesaat (transient),
// misal hiccup jaringan yang bikin DELETE/simpan gagal dengan 5xx.
async function retry(fn, tries = 3, baseDelay = 250) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (i < tries - 1) await sleep(baseDelay * 2 ** i);
    }
  }
  throw lastErr;
}

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

// Muat catalog; LEMPAR error kalau blob ada tapi gagal dibaca/diparsing.
// "belum ada catalog sama sekali" (first-time) dianggap kosong & AMAN (tidak lempar error).
async function loadCatalogOrThrow() {
  return await retry(async () => {
    const url = await findCatalogUrl();
    if (!url) return emptyCatalog(); // first-time, memang kosong
    const res = await fetch(`${url}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) { catalogUrl = null; throw new Error(`Gagal membaca catalog (HTTP ${res.status})`); }
    let raw;
    try { raw = await res.json(); }
    catch { catalogUrl = null; throw new Error('Catalog rusak / bukan JSON valid'); }
    if (!raw || !Array.isArray(raw.products)) throw new Error('Format catalog tidak dikenali');
    const base = emptyCatalog();
    return {
      products: raw.products,
      stats: { ...base.stats, ...(raw.stats || {}) },
    };
  });
}

// Untuk pembacaan PUBLIK (GET /api/products): selalu graceful, jangan pernah 500.
export async function readCatalog() {
  try {
    return await loadCatalogOrThrow();
  } catch (err) {
    console.error('readCatalog failed:', err);
    return emptyCatalog();
  }
}

// Untuk endpoint yang MENULIS catalog: lempar error kalau baca gagal,
// supaya caller membatalkan operasi dan TIDAK menimpa catalog dengan data kosong (anti-wipe).
export async function readCatalogStrict() {
  return await loadCatalogOrThrow();
}

export async function writeCatalog(catalog) {
  return await retry(async () => {
    const res = await put(CATALOG_PATH, JSON.stringify(catalog), {
      access: 'public',
      addRandomSuffix: false,
      overwrite: true,
      allowOverwrite: true,
    });
    catalogUrl = res.url;
    return res;
  });
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
  const urls = [...(product.images || [])];
  (product.bundleItems || []).forEach(it => { if (it && it.image) urls.push(it.image); });
  if (product.video) urls.push(product.video);
  return [...new Set(urls)]; // dedup (gambar bundle muncul di images & bundleItems)
}
