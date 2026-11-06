# IndriFood WA Bot

Bot WhatsApp untuk mengirim notifikasi status pesanan ke pelanggan.

## Setup

```bash
cd wa-bot
npm install
node bot.js
```

Scan QR Code yang muncul di terminal menggunakan WhatsApp admin.
Session tersimpan otomatis — tidak perlu scan ulang kecuali logout.

## Cara Kerja

1. Bot jalan di `http://localhost:3001`
2. Next.js memanggil `POST /kirim-notif` saat admin update status pesanan
3. Bot kirim pesan WA ke nomor pelanggan

## Matikan Bot

Tekan `Ctrl+C` di terminal untuk mematikan bot.

## Status yang Dinotifikasi

- **Diproses** — pesanan sedang disiapkan
- **Dikirim** — pesanan dalam perjalanan
- **Selesai** — pesanan selesai
- **Dibatalkan** — pesanan dibatalkan
