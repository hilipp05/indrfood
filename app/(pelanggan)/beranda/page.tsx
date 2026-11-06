  'use client';

  import Link from 'next/link';
  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
  import { db } from '@/lib/firebase';
  import { useKeranjang } from '@/lib/keranjangContext';
  import { useStatusToko } from '@/lib/useStatusToko';

  type MenuItem = {
    id: string;
    nama: string;
    deskripsi: string;
    harga: number;
    emoji: string;
    gambar?: string;
    kategori: string;
    stok: 'Tersedia' | 'Habis';
    unggulan: boolean;
    rataRata?: number;
    jumlahUlasan?: number;
  };

  type KategoriItem = {
    id: string;
    nama: string;
    icon: string;
  };

  const kategoriGradients = [
    'from-orange-400 to-rose-400',
    'from-brand-400 to-brand-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-brand-400 to-brand-500',
    'from-pink-400 to-rose-500',
  ];

  export default function BerandaPage() {
    const { tambah } = useKeranjang();
    const router = useRouter();
    const { isOpen, pesanTutup } = useStatusToko();
    const [menuUnggulan, setMenuUnggulan] = useState<MenuItem[]>([]);
    const [kategoriList, setKategoriList] = useState<KategoriItem[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [ditambah, setDitambah] = useState<string | null>(null);
    const [cari, setCari] = useState('');

    useEffect(() => {
      const q = query(collection(db, 'menu'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
        setMenuUnggulan(all.filter((item) => item.unggulan === true));
        setLoadingMenu(false);
      });
      return () => unsub();
    }, []);

    useEffect(() => {
      const unsub = onSnapshot(collection(db, 'kategori'), (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as KategoriItem));
        setKategoriList(data);
      });
      return () => unsub();
    }, []);

    const handleTambah = (item: MenuItem) => {
      if (item.stok === 'Habis' || !isOpen) return;
      tambah({ id: item.id, nama: item.nama, harga: item.harga, emoji: item.emoji });
      setDitambah(item.id);
      setTimeout(() => setDitambah(null), 1000);
    };

    const handleCari = (e: React.FormEvent) => {
      e.preventDefault();
      if (cari.trim()) {
        router.push(`/menu?cari=${encodeURIComponent(cari.trim())}`);
      }
    };

    return (
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 rounded-3xl overflow-hidden min-h-[260px] md:min-h-[300px] flex items-center" style={{isolation: 'isolate'}}>
          {/* Dekorasi */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-16 right-10 w-64 h-64 bg-brand-400/20 rounded-full" />
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/5 rounded-full" />
          {/* Dots */}
          <div className="absolute top-5 right-5 grid grid-cols-4 gap-1.5 opacity-20 hidden sm:grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
            ))}
          </div>
          {/* Daun dekorasi */}
          <div className="absolute top-3 right-[42%] text-3xl opacity-60 rotate-12 hidden md:block select-none">🌿</div>
          <div className="absolute bottom-4 right-[38%] text-2xl opacity-50 -rotate-12 hidden md:block select-none">🌿</div>

          {/* Konten kiri */}
          <div className="relative z-10 px-6 sm:px-8 md:px-10 py-8 md:py-10 w-full md:w-[52%]">
            <span className={`inline-flex items-center gap-1.5 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4 ${isOpen ? 'bg-white/20' : 'bg-red-500/80'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-200'}`} />
              {isOpen ? 'Buka Sekarang' : 'Sedang Tutup'}
            </span>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3">
              Mau makan apa<br />hari ini? 🍽️
            </h1>

            <p className="text-brand-100 text-sm mb-5 leading-relaxed max-w-xs">
              Pesan makanan favoritmu dengan mudah, cepat, dan langsung diantar ke mejamu.
            </p>

            {/* Search bar */}
            <form onSubmit={handleCari} className="flex gap-2 mb-4 max-w-sm">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 text-brand-300 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari makanan favoritmu..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-ink-800 placeholder:text-ink-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all shadow-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shrink-0 border border-white/20"
              >
                Cari
              </button>
            </form>

            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-sm text-white rounded-xl font-bold text-sm hover:bg-white/25 transition-colors border border-white/30"
            >
              Lihat Semua Menu
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Kanan — foto makanan + badge */}
          <div className="hidden md:block absolute right-0 bottom-0 top-0 w-[48%]">
            {/* Foto makanan nasi ayam dari Unsplash */}
            <div className="absolute inset-0 flex items-end justify-center pb-0 pr-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/beranda.avif"
                alt="Nasi Ayam Goreng"
                className="w-72 h-72 lg:w-80 lg:h-80 object-cover rounded-full drop-shadow-2xl"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.src = "/hero1.webp";
                }}
              />
            </div>

            {/* Badge Gratis Ongkir */}
            <div className="absolute top-6 left-2 bg-white rounded-2xl shadow-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <span className="text-2xl">🛵</span>
              <div>
                <p className="text-xs font-extrabold text-ink-900 leading-none">Gratis Ongkir</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Min. belanja Rp 20.000</p>
              </div>
            </div>

            {/* Badge 30 Menit */}
            <div className="absolute bottom-6 left-2 bg-white rounded-2xl shadow-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="text-xs font-extrabold text-ink-900 leading-none">30 Menit Sampai</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Rata-rata pengantaran</p>
              </div>
            </div>

            {/* Dots dekorasi */}
            <div className="absolute top-4 right-4 grid grid-cols-4 gap-1.5 opacity-30">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
              ))}
            </div>

            {/* Daun dekorasi */}
            <div className="absolute top-8 right-16 text-3xl opacity-70 rotate-12 select-none">🌿</div>
          </div>
        </div>

        {/* Kategori */}
        {kategoriList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-ink-900">Kategori</h2>
              <Link href="/menu" className="text-sm text-brand-600 font-semibold hover:underline underline-offset-2">
                Lihat Semua →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              <Link
                href="/menu"
                className="flex-shrink-0 flex flex-col items-center gap-2 w-20"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-ink-400 to-ink-500 rounded-2xl flex items-center justify-center text-2xl shadow-md shadow-ink-200 hover:scale-105 transition-transform">
                  🍽️
                </div>
                <span className="text-xs font-semibold text-ink-600 text-center">Semua</span>
              </Link>
              {kategoriList.map((k, i) => (
                <Link
                  key={k.id}
                  href={`/menu?kategori=${encodeURIComponent(k.nama)}`}
                  className="flex-shrink-0 flex flex-col items-center gap-2 w-20"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${kategoriGradients[i % kategoriGradients.length]} rounded-2xl flex items-center justify-center text-2xl shadow-md hover:scale-105 transition-transform`}>
                    {k.icon}
                  </div>
                  <span className="text-xs font-semibold text-ink-600 text-center leading-tight">{k.nama}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Promo Banner */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 rounded-2xl overflow-hidden relative">
          {/* Dekorasi lingkaran */}
          <div className="absolute right-[30%] -top-6 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute right-[28%] -bottom-8 w-28 h-28 bg-white/10 rounded-full" />
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-brand-400/30 rounded-full" />
          <div className="absolute -right-2 -bottom-6 w-40 h-40 bg-brand-300/20 rounded-full" />

          {/* Dekorasi bintang/confetti */}
          <div className="absolute top-3 left-[38%] text-yellow-300 text-xs opacity-70 select-none">✦</div>
          <div className="absolute bottom-4 left-[42%] text-yellow-200 text-[10px] opacity-60 select-none">✦</div>
          <div className="absolute top-5 right-[22%] text-orange-300 text-xs opacity-60 select-none rotate-45">◆</div>

          <div className="flex items-center justify-between px-5 sm:px-7 py-5 relative z-10 gap-4">

            {/* Kiri — teks */}
            <div className="shrink-0">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Promo Spesial</p>
              <p className="text-white font-extrabold text-lg sm:text-xl leading-tight">
                Gratis Ongkir<br />Semua Pesanan!
              </p>
              <Link
                href="/menu"
                className="inline-block mt-3 px-4 py-1.5 bg-white text-brand-600 rounded-lg text-xs font-bold hover:bg-brand-50 transition-colors shadow-sm"
              >
                Pesan Sekarang
              </Link>
            </div>

            {/* Tengah — kartu kode promo (hidden di mobile kecil) */}
            <div className="hidden sm:flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-3 shrink-0">
              {/* Tiket notch kiri */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">🍽️</div>
              </div>
              <div className="w-px h-10 bg-white/30 border-dashed border-l border-white/40" />
              <div>
                <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Kode Promo</p>
                <p className="text-white font-extrabold text-base tracking-wider leading-tight">INDRIFOOD</p>
                <p className="text-white/70 text-[10px] mt-0.5">Berlaku hari ini</p>
              </div>
            </div>

            {/* Kanan — ilustrasi kurir */}
            <div className="shrink-0 text-5xl sm:text-6xl select-none relative">
              {/* Lingkaran background kurir */}
              <div className="absolute inset-0 -m-3 bg-brand-400/20 rounded-full" />
              <span className="relative z-10">🛵</span>
            </div>
          </div>
        </div>

        {/* Menu Unggulan */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink-900">Menu Unggulan</h2>
              <p className="text-xs text-ink-400 mt-0.5">Pilihan terpopuler pelanggan kami</p>
            </div>
            <Link href="/menu" className="text-sm text-brand-600 font-semibold hover:underline underline-offset-2">
              Lihat Semua →
            </Link>
          </div>

          {loadingMenu && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-ink-100 overflow-hidden flex animate-pulse">
                  <div className="w-28 bg-ink-100 flex-shrink-0" />
                  <div className="p-4 flex-1 space-y-2">
                    <div className="h-3 bg-ink-100 rounded-full w-16" />
                    <div className="h-4 bg-ink-100 rounded-full w-3/4" />
                    <div className="h-3 bg-ink-100 rounded-full w-full" />
                    <div className="h-3 bg-ink-100 rounded-full w-2/3" />
                    <div className="flex justify-between items-center pt-1">
                      <div className="h-4 bg-ink-100 rounded-full w-20" />
                      <div className="h-7 w-16 bg-ink-100 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingMenu && menuUnggulan.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-ink-100">
              <span className="text-4xl">🍽️</span>
              <p className="mt-2 text-sm font-semibold text-ink-500">Belum ada menu unggulan.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuUnggulan.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-200 flex ${
                  item.stok === 'Habis' ? 'opacity-70 border-ink-100' : 'border-ink-100 hover:border-brand-100 hover:-translate-y-0.5'
                }`}
              >
                {/* Emoji area */}
                <div className="w-28 flex-shrink-0 relative overflow-hidden">
                  {item.gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.gambar} alt={item.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-5xl">
                      {item.emoji}
                    </div>
                  )}
                  {item.stok === 'Habis' && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Habis</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {item.kategori}
                    </span>
                    <p className="font-bold text-ink-900 text-sm mt-1.5 leading-tight">{item.nama}</p>
                    {item.rataRata && item.jumlahUlasan ? (
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map((i) => (
                          <svg key={i} className={`w-3 h-3 ${i <= Math.round(item.rataRata!) ? 'text-amber-400' : 'text-ink-200'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                        <span className="text-[10px] text-ink-400 ml-1">({item.jumlahUlasan})</span>
                      </div>
                    ) : null}
                    <p className="text-ink-400 text-xs mt-1 line-clamp-2 leading-relaxed">{item.deskripsi}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="font-extrabold text-brand-700 text-base">
                        Rp {item.harga.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTambah(item)}
                      disabled={item.stok === 'Habis' || !isOpen}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        ditambah === item.id
                          ? 'bg-green-500 text-white scale-95'
                          : item.stok === 'Habis' || !isOpen
                          ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                          : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                      }`}
                    >
                      {ditambah === item.id ? (
                        <>✓ Ditambah</>
                      ) : !isOpen ? (
                        <>Tutup</>
                      ) : (
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
        </div>

        {/* CTA Bottom */}
        <div className="bg-gradient-to-r from-ink-900 via-brand-800 to-ink-900 rounded-2xl overflow-hidden relative">
          {/* Ikon makanan samar di background */}
          <div className="absolute inset-0 opacity-[0.12] pointer-events-none select-none">
            <div className="absolute top-3 left-6 text-4xl">🍜</div>
            <div className="absolute top-2 left-24 text-3xl">🍰</div>
            <div className="absolute bottom-3 left-10 text-3xl">🍗</div>
            <div className="absolute bottom-2 left-36 text-4xl">🍕</div>
            <div className="absolute top-3 right-[38%] text-3xl">🥗</div>
            <div className="absolute bottom-3 right-[40%] text-3xl">🍱</div>
          </div>

          <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 gap-4">

            {/* Teks + tombol — tengah */}
            <div className="flex-1 text-center">
              <p className="text-white font-extrabold text-xl sm:text-2xl mb-1 drop-shadow-sm">
                Lapar? Pesan Sekarang! 😄
              </p>
              <p className="text-brand-200 text-sm mb-4">Ratusan menu lezat menunggumu</p>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
              >
                Jelajahi Menu Lengkap
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Ilustrasi makanan kanan — hidden di mobile */}
            <div className="hidden sm:flex items-end gap-2 shrink-0 select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/beranda%201.avif"
                alt="menu"
                className="w-24 h-24 object-cover rounded-full shadow-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-ink-100 pt-8 pb-4 mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-6">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                  <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
                </div>
                <span className="font-extrabold text-ink-900 text-base">IndriFood</span>
              </div>
              <p className="text-ink-400 text-xs leading-relaxed">
                Makanan enak, harga pas,<br />antar cepat, hati puas.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/philipp_srgr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 bg-ink-100 hover:bg-pink-100 text-pink-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/1Y7HJ9Wmo9/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 bg-ink-100 hover:bg-brand-100 text-brand-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@ph_dq"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-8 h-8 bg-ink-100 hover:bg-ink-200 text-ink-800 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Perusahaan */}
            <div>
              <h5 className="font-extrabold text-ink-900 text-sm mb-3">Perusahaan</h5>
              <ul className="space-y-2">
                {[
                  { label: "Tentang Kami", href: "/" },
                  { label: "Karir", href: "/" },
                  { label: "Blog", href: "/" },
                  { label: "Kontak", href: "/" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-ink-400 text-xs hover:text-brand-600 transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bantuan */}
            <div>
              <h5 className="font-extrabold text-ink-900 text-sm mb-3">Bantuan</h5>
              <ul className="space-y-2">
                {[
                  { label: "FAQ", href: "/#faq" },
                  { label: "Syarat & Ketentuan", href: "/#faq" },
                  { label: "Kebijakan Privasi", href: "/#faq" },
                  { label: "Panduan", href: "/#cara-pesan" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-ink-400 text-xs hover:text-brand-600 transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Layanan */}
            <div>
              <h5 className="font-extrabold text-ink-900 text-sm mb-3">Layanan</h5>
              <ul className="space-y-2">
                {[
                  { label: "Cara Pemesanan", href: "/#cara-pesan" },
                  { label: "Metode Pembayaran", href: "/#faq" },
                  { label: "Pengembalian Dana", href: "/#faq" },
                  { label: "Bantuan Pelanggan", href: "/#faq" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-ink-400 text-xs hover:text-brand-600 transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-ink-100 pt-4 text-center">
            <p className="text-ink-400 text-xs">© 2025 IndriFood. Semua hak dilindungi.</p>
          </div>
        </footer>

      </div>
    );
  }
