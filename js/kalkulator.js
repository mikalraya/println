// Kalkulator harga. Memakai data PRODUK dari js/produk.js (muat produk.js lebih dulu).
// Aturan sesuai CLAUDE.md bagian 3. Tidak ada diskon, ongkir, atau biaya lain.
//   lembar : harga x jumlah lembar
//   paket  : harga x jumlah paket (1 paket = 100 pcs)
//   luas   : harga x panjang (m) x lebar (m) x jumlah
//   pcs    : harga x jumlah pcs
// Produk dengan harga "Mulai" (harga_mulai = true) ditampilkan sebagai ESTIMASI.

const angkaId = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

// Label kolom jumlah untuk tiap tipe hitung
const LABEL_JUMLAH = {
  lembar: 'Jumlah lembar',
  paket: 'Jumlah paket (1 paket = 100 pcs)',
  luas: 'Jumlah banner',
  pcs: 'Jumlah pcs',
};

// Hitung harga. Mengembalikan galat per kolom bila ada isian yang salah.
function hitungHarga(produk, pilihan) {
  const galat = {};
  const jumlah = Number(pilihan.jumlah);
  if (!Number.isInteger(jumlah) || jumlah < 1) galat.jumlah = 'Jumlah minimal 1 dan harus bilangan bulat.';
  else if (jumlah > 10000) galat.jumlah = 'Jumlah terlalu besar. Untuk lebih dari 10.000, hubungi admin lewat WhatsApp.';

  let luas = 1;
  let ukuran = '';
  if (produk.tipe_hitung === 'luas') {
    const panjang = Number(pilihan.panjang);
    const lebar = Number(pilihan.lebar);
    if (!(panjang >= 0.1 && panjang <= 20)) galat.panjang = 'Panjang harus antara 0,1 dan 20 meter.';
    if (!(lebar >= 0.1 && lebar <= 20)) galat.lebar = 'Lebar harus antara 0,1 dan 20 meter.';
    if (!galat.panjang && !galat.lebar) {
      luas = panjang * lebar;
      ukuran = `${angkaId.format(panjang)} × ${angkaId.format(lebar)} m`;
    }
  }

  if (Object.keys(galat).length) return { valid: false, galat };

  const total = Math.round(produk.harga * luas * jumlah);
  const satuanHarga = `${rupiah.format(produk.harga)} per ${produk.satuan}`;

  // Rincian perhitungan dan keterangan spesifikasi sesuai tipe
  let perhitungan;
  let spesifikasi;
  if (produk.tipe_hitung === 'luas') {
    perhitungan = `${rupiah.format(produk.harga)} × ${angkaId.format(luas)} m² × ${angkaId.format(jumlah)} buah`;
    spesifikasi = ukuran;
  } else if (produk.tipe_hitung === 'paket') {
    perhitungan = `${rupiah.format(produk.harga)} × ${angkaId.format(jumlah)} paket`;
    spesifikasi = `${angkaId.format(jumlah * 100)} pcs (${angkaId.format(jumlah)} paket)`;
  } else {
    perhitungan = `${rupiah.format(produk.harga)} × ${angkaId.format(jumlah)} ${produk.tipe_hitung === 'lembar' ? 'lembar' : 'pcs'}`;
    spesifikasi = '';
  }

  return {
    valid: true,
    galat,
    jumlah,
    total,
    spesifikasi,
    hargaPerItem: total / jumlah,
    baris: [
      ['Produk', produk.nama],
      ['Harga', `${produk.harga_mulai ? 'Mulai ' : ''}${satuanHarga}`],
      ...(ukuran ? [['Ukuran', ukuran]] : []),
      ['Perhitungan', perhitungan],
    ],
  };
}

// ----- Tampilan -----

const el = (id) => document.getElementById(id);
let hasilTerakhir = null;

function produkTerpilih() {
  return PRODUK.find((p) => p.id === el('kal-produk').value);
}

// Tampilkan kolom sesuai tipe hitung produk
function aturFormUntukProduk() {
  const produk = produkTerpilih();
  el('kal-blok-luas').hidden = produk.tipe_hitung !== 'luas';
  el('kal-label-jumlah').textContent = LABEL_JUMLAH[produk.tipe_hitung];
  el('kal-catatan-mulai').hidden = !produk.harga_mulai;
  el('kal-catatan-desain').hidden = !produk.perlu_desain;
}

function tampilkanGalat(galat) {
  ['panjang', 'lebar', 'jumlah'].forEach((nama) => {
    const area = el(`galat-kal-${nama}`);
    const input = el(`kal-${nama}`);
    area.textContent = galat[nama] || '';
    area.hidden = !galat[nama];
    if (galat[nama]) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

function hitungUlang() {
  const produk = produkTerpilih();
  const hasil = hitungHarga(produk, {
    panjang: el('kal-panjang').value,
    lebar: el('kal-lebar').value,
    jumlah: el('kal-jumlah').value,
  });
  tampilkanGalat(hasil.galat);
  hasilTerakhir = hasil.valid ? { ...hasil, produk } : null;
  el('info-kalkulator').hidden = true;

  // Produk berharga "Mulai" ditampilkan sebagai estimasi
  el('label-total').textContent = produk.harga_mulai ? 'Estimasi total' : 'Total';

  const rincian = el('hasil-rincian');
  if (!hasil.valid) {
    rincian.replaceChildren();
    el('hasil-total').textContent = '—';
  } else {
    rincian.replaceChildren(...hasil.baris.flatMap(([nama, nilai]) => {
      const dt = document.createElement('dt');
      dt.textContent = nama;
      const dd = document.createElement('dd');
      dd.textContent = nilai;
      return [dt, dd];
    }));
    el('hasil-total').textContent = rupiah.format(hasil.total);
  }
  ['btn-keranjang', 'btn-pesan'].forEach((id) => { el(id).disabled = !hasil.valid; });
}

// Item dari hasil hitungan terakhir
function itemDariHasil() {
  const { produk, spesifikasi, hargaPerItem, jumlah } = hasilTerakhir;
  return {
    produkId: produk.id,
    nama: produk.nama,
    lini: produk.lini,
    spesifikasi,
    harga: hargaPerItem,
    jumlah,
    perluDesain: produk.perlu_desain,
  };
}

// Dipanggil dari tombol "Hitung harga" pada kartu produk
function pilihProdukDiKalkulator(id) {
  el('kal-produk').value = id;
  aturFormUntukProduk();
  hitungUlang();
  el('kalkulator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  el('kal-produk').focus({ preventScroll: true });
}

function mulaiKalkulator() {
  if (!el('kal-produk')) return;

  const tersedia = PRODUK.filter((p) => p.status !== 'Habis');
  const kelompok = (lini) => {
    const g = document.createElement('optgroup');
    g.label = lini;
    tersedia.filter((p) => p.lini === lini).forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.nama} (${p.harga_mulai ? 'mulai ' : ''}${rupiah.format(p.harga)} per ${p.satuan})`;
      g.append(o);
    });
    return g;
  };
  el('kal-produk').replaceChildren(...LINI.map(kelompok));

  const dariUrl = new URLSearchParams(location.search).get('produk');
  if (dariUrl && tersedia.some((p) => p.id === dariUrl)) el('kal-produk').value = dariUrl;

  aturFormUntukProduk();
  hitungUlang();

  el('kal-produk').addEventListener('change', () => { aturFormUntukProduk(); hitungUlang(); });
  ['kal-panjang', 'kal-lebar', 'kal-jumlah'].forEach((id) => el(id).addEventListener('input', hitungUlang));

  // Tambah ke keranjang (database, perlu login)
  el('btn-keranjang').addEventListener('click', async () => {
    if (!hasilTerakhir) return;
    const tombol = el('btn-keranjang');
    tombol.disabled = true;
    const item = itemDariHasil();
    const hasil = await Keranjang.tambah(item);
    tombol.disabled = false;
    kabarKeranjang(hasil, item.nama);
  });

  // Pesan sekarang: langsung ke form, hanya produk ini yang dipesan (tidak masuk keranjang)
  el('btn-pesan').addEventListener('click', () => {
    if (!hasilTerakhir) return;
    Keranjang.pesanLangsung(itemDariHasil());
    location.href = 'pesan.html?langsung=1';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Tunggu produk dari database dulu (fungsi ada di produk.js)
  if (typeof muatProdukDariDb === 'function') await muatProdukDariDb();
  mulaiKalkulator();
});
