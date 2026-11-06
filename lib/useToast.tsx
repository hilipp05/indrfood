'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type Toast = {
  id: string;
  pesan: string;
  tipe: ToastType;
};

type ToastContextType = {
  tampilkan: (pesan: string, tipe?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ tampilkan: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const tampilkan = useCallback((pesan: string, tipe: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, pesan, tipe }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const hapus = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const styles: Record<ToastType, { bg: string; icon: string; text: string; border: string }> = {
    info:    { bg: 'bg-brand-600',   icon: 'ℹ️',  text: 'text-white', border: 'border-brand-500' },
    success: { bg: 'bg-green-600',  icon: '✅',  text: 'text-white', border: 'border-green-500' },
    warning: { bg: 'bg-orange-500', icon: '⚠️',  text: 'text-white', border: 'border-orange-400' },
    error:   { bg: 'bg-red-600',    icon: '❌',  text: 'text-white', border: 'border-red-500' },
  };

  return (
    <ToastContext.Provider value={{ tampilkan }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const s = styles[t.tipe];
          return (
            <div
              key={t.id}
              className={`${s.bg} ${s.text} rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 pointer-events-auto border ${s.border} animate-in slide-in-from-right-4 duration-300`}
            >
              <span className="text-lg flex-shrink-0">{s.icon}</span>
              <p className="text-sm font-semibold flex-1 leading-snug">{t.pesan}</p>
              <button
                onClick={() => hapus(t.id)}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
