# PAKEINAJA — Toko Cardigan

Frontend statis + Vercel Functions + **Vercel Blob (tanpa database)**.
Dirancang untuk jualan personal: tiap barang cuma 1 pcs, sekali terjual langsung hilang dari etalase dan otomatis tercatat di hitungan & omzet admin.

## Cara Kerja
- Semua data (daftar barang + statistik) disimpan di **satu file `catalog.json` di Vercel Blob** yang ditimpa (overwrite) setiap ada perubahan. Tidak ada DB sama sekali → gratisan awet.
- Gambar/video barang diupload ke Blob. Saat barang **sold / dihapus / diganti fotonya**, file blob-nya **ikut dihapus** supaya storage tidak menumpuk (rotasi ±20 file).
- Pembeli order lewat WhatsApp (tombol di modal produk).

## Halaman
| URL | Fungsi |
|---|---|
| `/` (index.html) | Etalase: cari, filter harga, detail + WA |
| `/admin.html` | Admin: login token, tambah/edit barang, tandai **Terjual**, statistik & riwayat |

## API (Vercel Functions di `api/`)
| Endpoint | Method | Auth | Keterangan |
|---|---|---|---|
| `/api/products?search=&price_range=` | GET | publik | Daftar barang aktif (`price_range`: murce/medium/premi) |
| `/api/admin/products` | GET / POST | Bearer | List penuh + statistik / tambah barang |
| `/api/admin/products/:id` | PATCH / DELETE | Bearer | Edit (blob lama dibersihkan) / hapus |
| `/api/admin/sell` | POST | Bearer | Tandai terjual: barang hilang, kejual +1, omzet nambah |
| `/api/admin/stats` | POST `{reset:true}` | Bearer | Reset hitungan & riwayat terjual |
| `/api/admin/upload` | POST (raw bytes) | Bearer | Upload gambar (maks 8MB) / video (maks 40MB) ke Blob |

Auth admin: header `Authorization: Bearer <ADMIN_TOKEN>` — token dimasukkan sekali di halaman admin, tersimpan di localStorage.

## Setup
1. **Vercel** → import repo ini → deploy (tidak perlu build command, ini static + functions).
2. Buat **Blob Store** di Storage tab Vercel → env `BLOB_READ_WRITE_TOKEN` otomatis terpasang.
3. Tambahkan env **`ADMIN_TOKEN`** (Project → Settings → Environment Variables) dengan nilai token rahasia pilihanmu.
4. Re-deploy agar env terbaca. Buka `https://<domain>/admin.html`, masukkan token, mulai jualan.

### Development lokal
```bash
npm install -g vercel
vercel link      # hubungkan ke project Vercel-mu
vercel pull      # ambil env (termasuk BLOB_READ_WRITE_TOKEN)
npm run dev      # vercel dev → http://localhost:3000
```
> `npm start` Express sudah tidak dipakai — backend lama (`src/`) dihapus dan diganti fungsi serverless di `api/`.

## Batasan yang Disengaja (ringan & murah)
- Tulis katalog = timpa 1 file JSON. Aman karena yang menulis hanya 1 admin. Kalau suatu saat barang >2.000 pcs sekaligus, baru pertimbangkan pindah ke Neon Postgres.
- Riwayat terjual dibatasi 500 entri terakhir (hitungan & omzet tetap akurat).
- Counter pengunjung & wishlist server-side dihapus karena tidak cocok dengan serverless.

## Catatan Sisa Versi Lama
Sudah dibersihkan dari repo: backend Express (`src/`), `server.js`, folder `public/`, `pakein.html`, `products_editor.html`, `data/`, config Tailwind/PostCSS lokal. Cadangan lokal (foto upload lama) ada di `_legacy/` — tidak masuk git/deploy. Halaman aktif: `index.html`, `admin.html`, `how-to-order.html`.
