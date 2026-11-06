'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useNotifSuara } from '@/lib/useNotifSuara';
import { useToast } from '@/lib/useToast';

type NotifItem = {
  id: string;
  pesananId: string;
  status: string;
  pesan: string;
  waktu: number;
  dibaca: boolean;
};

type NotifContextType = {
  notifs: NotifItem[];
  jumlahBelumDibaca: number;
  tandaiDibaca: () => void;
};

const NotifContext = createContext<NotifContextType>({
  notifs: [],
  jumlahBelumDibaca: 0,
  tandaiDibaca: () => {},
});

const pesanStatus: Record<string, { pesan: string; tipe: 'info' | 'success' | 'warning' | 'error' }> = {
  'Menunggu Pembayaran': { pesan: '⏳ Pesananmu menunggu pembayaran.', tipe: 'warning' },
  Baru:       { pesan: '🎉 Pesananmu berhasil diterima!', tipe: 'success' },
  Diproses:   { pesan: '👨‍🍳 Pesananmu sedang diproses!', tipe: 'info' },
  Dikirim:    { pesan: '🛵 Pesananmu sedang dalam perjalanan!', tipe: 'info' },
  Selesai:    { pesan: '✅ Pesananmu telah selesai. Terima kasih!', tipe: 'success' },
  Dibatalkan: { pesan: '❌ Pesananmu telah dibatalkan.', tipe: 'error' },
};

export function NotifPelangganProvider({ children }: { children: ReactNode }) {
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const statusTerakhir = useRef<Map<string, string>>(new Map());
  const sudahInit = useRef(false);
  const { mainkanSuara } = useNotifSuara();
  const { tampilkan } = useToast();

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) unsubSnap();
      statusTerakhir.current = new Map();
      sudahInit.current = false;
      if (!user) { setNotifs([]); return; }

      const q = query(
        collection(db, 'pesanan'),
        where('pelangganId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { status: string }) }));

        if (!sudahInit.current) {
          data.forEach((p) => statusTerakhir.current.set(p.id, p.status));
          sudahInit.current = true;
          return;
        }

        data.forEach((p) => {
          const lama = statusTerakhir.current.get(p.id);

          // Pesanan baru (belum ada di map) — notif "pesanan diterima"
          if (lama === undefined && pesanStatus[p.status]) {
            const cfg = pesanStatus[p.status];
            const notifBaru: NotifItem = {
              id: `${p.id}_${p.status}_${Date.now()}`,
              pesananId: p.id,
              status: p.status,
              pesan: cfg.pesan,
              waktu: Date.now(),
              dibaca: false,
            };
            setNotifs((prev) => [notifBaru, ...prev].slice(0, 20));
            tampilkan(cfg.pesan, cfg.tipe);
            mainkanSuara('status-update');
          }

          // Status berubah
          if (lama !== undefined && lama !== p.status && pesanStatus[p.status]) {
            const cfg = pesanStatus[p.status];
            const notifBaru: NotifItem = {
              id: `${p.id}_${p.status}_${Date.now()}`,
              pesananId: p.id,
              status: p.status,
              pesan: cfg.pesan,
              waktu: Date.now(),
              dibaca: false,
            };
            setNotifs((prev) => [notifBaru, ...prev].slice(0, 20));
            tampilkan(cfg.pesan, cfg.tipe);
            mainkanSuara('status-update');
          }

          statusTerakhir.current.set(p.id, p.status);
        });
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [mainkanSuara, tampilkan]);

  const tandaiDibaca = useCallback(() => {
    setNotifs((prev) => prev.map((n) => ({ ...n, dibaca: true })));
  }, []);

  const jumlahBelumDibaca = notifs.filter((n) => !n.dibaca).length;

  return (
    <NotifContext.Provider value={{ notifs, jumlahBelumDibaca, tandaiDibaca }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifPelanggan() {
  return useContext(NotifContext);
}
