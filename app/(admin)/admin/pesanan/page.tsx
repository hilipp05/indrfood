'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useNotifSuara } from '@/lib/useNotifSuara';
import StrukPembayaran from '@/app/(pelanggan)/pesanan-saya/StrukPembayaran';

type ItemPesanan = { nama: string; qty: number; harga: number; emoji: string };
type Pesanan = {
  id: string;
  pelangganId: string;
  pelangganNama: string;
  pelangganEmail: string;
  items: ItemPesanan[];
  total: number;
  status: string;
  tipeOrder?: 'dine-in' | 'delivery';  metodeBayar?: 'tunai' | 'kredit' | 'transfer';
  transferDikonfirmasi?: boolean;
  nomorMeja?: string;
  alamat?: string;
  alasanBatal?: string;
  estimasiMenit?: number;
  riwayatStatus?: { status: string; waktu: number }[];
  createdAt: { seconds: number } | null;
};

const statusList = ['Baru', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan'];

const statusConfig: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Baru:             { bg: 'bg-brand-50',    text: 'text-brand-700',    dot: 'bg-brand-500',    border: 'border-brand-200' },
  Diproses:         { bg: 'bg-brand-50',   text: 'text-brand-700',   dot: 'bg-brand-500',   border: 'border-brand-200' },
  Dikirim:          { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500', border: 'border-brand-200' },
  Selesai:          { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  Dibatalkan:       { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-500',    border: 'border-red-200' },
  'Pengajuan Batal':{ bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
};

type FilterStatus = 'Semua' | 'Baru' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Dibatalkan' | 'Pengajuan Batal';
const filterList: FilterStatus[] = ['Semua', 'Baru', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan', 'Pengajuan Batal'];

export default function AdminPesananPage() {
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expand, setExpand] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Semua');
  const [estimasiInput, setEstimasiInput] = useState<Record<string, string>>({});
  const [struk, setStruk] = useState<Pesanan | null>(null);
  const [cari, setCari] = useState('');
  const { mainkanSuara } = useNotifSuara();
  const idDiketahui = useRef<Set<string>>(new Set());
  const sudahInit = useRef(false);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;

    // Tunggu auth siap sebelum query, agar tidak kena permissions error
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = undefined; }
      if (!user) { setLoading(false); return; }

      const q = query(collection(db, 'pesanan'), orderBy('createdAt', 'desc'));
      unsubSnap = onSnapshot(q, (snap) => {
        const dataBaru = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pesanan));

        if (!sudahInit.current) {
          dataBaru.forEach((p) => idDiketahui.current.add(p.id));
          sudahInit.current = true;
        } else {
          const adaPesananBaru = dataBaru.some((p) => !idDiketahui.current.has(p.id));
          if (adaPesananBaru) {
            mainkanSuara('pesanan-masuk');
            dataBaru.forEach((p) => idDiketahui.current.add(p.id));
          }
        }

        setPesanan(dataBaru);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [mainkanSuara]);

  const updateStatus = async (id: string, status: string) => {
    const updateData: Record<string, unknown> = { status };

    // Jika diproses, simpan estimasi waktu jika diisi
    if (status === 'Diproses') {
      const menit = parseInt(estimasiInput[id] ?? '');
      if (!isNaN(menit) && menit > 0) {
        updateData.estimasiMenit = menit;
        updateData.estimasiDitetapkanAt = serverTimestamp();
      }
    }

    // Simpan log riwayat status
    updateData.riwayatStatus = arrayUnion({
      status,
      waktu: Date.now(),
    });

    await updateDoc(doc(db, 'pesanan', id), updateData);

    const pesananIni = pesanan.find((p) => p.id === id);

    if (status === 'Selesai' && pesananIni) {
      const laporanRef = doc(db, 'laporan', id);
      const laporanSnap = await getDoc(laporanRef);
      if (!laporanSnap.exists()) {
        await setDoc(laporanRef, {
          pesananId: id,
          pelangganNama: pesananIni.pelangganNama,
          pelangganEmail: pesananIni.pelangganEmail,
          items: pesananIni.items,
          total: pesananIni.total,
          createdAt: pesananIni.createdAt,
          selesaiAt: serverTimestamp(),
        });
      }
    }

    // Kirim notif WA ke pelanggan (silent fail jika bot tidak aktif)
    if (pesananIni?.pelangganId) {
      try {
        const userSnap = await getDoc(doc(db, 'users', pesananIni.pelangganId));
        const nomorWA = userSnap.data()?.nomorWA;
        if (nomorWA) {
          const { getIdToken } = await import('firebase/auth');
          const token = auth.currentUser ? await getIdToken(auth.currentUser) : null;
          fetch('/api/notif-wa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              nomorWA,
              status,
              pesananId: id,
              pelangganNama: pesananIni.pelangganNama,
              items: pesananIni.items,
              total: pesananIni.total,
              tipeOrder: pesananIni.tipeOrder,
              nomorMeja: pesananIni.nomorMeja,
              alamat: pesananIni.alamat,
            }),
          }).catch(() => {});
        }
      } catch {
        // silent fail
      }
    }
  };

  const filtered = (() => {
    let hasil = filterStatus === 'Semua' ? pesanan : pesanan.filter((p) => p.status === filterStatus);
    if (cari.trim()) {
      const q = cari.trim().toLowerCase();
      hasil = hasil.filter((p) =>
        p.pelangganNama?.toLowerCase().includes(q) ||
        p.pelangganEmail?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.id.slice(0, 8).toLowerCase().includes(q)
      );
    }
    return hasil;
  })();

  // Hitung per status untuk badge counter
  const countByStatus = pesanan.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Pesanan</h2>
          <p className="text-ink-400 text-sm mt-0.5">{pesanan.length} pesanan masuk · update real-time</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cari nama, email, atau no. pesanan..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all bg-white shadow-sm"
        />
        {cari && (
          <button onClick={() => setCari('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-ink-200 hover:bg-ink-300 rounded-full flex items-center justify-center transition-colors">
            <svg className="w-2.5 h-2.5 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filterList.map((f) => {
          const count = f === 'Semua' ? pesanan.length : (countByStatus[f] ?? 0);
          const isActive = filterStatus === f;
          const cfg = f !== 'Semua' ? statusConfig[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                  : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {cfg && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : cfg.dot}`} />
              )}
              {f}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 text-center border border-ink-100 shadow-sm">
          <div className="w-16 h-16 bg-ink-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
            {cari ? '🔍' : '📭'}
          </div>
          <p className="font-bold text-ink-700">
            {cari
              ? `Tidak ada pesanan untuk "${cari}"`
              : filterStatus === 'Semua' ? 'Belum ada pesanan masuk' : `Tidak ada pesanan berstatus "${filterStatus}"`}
          </p>
          {(cari || filterStatus !== 'Semua') && (
            <button
              onClick={() => { setCari(''); setFilterStatus('Semua'); }}
              className="mt-3 text-xs text-brand-600 font-semibold hover:underline"
            >
              Reset pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const tanggal = p.createdAt
              ? new Date(p.createdAt.seconds * 1000).toLocaleString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : '-';
            const isOpen = expand === p.id;
            const sc = statusConfig[p.status] ?? { bg: 'bg-ink-50', text: 'text-ink-600', dot: 'bg-ink-400', border: 'border-ink-200' };
            const isPengajuanBatal = p.status === 'Pengajuan Batal';

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
                  isPengajuanBatal ? 'border-orange-200 shadow-md' : 'border-ink-100 hover:border-brand-100 shadow-sm'
                }`}
              >
                {/* Accent bar untuk pengajuan batal */}
                {isPengajuanBatal && (
                  <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
                )}

                {/* Row utama */}
                <div
                  className="px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-ink-50/50 transition-colors"
                  onClick={() => setExpand(isOpen ? null : p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-mono text-xs text-brand-600 font-bold">#{p.id.slice(0, 8).toUpperCase()}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {p.status}
                      </span>
                      {isPengajuanBatal && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
                          ⚠️ Perlu Tindakan
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-ink-800 text-sm mt-1 truncate">{p.pelangganNama}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-ink-400 text-[11px]">{tanggal}</p>
                      {p.tipeOrder === 'dine-in' && p.nomorMeja && (
                        <span className="text-[11px] text-brand-500 font-semibold bg-brand-50 px-1.5 py-0.5 rounded-full">
                          🍽️ Meja {p.nomorMeja}
                        </span>
                      )}
                      {p.tipeOrder === 'delivery' && (
                        <span className="text-[11px] text-brand-500 font-semibold bg-brand-50 px-1.5 py-0.5 rounded-full">
                          🛵 Delivery
                        </span>
                      )}
                      {p.metodeBayar === 'tunai' && (
                        <span className="text-[11px] text-ink-500 font-semibold bg-ink-100 px-1.5 py-0.5 rounded-full">💵 Tunai</span>
                      )}
                      {p.metodeBayar === 'kredit' && (
                        <span className="text-[11px] text-brand-600 font-semibold bg-brand-50 px-1.5 py-0.5 rounded-full">💳 Kartu</span>
                      )}
                      {p.metodeBayar === 'transfer' && (
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${p.transferDikonfirmasi ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                          🏦 {p.transferDikonfirmasi ? 'Lunas' : 'Belum Konfirmasi'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-brand-700 text-sm">Rp {p.total.toLocaleString('id-ID')}</p>
                    <p className="text-[11px] text-ink-400">{p.items.length} item</p>
                  </div>
                  <div className={`w-6 h-6 rounded-lg bg-ink-100 flex items-center justify-center transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Detail expand */}
                {isOpen && (
                  <div className="border-t border-ink-100 bg-ink-50/50">
                    {/* Items */}
                    <div className="px-5 py-4 space-y-2.5">
                      <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">Detail Item</p>
                      {p.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-ink-100">
                          <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                            {item.emoji}
                          </div>
                          <span className="flex-1 text-ink-700 font-medium text-sm">{item.nama}</span>
                          <span className="text-ink-400 text-xs bg-ink-100 px-2 py-0.5 rounded-full">×{item.qty}</span>
                          <span className="font-semibold text-ink-800 text-sm">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                      ))}

                      {/* Alamat delivery */}
                      {p.tipeOrder === 'delivery' && p.alamat && (
                        <div className="flex items-start gap-2 bg-brand-50 rounded-xl px-3 py-2.5 border border-brand-100 mt-2">
                          <span className="text-base mt-0.5">🛵</span>
                          <div>
                            <p className="text-xs font-bold text-brand-700">Alamat Pengiriman</p>
                            <p className="text-xs text-brand-600 mt-0.5">{p.alamat}</p>
                          </div>
                        </div>
                      )}

                      {/* Konfirmasi Transfer */}
                      {p.metodeBayar === 'transfer' && (
                        <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border mt-2 ${
                          p.transferDikonfirmasi
                            ? 'bg-green-50 border-green-100'
                            : 'bg-amber-50 border-amber-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">🏦</span>
                            <div>
                              <p className={`text-xs font-bold ${p.transferDikonfirmasi ? 'text-green-700' : 'text-amber-700'}`}>
                                {p.transferDikonfirmasi ? 'Transfer Sudah Dikonfirmasi' : 'Menunggu Konfirmasi Transfer'}
                              </p>
                              <p className={`text-[10px] ${p.transferDikonfirmasi ? 'text-green-600' : 'text-amber-600'}`}>
                                {p.transferDikonfirmasi ? 'Pembayaran lunas' : 'Pelanggan belum/sudah transfer'}
                              </p>
                            </div>
                          </div>
                          {!p.transferDikonfirmasi && (
                            <button
                              onClick={() => updateDoc(doc(db, 'pesanan', p.id), { transferDikonfirmasi: true })}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                            >
                              ✓ Konfirmasi
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pengajuan Batal */}
                    {isPengajuanBatal && (
                      <div className="mx-5 mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Pelanggan mengajukan pembatalan
                        </p>
                        {p.alasanBatal && (
                          <p className="text-xs text-orange-600 bg-orange-100 rounded-lg px-3 py-2 mb-3 italic border border-orange-200">
                            &ldquo;{p.alasanBatal}&rdquo;
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(p.id, 'Dibatalkan')}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
                          >
                            ✓ Setujui Pembatalan
                          </button>
                          <button
                            onClick={() => updateStatus(p.id, 'Baru')}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-ink-700 bg-white border border-ink-200 hover:bg-ink-50 transition-colors"
                          >
                            ✕ Tolak, Kembalikan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Timeline Riwayat Status */}
                    {p.riwayatStatus && p.riwayatStatus.length > 0 && (
                      <div className="px-5 pb-4">
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">Riwayat Status</p>
                        <div className="relative pl-4">
                          {/* Garis vertikal */}
                          <div className="absolute left-1.5 top-2 bottom-2 w-px bg-ink-200" />
                          <div className="space-y-3">
                            {[...p.riwayatStatus]
                              .sort((a, b) => b.waktu - a.waktu)
                              .map((r, i) => {
                                const sc = statusConfig[r.status] ?? { dot: 'bg-ink-400', text: 'text-ink-600', bg: 'bg-ink-50' };
                                return (
                                  <div key={i} className="flex items-start gap-3 relative">
                                    <span className={`absolute -left-2.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${sc.dot} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                                        {r.status}
                                      </span>
                                      <p className="text-[10px] text-ink-400 mt-0.5">
                                        {new Date(r.waktu).toLocaleString('id-ID', {
                                          day: 'numeric', month: 'short', year: 'numeric',
                                          hour: '2-digit', minute: '2-digit',
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cetak Struk */}
                    <div className="px-5 pb-3">
                      <button
                        onClick={() => setStruk(p)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-ink-600 bg-ink-50 hover:bg-ink-100 border border-ink-200 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Cetak Struk
                      </button>
                    </div>

                    {/* Update status */}
                    <div className="px-5 pb-4 flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-ink-400 uppercase tracking-wider">Update Status:</span>                      <div className="flex gap-2 flex-wrap">
                        {statusList.map((s) => {
                          const cfg = statusConfig[s];
                          const isActive = p.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => updateStatus(p.id, s)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                isActive
                                  ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                                  : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300 hover:text-brand-600'
                              }`}
                            >
                              {isActive && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Input estimasi waktu — tampil saat akan set ke Diproses */}
                    {p.status !== 'Diproses' && p.status !== 'Selesai' && p.status !== 'Dibatalkan' && (
                      <div className="px-5 pb-4">
                        <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex items-center gap-3">
                          <span className="text-lg">⏱️</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-brand-700 mb-1">Estimasi Waktu Siap (opsional)</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="120"
                                placeholder="menit"
                                value={estimasiInput[p.id] ?? ''}
                                onChange={(e) => setEstimasiInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                className="w-24 px-3 py-1.5 rounded-lg border border-brand-200 text-sm text-brand-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none bg-white"
                              />
                              <span className="text-xs text-brand-600 font-medium">menit</span>
                              <button
                                onClick={() => updateStatus(p.id, 'Diproses')}
                                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                Set &amp; Proses
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tampilkan estimasi yang sudah di-set */}
                    {p.status === 'Diproses' && p.estimasiMenit && (
                      <div className="px-5 pb-4">
                        <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 flex items-center gap-2">
                          <span className="text-sm">⏱️</span>
                          <p className="text-xs font-semibold text-brand-700">
                            Estimasi ditetapkan: <span className="font-extrabold">{p.estimasiMenit} menit</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Struk */}
      {struk && (
        <StrukPembayaran
          pesanan={struk}
          onTutup={() => setStruk(null)}
        />
      )}
    </div>
  );
}