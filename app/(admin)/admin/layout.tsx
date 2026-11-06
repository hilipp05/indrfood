'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import LiveClock from './_components/LiveClock';
import WaBotStatus from './_components/WaBotStatus';
import ErrorBoundary from '@/lib/ErrorBoundary';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', color: 'text-brand-400' },
  { href: '/admin/pesanan', label: 'Pesanan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-brand-400' },
  { href: '/admin/menu', label: 'Produk', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-brand-400' },
  { href: '/admin/kategori', label: 'Kategori', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', color: 'text-emerald-400' },
  { href: '/admin/pelanggan', label: 'Pelanggan', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-amber-400' },
  { href: '/admin/ulasan', label: 'Ulasan', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', color: 'text-amber-400' },
  { href: '/admin/laporan', label: 'Laporan', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-rose-400' },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-ink-400' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminNama, setAdminNama] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/login'); return; }
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.data();
      const role = String(data?.role ?? '').trim().toLowerCase();
      if (role !== 'admin') { router.replace('/beranda'); return; }
      setAdminNama(data?.nama || user.displayName || 'Admin');
      setAdminEmail(user.email || '');
      setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
            <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
          </div>
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ink-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
            <img src="/logo.png" alt="IndriFood" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-extrabold text-white text-sm leading-tight">IndriFood</p>
            <p className="text-ink-400 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest px-3 mb-2">Menu Utama</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-ink-400 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <svg className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profil bawah */}
      <div className="px-4 py-4 border-t border-ink-800">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-xs font-black">
              {adminNama.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold leading-tight truncate">{adminNama}</p>
            <p className="text-ink-400 text-[10px] truncate">{adminEmail}</p>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(auth); router.replace('/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-xs font-semibold"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Keluar
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-ink-50">

      {/* Sidebar Desktop — persistent */}
      <aside className="hidden lg:flex w-60 bg-ink-900 text-white flex-col fixed top-0 left-0 h-full z-30 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Mobile — slide in */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-ink-900 text-white flex flex-col z-30 transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button onClick={() => setMobileOpen(false)} className="text-ink-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content — offset untuk sidebar desktop */}
      <div className="flex-1 flex flex-col lg:ml-60">
        {/* Topbar */}
        <header className="bg-white border-b border-ink-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-ink-500 hover:text-brand-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="text-ink-400">Admin</span>
              <svg className="w-3 h-3 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold text-ink-700">
                {navItems.find((n) => n.href === pathname)?.label ?? 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WaBotStatus />
            <LiveClock />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-ink-200">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-600 to-brand-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-[10px] font-black">{adminNama.slice(0, 2).toUpperCase()}</span>
              </div>
              <span className="text-sm font-semibold text-ink-700">{adminNama}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
      </div>
    </div>
  );
}
