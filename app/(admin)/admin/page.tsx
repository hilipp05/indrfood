'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
import SalesChart from './_components/SalesChart';
import CategoryChart from './_components/CategoryChart';

type ItemLaporan = { nama: string; qty: number; harga: number; emoji: string; kategori?: string };
type Laporan = {
  id: string;
  pesananId: string;
  pelangganNama: string;
  items: ItemLaporan[];
  total: number;
  selesaiAt: { seconds: number } | null;
  createdAt: { seconds: number } | null;
};

type Pesanan = {
  id: string;
  pelangganNama: string;
  items: ItemLaporan[];
  total: number;
  status: string;
  createdAt: { seconds: number } | null;
};

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  Baru: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  Diproses: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  Dikirim: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  Selesai: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  Dibatalkan: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

function get7Hari() {
  const hari = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    hari.push({
      tanggal: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      dateStr: d.toDateString(),
      penjualan: 0,
    });
  }
  return hari;
}

export default function AdminDashboard() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [pesananTerbaru, setPesananTerbaru] = useState<Pesanan[]>([]);
  const [totalPelanggan, setTotalPelanggan] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    const subs: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Bersihkan listener lama
      subs.forEach((u) => u());
      subs.length = 0;
      if (!user) { setLoading(false); return; }

      subs.push(onSnapshot(collection(db, 'laporan'), (snap) => {
        setLaporan(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Laporan)));
      }));

      const qPesanan = query(collection(db, 'pesanan'), orderBy('createdAt', 'desc'), limit(5));
      subs.push(onSnapshot(qPesanan, (snap) => {
        setPesananTerbaru(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pesanan)));
        setLoading(false);
      }));

      getDocs(query(collection(db, 'users'))).then((snap) => {
        setTotalPelanggan(snap.size);
      });

      subs.push(onSnapshot(doc(db, 'pengaturan', 'toko'), (snap) => {
        if (snap.exists()) {
          setIsOpen(snap.data().isOpen ?? true);
        } else {
          setIsOpen(true);
        }
      }));
    });

    return () => {
      unsubAuth();
      subs.forEach((u) => u());
    };
  }, []);

  const handleToggleToko = async () => {
    if (isOpen === null) return;
    setSavingToggle(true);
    await setDoc(doc(db, 'pengaturan', 'toko'), { isOpen: !isOpen }, { merge: true });
    setSavingToggle(false);
  };

  const totalPendapatan = laporan.reduce((s, l) => s + l.total, 0);
  const totalTransaksi = laporan.length;
  const totalProdukTerjual = laporan.reduce(
    (s, l) => s + l.items.reduce((si, item) => si + item.qty, 0), 0
  );

  const chartData = get7Hari();
  laporan.forEach((l) => {
    const sec = l.selesaiAt?.seconds ?? l.createdAt?.seconds;
    if (!sec) return;
    const dateStr = new Date(sec * 1000).toDateString();
    const slot = chartData.find((d) => d.dateStr === dateStr);
    if (slot) slot.penjualan += l.total;
  });

  const produkMap = new Map<string, { nama: string; emoji: string; qty: number }>();
  laporan.forEach((l) => {
    l.items.forEach((item) => {
      const ex = produkMap.get(item.nama);
      if (ex) ex.qty += item.qty;
      else produkMap.set(item.nama, { nama: item.nama, emoji: item.emoji, qty: item.qty });
    });
  });
  const topProduk = Array.from(produkMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = topProduk[0]?.qty || 1;

  const kategoriMap = new Map<string, number>();
  laporan.forEach((l) => {
    l.items.forEach((item) => {
      const kat = item.kategori || 'Lainnya';
      kategoriMap.set(kat, (kategoriMap.get(kat) ?? 0) + item.qty);
    });
  });
  const categoryData = Array.from(kategoriMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const stats = [
    {
      label: 'Total Pendapatan',
      value: `Rp ${totalPendapatan.toLocaleString('id-ID')}`,
      sub: `${totalTransaksi} transaksi selesai`,
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Total Pesanan',
      value: totalTransaksi.toString(),
      sub: 'pesanan selesai',
      gradient: 'from-brand-500 to-brand-600',
      bgLight: 'bg-brand-50',
      iconColor: 'text-brand-600',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    },
    {
      label: 'Total Pelanggan',
      value: totalPelanggan.toString(),
      sub: 'akun terdaftar',
      gradient: 'from-brand-500 to-brand-600',
      bgLight: 'bg-brand-50',
      iconColor: 'text-brand-600',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      label: 'Produk Terjual',
      value: totalProdukTerjual.toString(),
      sub: 'total item terjual',
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Dashboard</h2>
          <p className="text-ink-400 text-sm mt-0.5">Ringkasan penjualan & aktivitas terkini</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Buka/Tutup — compact */}
          <button
            onClick={handleToggleToko}
            disabled={savingToggle || isOpen === null}
            title={isOpen ? 'Klik untuk tutup toko' : 'Klik untuk buka toko'}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all border disabled:opacity-60 ${
              isOpen
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            {savingToggle ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            )}
            {isOpen ? 'Toko Buka' : 'Toko Tutup'}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>

          <Link
            href="/admin/pesanan"
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Kelola Pesanan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-ink-100 hover:shadow-md transition-shadow overflow-hidden relative">
            {/* Accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient}`} />
            <div className="flex items-start justify-between gap-3 mt-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-400 font-semibold uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-extrabold text-ink-900 leading-tight mt-1 truncate">{s.value}</p>
                <p className="text-xs text-ink-400 mt-1">{s.sub}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bgLight}`}>
                <svg className={`w-5 h-5 ${s.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink-900 text-sm">Grafik Penjualan</h3>
              <p className="text-xs text-ink-400 mt-0.5">Pendapatan harian</p>
            </div>
            <span className="text-xs text-brand-600 bg-brand-50 px-3 py-1 rounded-full font-semibold border border-brand-100">
              7 Hari Terakhir
            </span>
          </div>
          <SalesChart data={chartData} />
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
          <div className="mb-4">
            <h3 className="font-bold text-ink-900 text-sm">Penjualan per Kategori</h3>
            <p className="text-xs text-ink-400 mt-0.5">Distribusi item terjual</p>
          </div>
          <CategoryChart data={categoryData} />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Pesanan Terbaru */}
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-ink-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-ink-50 bg-ink-50/50">
            <div>
              <h3 className="font-bold text-ink-900 text-sm">Pesanan Terbaru</h3>
              <p className="text-xs text-ink-400 mt-0.5">5 pesanan terakhir masuk</p>
            </div>
            <Link href="/admin/pesanan" className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline underline-offset-2">
              Lihat Semua
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {pesananTerbaru.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-ink-400 text-sm mt-2">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-ink-50/80 text-ink-400 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">No. Pesanan</th>
                    <th className="px-5 py-3 text-left font-semibold">Pelanggan</th>
                    <th className="px-5 py-3 text-left font-semibold">Item</th>
                    <th className="px-5 py-3 text-left font-semibold">Total</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {pesananTerbaru.map((o) => {
                    const s = statusStyle[o.status] ?? { bg: 'bg-ink-50', text: 'text-ink-600', dot: 'bg-ink-400' };
                    return (
                      <tr key={o.id} className="hover:bg-ink-50/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-brand-600 font-semibold">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-5 py-3 text-ink-700 font-medium">{o.pelangganNama || '-'}</td>
                        <td className="px-5 py-3 text-ink-600">
                          <div className="flex items-center gap-1">
                            <span>{o.items[0]?.emoji}</span>
                            <span className="truncate max-w-[90px]">{o.items[0]?.nama}</span>
                            {o.items.length > 1 && (
                              <span className="text-ink-400 text-[10px] bg-ink-100 px-1.5 py-0.5 rounded-full">+{o.items.length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-ink-800 font-semibold">
                          Rp {o.total.toLocaleString('id-ID')}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${s.bg} ${s.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Produk Terlaris */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-ink-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-ink-50 bg-ink-50/50">
            <div>
              <h3 className="font-bold text-ink-900 text-sm">Produk Terlaris</h3>
              <p className="text-xs text-ink-400 mt-0.5">Berdasarkan qty terjual</p>
            </div>
            <Link href="/admin/laporan" className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline underline-offset-2">
              Detail
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {topProduk.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="text-3xl">📊</span>
              <p className="text-ink-400 text-sm mt-2">Belum ada data</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {topProduk.map((p, i) => {
                const rankColors = ['text-amber-500', 'text-ink-400', 'text-amber-700', 'text-ink-400', 'text-ink-400'];
                return (
                  <div key={p.nama} className="flex items-center gap-3">
                    <span className={`font-extrabold text-sm w-5 text-center ${rankColors[i]}`}>{i + 1}</span>
                    <span className="text-xl">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink-800 truncate">{p.nama}</p>
                      <div className="mt-1.5 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
                          style={{ width: `${(p.qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-ink-500 font-semibold flex-shrink-0 bg-ink-50 px-2 py-0.5 rounded-lg">
                      {p.qty}×
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
