'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/lib/useToast';
import { useKeranjang } from '@/lib/keranjangContext';
import StrukPembayaran from './StrukPembayaran';
import RatingModal from './RatingModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ItemPesanan = { nama: string; qty: number; harga: number; emoji: string };
type Pesanan = {
  id: string;
  pelangganId: string;
  pelangganNama: string;
  pelangganEmail: string;
  items: ItemPesanan[];
  total: number;
  status: 'Baru' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Dibatalkan' | 'Pengajuan Batal';
  tipeOrder?: 'dine-in' | 'delivery';
  metodeBayar?: 'tunai' | 'kredit' | 'transfer';
  transferDikonfirmasi?: boolean;
  nomorMeja?: string;
  alamat?: string;
  estimasiMenit?: number;
  estimasiDitetapkanAt?: { seconds: number };
  sudahDirating?: boolean;
  createdAt: { seconds: number } | null;
};

type FilterStatus = 'Semua' | 'Aktif' | 'Selesai' | 'Dibatalkan';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Baru:             { bg: 'bg-brand-50',    text: 'text-brand-700',    dot: 'bg-brand-500' },
  Diproses:         { bg: 'bg-brand-50',   text: 'text-brand-700',   dot: 'bg-brand-500' },
  Dikirim:          { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  Selesai:          { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  Dibatalkan:       { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-500' },
  'Pengajuan Batal':{ bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const pesanNotif: Record<string, { pesan: string; tipe: 'info' | 'success' | 'warning' | 'error' }> = {
  Diproses: { pesan: '👨‍🍳 Pesananmu sedang diproses!', tipe: 'info' },
  Dikirim:  { pesan: '🛵 Pesananmu sedang dalam perjalanan!', tipe: 'info' },
  Selesai:  { pesan: '✅ Pesananmu telah selesai. Terima kasih!', tipe: 'success' },
  Dibatalkan: { pesan: '❌ Pesananmu telah dibatalkan.', tipe: 'error' },
};

export default function PesananSayaPage() {
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [membatalkan, setMembatalkan] = useState<string | null>(null);
  const [mengkonfirmasi, setMengkonfirmasi] = useState<string | null>(null);
  const [modalKonfirmasiId, setModalKonfirmasiId] = useState<string | null>(null);
  const [struk, setStruk] = useState<Pesanan | null>(null);
  const [ratingPesanan, setRatingPesanan] = useState<Pesanan | null>(null);
  const [modalBatalId, setModalBatalId] = useState<string | null>(null);
  const [alasanBatal, setAlasanBatal] = useState('');
  const [errorAlasan, setErrorAlasan] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Semua');
  const [halaman, setHalaman] = useState(1);
  const PER_PAGE = 5;
  const [waktuSekarang, setWaktuSekarang] = useState(Date.now());
  const { pesanLagi } = useKeranjang();
  const { tampilkan } = useToast();
  const router = useRouter();
  const statusTerakhir = useRef<Map<string, string>>(new Map());
  const sudahInit = useRef(false);

  // Tick setiap detik untuk countdown estimasi
  useEffect(() => {
    const interval = setInterval(() => setWaktuSekarang(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset halaman saat filter berubah
  useEffect(() => { setHalaman(1); }, [filterStatus]);

  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      statusTerakhir.current = new Map();
      sudahInit.current = false;

      if (!user) { setLoading(false); return; }

      const q = query(collection(db, 'pesanan'), where('pelangganId', '==', user.uid));

      unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Pesanan))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

        // Hanya update data — notif/suara/toast ditangani oleh useNotifPelanggan
        data.forEach((p) => statusTerakhir.current.set(p.id, p.status));
        sudahInit.current = true;

        setPesanan(data);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  const handleBatalkan = (id: string) => {
    setAlasanBatal('');
    setErrorAlasan('');
    setModalBatalId(id);
  };

  const handleKirimPengajuan = async () => {
    if (!alasanBatal.trim()) { setErrorAlasan('Alasan pembatalan wajib diisi.'); return; }
    if (!modalBatalId) return;
    setMembatalkan(modalBatalId);
    await updateDoc(doc(db, 'pesanan', modalBatalId), {
      status: 'Pengajuan Batal',
      alasanBatal: alasanBatal.trim(),
    });
    setMembatalkan(null);
    setModalBatalId(null);
    setAlasanBatal('');
    tampilkan('Pengajuan pembatalan terkirim ke admin.', 'warning');
  };

  const handleKonfirmasi = async (p: Pesanan) => {
    setModalKonfirmasiId(p.id);
  };

  const handleKonfirmasiYa = async (p: Pesanan) => {
    setModalKonfirmasiId(null);
    setMengkonfirmasi(p.id);
    try {
      await updateDoc(doc(db, 'pesanan', p.id), { status: 'Selesai' });
      const laporanRef = doc(db, 'laporan', p.id);
      const laporanSnap = await getDoc(laporanRef);
      if (!laporanSnap.exists()) {
        await setDoc(laporanRef, {
          pesananId: p.id,
          pelangganNama: p.pelangganNama || '-',
          pelangganEmail: p.pelangganEmail || '-',
          items: p.items,
          total: p.total,
          createdAt: p.createdAt,
          selesaiAt: serverTimestamp(),
        });
      }
      // Tawarkan rating setelah konfirmasi
      setRatingPesanan({ ...p, status: 'Selesai' });
    } finally {
      setMengkonfirmasi(null);
    }
  };

  const handlePesanLagi = async (p: Pesanan) => {
    // Ambil ID asli dari Firestore berdasarkan nama menu
    const { collection: col, getDocs: gd, query: q2, where: w } = await import('firebase/firestore');
    const itemsWithId = await Promise.all(
      p.items.map(async (item) => {
        try {
          const snap = await gd(q2(col(db, 'menu'), w('nama', '==', item.nama)));
          const menuId = snap.empty ? `fallback_${item.nama.replace(/\s+/g, '_').toLowerCase()}` : snap.docs[0].id;
          return { id: menuId, nama: item.nama, harga: item.harga, emoji: item.emoji };
        } catch {
          return { id: `fallback_${item.nama.replace(/\s+/g, '_').toLowerCase()}`, nama: item.nama, harga: item.harga, emoji: item.emoji };
        }
      })
    );
    pesanLagi(itemsWithId);
    tampilkan(`🛒 ${p.items.length} item ditambahkan ke keranjang`, 'success');
    router.push('/keranjang');
  };

  // Hitung sisa waktu estimasi dalam detik
  const hitungSisaDetik = (p: Pesanan): number | null => {
    if (!p.estimasiMenit || !p.estimasiDitetapkanAt) return null;
    const selesaiMs = p.estimasiDitetapkanAt.seconds * 1000 + p.estimasiMenit * 60 * 1000;
    const sisaMs = selesaiMs - waktuSekarang;
    return sisaMs > 0 ? Math.floor(sisaMs / 1000) : 0;
  };

  const formatSisa = (detik: number): string => {
    if (detik <= 0) return 'Sebentar lagi siap!';
    const m = Math.floor(detik / 60);
    const s = detik % 60;
    if (m === 0) return `${s} detik lagi`;
    return `${m} menit ${s} detik lagi`;
  };

  // Filter pesanan berdasarkan tab
  const statusAktif = ['Baru', 'Diproses', 'Dikirim', 'Pengajuan Batal'];
  const pesananFiltered = pesanan.filter((p) => {
    if (filterStatus === 'Aktif') return statusAktif.includes(p.status);
    if (filterStatus === 'Selesai') return p.status === 'Selesai';
    if (filterStatus === 'Dibatalkan') return p.status === 'Dibatalkan';
    return true;
  });

  const countAktif = pesanan.filter((p) => statusAktif.includes(p.status)).length;

  // Pagination
  const totalHalaman = Math.max(1, Math.ceil(pesananFiltered.length / PER_PAGE));
  const halamanAman = Math.min(halaman, totalHalaman);
  const pesananHalaman = pesananFiltered.slice((halamanAman - 1) * PER_PAGE, halamanAman * PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pesanan.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Pesanan Saya</h2>
          <p className="text-ink-400 text-sm mt-0.5">Riwayat semua pesananmu</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-100 p-14 flex flex-col items-center text-center shadow-sm">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center text-4xl mb-4">📦</div>
          <p className="font-bold text-ink-800 text-lg">Belum ada pesanan</p>
          <p className="text-ink-400 text-sm mt-1">Yuk pesan makanan favoritmu!</p>
          <Link href="/menu" className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-md">
            Lihat Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-ink-900">Pesanan Saya</h2>
        <p className="text-ink-400 text-sm mt-0.5">{pesanan.length} total pesanan</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(['Semua', 'Aktif', 'Selesai', 'Dibatalkan'] as FilterStatus[]).map((f) => {
          const count = f === 'Semua' ? pesanan.length
            : f === 'Aktif' ? countAktif
            : pesanan.filter((p) => p.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterStatus === f
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white text-ink-500 border border-ink-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {f}
              {count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  filterStatus === f ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty filtered */}
      {pesananFiltered.length === 0 && (
        <div className="bg-white rounded-2xl border border-ink-100 p-10 text-center shadow-sm">
          <span className="text-4xl">📭</span>
          <p className="mt-2 font-bold text-ink-700 text-sm">
            Tidak ada pesanan {filterStatus === 'Aktif' ? 'yang sedang aktif' : filterStatus === 'Selesai' ? 'yang selesai' : 'yang dibatalkan'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {pesananHalaman.map((p) => {
          const tanggal = p.createdAt
            ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-';
          const sc = statusColors[p.status] ?? { bg: 'bg-ink-50', text: 'text-ink-600', dot: 'bg-ink-400' };

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-ink-100 overflow-hidden hover:border-brand-100 transition-colors shadow-sm">
              {/* Header */}
              <div className="px-5 py-4 border-b border-ink-50 flex items-center justify-between bg-ink-50/30">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-mono text-brand-600 font-bold">#{p.id.slice(0, 8).toUpperCase()}</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">{tanggal}</p>
                  {p.tipeOrder === 'dine-in' && p.nomorMeja && (
                    <p className="text-xs text-brand-500 font-semibold mt-0.5">🍽️ Meja {p.nomorMeja}</p>
                  )}
                  {p.tipeOrder === 'delivery' && p.alamat && (
                    <p className="text-xs text-brand-500 font-semibold mt-0.5">🛵 {p.alamat}</p>
                  )}
                  {p.metodeBayar && (
                    <p className="text-xs font-semibold mt-0.5">
                      {p.metodeBayar === 'tunai' && <span className="text-ink-500">💵 Tunai</span>}
                      {p.metodeBayar === 'kredit' && <span className="text-brand-500">💳 Kartu Kredit/Debit</span>}
                      {p.metodeBayar === 'transfer' && (
                        <span className={p.transferDikonfirmasi ? 'text-green-600' : 'text-amber-600'}>
                          🏦 Transfer · {p.transferDikonfirmasi ? 'Lunas' : 'Menunggu Konfirmasi Admin'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-brand-700 text-base">Rp {p.total.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-ink-400">{p.items.length} item</p>
                </div>
              </div>

              {/* Items */}
              <div className="px-5 py-3 space-y-2.5">
                {p.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {item.emoji}
                    </div>
                    <span className="flex-1 text-sm text-ink-700 font-medium">{item.nama}</span>
                    <span className="text-xs text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full">×{item.qty}</span>
                    <span className="text-sm font-semibold text-ink-800">
                      Rp {(item.harga * item.qty).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {(p.status === 'Baru' || p.status === 'Diproses' || p.status === 'Pengajuan Batal' || p.status === 'Dikirim' || p.status === 'Selesai') && (
                <div className="px-5 pb-4 pt-1 space-y-2">
                  {/* Estimasi waktu (saat Diproses) */}
                  {p.status === 'Diproses' && (() => {
                    const sisa = hitungSisaDetik(p);
                    if (sisa === null) return null;
                    const persen = (() => {
                      if (!p.estimasiMenit || !p.estimasiDitetapkanAt) return 0;
                      const total = p.estimasiMenit * 60;
                      const terpakai = total - sisa;
                      return Math.min(100, Math.round((terpakai / total) * 100));
                    })();
                    return (
                      <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">👨‍🍳</span>
                            <p className="text-xs font-bold text-brand-700">Estimasi Waktu Siap</p>
                          </div>
                          <p className="text-xs font-extrabold text-brand-700">{formatSisa(sisa)}</p>
                        </div>
                        <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-1000"
                            style={{ width: `${persen}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {p.status === 'Baru' && (
                    <button
                      onClick={() => handleBatalkan(p.id)}
                      disabled={membatalkan === p.id}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-100"
                    >
                      {membatalkan === p.id ? 'Mengajukan...' : 'Ajukan Pembatalan'}
                    </button>
                  )}
                  {p.status === 'Pengajuan Batal' && (
                    <div className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 text-center">
                      ⏳ Menunggu keputusan admin
                    </div>
                  )}
                  {p.status === 'Dikirim' && (
                    <button
                      onClick={() => handleKonfirmasi(p)}
                      disabled={mengkonfirmasi === p.id}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 border border-green-100 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {mengkonfirmasi === p.id ? 'Mengkonfirmasi...' : 'Pesanan Sudah Diterima'}
                    </button>
                  )}
                  {p.status === 'Selesai' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStruk(p)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors border border-brand-100 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Struk
                      </button>
                      {!p.sudahDirating && (
                        <button
                          onClick={() => setRatingPesanan(p)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100 flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Beri Ulasan
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pesan Lagi — tampil di semua status selesai/dibatalkan */}
                  {(['Selesai', 'Dibatalkan'] as const).includes(p.status) && (
                    <button
                      onClick={() => handlePesanLagi(p)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-ink-700 bg-ink-50 hover:bg-ink-100 transition-colors border border-ink-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Pesan Lagi
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalHalaman > 1 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-ink-400 font-medium">
            Menampilkan {((halamanAman - 1) * PER_PAGE) + 1}–{Math.min(halamanAman * PER_PAGE, pesananFiltered.length)} dari {pesananFiltered.length} pesanan
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setHalaman((h) => Math.max(1, h - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={halamanAman === 1}
              className="w-9 h-9 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-ink-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: totalHalaman }, (_, i) => i + 1)
              .filter((pg) => pg === 1 || pg === totalHalaman || Math.abs(pg - halamanAman) <= 1)
              .reduce<(number | '...')[]>((acc, pg, idx, arr) => {
                if (idx > 0 && (pg as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(pg);
                return acc;
              }, [])
              .map((pg, i) =>
                pg === '...' ? (
                  <span key={`el-${i}`} className="w-8 text-center text-ink-400 text-xs">…</span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => { setHalaman(pg as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      halamanAman === pg
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}
            <button
              onClick={() => { setHalaman((h) => Math.min(totalHalaman, h + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={halamanAman === totalHalaman}
              className="w-9 h-9 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-ink-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal konfirmasi pesanan diterima */}
      {modalKonfirmasiId && (() => {
        const p = pesanan.find((x) => x.id === modalKonfirmasiId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
                <h3 className="font-extrabold text-ink-900">Konfirmasi Pesanan Diterima?</h3>
                <p className="text-ink-500 text-sm mt-1.5 leading-relaxed">
                  Pastikan kamu sudah menerima semua item pesananmu sebelum mengkonfirmasi.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleKonfirmasiYa(p)}
                  disabled={mengkonfirmasi === p.id}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                >
                  {mengkonfirmasi === p.id ? 'Mengkonfirmasi...' : 'Ya, Sudah Diterima'}
                </button>
                <button
                  onClick={() => setModalKonfirmasiId(null)}
                  className="flex-1 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal struk */}
      {struk && <StrukPembayaran pesanan={struk} onTutup={() => setStruk(null)} />}

      {/* Modal rating */}
      {ratingPesanan && (
        <RatingModal
          pesananId={ratingPesanan.id}
          pelangganId={ratingPesanan.pelangganId}
          pelangganNama={ratingPesanan.pelangganNama}
          items={ratingPesanan.items}
          onTutup={() => setRatingPesanan(null)}
          onSelesai={() => {
            setRatingPesanan(null);
            tampilkan('⭐ Terima kasih atas ulasanmu!', 'success');
          }}
        />
      )}

      {/* Modal pengajuan batal */}
      {modalBatalId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">⚠️</div>
              <h3 className="font-extrabold text-ink-900">Ajukan Pembatalan</h3>
              <p className="text-ink-500 text-sm mt-1">Admin akan memproses permintaanmu. Berikan alasan yang jelas.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Alasan Pembatalan</label>
              <textarea
                value={alasanBatal}
                onChange={(e) => { setAlasanBatal(e.target.value); setErrorAlasan(''); }}
                placeholder="Contoh: Tidak sengaja memesan, salah pilih menu, dll."
                rows={3}
                className="w-full mt-1.5 px-4 py-3 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 outline-none transition-all resize-none"
              />
              {errorAlasan && <p className="text-red-500 text-xs mt-1 font-medium">{errorAlasan}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleKirimPengajuan}
                disabled={membatalkan === modalBatalId}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
              >
                {membatalkan === modalBatalId ? 'Mengajukan...' : 'Kirim Pengajuan'}
              </button>
              <button
                onClick={() => setModalBatalId(null)}
                className="flex-1 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
