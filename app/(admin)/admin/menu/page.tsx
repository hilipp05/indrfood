'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useKonfirmasiHapus, ModalKonfirmasiHapus } from '@/lib/useKonfirmasiHapus';

type MenuItem = {
  id: string;
  nama: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  stok: 'Tersedia' | 'Habis';
  emoji: string;
  gambar?: string; // base64 foto
  unggulan: boolean;
};

const emojiList = ['🍳','🍜','🍗','🥣','🍔','🍕','🧋','🥤','🥑','🍟','🧅','🍦','🍱','☕','🍣'];
const emptyForm = {
  nama: '', deskripsi: '', kategori: '', harga: '',
  stok: 'Tersedia' as 'Tersedia' | 'Habis',
  emoji: '🍳', unggulan: false, gambar: '',
};

const cardGradients = [
  'from-brand-50 to-brand-100',
  'from-brand-50 to-brand-100',
  'from-emerald-50 to-teal-100',
  'from-amber-50 to-orange-100',
  'from-rose-50 to-pink-100',
  'from-cyan-50 to-brand-100',
];

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStok, setFilterStok] = useState<'Semua' | 'Tersedia' | 'Habis'>('Semua');
  const [uploadingGambar, setUploadingGambar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { state: konfirmasiState, minta: mintaKonfirmasi, tutup: tutupKonfirmasi } = useKonfirmasiHapus();

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kategori'), (snap) => {
      const names = snap.docs.map((d) => (d.data() as { nama: string }).nama).sort();
      setKategoriList(names);
      setForm((prev) => ({ ...prev, kategori: prev.kategori || names[0] || '' }));
    });
    return () => unsub();
  }, []);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB');
      return;
    }
    setUploadingGambar(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, gambar: ev.target?.result as string }));
      setUploadingGambar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = () => {
    setForm((prev) => ({ ...prev, gambar: '' }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.harga) return;
    setSaving(true);
    const data: Omit<MenuItem, 'id'> = {
      nama: form.nama,
      deskripsi: form.deskripsi,
      kategori: form.kategori,
      harga: Number(form.harga),
      stok: form.stok,
      emoji: form.emoji,
      unggulan: form.unggulan,
      gambar: form.gambar || '',
    };
    if (editId) {
      await updateDoc(doc(db, 'menu', editId), data);
    } else {
      await addDoc(collection(db, 'menu'), { ...data, createdAt: serverTimestamp() });
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm({ ...emptyForm, kategori: kategoriList[0] || '' });
  };

  const handleEdit = (item: MenuItem) => {
    setForm({
      nama: item.nama,
      deskripsi: item.deskripsi,
      kategori: item.kategori,
      harga: String(item.harga),
      stok: item.stok,
      emoji: item.emoji,
      unggulan: item.unggulan ?? false,
      gambar: item.gambar || '',
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleHapus = (id: string, nama: string) => {
    mintaKonfirmasi({
      judul: 'Hapus Menu',
      pesan: `Yakin ingin menghapus "${nama}"? Tindakan ini tidak bisa dibatalkan.`,
      labelHapus: 'Ya, Hapus',
      onYa: () => deleteDoc(doc(db, 'menu', id)),
    });
  };

  const handleToggleStok = async (item: MenuItem) => {
    await updateDoc(doc(db, 'menu', item.id), { stok: item.stok === 'Tersedia' ? 'Habis' : 'Tersedia' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ ...emptyForm, kategori: kategoriList[0] || '' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const filtered = items.filter((i) => {
    const cocokSearch = search === '' ||
      i.nama.toLowerCase().includes(search.toLowerCase()) ||
      i.kategori.toLowerCase().includes(search.toLowerCase());
    const cocokKategori = filterKategori === 'Semua' || i.kategori === filterKategori;
    const cocokStok = filterStok === 'Semua' || i.stok === filterStok;
    return cocokSearch && cocokKategori && cocokStok;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Kelola Menu</h2>
          <p className="text-ink-400 text-sm mt-0.5">{items.length} produk · tersinkron real-time</p>        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm, kategori: kategoriList[0] || '' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-xl font-bold text-sm shadow-md transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Menu
        </button>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-sm">
            <svg className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all bg-white shadow-sm"
            />
          </div>

          {/* Filter Stok */}
          <div className="flex items-center gap-1.5">
            {(['Semua', 'Tersedia', 'Habis'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStok(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  filterStok === s
                    ? s === 'Tersedia'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : s === 'Habis'
                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                      : 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {s === 'Tersedia' ? '✓ Tersedia' : s === 'Habis' ? '✕ Habis' : 'Semua Stok'}
              </button>
            ))}
          </div>

          {/* Jumlah hasil */}
          {(search || filterKategori !== 'Semua' || filterStok !== 'Semua') && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-ink-400">{filtered.length} hasil</span>
              <button
                onClick={() => { setSearch(''); setFilterKategori('Semua'); setFilterStok('Semua'); }}
                className="text-xs text-brand-600 font-semibold hover:underline underline-offset-2"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Filter Kategori */}
        {kategoriList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setFilterKategori('Semua')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                filterKategori === 'Semua'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              🍽️ Semua Kategori
            </button>
            {kategoriList.map((k) => (
              <button
                key={k}
                onClick={() => setFilterKategori(k)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filterKategori === k
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {k}
                <span className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  filterKategori === k ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500'
                }`}>
                  {items.filter((i) => i.kategori === k).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
              <h3 className="font-extrabold text-ink-900">{editId ? 'Edit Menu' : 'Tambah Menu Baru'}</h3>
              <button onClick={closeForm} className="w-7 h-7 bg-ink-100 hover:bg-ink-200 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Upload Foto */}
                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Foto Menu</label>
                  <div className="mt-2">
                    {form.gambar ? (
                      <div className="relative w-full h-40 rounded-xl overflow-hidden border border-ink-200 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.gambar} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="px-3 py-1.5 bg-white text-ink-800 rounded-lg text-xs font-bold hover:bg-ink-100 transition-colors"
                          >
                            Ganti Foto
                          </button>
                          <button
                            type="button"
                            onClick={handleHapusFoto}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingGambar}
                        className="w-full h-32 border-2 border-dashed border-ink-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-400 hover:bg-brand-50/50 transition-all text-ink-400 hover:text-brand-500"
                      >
                        {uploadingGambar ? (
                          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-semibold">Klik untuk upload foto</span>
                            <span className="text-[10px]">JPG, PNG · Maks 2MB</span>
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                  </div>
                  <p className="text-xs text-ink-400 mt-1.5">Jika tidak ada foto, ikon emoji akan digunakan sebagai fallback.</p>
                </div>

                {/* Emoji picker */}
                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Ikon Fallback</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emojiList.map((e) => (
                      <button key={e} type="button" onClick={() => setForm({ ...form, emoji: e })}
                        className={`text-2xl p-2 rounded-xl transition-all ${form.emoji === e ? 'bg-brand-100 ring-2 ring-brand-400 scale-110' : 'hover:bg-ink-100'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Nama Menu</label>
                  <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required
                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all" placeholder="Nasi Goreng Spesial" />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Deskripsi</label>
                  <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2}
                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all resize-none" placeholder="Deskripsi singkat..." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Kategori</label>
                    <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all">
                      {kategoriList.map((k) => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Harga (Rp)</label>
                    <input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} required
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 outline-none transition-all" placeholder="25000" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">Stok</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(['Tersedia', 'Habis'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setForm({ ...form, stok: s })}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                          form.stok === s
                            ? s === 'Tersedia' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-ink-500 border-ink-200 hover:border-ink-300'
                        }`}>
                        {s === 'Tersedia' ? '✓ Tersedia' : '✕ Habis'}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-ink-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all">
                  <input type="checkbox" checked={form.unggulan} onChange={(e) => setForm({ ...form, unggulan: e.target.checked })}
                    className="w-4 h-4 accent-brand-600 cursor-pointer" />
                  <div>
                    <p className="text-sm font-semibold text-ink-700">Tampilkan sebagai Menu Unggulan</p>
                    <p className="text-xs text-ink-400">Akan muncul di halaman beranda</p>
                  </div>
                </label>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving || uploadingGambar}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 shadow-sm">
                    {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Menu'}
                  </button>
                  <button type="button" onClick={closeForm}
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
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl p-14 text-center border border-ink-100 shadow-sm">
          <span className="text-5xl">🍽️</span>
          <p className="mt-3 font-bold text-ink-700">Belum ada menu. Tambahkan sekarang!</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item, idx) => (
          <div key={item.id} className={`bg-white rounded-2xl border border-ink-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${item.stok === 'Habis' ? 'opacity-70' : ''}`}>
            {/* Gambar / Emoji area */}
            <div className={`relative w-full h-44 ${item.gambar ? '' : `bg-gradient-to-br ${cardGradients[idx % cardGradients.length]}`} flex items-center justify-center overflow-hidden`}>
              {item.gambar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.gambar} alt={item.nama} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl">{item.emoji}</span>
              )}
              {/* Overlay badges */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-ink-700 rounded-full text-xs font-bold shadow-sm">
                {item.kategori}
              </span>
              <button
                onClick={() => handleToggleStok(item)}
                className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all shadow-sm ${
                  item.stok === 'Tersedia' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {item.stok === 'Tersedia' ? '✓ Tersedia' : '✕ Habis'}
              </button>
              {item.unggulan && (
                <span className="absolute bottom-3 left-3 text-xs font-bold bg-amber-400 text-white px-2.5 py-1 rounded-full shadow-sm">
                  ⭐ Unggulan
                </span>
              )}
              {/* Foto indicator */}
              {item.gambar && (
                <span className="absolute bottom-3 right-3 text-[10px] font-bold bg-white/80 backdrop-blur-sm text-ink-600 px-2 py-0.5 rounded-full">
                  📷 Foto
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-extrabold text-ink-900 text-base leading-tight">{item.nama}</h3>
              <p className="text-ink-400 text-xs mt-1 line-clamp-2 leading-relaxed">{item.deskripsi}</p>
              <p className="font-extrabold text-brand-700 text-lg mt-3">Rp {item.harga.toLocaleString('id-ID')}</p>
              <div className="flex gap-2 mt-3 pt-3 border-t border-ink-50">
                <button onClick={() => handleEdit(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button onClick={() => handleHapus(item.id, item.nama)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
