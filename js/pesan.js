// Form pemesanan (checkout). Pesanan diambil dari produk yang diceklis di keranjang (database),
// atau dari satu produk "Pesan sekarang" (?langsung=1). Pesanan disimpan lewat api/pesanan.php,
// lalu pelanggan diarahkan ke halaman bayar. Fungsi keranjang ada di js/main.js.

const POLA_WA = /^08\d{8,12}$/;
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ambilEl = (id) => document.getElementById(id);

function setGalat(input, pesan) {
  const area = ambilEl(`galat-${input.id}`);
  if (!area) return;
  area.textContent = pesan || '';
  area.hidden = !pesan;
  if (pesan) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

// Harga tanpa spasi tak terputus agar rapi di WhatsApp
const rp = (angka) => rupiah.format(angka).replace(/ /g, ' ');

// Tanggal hari ini dalam format YYYY-MM-DD (waktu lokal)
function hariIni() {
  const t = new Date();
  const dua = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${dua(t.getMonth() + 1)}-${dua(t.getDate())}`;
}

// Produk yang sedang dipesan, dan asalnya (keranjang atau pesan langsung)
let itemPesanan = [];
let dariKeranjang = false;

// Cek login lewat api/sesi.php. Mengembalikan data sesi, atau { masuk: false }.
async function ambilSesi() {
  try {
    const res = await fetch(`${CONFIG.urlApiAkun}sesi.php`, { credentials: 'include' });
    return await res.json();
  } catch (err) {
    return { masuk: false, galat: true };
  }
}

// Muat produk yang dipesan. Pemesanan wajib login supaya status pesanan bisa dipantau.
async function muatPesanan() {
  const langsung = new URLSearchParams(location.search).get('langsung') === '1';
  const kosong = ambilEl('pesanan-kosong-teks');
  const tombolKosong = ambilEl('pesanan-kosong-tombol');
  dariKeranjang = !langsung;

  const sesi = await ambilSesi();
  if (!sesi.masuk) {
    itemPesanan = [];
    kosong.textContent = sesi.galat
      ? 'Tidak bisa terhubung ke server. Buka lewat Laragon, lalu muat ulang halaman ini.'
      : 'Masuk dulu untuk memesan, supaya kamu bisa memantau status pesananmu.';
    tombolKosong.textContent = 'Masuk';
    tombolKosong.href = 'login.html';
  } else {
    // Isi otomatis data dari akun (boleh diubah)
    const form = ambilEl('form-pesan');
    if (!form.elements.nama.value) form.elements.nama.value = sesi.nama || '';
    if (!form.elements.wa.value) form.elements.wa.value = sesi.wa || '';
    if (!form.elements.email.value) form.elements.email.value = sesi.email || '';

    if (langsung) {
      const item = Keranjang.ambilLangsung();
      itemPesanan = item ? [item] : [];
      kosong.textContent = 'Belum ada produk. Pilih dan hitung dulu di halaman Produk.';
      tombolKosong.textContent = 'Pilih produk';
      tombolKosong.href = 'produk.html#kalkulator';
    } else {
      const hasil = await Keranjang.ambil();
      itemPesanan = hasil.ok ? hasil.item.filter((i) => i.dipilih) : [];
      kosong.textContent = hasil.ok
        ? 'Belum ada produk yang dicentang. Pilih produk di keranjang dulu.'
        : hasil.pesan;
      tombolKosong.textContent = 'Buka keranjang';
      tombolKosong.href = 'keranjang.html';
    }
  }
  ambilEl('tautan-ubah-keranjang').hidden = !dariKeranjang;
  tampilkanPesanan();
}

// Tampilkan isi pesanan
function tampilkanPesanan() {
  const isi = itemPesanan;
  ambilEl('pesanan-kosong').hidden = isi.length > 0;
  ambilEl('pesanan-isi').hidden = isi.length === 0;

  ambilEl('daftar-pesanan').replaceChildren(...isi.map((item) => {
    const li = document.createElement('li');
    const nama = document.createElement('strong');
    nama.textContent = item.nama;
    const rinci = document.createElement('span');
    rinci.textContent = `${item.spesifikasi ? `${item.spesifikasi} · ` : ''}${item.jumlah} × ${rp(item.harga)}`;
    const jumlah = document.createElement('span');
    jumlah.className = 'ringkas-harga';
    jumlah.textContent = rp(Math.round(item.harga * item.jumlah));
    li.append(nama, rinci, jumlah);
    return li;
  }));

  const total = Math.round(isi.reduce((n, i) => n + i.harga * i.jumlah, 0));
  ambilEl('pesanan-total').textContent = rupiah.format(total);

  tampilkanDesain();
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
    salah.push([alamat, 'Alamat wajib diisi lengkap kalau pesanan dikirim.']);
  }

  if (!setuju.checked) salah.push([setuju, 'Centang persetujuan Kebijakan Privasi dan ketentuan desain dulu.']);
  return salah;
}

// ----- Unggah file desain (satu per produk) -----

const FILE_MAKS_BYTE = 10 * 1024 * 1024;
const JENIS_FILE = ['application/pdf', 'image/png', 'image/jpeg'];
const IKON_UNGGAH = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5"/><path d="M7.5 9.5L12 5l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

// Pengendali tiap kartu desain, urut sama dengan itemPesanan
let kartuDesain = [];

function ukuranFile(byte) {
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

function buatEl(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

// Satu kartu unggah untuk satu produk. Alamat file hasil unggah disimpan di item.fileUrl.
function buatKartuDesain(item) {
  const kartu = buatEl('div', 'desain-item');
  item.fileUrl = '';
  item.mengunggah = false;
  let urlPratinjau = '';

  const judul = buatEl('p', 'desain-judul');
  judul.append(buatEl('strong', '', item.nama));
  if (item.spesifikasi) judul.append(buatEl('span', 'item-spek', ` · ${item.spesifikasi}`));
  judul.append(buatEl('span', 'lencana-desain wajib', 'Wajib'));

  const berkasInput = buatEl('input');
  berkasInput.type = 'file';
  berkasInput.accept = 'application/pdf,image/png,image/jpeg';
  berkasInput.hidden = true;
  berkasInput.setAttribute('aria-label', `File desain untuk ${item.nama}`);

  const zona = buatEl('button', 'unggah-zona');
  zona.type = 'button';
  zona.innerHTML = IKON_UNGGAH;
  zona.append(buatEl('strong', '', 'Klik untuk pilih file'), buatEl('span', '', 'atau seret dan lepas file ke sini'));
  zona.setAttribute('aria-label', `Pilih file desain untuk ${item.nama}`);

  const hasil = buatEl('div', 'unggah-hasil');
  hasil.hidden = true;
  const gambar = buatEl('img');
  gambar.alt = `Pratinjau desain ${item.nama}`;
  const pdf = buatEl('div', 'unggah-pdf', 'PDF');
  pdf.setAttribute('aria-hidden', 'true');
  const info = buatEl('div', 'unggah-info');
  const namaFile = buatEl('strong');
  const status = buatEl('small');
  status.setAttribute('role', 'status');
  const tombol = buatEl('div', 'unggah-tombol');
  const ganti = buatEl('button', 'btn btn-garis btn-kecil', 'Ganti file');
  const hapus = buatEl('button', 'btn btn-garis btn-kecil', 'Hapus');
  ganti.type = 'button';
  hapus.type = 'button';
  tombol.append(ganti, hapus);
  info.append(namaFile, status, tombol);
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
    if (berkas.type === 'application/pdf') {
      pdf.hidden = false;
    } else {
      urlPratinjau = URL.createObjectURL(berkas);
      gambar.src = urlPratinjau;
      gambar.hidden = false;
    }
  };

  const kosongkan = () => {
    item.fileUrl = '';
    berkasInput.value = '';
    tampilFile(null);
  };

  const unggah = async (berkas) => {
    tampilGalat('');
    let pesan = '';
    if (!JENIS_FILE.includes(berkas.type)) pesan = 'Format file harus PDF, PNG, atau JPG.';
    else if (berkas.size > FILE_MAKS_BYTE) pesan = `Ukuran file ${ukuranFile(berkas.size)}, maksimal 10 MB. Kecilkan dulu filenya.`;
    if (pesan) {
      kosongkan();
      tampilGalat(pesan);
      return;
    }

    tampilFile(berkas);
    item.fileUrl = '';
    item.mengunggah = true;
    status.textContent = `${ukuranFile(berkas.size)} · Sedang diunggah…`;
    const data = new FormData();
    data.append('berkas', berkas);
    try {
      const res = await fetch(`${CONFIG.urlApiAkun}upload-desain.php`, { method: 'POST', credentials: 'include', body: data });
      const balasan = await res.json();
      if (!balasan.ok) throw new Error(balasan.pesan || 'File belum bisa diunggah.');
      // Abaikan jika pengguna sudah mengganti atau menghapus file selama unggahan berjalan
      if (berkasInput.files[0] !== berkas) return;
      item.fileUrl = CONFIG.urlDasarServer + balasan.file;
      status.textContent = `${ukuranFile(berkas.size)} · Berhasil diunggah`;
    } catch (err) {
      kosongkan();
      tampilGalat(err instanceof SyntaxError || err instanceof TypeError
        ? 'Tidak bisa terhubung ke server. File belum terunggah, coba lagi.'
        : err.message);
    } finally {
      item.mengunggah = false;
    }
  };

  const buka = () => berkasInput.click();
  zona.addEventListener('click', buka);
  ganti.addEventListener('click', buka);
  hapus.addEventListener('click', () => { tampilGalat(''); kosongkan(); });
  berkasInput.addEventListener('change', () => { if (berkasInput.files[0]) unggah(berkasInput.files[0]); });

  // Seret dan lepas file ke area unggah
  ['dragenter', 'dragover'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.add('unggah-seret'); }));
  ['dragleave', 'drop'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.remove('unggah-seret'); }));
  zona.addEventListener('drop', (e) => {
    if (!e.dataTransfer.files.length) return;
    berkasInput.files = e.dataTransfer.files;
    unggah(berkasInput.files[0]);
  });

  kartu.append(judul, berkasInput, zona, hasil, galat);
  return {
    kartu,
    tampilGalat,
    fokus: () => (zona.hidden ? ganti : zona).focus(),
  };
}

// Gambar ulang daftar kartu desain sesuai isi pesanan
function tampilkanDesain() {
  kartuDesain = itemPesanan.map(buatKartuDesain);
  ambilEl('blok-desain').hidden = itemPesanan.length === 0;
  ambilEl('daftar-desain').replaceChildren(...kartuDesain.map((k) => k.kartu));
}

// Periksa file per produk. Mengembalikan daftar [indeks, pesan].
function periksaDesain() {
  const salah = [];
  itemPesanan.forEach((item, i) => {
    kartuDesain[i].tampilGalat('');
    if (item.mengunggah) salah.push([i, 'File masih diunggah. Tunggu sebentar sampai selesai.']);
    else if (!item.fileUrl) salah.push([i, `File untuk ${item.nama} wajib diunggah (PDF, PNG, atau JPG).`]);
  });
  return salah;
}

async function mulaiFormPesan() {
  const form = ambilEl('form-pesan');
  if (!form) return;

  ambilEl('pesan-tanggal').min = hariIni();

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

  await muatPesanan();

  // Pesan jika keranjang kosong, dibuat sekali
  const galatPesanan = document.createElement('p');
  galatPesanan.className = 'pesan-galat';
  galatPesanan.setAttribute('role', 'alert');
  galatPesanan.hidden = true;
  form.querySelector('button[type="submit"]').before(galatPesanan);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.querySelectorAll('input, textarea').forEach((i) => setGalat(i, ''));
    galatPesanan.hidden = true;

    const isi = itemPesanan;
    if (!isi.length) {
      galatPesanan.textContent = 'Pesananmu masih kosong. Pilih produk dulu di halaman Produk atau centang produk di keranjang.';
      galatPesanan.hidden = false;
      ambilEl('judul-isi-pesanan').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const salah = periksaForm(form);
    const salahDesain = periksaDesain();
    if (salah.length || salahDesain.length) {
      salah.forEach(([input, pesan]) => setGalat(input, pesan));
      salahDesain.forEach(([i, pesan]) => kartuDesain[i].tampilGalat(pesan));
      // Urutan di layar: data diri dulu, baru desain, lalu bagian bawah
      if (salah.length && (!salahDesain.length || salah[0][0].id.match(/nama|wa|email/))) salah[0][0].focus();
      else if (salahDesain.length) kartuDesain[salahDesain[0][0]].fokus();
      else salah[0][0].focus();
      return;
    }

    kirimPesanan(form, galatPesanan);
  });
}

// Simpan pesanan ke database, lalu ke halaman bayar
async function kirimPesanan(form, galatPesanan) {
  const tombol = form.querySelector('button[type="submit"]');
  const teksAwal = tombol.textContent;
  tombol.disabled = true;
  tombol.textContent = 'Membuat pesanan…';

  const f = form.elements;
  const hasil = await panggilPesanan({
    aksi: 'buat',
    sumber: dariKeranjang ? 'keranjang' : 'langsung',
    item: dariKeranjang ? undefined : { ...itemPesanan[0], file: itemPesanan[0].fileUrl },
    files: dariKeranjang ? Object.fromEntries(itemPesanan.map((i) => [i.id, i.fileUrl])) : undefined,
    nama: f.nama.value.trim(),
    wa: f.wa.value,
    email: f.email.value.trim(),
    tanggal: f.tanggal.value,
    ambil: f.ambil.value,
    alamat: f.alamat.value.trim(),
    catatan: f.catatan.value.trim(),
    setuju: f.setuju.checked,
  });

  if (hasil.ok) {
    if (!dariKeranjang) Keranjang.hapusLangsung();
    location.href = `bayar.html?kode=${encodeURIComponent(hasil.kode)}`;
    return;
  }
  tombol.disabled = false;
  tombol.textContent = teksAwal;
  galatPesanan.textContent = hasil.perluMasuk ? 'Sesi masuk habis. Masuk lagi dulu, lalu kirim ulang.' : hasil.pesan;
  galatPesanan.hidden = false;
  galatPesanan.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('DOMContentLoaded', mulaiFormPesan);
