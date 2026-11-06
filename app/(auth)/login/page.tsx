'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const snap = await getDoc(doc(db, 'users', user.uid));
      const roleRaw = snap.data()?.role;
      const role = String(roleRaw ?? '').trim().toLowerCase() === 'admin' ? 'admin' : 'pelanggan';
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/beranda';
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Email atau kata sandi salah.');
      } else if (code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Coba lagi nanti.');
      } else if (code === 'auth/network-request-failed') {
        setError('Koneksi bermasalah. Periksa internet kamu.');
      } else if (code === 'auth/user-disabled') {
        setError('Akun ini telah dinonaktifkan.');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Masukkan email kamu terlebih dahulu, lalu klik "Lupa sandi?".');
      return;
    }
    setError('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setError('Email tidak ditemukan atau tidak valid.');
      } else {
        setError('Gagal mengirim email reset. Coba lagi.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-400/20 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 right-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl overflow-hidden">
            <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">IndriFood</h1>
          <p className="text-brand-100 text-lg mb-8">Restoran & Catering</p>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {[
              { icon: '🍽️', text: 'Ratusan menu lezat pilihan' },
              { icon: '🛵', text: 'Gratis ongkir semua pesanan' },
              { icon: '⚡', text: 'Pemesanan cepat & mudah' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white font-medium text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile: logo + back */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
                <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-extrabold text-ink-900 text-base leading-none">IndriFood</p>
                <p className="text-brand-500 text-xs font-semibold">Restoran & Catering</p>
              </div>
            </div>
            <Link href="/" className="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </Link>
          </div>

          {/* Desktop: back link */}
          <div className="hidden lg:block mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-brand-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali ke Beranda
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-ink-900">Selamat Datang</h2>
            <p className="text-ink-400 mt-1.5">Masuk ke akun kamu untuk melanjutkan</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {resetSent && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Link reset dikirim ke <strong className="ml-1">{email}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-ink-200 text-ink-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm placeholder:text-ink-400"
                placeholder="nama@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white border border-ink-200 text-ink-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm placeholder:text-ink-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border-ink-300 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-sm text-ink-600 font-medium">Ingat saya</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm text-brand-600 hover:text-brand-700 font-semibold hover:underline underline-offset-2 disabled:opacity-50"
              >
                {resetLoading ? 'Mengirim...' : 'Lupa sandi?'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg hover: active:scale-[0.99] text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-ink-100 text-center">
            <p className="text-ink-500 text-sm">
              Belum punya akun?{' '}
              <Link href="/register" className="text-brand-600 hover:text-brand-700 font-bold hover:underline underline-offset-2">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
