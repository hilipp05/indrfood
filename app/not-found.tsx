'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NotFound() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl">🍽️</span>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-2 -right-2 w-14 h-14 bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl flex items-center justify-center shadow-lg rotate-12">
            <span className="text-white text-xl font-black -rotate-12">?</span>
          </div>
        </div>

        {/* Text */}
        <div className="mb-8">
          <h1 className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500 leading-none mb-4">
            404
          </h1>
          <p className="text-xl font-extrabold text-ink-900">Halaman Tidak Ditemukan</p>
          <p className="text-ink-400 mt-2 text-sm leading-relaxed">
            {isAdmin
              ? 'Halaman admin yang kamu cari tidak ada atau salah ketik URL.'
              : 'Sepertinya halaman yang kamu cari sudah habis atau tidak ada.\nYuk kembali dan pesan makanan favoritmu!'}
          </p>
        </div>

        {/* Actions */}
        {isAdmin ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Ke Dashboard Admin
            </Link>
            <Link
              href="/admin/pesanan"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-brand-200 text-brand-600 rounded-xl font-bold text-sm hover:bg-brand-50 hover:border-brand-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Kelola Pesanan
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/beranda"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Ke Beranda
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-brand-200 text-brand-600 rounded-xl font-bold text-sm hover:bg-brand-50 hover:border-brand-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Lihat Menu
            </Link>
          </div>
        )}

        {/* Branding */}
        <div className="mt-10 flex items-center justify-center gap-2 opacity-40">
          <div className="w-6 h-6 bg-gradient-to-br from-brand-600 to-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-[9px] font-black">IF</span>
          </div>
          <span className="text-xs font-bold text-ink-500">IndriFood</span>
        </div>
      </div>
    </div>
  );
}
