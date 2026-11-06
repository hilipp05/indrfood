'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type JamOperasional = {
  aktif: boolean;
  jamBuka: string;  // format "HH:MM"
  jamTutup: string; // format "HH:MM"
};

export type StatusToko = {
  isOpen: boolean;
  pesanTutup: string;
  loading: boolean;
  jamOperasional?: JamOperasional;
};

/** Cek apakah waktu sekarang berada dalam rentang jam operasional */
function cekDalamJamOperasional(jam: JamOperasional): boolean {
  if (!jam.aktif || !jam.jamBuka || !jam.jamTutup) return true;
  const now = new Date();
  const [bukaH, bukaM] = jam.jamBuka.split(':').map(Number);
  const [tutupH, tutupM] = jam.jamTutup.split(':').map(Number);
  const nowMenit = now.getHours() * 60 + now.getMinutes();
  const bukaMenit = bukaH * 60 + bukaM;
  const tutupMenit = tutupH * 60 + tutupM;

  // Handle overnight (misal: 22:00 - 02:00)
  if (bukaMenit <= tutupMenit) {
    return nowMenit >= bukaMenit && nowMenit < tutupMenit;
  } else {
    return nowMenit >= bukaMenit || nowMenit < tutupMenit;
  }
}

export function useStatusToko(): StatusToko {
  const [isOpenManual, setIsOpenManual] = useState(true);
  const [pesanTutup, setPesanTutup] = useState('Maaf, toko sedang tutup. Silakan kembali lagi nanti.');
  const [loading, setLoading] = useState(true);
  const [jamOperasional, setJamOperasional] = useState<JamOperasional | undefined>(undefined);
  const [waktuSekarang, setWaktuSekarang] = useState(new Date());

  // Tick setiap menit untuk re-evaluasi jam operasional
  useEffect(() => {
    const interval = setInterval(() => setWaktuSekarang(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'pengaturan', 'toko'), (snap) => {
      if (snap.exists()) {
        setIsOpenManual(snap.data().isOpen ?? true);
        setPesanTutup(snap.data().pesanTutup || 'Maaf, toko sedang tutup. Silakan kembali lagi nanti.');
        const jam = snap.data().jamOperasional as JamOperasional | undefined;
        setJamOperasional(jam);
      } else {
        setIsOpenManual(true);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // isOpen = manual toggle AND (jam operasional tidak aktif OR dalam jam operasional)
  const dalamJam = jamOperasional?.aktif
    ? cekDalamJamOperasional(jamOperasional)
    : true;

  // Suppress waktuSekarang lint warning — dipakai untuk re-render tiap menit
  void waktuSekarang;

  const isOpen = isOpenManual && dalamJam;

  return { isOpen, pesanTutup, loading, jamOperasional };
}
