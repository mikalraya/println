// Chatbot FAQ sederhana berbasis aturan (F-13). Tanpa AI dan tanpa server:
// pertanyaan dicocokkan dengan kata kunci, jawaban sama dengan halaman Kontak & FAQ.
// Membutuhkan js/config.js dan js/main.js (tombol melayang dibuat di main.js).

// Urutan penting: bila skor sama, aturan yang lebih atas menang.
// Karena itu aturan pembayaran yang spesifik ditaruh paling atas, aturan pembayaran umum sesudahnya.
const ATURAN_BOT = [
  // ----- Pembayaran -----
  {
    kunci: ['bukti', 'konfirmasi', 'sudah bayar', 'sudah transfer', 'struk', 'resi'],
    jawab: 'Setelah membayar, tekan tombol "Konfirmasi lewat WhatsApp" di halaman Pembayaran. Pesan berisi kode pesananmu sudah terisi otomatis, tinggal kirim ke admin. Admin akan mengecek lalu memperbarui status pesananmu.',
    tautan: ['Cek status pesanan', 'status.html'],
  },
  {
    kunci: ['refund', 'batal', 'pengembalian', 'uang kembali', 'cancel'],
    jawab: 'Pembatalan atau pengembalian uang dibicarakan langsung dengan admin lewat WhatsApp. Sebutkan kode pesananmu, misalnya PRT-0001. Pesanan yang sudah berstatus "Diproses" sudah mulai dicetak, jadi hubungi admin secepatnya. Pesanan yang tidak dibayar dalam 60 menit dibatalkan otomatis.',
    tautan: ['Halaman kontak', 'kontak.html'],
  },
  {
    kunci: ['metode', 'transfer', 'tunai', 'cash', 'cod', 'rekening', 'bank', 'ovo', 'gopay', 'dana', 'shopeepay', 'e wallet', 'ewallet', 'dompet digital'],
    jawab: 'Di website ini tersedia contoh pembayaran QRIS. QRIS biasanya bisa dibayar lewat aplikasi bank atau dompet digital mana pun. Karena halaman QRIS masih contoh (mockup), jangan kirim uang sungguhan. Pilihan pembayaran lain bisa ditanyakan ke admin lewat WhatsApp.',
  },
  {
    kunci: ['total', 'nominal', 'tagihan', 'dp', 'uang muka', 'cicil', 'lunas', 'kurang bayar'],
    jawab: 'Total di halaman Pembayaran adalah perkiraan harga simulasi dari kalkulator. Total pasti dikonfirmasi admin setelah desainmu dicek. Soal uang muka (DP) atau pelunasan, admin akan menjelaskannya lewat WhatsApp saat konfirmasi.',
    tautan: ['Hitung harga', 'produk.html#kalkulator'],
  },
  {
    kunci: ['ongkir', 'ongkos kirim', 'biaya kirim', 'pengiriman', 'kurir', 'antar'],
    jawab: 'Harga di website belum termasuk ongkos kirim. Kalau kamu memilih "Dikirim ke alamat" di form pesanan, admin akan mengonfirmasi biaya dan cara pengirimannya lewat WhatsApp. Pilih "Ambil sendiri di toko" kalau ingin mengambil sendiri tanpa ongkir.',
    tautan: ['Ke form pesan', 'pesan.html'],
  },
  {
    kunci: ['aman', 'penipuan', 'tipu', 'otp', 'cvv', 'kartu kredit', 'nomor kartu', 'password'],
    jawab: 'PrintIn tidak pernah meminta nomor kartu, kode OTP, PIN, atau password. Halaman QRIS di website ini hanya contoh, jadi jangan transfer uang sungguhan. Kalau ada yang meminta data seperti itu atas nama PrintIn, abaikan dan hubungi admin.',
  },
  {
    kunci: ['bayar', 'qris', 'scan qr'],
    jawab: 'Cara membayar: (1) kirim pesanan lewat form, (2) kamu otomatis diarahkan ke halaman Pembayaran berisi kode pesanan dan perkiraan total, (3) scan QRIS di halaman itu, lalu (4) tekan "Konfirmasi lewat WhatsApp". Bayar dalam 60 menit, kalau lewat pesanan otomatis dibatalkan. Catatan: QRIS di website ini masih contoh (mockup), bukan pembayaran sungguhan.',
    tautan: ['Mulai pesan', 'pesan.html'],
  },
  // ----- Pertanyaan lain -----
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
    kunci: ['lama', 'hari', 'selesai', 'estimasi', 'kapan', 'waktu', 'cepat', 'pengerjaan', 'berapa lama'],
    jawab: 'Estimasi selesai tertulis di setiap produk di halaman Produk. Kamu juga bisa mengisi tanggal dibutuhkan di form pesanan. Waktunya bisa berubah kalau pesanan sedang ramai.',
    tautan: ['Lihat produk', 'produk.html'],
  },
  {
    kunci: ['harga', 'tarif', 'biaya', 'berapa', 'murah', 'kalkulator', 'hitung'],
    jawab: 'Daftar harga dan kalkulator ada di halaman Produk. Semua harga adalah harga simulasi. Harga "Mulai" (brosur dan undangan) adalah harga dasar, harga akhir dikonfirmasi admin.',
    tautan: ['Buka kalkulator', 'produk.html#kalkulator'],
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

// Awalan kata kerja/benda yang umum, agar "membayar", "dibayar", "pembayaran" cocok dengan kunci "bayar"
const AWALAN_BOT = ['', 'me', 'mem', 'men', 'meng', 'di', 'pe', 'pem', 'pen', 'ber', 'ter'];

// Pilih jawaban dengan skor kata kunci terbanyak. Mengembalikan aturan, atau null bila tidak ada yang cocok.
function cariJawabanBot(teks) {
  const t = ` ${teks.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')} `;
  let terbaik = null;
  let skorTerbaik = 0;
  // Kunci pendek (≤ 3 huruf, mis. "wa", "dp") harus satu kata utuh agar "waktu"/"dpi" tidak ikut cocok
  const cocok = (k) => (k.length <= 3 ? t.includes(` ${k} `) : AWALAN_BOT.some((a) => t.includes(` ${a}${k}`)));
  ATURAN_BOT.forEach((aturan) => {
    // Frasa lebih spesifik: nilainya sebanyak jumlah katanya ("biaya kirim" = 2)
    const skor = aturan.kunci.filter(cocok).reduce((n, k) => n + k.split(' ').length, 0);
    if (skor > skorTerbaik) { terbaik = aturan; skorTerbaik = skor; }
  });
  return terbaik;
}

// Maskot asisten PrintIn (SVG tetap, bukan data pengguna). Kedip mata, lambaian tangan, dan goyang kepala
// diatur di css/style.css (kelas bot-*), otomatis berhenti bila pengguna memilih kurangi animasi.
const MASKOT_BOT = `<svg class="bot-maskot" viewBox="5 6 54 54" aria-hidden="true" focusable="false">
  <path d="M8 66c2-13 12-18 24-18s22 5 24 18z" fill="#ff8a3d"/>
  <path d="M26 48l6 7 6-7z" fill="#fff"/>
  <rect x="28" y="40" width="8" height="9" rx="3" fill="#e8b48b"/>
  <g class="bot-kepala">
    <circle cx="32" cy="29" r="13" fill="#f2c39b"/>
    <path d="M19 29a13 13 0 0 1 26 0c-4-6-9-8-14-7-5 1-8 3-12 7z" fill="#070a1f"/>
    <g class="bot-mata" fill="#070a1f"><ellipse cx="27" cy="30" rx="1.8" ry="2.1"/><ellipse cx="37" cy="30" rx="1.8" ry="2.1"/></g>
    <circle cx="24.5" cy="34" r="1.8" fill="#ff8fa3" opacity=".7"/><circle cx="39.5" cy="34" r="1.8" fill="#ff8fa3" opacity=".7"/>
    <path d="M28.5 35.5q3.5 3 7 0" stroke="#070a1f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M17.5 29a14.5 14.5 0 0 1 29 0" stroke="#1f2a5c" stroke-width="2.6" fill="none"/>
    <rect x="15" y="26" width="5" height="9" rx="2.5" fill="#1f2a5c"/>
    <rect x="44" y="26" width="5" height="9" rx="2.5" fill="#1f2a5c"/>
    <path d="M17.5 34.5q1 6 8 6" stroke="#1f2a5c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="26.5" cy="40.5" r="1.8" fill="#f6ee14"/>
  </g>
  <g class="bot-tangan">
    <path d="M48 56l5-11" stroke="#ff8a3d" stroke-width="5" stroke-linecap="round"/>
    <circle cx="53.5" cy="43" r="3.4" fill="#f2c39b"/>
  </g>
</svg>`;

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
  tombol.innerHTML = `${MASKOT_BOT}<span class="bot-gelembung" aria-hidden="true">Hai!</span><span class="label-ikon" aria-hidden="true">Tanya PrintIn</span>`;
  wadahTombol.append(tombol);

  const panel = document.createElement('section');
  panel.className = 'panel-bot';
  panel.id = 'panel-bot';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Tanya jawab PrintIn');
  panel.innerHTML = `
    <header class="panel-bot-kepala">
      <span class="panel-bot-avatar" aria-hidden="true">${MASKOT_BOT}</span>
      <div class="panel-bot-judul"><strong>Tanya PrintIn</strong><span>Asisten FAQ · membalas langsung</span></div>
      <button type="button" class="panel-bot-tutup" aria-label="Tutup chat">×</button>
    </header>
    <div class="panel-bot-pesan" role="log" aria-live="polite"></div>
    <div class="panel-bot-cepat" role="group" aria-label="Pertanyaan cepat"></div>
    <form class="panel-bot-form"><label class="sr-saja" for="bot-teks">Tulis pertanyaanmu</label><input id="bot-teks" type="text" autocomplete="off" maxlength="120" placeholder="Tulis pertanyaanmu…"><button class="btn btn-utama" type="submit">Kirim</button></form>`;
  document.body.append(panel);

  const log = panel.querySelector('.panel-bot-pesan');
  const input = panel.querySelector('#bot-teks');

  const tambahPesan = (teks, dariBot, tautan) => {
    const gelembung = document.createElement('div');
    gelembung.className = `bot-pesan ${dariBot ? 'bot-masuk' : 'bot-keluar'}`;
    const isi = document.createElement('p');
    isi.textContent = teks;
    gelembung.append(isi);
    if (tautan) {
      const a = document.createElement('a');
      a.className = 'bot-tautan';
      a.href = tautan[1];
      a.textContent = `${tautan[0]} →`;
      gelembung.append(a);
    }
    log.append(gelembung);
    // Balasan bot: gulir ke awal gelembung supaya dibaca dari kalimat pertama. Pesan sendiri: gulir ke bawah.
    if (dariBot) log.scrollTo({ top: Math.max(gelembung.offsetTop - 12, 0), behavior: 'smooth' });
    else log.scrollTop = log.scrollHeight;
  };

  const jawab = (teks) => {
    const bersih = teks.trim();
    if (!bersih) return;
    tambahPesan(bersih, false);
    const kata = bersih.toLowerCase().split(/\s+/);
    const aturan = cariJawabanBot(bersih);

    // Indikator mengetik (tiga titik) sebelum balasan muncul
    const mengetik = document.createElement('div');
    mengetik.className = 'bot-pesan bot-masuk bot-mengetik';
    mengetik.setAttribute('aria-label', 'Asisten sedang mengetik');
    mengetik.innerHTML = '<span></span><span></span><span></span>';
    log.append(mengetik);
    log.scrollTop = log.scrollHeight;

    setTimeout(() => {
      mengetik.remove();
      if (aturan) {
        tambahPesan(typeof aturan.jawab === 'function' ? aturan.jawab() : aturan.jawab, true, aturan.tautan);
      } else if (kata.some((k) => SAPAAN_BOT.includes(k))) {
        tambahPesan('Halo! Aku asisten PrintIn. Pilih pertanyaan di bawah atau tulis sendiri, ya.', true);
      } else {
        tambahPesan('Maaf, aku belum paham pertanyaan itu. Coba kata lain, atau tanya admin langsung lewat WhatsApp.', true,
          ['Chat WhatsApp admin', `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(CONFIG.pesanWaAwal)}`]);
      }
    }, 800);
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
