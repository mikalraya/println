// Form pemesanan. Produk datang dari kalkulator (sessionStorage) atau dari ?produk=id.
// Pesanan dikirim ke Google Apps Script (CONFIG.urlApi). Tanpa urlApi (mode contoh),
// pelanggan menyelesaikan pesanan lewat WhatsApp. Fungsi bersama ada di js/main.js dan js/kalkulator.js.

const POLA_WA = /^08\d{8,12}$/;
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KUNCI_TERAKHIR = 'printin_terakhir';

const ambilEl = (id) => document.getElementById(id);

function setGalat(input, pesan) {
  const area = ambilEl(`galat-${input.id}`);
  if (!area) return;
  area.textContent = pesan || '';
  area.hidden = !pesan;
  if (pesan) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

// Tanggal hari ini dalam format YYYY-MM-DD (waktu lokal)
function hariIni() {
  const t = new Date();
  const dua = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${dua(t.getMonth() + 1)}-${dua(t.getDate())}`;
}

// Pesanan yang sedang diisi: { produk, hasil } dan file desain yang dipilih
let pesananIni = null;
let berkasDesain = null;

function bacaPilihan() {
  let simpan = null;
  try { simpan = JSON.parse(sessionStorage.getItem(KUNCI_PILIHAN)); } catch (err) { /* diabaikan */ }
  // Tautan langsung dari tempat lain: pesan.html?produk=mug
  const dariUrl = new URLSearchParams(location.search).get('produk');
  if (dariUrl && (!simpan || simpan.produkId !== dariUrl)) simpan = { produkId: dariUrl, jumlah: 1, panjang: 2, lebar: 1 };
  return simpan;
}

// Hitung ulang dari data produk (aturan harga ada di kalkulator.js)
function siapkanPesanan() {
  const simpan = bacaPilihan();
  const produk = simpan && PRODUK.find((p) => p.id === simpan.produkId && p.status !== 'Habis');
  if (!produk) return null;
  const hasil = hitungHarga(produk, simpan);
  return hasil.valid ? { produk, hasil, pilihan: simpan } : null;
}

function tampilkanPesanan() {
  ambilEl('pesanan-kosong').hidden = Boolean(pesananIni);
  ambilEl('pesanan-isi').hidden = !pesananIni;
  if (!pesananIni) return;

  const { produk, hasil } = pesananIni;
  const li = document.createElement('li');
  const nama = document.createElement('strong');
  nama.textContent = produk.nama;
  const rinci = document.createElement('span');
  rinci.textContent = hasil.baris.find(([k]) => k === 'Perhitungan')[1];
  const spek = document.createElement('span');
  spek.className = 'item-spek';
  spek.textContent = hasil.spesifikasi;
  li.append(nama, rinci, ...(hasil.spesifikasi ? [spek] : []));
  ambilEl('daftar-pesanan').replaceChildren(li);

  ambilEl('pesanan-label-total').textContent = produk.harga_mulai ? 'Estimasi total' : 'Perkiraan total';
  ambilEl('pesanan-total').textContent = rupiah.format(hasil.total);
  ambilEl('tautan-ubah').href = `produk.html?produk=${encodeURIComponent(produk.id)}#kalkulator`;

  // File desain/dokumen wajib untuk semua produk
  ambilEl('blok-desain').hidden = false;
  ambilEl('judul-desain').textContent = produk.perlu_desain ? 'File desain' : 'File dokumen';
  const lencana = ambilEl('lencana-desain');
  lencana.textContent = 'Wajib';
  lencana.classList.add('wajib');
}

// Periksa isian. Mengembalikan daftar [input, pesan] untuk kolom yang salah.
function periksaForm(f) {
  const salah = [];
  const { nama, wa, email, tanggal, alamat, setuju } = f.elements;

  if (nama.value.trim().length < 2) salah.push([nama, 'Nama wajib diisi, minimal 2 huruf.']);

  if (!POLA_WA.test(wa.value.replace(/[\s-]/g, ''))) {
    salah.push([wa, 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.']);
  }

  if (email.value.trim() && !POLA_EMAIL.test(email.value.trim())) {
    salah.push([email, 'Format email belum benar, contoh: nama@email.com.']);
  }

  if (tanggal.value && tanggal.value < hariIni()) {
    salah.push([tanggal, 'Tanggal dibutuhkan tidak boleh sebelum hari ini.']);
  }

  if (f.elements.ambil.value === 'kirim' && alamat.value.trim().length < 10) {
    salah.push([alamat, 'Alamat terlalu singkat (minimal 10 karakter). Tulis lengkap, contoh: Jl. Pandanaran No. 12, RT 03/RW 05, Semarang Selatan, Kota Semarang.']);
  }

  if (!setuju.checked) salah.push([setuju, 'Centang persetujuan Kebijakan Privasi dan ketentuan desain dulu.']);
  return salah;
}

// ----- File desain -----

const FILE_MAKS_BYTE = 10 * 1024 * 1024;
const JENIS_FILE = ['application/pdf', 'image/png', 'image/jpeg'];
const IKON_UNGGAH = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5"/><path d="M7.5 9.5L12 5l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

function ukuranFile(byte) {
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

function buatEl(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

// Pratinjau sederhana (F-16): gambar unggahan ditampilkan di atas foto produk.
// Area cetak dalam persen dari foto produk (img/produk/*.webp).
const AREA_CETAK = {
  mug: { kiri: 36.25, atas: 37.5, lebar: 22.5, tinggi: 28.3 },
  tumbler: { kiri: 43.1, atas: 38.3, lebar: 13.8, tinggi: 31.7 },
  'tote-bag': { kiri: 36.25, atas: 48.3, lebar: 27.5, tinggi: 36.7 },
  'gantungan-kunci': { kiri: 37.5, atas: 50.8, lebar: 25, tinggi: 27.5 },
};
let urlPratinjauMerch = '';

function perbaruiPratinjau(berkas) {
  const kotak = ambilEl('pratinjau-merch');
  if (urlPratinjauMerch) { URL.revokeObjectURL(urlPratinjauMerch); urlPratinjauMerch = ''; }
  const produk = pesananIni && pesananIni.produk;
  const area = produk && AREA_CETAK[produk.id];
  if (!area || !produk.foto || !berkas || berkas.type === 'application/pdf') {
    kotak.hidden = true;
    return;
  }
  const dasar = ambilEl('pratinjau-dasar');
  dasar.src = produk.foto;
  dasar.alt = `Foto contoh ${produk.nama}`;
  const desain = ambilEl('pratinjau-desain');
  urlPratinjauMerch = URL.createObjectURL(berkas);
  desain.src = urlPratinjauMerch;
  desain.alt = `Pratinjau desainmu di atas ${produk.nama}`;
  Object.assign(desain.style, { left: `${area.kiri}%`, top: `${area.atas}%`, width: `${area.lebar}%`, height: `${area.tinggi}%` });
  kotak.hidden = false;
}

// Kartu pilih file. File disimpan di berkasDesain dan baru dikirim saat form dikirim.
let kartuDesain = null;

function buatKartuDesain() {
  const kartu = buatEl('div', 'desain-item');
  let urlPratinjau = '';

  const berkasInput = buatEl('input');
  berkasInput.type = 'file';
  berkasInput.accept = 'application/pdf,image/png,image/jpeg';
  berkasInput.hidden = true;
  berkasInput.setAttribute('aria-label', 'File desain atau dokumen');

  const zona = buatEl('button', 'unggah-zona');
  zona.type = 'button';
  zona.innerHTML = IKON_UNGGAH;
  zona.append(buatEl('strong', '', 'Klik untuk pilih file'), buatEl('span', '', 'atau seret dan lepas file ke sini'));
  zona.setAttribute('aria-label', 'Pilih file desain atau dokumen');

  const hasil = buatEl('div', 'unggah-hasil');
  hasil.hidden = true;
  const gambar = buatEl('img');
  gambar.alt = 'Pratinjau file yang dipilih';
  const pdf = buatEl('div', 'unggah-pdf', 'PDF');
  pdf.setAttribute('aria-hidden', 'true');
  const info = buatEl('div', 'unggah-info');
  const namaFile = buatEl('strong');
  const ukuran = buatEl('small');
  const tombol = buatEl('div', 'unggah-tombol');
  const ganti = buatEl('button', 'btn btn-garis btn-kecil', 'Ganti file');
  const hapus = buatEl('button', 'btn btn-garis btn-kecil', 'Hapus');
  ganti.type = 'button';
  hapus.type = 'button';
  tombol.append(ganti, hapus);
  info.append(namaFile, ukuran, tombol);
  hasil.append(gambar, pdf, info);

  const galat = buatEl('p', 'pesan-galat');
  galat.setAttribute('role', 'alert');
  galat.hidden = true;
  const tampilGalat = (teks) => { galat.textContent = teks || ''; galat.hidden = !teks; };

  const tampilFile = (berkas) => {
    if (urlPratinjau) { URL.revokeObjectURL(urlPratinjau); urlPratinjau = ''; }
    zona.hidden = Boolean(berkas);
    hasil.hidden = !berkas;
    gambar.hidden = true;
    pdf.hidden = true;
    if (!berkas) return;
    namaFile.textContent = berkas.name;
    ukuran.textContent = ukuranFile(berkas.size);
    if (berkas.type === 'application/pdf') {
      pdf.hidden = false;
    } else {
      urlPratinjau = URL.createObjectURL(berkas);
      gambar.src = urlPratinjau;
      gambar.hidden = false;
    }
  };

  const kosongkan = () => {
    berkasDesain = null;
    berkasInput.value = '';
    tampilFile(null);
    perbaruiPratinjau(null);
  };

  const pilih = (berkas) => {
    tampilGalat('');
    let pesan = '';
    if (!JENIS_FILE.includes(berkas.type)) pesan = 'Format file harus PDF, PNG, atau JPG.';
    else if (berkas.size > FILE_MAKS_BYTE) pesan = `Ukuran file ${ukuranFile(berkas.size)}, maksimal 10 MB. Kecilkan dulu filenya atau pakai link Google Drive.`;
    if (pesan) {
      kosongkan();
      tampilGalat(pesan);
      return;
    }
    berkasDesain = berkas;
    tampilFile(berkas);
    perbaruiPratinjau(berkas);
  };

  const buka = () => berkasInput.click();
  zona.addEventListener('click', buka);
  ganti.addEventListener('click', buka);
  hapus.addEventListener('click', () => { tampilGalat(''); kosongkan(); });
  berkasInput.addEventListener('change', () => { if (berkasInput.files[0]) pilih(berkasInput.files[0]); });

  // Seret dan lepas file ke area unggah
  ['dragenter', 'dragover'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.add('unggah-seret'); }));
  ['dragleave', 'drop'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.remove('unggah-seret'); }));
  zona.addEventListener('drop', (e) => {
    if (!e.dataTransfer.files.length) return;
    berkasInput.files = e.dataTransfer.files;
    pilih(berkasInput.files[0]);
  });

  kartu.append(berkasInput, zona, hasil, galat);
  return { kartu, tampilGalat, fokus: () => (zona.hidden ? ganti : zona).focus() };
}

// Periksa desain: file atau link. Mengembalikan pesan galat, atau '' bila aman.
function periksaDesain(form) {
  const link = form.elements.linkFile.value.trim();
  setGalat(form.elements.linkFile, '');
  kartuDesain.tampilGalat('');
  if (link && !/^https:\/\/\S+$/.test(link)) {
    setGalat(form.elements.linkFile, 'Link harus diawali https://, contoh: https://drive.google.com/...');
    return 'link';
  }
  if (!berkasDesain && !link) {
    kartuDesain.tampilGalat(`File untuk ${pesananIni.produk.nama} wajib diunggah (PDF, PNG, atau JPG), atau tempel link Google Drive di bawahnya.`);
    return 'file';
  }
  return '';
}

// Baca file sebagai base64 (tanpa awalan data:)
function bacaBase64(berkas) {
  return new Promise((selesai, gagal) => {
    const pembaca = new FileReader();
    pembaca.onload = () => selesai(String(pembaca.result).split(',')[1]);
    pembaca.onerror = () => gagal(new Error('File belum bisa dibaca. Pilih ulang filenya.'));
    pembaca.readAsDataURL(berkas);
  });
}

// ----- Kirim -----

function dataPesanan(form) {
  const f = form.elements;
  const { produk, hasil, pilihan } = pesananIni;
  return {
    produkId: produk.id,
    jumlah: hasil.jumlah,
    panjang: produk.tipe_hitung === 'luas' ? Number(pilihan.panjang) : undefined,
    lebar: produk.tipe_hitung === 'luas' ? Number(pilihan.lebar) : undefined,
    nama: f.nama.value.trim(),
    wa: f.wa.value.replace(/[\s-]/g, ''),
    email: f.email.value.trim(),
    tanggal: f.tanggal.value,
    ambil: f.ambil.value,
    alamat: f.alamat.value.trim(),
    catatan: f.catatan.value.trim(),
    linkFile: f.linkFile.value.trim(),
    setuju: f.setuju.checked,
  };
}

// Ringkasan untuk halaman Bayar dan pesan WhatsApp
function ringkasanPesanan(data, kode, total, tanpaServer) {
  const { produk, hasil } = pesananIni;
  return { kode, nama: data.nama, produk: produk.nama, spesifikasi: hasil.spesifikasi, jumlah: data.jumlah, total, ambil: data.ambil, tanpaServer };
}

// Periksa semua isian; mengembalikan true bila lolos. Fokus ke kolom pertama yang salah.
function periksaSemua(form, galatPesanan, denganDesain) {
  form.querySelectorAll('input, textarea').forEach((i) => setGalat(i, ''));
  galatPesanan.hidden = true;

  if (!pesananIni) {
    galatPesanan.textContent = 'Pesananmu masih kosong. Pilih produk dulu di halaman Produk.';
    galatPesanan.hidden = false;
    ambilEl('judul-isi-pesanan').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  const salah = periksaForm(form);
  salah.forEach(([input, pesan]) => setGalat(input, pesan));
  const salahDesain = denganDesain ? periksaDesain(form) : '';
  if (salah.length) salah[0][0].focus();
  else if (salahDesain === 'file') kartuDesain.fokus();
  else if (salahDesain === 'link') form.elements.linkFile.focus();
  return !salah.length && !salahDesain;
}

async function kirimPesanan(form, galatPesanan) {
  const tombol = form.querySelector('button[type="submit"]');
  const teksAwal = tombol.textContent;
  tombol.disabled = true;
  tombol.textContent = 'Mengirim pesanan…';

  const data = dataPesanan(form);
  try {
    const isi = { action: 'pesan', ...data };
    if (berkasDesain) {
      isi.berkas = { nama: berkasDesain.name, tipe: berkasDesain.type, data: await bacaBase64(berkasDesain) };
    }
    const hasil = await panggilApi({ body: isi });
    if (!hasil.ok) throw new Error(hasil.pesan || 'Pesanan belum bisa dikirim. Coba lagi.');

    sessionStorage.setItem(KUNCI_TERAKHIR, JSON.stringify(ringkasanPesanan(data, hasil.kode, hasil.total, false)));
    sessionStorage.removeItem(KUNCI_PILIHAN);
    location.href = `bayar.html?kode=${encodeURIComponent(hasil.kode)}`;
  } catch (err) {
    tombol.disabled = false;
    tombol.textContent = teksAwal;
    galatPesanan.textContent = err.message;
    galatPesanan.hidden = false;
    galatPesanan.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function mulaiFormPesan() {
  const form = ambilEl('form-pesan');
  if (!form) return;

  ambilEl('pesan-tanggal').min = hariIni();
  await muatProdukDariSheets();
  pesananIni = siapkanPesanan();
  tampilkanPesanan();
  if (pesananIni) {
    kartuDesain = buatKartuDesain();
    ambilEl('daftar-desain').replaceChildren(kartuDesain.kartu);
  }
  ambilEl('info-mode-contoh').hidden = Boolean(CONFIG.urlApi);

  // Alamat hanya diminta jika pesanan dikirim (minimisasi data)
  form.addEventListener('change', (e) => {
    if (e.target.name === 'ambil') {
      const kirim = form.elements.ambil.value === 'kirim';
      ambilEl('blok-alamat').hidden = !kirim;
      if (!kirim) setGalat(form.elements.alamat, '');
    }
  });
  form.addEventListener('input', (e) => {
    if (e.target.matches('input, textarea')) setGalat(e.target, '');
  });

  // Pesan galat umum, dibuat sekali
  const galatPesanan = document.createElement('p');
  galatPesanan.className = 'pesan-galat';
  galatPesanan.setAttribute('role', 'alert');
  galatPesanan.hidden = true;
  form.querySelector('button[type="submit"]').before(galatPesanan);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!CONFIG.urlApi) { alihkanKeWa(form, galatPesanan); return; }
    if (periksaSemua(form, galatPesanan, true)) kirimPesanan(form, galatPesanan);
  });

  ambilEl('btn-wa-pesan').addEventListener('click', () => alihkanKeWa(form, galatPesanan));
}

// Pesan lewat WhatsApp saja: validasi data diri, lalu buka chat berisi detail pesanan.
// Desain tidak diunggah; pelanggan mengirimnya lewat chat (atau link Drive).
function alihkanKeWa(form, galatPesanan) {
  if (!periksaSemua(form, galatPesanan, false)) return;
  const data = dataPesanan(form);
  const ringkasan = ringkasanPesanan(data, '', pesananIni.hasil.total, true);
  sessionStorage.setItem(KUNCI_TERAKHIR, JSON.stringify(ringkasan));
  window.open(`https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(pesanWaPesanan(ringkasan))}`, '_blank', 'noopener');
}

document.addEventListener('DOMContentLoaded', mulaiFormPesan);
