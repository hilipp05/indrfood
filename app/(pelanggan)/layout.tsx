'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { KeranjangProvider, useKeranjang } from '@/lib/keranjangContext';
import { ToastProvider } from '@/lib/useToast';
import { NotifPelangganProvider, useNotifPelanggan } from '@/lib/useNotifPelanggan';
import ErrorBoundary from '@/lib/ErrorBoundary';

// Halaman yang wajib login
const halamanProteksi = ['/keranjang', '/pesanan-saya', '/profil'];

const navItems = [
  { href: '/beranda', label: 'Beranda', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/menu', label: 'Menu', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/keranjang', label: 'Keranjang', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  { href: '/pesanan-saya', label: 'Pesanan', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
];

export default function PelangganLayout({ children }: { children: React.ReactNode }) {
  return (
    <KeranjangProvider>
      <ToastProvider>
        <NotifPelangganProvider>
          <LayoutInner>{children}</LayoutInner>
        </NotifPelangganProvider>
      </ToastProvider>
    </KeranjangProvider>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { jumlahItem } = useKeranjang();
  const { notifs, jumlahBelumDibaca, tandaiDibaca } = useNotifPelanggan();
  const [showNotif, setShowNotif] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown notif saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Tampilkan tombol scroll to top setelah scroll 300px
  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!halamanProteksi.includes(pathname)) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/login');
    });
    return () => unsub();
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-ink-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/beranda" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
              <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-extrabold text-ink-900 text-base leading-none">IndriFood</span>
              <span className="block text-[10px] text-brand-500 font-semibold leading-none mt-0.5">Restoran & Catering</span>
            </div>
          </Link>

          {/* Nav links desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all relative ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-ink-500 hover:bg-brand-50 hover:text-brand-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.label}
                  {item.href === '/keranjang' && jumlahItem > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                      {jumlahItem > 9 ? '9+' : jumlahItem}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bell Notifikasi */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotif((v) => !v); if (!showNotif) tandaiDibaca(); }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative ${
                showNotif ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 hover:bg-brand-50 hover:text-brand-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {jumlahBelumDibaca > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {jumlahBelumDibaca > 9 ? '9+' : jumlahBelumDibaca}
                </span>
              )}
            </button>

            {/* Dropdown notifikasi */}
            {showNotif && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-ink-100 z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-ink-50 flex items-center justify-between">
                  <p className="font-bold text-ink-900 text-sm">Notifikasi</p>
                  {notifs.length > 0 && (
                    <button onClick={tandaiDibaca} className="text-xs text-brand-600 font-semibold hover:underline">
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <span className="text-3xl">🔔</span>
                      <p className="text-ink-400 text-xs mt-2">Belum ada notifikasi</p>
                    </div>
                  ) : (
                    notifs.map((n) => (
                      <Link
                        key={n.id}
                        href="/pesanan-saya"
                        onClick={() => setShowNotif(false)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-ink-50 transition-colors border-b border-ink-50 last:border-0 ${!n.dibaca ? 'bg-brand-50/50' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.dibaca ? 'bg-brand-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-800 font-medium leading-snug">{n.pesan}</p>
                          <p className="text-xs text-ink-400 mt-0.5">
                            #{n.pesananId.slice(0, 8).toUpperCase()} · {new Date(n.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profil */}
          <Link
            href="/profil"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              pathname === '/profil'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-ink-100 text-ink-500 hover:bg-brand-50 hover:text-brand-600'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </Link>
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-ink-100 bg-white">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2.5 text-xs font-semibold transition-colors relative ${
                  isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-600 rounded-full" />
                )}
                <div className="relative">
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.href === '/keranjang' && jumlahItem > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {jumlahItem > 9 ? '9+' : jumlahItem}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

      {/* Footer */}
      <footer className="border-t border-ink-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs text-ink-400">© 2025 IndriFood. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-ink-500">IndriFood</span>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Kembali ke atas"
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 w-10 h-10 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg flex items-center justify-center transition-all duration-300 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
