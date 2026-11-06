'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

type ItemLaporan = { nama: string; qty: number; harga: number; emoji: string };
type Laporan = {
  id: string;
  pesananId: string;
  pelangganNama: string;
  pelangganEmail: string;
  items: ItemLaporan[];
  total: number;
  createdAt: { seconds: number } | null;
  selesaiAt: { seconds: number } | null;
};

type FilterPeriode = 'semua' | 'hari-ini' | 'minggu-ini' | 'bulan-ini' | 'kustom';

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000; }
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff).getTime() / 1000;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000; }
function endOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime() / 1000; }

const PER_PAGE = 15;

export default function LaporanPage() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPeriode>('semua');
  const [expand, setExpand] = useState<string | null>(null);
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [halaman, setHalaman] = useState(1);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsub) unsub();
      if (!user) { setLoading(false); return; }
      const q = query(collection(db, 'laporan'), orderBy('selesaiAt', 'desc'));
      unsub = onSnapshot(q, (snap) => {
        setLaporan(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Laporan)));
        setLoading(false);
      });
    });
    return () => { unsubAuth(); if (unsub) unsub(); };
  }, []);

  // Reset ke halaman 1 saat filter berubah
  useEffect(() => { setHalaman(1); setExpand(null); }, [filter, tanggalDari, tanggalSampai]);

  const now = new Date();
  const laporanFiltered = laporan.filter((l) => {
    const selesaiSec = l.selesaiAt?.seconds ?? l.createdAt?.seconds ?? 0;
    if (filter === 'hari-ini') return selesaiSec >= startOfDay(now);
    if (filter === 'minggu-ini') return selesaiSec >= startOfWeek(now);
    if (filter === 'bulan-ini') return selesaiSec >= startOfMonth(now);
    if (filter === 'kustom') {
      const dari = tanggalDari ? new Date(tanggalDari).getTime() / 1000 : 0;
      const sampai = tanggalSampai ? endOfDay(new Date(tanggalSampai)) : Infinity;
      return selesaiSec >= dari && selesaiSec <= sampai;
    }
    return true;
  });

  const totalPendapatan = laporanFiltered.reduce((sum, l) => sum + l.total, 0);
  const totalTransaksi = laporanFiltered.length;
  const rataRata = totalTransaksi > 0 ? totalPendapatan / totalTransaksi : 0;

  // Pagination
  const totalHalaman = Math.max(1, Math.ceil(laporanFiltered.length / PER_PAGE));
  const halamanAman = Math.min(halaman, totalHalaman);
  const laporanHalaman = laporanFiltered.slice((halamanAman - 1) * PER_PAGE, halamanAman * PER_PAGE);

  const produkMap = new Map<string, { nama: string; emoji: string; qty: number; pendapatan: number }>();
  laporanFiltered.forEach((l) => {
    l.items.forEach((item) => {
      const existing = produkMap.get(item.nama);
      if (existing) {
        existing.qty += item.qty;
        existing.pendapatan += item.harga * item.qty;
      } else {
        produkMap.set(item.nama, { nama: item.nama, emoji: item.emoji, qty: item.qty, pendapatan: item.harga * item.qty });
      }
    });
  });
  const produkTerlaris = Array.from(produkMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = produkTerlaris[0]?.qty || 1;

  // Export CSV
  const handleExportCSV = () => {
    if (laporanFiltered.length === 0) return;

    const rows: string[] = [
      'No,No Pesanan,Pelanggan,Email,Item,Total,Tanggal Selesai'
    ];

    laporanFiltered.forEach((l, i) => {
      const tanggal = l.selesaiAt
        ? new Date(l.selesaiAt.seconds * 1000).toLocaleString('id-ID')
        : '-';
      const itemStr = l.items.map((it) => `${it.nama} x${it.qty}`).join(' | ');
      rows.push(
        `${i + 1},"${l.pesananId.slice(0, 8).toUpperCase()}","${l.pelangganNama}","${l.pelangganEmail}","${itemStr}","Rp ${l.total.toLocaleString('id-ID')}","${tanggal}"`
      );
    });

    const csvContent = '\uFEFF' + rows.join('\n'); // BOM untuk Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-indrifood-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterLabel: Record<Exclude<FilterPeriode, 'kustom'>, string> = {
    semua: 'Semua',
    'hari-ini': 'Hari Ini',
    'minggu-ini': 'Minggu Ini',
    'bulan-ini': 'Bulan Ini',
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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Laporan Penjualan</h2>
          <p className="text-ink-400 text-sm mt-0.5">Pesanan yang telah selesai diterima pelanggan</p>
        </div>
        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          disabled={laporanFiltered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter periode */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">Filter Periode</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(filterLabel) as Exclude<FilterPeriode, 'kustom'>[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === k
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-ink-50 text-ink-600 border border-ink-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {filterLabel[k]}
            </button>
          ))}
          <button
            onClick={() => setFilter('kustom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'kustom'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-ink-50 text-ink-600 border border-ink-200 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            📅 Pilih Tanggal
          </button>
        </div>

        {/* Input tanggal kustom */}
        {filter === 'kustom' && (
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-500">Dari</label>
              <input
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className="px-3 py-2 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-500">Sampai</label>
              <input
                type="date"
                value={tanggalSampai}
                onChange={(e) => setTanggalSampai(e.target.value)}
                className="px-3 py-2 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none"
              />
            </div>
            {(tanggalDari || tanggalSampai) && (
              <button
                onClick={() => { setTanggalDari(''); setTanggalSampai(''); }}
                className="text-xs text-red-500 font-semibold hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-1">Total Pendapatan</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1.5">Rp {totalPendapatan.toLocaleString('id-ID')}</p>
          <p className="text-xs text-ink-400 mt-1">{totalTransaksi} transaksi</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-600" />
          <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-1">Total Transaksi</p>
          <p className="text-2xl font-extrabold text-brand-700 mt-1.5">{totalTransaksi}</p>
          <p className="text-xs text-ink-400 mt-1">pesanan selesai</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-600" />
          <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-1">Rata-rata per Transaksi</p>
          <p className="text-2xl font-extrabold text-brand-700 mt-1.5">Rp {Math.round(rataRata).toLocaleString('id-ID')}</p>
          <p className="text-xs text-ink-400 mt-1">per pesanan</p>
        </div>
      </div>

      {/* Produk terlaris */}
      {produkTerlaris.length > 0 && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-sm">🏆</span>
            </div>
            <h3 className="text-sm font-extrabold text-ink-800">Produk Terlaris</h3>
          </div>
          <div className="space-y-3">
            {produkTerlaris.map((p, i) => {
              const rankColors = ['text-amber-500', 'text-ink-400', 'text-amber-700', 'text-ink-400', 'text-ink-400'];
              const barColors = ['from-amber-400 to-orange-500', 'from-brand-400 to-brand-500', 'from-brand-400 to-brand-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500'];
              return (
                <div key={p.nama} className="flex items-center gap-3">
                  <span className={`w-6 text-center font-extrabold text-sm ${rankColors[i]}`}>{i + 1}</span>
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-ink-700 truncate">{p.nama}</span>
                      <span className="text-xs text-ink-400 ml-2 flex-shrink-0">{p.qty} terjual</span>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${barColors[i]} rounded-full transition-all duration-500`}
                        style={{ width: `${(p.qty / maxQty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-ink-800 flex-shrink-0 min-w-[80px] text-right">
                    Rp {p.pendapatan.toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabel transaksi */}
      {laporanFiltered.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 text-center border border-ink-100 shadow-sm">
          <span className="text-5xl">📊</span>
          <p className="mt-3 font-bold text-ink-700">Belum ada transaksi selesai</p>
          <p className="text-ink-400 text-sm mt-1">Data akan muncul saat pesanan berstatus Selesai</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-50 bg-ink-50/50 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-ink-800">Riwayat Transaksi</h3>
            <span className="text-xs text-ink-400 font-medium">{laporanFiltered.length} transaksi</span>
          </div>
          <div className="divide-y divide-ink-50">
            {laporanHalaman.map((l) => {
              const tanggalSelesai = l.selesaiAt
                ? new Date(l.selesaiAt.seconds * 1000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
              const isOpen = expand === l.id;

              return (
                <div key={l.id}>
                  <div
                    className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-ink-50/50 transition-colors"
                    onClick={() => setExpand(isOpen ? null : l.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-brand-600 font-semibold">#{l.pesananId.slice(0, 8).toUpperCase()}</p>
                      <p className="font-semibold text-ink-800 text-sm mt-0.5">{l.pelangganNama}</p>
                      <p className="text-ink-400 text-xs">{tanggalSelesai}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-emerald-600">Rp {l.total.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-ink-400">{l.items.length} item</p>
                    </div>
                    <div className={`w-7 h-7 rounded-lg bg-ink-100 flex items-center justify-center transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                      <svg className="w-3.5 h-3.5 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-4 space-y-2 bg-ink-50 border-t border-ink-100">
                      <p className="text-xs font-bold text-ink-400 uppercase tracking-wider pt-3 mb-2">Detail Item</p>
                      {l.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm bg-white rounded-xl px-3 py-2.5 border border-ink-100">
                          <span className="text-xl">{item.emoji}</span>
                          <span className="flex-1 text-ink-700 font-medium">{item.nama}</span>
                          <span className="text-ink-400 text-xs bg-ink-100 px-2 py-0.5 rounded-full">×{item.qty}</span>
                          <span className="font-semibold text-ink-800">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalHalaman > 1 && (
            <div className="px-5 py-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-ink-400 font-medium">
                Menampilkan {((halamanAman - 1) * PER_PAGE) + 1}–{Math.min(halamanAman * PER_PAGE, laporanFiltered.length)} dari {laporanFiltered.length} transaksi
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setHalaman((h) => Math.max(1, h - 1)); setExpand(null); }}
                  disabled={halamanAman === 1}
                  className="w-8 h-8 rounded-lg bg-white border border-ink-200 flex items-center justify-center text-ink-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalHalaman }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalHalaman || Math.abs(p - halamanAman) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="w-8 text-center text-ink-400 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => { setHalaman(p as number); setExpand(null); }}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          halamanAman === p
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => { setHalaman((h) => Math.min(totalHalaman, h + 1)); setExpand(null); }}
                  disabled={halamanAman === totalHalaman}
                  className="w-8 h-8 rounded-lg bg-white border border-ink-200 flex items-center justify-center text-ink-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
