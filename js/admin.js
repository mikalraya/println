// Dashboard superadmin: ringkasan, produk, pengguna, keuangan, profil.
// Semua data datang dari api/admin/*.php. Server mengecek role superadmin di setiap permintaan,
// jadi halaman ini hanya tampilan (bukan pengaman). Teks dari database selalu lewat textContent.

const BAGIAN = ['ringkasan', 'produk', 'pesanan', 'pengguna', 'keuangan', 'profil'];
const KATEGORI_UANG = {
  pemasukan: ['Printing Reguler', 'Custom Merchandise', 'Lainnya'],
  pengeluaran: ['Bahan baku', 'Gaji', 'Operasional', 'Peralatan', 'Lainnya'],
};

const $ = (id) => document.getElementById(id);
const grafik = {};
let dataProduk = [];
let dataUsers = [];
let dataPesanan = [];
let dataKeuangan = null;

// Cocokkan teks pencarian (tanpa peduli huruf besar/kecil) ke beberapa bidang
function cocokCari(kata, ...bidang) {
  const k = kata.trim().toLowerCase();
  return !k || bidang.some((b) => String(b ?? '').toLowerCase().includes(k));
}

// Tulis info jumlah hasil, mis. "Menampilkan 3 dari 13 data"
function infoHasil(id, tampil, total) {
  $(id).textContent = tampil === total ? `Menampilkan semua ${total} data` : `Menampilkan ${tampil} dari ${total} data`;
}

function barisKosong(kolom, teks) {
  const tr = buat('tr');
  const td = buat('td', 'adm-kosong', teks);
  td.colSpan = kolom;
  tr.append(td);
  return tr;
}

// ----- Helper umum -----

function buat(tag, kelas, teks) {
  const el = document.createElement(tag);
  if (kelas) el.className = kelas;
  if (teks !== undefined) el.textContent = teks;
  return el;
}

function tanggalIndo(tgl) {
  return new Date(`${tgl.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function hariIni() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Pemberitahuan singkat di pojok layar
function toast(teks, galat = false) {
  const el = buat('div', `adm-toast${galat ? ' adm-toast-galat' : ''}`, teks);
  el.setAttribute('role', 'status');
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

// Panggil API admin. 401 -> ke halaman masuk, 403 -> bukan superadmin.
async function panggil(file, isi = {}) {
  let res;
  try {
    res = await fetch(`${CONFIG.urlApiAkun}admin/${file}.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isi),
    });
  } catch {
    tampilStatus('Tidak bisa terhubung ke server. Pastikan Laragon (Apache dan MySQL) menyala, lalu muat ulang.');
    throw new Error('jaringan');
  }
  let data = {};
  try { data = await res.json(); } catch { /* bukan JSON */ }
  if (res.status === 401) {
    window.location.href = 'login.html';
    throw new Error('belum masuk');
  }
  if (res.status === 403) {
    tampilStatus('Halaman ini hanya untuk akun superadmin.', 'index.html', 'Kembali ke beranda');
    throw new Error('bukan superadmin');
  }
  return { status: res.status, data };
}

function tampilStatus(teks, tautan, labelTautan) {
  const el = $('adm-status');
  el.hidden = false;
  el.textContent = teks;
  if (tautan) {
    const a = buat('a', 'btn btn-utama', labelTautan);
    a.href = tautan;
    el.append(' ', a);
  }
  document.querySelectorAll('[data-bagian]').forEach((b) => { b.hidden = true; });
}

// ----- Form: baca, isi, tampilkan galat -----

function setGalatForm(form, galat = {}) {
  form.querySelectorAll('[data-galat]').forEach((p) => {
    const pesan = galat[p.dataset.galat];
    p.textContent = pesan || '';
    p.hidden = !pesan;
    const input = form.elements[p.dataset.galat];
    if (input) {
      if (pesan) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  });
  const pertama = form.querySelector('[aria-invalid="true"]');
  if (pertama) pertama.focus();
}

function infoForm(form, teks) {
  const info = form.querySelector('.info-form');
  info.textContent = teks || '';
  info.hidden = !teks;
}

function siapkanDialog(dialog) {
  dialog.querySelectorAll('[data-tutup]').forEach((t) => t.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

// Sel tabel berisi tombol aksi. Tombol ditaruh di div (bukan flex di td) agar garis tabel tetap utuh.
// Ikon SVG statis untuk tombol aksi tabel
const IKON_AKSI = {
  detail: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  ubah: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  hapus: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
};

// Tombol ikon dengan tooltip (title) dan label untuk pembaca layar
function tombolIkon(jenis, label, aksi) {
  const b = buat('button', `tombol-ikon ikon-${jenis}`);
  b.type = 'button';
  b.title = label;
  b.setAttribute('aria-label', label);
  b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON_AKSI[jenis]}</svg>`;
  b.addEventListener('click', aksi);
  return b;
}

function selAksi() {
  const td = buat('td');
  td.append(buat('div', 'adm-aksi'));
  return td;
}

// ----- Dialog detail (hanya baca) -----

// baris: [[label, nilai], ...]; tambahan: elemen opsional di bawah daftar (mis. garis waktu)
function bukaDetail({ judul, sub, foto, baris, tambahan }) {
  $('judul-dialog-detail').textContent = judul;
  $('sub-dialog-detail').textContent = sub || '';
  const isi = $('isi-dialog-detail');
  isi.replaceChildren();
  if (foto) {
    const img = buat('img', 'detail-foto');
    img.src = foto;
    img.alt = `Foto ${judul}`;
    isi.append(img);
  }
  const dl = buat('dl', 'info-daftar detail-info');
  baris.forEach(([label, nilai]) => {
    const d = buat('div');
    d.append(buat('dt', '', label), buat('dd', '', nilai === null || nilai === undefined || nilai === '' ? '—' : String(nilai)));
    dl.append(d);
  });
  isi.append(dl);
  if (tambahan) isi.append(tambahan);
  $('dialog-detail').showModal();
}

// ----- Navigasi antar bagian -----

function bagianAktif() {
  const nama = location.hash.slice(1);
  return BAGIAN.includes(nama) ? nama : 'ringkasan';
}

const pemuat = {
  ringkasan: muatRingkasan,
  produk: muatProduk,
  pesanan: muatPesanan,
  pengguna: muatUsers,
  keuangan: muatKeuangan,
  profil: muatProfil,
};

async function tampilBagian() {
  const nama = bagianAktif();
  $('adm-status').hidden = true;
  BAGIAN.forEach((b) => { $(`bagian-${b}`).hidden = b !== nama; });
  document.querySelectorAll('[data-menu]').forEach((a) => {
    if (a.dataset.menu === nama) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0 });
  try {
    await pemuat[nama]();
  } catch { /* pesan sudah ditampilkan oleh panggil() */ }
}

// ----- Ringkasan -----

// Ikon untuk tiap warna kartu angka (SVG statis)
const IKON_ANGKA = {
  biru: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  oranye: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M4 4h16"/>',
  tosca: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  kuning: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>',
  ungu: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/>',
};

function kartuAngka(label, nilai, sub, warna) {
  const k = buat('article', 'kartu adm-angka');
  const ikon = buat('span', `adm-angka-ikon adm-angka-${warna}`);
  ikon.setAttribute('aria-hidden', 'true');
  ikon.innerHTML = `<svg viewBox="0 0 24 24">${IKON_ANGKA[warna]}</svg>`;
  const isi = buat('div');
  isi.append(buat('p', 'adm-angka-label', label), buat('p', 'adm-angka-nilai', nilai), buat('p', 'adm-angka-sub', sub));
  k.append(ikon, isi);
  return k;
}

function gambarGrafik(id, konfigurasi) {
  if (typeof Chart === 'undefined') {
    $(id).parentElement.textContent = 'Grafik tidak bisa dimuat (periksa koneksi internet).';
    return;
  }
  grafik[id]?.destroy();
  grafik[id] = new Chart($(id), konfigurasi);
}

// Data mentah ringkasan; filter diterapkan di browser lewat tampilRingkasan()
let dataRingkasan = null;

const NAMA_PERIODE = { 1: 'Bulan ini', 3: '3 bulan terakhir', 6: '6 bulan terakhir', 12: '12 bulan terakhir', semua: 'Semua waktu' };

function kunciBulan(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Daftar bulan (YYYY-MM) yang masuk periode terpilih, dari yang terlama
function daftarBulan(periode, transaksi) {
  const sekarang = new Date();
  let n = Number(periode);
  if (periode === 'semua') {
    const awal = transaksi.map((t) => t.tanggal.slice(0, 7)).sort()[0];
    if (!awal) return [kunciBulan(sekarang)];
    const [th, bl] = awal.split('-').map(Number);
    n = (sekarang.getFullYear() - th) * 12 + (sekarang.getMonth() + 1 - bl) + 1;
  }
  return Array.from({ length: n }, (_, i) => kunciBulan(new Date(sekarang.getFullYear(), sekarang.getMonth() - (n - 1 - i), 1)));
}

async function muatRingkasan() {
  const [ringkas, uang, produk] = await Promise.all([
    panggil('ringkasan'),
    panggil('keuangan', { aksi: 'daftar', bulan: '' }),
    panggil('produk', { aksi: 'daftar' }),
  ]);
  if (!ringkas.data.ok || !uang.data.ok || !produk.data.ok) return toast('Gagal memuat ringkasan.', true);
  dataRingkasan = { pengguna: ringkas.data.pengguna, transaksi: uang.data.transaksi, produk: produk.data.produk };
  tampilRingkasan();
}

function tampilRingkasan() {
  if (!dataRingkasan) return;
  const periode = $('saring-periode').value;
  const lini = $('saring-lini-ringkasan').value;
  const bulan = daftarBulan(periode, dataRingkasan.transaksi);
  const transaksi = dataRingkasan.transaksi.filter((t) => t.tanggal.slice(0, 7) >= bulan[0]);
  const produk = dataRingkasan.produk.filter((p) => !lini || p.lini === lini);
  const { pengguna } = dataRingkasan;
  const namaPeriode = NAMA_PERIODE[periode].toLowerCase();

  const jumlahJenis = (daftar, js) => daftar.filter((t) => t.jenis === js).reduce((n, t) => n + Number(t.jumlah), 0);
  const pemasukan = jumlahJenis(transaksi, 'pemasukan');
  const pengeluaran = jumlahJenis(transaksi, 'pengeluaran');
  const laba = pemasukan - pengeluaran;
  const terbatas = produk.filter((p) => p.status === 'Terbatas').length;
  const habis = produk.filter((p) => p.status === 'Habis').length;

  $('info-ringkasan').textContent = `Menampilkan: ${NAMA_PERIODE[periode]}${lini ? ` · ${lini}` : ''}. Filter periode berlaku untuk data keuangan, filter lini untuk data produk.`;

  $('kartu-angka').replaceChildren(
    kartuAngka('Pemasukan', rupiah.format(pemasukan), NAMA_PERIODE[periode], 'biru'),
    kartuAngka('Pengeluaran', rupiah.format(pengeluaran), NAMA_PERIODE[periode], 'oranye'),
    kartuAngka('Laba', rupiah.format(laba), laba >= 0 ? 'Pemasukan dikurangi pengeluaran' : 'Pengeluaran lebih besar dari pemasukan', 'tosca'),
    kartuAngka('Produk', String(produk.length), `${terbatas} terbatas · ${habis} habis`, 'kuning'),
    kartuAngka('Pengguna', String(pengguna.total), `${pengguna.pelanggan} pelanggan · ${pengguna.baru30hari} baru 30 hari`, 'ungu'),
  );

  const perBulan = bulan.map((k) => {
    const isi = transaksi.filter((t) => t.tanggal.slice(0, 7) === k);
    return { bulan: k, pemasukan: jumlahJenis(isi, 'pemasukan'), pengeluaran: jumlahJenis(isi, 'pengeluaran') };
  });
  const bulanLabel = perBulan.map((m) => new Date(`${m.bulan}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
  const ringkas = new Intl.NumberFormat('id-ID', { notation: 'compact' });
  $('sub-grafik-keuangan').textContent = `${NAMA_PERIODE[periode]}, dalam rupiah`;
  $('grafik-keuangan').setAttribute('aria-label', `Grafik pemasukan dan pengeluaran, ${namaPeriode}. ${perBulan.map((m, i) => `${bulanLabel[i]}: pemasukan ${rupiah.format(m.pemasukan)}, pengeluaran ${rupiah.format(m.pengeluaran)}`).join('. ')}.`);
  gambarGrafik('grafik-keuangan', {
    type: 'bar',
    data: {
      labels: bulanLabel,
      datasets: [
        { label: 'Pemasukan', data: perBulan.map((m) => m.pemasukan), backgroundColor: '#1f6fe8', borderRadius: 6 },
        { label: 'Pengeluaran', data: perBulan.map((m) => m.pengeluaran), backgroundColor: '#ff8a3d', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${rupiah.format(c.parsed.y)}` } } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => ringkas.format(v) } } },
    },
  });

  // Tanpa filter lini: produk per lini. Dengan filter lini: produk per status.
  const kelompok = lini ? ['Tersedia', 'Terbatas', 'Habis'] : [...new Set(produk.map((p) => p.lini))];
  const hitung = (k) => produk.filter((p) => (lini ? p.status : p.lini) === k).length;
  $('judul-grafik-lini').textContent = lini ? `Status produk ${lini}` : 'Produk per lini';
  $('sub-grafik-lini').textContent = lini ? 'Jumlah produk per status' : 'Jumlah produk di katalog';
  $('grafik-lini').setAttribute('aria-label', `${$('judul-grafik-lini').textContent}. ${kelompok.map((k) => `${k}: ${hitung(k)}`).join(', ')}.`);
  gambarGrafik('grafik-lini', {
    type: 'doughnut',
    data: { labels: kelompok, datasets: [{ data: kelompok.map(hitung), backgroundColor: ['#1f6fe8', '#3de0b5', '#ff8a3d'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } },
  });

  const terbaru = $('daftar-terbaru');
  terbaru.replaceChildren(...transaksi.slice(0, 5).map((t) => {
    const li = buat('li', 'adm-baris');
    const kiri = buat('div');
    kiri.append(buat('strong', '', t.keterangan || t.kategori), buat('span', 'adm-sub', `${t.kategori} · ${tanggalIndo(t.tanggal)}`));
    li.append(kiri, buat('span', `adm-uang adm-uang-${t.jenis}`, `${t.jenis === 'pemasukan' ? '+' : '−'}${rupiah.format(t.jumlah)}`));
    return li;
  }));
  if (!transaksi.length) terbaru.replaceChildren(buat('li', 'adm-kosong', 'Belum ada transaksi di periode ini.'));

  const perhatian = $('daftar-perhatian');
  perhatian.replaceChildren(...produk.filter((p) => p.status !== 'Tersedia').map((p) => {
    const li = buat('li', 'adm-baris');
    li.append(buat('strong', '', p.nama), buat('span', `lencana-status status-${p.status.toLowerCase()}`, p.status));
    return li;
  }));
  if (!perhatian.children.length) perhatian.replaceChildren(buat('li', 'adm-kosong', 'Semua produk tersedia. 🎉'));
}

// ----- Produk -----

async function muatProduk() {
  const { data } = await panggil('produk', { aksi: 'daftar' });
  if (!data.ok) return toast(data.pesan || 'Gagal memuat produk.', true);
  dataProduk = data.produk;
  $('daftar-kategori').replaceChildren(...[...new Set(dataProduk.map((p) => p.kategori))].map((k) => {
    const o = buat('option');
    o.value = k;
    return o;
  }));

  tampilProduk();
}

function tampilProduk() {
  const lini = $('saring-lini').value;
  const status = $('saring-status-produk').value;
  const cari = $('cari-produk').value;
  const baris = dataProduk.filter((p) => (!lini || p.lini === lini) && (!status || p.status === status) && cocokCari(cari, p.nama, p.id, p.kategori));
  infoHasil('info-produk', baris.length, dataProduk.length);

  const tbody = $('tabel-produk').tBodies[0];
  tbody.replaceChildren(...baris.map((p) => {
    const tr = buat('tr');
    const sel = (teks, kelas) => { const td = buat('td', kelas); td.append(teks); return td; };

    const nama = buat('td');
    const wadah = buat('div', 'adm-produk-sel');
    const gambar = buat('span', 'adm-thumb');
    if (p.foto) {
      const img = buat('img');
      img.src = urlFotoProduk(p.foto);
      img.alt = '';
      img.loading = 'lazy';
      gambar.append(img);
    } else {
      gambar.classList.add('adm-thumb-kosong');
      gambar.title = 'Belum ada foto';
    }
    const teks = buat('div');
    teks.append(buat('strong', '', p.nama), buat('span', 'adm-sub', `${p.id} · ${p.kategori}`));
    wadah.append(gambar, teks);
    nama.append(wadah);

    const harga = buat('td');
    harga.append(`${p.harga_mulai ? 'Mulai ' : ''}${rupiah.format(p.harga)}`, buat('span', 'adm-sub', `per ${p.satuan}`));

    const status = buat('td');
    status.append(buat('span', `lencana-status status-${p.status.toLowerCase()}`, p.status));

    const aksi = selAksi();
    const detail = tombolIkon('detail', `Lihat detail ${p.nama}`, () => detailProduk(p));
    const ubah = tombolIkon('ubah', `Ubah ${p.nama}`, () => bukaFormProduk(p));
    const hapus = tombolIkon('hapus', `Hapus ${p.nama}`, () => hapusProduk(p));
    aksi.firstChild.append(detail, ubah, hapus);

    tr.append(nama, sel(p.lini), harga, status, aksi);
    return tr;
  }));
  if (!baris.length) tbody.replaceChildren(barisKosong(5, 'Tidak ada produk yang cocok dengan filter.'));
}

function detailProduk(p) {
  bukaDetail({
    judul: p.nama,
    sub: `Kode ${p.id}`,
    foto: p.foto ? urlFotoProduk(p.foto) : '',
    baris: [
      ['Lini', p.lini],
      ['Kategori', p.kategori],
      ['Harga', `${p.harga_mulai ? 'Mulai ' : ''}${rupiah.format(p.harga)} per ${p.satuan}`],
      ['Tipe hitung', p.tipe_hitung],
      ['Perlu file desain', p.perlu_desain ? 'Ya' : 'Tidak'],
      ['Estimasi selesai', p.estimasi],
      ['Status', p.status],
      ['Deskripsi', p.deskripsi],
    ],
  });
}

let sedangUbahProduk = false;
let fotoBaru = null; // File pilihan admin yang belum diunggah
let urlPratinjauFoto = '';
const FOTO_MAKS_BYTE = 5 * 1024 * 1024;

// Foto unggahan ada di server PHP, foto bawaan (img/) ada di situs
function urlFotoProduk(path) {
  return path.startsWith('uploads/') ? CONFIG.urlDasarServer + path : path;
}

// Tampilkan foto di form. src kosong = tampilkan area pilih foto
function tampilFotoForm(src, nama = 'Foto saat ini', info = 'Sudah tersimpan di server') {
  if (urlPratinjauFoto) { URL.revokeObjectURL(urlPratinjauFoto); urlPratinjauFoto = ''; }
  const img = $('dp-foto-img');
  $('pilih-foto').hidden = Boolean(src);
  $('dp-foto-hasil').hidden = !src;
  if (src) img.src = src; else img.removeAttribute('src');
  $('nama-foto').textContent = nama;
  $('info-foto').textContent = info;
}

function ukuranFoto(byte) {
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

function pilihFotoForm() {
  const input = $('p-foto-file');
  const berkas = input.files[0];
  const form = $('form-produk');
  if (!berkas) return;
  let galat = '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(berkas.type)) galat = 'Format foto harus JPG, PNG, atau WebP.';
  else if (berkas.size > FOTO_MAKS_BYTE) galat = `Ukuran foto ${ukuranFoto(berkas.size)}, maksimal 5 MB. Kecilkan dulu fotonya.`;
  if (galat) {
    input.value = '';
    setGalatForm(form, { foto: galat });
    return;
  }
  setGalatForm(form);
  fotoBaru = berkas;
  tampilFotoForm(null);
  urlPratinjauFoto = URL.createObjectURL(berkas);
  $('dp-foto-img').src = urlPratinjauFoto;
  $('pilih-foto').hidden = true;
  $('dp-foto-hasil').hidden = false;
  $('nama-foto').textContent = berkas.name;
  $('info-foto').textContent = `${ukuranFoto(berkas.size)} · Belum disimpan, klik "Simpan produk"`;
}

function hapusFotoForm() {
  fotoBaru = null;
  $('p-foto-file').value = '';
  $('form-produk').elements.foto.value = '';
  setGalatForm($('form-produk'));
  tampilFotoForm(null);
}

// Unggah foto ke server, hasilnya alamat file yang disimpan di database
async function unggahFoto(berkas) {
  const data = new FormData();
  data.append('foto', berkas);
  let res;
  try {
    res = await fetch(`${CONFIG.urlApiAkun}admin/upload-foto.php`, { method: 'POST', credentials: 'include', body: data });
  } catch {
    return { ok: false, pesan: 'Tidak bisa terhubung ke server. Foto belum terunggah.' };
  }
  try { return await res.json(); } catch { return { ok: false, pesan: 'Server tidak membalas dengan benar. Foto belum terunggah.' }; }
}

function bukaFormProduk(p) {
  const form = $('form-produk');
  form.reset();
  setGalatForm(form);
  infoForm(form, '');
  sedangUbahProduk = Boolean(p);
  form.elements.id.dataset.manual = '';
  fotoBaru = null;
  $('p-foto-file').value = '';
  $('judul-dialog-produk').textContent = p ? 'Ubah produk' : 'Tambah produk';
  $('sub-dialog-produk').textContent = p ? p.nama : 'Isi data produk. Kolom bertanda * wajib diisi.';
  $('petunjuk-id').hidden = sedangUbahProduk;
  form.elements.id.readOnly = sedangUbahProduk;
  if (p) {
    ['id', 'nama', 'lini', 'kategori', 'harga', 'satuan', 'tipe_hitung', 'estimasi', 'status', 'foto', 'deskripsi'].forEach((k) => { form.elements[k].value = p[k]; });
    form.elements.harga_mulai.checked = p.harga_mulai;
    form.elements.perlu_desain.checked = p.perlu_desain;
  }
  perbaruiPratinjauHarga();
  tampilFotoForm(p && p.foto ? urlFotoProduk(p.foto) : null);
  $('dialog-produk').showModal();
  form.elements.nama.focus();
}

// Pratinjau harga seperti tampilannya di katalog
function perbaruiPratinjauHarga() {
  const f = $('form-produk').elements;
  const harga = f.harga.value === '' ? null : Number(f.harga.value);
  const teks = harga === null
    ? '—'
    : `${f.harga_mulai.checked ? 'Mulai ' : ''}${rupiah.format(harga)}${f.satuan.value.trim() ? ` / ${f.satuan.value.trim()}` : ''}`;
  $('pratinjau-harga').querySelector('strong').textContent = teks;
}

// Kode produk terisi otomatis dari nama saat menambah produk baru
function isiKodeOtomatis() {
  const f = $('form-produk').elements;
  if (sedangUbahProduk || f.id.dataset.manual) return;
  f.id.value = f.nama.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function simpanProduk(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const f = form.elements;
  const tombol = form.querySelector('[type="submit"]');
  setGalatForm(form);
  infoForm(form, '');
  if (fotoBaru) {
    tombol.disabled = true;
    tombol.textContent = 'Mengunggah foto…';
    const hasil = await unggahFoto(fotoBaru);
    tombol.disabled = false;
    tombol.textContent = 'Simpan produk';
    if (!hasil.ok) {
      setGalatForm(form, { foto: hasil.pesan || 'Foto belum bisa diunggah.' });
      return;
    }
    f.foto.value = hasil.foto;
    fotoBaru = null;
  }
  const produk = {
    id: f.id.value.trim(), nama: f.nama.value.trim(), lini: f.lini.value, kategori: f.kategori.value.trim(),
    harga: f.harga.value === '' ? '' : Number(f.harga.value), satuan: f.satuan.value.trim(), tipe_hitung: f.tipe_hitung.value,
    estimasi: f.estimasi.value.trim(), status: f.status.value, foto: f.foto.value.trim(), deskripsi: f.deskripsi.value.trim(),
    harga_mulai: f.harga_mulai.checked, perlu_desain: f.perlu_desain.checked,
  };
  setGalatForm(form);
  const { data } = await panggil('produk', { aksi: 'simpan', baru: !sedangUbahProduk, produk });
  if (!data.ok) {
    setGalatForm(form, data.galat);
    if (!data.galat) infoForm(form, data.pesan || 'Produk belum bisa disimpan. Coba lagi.');
    return;
  }
  $('dialog-produk').close();
  toast(data.pesan);
  muatProduk();
}

async function hapusProduk(p) {
  const yakin = await tanyaKonfirmasi({
    judul: 'Hapus produk ini?',
    teks: `"${p.nama}" akan dihapus dari katalog. Tindakan ini tidak bisa dibatalkan.`,
    ya: 'Ya, hapus',
  });
  if (!yakin) return;
  const { data } = await panggil('produk', { aksi: 'hapus', id: p.id });
  toast(data.pesan || 'Produk belum bisa dihapus.', !data.ok);
  muatProduk();
}

// ----- Pesanan -----

async function muatPesanan() {
  const { data } = await panggil('pesanan', { aksi: 'daftar' });
  if (!data.ok) return toast(data.pesan || 'Gagal memuat pesanan.', true);
  dataPesanan = data.pesanan;
  tampilPesanan();
}

function tampilPesanan() {
  const status = $('saring-status-pesanan').value;
  const cari = $('cari-pesanan').value;
  const baris = dataPesanan.filter((p) => (!status || p.status === status) && cocokCari(cari, p.kode, p.nama));
  infoHasil('info-pesanan', baris.length, dataPesanan.length);

  const pilihan = (daftar, nilai, label, saatUbah) => {
    const pilih = buat('select', 'adm-pilih');
    pilih.setAttribute('aria-label', label);
    daftar.forEach((n) => {
      const o = buat('option', '', n);
      o.value = n;
      pilih.append(o);
    });
    pilih.value = nilai;
    pilih.addEventListener('change', () => saatUbah(pilih));
    return pilih;
  };

  const tbody = $('tabel-pesanan').tBodies[0];
  tbody.replaceChildren(...baris.map((p) => {
    const tr = buat('tr');
    const kode = buat('td');
    kode.append(buat('strong', '', p.kode), buat('div', 'adm-sub', tanggalIndo(p.dibuat)));

    const pelanggan = buat('td');
    pelanggan.append(buat('strong', '', p.nama), buat('div', 'adm-sub', p.whatsapp));

    const isi = buat('td');
    p.item.forEach((i) => {
      const baris = buat('div', '', `${i.nama}${i.spesifikasi ? ` (${i.spesifikasi})` : ''} × ${i.jumlah}`);
      if (i.file) baris.append(' · ', tautanFile(i.file));
      isi.append(baris);
    });
    if (p.catatan) isi.append(buat('div', 'adm-sub', `Catatan: ${p.catatan}`));

    const bayar = buat('td');
    bayar.append(pilihan(['Belum bayar', 'Sudah bayar'], p.statusBayar, `Status bayar ${p.kode}`, (pilih) => ubahBayar(p, pilih)));
    const stat = buat('td');
    stat.append(pilihan(['Antri', 'Dibuat', 'Selesai', 'Dibatalkan'], p.status, `Status pengerjaan ${p.kode}`, (pilih) => ubahStatusPesanan(p, pilih)));

    const aksi = selAksi();
    aksi.firstChild.append(tombolIkon('detail', `Lihat detail pesanan ${p.kode}`, () => detailPesanan(p)));

    tr.append(kode, pelanggan, isi, buat('td', '', rupiah.format(p.total)), bayar, stat, aksi);
    return tr;
  }));
  if (!baris.length) tbody.replaceChildren(barisKosong(7, dataPesanan.length ? 'Tidak ada pesanan yang cocok dengan filter.' : 'Belum ada pesanan masuk.'));
}

function tanggalJamAdmin(teks) {
  const d = new Date(String(teks).replace(' ', 'T'));
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

// Tautan "Lihat desain" ke file unggahan pelanggan
function tautanFile(url) {
  const a = buat('a', '', 'Lihat desain');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function detailPesanan(p) {
  const rincian = buat('div', 'detail-rincian');
  rincian.append(buat('h3', '', 'Produk dipesan'));
  const daftar = buat('ul', 'daftar-bersih daftar-ringkas');
  p.item.forEach((i) => {
    const li = buat('li');
    li.append(
      buat('strong', '', i.nama),
      buat('span', '', `${i.spesifikasi ? `${i.spesifikasi} · ` : ''}${i.jumlah} × ${rupiah.format(i.harga)}`),
      buat('span', 'ringkas-harga', rupiah.format(Math.round(i.harga * i.jumlah))),
    );
    if (i.file) li.append(tautanFile(i.file));
    daftar.append(li);
  });
  rincian.append(daftar);

  rincian.append(buat('h3', '', 'Riwayat status'));
  const waktu = buat('ol', 'detail-riwayat');
  p.riwayat.forEach((r) => {
    const li = buat('li');
    li.append(buat('strong', '', r.status), buat('span', '', r.keterangan), buat('small', 'adm-sub', tanggalJamAdmin(r.dibuat)));
    waktu.append(li);
  });
  rincian.append(waktu);

  bukaDetail({
    judul: `Pesanan ${p.kode}`,
    sub: `Dibuat ${tanggalJamAdmin(p.dibuat)}`,
    baris: [
      ['Nama', p.nama],
      ['WhatsApp', p.whatsapp],
      ['Email', p.email],
      ['Status pengerjaan', p.status],
      ['Pembayaran', p.statusBayar],
      ['Total', rupiah.format(p.total)],
      ['Pengambilan', p.pengambilan === 'kirim' ? 'Dikirim' : 'Ambil sendiri di toko'],
      ['Alamat', p.pengambilan === 'kirim' ? p.alamat : ''],
      ['Dibutuhkan tanggal', p.tanggalButuh],
      ['Catatan', p.catatan],
    ],
    tambahan: rincian,
  });
}

async function ubahStatusPesanan(p, pilih) {
  const { data } = await panggil('pesanan', { aksi: 'ubah_status', id: p.id, status: pilih.value });
  toast(data.pesan || 'Status belum bisa diubah.', !data.ok);
  muatPesanan();
}

async function ubahBayar(p, pilih) {
  const { data } = await panggil('pesanan', { aksi: 'ubah_bayar', id: p.id, statusBayar: pilih.value });
  toast(data.pesan || 'Status bayar belum bisa diubah.', !data.ok);
  muatPesanan();
}

// ----- Pengguna -----

async function muatUsers() {
  const { data } = await panggil('users', { aksi: 'daftar' });
  if (!data.ok) return toast(data.pesan || 'Gagal memuat pengguna.', true);
  dataUsers = data.users;
  tampilUsers();
}

function tampilUsers() {
  const role = $('saring-role').value;
  const cari = $('cari-user').value;
  const baris = dataUsers.filter((u) => (!role || u.role === role) && cocokCari(cari, u.nama, u.email));
  infoHasil('info-user', baris.length, dataUsers.length);

  const tbody = $('tabel-users').tBodies[0];
  tbody.replaceChildren(...baris.map((u) => {
    const tr = buat('tr');
    const nama = buat('td');
    nama.append(buat('strong', '', u.nama));
    if (u.saya) nama.append(buat('span', 'adm-lencana-saya', 'Kamu'));

    const role = buat('td');
    if (u.saya) {
      role.append(buat('span', 'adm-sub', u.role));
    } else {
      const pilih = buat('select', 'adm-pilih');
      pilih.setAttribute('aria-label', `Role untuk ${u.nama}`);
      ['pelanggan', 'superadmin'].forEach((r) => {
        const o = buat('option', '', r);
        o.value = r;
        pilih.append(o);
      });
      pilih.value = u.role;
      pilih.addEventListener('change', () => ubahRole(u, pilih));
      role.append(pilih);
    }

    const aksi = selAksi();
    aksi.firstChild.append(tombolIkon('detail', `Lihat detail ${u.nama}`, () => detailUser(u)));
    if (!u.saya) {
      aksi.firstChild.append(
        tombolIkon('ubah', `Ubah ${u.nama}`, () => bukaFormUser(u)),
        tombolIkon('hapus', `Hapus ${u.nama}`, () => hapusUser(u)),
      );
    }

    const td = (teks) => buat('td', '', teks);
    tr.append(nama, td(u.whatsapp), td(u.email || '—'), role, td(tanggalIndo(u.dibuat)), aksi);
    return tr;
  }));
  if (!baris.length) tbody.replaceChildren(barisKosong(6, 'Tidak ada pengguna yang cocok dengan filter.'));
}

async function detailUser(u) {
  const { data } = await panggil('users', { aksi: 'detail', id: u.id });
  if (!data.ok) return toast(data.pesan || 'Detail belum bisa dimuat.', true);
  const d = data.user;
  bukaDetail({
    judul: d.nama,
    sub: d.role === 'superadmin' ? 'Superadmin' : 'Pelanggan',
    baris: [
      ['WhatsApp', d.whatsapp],
      ['Email', d.email],
      ['Terdaftar', tanggalIndo(d.dibuat)],
      ['Setuju Kebijakan Privasi', d.setuju_privasi ? 'Ya' : 'Belum'],
      ['Jumlah pesanan', d.jumlah_pesanan],
      ['Total belanja', rupiah.format(d.total_belanja)],
    ],
  });
}

let idUser = 0;

// Form tambah (u kosong) atau ubah pengguna. WA dan sandi kosong saat ubah = tidak diganti.
function bukaFormUser(u) {
  const form = $('form-user');
  form.reset();
  setGalatForm(form);
  infoForm(form, '');
  idUser = u ? u.id : 0;
  $('judul-dialog-user').textContent = u ? 'Ubah pengguna' : 'Tambah pengguna';
  const petunjukWa = $('petunjuk-u-wa');
  petunjukWa.hidden = !u;
  $('petunjuk-u-sandi').textContent = u ? 'Kosongkan jika kata sandi tidak diganti.' : 'Minimal 8 karakter.';
  if (u) {
    form.elements.nama.value = u.nama;
    form.elements.email.value = u.email || '';
    form.elements.role.value = u.role;
    petunjukWa.textContent = `Kosongkan jika tidak diganti (saat ini ${u.whatsapp}).`;
  }
  $('dialog-user').showModal();
  form.elements.nama.focus();
}

async function simpanUser(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const f = form.elements;
  setGalatForm(form);
  const { data } = await panggil('users', {
    aksi: 'simpan',
    user: { id: idUser, nama: f.nama.value.trim(), wa: f.wa.value, email: f.email.value.trim(), sandi: f.sandi.value, role: f.role.value },
  });
  if (!data.ok) {
    setGalatForm(form, data.galat);
    if (!data.galat) infoForm(form, data.pesan || 'Pengguna belum bisa disimpan. Coba lagi.');
    return;
  }
  $('dialog-user').close();
  toast(data.pesan);
  muatUsers();
}

async function ubahRole(u, pilih) {
  const baru = pilih.value;
  const yakin = await tanyaKonfirmasi({
    judul: 'Ubah role pengguna?',
    teks: baru === 'superadmin'
      ? `${u.nama} akan mendapat akses penuh ke dashboard ini (produk, pengguna, keuangan).`
      : `${u.nama} tidak lagi bisa membuka dashboard.`,
    ya: 'Ya, ubah',
    ikon: 'peran',
  });
  if (!yakin) { pilih.value = u.role; return; }
  const { data } = await panggil('users', { aksi: 'ubah_role', id: u.id, role: baru });
  toast(data.pesan || 'Role belum bisa diubah.', !data.ok);
  muatUsers();
}

async function hapusUser(u) {
  const yakin = await tanyaKonfirmasi({
    judul: 'Hapus pengguna ini?',
    teks: `Akun ${u.nama} akan dihapus permanen dan tidak bisa dibatalkan.`,
    ya: 'Ya, hapus',
  });
  if (!yakin) return;
  const { data } = await panggil('users', { aksi: 'hapus', id: u.id });
  toast(data.pesan || 'Pengguna belum bisa dihapus.', !data.ok);
  muatUsers();
}

// ----- Keuangan -----

async function muatKeuangan() {
  const { data } = await panggil('keuangan', { aksi: 'daftar', bulan: $('saring-bulan').value });
  if (!data.ok) return toast(data.pesan || 'Gagal memuat data keuangan.', true);

  dataKeuangan = data.transaksi;
  const pilih = $('saring-kategori');
  const dipilih = pilih.value;
  const kategori = [...new Set(dataKeuangan.map((t) => t.kategori))].sort();
  pilih.replaceChildren(new Option('Semua', ''), ...kategori.map((k) => new Option(k, k)));
  pilih.value = kategori.includes(dipilih) ? dipilih : '';
  tampilKeuangan();
}

function tampilKeuangan() {
  if (!dataKeuangan) return;
  const jenis = $('saring-jenis').value;
  const kategori = $('saring-kategori').value;
  const cari = $('cari-transaksi').value;
  const baris = dataKeuangan.filter((t) => (!jenis || t.jenis === jenis) && (!kategori || t.kategori === kategori) && cocokCari(cari, t.keterangan, t.kategori));
  infoHasil('info-keuangan', baris.length, dataKeuangan.length);
  // Total mengikuti baris yang tampil
  const jumlahJenis = (js) => baris.filter((t) => t.jenis === js).reduce((n, t) => n + Number(t.jumlah), 0);
  const total = { pemasukan: jumlahJenis('pemasukan'), pengeluaran: jumlahJenis('pengeluaran') };
  total.laba = total.pemasukan - total.pengeluaran;
  $('kartu-keuangan').replaceChildren(
    kartuAngka('Pemasukan', rupiah.format(total.pemasukan), $('saring-bulan').value ? 'Bulan terpilih' : 'Semua bulan', 'biru'),
    kartuAngka('Pengeluaran', rupiah.format(total.pengeluaran), $('saring-bulan').value ? 'Bulan terpilih' : 'Semua bulan', 'oranye'),
    kartuAngka('Laba', rupiah.format(total.laba), total.laba >= 0 ? 'Untung' : 'Rugi', 'tosca'),
  );

  const tbody = $('tabel-keuangan').tBodies[0];
  tbody.replaceChildren(...baris.map((t) => {
    const tr = buat('tr');
    const jenisSel = buat('td');
    jenisSel.append(buat('span', `adm-jenis adm-jenis-${t.jenis}`, t.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'));
    const jumlah = buat('td', `kanan adm-uang adm-uang-${t.jenis}`, `${t.jenis === 'pemasukan' ? '+' : '−'}${rupiah.format(t.jumlah)}`);

    const aksi = selAksi();
    const nama = t.keterangan || t.kategori;
    if (t.pesanan_id) {
      // Dari pesanan yang sudah dibayar: diatur otomatis lewat menu Pesanan
      aksi.firstChild.append(buat('span', 'adm-sub', 'Pesanan'));
    } else {
      aksi.firstChild.append(
        tombolIkon('ubah', `Ubah transaksi ${nama}`, () => bukaFormTransaksi(t)),
        tombolIkon('hapus', `Hapus transaksi ${nama}`, () => hapusTransaksi(t)),
      );
    }

    tr.append(buat('td', '', tanggalIndo(t.tanggal)), jenisSel, buat('td', '', t.kategori), buat('td', '', t.keterangan || '—'), jumlah, aksi);
    return tr;
  }));
  if (!baris.length) {
    const tr = buat('tr');
    const td = buat('td', 'adm-kosong', 'Belum ada transaksi untuk pilihan ini.');
    td.colSpan = 6;
    tr.append(td);
    tbody.replaceChildren(tr);
  }
}

function isiDatalistUang() {
  $('daftar-kategori-uang').replaceChildren(...KATEGORI_UANG[$('t-jenis').value].map((k) => {
    const o = buat('option');
    o.value = k;
    return o;
  }));
}

let idTransaksi = 0;

function bukaFormTransaksi(t) {
  const form = $('form-transaksi');
  form.reset();
  setGalatForm(form);
  infoForm(form, '');
  idTransaksi = t ? t.id : 0;
  $('judul-dialog-transaksi').textContent = t ? 'Ubah transaksi' : 'Tambah transaksi';
  form.elements.tanggal.value = t ? t.tanggal.slice(0, 10) : hariIni();
  if (t) {
    form.elements.jenis.value = t.jenis;
    form.elements.kategori.value = t.kategori;
    form.elements.jumlah.value = t.jumlah;
    form.elements.keterangan.value = t.keterangan;
  }
  isiDatalistUang();
  $('dialog-transaksi').showModal();
  form.elements.jumlah.focus();
}

async function simpanTransaksi(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const f = form.elements;
  const transaksi = {
    id: idTransaksi, tanggal: f.tanggal.value, jenis: f.jenis.value, kategori: f.kategori.value.trim(),
    jumlah: f.jumlah.value === '' ? '' : Number(f.jumlah.value), keterangan: f.keterangan.value.trim(),
  };
  setGalatForm(form);
  const { data } = await panggil('keuangan', { aksi: 'simpan', transaksi });
  if (!data.ok) {
    setGalatForm(form, data.galat);
    if (!data.galat) infoForm(form, data.pesan || 'Transaksi belum bisa disimpan. Coba lagi.');
    return;
  }
  $('dialog-transaksi').close();
  toast(data.pesan);
  muatKeuangan();
}

async function hapusTransaksi(t) {
  const yakin = await tanyaKonfirmasi({
    judul: 'Hapus transaksi ini?',
    teks: `${t.keterangan || t.kategori} (${rupiah.format(t.jumlah)}) akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
    ya: 'Ya, hapus',
  });
  if (!yakin) return;
  const { data } = await panggil('keuangan', { aksi: 'hapus', id: t.id });
  toast(data.pesan || 'Transaksi belum bisa dihapus.', !data.ok);
  muatKeuangan();
}

// ----- Profil -----

// Nama di bilah atas, menu samping, dan sapaan di Ringkasan
function isiAkun(nama) {
  const awal = nama.trim().charAt(0).toUpperCase() || '?';
  $('adm-nama-teks').textContent = nama;
  $('adm-akun-nama').textContent = nama;
  $('adm-avatar').textContent = awal;
  $('adm-avatar-menu').textContent = awal;
  $('adm-nama').hidden = false;
  const tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('adm-salam').textContent = `Halo, ${nama.trim().split(' ')[0]} · ${tgl}`;
}

async function muatProfil() {
  const { data } = await panggil('profil', { aksi: 'ambil' });
  if (!data.ok) return toast(data.pesan || 'Gagal memuat profil.', true);
  const f = $('form-profil').elements;
  f.nama.value = data.profil.nama;
  f.wa.value = data.profil.whatsapp;
  f.email.value = data.profil.email || '';
  ['sandi_lama', 'sandi_baru', 'sandi_ulang'].forEach((k) => { f[k].value = ''; });
  $('info-profil-role').textContent = `Role: ${data.profil.role} · Terdaftar ${tanggalIndo(data.profil.dibuat)}`;
  isiAkun(data.profil.nama);
}

async function simpanProfil(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const f = form.elements;
  setGalatForm(form);
  infoForm(form, '');
  if (f.sandi_baru.value && f.sandi_baru.value !== f.sandi_ulang.value) {
    return setGalatForm(form, { sandi_ulang: 'Kata sandi belum sama, coba ketik ulang.' });
  }
  const { data } = await panggil('profil', {
    aksi: 'simpan', nama: f.nama.value.trim(), wa: f.wa.value, email: f.email.value.trim(),
    sandi_lama: f.sandi_lama.value, sandi_baru: f.sandi_baru.value,
  });
  if (!data.ok) {
    setGalatForm(form, data.galat);
    if (!data.galat) infoForm(form, data.pesan || 'Profil belum bisa disimpan. Coba lagi.');
    return;
  }
  toast(data.pesan);
  muatProfil();
}

// ----- Menu samping: kecilkan / tampilkan (ingat pilihan di browser) -----

function aturToggleMenu() {
  const tombol = $('adm-toggle');
  const terapkan = (kecil) => {
    document.body.classList.toggle('adm-menu-kecil', kecil);
    tombol.setAttribute('aria-expanded', String(!kecil));
    tombol.setAttribute('aria-label', kecil ? 'Tampilkan menu' : 'Kecilkan menu');
    try { localStorage.setItem('printin_menu_kecil', kecil ? '1' : '0'); } catch { /* penyimpanan diblokir */ }
  };
  let awal = false;
  try { awal = localStorage.getItem('printin_menu_kecil') === '1'; } catch { /* abaikan */ }
  terapkan(awal);
  tombol.addEventListener('click', () => terapkan(!document.body.classList.contains('adm-menu-kecil')));
}

// ----- Mulai -----

document.addEventListener('DOMContentLoaded', async () => {
  jadikanLogout($('adm-keluar'));
  aturToggleMenu();
  siapkanDialog($('dialog-detail'));
  siapkanDialog($('dialog-user'));
  siapkanDialog($('dialog-produk'));
  siapkanDialog($('dialog-transaksi'));
  $('tambah-produk').addEventListener('click', () => bukaFormProduk(null));
  $('form-produk').addEventListener('submit', simpanProduk);
  $('pilih-foto').addEventListener('click', () => $('p-foto-file').click());
  $('p-foto-file').addEventListener('change', pilihFotoForm);
  $('hapus-foto').addEventListener('click', hapusFotoForm);
  $('ganti-foto').addEventListener('click', () => $('p-foto-file').click());
  // Seret dan lepas foto ke area unggah
  const zona = $('pilih-foto');
  ['dragenter', 'dragover'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.add('dp-foto-seret'); }));
  ['dragleave', 'drop'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.remove('dp-foto-seret'); }));
  zona.addEventListener('drop', (e) => {
    if (!e.dataTransfer.files.length) return;
    $('p-foto-file').files = e.dataTransfer.files;
    pilihFotoForm();
  });
  $('form-produk').addEventListener('input', (e) => {
    if (e.target.name === 'nama') isiKodeOtomatis();
    if (e.target.name === 'id') e.target.dataset.manual = e.target.value ? '1' : '';
    perbaruiPratinjauHarga();
  });
  $('tambah-user').addEventListener('click', () => bukaFormUser(null));
  $('form-user').addEventListener('submit', simpanUser);
  $('tambah-transaksi').addEventListener('click', () => bukaFormTransaksi(null));
  $('form-transaksi').addEventListener('submit', simpanTransaksi);
  $('t-jenis').addEventListener('change', isiDatalistUang);
  $('form-profil').addEventListener('submit', simpanProfil);
  $('saring-bulan').addEventListener('change', muatKeuangan);
  ['saring-jenis', 'saring-kategori'].forEach((id) => $(id).addEventListener('change', tampilKeuangan));
  $('cari-transaksi').addEventListener('input', tampilKeuangan);
  $('reset-saring').addEventListener('click', () => {
    ['saring-bulan', 'saring-jenis', 'saring-kategori', 'cari-transaksi'].forEach((id) => { $(id).value = ''; });
    muatKeuangan();
  });

  ['saring-periode', 'saring-lini-ringkasan'].forEach((id) => $(id).addEventListener('change', tampilRingkasan));
  $('reset-ringkasan').addEventListener('click', () => {
    $('saring-periode').value = '6';
    $('saring-lini-ringkasan').value = '';
    tampilRingkasan();
  });

  ['saring-lini', 'saring-status-produk'].forEach((id) => $(id).addEventListener('change', tampilProduk));
  $('cari-produk').addEventListener('input', tampilProduk);
  $('reset-produk').addEventListener('click', () => {
    ['cari-produk', 'saring-lini', 'saring-status-produk'].forEach((id) => { $(id).value = ''; });
    tampilProduk();
  });

  $('saring-status-pesanan').addEventListener('change', tampilPesanan);
  $('cari-pesanan').addEventListener('input', tampilPesanan);
  $('reset-pesanan').addEventListener('click', () => {
    ['cari-pesanan', 'saring-status-pesanan'].forEach((id) => { $(id).value = ''; });
    tampilPesanan();
  });

  $('saring-role').addEventListener('change', tampilUsers);
  $('cari-user').addEventListener('input', tampilUsers);
  $('reset-user').addEventListener('click', () => {
    ['cari-user', 'saring-role'].forEach((id) => { $(id).value = ''; });
    tampilUsers();
  });

  // Cek akses dulu lewat profil: bukan superadmin -> panggil() menampilkan pesan
  try {
    await muatProfil();
  } catch {
    return;
  }
  window.addEventListener('hashchange', tampilBagian);
  tampilBagian();
});
