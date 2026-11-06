'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [nomorWA, setNomorWA] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: nama });
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        nama,
        email,
        nomorWA: nomorWA.trim(),
        role: 'pelanggan',
        createdAt: new Date().toISOString(),
      });
      router.push('/login');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar. Silakan login.');
      } else if (code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else if (code === 'auth/weak-password') {
        setError('Kata sandi terlalu lemah.');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ show }: { show: boolean }) => show ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-400/20 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-white text-3xl font-black">IF</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">IndriFood</h1>
          <p className="text-brand-100 text-lg mb-8">Bergabung & nikmati kemudahan pesan makanan</p>

          <div className="space-y-3 text-left max-w-xs mx-auto">
            {[
              { icon: '✓', text: 'Daftar gratis, tanpa biaya' },
              { icon: '✓', text: 'Lacak pesanan secara real-time' },
              { icon: '✓', text: 'Riwayat pesanan tersimpan' },
              { icon: '✓', text: 'Notifikasi status pesanan' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {item.icon}
                </span>
                <span className="text-brand-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-4">
          {/* Mobile logo + back button */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-sm font-black">IF</span>
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

          {/* Desktop back button */}
          <div className="hidden lg:block mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-brand-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali ke Beranda
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-ink-900">Buat Akun</h2>
            <p className="text-ink-400 mt-1.5">Isi data di bawah untuk mendaftar</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-ink-200 text-ink-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm placeholder:text-ink-400"
                placeholder="Nama kamu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1.5">
                Nomor WhatsApp
                <span className="ml-1 text-xs text-ink-400 font-normal">(untuk notifikasi pesanan)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-medium">+62</span>
                <input
                  type="tel"
                  value={nomorWA}
                  onChange={(e) => setNomorWA(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-ink-200 text-ink-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm placeholder:text-ink-400"
                  placeholder="8123456789"
                />
              </div>
            </div>

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
                  placeholder="Min. 6 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1.5">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white border border-ink-200 text-ink-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm placeholder:text-ink-400"
                  placeholder="Ulangi kata sandi"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                >
                  <EyeIcon show={showConfirmPassword} />
                </button>
              </div>
              {/* Password match indicator */}
              {confirmPassword && (
                <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {password === confirmPassword ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Kata sandi cocok
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Kata sandi tidak cocok
                    </>
                  )}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg hover: active:scale-[0.99] text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink-100 text-center">
            <p className="text-ink-500 text-sm">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline underline-offset-2">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
