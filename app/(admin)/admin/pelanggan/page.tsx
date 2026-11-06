'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

type Pelanggan = {
  uid: string;
  nama: string;
  email: string;
  nomorWA?: string;
  foto?: string;
  role: string;
  createdAt: string;
  totalPesanan?: number;
};

type ItemPesanan = { nama: string; qty: number; harga: number; emoji: string };
type Pesanan = {
  id: string;
  items: ItemPesanan[];
  total: number;
  status: string;
  tipeOrder?: string;
  nomorMeja?: string;
  alamat?: string;
  createdAt: { seconds: number } | null;
};

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Baru:              { bg: 'bg-brand-50',    text: 'text-brand-700',    dot: 'bg-brand-500' },
  Diproses:          { bg: 'bg-brand-50',   text: 'text-brand-700',   dot: 'bg-brand-500' },
  Dikirim:           { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  Selesai:           { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  Dibatalkan:        { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-500' },
  'Pengajuan Batal': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const PER_PAGE = 20;

// ── Modal Detail Pelanggan ───────────────────────────────────
function ModalDetailPelanggan({ p, onTutup }: { p: Pelanggan; onTutup: () => void }) {
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTutup]);

  useEffect(() => {
    getDocs(
      query(
        collection(db, 'pesanan'),
        where('pelangganId', '==', p.uid),
        orderBy('createdAt', 'desc')
      )
    ).then((snap) => {
      setPesanan(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pesanan)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [p.uid]);

  const nomorWABersih = p.nomorWA
    ? p.nomorWA.replace(/^0/, '')
    : null;

  const totalBelanja = pesanan
    .filter((o) => o.status === 'Selesai')
    .reduce((s, o) => s + o.total, 0);

  const inisial = (p.nama || p.email || '?').charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onTutup}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-ink-100 flex items-start justify-between gap-4 bg-gradient-to-r from-brand-600 to-brand-500">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
              {p.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-black">{inisial}</span>
              )}
            </div>
            <div>
              <p className="font-extrabold text-white text-lg leading-tight">{p.nama || '-'}</p>
              <p className="text-brand-100 text-xs mt-0.5">{p.email}</p>
              <p className="text-brand-200 text-[10px] mt-0.5 font-mono">ID: {p.uid.slice(0, 12)}...</p>
            </div>
          </div>
          <button
            onClick={onTutup}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-ink-100 border-b border-ink-100">
          {[
            { label: 'Total Pesanan', value: pesanan.length, icon: '📦' },
            {
              label: 'Selesai',
              value: pesanan.filter((o) => o.status === 'Selesai').length,
              icon: '✅',
            },
            {
              label: 'Total Belanja',
              value: `Rp ${totalBelanja.toLocaleString('id-ID')}`,
              icon: '💰',
              small: true,
            },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="text-base">{s.icon}</p>
              <p className={`font-extrabold text-ink-900 mt-0.5 ${s.small ? 'text-sm' : 'text-xl'}`}>
                {s.value}
              </p>
              <p className="text-[10px] text-ink-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Info + Aksi */}
        <div className="px-6 py-4 border-b border-ink-100 space-y-3">
          {/* WhatsApp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-sm font-semibold text-ink-700">
                {nomorWABersih ? `+62${nomorWABersih}` : <span className="text-ink-400 italic text-xs">Belum diisi</span>}
              </span>
            </div>
            {nomorWABersih && (
              <a
                href={`https://wa.me/62${nomorWABersih}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Chat WA
              </a>
            )}
          </div>

          {/* Tanggal bergabung */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-ink-500">
              Bergabung{' '}
              <span className="font-semibold text-ink-700">
                {p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })
                  : '-'}
              </span>
            </span>
          </div>
        </div>

        {/* Riwayat Pesanan */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3 border-b border-ink-100 bg-ink-50/50">
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">
              Riwayat Pesanan ({pesanan.length})
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pesanan.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="text-3xl">📦</span>
              <p className="text-ink-400 text-sm mt-2">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-50">
              {pesanan.map((o) => {
                const sc = statusConfig[o.status] ?? { bg: 'bg-ink-50', text: 'text-ink-600', dot: 'bg-ink-400' };
                const tgl = o.createdAt
                  ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : '-';
                return (
                  <div key={o.id} className="px-6 py-3.5 hover:bg-ink-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-xs text-brand-600 font-bold">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {o.status}
                          </span>
                          {o.tipeOrder === 'dine-in' && o.nomorMeja && (
                            <span className="text-[10px] text-brand-500 font-semibold">🍽️ Meja {o.nomorMeja}</span>
                          )}
                          {o.tipeOrder === 'delivery' && (
                            <span className="text-[10px] text-brand-500 font-semibold">🛵 Delivery</span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">{tgl}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {o.items.slice(0, 3).map((item, i) => (
                            <span key={i} className="text-xs text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded-full">
                              {item.emoji} {item.nama} ×{item.qty}
                            </span>
                          ))}
                          {o.items.length > 3 && (
                            <span className="text-xs text-ink-400">+{o.items.length - 3} lagi</span>
                          )}
                        </div>
                      </div>
                      <p className="font-extrabold text-brand-700 text-sm flex-shrink-0">
                        Rp {o.total.toLocaleString('id-ID')}
                      </p>
                    </div>
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

export default function AdminPelangganPage() {
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [pilih, setPilih] = useState<Pelanggan | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsub) unsub();
      if (!user) { setLoading(false); return; }
      const q = query(collection(db, 'users'), where('role', '==', 'pelanggan'));
      unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => d.data() as Pelanggan);
        getDocs(collection(db, 'pesanan')).then((pesananSnap) => {
          const hitungPesanan: Record<string, number> = {};
          pesananSnap.docs.forEach((d) => {
            const pid = (d.data() as { pelangganId?: string }).pelangganId;
            if (pid) hitungPesanan[pid] = (hitungPesanan[pid] ?? 0) + 1;
          });
          const dataLengkap = data.map((p) => ({ ...p, totalPesanan: hitungPesanan[p.uid] ?? 0 }));
          dataLengkap.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPelanggan(dataLengkap);
          setLoading(false);
        });
      });
    });
    return () => { unsubAuth(); if (unsub) unsub(); };
  }, []);

  const pelangganFiltered = pelanggan.filter(
    (p) =>
      p.nama?.toLowerCase().includes(cari.toLowerCase()) ||
      p.email?.toLowerCase().includes(cari.toLowerCase()) ||
      p.nomorWA?.includes(cari)
  );

  // Reset ke halaman 1 saat search berubah
  useEffect(() => { setHalaman(1); }, [cari]);

  const totalHalaman = Math.max(1, Math.ceil(pelangganFiltered.length / PER_PAGE));
  const halamanAman = Math.min(halaman, totalHalaman);
  const pelangganHalaman = pelangganFiltered.slice((halamanAman - 1) * PER_PAGE, halamanAman * PER_PAGE);

  const formatTanggal = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Pelanggan</h2>
          <p className="text-ink-400 text-sm mt-0.5">{pelanggan.length} pelanggan terdaftar</p>
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className="pl-10 pr-4 py-2.5 text-sm border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 w-64 bg-white shadow-sm"
          />
        </div>
      </div>

      {pelangganFiltered.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 text-center border border-ink-100 shadow-sm">
          <span className="text-5xl">👥</span>
          <p className="mt-3 font-bold text-ink-700">
            {cari ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan terdaftar'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50/80 text-ink-400 text-xs uppercase tracking-wider border-b border-ink-100">
                  <th className="px-5 py-3.5 text-left font-semibold">No</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Pelanggan</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Email</th>
                  <th className="px-5 py-3.5 text-left font-semibold">No. WhatsApp</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Total Pesanan</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Bergabung</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {pelangganHalaman.map((p, i) => (
                  <tr
                    key={p.uid}
                    onClick={() => setPilih(p)}
                    className="hover:bg-brand-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{(halamanAman - 1) * PER_PAGE + i + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                          {p.foto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-500 flex items-center justify-center text-white text-xs font-bold">
                              {(p.nama || p.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-ink-800 font-semibold text-sm">{p.nama || '-'}</p>
                          <p className="text-ink-400 text-xs">{p.uid.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink-600 text-sm">{p.email}</td>
                    <td className="px-5 py-4">
                      {p.nomorWA ? (
                        <a
                          href={`https://wa.me/62${p.nomorWA.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors border border-green-200"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          +62{p.nomorWA.replace(/^0/, '')}
                        </a>
                      ) : (
                        <span className="text-xs text-ink-300 italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        (p.totalPesanan ?? 0) > 0 ? 'bg-brand-50 text-brand-700' : 'bg-ink-50 text-ink-500'
                      }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        {p.totalPesanan ?? 0} pesanan
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-400 text-xs">{formatTanggal(p.createdAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPilih(p); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-xs font-bold transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalHalaman > 1 && (
            <div className="px-5 py-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-ink-400 font-medium">
                Menampilkan {((halamanAman - 1) * PER_PAGE) + 1}–{Math.min(halamanAman * PER_PAGE, pelangganFiltered.length)} dari {pelangganFiltered.length} pelanggan
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
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
                        onClick={() => setHalaman(p as number)}
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
                  onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
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

      {/* Modal detail pelanggan */}
      {pilih && (
        <ModalDetailPelanggan p={pilih} onTutup={() => setPilih(null)} />
      )}
    </div>
  );
}
