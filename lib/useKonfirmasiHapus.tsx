'use client';

import { useState, useCallback } from 'react';

type OpsiKonfirmasi = {
  judul?: string;
  pesan: string;
  labelHapus?: string;
};

type KonfirmasiState = OpsiKonfirmasi & { onYa: () => void };

// ── Modal Konfirmasi ─────────────────────────────────────────
export function ModalKonfirmasiHapus({
  state,
  onTutup,
}: {
  state: KonfirmasiState | null;
  onTutup: () => void;
}) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onTutup}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🗑️</div>
          <h3 className="font-extrabold text-ink-900 text-base">{state.judul ?? 'Konfirmasi Hapus'}</h3>
          <p className="text-ink-500 text-sm mt-1.5 leading-relaxed">{state.pesan}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { state.onYa(); onTutup(); }}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors"
          >
            {state.labelHapus ?? 'Hapus'}
          </button>
          <button
            onClick={onTutup}
            className="flex-1 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useKonfirmasiHapus() {
  const [state, setState] = useState<KonfirmasiState | null>(null);

  const minta = useCallback((opsi: OpsiKonfirmasi & { onYa: () => void }) => {
    setState(opsi);
  }, []);

  const tutup = useCallback(() => setState(null), []);

  return { state, minta, tutup };
}
