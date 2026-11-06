'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Item = { nama: string; qty: number; harga: number; emoji: string; id?: string };

type Props = {
  pesananId: string;
  pelangganId: string;
  pelangganNama: string;
  items: Item[];
  onTutup: () => void;
  onSelesai: () => void;
};

export default function RatingModal({ pesananId, pelangganId, pelangganNama, items, onTutup, onSelesai }: Props) {
  // Rating per item menu (pakai nama sebagai key karena item di pesanan tidak selalu punya id)
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [komentar, setKomentar] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState<Record<string, number>>({});

  const handleKirim = async () => {
    // Minimal satu item harus diberi rating
    if (Object.keys(ratings).length === 0) return;
    setSaving(true);
    try {
      for (const item of items) {
        const bintang = ratings[item.nama];
        if (!bintang) continue;

        // Simpan ulasan ke koleksi 'ulasan'
        await addDoc(collection(db, 'ulasan'), {
          pesananId,
          pelangganId,
          pelangganNama,
          menuNama: item.nama,
          menuEmoji: item.emoji,
          bintang,
          komentar: komentar[item.nama]?.trim() || '',
          createdAt: serverTimestamp(),
        });

        // Update rata-rata rating di dokumen menu (cari berdasarkan nama)
        const menuQuery = query(collection(db, 'menu'), where('nama', '==', item.nama));
        const menuSnap = await getDocs(menuQuery);
        if (!menuSnap.empty) {
          const menuDoc = menuSnap.docs[0];
          const data = menuDoc.data();
          const totalBintang = (data.totalBintang ?? 0) + bintang;
          const jumlahUlasan = (data.jumlahUlasan ?? 0) + 1;
          const rataRata = totalBintang / jumlahUlasan;
          await updateDoc(doc(db, 'menu', menuDoc.id), {
            totalBintang,
            jumlahUlasan,
            rataRata: Math.round(rataRata * 10) / 10,
          });
        }
      }

      // Tandai pesanan sudah dirating
      await updateDoc(doc(db, 'pesanan', pesananId), { sudahDirating: true });
      onSelesai();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onTutup}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-ink-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-ink-900 text-lg">Beri Ulasan</h3>
              <p className="text-ink-400 text-xs mt-0.5">Bagaimana pesananmu kali ini?</p>
            </div>
            <button onClick={onTutup} className="w-8 h-8 bg-ink-100 hover:bg-ink-200 rounded-xl flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto max-h-[60vh]">
          {items.map((item) => (
            <div key={item.nama} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.emoji}</span>
                <p className="font-semibold text-ink-800 text-sm">{item.nama}</p>
              </div>

              {/* Bintang */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hover[item.nama] ?? ratings[item.nama] ?? 0);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHover((h) => ({ ...h, [item.nama]: star }))}
                      onMouseLeave={() => setHover((h) => ({ ...h, [item.nama]: 0 }))}
                      onClick={() => setRatings((r) => ({ ...r, [item.nama]: star }))}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <svg
                        className={`w-8 h-8 transition-colors ${filled ? 'text-amber-400' : 'text-ink-200'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  );
                })}
                {ratings[item.nama] && (
                  <span className="ml-2 text-xs font-bold text-amber-500 self-center">
                    {['', 'Buruk', 'Kurang', 'Cukup', 'Bagus', 'Luar Biasa'][ratings[item.nama]]}
                  </span>
                )}
              </div>

              {/* Komentar (opsional) */}
              {ratings[item.nama] && (
                <textarea
                  value={komentar[item.nama] ?? ''}
                  onChange={(e) => setKomentar((k) => ({ ...k, [item.nama]: e.target.value }))}
                  placeholder="Tulis komentar (opsional)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-ink-200 text-xs text-ink-700 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none resize-none transition-all"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-100 flex gap-2">
          <button
            onClick={handleKirim}
            disabled={saving || Object.keys(ratings).length === 0}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Mengirim...' : 'Kirim Ulasan'}
          </button>
          <button
            onClick={onTutup}
            className="flex-1 py-3 bg-ink-100 hover:bg-ink-200 text-ink-700 font-bold rounded-xl text-sm transition-colors"
          >
            Lewati
          </button>
        </div>
      </div>
    </div>
  );
}
