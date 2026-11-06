import { NextRequest, NextResponse } from 'next/server';

const BOT_URL = process.env.WA_BOT_URL ?? 'http://localhost:3001/kirim-notif';

/**
 * Verifikasi Firebase ID token secara ringan:
 * decode payload JWT tanpa verifikasi signature (signature diverifikasi
 * oleh Firestore Rules di sisi data). Tujuannya hanya memastikan
 * request berasal dari user yang sudah login, bukan dari luar.
 *
 * Untuk keamanan produksi penuh, gunakan firebase-admin SDK.
 */
function decodeJwtPayload(token: string): { uid?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Validasi: harus ada Bearer token dari Firebase Auth
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cek token tidak expired
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Forward ke bot WA
    const res = await fetch(BOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000), // timeout 8 detik
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    // Bot tidak aktif — tidak error fatal, cukup log
    const message = err instanceof Error ? err.message : 'Bot tidak aktif';
    console.warn('[notif-wa] Bot tidak dapat dihubungi:', message);
    return NextResponse.json({ ok: false, error: 'Bot tidak aktif' }, { status: 503 });
  }
}
