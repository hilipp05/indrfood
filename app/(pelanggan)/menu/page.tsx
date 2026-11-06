'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useKeranjang } from '@/lib/keranjangContext';
import { useToast } from '@/lib/useToast';
import { useStatusToko } from '@/lib/useStatusToko';

type MenuItem = {
  id: string;
  nama: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  stok: 'Tersedia' | 'Habis';
  emoji: string;
  gambar?: string;
  rataRata?: number;
  jumlahUlasan?: number;
};

type KategoriItem = {
  id: string;
  nama: string;
  icon: string;
};

const cardGradients = [
  'from-brand-50 to-brand-100',
  'from-brand-50 to-brand-100',
  'from-emerald-50 to-teal-100',
  'from-amber-50 to-orange-100',
  'from-rose-50 to-pink-100',
  'from-cyan-50 to-brand-100',
];

// ── Komponen Rating Bintang ──────────────────────────────────
function RatingBintang({ rata, jumlah, size = 'sm' }: { rata: number; jumlah: number; size?: 'sm' | 'xs' }) {
  if (!rata || !jumlah) return null;
  const bintangPenuh = Math.floor(rata);
  const adaSetengah = rata - bintangPenuh >= 0.5;
  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`${iconSize} ${i <= bintangPenuh ? 'text-amber-400' : i === bintangPenuh + 1 && adaSetengah ? 'text-amber-300' : 'text-ink-200'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className={`font-bold text-ink-500 ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
        {rata.toFixed(1)} <span className="font-normal text-ink-400">({jumlah})</span>
      </span>
    </div>
  );
}

// ── Modal Detail Menu ────────────────────────────────────────
function DetailMenuModal({ item, onTutup, onPesan, ditambah, tokoTutup }: {
  item: MenuItem;
  onTutup: () => void;
  onPesan: (item: MenuItem) => void;
  ditambah: boolean;
  tokoTutup: boolean;
}) {
  const [ulasan, setUlasan] = useState<{ id: string; pelangganNama: string; bintang: number; komentar: string; createdAt: { seconds: number } | null }[]>([]);
  const [loadingUlasan, setLoadingUlasan] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTutup]);

  useEffect(() => {
    setLoadingUlasan(true);
    getDocs(query(collection(db, 'ulasan'), where('menuNama', '==', item.nama), orderBy('createdAt', 'desc')))
      .then((snap) => {
        setUlasan(snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; pelangganNama: string; bintang: number; komentar: string; createdAt: { seconds: number } | null })));
        setLoadingUlasan(false);
      })
      .catch(() => setLoadingUlasan(false));
  }, [item.nama]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onTutup}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Foto / Emoji */}
        <div className={`relative w-full h-56 sm:h-64 ${item.gambar ? '' : 'bg-gradient-to-br from-brand-50 to-brand-100'} flex items-center justify-center overflow-hidden`}>
          {item.gambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.gambar} alt={item.nama} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl">{item.emoji}</span>
          )}
          {item.gambar && <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />}
          {item.stok === 'Habis' && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-full text-sm shadow">Stok Habis</span>
            </div>
          )}
          {/* Tombol tutup */}
          <button
            onClick={onTutup}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Kategori badge */}
          <span className="absolute bottom-3 left-3 text-xs font-bold bg-white/90 text-ink-700 px-2.5 py-1 rounded-full shadow-sm">
            {item.kategori}
          </span>
        </div>

        {/* Info */}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink-900 leading-tight">{item.nama}</h2>
            {item.rataRata && item.jumlahUlasan ? (
              <div className="mt-1.5">
                <RatingBintang rata={item.rataRata} jumlah={item.jumlahUlasan} />
              </div>
            ) : null}
            {item.deskripsi ? (
              <p className="text-ink-500 text-sm mt-2 leading-relaxed">{item.deskripsi}</p>
            ) : (
              <p className="text-ink-300 text-sm mt-2 italic">Tidak ada deskripsi</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-ink-100">
            <div>
              <p className="text-xs text-ink-400 font-medium">Harga</p>
              <p className="text-2xl font-extrabold text-brand-700">
                Rp {item.harga.toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => onPesan(item)}
              disabled={item.stok === 'Habis' || tokoTutup}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                ditambah
                  ? 'bg-green-500 text-white scale-95'
                  : item.stok === 'Habis' || tokoTutup
                  ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg'
              }`}
            >
              {ditambah ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Ditambah!
                </>
              ) : item.stok === 'Habis' ? 'Stok Habis' : tokoTutup ? 'Toko Tutup' : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah ke Keranjang
                </>
              )}
            </button>
          </div>

          {/* Ulasan pelanggan */}
          <div className="pt-3 border-t border-ink-100">
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">
              Ulasan ({ulasan.length})
            </p>
            {loadingUlasan ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ulasan.length === 0 ? (
              <p className="text-xs text-ink-400 text-center py-3">Belum ada ulasan untuk menu ini</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {ulasan.map((u) => (
                  <div key={u.id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-500 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                      {u.pelangganNama.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-ink-800">{u.pelangganNama}</p>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((i) => (
                            <svg key={i} className={`w-2.5 h-2.5 ${i <= u.bintang ? 'text-amber-400' : 'text-ink-200'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {u.komentar && (
                        <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{u.komentar}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuContent() {
  const { tambah } = useKeranjang();
  const { tampilkan } = useToast();
  const { isOpen, pesanTutup } = useStatusToko();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aktifKategori, setAktifKategori] = useState('Semua');
  const [cari, setCari] = useState('');
  const [ditambah, setDitambah] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const k = searchParams.get('kategori');
    if (k) setAktifKategori(k);
    const c = searchParams.get('cari');
    if (c) setCari(c);
  }, [searchParams]);

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kategori'), (snap) => {
      setKategoriList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as KategoriItem)));
    });
    return () => unsub();
  }, []);

  const filtered = items
    .filter((m) => aktifKategori === 'Semua' || m.kategori === aktifKategori)
    .filter((m) =>
      cari === '' ||
      m.nama.toLowerCase().includes(cari.toLowerCase()) ||
      m.deskripsi.toLowerCase().includes(cari.toLowerCase())
    );

  const handleTambah = (item: MenuItem) => {
    if (item.stok === 'Habis' || !isOpen) return;
    tambah({ id: item.id, nama: item.nama, harga: item.harga, emoji: item.emoji });
    setDitambah(item.id);
    tampilkan(`${item.emoji} ${item.nama} ditambahkan ke keranjang`, 'success');
    setTimeout(() => setDitambah(null), 1000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 bg-ink-200 rounded-full w-32 animate-pulse" />
          <div className="h-4 bg-ink-100 rounded-full w-24 mt-2 animate-pulse" />
        </div>
        {/* Search skeleton */}
        <div className="h-12 bg-ink-100 rounded-2xl animate-pulse" />
        {/* Filter skeleton */}
        <div className="flex gap-2">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-9 w-20 bg-ink-100 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-ink-100 overflow-hidden animate-pulse">
              <div className="h-36 bg-ink-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-ink-100 rounded-full w-3/4" />
                <div className="h-3 bg-ink-100 rounded-full w-full" />
                <div className="h-3 bg-ink-100 rounded-full w-2/3" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-5 bg-ink-100 rounded-full w-24" />
                  <div className="h-8 w-20 bg-ink-100 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Menu Kami</h2>
          <p className="text-ink-400 text-sm mt-0.5">{filtered.length} menu tersedia</p>
        </div>
        {aktifKategori !== 'Semua' && (
          <button
            onClick={() => setAktifKategori('Semua')}
            className="text-xs text-brand-600 font-semibold hover:underline underline-offset-2"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Pencarian */}
      <div className="relative">
        <svg className="w-4 h-4 text-ink-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cari menu favorit kamu..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all shadow-sm"
        />
        {cari && (
          <button
            onClick={() => setCari('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-ink-200 hover:bg-ink-300 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-3 h-3 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter kategori */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setAktifKategori('Semua')}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            aktifKategori === 'Semua'
              ? 'bg-brand-600 text-white shadow-md'
              : 'bg-white text-ink-500 border border-ink-200 hover:border-brand-300 hover:text-brand-600'
          }`}
        >
          🍽️ Semua
        </button>
        {kategoriList.map((k) => (
          <button
            key={k.id}
            onClick={() => setAktifKategori(k.nama)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              aktifKategori === k.nama
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-ink-500 border border-ink-200 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {k.icon} {k.nama}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-ink-100 shadow-sm">
          <span className="text-5xl">🔍</span>
          <p className="mt-3 font-bold text-ink-700">
            {cari ? `Tidak ada menu untuk "${cari}"` : 'Tidak ada menu tersedia'}
          </p>
          <p className="text-ink-400 text-sm mt-1">Coba kata kunci lain atau pilih kategori berbeda</p>
          {cari && (
            <button onClick={() => setCari('')} className="mt-4 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-sm font-semibold hover:bg-brand-100 transition-colors">
              Hapus pencarian
            </button>
          )}
        </div>
      )}

      {/* Grid menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
              item.stok === 'Habis'
                ? 'opacity-60 border-ink-100'
                : 'border-ink-100 hover:border-brand-100 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {/* Image area — klik untuk detail */}
            <div
              className={`h-36 relative overflow-hidden cursor-pointer ${item.gambar ? '' : `bg-gradient-to-br ${cardGradients[idx % cardGradients.length]}`} flex items-center justify-center`}
              onClick={() => setDetailItem(item)}
            >
              {item.gambar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.gambar} alt={item.nama} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{item.emoji}</span>
              )}
              {item.gambar && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              )}
              {item.stok === 'Habis' && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">Habis</span>
                </div>
              )}
              <span className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.gambar ? 'bg-white/90 text-ink-700' : 'bg-white/80 backdrop-blur-sm text-ink-700'}`}>
                {item.kategori}
              </span>
              {/* Detail hint */}
              {item.stok !== 'Habis' && (
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-black/30 text-white px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100">
                  Lihat detail
                </span>
              )}
            </div>

            <div className="p-4">
              <button
                className="font-bold text-ink-900 text-sm leading-tight text-left hover:text-brand-600 transition-colors w-full"
                onClick={() => setDetailItem(item)}
              >
                {item.nama}
              </button>
              {item.rataRata && item.jumlahUlasan ? (
                <div className="mt-1">
                  <RatingBintang rata={item.rataRata} jumlah={item.jumlahUlasan} size="xs" />
                </div>
              ) : null}
              <p className="text-ink-400 text-xs mt-1 line-clamp-2 leading-relaxed">{item.deskripsi}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-50">
                <span className="font-extrabold text-brand-700 text-base">
                  Rp {item.harga.toLocaleString('id-ID')}
                </span>
                <button
                  onClick={() => handleTambah(item)}
                  disabled={item.stok === 'Habis' || !isOpen}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ditambah === item.id
                      ? 'bg-green-500 text-white scale-95'
                      : item.stok === 'Habis' || !isOpen
                      ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                  }`}
                >
                  {ditambah === item.id ? (
                    <>✓ Ditambah</>
                  ) : item.stok === 'Habis' ? 'Habis' : !isOpen ? 'Tutup' : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                      Pesan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detail menu */}
      {detailItem && (
        <DetailMenuModal
          item={detailItem}
          onTutup={() => setDetailItem(null)}
          onPesan={(item) => {
            handleTambah(item);
            setTimeout(() => setDetailItem(null), 800);
          }}
          ditambah={ditambah === detailItem.id}
          tokoTutup={!isOpen}
        />
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
