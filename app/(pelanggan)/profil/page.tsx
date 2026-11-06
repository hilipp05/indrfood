'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useKeranjang } from '@/lib/keranjangContext';
import Link from 'next/link';

export default function ProfilPage() {
  const router = useRouter();
  const { kosongkan } = useKeranjang();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [nomorWA, setNomorWA] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editNomorWA, setEditNomorWA] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSukses, setResetSukses] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      setNama(user.displayName || '');
      setEditNama(user.displayName || '');
      setEmail(user.email || '');
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        if (snap.data().foto) setFoto(snap.data().foto);
        if (snap.data().nomorWA) {
          setNomorWA(snap.data().nomorWA);
          setEditNomorWA(snap.data().nomorWA);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    if (file.size > 1024 * 1024) { alert('Ukuran foto maksimal 1MB'); return; }
    setUploadingFoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      await setDoc(doc(db, 'users', auth.currentUser!.uid), { foto: base64 }, { merge: true });
      setFoto(base64);
      setUploadingFoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = async () => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'users', auth.currentUser.uid), { foto: null }, { merge: true });
    setFoto(null);
  };

  const handleSimpan = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    await updateProfile(auth.currentUser, { displayName: editNama });
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      nama: editNama,
      nomorWA: editNomorWA.trim(),
    }, { merge: true });
    setNama(editNama);
    setNomorWA(editNomorWA.trim());
    setEditing(false);
    setSaving(false);
    setSukses(true);
    setTimeout(() => setSukses(false), 2000);
  };

  const handleResetPassword = async () => {
    if (!email) return;
    setResetLoading(true);
    setResetError('');
    setResetSukses(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSukses(true);
      setTimeout(() => setResetSukses(false), 5000);
    } catch {
      setResetError('Gagal mengirim email. Coba lagi.');
      setTimeout(() => setResetError(''), 4000);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {    kosongkan();
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inisial = nama ? nama.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-ink-900">Profil Saya</h2>
        <p className="text-ink-400 text-sm mt-0.5">Kelola informasi akun kamu</p>
      </div>

      {/* Avatar Card */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl p-6 flex flex-col items-center gap-4 relative overflow-hidden shadow-lg">
        {/* Decorative */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative z-10 group">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center shadow-xl">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Foto profil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-black">{inisial}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFoto}
            className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity cursor-pointer"
          >
            {uploadingFoto ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
        </div>

        <div className="relative z-10 text-center">
          <p className="font-extrabold text-white text-xl">{nama || '-'}</p>
          <p className="text-brand-100 text-sm">{email}</p>
          <p className="text-brand-200/70 text-xs mt-1">Tap foto untuk mengubah · maks 1MB</p>
        </div>

        {foto && (
          <button onClick={handleHapusFoto} className="relative z-10 text-xs text-red-200 font-semibold hover:text-white transition-colors">
            Hapus foto
          </button>
        )}
      </div>

      {/* Info akun */}
      <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-ink-50 flex items-center justify-between bg-ink-50/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="font-bold text-ink-900 text-sm">Informasi Akun</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-brand-600 font-bold hover:underline underline-offset-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-1.5">Nama Lengkap</p>
            {editing ? (
              <input
                type="text"
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-900 focus:ring-2 focus:ring-brand-400 outline-none text-sm font-medium"
              />
            ) : (
              <p className="text-ink-800 font-semibold text-sm">{nama || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-1.5">Email</p>
            <p className="text-ink-800 font-semibold text-sm">{email}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-1.5">Kata Sandi</p>
            <div className="flex items-center justify-between">
              <p className="text-ink-800 font-semibold text-sm tracking-widest">••••••••</p>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-xs text-brand-600 font-bold hover:underline underline-offset-2 disabled:opacity-50 flex items-center gap-1"
              >
                {resetLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  'Reset Sandi'
                )}
              </button>
            </div>
            {resetSukses && (
              <div className="flex items-center gap-1.5 mt-2 text-green-600 text-xs font-semibold">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Link reset dikirim ke <span className="font-bold ml-1">{email}</span>
              </div>
            )}
            {resetError && (
              <p className="mt-2 text-xs text-red-500 font-medium">{resetError}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-1.5">
              Nomor WhatsApp
              {!nomorWA && !editing && (
                <span className="ml-2 text-orange-500 font-semibold normal-case tracking-normal">⚠️ Belum diisi</span>
              )}
            </p>
            {editing ? (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-medium">+62</span>
                <input
                  type="tel"
                  value={editNomorWA}
                  onChange={(e) => setEditNomorWA(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-900 focus:ring-2 focus:ring-brand-400 outline-none text-sm font-medium"
                  placeholder="8123456789"
                />
              </div>
            ) : (
              <p className="text-ink-800 font-semibold text-sm">
                {nomorWA ? `+62 ${nomorWA}` : <span className="text-ink-400 italic">Belum diisi — klik Edit untuk menambahkan</span>}
              </p>
            )}
          </div>
          {editing && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditNama(nama); }}
                className="flex-1 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors"
              >
                Batal
              </button>
            </div>
          )}
          {sukses && (
            <div className="flex items-center justify-center gap-1.5 text-green-600 text-xs font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profil berhasil diperbarui
            </div>
          )}
        </div>
      </div>

      {/* Menu akun lainnya */}
      <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden shadow-sm divide-y divide-ink-50">
        <Link href="/pesanan-saya" className="flex items-center gap-3 px-5 py-4 hover:bg-ink-50 transition-colors">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <span className="flex-1 text-sm font-semibold text-ink-800">Pesanan Saya</span>
          <svg className="w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link href="/menu" className="flex items-center gap-3 px-5 py-4 hover:bg-ink-50 transition-colors">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="flex-1 text-sm font-semibold text-ink-800">Lihat Menu</span>
          <svg className="w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-sm transition-colors border border-red-100 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Keluar dari Akun
      </button>
    </div>
  );
}
