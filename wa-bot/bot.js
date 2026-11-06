const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

// ── Konfigurasi ──────────────────────────────────────────────
const PORT = 3001; // Port bot (Next.js jalan di 3000)

// ── WhatsApp Client ──────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wa-session' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

let isReady = false;

// QR Code — scan dengan HP admin
client.on('qr', (qr) => {
  console.log('\n========================================');
  console.log('  Scan QR Code ini dengan WhatsApp Admin');
  console.log('========================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  console.log('\n✅ WhatsApp Bot siap! Nomor:', client.info.wid.user);
  console.log(`🚀 Server berjalan di http://localhost:${PORT}\n`);
});

client.on('authenticated', () => {
  console.log('🔐 Autentikasi berhasil, session tersimpan.');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Autentikasi gagal:', msg);
  isReady = false;
});

client.on('disconnected', (reason) => {
  console.log('⚠️  Bot terputus:', reason);
  isReady = false;

  // Tunggu sebentar lalu reinisialisasi agar file session tidak terkunci
  setTimeout(() => {
    console.log('🔄 Mencoba reinisialisasi...');
    client.initialize().catch((err) => {
      console.error('❌ Gagal reinisialisasi:', err.message);
    });
  }, 5000);
});

// Tangkap error yang tidak tertangani dari LocalAuth atau Puppeteer
process.on('uncaughtException', (err) => {
  const msg = err.message || '';
  if (IGNORED_ERRORS.some((e) => msg.includes(e)) || err.code === 'EBUSY') {
    console.warn('⚠️  Exception diabaikan (normal):', msg.split('\n')[0]);
    return;
  }
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Daftar pesan error yang aman diabaikan (bagian normal dari siklus hidup whatsapp-web.js)
const IGNORED_ERRORS = [
  'EBUSY',
  'Execution context was destroyed',
  'Protocol error',
  'Target closed',
  'Session closed',
];

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (IGNORED_ERRORS.some((e) => msg.includes(e))) {
    console.warn('⚠️  Rejection diabaikan (normal):', msg.split('\n')[0]);
    return;
  }
  console.error('❌ Unhandled Rejection:', reason);
});

// ── Template Pesan ───────────────────────────────────────────
function buatPesan(data) {
  const { status, pesananId, pelangganNama, items, total, tipeOrder, nomorMeja, alamat } = data;

  const noSingkat = pesananId.slice(0, 8).toUpperCase();
  const totalFormatted = Number(total).toLocaleString('id-ID');

  const itemList = items
    .map((i) => `  • ${i.emoji || '🍽️'} ${i.nama} ×${i.qty} — Rp ${(i.harga * i.qty).toLocaleString('id-ID')}`)
    .join('\n');

  const tipeInfo = tipeOrder === 'dine-in'
    ? `🍽️ Makan di Sini${nomorMeja ? ` · Meja ${nomorMeja}` : ''}`
    : `🛵 Antar ke Alamat${alamat ? `\n📍 ${alamat}` : ''}`;

  const statusPesan = {
    Diproses: {
      emoji: '👨‍🍳',
      judul: 'Pesanan Sedang Diproses',
      isi: 'Pesananmu sedang kami siapkan. Mohon tunggu sebentar ya!',
    },
    Dikirim: {
      emoji: '🛵',
      judul: 'Pesanan Sedang Dikirim',
      isi: 'Pesananmu sedang dalam perjalanan. Segera tiba!',
    },
    Selesai: {
      emoji: '✅',
      judul: 'Pesanan Selesai',
      isi: 'Pesananmu telah selesai. Terima kasih sudah memesan di IndriFood! 🙏',
    },
    Dibatalkan: {
      emoji: '❌',
      judul: 'Pesanan Dibatalkan',
      isi: 'Maaf, pesananmu telah dibatalkan. Hubungi kami jika ada pertanyaan.',
    },
  };

  const info = statusPesan[status];
  if (!info) return null;

  return `${info.emoji} *${info.judul}*

Halo *${pelangganNama}*! 👋

${info.isi}

━━━━━━━━━━━━━━━━━━━━
📋 *Detail Pesanan #${noSingkat}*
━━━━━━━━━━━━━━━━━━━━
${itemList}

${tipeInfo}

💰 *Total: Rp ${totalFormatted}*
━━━━━━━━━━━━━━━━━━━━

_IndriFood — Restoran & Catering_`;
}

// ── API Endpoint ─────────────────────────────────────────────
// Dipanggil oleh Next.js saat admin update status pesanan
app.post('/kirim-notif', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ ok: false, error: 'Bot belum siap atau tidak terhubung' });
  }

  const { nomorWA, status, pesananId, pelangganNama, items, total, tipeOrder, nomorMeja, alamat } = req.body;

  if (!nomorWA || !status || !pesananId) {
    return res.status(400).json({ ok: false, error: 'Data tidak lengkap' });
  }

  // Status yang perlu dinotifikasi
  const statusNotif = ['Diproses', 'Dikirim', 'Selesai', 'Dibatalkan'];
  if (!statusNotif.includes(status)) {
    return res.json({ ok: true, skipped: true, reason: 'Status tidak perlu notifikasi' });
  }

  const pesan = buatPesan({ status, pesananId, pelangganNama, items, total, tipeOrder, nomorMeja, alamat });
  if (!pesan) {
    return res.status(400).json({ ok: false, error: 'Gagal membuat pesan' });
  }

  try {
    // Format nomor: hilangkan 0 di depan, tambah 62 (Indonesia)
    let nomor = String(nomorWA).replace(/\D/g, ''); // hapus non-digit
    if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);
    if (!nomor.startsWith('62')) nomor = '62' + nomor;

    // Gunakan getNumberId untuk resolve LID (fix error "No LID for users")
    const numberId = await client.getNumberId(nomor);
    if (!numberId) {
      console.error(`❌ Nomor tidak terdaftar di WhatsApp: ${nomor}`);
      return res.status(400).json({ ok: false, error: 'Nomor tidak terdaftar di WhatsApp' });
    }

    await client.sendMessage(numberId._serialized, pesan);
    console.log(`✅ Notif terkirim ke ${nomor} — Status: ${status} — Pesanan: ${pesananId.slice(0, 8)}`);
    res.json({ ok: true, nomor });
  } catch (err) {
    console.error('❌ Gagal kirim pesan:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Health check
app.get('/status', (req, res) => {
  res.json({
    ok: true,
    ready: isReady,
    nomor: isReady ? client.info?.wid?.user : null,
  });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🤖 IndriFood WA Bot');
  console.log('==================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log('Menginisialisasi WhatsApp...\n');
});

client.initialize();
