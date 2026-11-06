'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useKonfirmasiHapus, ModalKonfirmasiHapus } from '@/lib/useKonfirmasiHapus';

type Ulasan = {
  id: string;
  pesananId: string;
  pelangganNama: string;
  menuNama: string;
  menuEmoji: string;
  bintang: number;
  komentar: string;
  createdAt: { seconds: number } | null;
};

function Bintang({ nilai }: { nilai: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= nilai ? 'text-amber-400' : 'text-ink-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminUlasanPage() {
  const [ulasan, setUlasan] = useState<Ulasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState('');
  const [filterBintang, setFilterBintang] = useState<number | 'semua'>('semua');
  const { state: konfirmasiState, minta: mintaKonfirmasi, tutup: tutupKonfirmasi } = useKonfirmasiHapus();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsub) unsub();
      if (!user) { setLoading(false); return; }
      const q = query(collection(db, 'ulasan'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snap) => {
        setUlasan(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ulasan)));
        setLoading(false);
      });
    });
    return () => { unsubAuth(); if (unsub) unsub(); };
  }, []);

  const filtered = ulasan.filter((u) => {
    const cocokBintang = filterBintang === 'semua' || u.bintang === filterBintang;
    const cocokCari = cari === '' ||
      u.pelangganNama.toLowerCase().includes(cari.toLowerCase()) ||
      u.menuNama.toLowerCase().includes(cari.toLowerCase());
    return cocokBintang && cocokCari;
  });

  // Statistik
  const rataRata = ulasan.length > 0
    ? ulasan.reduce((s, u) => s + u.bintang, 0) / ulasan.length
    : 0;
  const distribusi = [5, 4, 3, 2, 1].map((b) => ({
    bintang: b,
    jumlah: ulasan.filter((u) => u.bintang === b).length,
  }));
  const maxDistribusi = Math.max(...distribusi.map((d) => d.jumlah), 1);

  const handleHapusUlasan = (id: string, nama: string, menu: string) => {
    mintaKonfirmasi({
      judul: 'Hapus Ulasan',
      pesan: `Hapus ulasan dari "${nama}" untuk menu "${menu}"? Tindakan ini tidak bisa dibatalkan.`,
      labelHapus: 'Ya, Hapus',
      onYa: () => deleteDoc(doc(db, 'ulasan', id)),
    });
  };

  const labelBintang: Record<number, string> = {
    5: 'Luar Biasa', 4: 'Bagus', 3: 'Cukup', 2: 'Kurang', 1: 'Buruk',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-ink-900">Ulasan Pelanggan</h2>
        <p className="text-ink-400 text-sm mt-0.5">{ulasan.length} ulasan masuk</p>
      </div>

      {ulasan.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 text-center border border-ink-100 shadow-sm">
          <span className="text-5xl">⭐</span>
          <p className="mt-3 font-bold text-ink-700">Belum ada ulasan</p>
          <p className="text-ink-400 text-sm mt-1">Ulasan akan muncul setelah pelanggan menilai pesanan mereka</p>
        </div>
      ) : (
        <>
          {/* Statistik ringkasan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Rata-rata */}
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⭐</span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-ink-900">{rataRata.toFixed(1)}</p>
                <p className="text-xs text-ink-400 mt-0.5">Rata-rata dari {ulasan.length} ulasan</p>
                <div className="mt-1">
                  <Bintang nilai={Math.round(rataRata)} />
                </div>
              </div>
            </div>

            {/* Distribusi bintang */}
            <div className="sm:col-span-2 bg-white rounded-2xl border border-ink-100 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">Distribusi Rating</p>
              <div className="space-y-2">
                {distribusi.map((d) => (
                  <button
                    key={d.bintang}
                    onClick={() => setFilterBintang(filterBintang === d.bintang ? 'semua' : d.bintang)}
                    className={`w-full flex items-center gap-2 group transition-all rounded-lg px-1 py-0.5 ${filterBintang === d.bintang ? 'bg-amber-50' : 'hover:bg-ink-50'}`}
                  >
                    <span className="text-xs font-bold text-ink-500 w-3">{d.bintang}</span>
                    <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${(d.jumlah / maxDistribusi) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-400 font-semibold w-6 text-right">{d.jumlah}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <svg className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama pelanggan atau menu..."
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none bg-white shadow-sm"
              />
            </div>
            {filterBintang !== 'semua' && (
              <button
                onClick={() => setFilterBintang('semua')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {filterBintang} bintang
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <span className="text-xs text-ink-400">{filtered.length} ulasan</span>
          </div>

          {/* List ulasan */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-ink-100 shadow-sm">
              <span className="text-4xl">🔍</span>
              <p className="mt-2 font-bold text-ink-700 text-sm">Tidak ada ulasan yang cocok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((u) => {
                const tanggal = u.createdAt
                  ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : '-';
                return (
                  <div key={u.id} className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 hover:border-amber-100 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">
                          {u.pelangganNama.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-ink-900 text-sm">{u.pelangganNama}</p>
                            <span className="text-xs text-ink-400">{tanggal}</span>
                          </div>
                          {/* Menu */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-base">{u.menuEmoji}</span>
                            <span className="text-xs font-semibold text-ink-600">{u.menuNama}</span>
                          </div>
                          {/* Bintang + label */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Bintang nilai={u.bintang} />
                            <span className="text-xs font-bold text-amber-600">{labelBintang[u.bintang]}</span>
                          </div>
                          {/* Komentar */}
                          {u.komentar && (
                            <p className="text-sm text-ink-600 mt-2 leading-relaxed bg-ink-50 rounded-xl px-3 py-2 border border-ink-100">
                              &ldquo;{u.komentar}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Badge bintang besar + tombol hapus */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg ${
                          u.bintang >= 4 ? 'bg-amber-50 text-amber-500' :
                          u.bintang === 3 ? 'bg-brand-50 text-brand-500' :
                          'bg-red-50 text-red-500'
                        }`}>
                          {u.bintang}
                        </div>
                        <button
                          onClick={() => handleHapusUlasan(u.id, u.pelangganNama, u.menuNama)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                          title="Hapus ulasan"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <ModalKonfirmasiHapus state={konfirmasiState} onTutup={tutupKonfirmasi} />
    </div>
  );
}
