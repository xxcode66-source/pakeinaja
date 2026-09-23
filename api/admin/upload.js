// POST /api/admin/upload — upload gambar/video langsung ke Vercel Blob.
// Body = bytes mentah; header: x-filename (opsional), Content-Type: image/*|video/*
import { put } from '@vercel/blob';
import { requireAdmin, readRawBody, IMG_PREFIX } from '../../lib/store.js';

export const maxDuration = 60;

const MAX_IMAGE = 8 * 1024 * 1024;  // 8 MB
const MAX_VIDEO = 40 * 1024 * 1024; // 40 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  const contentType = req.headers['content-type'] || 'application/octet-stream';
  const isVideo = contentType.startsWith('video/');
  const isImage = contentType.startsWith('image/');
  if (!isImage && !isVideo) {
    return res.status(400).json({ success: false, error: 'Hanya gambar/video yang boleh diupload' });
  }

  try {
    const body = await readRawBody(req, isVideo ? MAX_VIDEO : MAX_IMAGE);
    if (!body.length) return res.status(400).json({ success: false, error: 'File kosong' });

    const rawName = String(req.headers['x-filename'] || `file${isVideo ? '.mp4' : '.jpg'}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-60);
    const ext = rawName.slice(rawName.lastIndexOf('.')) || (isVideo ? '.mp4' : '.jpg');
    const pathname = `${IMG_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const blob = await put(pathname, body, { access: 'public', contentType });
    return res.json({ success: true, url: blob.url });
  } catch (err) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({ success: false, error: `Ukuran maks ${isVideo ? '40MB (video)' : '8MB (gambar)'}` });
    }
    console.error('admin/upload failed:', err);
    return res.status(500).json({ success: false, error: 'Upload gagal' });
  }
}
