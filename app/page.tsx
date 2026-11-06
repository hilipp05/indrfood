"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Timeout fallback: jika Firebase tidak merespons dalam 3 detik, tampilkan landing page
    const timeout = setTimeout(() => setChecking(false), 3000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (!user) { setChecking(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = String(snap.data()?.role ?? "").trim().toLowerCase();
        router.replace(role === "admin" ? "/admin" : "/beranda");
      } catch {
        setChecking(false);
      }
    });
    return () => { unsub(); clearTimeout(timeout); };
  }, [router]);

  // Tampilkan spinner singkat saat cek auth, hindari flash konten landing
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-black">IF</span>
          </div>
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-ink-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <span className="text-white text-xs font-black">IF</span>
            </div>
            <div>
              <span className="font-extrabold text-ink-900 text-base leading-none">IndriFood</span>
              <span className="block text-[10px] text-brand-500 font-semibold leading-none mt-0.5">Restoran &amp; Catering</span>
            </div>
          </div>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7">
            {[
              { label: "Beranda", href: "#beranda", active: true },
              { label: "Cara Pesan", href: "#cara-pesan" },
              { label: "Tentang Kami", href: "#tentang" },
              { label: "FAQ", href: "#faq" },
            ].map((n) => (
              <a
                key={n.label}
                href={n.href}
                className={`text-sm font-semibold transition-colors pb-0.5 ${
                  n.active
                    ? "text-brand-600 border-b-2 border-brand-600"
                    : "text-ink-600 hover:text-brand-600"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>

          {/* Auth buttons — desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-ink-600 hover:text-brand-600 transition-colors">
              Masuk
            </Link>
            <Link href="/register" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md">
              Daftar Gratis
            </Link>
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-ink-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5 text-ink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-ink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu — overlay, tidak mendorong konten */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <div
          className={`fixed top-[57px] left-0 right-0 z-50 md:hidden bg-white border-b border-ink-100 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pt-3 pb-4">
            {/* Nav links */}
            <div className="space-y-0.5">
              {[
                { label: "Beranda", href: "#", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                { label: "Cara Pesan", href: "#cara-pesan", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { label: "Tentang Kami", href: "#tentang", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "FAQ", href: "#faq", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              ].map((n, i) => (
                <a
                  key={n.label}
                  href={n.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-ink-700 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                  style={{
                    transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-12px)',
                    opacity: mobileMenuOpen ? 1 : 0,
                    transition: `transform 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, opacity 0.3s ease ${i * 60}ms`,
                  }}
                >
                  <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={n.icon} />
                    </svg>
                  </div>
                  {n.label}
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className="my-3 border-t border-ink-100" />

            {/* Auth buttons */}
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-brand-600 border-2 border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
                style={{
                  transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-12px)',
                  opacity: mobileMenuOpen ? 1 : 0,
                  transition: `transform 0.3s cubic-bezier(0.16,1,0.3,1) 240ms, opacity 0.3s ease 240ms`,
                }}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-md"
                style={{
                  transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-12px)',
                  opacity: mobileMenuOpen ? 1 : 0,
                  transition: `transform 0.3s cubic-bezier(0.16,1,0.3,1) 300ms, opacity 0.3s ease 300ms`,
                }}
              >
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="beranda" className="overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 pt-10 pb-16 md:pt-20 md:pb-28 grid md:grid-cols-12 gap-12 md:gap-8 items-center">
          <div className="md:col-span-6 lg:col-span-5">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-ink-900">
              Pesan makanan <span className="text-brand-600">favoritmu</span>, kapan saja.
            </h1>
            <p className="mt-6 text-base md:text-lg text-ink-600 max-w-md leading-relaxed">
              Ratusan menu dari dapur IndriFood. Pesan lewat HP, kami antar langsung ke mejamu.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/login" className="px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors">
                Mulai pesan
              </Link>
              <Link href="/register" className="text-sm font-bold text-ink-900 underline underline-offset-4 decoration-ink-300 hover:decoration-brand-600 transition-colors">
                Buat akun gratis
              </Link>
            </div>
            <dl className="mt-12 pt-6 border-t border-ink-200 grid grid-cols-3 gap-4 max-w-md">
              {[
                { v: "100+", l: "Menu tersedia" },
                { v: "Gratis", l: "Ongkir semua pesanan" },
                { v: "Antar", l: "Langsung ke meja" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-display text-2xl font-bold text-ink-900">{s.v}</dt>
                  <dd className="text-xs text-ink-500 mt-1 leading-snug">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-6 lg:col-span-7 relative pb-8 pl-0 sm:pl-8">
            <img
              src="/hero1.webp"
              alt="Nasi Box Spesial IndriFood"
              width={760}
              height={600}
              fetchPriority="high"
              className="w-full aspect-[5/4] object-cover rounded-3xl"
            />
            <img
              src="/hero2.jpg"
              alt="Aneka menu IndriFood"
              width={320}
              height={320}
              className="hidden sm:block absolute bottom-0 left-0 w-40 md:w-48 aspect-square object-cover rounded-2xl border-4 border-ink-50 shadow-lg"
            />
            <div className="absolute top-4 right-4 bg-ink-50 rounded-2xl px-4 py-3 shadow-md max-w-[13rem]">
              <p className="text-[11px] text-ink-500">Menu andalan</p>
              <p className="font-display font-bold text-ink-900 leading-tight">Nasi Box Spesial</p>
              <p className="text-xs text-ink-600 mt-1">Ayam, sayur, sambal · <span className="font-bold text-brand-700">Rp 25.000</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kenapa Memilih IndriFood ── */}
      <section id="fitur" className="bg-ink-100 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <h2 className="text-3xl md:text-4xl text-ink-900 max-w-xl">
            Restoran dan catering, satu aplikasi.
          </h2>
          <div className="mt-10 grid md:grid-cols-5 gap-4 md:gap-5">
            <div className="md:col-span-3 bg-ink-900 text-ink-50 rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-[16rem]">
              <p className="font-display text-6xl md:text-7xl font-bold text-brand-300">100+</p>
              <div className="mt-10">
                <h3 className="text-2xl">Menu beragam</h3>
                <p className="mt-2 text-ink-300 max-w-sm leading-relaxed">Pilihan makanan dan minuman yang selalu ada, dari satu porsi sampai pesanan banyak.</p>
              </div>
            </div>
            <div className="md:col-span-2 grid gap-4 md:gap-5">
              {[
                { t: "Pesan cepat", d: "Pilih menu, cek keranjang, selesai. Hanya beberapa ketukan." },
                { t: "Gratis ongkir", d: "Semua pesanan diantar tanpa biaya kirim." },
              ].map((f) => (
                <div key={f.t} className="bg-ink-50 rounded-3xl p-6 md:p-7 border border-ink-200">
                  <h3 className="text-xl text-ink-900">{f.t}</h3>
                  <p className="mt-2 text-sm text-ink-600 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cara Pemesanan ── */}
      <section id="cara-pesan" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-28">
              <h2 className="text-3xl md:text-4xl text-ink-900">Cara pemesanan</h2>
              <p className="mt-3 text-ink-600 max-w-xs">Empat langkah dari lapar sampai makanan tiba.</p>
            </div>
          </div>
          <ol className="md:col-span-8 border-t border-ink-200">
            {[
              { t: "Pilih menu", d: "Cari dan pilih menu favoritmu." },
              { t: "Lihat keranjang", d: "Periksa kembali pesananmu di keranjang." },
              { t: "Isi alamat", d: "Masukkan alamat pengiriman." },
              { t: "Pesan dan nikmati", d: "Pesanan dikonfirmasi dan siap diantar ke kamu." },
            ].map((s, i) => (
              <li key={s.t} className="grid grid-cols-[4rem_1fr] sm:grid-cols-[6rem_1fr] items-baseline py-6 border-b border-ink-200">
                <span className="font-display text-4xl sm:text-5xl font-bold text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl text-ink-900">{s.t}</h3>
                  <p className="mt-1 text-ink-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Banner CTA ── */}
      <section className="bg-brand-700 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-4xl text-white max-w-xl">Gratis ongkir untuk semua pesanan.</h3>
            <p className="text-brand-100 text-sm mt-2">Tanpa minimum pembelian. Berlaku setiap hari.</p>
          </div>
          <Link
            href="/login"
            className="px-7 py-3.5 bg-ink-50 text-brand-800 rounded-xl font-bold text-sm hover:bg-white transition-colors whitespace-nowrap shrink-0"
          >
            Pesan sekarang
          </Link>
        </div>
      </section>

      {/* ── Tentang Kami ── */}
      <section id="tentang" className="bg-white py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

            {/* Kiri — ilustrasi */}
            <div className="flex-1 w-full max-w-sm mx-auto md:mx-0">
              <div className="relative">
                {/* Background blob */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-50 rounded-3xl rotate-3" />
                {/* Foto makanan */}
                <div className="relative rounded-3xl overflow-hidden shadow-xl">
                  <img
                    src="/tentang%20kami.jpg"
                    alt="Tentang IndriFood"
                    className="w-full h-64 sm:h-72 object-cover"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.style.display = 'none';
                      if (t.parentElement) {
                        t.parentElement.innerHTML = '<div class="w-full h-64 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-8xl">🍽️</div>';
                      }
                    }}
                  />
                </div>
                {/* Badge floating */}
                <div className="absolute -bottom-4 -right-4 bg-brand-600 text-white rounded-2xl px-4 py-3 shadow-lg">
                  <p className="text-2xl font-extrabold leading-none">100+</p>
                  <p className="text-[10px] font-semibold opacity-90 mt-0.5">Menu Tersedia</p>
                </div>
                <div className="absolute -top-4 -left-4 bg-white rounded-2xl px-3 py-2.5 shadow-lg flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-sm font-extrabold text-ink-900 leading-none">4.9/5</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">Rating pelanggan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Kanan — teks */}
            <div className="flex-1 space-y-5 text-center md:text-left">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-bold border border-brand-100 mb-3">
                  🏪 Tentang Kami
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-ink-900 leading-tight">
                  Kenalan dengan <span className="text-brand-600">IndriFood</span>
                </h2>
              </div>

              <p className="text-ink-500 text-sm sm:text-base leading-relaxed">
                Menghadirkan makanan dan minuman berkualitas dengan cita rasa terbaik, dibuat dari bahan segar pilihan dan disajikan dengan pelayanan yang ramah.
              </p>
              <p className="text-ink-500 text-sm sm:text-base leading-relaxed">
                Nikmati pengalaman kuliner yang lezat, mudah, dan memuaskan dalam setiap pesanan.
              </p>

              {/* Nilai-nilai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { icon: "🥬", title: "Bahan Segar Pilihan", desc: "Setiap menu dibuat dari bahan berkualitas segar" },
                  { icon: "👨‍🍳", title: "Chef Berpengalaman", desc: "Dimasak oleh juru masak terlatih dan berdedikasi" },
                  { icon: "🛵", title: "Pengiriman Cepat", desc: "Pesanan tiba tepat waktu langsung ke mejamu" },
                  { icon: "💬", title: "Pelayanan Ramah", desc: "Kami siap melayani dengan sepenuh hati" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-3 bg-ink-50 rounded-xl">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-ink-900 leading-tight">{item.title}</p>
                      <p className="text-xs text-ink-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
              >
                Bergabung Sekarang
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-ink-50 py-12 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ink-900">
              Pertanyaan yang Sering <span className="text-brand-600">Ditanyakan</span>
            </h2>
            <div className="w-12 h-1 bg-brand-600 rounded-full mx-auto mt-3" />
            <p className="text-ink-400 text-sm mt-3">Ada pertanyaan? Kami sudah siapkan jawabannya.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Apakah bisa pesan online?",
                a: "Ya, kamu bisa pesan langsung melalui website kami. Cukup daftar akun, pilih menu favorit, dan pesanan akan segera kami proses.",
              },
              {
                q: "Apakah tersedia layanan antar?",
                a: "Tentu! Kami menyediakan layanan antar ke lokasi kamu. Gratis ongkir untuk semua pesanan tanpa minimum pembelian.",
              },
              {
                q: "Metode pembayaran apa saja yang tersedia?",
                a: "Saat ini kami menerima pembayaran tunai (cash) saat pesanan diterima.",
              },
              {
                q: "Bagaimana cara menghubungi kami?",
                a: "Kamu bisa menghubungi kami langsung melalui WhatsApp di nomor 082241415498. Kami siap membantu kamu setiap saat.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                >
                  <span className="font-bold text-ink-900 text-sm sm:text-base">{item.q}</span>
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${faqOpen === i ? 'bg-brand-600' : 'bg-ink-100'}`}>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${faqOpen === i ? 'rotate-180 text-white' : 'text-ink-500'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${faqOpen === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="px-5 pb-4 text-ink-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA hubungi */}
          <div className="mt-8 text-center">
            <p className="text-ink-400 text-sm mb-3">Masih ada pertanyaan lain?</p>
            <a
              href="https://wa.me/6282241415498"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Hubungi via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-ink-100 pt-10 md:pt-12 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-8 md:mb-10">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-md shrink-0">
                  <span className="text-white text-xs font-black">IF</span>
                </div>
                <div>
                  <span className="font-extrabold text-ink-900 text-base leading-none">IndriFood</span>
                  <span className="block text-[10px] text-brand-500 font-semibold leading-none mt-0.5">Restoran &amp; Catering</span>
                </div>
              </div>
              <p className="text-ink-400 text-xs leading-relaxed max-w-[220px]">
                Layanan pesan antar makanan online yang cepat, mudah, dan terpercaya.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                {/* Facebook */}
                <a href="https://www.facebook.com/share/1Y7HJ9Wmo9/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 bg-ink-100 hover:bg-brand-100 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                  </svg>
                </a>
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/philipp_srgr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 bg-ink-100 hover:bg-pink-100 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.516 2.497 5.783 2.225 7.15 2.163 8.416 2.105 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.053.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.856.601 3.698 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.856-.085 3.698-.601 5.038-1.942 1.341-1.34 1.857-3.182 1.942-5.038C23.986 15.668 24 15.259 24 12s-.014-3.667-.072-4.947c-.085-1.856-.601-3.698-1.942-5.038C20.646.673 18.804.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                </a>
                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@ph_dq"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-8 h-8 bg-ink-100 hover:bg-ink-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-ink-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Menu */}
            <div>
              <h5 className="font-extrabold text-ink-900 text-sm mb-3">Menu</h5>
              <ul className="space-y-2">
                {["Semua Menu", "Minuman", "Promo", "Paket Hemat"].map((item) => (
                  <li key={item}>
                    <Link href="/login" className="text-ink-400 text-xs hover:text-brand-600 transition-colors">{item}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Informasi */}
            <div>
              <h5 className="font-extrabold text-ink-900 text-sm mb-3">Informasi</h5>
              <ul className="space-y-2">
                {[
                  { label: "Tentang Kami", href: "#tentang" },
                  { label: "Cara Pesan", href: "#cara-pesan" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Syarat & Ketentuan", href: "#faq" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-ink-400 text-xs hover:text-brand-600 transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bantuan */}
            <div>
              <h5 className="font-extrabold text-ink-900 text-sm mb-3">Bantuan</h5>
              <ul className="space-y-2">
                {[
                  { label: "Hubungi Kami", href: "#tentang" },
                  { label: "Kebijakan Privasi", href: "#faq" },
                  { label: "Pengembalian Dana", href: "#faq" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-ink-400 text-xs hover:text-brand-600 transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-ink-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-ink-400 text-xs text-center sm:text-left">
              © 2025 IndriFood. Dibuat dengan ❤️ untuk pelanggan setia kami.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-xs text-ink-400 hover:text-brand-600 font-medium transition-colors">Masuk</Link>
              <Link href="/register" className="text-xs text-ink-400 hover:text-brand-600 font-medium transition-colors">Daftar</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
