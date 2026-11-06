'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = 'loading' | 'ready' | 'offline';

export default function WaBotStatus() {
  const [status, setStatus] = useState<Status>('loading');
  const [nomor, setNomor] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const cekStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/notif-wa/status', { cache: 'no-store' });
      const data = await res.json();
      if (data.ready) {
        setStatus('ready');
        setNomor(data.nomor ?? null);
      } else {
        setStatus('offline');
        setNomor(null);
      }
    } catch {
      setStatus('offline');
      setNomor(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    cekStatus();
    // Poll setiap 10 detik
    const interval = setInterval(cekStatus, 10_000);
    return () => clearInterval(interval);
  }, [cekStatus]);

  if (status === 'loading') {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-ink-50 border border-ink-200 text-ink-400 text-xs font-semibold">
        <div className="w-3 h-3 border-2 border-ink-300 border-t-transparent rounded-full animate-spin" />
        WA Bot
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <button
        onClick={cekStatus}
        disabled={checking}
        title={nomor ? `WA Bot aktif · +${nomor} — klik untuk refresh` : 'WA Bot aktif — klik untuk refresh'}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors"
      >
        {checking
          ? <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          : <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        }
        WA Bot
        {nomor && (
          <span className="text-green-500 font-normal hidden lg:inline">· +{nomor}</span>
        )}
      </button>
    );
  }

  // offline
  return (
    <button
      onClick={cekStatus}
      disabled={checking}
      title="WA Bot tidak aktif — klik untuk cek ulang. Jalankan: cd wa-bot && node bot.js"
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
    >
      {checking
        ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        : <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
      }
      WA Bot Mati
    </button>
  );
}
