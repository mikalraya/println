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
  byId('bayar-isi').hidden = false;
}

function tampilkanGalat(teks) {
  byId('bayar-muat').hidden = true;
  byId('bayar-galat').hidden = false;
  byId('bayar-galat-teks').textContent = teks;
}

function mulaiBayar() {
  const kode = new URLSearchParams(location.search).get('kode');
  const ringkasan = bacaRingkasan();
  byId('bayar-muat').hidden = true;

  if (!kode || !ringkasan || ringkasan.kode !== kode) {
    return tampilkanGalat('Data pesanan tidak ditemukan di perangkat ini. Buat pesanan dulu di halaman Pesan, atau cek status pesananmu dengan kode.');
  }
  tampilkanBayar(ringkasan);
}

document.addEventListener('DOMContentLoaded', mulaiBayar);
