// Chatbot FAQ sederhana berbasis aturan (F-13). Tanpa AI dan tanpa server:
// pertanyaan dicocokkan dengan kata kunci, jawaban sama dengan halaman Kontak & FAQ.
// Membutuhkan js/config.js dan js/main.js (tombol melayang dibuat di main.js).

const ATURAN_BOT = [
  {
    kunci: ['harga', 'tarif', 'biaya', 'berapa', 'murah', 'kalkulator', 'hitung'],
    jawab: 'Daftar harga dan kalkulator ada di halaman Produk. Semua harga adalah harga simulasi. Harga "Mulai" (brosur dan undangan) adalah harga dasar, harga akhir dikonfirmasi admin.',
    tautan: ['Buka kalkulator', 'produk.html#kalkulator'],
  },
  {
    kunci: ['format', 'file', 'pdf', 'png', 'jpg', 'drive', 'unggah', 'upload', 'kirim desain'],
    jawab: 'File desain boleh PDF, PNG, atau JPG, maksimal 10 MB per file. Kalau lebih besar, taruh di Google Drive lalu tempel link-nya di form pesanan (akses "siapa saja yang memiliki link").',
    tautan: ['Ke form pesan', 'pesan.html'],
  },
  {
    kunci: ['resolusi', 'dpi', 'ukuran desain', 'tajam', 'pecah', 'buram'],
    jawab: 'Usahakan resolusi sekitar 300 dpi pada ukuran cetak sebenarnya. Untuk banner besar, resolusi lebih rendah biasanya sudah cukup. Kalau file perlu diperbaiki, admin akan menghubungimu lewat WhatsApp.',
  },
  {
    kunci: ['lama', 'hari', 'selesai', 'estimasi', 'kapan', 'waktu', 'cepat'],
    jawab: 'Estimasi selesai tertulis di setiap produk di halaman Produk. Kamu juga bisa mengisi tanggal dibutuhkan di form pesanan. Waktunya bisa berubah kalau pesanan sedang ramai.',
    tautan: ['Lihat produk', 'produk.html'],
  },
  {
    kunci: ['bayar', 'pembayaran', 'qris', 'transfer', 'lunas'],
    jawab: 'Setelah pesanan dikirim, kamu diarahkan ke halaman pembayaran QRIS. Halaman itu masih contoh (mockup), bukan pembayaran sungguhan, jadi konfirmasi dilakukan lewat WhatsApp.',
  },
  {
    kunci: ['revisi', 'ubah desain', 'ganti desain', 'salah', 'perbaiki'],
    jawab: 'Revisi kecil bisa dibicarakan lewat WhatsApp saat pesananmu berstatus "Cek desain". Setelah masuk tahap "Diproses", perubahan tidak bisa dilakukan lagi.',
  },
  {
    kunci: ['custom', 'merchandise', 'mug', 'tumbler', 'tote', 'gantungan', 'merch'],
    jawab: 'Pilih produk custom (tumbler, mug, gantungan kunci, atau tote bag), hitung harganya, lalu kirim pesanan dengan file atau link desainmu. Desain wajib disertakan dan harus milikmu atau sudah berizin.',
    tautan: ['Lihat custom merchandise', 'produk.html?lini=Custom%20Merchandise'],
  },
  {
    kunci: ['status', 'cek pesanan', 'kode', 'prt', 'lacak', 'sampai mana'],
    jawab: 'Buka halaman Cek Status lalu masukkan kode pesananmu, misalnya PRT-0001. Status berjalan dari Diterima, Cek desain, Diproses, Siap diambil, sampai Selesai.',
    tautan: ['Cek status', 'status.html'],
  },
  {
    kunci: ['pesan', 'order', 'beli', 'cara memesan', 'pemesanan'],
    jawab: 'Pilih produk dan hitung harga di halaman Produk, klik "Pesan sekarang", isi data singkat, lalu kirim. Tidak perlu daftar akun.',
    tautan: ['Mulai pesan', 'produk.html#kalkulator'],
  },
  {
    kunci: ['alamat', 'lokasi', 'buka', 'jam', 'dimana', 'di mana', 'semarang', 'toko'],
    jawab: () => `PrintIn ada di ${CONFIG.alamat}. Jam buka: ${CONFIG.jamBuka}.`,
    tautan: ['Tentang kami', 'tentang.html'],
  },
  {
    kunci: ['kontak', 'wa', 'whatsapp', 'email', 'instagram', 'hubungi', 'admin'],
    jawab: () => `Kamu bisa menghubungi kami lewat WhatsApp ${CONFIG.waTampil}, email ${CONFIG.email}, atau Instagram @${CONFIG.instagram}.`,
    tautan: ['Halaman kontak', 'kontak.html'],
  },
  {
    kunci: ['data', 'privasi', 'aman', 'keamanan', 'nik', 'ktp'],
    jawab: 'Kami hanya meminta data seperlunya (nama, nomor WhatsApp, detail pesanan, dan alamat bila dikirim). Kami tidak pernah meminta NIK, KTP, atau data kartu pembayaran.',
    tautan: ['Kebijakan Privasi', 'privasi.html'],
  },
];

const SAPAAN_BOT = ['halo', 'hai', 'hi', 'selamat', 'permisi'];
const PERTANYAAN_CEPAT = ['Berapa harganya?', 'Format file desain?', 'Berapa lama pengerjaan?', 'Cara membayar?', 'Cek status pesanan'];

// Pilih jawaban dengan skor kata kunci terbanyak. Mengembalikan aturan, atau null bila tidak ada yang cocok.
function cariJawabanBot(teks) {
  const t = ` ${teks.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')} `;
  let terbaik = null;
  let skorTerbaik = 0;
  ATURAN_BOT.forEach((aturan) => {
    const skor = aturan.kunci.filter((k) => t.includes(` ${k}`)).length;
    if (skor > skorTerbaik) { terbaik = aturan; skorTerbaik = skor; }
  });
  return terbaik;
}

function buatBot() {
  if (document.body.dataset.halaman === 'admin') return;
  const wadahTombol = document.querySelector('.tombol-melayang');
  if (!wadahTombol) return;

  const tombol = document.createElement('button');
  tombol.type = 'button';
  tombol.className = 'btn-ikon btn-bot';
  tombol.setAttribute('aria-expanded', 'false');
  tombol.setAttribute('aria-controls', 'panel-bot');
  tombol.setAttribute('aria-label', 'Buka chat tanya jawab');
  tombol.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/></svg><span class="label-ikon" aria-hidden="true">Tanya PrintIn</span>';
  wadahTombol.append(tombol);

  const panel = document.createElement('section');
  panel.className = 'panel-bot';
  panel.id = 'panel-bot';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Tanya jawab PrintIn');
  panel.innerHTML = `
    <header class="panel-bot-kepala"><strong>Tanya PrintIn</strong><button type="button" class="panel-bot-tutup" aria-label="Tutup chat">×</button></header>
    <div class="panel-bot-pesan" role="log" aria-live="polite"></div>
    <div class="panel-bot-cepat"></div>
    <form class="panel-bot-form"><label class="sr-saja" for="bot-teks">Tulis pertanyaanmu</label><input id="bot-teks" type="text" autocomplete="off" maxlength="120" placeholder="Tulis pertanyaanmu…"><button class="btn btn-utama" type="submit">Kirim</button></form>`;
  document.body.append(panel);

  const log = panel.querySelector('.panel-bot-pesan');
  const input = panel.querySelector('#bot-teks');

  const tambahPesan = (teks, dariBot, tautan) => {
    const gelembung = document.createElement('div');
    gelembung.className = `bot-pesan ${dariBot ? 'bot-masuk' : 'bot-keluar'}`;
    gelembung.append(teks);
    if (tautan) {
      const a = document.createElement('a');
      a.href = tautan[1];
      a.textContent = tautan[0];
      gelembung.append(document.createElement('br'), a);
    }
    log.append(gelembung);
    log.scrollTop = log.scrollHeight;
  };

  const jawab = (teks) => {
    const bersih = teks.trim();
    if (!bersih) return;
    tambahPesan(bersih, false);
    const kata = bersih.toLowerCase().split(/\s+/);
    const aturan = cariJawabanBot(bersih);
    if (aturan) {
      tambahPesan(typeof aturan.jawab === 'function' ? aturan.jawab() : aturan.jawab, true, aturan.tautan);
    } else if (kata.some((k) => SAPAAN_BOT.includes(k))) {
      tambahPesan('Halo! Aku asisten PrintIn. Pilih pertanyaan di bawah atau tulis sendiri, ya.', true);
    } else {
      tambahPesan('Maaf, aku belum paham pertanyaan itu. Coba kata lain, atau tanya admin langsung lewat WhatsApp.', true,
        ['Chat WhatsApp admin', `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(CONFIG.pesanWaAwal)}`]);
    }
  };

  const cepat = panel.querySelector('.panel-bot-cepat');
  PERTANYAAN_CEPAT.forEach((tanya) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-filter';
    chip.textContent = tanya;
    chip.addEventListener('click', () => jawab(tanya));
    cepat.append(chip);
  });

  const buka = (terbuka) => {
    panel.hidden = !terbuka;
    tombol.setAttribute('aria-expanded', String(terbuka));
    tombol.setAttribute('aria-label', terbuka ? 'Tutup chat tanya jawab' : 'Buka chat tanya jawab');
    if (terbuka) {
      if (!log.children.length) tambahPesan('Halo! Aku asisten PrintIn. Tanya soal harga, format file, lama pengerjaan, pembayaran, atau status pesanan.', true);
      input.focus();
    } else {
      tombol.focus();
    }
  };

  tombol.addEventListener('click', () => buka(panel.hidden));
  panel.querySelector('.panel-bot-tutup').addEventListener('click', () => buka(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) buka(false); });
  panel.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    jawab(input.value);
    input.value = '';
  });
}

document.addEventListener('DOMContentLoaded', buatBot);
