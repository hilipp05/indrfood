'use client';

import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useKonfirmasiHapus, ModalKonfirmasiHapus } from '@/lib/useKonfirmasiHapus';

type Kategori = {
  id: string;
  nama: string;
  icon: string;
};

const emojiList = ['🍽️','🥘','🥤','🍿','🍰','🍔','🍜','🍗','🧋','🥑','🍦','🍱','☕','🍣','📦'];
const emptyForm = { nama: '', icon: '🍽️' };

const cardColors = [
  'from-brand-500 to-brand-600',
  'from-brand-500 to-brand-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-brand-600',
];

export default function KategoriPage() {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [jumlahProduk, setJumlahProduk] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { state: konfirmasiState, minta: mintaKonfirmasi, tutup: tutupKonfirmasi } = useKonfirmasiHapus();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kategori'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Kategori));
      setKategori(data);
      setLoading(false);

      data.forEach(async (k) => {
        const q = query(collection(db, 'menu'), where('kategori', '==', k.nama));
        const menuSnap = await getDocs(q);
        setJumlahProduk((prev) => ({ ...prev, [k.id]: menuSnap.size }));
      });
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setSaving(true);
    if (editId) {
      await updateDoc(doc(db, 'kategori', editId), { nama: form.nama, icon: form.icon });
    } else {
      await addDoc(collection(db, 'kategori'), { nama: form.nama, icon: form.icon });
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleEdit = (k: Kategori) => {
    setForm({ nama: k.nama, icon: k.icon });
    setEditId(k.id);
    setShowForm(true);
  };

  const handleHapus = (id: string, nama: string) => {
    mintaKonfirmasi({
      judul: 'Hapus Kategori',
      pesan: `Yakin ingin menghapus kategori "${nama}"? Menu yang menggunakan kategori ini tidak akan terhapus.`,
      labelHapus: 'Ya, Hapus',
      onYa: () => deleteDoc(doc(db, 'kategori', id)),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Kategori</h2>
          <p className="text-ink-400 text-sm mt-0.5">{kategori.length} kategori aktif</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-xl font-bold text-sm shadow-md transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kategori
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
              <h3 className="font-extrabold text-ink-900">{editId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
              <button
                onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                className="w-7 h-7 bg-ink-100 hover:bg-ink-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Ikon Kategori</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emojiList.map((e) => (
                      <button key={e} type="button" onClick={() => setForm({ ...form, icon: e })}
                        className={`text-2xl p-2 rounded-xl transition-all ${form.icon === e ? 'bg-brand-100 ring-2 ring-brand-400 scale-110' : 'hover:bg-ink-100'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Nama Kategori</label>
                  <input
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    required
                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all"
                    placeholder="Contoh: Makanan Berat"
                  />
                </div>

                {/* Preview */}
                <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-xl border border-ink-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-xl shadow-sm">
                    {form.icon}
                  </div>
                  <div>
                    <p className="text-xs text-ink-400 font-medium">Preview</p>
                    <p className="text-sm font-bold text-ink-800">{form.nama || 'Nama Kategori'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 shadow-sm">
                    {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                    className="flex-1 py-3 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold text-sm transition-colors">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && kategori.length === 0 && (
        <div className="bg-white rounded-2xl p-14 text-center border border-ink-100 shadow-sm">
          <span className="text-5xl">🗂️</span>
          <p className="mt-3 font-bold text-ink-700">Belum ada kategori. Tambahkan sekarang!</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kategori.map((k, idx) => (
          <div key={k.id} className="bg-white rounded-2xl border border-ink-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Top accent */}
            <div className={`h-1.5 bg-gradient-to-r ${cardColors[idx % cardColors.length]}`} />
            <div className="p-5 flex items-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${cardColors[idx % cardColors.length]} rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md`}>
                {k.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink-900 text-base truncate">{k.nama}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-ink-400 font-medium">{jumlahProduk[k.id] ?? 0} produk</span>
                  <span className="w-1 h-1 bg-ink-300 rounded-full" />
                  <span className="text-xs text-brand-500 font-semibold">Aktif</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleEdit(k)}
                  className="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleHapus(k.id, k.nama)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ModalKonfirmasiHapus state={konfirmasiState} onTutup={tutupKonfirmasi} />
    </div>
  );
}
