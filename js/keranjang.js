// Halaman keranjang: isi keranjang dari database (api/keranjang.php, fungsi ada di js/main.js).
// Produk yang diceklis (dipilih) adalah yang dilanjutkan ke pemesanan.

let isiKeranjang = [];

const ambilById = (id) => document.getElementById(id);

const IKON_SAMPAH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

// Buat satu baris item. Memakai textContent agar isi dari database tidak dijalankan sebagai HTML.
function buatItem(item) {
  const li = document.createElement('li');
  li.className = 'item-keranjang';

  const kiri = document.createElement('div');
  kiri.className = 'item-kiri';

  const centang = document.createElement('input');
  centang.type = 'checkbox';
  centang.className = 'item-centang';
  centang.checked = item.dipilih;
  centang.setAttribute('aria-label', `Pilih ${item.nama} untuk dipesan`);
  centang.addEventListener('change', () => ubah(Keranjang.pilih(item.id, centang.checked)));

  const info = document.createElement('div');
  const nama = document.createElement('p');
  nama.className = 'item-nama';
  nama.textContent = item.nama;
  info.append(nama);
  if (item.spesifikasi) {
    const spek = document.createElement('p');
    spek.className = 'item-spek';
    spek.textContent = item.spesifikasi;
    info.append(spek);
  }
  const satuan = document.createElement('p');
  satuan.className = 'item-spek';
  satuan.textContent = `${rupiah.format(item.harga)} per item`;
  info.append(satuan);
  kiri.append(centang, info);

  const bawah = document.createElement('div');
  bawah.className = 'item-bawah';

  const pengatur = document.createElement('div');
  pengatur.className = 'pengatur-jumlah';
  const kurang = document.createElement('button');
  kurang.type = 'button';
  kurang.textContent = '−';
  kurang.disabled = item.jumlah <= 1;
  kurang.setAttribute('aria-label', `Kurangi jumlah ${item.nama}`);
  kurang.addEventListener('click', () => ubah(Keranjang.ubahJumlah(item.id, item.jumlah - 1)));
  const jumlah = document.createElement('output');
  jumlah.textContent = item.jumlah;
  const tambah = document.createElement('button');
  tambah.type = 'button';
  tambah.textContent = '+';
  tambah.setAttribute('aria-label', `Tambah jumlah ${item.nama}`);
  tambah.addEventListener('click', () => ubah(Keranjang.ubahJumlah(item.id, item.jumlah + 1)));
  pengatur.append(kurang, jumlah, tambah);

  const harga = document.createElement('p');
  harga.className = 'item-harga';
  harga.textContent = rupiah.format(Math.round(item.harga * item.jumlah));

  // Tombol hapus berupa ikon tempat sampah; minta konfirmasi dulu agar tidak terhapus tak sengaja
  const hapus = document.createElement('button');
  hapus.type = 'button';
  hapus.className = 'btn-hapus-ikon';
  hapus.title = 'Hapus dari keranjang';
  hapus.setAttribute('aria-label', `Hapus ${item.nama} dari keranjang`);
  hapus.innerHTML = IKON_SAMPAH;
  hapus.addEventListener('click', async () => {
    const yakin = await tanyaKonfirmasi({
      judul: 'Hapus dari keranjang?',
      teks: `${item.nama} akan dihapus dari keranjangmu.`,
      ya: 'Ya, hapus',
    });
    if (yakin) ubah(Keranjang.hapus(item.id));
  });

  bawah.append(pengatur, harga, hapus);
  li.append(kiri, bawah);
  return li;
}

// Tunggu hasil API, lalu gambar ulang. Galat ditampilkan ramah.
async function ubah(janji) {
  const hasil = await janji;
  if (!hasil.ok) {
    if (hasil.perluMasuk) return tampilkan(null);
    const galat = ambilById('galat-keranjang');
    galat.textContent = hasil.pesan || 'Perubahan belum tersimpan. Coba lagi.';
    galat.hidden = false;
    return;
  }
  tampilkan(hasil.item);
}

// item = null berarti belum masuk (login)
function tampilkan(item) {
  ambilById('galat-keranjang').hidden = true;
  isiKeranjang = item || [];
  const belumMasuk = item === null;

  ambilById('keranjang-masuk').hidden = !belumMasuk;
  ambilById('keranjang-kosong').hidden = belumMasuk || isiKeranjang.length > 0;
  ambilById('keranjang-isi').hidden = isiKeranjang.length === 0;
  ambilById('daftar-keranjang').replaceChildren(...isiKeranjang.map(buatItem));

  const dipilih = isiKeranjang.filter((i) => i.dipilih);
  const semua = ambilById('pilih-semua');
  semua.checked = isiKeranjang.length > 0 && dipilih.length === isiKeranjang.length;
  semua.indeterminate = dipilih.length > 0 && dipilih.length < isiKeranjang.length;

  ambilById('ringkasan-item').textContent = dipilih.length;
  ambilById('ringkasan-total').textContent = rupiah.format(
    Math.round(dipilih.reduce((n, i) => n + i.harga * i.jumlah, 0)),
  );

  // Tombol lanjut hanya aktif bila ada produk yang diceklis
  ambilById('btn-lanjut').setAttribute('aria-disabled', String(dipilih.length === 0));
  ambilById('petunjuk-pilih').hidden = dipilih.length > 0;
}

document.addEventListener('DOMContentLoaded', async () => {
  ambilById('pilih-semua').addEventListener('change', (e) => ubah(Keranjang.pilih(0, e.target.checked)));
  ambilById('btn-lanjut').addEventListener('click', (e) => {
    if (e.currentTarget.getAttribute('aria-disabled') === 'true') e.preventDefault();
  });

  const hasil = await Keranjang.ambil();
  if (hasil.perluMasuk) return tampilkan(null);
  if (!hasil.ok) {
    ambilById('keranjang-kosong').hidden = true;
    const galat = ambilById('galat-keranjang');
    galat.textContent = hasil.pesan;
    galat.hidden = false;
    return;
  }
  tampilkan(hasil.item);
});
