'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type ItemKeranjang = {
  id: string;
  nama: string;
  harga: number;
  emoji: string;
  qty: number;
};

type KeranjangContextType = {
  items: ItemKeranjang[];
  tambah: (item: Omit<ItemKeranjang, 'qty'>) => void;
  kurang: (id: string) => void;
  hapus: (id: string) => void;
  kosongkan: () => void;
  pesanLagi: (itemList: Omit<ItemKeranjang, 'qty'>[]) => void;
  total: number;
  jumlahItem: number;
};

const KeranjangContext = createContext<KeranjangContextType | null>(null);
const STORAGE_KEY = 'keranjang_items';
const STORAGE_UID_KEY = 'keranjang_uid';

export function KeranjangProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemKeranjang[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load dari localStorage saat pertama mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // localStorage tidak tersedia
    }
    setHydrated(true);
  }, []);

  // Bersihkan keranjang jika user berbeda login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        const savedUid = localStorage.getItem(STORAGE_UID_KEY);
        if (user) {
          if (savedUid && savedUid !== user.uid) {
            // User berbeda — bersihkan keranjang lama
            setItems([]);
            localStorage.removeItem(STORAGE_KEY);
          }
          localStorage.setItem(STORAGE_UID_KEY, user.uid);
        } else {
          // Logout — bersihkan
          setItems([]);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_UID_KEY);
        }
      } catch {
        // ignore
      }
    });
    return () => unsub();
  }, []);

  // Simpan ke localStorage setiap kali items berubah (setelah hydrated)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage tidak tersedia
    }
  }, [items, hydrated]);

  const tambah = (item: Omit<ItemKeranjang, 'qty'>) => {
    setItems((prev) => {
      const ada = prev.find((i) => i.id === item.id);
      if (ada) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const kurang = (id: string) => {
    setItems((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter((i) => i.qty > 0)
    );
  };

  const hapus = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const kosongkan = () => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // Tambahkan semua item dari pesanan lama ke keranjang (qty 1 per item)
  const pesanLagi = (itemList: Omit<ItemKeranjang, 'qty'>[]) => {
    setItems((prev) => {
      const next = [...prev];
      itemList.forEach((item) => {
        const ada = next.find((i) => i.id === item.id);
        if (ada) {
          ada.qty += 1;
        } else {
          next.push({ ...item, qty: 1 });
        }
      });
      return next;
    });
  };

  const total = items.reduce((sum, i) => sum + i.harga * i.qty, 0);
  const jumlahItem = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <KeranjangContext.Provider value={{ items, tambah, kurang, hapus, kosongkan, pesanLagi, total, jumlahItem }}>
      {children}
    </KeranjangContext.Provider>
  );
}

export function useKeranjang() {
  const ctx = useContext(KeranjangContext);
  if (!ctx) throw new Error('useKeranjang harus dipakai di dalam KeranjangProvider');
  return ctx;
}
