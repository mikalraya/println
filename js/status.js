// Cek status pesanan lewat kode. Data publik hanya berisi kode, produk, status, dan batas bayar
// (tanpa nama, no. WhatsApp, atau alamat). Teks dari server selalu lewat textContent.

const TAHAP = ['Diterima', 'Cek desain', 'Diproses', 'Siap diambil', 'Selesai'];
const KETERANGAN_TAHAP = {
  Diterima: 'Pesananmu sudah masuk dan menunggu dicek admin.',
  'Cek desain': 'Admin sedang memeriksa file desainmu. Kalau perlu diperbaiki, kamu akan dihubungi lewat WhatsApp.',
  Diproses: 'Pesananmu sedang dikerjakan.',
  'Siap diambil': 'Pesananmu sudah siap. Silakan diambil di toko atau tunggu pengiriman.',
  Selesai: 'Pesananmu sudah selesai. Terima kasih sudah memesan di PrintIn!',
  // Di luar 5 tahap pengerjaan
  'Menunggu bayar': 'Pesananmu belum dibayar. Selesaikan pembayaran agar pesanan bisa langsung dikerjakan.',
  Dibatalkan: 'Pesanan ini dibatalkan otomatis karena tidak dibayar sampai batas waktu. Silakan buat pesanan baru.',
};

// Ilustrasi tiap tahap (img/status/), judul singkat untuk kartu panduan
const GAMBAR_TAHAP = {
  Diterima: { src: 'img/status/diterima.svg', alt: 'Ilustrasi daftar pesanan dengan tanda centang: pesanan sudah diterima', judul: 'Pesanan masuk' },
  'Cek desain': { src: 'img/status/cek-desain.svg', alt: 'Ilustrasi admin memeriksa desain mug di layar komputer', judul: 'Desain diperiksa' },
  Diproses: { src: 'img/status/diproses.svg', alt: 'Ilustrasi mesin cetak sedang mencetak pesanan', judul: 'Sedang dicetak' },
  'Siap diambil': { src: 'img/status/siap-diambil.svg', alt: 'Ilustrasi petugas toko memegang paket yang siap diambil', judul: 'Paket siap' },
  Selesai: { src: 'img/status/selesai.svg', alt: 'Ilustrasi pelanggan senang merayakan pesanan yang selesai', judul: 'Pesanan beres' },
  'Menunggu bayar': { src: 'img/status/menunggu-bayar.svg', alt: 'Ilustrasi HP berisi kode QRIS dan jam pasir: pesanan menunggu pembayaran', judul: 'Menunggu bayar' },
  Dibatalkan: { src: 'img/status/dibatalkan.svg', alt: 'Ilustrasi struk bertanda batal: pesanan dibatalkan', judul: 'Dibatalkan' },
};

const IKON_UNDUH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>';

const ambil = (id) => document.getElementById(id);

function buatEl(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

// Garis waktu 5 tahap
function buatTahap(status) {
  const ol = buatEl('ol', 'tahap-pesanan');
  ol.setAttribute('aria-label', 'Tahap pengerjaan pesanan');
  const posisi = TAHAP.indexOf(status);
  TAHAP.forEach((nama, i) => {
    const li = buatEl('li', 'tahap');
    const selesai = i < posisi || (nama === 'Selesai' && posisi === i);
    if (selesai) li.classList.add('tahap-selesai');
    else if (i === posisi) li.classList.add('tahap-sekarang');
    if (i === posisi) li.setAttribute('aria-current', 'step');
    const titik = buatEl('span', 'tahap-titik', selesai ? '✓' : String(i + 1));
    titik.setAttribute('aria-hidden', 'true');
    const teks = buatEl('div', 'tahap-teks');
    teks.append(buatEl('strong', '', nama));
    li.append(titik, teks);
    ol.append(li);
  });
  return ol;
}

function tampilkanDetail(pesanan) {
  const kotak = ambil('detail-pesanan');
  kotak.replaceChildren();

  const kepala = buatEl('div', 'detail-kepala');
  const judul = buatEl('div');
  judul.append(buatEl('p', 'item-spek', 'Kode pesanan'), buatEl('h2', '', pesanan.kode));
  kepala.append(judul, buatEl('span', 'lencana-pesanan', pesanan.status));
  kotak.append(kepala);

  // Gambar sesuai status sekarang + keterangannya
  const sorot = buatEl('div', 'detail-sorot');
  const gambar = GAMBAR_TAHAP[pesanan.status];
  if (gambar) sorot.append(buatGambar(gambar, 'detail-gambar'));
  let keterangan = KETERANGAN_TAHAP[pesanan.status] || '';
  if (pesanan.status === 'Menunggu bayar' && pesanan.batas_bayar) {
    const jam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(pesanan.batas_bayar));
    keterangan += ` Bayar sebelum pukul ${jam}, lewat dari itu pesanan otomatis dibatalkan.`;
  }
  sorot.append(buatEl('p', 'info-tahap', keterangan));
  kotak.append(sorot);
  // Garis waktu pengerjaan tidak relevan untuk pesanan yang dibatalkan
  if (pesanan.status !== 'Dibatalkan') kotak.append(buatTahap(pesanan.status));
  tandaiPanduan(pesanan.status);

  // Teks produk dan tombol WhatsApp satu blok agar lebarnya sama
  const aksi = buatEl('div', 'detail-aksi');
  aksi.append(buatEl('p', 'item-nama', `Produk: ${pesanan.produk}`));

  // Belum dibayar: arahkan ke halaman Bayar pesanan ini
  if (pesanan.status === 'Menunggu bayar') {
    const bayar = buatEl('a', 'btn btn-utama', 'Bayar sekarang');
    bayar.href = `bayar.html?kode=${encodeURIComponent(pesanan.kode)}`;
    aksi.append(bayar);
  }

  // Sudah dibayar (Diterima s.d. Selesai): cetak ulang struk dengan status terbaru (js/struk.js)
  if (TAHAP.includes(pesanan.status) && Number.isFinite(pesanan.total)) {
    const struk = buatEl('button', 'btn btn-garis btn-struk');
    struk.type = 'button';
    struk.innerHTML = IKON_UNDUH; // ikon tetap, bukan data dari server
    struk.append(buatEl('span', '', 'Unduh struk PDF'));
    struk.addEventListener('click', () => unduhStruk({
      kode: pesanan.kode, tanggal: pesanan.tanggal, produk: pesanan.produk, spesifikasi: pesanan.spesifikasi,
      jumlah: pesanan.jumlah, total: pesanan.total, ambil: pesanan.pengambilan, status: pesanan.status,
    }, struk));
    aksi.append(struk);
  }

  const wa = buatEl('a', 'btn btn-garis', 'Tanya admin lewat WhatsApp');
  wa.href = `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(`Halo ${CONFIG.namaToko}, saya mau tanya soal pesanan ${pesanan.kode}.`)}`;
  wa.target = '_blank';
  wa.rel = 'noopener';
  aksi.append(wa);
  kotak.append(aksi);

  kotak.hidden = false;
  kotak.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buatGambar({ src, alt }, kelas) {
  const img = buatEl('img', kelas);
  img.src = src;
  img.alt = alt;
  img.width = 320;
  img.height = 240;
  img.loading = 'lazy';
  return img;
}

// Kartu panduan: satu gambar per tahap
function isiPanduan() {
  const daftar = ambil('panduan-tahap');
  TAHAP.forEach((nama, i) => {
    const li = buatEl('li', 'panduan-item');
    li.dataset.tahap = nama;
    li.append(
      buatGambar(GAMBAR_TAHAP[nama], 'panduan-gambar'),
      buatEl('span', 'panduan-nomor', `${i + 1}. ${nama}`),
      buatEl('strong', '', GAMBAR_TAHAP[nama].judul),
      buatEl('p', '', KETERANGAN_TAHAP[nama]),
    );
    daftar.append(li);
  });
}

function tandaiPanduan(status) {
  ambil('panduan-tahap').querySelectorAll('.panduan-item').forEach((li) => {
    const aktif = li.dataset.tahap === status;
    li.classList.toggle('panduan-aktif', aktif);
    if (aktif) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
}

function setGalatCek(teks) {
  const area = ambil('galat-cek-kode');
  area.textContent = teks || '';
  area.hidden = !teks;
  const input = ambil('cek-kode');
  if (teks) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

async function muatKode(kode) {
  setGalatCek('');
  ambil('detail-pesanan').hidden = true;
  tandaiPanduan('');
  if (!/^PRT-\d{4,}$/.test(kode)) return setGalatCek('Kode pesanan diawali PRT- lalu angka, contoh: PRT-0001.');
  if (!CONFIG.urlApi) return setGalatCek('Server pesanan belum tersambung (mode contoh), jadi status belum bisa dicek. Tanyakan lewat WhatsApp.');

  // Selama mencari: tombol berubah teks dan ilustrasi kaca pembesar bergoyang
  const form = ambil('form-cek');
  const tombol = form.querySelector('button[type="submit"]');
  tombol.disabled = true;
  tombol.textContent = 'Mencari…';
  form.classList.add('sedang-mencari');
  const hasil = await panggilApi({ params: { action: 'status', kode } });
  tombol.disabled = false;
  tombol.textContent = 'Cek status';
  form.classList.remove('sedang-mencari');
  if (!hasil.ok) return setGalatCek(hasil.pesan || 'Status belum bisa dicek. Coba lagi.');
  tampilkanDetail(hasil.pesanan);
}

function mulaiStatus() {
  isiPanduan();
  ambil('form-cek').addEventListener('submit', (e) => {
    e.preventDefault();
    muatKode(ambil('cek-kode').value.trim().toUpperCase());
  });

  const kode = new URLSearchParams(location.search).get('kode');
  if (kode) {
    ambil('cek-kode').value = kode;
    muatKode(kode.toUpperCase());
  }
}

document.addEventListener('DOMContentLoaded', mulaiStatus);
