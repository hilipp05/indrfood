'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKeranjang } from '@/lib/keranjangContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useStatusToko } from '@/lib/useStatusToko';
import Link from 'next/link';

type TipeOrder = 'dine-in' | 'delivery';
type MetodeBayar = 'tunai' | 'kredit' | 'transfer';

export default function KeranjangPage() {
  const { items, tambah, kurang, hapus, kosongkan, total } = useKeranjang();
  const [user] = useAuthState(auth);
  const { isOpen, pesanTutup } = useStatusToko();
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [error, setError] = useState('');
  const [konfirmasiKosong, setKonfirmasiKosong] = useState(false);
  const [tipeOrder, setTipeOrder] = useState<TipeOrder>('dine-in');
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>('tunai');
  const [nomorMeja, setNomorMeja] = useState('');
  const [alamat, setAlamat] = useState('');
  const router = useRouter();

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (items.length === 0) return;

    if (tipeOrder === 'dine-in' && !nomorMeja.trim()) {
      setError('Masukkan nomor meja terlebih dahulu.');
      return;
    }
    if (tipeOrder === 'delivery' && !alamat.trim()) {
      setError('Masukkan alamat pengiriman terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'pesanan'), {
        pelangganId: user.uid,
        pelangganNama: user.displayName || user.email,
        pelangganEmail: user.email,
        items: items.map((i) => ({
          nama: i.nama,
          harga: i.harga,
          qty: i.qty,
          emoji: i.emoji,
          subtotal: i.harga * i.qty,
        })),
        total,
        status: 'Baru',
        tipeOrder,
        metodeBayar,
        ...(tipeOrder === 'dine-in' ? { nomorMeja: nomorMeja.trim() } : { alamat: alamat.trim() }),
        createdAt: serverTimestamp(),
      });
      kosongkan();
      setSukses(true);
      setTimeout(() => { setSukses(false); router.push('/pesanan-saya'); }, 2000);
    } catch (e) {
      console.error(e);
      setError('Gagal mengirim pesanan. Periksa koneksi internet dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (sukses) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-extrabold text-ink-900">Pesanan Berhasil!</p>
        <p className="text-ink-400 text-sm mt-1">Mengarahkan ke halaman pesanan...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold text-ink-900">Keranjang</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-14 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center text-4xl mb-4">
            🛒
          </div>
          <p className="font-bold text-ink-800 text-lg">Keranjang masih kosong</p>
          <p className="text-ink-400 text-sm mt-1">Tambahkan menu favoritmu dari halaman Menu</p>
          <Link
            href="/menu"
            className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lihat Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Keranjang</h2>
          <p className="text-ink-400 text-sm mt-0.5">{items.length} item dipilih</p>
        </div>
        <button
          onClick={() => setKonfirmasiKosong(true)}
          className="text-xs text-red-500 font-semibold hover:underline underline-offset-2"
        >
          Kosongkan
        </button>
      </div>

      {/* Item list */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-ink-100 p-4 flex items-center gap-4 hover:border-brand-100 transition-colors shadow-sm">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink-900 text-sm leading-tight">{item.nama}</p>
              <p className="text-brand-700 font-extrabold text-sm mt-0.5">
                Rp {(item.harga * item.qty).toLocaleString('id-ID')}
              </p>
              <p className="text-ink-400 text-xs">@ Rp {item.harga.toLocaleString('id-ID')}</p>
            </div>
            {/* Qty control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => kurang(item.id)}
                className="w-8 h-8 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 font-bold flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-6 text-center font-bold text-ink-900 text-sm">{item.qty}</span>
              <button
                onClick={() => tambah({ id: item.id, nama: item.nama, harga: item.harga, emoji: item.emoji })}
                className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => hapus(item.id)}
                className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors ml-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tipe Order */}
      <div className="bg-white rounded-2xl border border-ink-100 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <p className="font-bold text-ink-900 text-sm">Tipe Pesanan</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setTipeOrder('dine-in'); setError(''); setMetodeBayar('tunai'); }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
              tipeOrder === 'dine-in'
                ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300'
            }`}
          >
            <span className="text-lg">🍽️</span>
            Makan di Sini
          </button>
          <button
            onClick={() => { setTipeOrder('delivery'); setError(''); setMetodeBayar('transfer'); }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
              tipeOrder === 'delivery'
                ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300'
            }`}
          >
            <span className="text-lg">🛵</span>
            Antar ke Alamat
          </button>
        </div>

        {tipeOrder === 'dine-in' && (
          <div>
            <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Nomor Meja</label>
            <input
              type="text"
              value={nomorMeja}
              onChange={(e) => { setNomorMeja(e.target.value); setError(''); }}
              placeholder="Contoh: 5 atau A3"
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
            />
          </div>
        )}

        {tipeOrder === 'delivery' && (
          <div>
            <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Alamat Pengiriman</label>
            <textarea
              value={alamat}
              onChange={(e) => { setAlamat(e.target.value); setError(''); }}
              placeholder="Contoh: Jl. Mawar No. 12, RT 03/RW 05, Kel. Sukamaju"
              rows={3}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all resize-none"
            />
          </div>
        )}

        {/* Metode Pembayaran */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="font-bold text-ink-900 text-sm">Metode Pembayaran</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(tipeOrder === 'dine-in'
              ? [
                  { value: 'tunai', label: 'Tunai', emoji: '💵', desc: 'Bayar ke kasir' },
                  { value: 'kredit', label: 'Kartu', emoji: '💳', desc: 'Kartu kredit/debit' },
                ] as const
              : [
                  { value: 'transfer', label: 'Transfer', emoji: '🏦', desc: 'Transfer bank/QRIS' },
                ] as const
            ).map((m) => (
              <button
                key={m.value}
                onClick={() => setMetodeBayar(m.value)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl font-bold text-xs transition-all border-2 ${
                  metodeBayar === m.value
                    ? 'bg-green-600 text-white border-green-600 shadow-md'
                    : 'bg-white text-ink-500 border-ink-200 hover:border-green-300'
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span>{m.label}</span>
                <span className={`text-[10px] font-normal ${metodeBayar === m.value ? 'text-green-100' : 'text-ink-400'}`}>{m.desc}</span>
              </button>
            ))}
          </div>
          {tipeOrder === 'delivery' && (
            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <span className="text-sm mt-0.5">ℹ️</span>
              <p className="text-xs text-amber-700 font-medium">
                Setelah memesan, admin akan mengirimkan info rekening/QRIS untuk pembayaran. Pesanan diproses setelah pembayaran dikonfirmasi.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-ink-100 p-5 space-y-3 shadow-sm">
        <p className="font-bold text-ink-900 text-sm mb-1">Ringkasan Pesanan</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Subtotal ({items.reduce((s, i) => s + i.qty, 0)} item)</span>
            <span className="font-semibold text-ink-800">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Ongkos kirim</span>
            <span className="font-semibold text-green-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Gratis
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Tipe</span>
            <span className="font-semibold text-ink-800">
              {tipeOrder === 'dine-in'
                ? `🍽️ Makan di Sini${nomorMeja ? ` · Meja ${nomorMeja}` : ''}`
                : '🛵 Antar ke Alamat'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Pembayaran</span>
            <span className="font-semibold text-ink-800">
              {metodeBayar === 'tunai' ? '💵 Tunai' : metodeBayar === 'kredit' ? '💳 Kartu Kredit/Debit' : '🏦 Transfer / QRIS'}
            </span>
          </div>
        </div>
        <div className="border-t border-ink-100 pt-3 flex justify-between items-center">
          <span className="font-extrabold text-ink-900">Total Bayar</span>
          <span className="font-extrabold text-brand-700 text-xl">Rp {total.toLocaleString('id-ID')}</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || (!user ? false : !isOpen)}
          className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-black rounded-2xl transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Memproses...
            </>
          ) : !user ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login untuk Memesan
            </>
          ) : !isOpen ? (
            <>
              🔴 Toko Sedang Tutup
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pesan Sekarang
            </>
          )}
        </button>
      </div>

      {/* Modal konfirmasi kosongkan keranjang */}
      {konfirmasiKosong && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setKonfirmasiKosong(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                🛒
              </div>
              <h3 className="font-extrabold text-ink-900">Kosongkan Keranjang?</h3>
              <p className="text-ink-500 text-sm mt-1.5 leading-relaxed">
                Semua <span className="font-bold text-ink-700">{items.length} item</span> akan dihapus dari keranjang. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { kosongkan(); setKonfirmasiKosong(false); }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Ya, Kosongkan
              </button>
              <button
                onClick={() => setKonfirmasiKosong(false)}
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
