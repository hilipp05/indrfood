import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="text-center max-w-sm w-full">
        {/* Illustration */}
        <div className="relative w-36 h-36 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-ink-700 to-ink-800 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">🔍</span>
          </div>
          <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl flex items-center justify-center shadow-lg rotate-12">
            <span className="text-white text-lg font-black -rotate-12">?</span>
          </div>
        </div>

        {/* Text */}
        <div className="mb-8">
          <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-400 leading-none mb-4">
            404
          </h1>
          <p className="text-xl font-extrabold text-ink-900">Halaman Tidak Ditemukan</p>
          <p className="text-ink-400 mt-2 text-sm leading-relaxed">
            Halaman admin yang kamu cari tidak ada atau sudah dipindahkan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ke Dashboard
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
      </div>
    </div>
  );
}
