import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/lib/ErrorBoundary";

// Fraunces: serif hangat untuk judul (nuansa dapur/restoran). Plus Jakarta Sans: body yang jelas terbaca.
const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IndriFood — Pesan Makanan Online",
  description: "Pesan makanan lezat dengan mudah dan cepat",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "IndriFood — Pesan Makanan Online",
    description: "Pesan makanan lezat dengan mudah dan cepat",
    url: "https://indrfood.vercel.app",
    siteName: "IndriFood",
    images: [
      {
        url: "https://indrfood.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "IndriFood — Pesan Makanan Online",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IndriFood — Pesan Makanan Online",
    description: "Pesan makanan lezat dengan mudah dan cepat",
    images: ["https://indrfood.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
