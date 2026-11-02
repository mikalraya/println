// Halaman bayar: ringkasan pesanan + QRIS contoh (mockup, bukan pembayaran sungguhan).
// Ringkasan pesanan disimpan sementara di sessionStorage oleh js/pesan.js setelah pesanan terkirim.
// Teks selalu lewat textContent.

const KUNCI_TERAKHIR = 'printin_terakhir';
const byId = (id) => document.getElementById(id);

function bacaRingkasan() {
  try { return JSON.parse(sessionStorage.getItem(KUNCI_TERAKHIR)); } catch (err) { return null; }
}

function tampilkanBayar(p) {
  byId('bayar-kode').textContent = p.kode;
  byId('bayar-nominal').textContent = rupiah.format(p.total);

  const li = document.createElement('li');
  const nama = document.createElement('strong');
  nama.textContent = p.produk;
  const rinci = document.createElement('span');
  rinci.textContent = `${p.spesifikasi ? `${p.spesifikasi} · ` : ''}Jumlah: ${p.jumlah}`;
  li.append(nama, rinci);
  byId('bayar-item').replaceChildren(li);

  byId('tautan-status').href = `status.html?kode=${encodeURIComponent(p.kode)}`;
  byId('tombol-wa-bayar').href = `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(pesanWaPesanan(p))}`;
  byId('unduh-struk').addEventListener('click', (e) => unduhStruk(p, e.currentTarget));
  byId('bayar-isi').hidden = false;
}

function tampilkanGalat(teks) {
  byId('bayar-muat').hidden = true;
  byId('bayar-galat').hidden = false;
  byId('bayar-galat-teks').textContent = teks;
}

// ----- Status pembayaran -----
// Pesanan baru berstatus "Menunggu bayar" dengan batas waktu dari server. Setelah dibayar (tombol simulasi
// atau admin menandai lunas) status menjadi "Diterima"; lewat batas tanpa dibayar menjadi "Dibatalkan".
const BELUM_BAYAR = 'Menunggu bayar';
const BATAL = 'Dibatalkan';
let pesananBayar = null;
let waktuHitung = null;

const jamMenit = (iso) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function simpanRingkasanAwal(r) {
  try { sessionStorage.setItem(KUNCI_TERAKHIR, JSON.stringify(r)); } catch (err) { /* diabaikan */ }
}

function simpanRingkasan() {
  simpanRingkasanAwal(pesananBayar);
}

function tampilkanStatusBayar() {
  clearInterval(waktuHitung);
  const { status, batas_bayar: batas } = pesananBayar;
  const kotak = byId('status-bayar');
  const judul = byId('status-bayar-judul');
  const teks = byId('status-bayar-teks');
  // Tanpa server (mode contoh) status tidak diketahui: tampilan lama tanpa hitung mundur
  if (!status) return;

  kotak.hidden = false;
  kotak.classList.toggle('status-lunas', status !== BELUM_BAYAR && status !== BATAL);
  kotak.classList.toggle('status-batal', status === BATAL);
  const menunggu = status === BELUM_BAYAR;
  byId('blok-qris').hidden = !menunggu; // QRIS hanya perlu selama belum dibayar
  byId('pesan-lagi').hidden = status !== BATAL;
  byId('bayar-simulasi').hidden = !menunggu;
  byId('catatan-simulasi').hidden = !menunggu;

  if (status === BATAL) {
    judul.textContent = 'Pesanan dibatalkan';
    teks.textContent = 'Pesanan tidak dibayar sampai batas waktu, jadi dibatalkan otomatis. Silakan buat pesanan baru.';
    return;
  }
  if (!menunggu) {
    judul.textContent = 'Pembayaran diterima';
    teks.textContent = `Terima kasih! Pesananmu sekarang berstatus "${status}" dan segera kami kerjakan.`;
    return;
  }

  // Menunggu bayar: hitung mundur sampai batas bayar
  const perbarui = () => {
    const sisa = new Date(batas).getTime() - Date.now();
    if (!batas || Number.isNaN(sisa)) {
      judul.textContent = 'Menunggu pembayaran';
      teks.textContent = 'Selesaikan pembayaran agar pesananmu diproses.';
      return;
    }
    if (sisa <= 0) {
      clearInterval(waktuHitung);
      judul.textContent = 'Waktu pembayaran habis';
      teks.textContent = 'Memeriksa status pesanan…';
      segarkanStatus();
      return;
    }
    const menit = Math.floor(sisa / 60000);
    const detik = Math.floor((sisa % 60000) / 1000);
    judul.textContent = `Menunggu pembayaran · ${menit}:${String(detik).padStart(2, '0')}`;
    teks.textContent = `Bayar sebelum pukul ${jamMenit(batas)}. Lewat dari itu, pesanan otomatis dibatalkan.`;
  };
  perbarui();
  waktuHitung = setInterval(perbarui, 1000);
}

// Ambil status terbaru dari server (mis. admin sudah menandai lunas, atau pesanan dibatalkan)
async function segarkanStatus() {
  const hasil = await panggilApi({ params: { action: 'status', kode: pesananBayar.kode } });
  if (!hasil.ok || !hasil.pesanan) return;
  pesananBayar.status = hasil.pesanan.status;
  pesananBayar.batas_bayar = hasil.pesanan.batas_bayar || pesananBayar.batas_bayar;
  simpanRingkasan();
  tampilkanStatusBayar();
}

async function bayarSimulasi() {
  const tombol = byId('bayar-simulasi');
  tombol.disabled = true;
  tombol.textContent = 'Memproses pembayaran…';
  const hasil = await panggilApi({ body: { action: 'bayar_simulasi', kode: pesananBayar.kode } });
  tombol.disabled = false;
  tombol.textContent = 'Simulasikan pembayaran berhasil';
  if (hasil.status) pesananBayar.status = hasil.status;
  simpanRingkasan();
  tampilkanStatusBayar();
  if (hasil.ok) tampilToast({ pesan: `Pembayaran ${pesananBayar.kode} berhasil (simulasi).` });
  else tampilToast({ jenis: 'galat', pesan: hasil.pesan || 'Pembayaran belum bisa diproses. Coba lagi.' });
}

// Dibuka dari Cek Status (perangkat lain/sesi baru): ambil rincian pesanan dari server lewat kode.
// Data publik tanpa nama, no. WA, dan alamat.
async function ambilPesananDariServer(kode) {
  const hasil = await panggilApi({ params: { action: 'status', kode } });
  const p = hasil.ok && hasil.pesanan;
  if (!p || !Number.isFinite(p.total)) return null; // server lama belum mengirim total
  return {
    kode: p.kode, tanggal: p.tanggal, nama: '', produk: p.produk, spesifikasi: p.spesifikasi, jumlah: p.jumlah,
    total: p.total, ambil: p.pengambilan, status: p.status, batas_bayar: p.batas_bayar,
  };
}

async function mulaiBayar() {
  const kode = (new URLSearchParams(location.search).get('kode') || '').toUpperCase();
  let ringkasan = bacaRingkasan();
  if (kode && (!ringkasan || ringkasan.kode !== kode) && CONFIG.urlApi) {
    ringkasan = await ambilPesananDariServer(kode);
    if (ringkasan) simpanRingkasanAwal(ringkasan);
  }
  byId('bayar-muat').hidden = true;

  if (!kode || !ringkasan || ringkasan.kode !== kode) {
    return tampilkanGalat('Data pesanan tidak ditemukan. Buat pesanan dulu di halaman Pesan, atau cek status pesananmu dengan kode.');
  }
  pesananBayar = ringkasan;
  tampilkanBayar(ringkasan);
  byId('bayar-simulasi').addEventListener('click', bayarSimulasi);
  tampilkanStatusBayar();
  // Status bisa sudah berubah sejak halaman terakhir dibuka
  if (CONFIG.urlApi && ringkasan.status) segarkanStatus();
}

document.addEventListener('DOMContentLoaded', mulaiBayar);
