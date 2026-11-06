'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Item = { nama: string; qty: number; harga: number; emoji: string };
type Props = {
  pesanan: {
    id: string;
    pelangganNama: string;
    pelangganEmail: string;
    items: Item[];
    total: number;
    tipeOrder?: 'dine-in' | 'delivery';
    metodeBayar?: 'tunai' | 'kredit' | 'transfer';
    transferDikonfirmasi?: boolean;
    nomorMeja?: string;
    alamat?: string;
    createdAt: { seconds: number } | null;
  };
  onTutup: () => void;
};

type ProfilToko = { nama: string; tagline: string; telepon: string; alamat: string; ucapanStruk: string };
const defaultProfil: ProfilToko = { nama: 'IndriFood', tagline: 'Restoran & Catering', telepon: '0822-4141-5498', alamat: '', ucapanStruk: 'Terima kasih telah berbelanja!' };

export default function StrukPembayaran({ pesanan, onTutup }: Props) {
  const strucRef = useRef<HTMLDivElement>(null);
  const [profil, setProfil] = useState<ProfilToko>(defaultProfil);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTutup]);

  useEffect(() => {
    getDoc(doc(db, 'pengaturan', 'profil')).then((snap) => {
      if (snap.exists()) setProfil({ ...defaultProfil, ...snap.data() } as ProfilToko);
    });
  }, []);

  const handleCetak = () => {
    const isi = strucRef.current?.innerHTML;
    if (!isi) return;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk Pembayaran</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
              padding: 16px;
              width: 300px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; }
            .logo { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
            .small { font-size: 10px; color: #555; }
            .status { text-align: center; font-weight: bold; font-size: 13px; margin: 6px 0; }
          </style>
        </head>
        <body>
          ${isi}
          <script>window.onload = function(){ window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const tanggal = pesanan.createdAt
    ? new Date(pesanan.createdAt.seconds * 1000).toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '-';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onTutup}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
            <h3 className="font-extrabold text-ink-900">Struk Pembayaran</h3>
            <button onClick={onTutup} className="text-ink-400 hover:text-ink-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Struk preview */}
          <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
            <div ref={strucRef} className="font-mono text-xs text-ink-900">
              {/* Header toko */}
              <div className="center" style={{ textAlign: 'center' }}>
                <p className="logo bold" style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '2px' }}>{profil.nama.toUpperCase()}</p>
                <p className="small" style={{ fontSize: '10px', color: '#555' }}>{profil.tagline}</p>
                {profil.telepon && <p className="small" style={{ fontSize: '10px', color: '#555' }}>Telp: {profil.telepon}</p>}
                {profil.alamat && <p className="small" style={{ fontSize: '10px', color: '#555' }}>{profil.alamat}</p>}
              </div>

              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Info pesanan */}
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>No. Pesanan</span>
                <span className="bold">{pesanan.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>Tanggal</span>
                <span>{tanggal}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>Pelanggan</span>
                <span className="bold">{pesanan.pelangganNama || '-'}</span>
              </div>
              {pesanan.tipeOrder === 'dine-in' && pesanan.nomorMeja && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                  <span>Meja</span>
                  <span className="bold">{pesanan.nomorMeja}</span>
                </div>
              )}
              {pesanan.tipeOrder === 'delivery' && pesanan.alamat && (
                <div style={{ margin: '3px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pengiriman</span>
                    <span className="bold">Antar ke Alamat</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', wordBreak: 'break-word' }}>
                    {pesanan.alamat}
                  </div>
                </div>
              )}

              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Items */}
              {pesanan.items.map((item, i) => (
                <div key={i} style={{ marginBottom: '6px' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.emoji} {item.nama}</div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', paddingLeft: '8px' }}>
                    <span>{item.qty} x Rp {item.harga.toLocaleString('id-ID')}</span>
                    <span>Rp {(item.harga * item.qty).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}

              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Total */}
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>Subtotal</span>
                <span>Rp {pesanan.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>Ongkos Kirim</span>
                <span>GRATIS</span>
              </div>
              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                <span>TOTAL</span>
                <span>Rp {pesanan.total.toLocaleString('id-ID')}</span>
              </div>

              {/* Metode Bayar */}
              {pesanan.metodeBayar && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                  <span>Pembayaran</span>
                  <span className="bold">
                    {pesanan.metodeBayar === 'tunai' && 'Tunai'}
                    {pesanan.metodeBayar === 'kredit' && 'Kartu Kredit/Debit'}
                    {pesanan.metodeBayar === 'transfer' && 'Transfer / QRIS'}
                  </span>
                </div>
              )}

              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              <div className="status" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', margin: '6px 0' }}>
                {pesanan.metodeBayar === 'transfer' && !pesanan.transferDikonfirmasi
                  ? '⏳ MENUNGGU KONFIRMASI'
                  : '✓ LUNAS'}
              </div>

              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginTop: '8px' }}>
                <p>{profil.ucapanStruk}</p>
                <p>Simpan struk ini sebagai bukti pembayaran</p>
              </div>
            </div>
          </div>

          {/* Tombol cetak */}
          <div className="px-5 py-4 border-t border-ink-100">
            <button
              onClick={handleCetak}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak Struk
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
