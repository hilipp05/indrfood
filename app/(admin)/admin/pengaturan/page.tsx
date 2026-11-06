'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ProfilToko = {
  nama: string;
  tagline: string;
  telepon: string;
  alamat: string;
  ucapanStruk: string;
};

type JamOperasional = {
  aktif: boolean;
  jamBuka: string;
  jamTutup: string;
};

const defaultProfil: ProfilToko = {
  nama: 'IndriFood',
  tagline: 'Restoran & Catering',
  telepon: '0822-4141-5498',
  alamat: '',
  ucapanStruk: 'Terima kasih telah berbelanja!',
};

const defaultJam: JamOperasional = {
  aktif: false,
  jamBuka: '08:00',
  jamTutup: '22:00',
};

export default function PengaturanPage() {
  const [profil, setProfil] = useState<ProfilToko>(defaultProfil);
  const [form, setForm] = useState<ProfilToko>(defaultProfil);
  const [jam, setJam] = useState<JamOperasional>(defaultJam);
  const [formJam, setFormJam] = useState<JamOperasional>(defaultJam);
  const [saving, setSaving] = useState(false);
  const [savingJam, setSavingJam] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [suksesJam, setSuksesJam] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubProfil = onSnapshot(doc(db, 'pengaturan', 'profil'), (snap) => {
      if (snap.exists()) {
        const data = { ...defaultProfil, ...snap.data() } as ProfilToko;
        setProfil(data);
        setForm(data);
      }
      setLoading(false);
    });

    const unsubToko = onSnapshot(doc(db, 'pengaturan', 'toko'), (snap) => {
      if (snap.exists()) {
        const j = snap.data().jamOperasional as JamOperasional | undefined;
        if (j) {
          setJam(j);
          setFormJam(j);
        }
      }
    });

    return () => {
      unsubProfil();
      unsubToko();
    };
  }, []);

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, 'pengaturan', 'profil'), form, { merge: true });
    setProfil(form);
    setSaving(false);
    setSukses(true);
    setTimeout(() => setSukses(false), 2500);
  };

  const handleSimpanJam = async () => {
    setSavingJam(true);
    await setDoc(doc(db, 'pengaturan', 'toko'), { jamOperasional: formJam }, { merge: true });
    setJam(formJam);
    setSavingJam(false);
    setSuksesJam(true);
    setTimeout(() => setSuksesJam(false), 2500);
  };

  const berubah = JSON.stringify(form) !== JSON.stringify(profil);
  const jamBerubah = JSON.stringify(formJam) !== JSON.stringify(jam);

  // Hitung status jam sekarang
  const statusJamSekarang = (() => {
    if (!formJam.aktif) return null;
    const now = new Date();
    const [bH, bM] = formJam.jamBuka.split(':').map(Number);
    const [tH, tM] = formJam.jamTutup.split(':').map(Number);
    const nowM = now.getHours() * 60 + now.getMinutes();
    const bukaM = bH * 60 + bM;
    const tutupM = tH * 60 + tM;
    const dalamJam = bukaM <= tutupM
      ? nowM >= bukaM && nowM < tutupM
      : nowM >= bukaM || nowM < tutupM;
    return dalamJam ? 'buka' : 'tutup';
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-ink-900">Pengaturan Toko</h2>
        <p className="text-ink-400 text-sm mt-0.5">Informasi toko yang tampil di struk dan halaman pelanggan</p>
      </div>

      {/* ── Jam Operasional ── */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-50 bg-ink-50/50 flex items-center justify-between">
          <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
            <span className="text-base">🕐</span> Jam Operasional Otomatis
          </h3>
          {formJam.aktif && statusJamSekarang && (
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
              statusJamSekarang === 'buka'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusJamSekarang === 'buka' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              Sekarang: {statusJamSekarang === 'buka' ? 'Buka' : 'Tutup'}
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-800">Aktifkan Jam Otomatis</p>
              <p className="text-xs text-ink-400 mt-0.5">Toko otomatis buka/tutup sesuai jadwal</p>
            </div>
            <button
              type="button"
              onClick={() => setFormJam({ ...formJam, aktif: !formJam.aktif })}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                formJam.aktif ? 'bg-brand-600' : 'bg-ink-200'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                formJam.aktif ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {formJam.aktif && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Jam Buka</label>
                <input
                  type="time"
                  value={formJam.jamBuka}
                  onChange={(e) => setFormJam({ ...formJam, jamBuka: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Jam Tutup</label>
                <input
                  type="time"
                  value={formJam.jamTutup}
                  onChange={(e) => setFormJam({ ...formJam, jamTutup: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {formJam.aktif && (
            <div className="flex items-start gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5">
              <span className="text-sm mt-0.5">ℹ️</span>
              <p className="text-xs text-brand-700">
                Toko akan otomatis <strong>buka</strong> pukul <strong>{formJam.jamBuka}</strong> dan <strong>tutup</strong> pukul <strong>{formJam.jamTutup}</strong>. Toggle manual di dashboard tetap bisa override.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSimpanJam}
              disabled={savingJam || !jamBerubah}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingJam ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Jadwal
                </>
              )}
            </button>
            {jamBerubah && !savingJam && (
              <button
                type="button"
                onClick={() => setFormJam(jam)}
                className="px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors"
              >
                Reset
              </button>
            )}
            {suksesJam && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tersimpan
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSimpan} className="space-y-5">
        {/* Identitas Toko */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-50 bg-ink-50/50">
            <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
              <span className="text-base">🏪</span> Identitas Toko
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Nama Toko</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
                placeholder="IndriFood"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Tagline / Deskripsi Singkat</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
                placeholder="Restoran & Catering"
              />
            </div>
          </div>
        </div>

        {/* Kontak */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-50 bg-ink-50/50">
            <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
              <span className="text-base">📞</span> Kontak & Lokasi
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Nomor Telepon / WhatsApp</label>
              <input
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
                placeholder="0822-xxxx-xxxx"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Alamat Toko</label>
              <textarea
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                rows={2}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all resize-none"
                placeholder="Jl. Contoh No. 1, Kota..."
              />
            </div>
          </div>
        </div>

        {/* Struk */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-50 bg-ink-50/50">
            <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
              <span className="text-base">🧾</span> Pengaturan Struk
            </h3>
          </div>
          <div className="p-5">
            <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Ucapan di Bawah Struk</label>
            <input
              value={form.ucapanStruk}
              onChange={(e) => setForm({ ...form, ucapanStruk: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
              placeholder="Terima kasih telah berbelanja!"
            />
            <p className="text-xs text-ink-400 mt-1.5">Muncul di bagian bawah struk pembayaran pelanggan</p>
          </div>
        </div>

        {/* Preview struk mini */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-50 bg-ink-50/50">
            <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
              <span className="text-base">👁️</span> Preview Header Struk
            </h3>
          </div>
          <div className="p-5">
            <div className="font-mono text-xs text-center text-ink-800 bg-ink-50 rounded-xl p-4 border border-dashed border-ink-200">
              <p className="font-black text-base tracking-widest">{form.nama || 'NAMA TOKO'}</p>
              <p className="text-ink-500 mt-0.5">{form.tagline || 'Tagline'}</p>
              {form.telepon && <p className="text-ink-500">Telp: {form.telepon}</p>}
              {form.alamat && <p className="text-ink-500 mt-0.5 text-[10px]">{form.alamat}</p>}
              <p className="border-t border-dashed border-ink-300 mt-2 pt-2 text-ink-400 text-[10px]">{form.ucapanStruk}</p>
            </div>
          </div>
        </div>

        {/* Tombol simpan */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !berubah}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Perubahan
              </>
            )}
          </button>
          {berubah && !saving && (
            <button
              type="button"
              onClick={() => setForm(profil)}
              className="px-4 py-3 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors"
            >
              Reset
            </button>
          )}
          {sukses && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Tersimpan
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
