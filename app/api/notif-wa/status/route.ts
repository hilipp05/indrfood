import { NextResponse } from 'next/server';

const BOT_STATUS_URL = process.env.WA_BOT_STATUS_URL ?? 'http://localhost:3001/status';

export async function GET() {
  try {
    const res = await fetch(BOT_STATUS_URL, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, ready: false, error: 'Bot tidak aktif' }, { status: 503 });
  }
}
