import { useCallback, useEffect } from 'react';

// Singleton AudioContext — satu instance untuk seluruh aplikasi
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  }
  return audioCtx;
}

// Resume AudioContext saat ada interaksi user (dipanggil sekali dari hook)
let resumeListenerAttached = false;
function attachResumeListener() {
  if (resumeListenerAttached) return;
  resumeListenerAttached = true;
  const resume = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  window.addEventListener('click', resume);
  window.addEventListener('keydown', resume);
  window.addEventListener('touchstart', resume);
}

/**
 * Suara notifikasi menggunakan Web Audio API.
 * AudioContext dibuat sebagai singleton agar resume dari satu komponen
 * berlaku untuk semua komponen yang menggunakan hook ini.
 */
export function useNotifSuara() {
  useEffect(() => {
    attachResumeListener();
  }, []);

  const mainkanSuara = useCallback((jenis: 'pesanan-masuk' | 'status-update') => {
    try {
      const ctx = getAudioCtx();

      const play = () => {
        if (jenis === 'pesanan-masuk') {
          // Tiga nada naik — keras lalu lembut
          const nada = [660, 880, 1100];
          nada.forEach((frekuensi, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = frekuensi;

            const mulai = ctx.currentTime + i * 0.2;
            gain.gain.setValueAtTime(0, mulai);
            gain.gain.linearRampToValueAtTime(0.8, mulai + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, mulai + 1.2);

            osc.start(mulai);
            osc.stop(mulai + 1.2);
          });
        } else {
          // Satu nada untuk status update pelanggan
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = 740;

          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.4);
        }
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(play);
      } else {
        play();
      }
    } catch {
      // Browser tidak support Web Audio API
    }
  }, []);

  return { mainkanSuara };
}
