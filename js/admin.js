// Dashboard admin: PIN, menu Ringkasan (statistik + grafik Chart.js), Produk (CRUD), Pesanan (tabel + CRUD + ubah status).
// PIN dikirim lewat POST ke Apps Script dan diperiksa di sana (tidak ada PIN di front-end).
// PIN disimpan di localStorage browser admin supaya tidak diminta lagi setelah refresh; dihapus saat tombol Keluar ditekan.

const STATUS_PESANAN = ['Diterima', 'Cek desain', 'Diproses', 'Siap diambil', 'Selesai'];
const LINI = ['Printing Reguler', 'Custom Merchandise'];
const WARNA = { biru: '#1f6fe8', oranye: '#ff8a3d', tosca: '#3de0b5' };
const KELAS_STATUS_PRODUK = { Tersedia: 'status-tersedia', Terbatas: 'status-terbatas', Habis: 'status-habis' };
const KUNCI_MENU_KECIL = 'printin_menu_kecil';
const KUNCI_PIN = 'printin_pin_admin';
// Foto produk yang sudah ada di repo (img/produk/), untuk saran isian kolom foto
const FOTO_TERSEDIA = ['banner', 'brosur', 'fotokopi-bw', 'gantungan-kunci', 'kartu-nama', 'mug', 'poster-a3', 'print-bw', 'print-warna', 'scan', 'tote-bag', 'tumbler', 'undangan']
  .map((n) => `img/produk/${n}.webp`);
const POLA_FOTO = /^img\/[a-z0-9_/.-]+\.(webp|png|jpe?g|svg)$/i;

// Ikon (garis) untuk kartu angka dan tombol aksi
const IKON = {
  omzet: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pesanan: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2"/><path d="M8 12h8M8 16h5"/>',
  selesai: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  produk: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  rata: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  ubah: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  hapus: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};

const ambilEl = (id) => document.getElementById(id);
const angkaId = new Intl.NumberFormat('id-ID');
let pinAdmin = '';
let semuaPesanan = [];
let semuaProduk = [];
let idDiubah = ''; // kosong = form dalam mode tambah
const grafik = {};

function buatEl(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

function buatIkon(nama) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = IKON[nama]; // isi tetap dari konstanta di atas, bukan dari data pengguna
  return svg;
}

function setGalatPin(teks) {
  const area = ambilEl('galat-pin');
  area.textContent = teks || '';
  area.hidden = !teks;
  const input = ambilEl('pin');
  if (teks) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

// Tanggal dari Sheets ("2026-10-25 06:31") menjadi objek Date
function keTanggal(teks) {
  const d = new Date(String(teks).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

// ----- Navigasi menu -----

function bagianAktif() {
  const nama = location.hash.slice(1);
  return ['ringkasan', 'produk', 'pesanan', 'keuangan'].includes(nama) ? nama : 'ringkasan';
}

function tampilkanBagian() {
  const aktif = bagianAktif();
  document.querySelectorAll('[data-bagian]').forEach((b) => { b.hidden = b.id !== `bagian-${aktif}`; });
  document.querySelectorAll('[data-menu]').forEach((a) => {
    if (a.dataset.menu === aktif) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  // Grafik digambar ulang agar ukurannya pas setelah bagian Ringkasan terlihat lagi
  if (aktif === 'ringkasan') Object.values(grafik).forEach((g) => g.resize());
}

function aturMenuKecil(kecil) {
  document.body.classList.toggle('adm-menu-kecil', kecil);
  const tombol = ambilEl('adm-toggle');
  tombol.setAttribute('aria-expanded', String(!kecil));
  tombol.setAttribute('aria-label', kecil ? 'Tampilkan menu' : 'Kecilkan menu');
  try { localStorage.setItem(KUNCI_MENU_KECIL, kecil ? '1' : '0'); } catch (err) { /* pilihan hanya berlaku di halaman ini */ }
}

// ----- Ringkasan -----

// Awal periode: tanggal 1 pada bulan ke-(n-1) sebelum bulan ini; null = semua waktu
function awalPeriode(nilai) {
  if (nilai === 'semua') return null;
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - (Number(nilai) - 1), 1);
}

// Teks pilihan dibuat singkat agar muat di HP; label lengkap untuk kartu dan grafik
const LABEL_PERIODE = { 1: 'Bulan ini', 3: '3 bulan terakhir', 6: '6 bulan terakhir', 12: '12 bulan terakhir', semua: 'Semua waktu' };

function labelPeriode(nilai) {
  return LABEL_PERIODE[nilai] || nilai;
}

function pesananTersaring() {
  const awal = awalPeriode(ambilEl('saring-periode').value);
  const lini = ambilEl('saring-lini-ringkasan').value;
  return semuaPesanan.filter((p) => {
    const t = keTanggal(p.tanggal);
    return (!awal || (t && t >= awal)) && (!lini || p.lini === lini);
  });
}

function kartuAngka({ ikon, warna, label, nilai, sub }) {
  const kartu = buatEl('article', 'kartu adm-angka');
  const lingkar = buatEl('span', `adm-angka-ikon adm-angka-${warna}`);
  lingkar.append(buatIkon(ikon));
  const isi = buatEl('div');
  isi.append(buatEl('p', 'adm-angka-label', label), buatEl('p', 'adm-angka-nilai', nilai), buatEl('p', 'adm-angka-sub', sub));
  kartu.append(lingkar, isi);
  return kartu;
}

function tampilkanKartu(pesanan, produk) {
  const periode = labelPeriode(ambilEl('saring-periode').value);
  const omzet = pesanan.reduce((s, p) => s + p.total, 0);
  const baru = pesanan.filter((p) => p.status === 'Diterima').length;
  const selesai = pesanan.filter((p) => p.status === 'Selesai').length;
  const terbatas = produk.filter((p) => p.status === 'Terbatas').length;
  const habis = produk.filter((p) => p.status === 'Habis').length;
  ambilEl('kartu-angka').replaceChildren(
    kartuAngka({ ikon: 'omzet', warna: 'biru', label: 'Omzet', nilai: rupiah.format(omzet), sub: periode }),
    kartuAngka({ ikon: 'pesanan', warna: 'oranye', label: 'Pesanan', nilai: angkaId.format(pesanan.length), sub: `${baru} baru (Diterima)` }),
    kartuAngka({ ikon: 'selesai', warna: 'tosca', label: 'Selesai', nilai: angkaId.format(selesai), sub: `${pesanan.length - selesai - baru} sedang dikerjakan` }),
    kartuAngka({ ikon: 'rata', warna: 'ungu', label: 'Rata-rata pesanan', nilai: rupiah.format(pesanan.length ? Math.round(omzet / pesanan.length) : 0), sub: 'Omzet dibagi jumlah pesanan' }),
    kartuAngka({ ikon: 'produk', warna: 'kuning', label: 'Produk', nilai: angkaId.format(produk.length), sub: `${terbatas} terbatas · ${habis} habis` }),
  );
}

// Daftar bulan (label + kunci "yyyy-mm") untuk grafik omzet
function daftarBulan(pesanan) {
  const nilai = ambilEl('saring-periode').value;
  const kini = new Date();
  let jumlah = Number(nilai);
  if (nilai === 'semua') {
    const tertua = pesanan.map((p) => keTanggal(p.tanggal)).filter(Boolean).sort((a, b) => a - b)[0] || kini;
    jumlah = Math.min(24, (kini.getFullYear() - tertua.getFullYear()) * 12 + kini.getMonth() - tertua.getMonth() + 1);
  }
  const format = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' });
  return Array.from({ length: jumlah }, (_, i) => {
    const d = new Date(kini.getFullYear(), kini.getMonth() - (jumlah - 1 - i), 1);
    return { kunci: `${d.getFullYear()}-${d.getMonth()}`, label: format.format(d) };
  });
}

function gambarGrafik(kunci, kanvas, konfigurasi) {
  grafik[kunci]?.destroy();
  grafik[kunci] = new Chart(kanvas, konfigurasi);
}

function tampilkanGrafik(pesanan) {
  if (typeof Chart === 'undefined') {
    ambilEl('info-grafik').hidden = false;
    return;
  }
  const opsiDasar = { responsive: true, maintainAspectRatio: false };

  const bulan = daftarBulan(pesanan);
  const perBulan = Object.fromEntries(bulan.map((b) => [b.kunci, 0]));
  pesanan.forEach((p) => {
    const t = keTanggal(p.tanggal);
    const k = t && `${t.getFullYear()}-${t.getMonth()}`;
    if (k in perBulan) perBulan[k] += p.total;
  });
  ambilEl('sub-grafik-omzet').textContent = `${labelPeriode(ambilEl('saring-periode').value)}, dalam rupiah`;
  gambarGrafik('omzet', ambilEl('grafik-omzet'), {
    type: 'bar',
    data: { labels: bulan.map((b) => b.label), datasets: [{ label: 'Omzet', data: bulan.map((b) => perBulan[b.kunci]), backgroundColor: WARNA.biru, borderRadius: 6 }] },
    options: {
      ...opsiDasar,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => rupiah.format(c.raw) } } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => (v >= 1000 ? `${angkaId.format(v / 1000)} rb` : v) } } },
    },
  });

  const perLini = Object.fromEntries(LINI.map((l) => [l, 0]));
  pesanan.forEach((p) => { if (p.lini in perLini) perLini[p.lini] += 1; });
  gambarGrafik('lini', ambilEl('grafik-lini'), {
    type: 'doughnut',
    data: { labels: LINI, datasets: [{ data: LINI.map((l) => perLini[l]), backgroundColor: [WARNA.biru, WARNA.tosca] }] },
    options: { ...opsiDasar, plugins: { legend: { position: 'bottom' } } },
  });

  const perProduk = {};
  pesanan.forEach((p) => { perProduk[p.produk] = (perProduk[p.produk] || 0) + 1; });
  const urut = Object.entries(perProduk).sort((a, b) => b[1] - a[1]).slice(0, 5);
  gambarGrafik('produk', ambilEl('grafik-produk'), {
    type: 'bar',
    data: { labels: urut.map(([n]) => n), datasets: [{ label: 'Jumlah pesanan', data: urut.map(([, j]) => j), backgroundColor: WARNA.oranye, borderRadius: 6 }] },
    options: { ...opsiDasar, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

function barisDaftar(judul, sub, kanan) {
  const li = buatEl('li', 'adm-baris');
  const kiri = buatEl('div');
  kiri.append(buatEl('strong', '', judul), buatEl('span', 'adm-sub', sub));
  li.append(kiri, kanan);
  return li;
}

function tampilkanDaftar(pesanan, produk) {
  const perhatian = produk.filter((p) => p.status !== 'Tersedia');
  ambilEl('daftar-perhatian').replaceChildren(...(perhatian.length
    ? perhatian.map((p) => barisDaftar(p.nama, p.lini, buatEl('span', `lencana-status ${KELAS_STATUS_PRODUK[p.status] || ''}`, p.status)))
    : [buatEl('li', 'adm-kosong', 'Semua produk berstatus Tersedia.')]));

  const terbaru = [...pesanan].sort((a, b) => (keTanggal(b.tanggal) || 0) - (keTanggal(a.tanggal) || 0)).slice(0, 5);
  ambilEl('daftar-terbaru').replaceChildren(...(terbaru.length
    ? terbaru.map((p) => barisDaftar(`${p.kode} · ${p.produk}`, `${tanggalJam(p.tanggal) || p.tanggal} · ${p.status}`, buatEl('strong', '', rupiah.format(p.total))))
    : [buatEl('li', 'adm-kosong', 'Belum ada pesanan di periode ini.')]));
}

function tampilkanRingkasan() {
  const lini = ambilEl('saring-lini-ringkasan').value;
  const pesanan = pesananTersaring();
  const produk = semuaProduk.filter((p) => !lini || p.lini === lini);
  ambilEl('info-ringkasan').textContent = 'Periode berlaku untuk data pesanan; filter lini berlaku untuk pesanan dan produk.';
  tampilkanKartu(pesanan, produk);
  tampilkanGrafik(pesanan);
  tampilkanDaftar(pesanan, produk);
  tampilkanKeuangan();
}

// ----- Keuangan -----

const sama = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

function tampilkanKeuangan() {
  const kini = new Date();
  const jumlah = (daftar) => daftar.reduce((s, p) => s + p.total, 0);
  const hariIni = semuaPesanan.filter((p) => { const t = keTanggal(p.tanggal); return t && sama(t, kini) && t.getDate() === kini.getDate(); });
  const bulanIni = semuaPesanan.filter((p) => { const t = keTanggal(p.tanggal); return t && sama(t, kini); });
  const total = jumlah(semuaPesanan);
  const selesai = jumlah(semuaPesanan.filter((p) => p.status === 'Selesai'));
  ambilEl('kartu-keuangan').replaceChildren(
    kartuAngka({ ikon: 'omzet', warna: 'biru', label: 'Total uang masuk', nilai: rupiah.format(total), sub: `${angkaId.format(semuaPesanan.length)} pesanan, semua waktu` }),
    kartuAngka({ ikon: 'rata', warna: 'oranye', label: 'Hari ini', nilai: rupiah.format(jumlah(hariIni)), sub: `${hariIni.length} pesanan` }),
    kartuAngka({ ikon: 'pesanan', warna: 'tosca', label: 'Bulan ini', nilai: rupiah.format(jumlah(bulanIni)), sub: `${bulanIni.length} pesanan` }),
    kartuAngka({ ikon: 'selesai', warna: 'ungu', label: 'Pesanan selesai', nilai: rupiah.format(selesai), sub: `Belum selesai: ${rupiah.format(total - selesai)}` }),
  );

  ambilEl('keuangan-terakhir').textContent = `Terakhir diperbarui: ${new Intl.DateTimeFormat('id-ID', { timeStyle: 'medium' }).format(kini)}`;
  tampilkanTabelKeuangan();
}

// Tabel pemasukan: pesanan terbaru di atas, nominal ditebalkan
function tampilkanTabelKeuangan() {
  const kini = new Date();
  const cari = ambilEl('cari-keuangan').value.trim().toLowerCase();
  const periode = ambilEl('saring-periode-keuangan').value;
  const lini = ambilEl('saring-lini-keuangan').value;
  const tampil = semuaPesanan.filter((p) => {
    const t = keTanggal(p.tanggal);
    const cocokPeriode = periode === 'semua' || (t && sama(t, kini) && (periode === '1' || t.getDate() === kini.getDate()));
    return cocokPeriode && (!lini || p.lini === lini) && (!cari || `${p.kode} ${p.nama}`.toLowerCase().includes(cari));
  }).sort((a, b) => (keTanggal(b.tanggal) || 0) - (keTanggal(a.tanggal) || 0));

  ambilEl('info-keuangan').textContent = `Menampilkan ${tampil.length} dari ${semuaPesanan.length} pesanan.`;
  ambilEl('total-keuangan').textContent = rupiah.format(tampil.reduce((s, p) => s + p.total, 0));

  const isi = tampil.map((p) => {
    const tr = document.createElement('tr');
    const sel = (label, ...konten) => { const td = document.createElement('td'); td.dataset.label = label; td.append(...konten); return td; };
    const pelanggan = buatEl('div');
    pelanggan.append(buatEl('strong', '', p.nama), buatEl('div', 'item-spek', p.whatsapp));
    const produk = buatEl('div');
    produk.append(buatEl('strong', '', p.produk), buatEl('div', 'item-spek', `${p.lini} · Jumlah ${p.jumlah}`));
    tr.append(sel('Kode', buatEl('strong', '', p.kode)), sel('Tanggal', tanggalJam(p.tanggal) || p.tanggal), sel('Pelanggan', pelanggan), sel('Produk', produk), sel('Status', p.status), sel('Nominal masuk', buatEl('strong', 'adm-nominal', `+ ${rupiah.format(p.total)}`)));
    return tr;
  });
  if (!isi.length) {
    const tr = document.createElement('tr');
    const td = buatEl('td', 'adm-kosong', 'Belum ada pemasukan yang cocok dengan filter.');
    td.colSpan = 6;
    tr.append(td);
    isi.push(tr);
  }
  ambilEl('isi-tabel-keuangan').replaceChildren(...isi);
}

// Perbarui data diam-diam tiap 30 detik selama menu Keuangan terbuka
async function segarkanKeuangan() {
  if (!pinAdmin || document.hidden || bagianAktif() !== 'keuangan') return;
  const hasil = await panggilApi({ body: { action: 'dashboard', pin: pinAdmin } });
  if (hasil.ok) perbaruiPesanan(hasil.pesanan);
}

// ----- Pesanan -----

function buatPilihanStatus(pesanan) {
  const pilih = buatEl('select', 'adm-pilih');
  pilih.setAttribute('aria-label', `Ubah status pesanan ${pesanan.kode}`);
  STATUS_PESANAN.forEach((s) => {
    const o = buatEl('option', '', s);
    o.value = s;
    pilih.append(o);
  });
  pilih.value = pesanan.status;
  pilih.addEventListener('change', async () => {
    const lama = pesanan.status;
    pilih.disabled = true;
    const hasil = await panggilApi({ body: { action: 'ubah_status', pin: pinAdmin, kode: pesanan.kode, status: pilih.value } });
    pilih.disabled = false;
    if (hasil.ok) {
      pesanan.status = pilih.value;
      tampilToast({ pesan: `Status ${pesanan.kode} diubah ke "${pesanan.status}".` });
      tampilkanRingkasan();
    } else {
      pilih.value = lama;
      tampilToast({ jenis: 'galat', pesan: hasil.pesan || 'Status belum bisa diubah. Coba lagi.' });
    }
  });
  return pilih;
}

function tampilkanTabelPesanan() {
  const cari = ambilEl('cari-pesanan').value.trim().toLowerCase();
  const saring = ambilEl('saring-status').value;
  const tampil = semuaPesanan.filter((p) => (!saring || p.status === saring)
    && (!cari || `${p.kode} ${p.nama}`.toLowerCase().includes(cari)));
  ambilEl('info-tabel').textContent = `Menampilkan ${tampil.length} dari ${semuaPesanan.length} pesanan.`;

  const isi = tampil.map((p) => {
    const tr = document.createElement('tr');
    // data-label dipakai CSS untuk menampilkan judul kolom saat tabel menjadi kartu di HP
    const sel = (label, ...konten) => { const td = document.createElement('td'); td.dataset.label = label; td.append(...konten); return td; };

    const kode = buatEl('strong', '', p.kode);
    const pelanggan = buatEl('div');
    pelanggan.append(buatEl('strong', '', p.nama), buatEl('div', 'item-spek', p.whatsapp));
    const produk = buatEl('div');
    produk.append(buatEl('strong', '', p.produk), buatEl('div', 'item-spek', `${p.spesifikasi ? `${p.spesifikasi} · ` : ''}Jumlah ${p.jumlah}`));

    // Hanya tautan https yang dijadikan link
    let desain = buatEl('span', 'adm-sub', '—');
    if (/^https:\/\//.test(String(p.link_file))) {
      desain = buatEl('a', '', 'Buka desain');
      desain.href = p.link_file;
      desain.target = '_blank';
      desain.rel = 'noopener';
    }

    const aksi = buatEl('div', 'adm-aksi');
    aksi.append(
      tombolIkon('ubah', `Ubah pesanan ${p.kode}`, '', () => bukaFormPesanan(p)),
      tombolIkon('hapus', `Hapus pesanan ${p.kode}`, 'ikon-hapus', () => hapusPesanan(p)),
    );

    tr.dataset.kode = p.kode;
    tr.append(sel('Kode', kode), sel('Tanggal', tanggalJam(p.tanggal) || p.tanggal), sel('Pelanggan', pelanggan), sel('Produk', produk), sel('Total', rupiah.format(p.total)), sel('Desain', desain), sel('Status', buatPilihanStatus(p)), sel('Aksi', aksi));
    return tr;
  });
  if (!isi.length) {
    const tr = document.createElement('tr');
    const td = buatEl('td', 'adm-kosong', 'Tidak ada pesanan yang cocok dengan filter.');
    td.colSpan = 8;
    tr.append(td);
    isi.push(tr);
  }
  ambilEl('isi-tabel').replaceChildren(...isi);
}

function isiSaringStatus() {
  const pilih = ambilEl('saring-status');
  pilih.replaceChildren(...[['', 'Semua'], ...STATUS_PESANAN.map((s) => [s, s])].map(([nilai, teks]) => {
    const o = buatEl('option', '', teks);
    o.value = nilai;
    return o;
  }));
}

// ----- Foto produk (unggah langsung) -----

const FOTO_MAKS_BYTE = 10 * 1024 * 1024;
const FOTO_SISI_MAKS = 1000; // px; foto dikecilkan agar katalog tetap cepat
let kartuFoto = null;

// Kecilkan dan ubah ke WebP di browser. Bila gagal, kirim file aslinya.
async function siapkanFoto(berkas) {
  try {
    const gambar = await createImageBitmap(berkas);
    const skala = Math.min(1, FOTO_SISI_MAKS / Math.max(gambar.width, gambar.height));
    const kanvas = document.createElement('canvas');
    kanvas.width = Math.round(gambar.width * skala);
    kanvas.height = Math.round(gambar.height * skala);
    kanvas.getContext('2d').drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
    const blob = await new Promise((selesai) => kanvas.toBlob(selesai, 'image/webp', 0.85));
    if (blob && blob.type === 'image/webp') return { nama: 'foto.webp', tipe: 'image/webp', data: await bacaBase64(blob) };
  } catch (err) { /* lanjut kirim file asli */ }
  return { nama: berkas.name, tipe: berkas.type, data: await bacaBase64(berkas) };
}

// ----- Pesanan (tambah / ubah / hapus) -----

let kodeDiubah = ''; // kosong = form pesanan dalam mode tambah
let pesananDihapus = null;
const KOLOM_GALAT_PESANAN = ['nama', 'wa', 'produk', 'jumlah', 'panjang', 'lebar', 'link', 'alamat'];
const FILE_MAKS_BYTE = 10 * 1024 * 1024;
const JENIS_FILE = ['application/pdf', 'image/png', 'image/jpeg'];
const IKON_UNGGAH = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5"/><path d="M7.5 9.5L12 5l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';
let kartuUnggah = null; // kartu pilih file desain (tampilan sama seperti halaman Pesan)

function ukuranFile(byte) {
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

// Kartu pilih file: klik atau seret-lepas, pratinjau gambar, tombol Ganti dan Hapus
function buatKartuUnggah({ jenis = JENIS_FILE, maksByte = FILE_MAKS_BYTE, namaFormat = 'PDF, PNG, atau JPG', label = 'file desain', saran = ' atau pakai link Google Drive' } = {}) {
  const kartu = buatEl('div', 'desain-item');
  let berkasPilih = null;
  let urlPratinjau = '';

  const berkasInput = buatEl('input');
  berkasInput.type = 'file';
  berkasInput.accept = jenis.join(',');
  berkasInput.hidden = true;
  berkasInput.setAttribute('aria-label', label);

  const zona = buatEl('button', 'unggah-zona');
  zona.type = 'button';
  zona.innerHTML = IKON_UNGGAH; // konstanta tetap di atas, bukan data pengguna
  zona.append(buatEl('strong', '', 'Klik untuk pilih file'), buatEl('span', '', 'atau seret dan lepas file ke sini'));
  zona.setAttribute('aria-label', `Pilih ${label}`);

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
    berkasPilih = null;
    berkasInput.value = '';
    tampilFile(null);
  };

  const pilih = (berkas) => {
    tampilGalat('');
    let pesan = '';
    if (!jenis.includes(berkas.type)) pesan = `Format file harus ${namaFormat}.`;
    else if (berkas.size > maksByte) pesan = `Ukuran file ${ukuranFile(berkas.size)}, maksimal ${Math.round(maksByte / 1048576)} MB. Kecilkan dulu filenya${saran}.`;
    if (pesan) {
      kosongkan();
      tampilGalat(pesan);
      return;
    }
    berkasPilih = berkas;
    tampilFile(berkas);
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
  return {
    kartu,
    tampilGalat,
    kosongkan: () => { tampilGalat(''); kosongkan(); },
    berkas: () => berkasPilih,
    fokus: () => (zona.hidden ? ganti : zona).focus(),
  };
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

function setGalatPesanan(nama, teks) {
  const input = ambilEl(`ps-${nama}`);
  const area = ambilEl(`galat-ps-${nama}`);
  area.textContent = teks || '';
  area.hidden = !teks;
  if (teks) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function bersihkanGalatPesanan() {
  KOLOM_GALAT_PESANAN.forEach((n) => setGalatPesanan(n, ''));
  ambilEl('galat-form-pesanan').hidden = true;
}

function produkTerpilih() {
  return semuaProduk.find((p) => p.id === ambilEl('form-pesanan').elements.produkId.value);
}

// Total yang akan disimpan, dengan rumus yang sama seperti kalkulator (server menghitung ulang)
function hitungTotalPesanan(produk, f) {
  const jumlah = Number(f.elements.jumlah.value);
  const luas = produk.tipe_hitung === 'luas' ? Number(f.elements.panjang.value) * Number(f.elements.lebar.value) : 1;
  const total = Math.round(produk.harga * luas * jumlah);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

// Tampilkan kolom ukuran untuk banner, alamat untuk pengiriman, dan pratinjau total
function perbaruiFormPesanan() {
  const f = ambilEl('form-pesanan');
  const produk = produkTerpilih();
  ambilEl('ps-ukuran').hidden = !(produk && produk.tipe_hitung === 'luas');
  ambilEl('ps-kolom-alamat').hidden = f.elements.ambil.value !== 'kirim';
  ambilEl('label-ps-jumlah').firstChild.textContent = produk && produk.tipe_hitung === 'paket' ? 'Jumlah paket (1 paket = 100 pcs) ' : 'Jumlah ';
  const area = ambilEl('pratinjau-total');
  area.replaceChildren();
  if (!produk) {
    area.append(kodeDiubah ? 'Produk lama: total tidak dihitung ulang.' : 'Pilih produk dulu.');
    return;
  }
  const total = hitungTotalPesanan(produk, f);
  area.append(`${produk.harga_mulai ? 'Estimasi total: ' : 'Total: '}`, buatEl('strong', '', total ? rupiah.format(total) : '—'), ' (harga simulasi)');
}

function isiPilihanProduk(nilaiAwal, namaLama) {
  const pilih = ambilEl('ps-produk');
  const opsi = (nilai, teks) => { const o = buatEl('option', '', teks); o.value = nilai; return o; };
  const isi = semuaProduk.map((p) => opsi(p.id, `${p.nama} (${teksHargaProduk(p)})`));
  // Pesanan lama yang produknya sudah dihapus atau diganti namanya tetap bisa disimpan
  if (kodeDiubah && !nilaiAwal) isi.unshift(opsi('', `${namaLama} (sudah tidak ada di katalog)`));
  else if (!kodeDiubah) isi.unshift(opsi('', '— Pilih produk —'));
  pilih.replaceChildren(...isi);
  pilih.value = nilaiAwal || '';
}

// Buka dialog: tanpa argumen = tambah pesanan, dengan pesanan = ubah pesanan itu
function bukaFormPesanan(p) {
  const f = ambilEl('form-pesanan');
  f.reset();
  bersihkanGalatPesanan();
  if (!kartuUnggah) {
    kartuUnggah = buatKartuUnggah();
    ambilEl('ps-unggah').append(kartuUnggah.kartu);
  }
  kartuUnggah.kosongkan();
  kodeDiubah = p ? p.kode : '';
  ambilEl('judul-form-pesanan').textContent = p ? `Ubah pesanan ${p.kode}` : 'Tambah pesanan';
  ambilEl('ps-wa-wajib').hidden = Boolean(p);
  ambilEl('ps-wa').placeholder = '08xxxxxxxxxx';
  ambilEl('petunjuk-ps-wa').textContent = p ? 'Nomor tersimpan sudah terisi. Ubah kalau perlu diganti.' : 'Awali dengan 08, contoh: 081234567890.';
  const status = ambilEl('ps-status');
  status.replaceChildren(...STATUS_PESANAN.map((s) => Object.assign(buatEl('option', '', s), { value: s })));
  isiPilihanProduk(p ? p.produk_id : '', p ? p.produk : '');
  if (p) {
    f.elements.nama.value = p.nama;
    f.elements.wa.value = p.whatsapp;
    f.elements.jumlah.value = p.jumlah;
    const ukuran = /^([\d.]+) x ([\d.]+) m$/.exec(p.spesifikasi || '');
    if (ukuran) { f.elements.panjang.value = ukuran[1]; f.elements.lebar.value = ukuran[2]; }
    f.elements.linkFile.value = /^https:\/\//.test(String(p.link_file)) ? p.link_file : '';
    f.elements.tanggalButuh.value = /^\d{4}-\d{2}-\d{2}$/.test(p.tanggal_butuh) ? p.tanggal_butuh : '';
    f.elements.ambil.value = p.pengambilan === 'kirim' ? 'kirim' : 'ambil';
    f.elements.alamat.value = p.alamat || '';
    f.elements.catatan.value = p.catatan || '';
    f.elements.status.value = p.status;
  }
  perbaruiFormPesanan();
  ambilEl('dialog-pesanan').showModal();
  ambilEl('ps-nama').focus();
}

function tutupFormPesanan() {
  kodeDiubah = '';
  const dialog = ambilEl('dialog-pesanan');
  if (dialog.open) dialog.close();
}

// Validasi di browser (server tetap memeriksa ulang). Mengembalikan data pesanan atau null.
function bacaFormPesanan() {
  const f = ambilEl('form-pesanan');
  const v = (k) => f.elements[k].value.trim();
  const produk = produkTerpilih();
  const data = {
    nama: v('nama'), wa: v('wa').replace(/[\s-]/g, ''), produkId: f.elements.produkId.value, jumlah: Number(v('jumlah')),
    panjang: Number(v('panjang')), lebar: Number(v('lebar')), linkFile: v('linkFile'), tanggalButuh: v('tanggalButuh'),
    ambil: f.elements.ambil.value, alamat: v('alamat'), catatan: v('catatan'), status: f.elements.status.value,
  };
  const galat = [];
  if (data.nama.length < 2) galat.push(['nama', 'Nama wajib diisi, minimal 2 huruf.']);
  if ((!kodeDiubah || data.wa) && !/^08\d{8,12}$/.test(data.wa)) galat.push(['wa', 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.']);
  if (!kodeDiubah && !produk) galat.push(['produk', 'Pilih produk dulu.']);
  if (!(Number.isInteger(data.jumlah) && data.jumlah >= 1 && data.jumlah <= 10000)) galat.push(['jumlah', 'Jumlah harus angka bulat antara 1 dan 10.000.']);
  if (produk && produk.tipe_hitung === 'luas') {
    if (!(data.panjang >= 0.1 && data.panjang <= 20)) galat.push(['panjang', 'Panjang harus antara 0,1 dan 20 meter.']);
    if (!(data.lebar >= 0.1 && data.lebar <= 20)) galat.push(['lebar', 'Lebar harus antara 0,1 dan 20 meter.']);
  }
  if (data.linkFile && !/^https:\/\/\S+$/.test(data.linkFile)) galat.push(['link', 'Link harus diawali https://, contoh: https://drive.google.com/...']);
  if (data.ambil === 'kirim' && data.alamat.length < 10) galat.push(['alamat', 'Alamat wajib diisi lengkap kalau pesanan dikirim.']);
  galat.forEach(([nama, teks]) => setGalatPesanan(nama, teks));
  if (galat.length) ambilEl(`ps-${galat[0][0]}`).focus();
  return galat.length ? null : data;
}

async function simpanPesanan(e) {
  e.preventDefault();
  bersihkanGalatPesanan();
  const data = bacaFormPesanan();
  if (!data) return;

  const tombol = ambilEl('simpan-pesanan');
  tombol.disabled = true;
  tombol.textContent = 'Menyimpan...';
  const modeUbah = Boolean(kodeDiubah);
  const berkas = kartuUnggah.berkas();
  if (berkas) {
    try {
      data.berkas = { nama: berkas.name, tipe: berkas.type, data: await bacaBase64(berkas) };
    } catch (err) {
      tombol.disabled = false;
      tombol.textContent = 'Simpan pesanan';
      kartuUnggah.tampilGalat(err.message);
      return;
    }
  }
  const hasil = await panggilApi({ body: { action: 'pesanan_simpan', pin: pinAdmin, mode: modeUbah ? 'ubah' : 'tambah', kode: kodeDiubah, pesanan: data } });
  tombol.disabled = false;
  tombol.textContent = 'Simpan pesanan';

  if (!hasil.ok) {
    const area = ambilEl('galat-form-pesanan');
    area.textContent = hasil.pesan || 'Pesanan belum bisa disimpan. Coba lagi.';
    area.hidden = false;
    return;
  }
  const kode = modeUbah ? kodeDiubah : hasil.kode;
  tutupFormPesanan();
  perbaruiPesanan(hasil.pesanan);
  sorotBarisPesanan(kode);
  tampilkanHasil({
    judul: modeUbah ? 'Perubahan tersimpan' : 'Pesanan ditambahkan',
    pesan: modeUbah ? `Pesanan ${kode} berhasil diperbarui di Google Sheets.` : `Pesanan ${kode} berhasil disimpan ke Google Sheets.`,
  });
}

function perbaruiPesanan(daftar) {
  semuaPesanan = daftar || [];
  tampilkanTabelPesanan();
  tampilkanRingkasan();
}

function sorotBarisPesanan(kode) {
  const tr = ambilEl('isi-tabel').querySelector(`tr[data-kode="${CSS.escape(kode)}"]`);
  if (!tr) return;
  tr.classList.add('adm-sorot');
  setTimeout(() => tr.classList.remove('adm-sorot'), 2500);
}

function hapusPesanan(p) {
  pesananDihapus = p;
  ambilEl('hapus-pesanan-nama').textContent = `${p.kode} · ${p.nama}`;
  ambilEl('hapus-pesanan-info').textContent = `${p.produk} · ${rupiah.format(p.total)} · ${p.status}`;
  ambilEl('galat-hapus-pesanan').hidden = true;
  const tombol = ambilEl('ya-hapus-pesanan');
  tombol.disabled = false;
  tombol.textContent = 'Ya, hapus pesanan';
  ambilEl('dialog-hapus-pesanan').showModal();
  ambilEl('batal-hapus-pesanan').focus(); // fokus awal di tombol aman
}

async function konfirmasiHapusPesanan() {
  const p = pesananDihapus;
  if (!p) return;
  const tombol = ambilEl('ya-hapus-pesanan');
  tombol.disabled = true;
  tombol.textContent = 'Menghapus...';
  const hasil = await panggilApi({ body: { action: 'pesanan_hapus', pin: pinAdmin, kode: p.kode } });
  if (!hasil.ok) {
    tombol.disabled = false;
    tombol.textContent = 'Coba hapus lagi';
    const galat = ambilEl('galat-hapus-pesanan');
    galat.textContent = hasil.pesan || 'Pesanan belum bisa dihapus. Periksa internet lalu coba lagi.';
    galat.hidden = false;
    return;
  }
  pesananDihapus = null;
  ambilEl('dialog-hapus-pesanan').close();
  perbaruiPesanan(hasil.pesanan);
  tampilkanHasil({ judul: 'Pesanan dihapus', pesan: `Pesanan ${p.kode} berhasil dihapus dari Google Sheets.` });
}

// ----- Produk (CRUD) -----

function teksHargaProduk(p) {
  return `${p.harga_mulai ? 'Mulai ' : ''}${rupiah.format(p.harga)} / ${p.satuan}`;
}

function buatThumb(foto, alt) {
  const kotak = buatEl('span', 'adm-thumb');
  if (foto) {
    const img = document.createElement('img');
    img.src = foto;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove()); // path salah: tampil kotak kosong
    kotak.append(img);
  }
  return kotak;
}

function tombolIkon(ikon, label, kelas, aksi) {
  const t = buatEl('button', `tombol-ikon ${kelas}`);
  t.type = 'button';
  t.title = label;
  t.setAttribute('aria-label', label);
  t.append(buatIkon(ikon));
  t.addEventListener('click', () => aksi(t));
  return t;
}

function tampilkanTabelProduk() {
  const cari = ambilEl('cari-produk').value.trim().toLowerCase();
  const lini = ambilEl('saring-lini').value;
  const status = ambilEl('saring-status-produk').value;
  const tampil = semuaProduk.filter((p) => (!lini || p.lini === lini) && (!status || p.status === status)
    && (!cari || `${p.nama} ${p.id} ${p.kategori}`.toLowerCase().includes(cari)));
  ambilEl('info-produk').textContent = `Menampilkan ${tampil.length} dari ${semuaProduk.length} produk.`;

  const isi = tampil.map((p) => {
    const tr = document.createElement('tr');
    // data-label dipakai CSS untuk menampilkan judul kolom saat tabel menjadi kartu di HP
    const sel = (label, ...konten) => { const td = document.createElement('td'); td.dataset.label = label; td.append(...konten); return td; };

    const nama = buatEl('div', 'adm-produk-sel');
    const teks = buatEl('div');
    teks.append(buatEl('strong', '', p.nama), buatEl('div', 'item-spek', `${p.id} · ${p.kategori}`));
    nama.append(buatThumb(p.foto, p.nama), teks);
    const harga = buatEl('div');
    harga.append(buatEl('span', '', teksHargaProduk(p)), buatEl('div', 'item-spek', p.perlu_desain ? 'Wajib desain' : 'Tanpa desain'));

    const aksi = buatEl('div', 'adm-aksi');
    aksi.append(
      tombolIkon('ubah', `Ubah ${p.nama}`, '', () => bukaFormProduk(p)),
      tombolIkon('hapus', `Hapus ${p.nama}`, 'ikon-hapus', () => hapusProduk(p)),
    );

    tr.dataset.id = p.id;
    tr.append(sel('Produk', nama), sel('Lini', p.lini), sel('Harga', harga), sel('Estimasi', p.estimasi), sel('Status', buatEl('span', `lencana-status ${KELAS_STATUS_PRODUK[p.status] || ''}`, p.status)), sel('Aksi', aksi));
    return tr;
  });
  if (!isi.length) {
    const tr = document.createElement('tr');
    const td = buatEl('td', 'adm-kosong', 'Tidak ada produk yang cocok dengan filter.');
    td.colSpan = 6;
    tr.append(td);
    isi.push(tr);
  }
  ambilEl('isi-tabel-produk').replaceChildren(...isi);
}

function isiSaranForm() {
  const opsi = (nilai) => { const o = document.createElement('option'); o.value = nilai; return o; };
  const kategori = [...new Set(semuaProduk.map((p) => p.kategori).filter(Boolean))];
  ambilEl('daftar-kategori').replaceChildren(...kategori.map(opsi));
  ambilEl('daftar-foto').replaceChildren(...FOTO_TERSEDIA.map(opsi));
}

function perbaruiProduk(daftar) {
  semuaProduk = daftar || [];
  isiSaranForm();
  tampilkanTabelProduk();
  tampilkanRingkasan();
}

function setGalatProduk(nama, teks) {
  const input = ambilEl(`pr-${nama}`);
  const area = ambilEl(`galat-pr-${nama}`);
  area.textContent = teks || '';
  area.hidden = !teks;
  if (teks) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function bersihkanGalatProduk() {
  ['id', 'nama', 'kategori', 'harga', 'satuan', 'estimasi', 'foto'].forEach((n) => setGalatProduk(n, ''));
  ambilEl('galat-form-produk').hidden = true;
}

// Pratinjau harga seperti tampil di katalog, dan pratinjau foto
function perbaruiPratinjau() {
  const f = ambilEl('form-produk');
  const harga = Number(f.elements.harga.value);
  const area = ambilEl('pratinjau-harga');
  area.replaceChildren('Tampil di katalog: ');
  if (harga > 0) {
    area.append(buatEl('strong', '', `${f.elements.harga_mulai.checked ? 'Mulai ' : ''}${rupiah.format(harga)}`), ` / ${f.elements.satuan.value.trim() || '…'}`);
  } else {
    area.append('isi harga dulu');
  }
  const foto = f.elements.foto.value.trim();
  const sah = POLA_FOTO.test(foto) || /^https:\/\/\S+$/.test(foto);
  ambilEl('pratinjau-foto').replaceWith(Object.assign(buatThumb(sah ? foto : '', 'Pratinjau foto'), { id: 'pratinjau-foto', className: 'adm-thumb adm-thumb-besar' }));
}

// Buka dialog: tanpa argumen = tambah produk baru, dengan produk = ubah produk itu
function bukaFormProduk(p) {
  const f = ambilEl('form-produk');
  f.reset();
  bersihkanGalatProduk();
  if (!kartuFoto) {
    kartuFoto = buatKartuUnggah({ jenis: ['image/png', 'image/jpeg', 'image/webp'], maksByte: FOTO_MAKS_BYTE, namaFormat: 'PNG, JPG, atau WebP', label: 'foto produk', saran: '' });
    ambilEl('pr-unggah').append(kartuFoto.kartu);
  }
  kartuFoto.kosongkan();
  idDiubah = p ? p.id : '';
  ambilEl('judul-form-produk').textContent = p ? `Ubah produk: ${p.nama}` : 'Tambah produk';
  f.elements.id.readOnly = Boolean(p);
  if (p) {
    ['id', 'nama', 'lini', 'kategori', 'harga', 'satuan', 'estimasi', 'status', 'foto', 'deskripsi'].forEach((k) => {
      f.elements[k].value = p[k] ?? '';
    });
    f.elements.tipe_hitung.value = p.tipe_hitung;
    f.elements.harga_mulai.checked = Boolean(p.harga_mulai);
    f.elements.perlu_desain.checked = Boolean(p.perlu_desain);
  } else {
    f.elements.perlu_desain.checked = true;
  }
  perbaruiPratinjau();
  ambilEl('dialog-produk').showModal();
  ambilEl(p ? 'pr-nama' : 'pr-id').focus();
}

function tutupFormProduk() {
  idDiubah = '';
  const dialog = ambilEl('dialog-produk');
  if (dialog.open) dialog.close();
}

// Validasi di browser (server tetap memeriksa ulang). Mengembalikan data produk atau null.
function bacaFormProduk() {
  const f = ambilEl('form-produk');
  const v = (k) => f.elements[k].value.trim();
  const data = {
    id: v('id').toLowerCase(), nama: v('nama'), lini: v('lini'), kategori: v('kategori'), harga: Number(v('harga')),
    satuan: v('satuan'), tipe_hitung: v('tipe_hitung'), harga_mulai: f.elements.harga_mulai.checked,
    perlu_desain: f.elements.perlu_desain.checked, estimasi: v('estimasi'), status: v('status'), foto: v('foto'), deskripsi: v('deskripsi'),
  };
  const galat = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.id)) galat.push(['id', 'ID hanya boleh huruf kecil, angka, dan tanda hubung, contoh: stiker-vinyl.']);
  else if (!idDiubah && semuaProduk.some((p) => p.id === data.id)) galat.push(['id', `ID "${data.id}" sudah dipakai. Pakai ID yang berbeda.`]);
  if (data.nama.length < 2) galat.push(['nama', 'Nama produk wajib diisi, minimal 2 huruf.']);
  if (data.kategori.length < 2) galat.push(['kategori', 'Kategori wajib diisi, contoh: Promosi atau Merchandise.']);
  if (!(Number.isInteger(data.harga) && data.harga >= 1 && data.harga <= 100000000)) galat.push(['harga', 'Harga harus angka bulat tanpa titik, contoh: 25000.']);
  if (!data.satuan) galat.push(['satuan', 'Satuan wajib diisi, contoh: lembar atau pcs.']);
  if (!data.estimasi) galat.push(['estimasi', 'Estimasi selesai wajib diisi, contoh: 2 hari.']);
  if (data.foto && !POLA_FOTO.test(data.foto) && !/^https:\/\/\S+$/.test(data.foto)) {
    galat.push(['foto', 'Isi path gambar di folder img/ (contoh: img/produk/mug.webp) atau link https://.']);
  }
  galat.forEach(([nama, teks]) => setGalatProduk(nama, teks));
  if (galat.length) ambilEl(`pr-${galat[0][0]}`).focus();
  return galat.length ? null : data;
}

async function simpanProduk(e) {
  e.preventDefault();
  bersihkanGalatProduk();
  const data = bacaFormProduk();
  if (!data) return;

  const tombol = ambilEl('simpan-produk');
  tombol.disabled = true;
  tombol.textContent = 'Menyimpan...';
  const modeUbah = Boolean(idDiubah);
  const berkasFoto = kartuFoto.berkas();
  let fotoSiap = null;
  if (berkasFoto) {
    try {
      fotoSiap = await siapkanFoto(berkasFoto);
    } catch (err) {
      tombol.disabled = false;
      tombol.textContent = 'Simpan produk';
      kartuFoto.tampilGalat(err.message);
      return;
    }
  }
  const hasil = await panggilApi({ body: { action: 'produk_simpan', pin: pinAdmin, mode: modeUbah ? 'ubah' : 'tambah', produk: data, berkas: fotoSiap } });
  tombol.disabled = false;
  tombol.textContent = 'Simpan produk';

  if (!hasil.ok) {
    const area = ambilEl('galat-form-produk');
    area.textContent = hasil.pesan || 'Produk belum bisa disimpan. Coba lagi.';
    area.hidden = false;
    return;
  }
  const lama = semuaProduk.find((x) => x.id === data.id);
  tutupFormProduk();
  perbaruiProduk(hasil.produk);
  sorotBaris(data.id);
  if (modeUbah) {
    const rincian = daftarPerubahan(lama, data);
    tampilkanHasil({
      judul: rincian.length ? 'Perubahan tersimpan' : 'Tidak ada yang berubah',
      pesan: rincian.length
        ? `Produk "${data.nama}" berhasil diperbarui di Google Sheets dan langsung tampil di website.`
        : `Data produk "${data.nama}" sama seperti sebelumnya.`,
      rincian,
    });
  } else {
    tampilkanHasil({
      judul: 'Produk ditambahkan',
      pesan: `"${data.nama}" berhasil disimpan ke Google Sheets dan sudah tampil di katalog website.`,
      rincian: [
        ['Lini / kategori', '', `${data.lini} · ${data.kategori}`],
        ['Harga', '', teksHargaProduk(data)],
        ['Estimasi selesai', '', data.estimasi],
        ['Status stok', '', data.status],
        ['Wajib desain', '', data.perlu_desain ? 'Ya' : 'Tidak'],
      ],
    });
  }
}

// Label kolom untuk ringkasan perubahan
const LABEL_KOLOM = {
  nama: 'Nama', lini: 'Lini', kategori: 'Kategori', harga: 'Harga', satuan: 'Satuan', tipe_hitung: 'Cara hitung',
  harga_mulai: 'Harga "Mulai"', perlu_desain: 'Wajib desain', estimasi: 'Estimasi', status: 'Status stok', foto: 'Foto', deskripsi: 'Deskripsi',
};

function teksNilai(kolom, nilai) {
  if (typeof nilai === 'boolean') return nilai ? 'Ya' : 'Tidak';
  if (kolom === 'harga') return rupiah.format(nilai);
  return String(nilai ?? '') || '(kosong)';
}

// Daftar [label, lama, baru] untuk kolom yang berubah
function daftarPerubahan(lama, baru) {
  if (!lama) return [];
  return Object.keys(LABEL_KOLOM)
    .filter((k) => String(lama[k] ?? '') !== String(baru[k] ?? ''))
    .map((k) => [LABEL_KOLOM[k], teksNilai(k, lama[k]), teksNilai(k, baru[k])]);
}

// Dialog umpan balik berhasil. rincian: [label, nilaiLama, nilaiBaru]; nilaiLama kosong = hanya tampil nilai baru.
function tampilkanHasil({ judul, pesan, rincian = [] }) {
  ambilEl('hasil-judul').textContent = judul;
  ambilEl('hasil-pesan').textContent = pesan;
  const daftar = ambilEl('hasil-rincian');
  daftar.replaceChildren(...rincian.map(([label, lama, baru]) => {
    const li = buatEl('li');
    const isi = buatEl('div');
    if (lama) isi.append(buatEl('del', '', lama), ' → ');
    isi.append(buatEl('ins', '', baru));
    li.append(buatEl('span', '', label), isi);
    return li;
  }));
  daftar.hidden = !rincian.length;
  // Ikon dibuat ulang agar animasi centang diputar lagi
  const ikon = ambilEl('dialog-hasil').querySelector('.konf-ikon');
  ikon.replaceWith(ikon.cloneNode(true));
  ambilEl('dialog-hasil').showModal();
}

function sorotBaris(id) {
  const tr = ambilEl('isi-tabel-produk').querySelector(`tr[data-id="${CSS.escape(id)}"]`);
  if (!tr) return;
  tr.classList.add('adm-sorot');
  setTimeout(() => tr.classList.remove('adm-sorot'), 2500);
}

// ----- Hapus produk (dengan dialog konfirmasi) -----

let produkDihapus = null;

function hapusProduk(p) {
  produkDihapus = p;
  ambilEl('hapus-thumb').replaceWith(Object.assign(buatThumb(p.foto, p.nama), { id: 'hapus-thumb' }));
  ambilEl('hapus-nama').textContent = p.nama;
  ambilEl('hapus-info').textContent = `${p.id} · ${p.lini} · ${teksHargaProduk(p)}`;
  ambilEl('galat-hapus').hidden = true;
  const tombol = ambilEl('ya-hapus');
  tombol.disabled = false;
  tombol.textContent = 'Ya, hapus produk';
  ambilEl('dialog-hapus').showModal();
  ambilEl('batal-hapus').focus(); // fokus awal di tombol aman
}

async function konfirmasiHapus() {
  const p = produkDihapus;
  if (!p) return;
  const tombol = ambilEl('ya-hapus');
  tombol.disabled = true;
  tombol.textContent = 'Menghapus...';
  const hasil = await panggilApi({ body: { action: 'produk_hapus', pin: pinAdmin, id: p.id } });
  if (!hasil.ok) {
    tombol.disabled = false;
    tombol.textContent = 'Coba hapus lagi';
    const galat = ambilEl('galat-hapus');
    galat.textContent = hasil.pesan || 'Produk belum bisa dihapus. Periksa internet lalu coba lagi.';
    galat.hidden = false;
    return;
  }
  produkDihapus = null;
  ambilEl('dialog-hapus').close();
  perbaruiProduk(hasil.produk);
  tampilkanHasil({
    judul: 'Produk dihapus',
    pesan: `"${p.nama}" berhasil dihapus dari katalog website dan Google Sheets.`,
  });
}

// ----- Alur -----

function isiSalam() {
  const tanggal = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  ambilEl('adm-salam').textContent = `Halo, Admin · ${tanggal}`;
}

function tampilkanDashboard(hasil) {
  semuaPesanan = hasil.pesanan || [];
  ambilEl('gerbang-wadah').hidden = true;
  ambilEl('adm-tata').hidden = false;
  ambilEl('adm-keluar').hidden = false;
  ambilEl('adm-nama').hidden = false;
  ambilEl('adm-toggle').hidden = false;
  isiSalam();
  tampilkanBagian();
  tampilkanTabelPesanan();
  perbaruiProduk(hasil.produk);
  // Apps Script versi lama belum mengirim daftar produk di respons dashboard: ambil lewat endpoint publik
  if (!hasil.produk) muatProdukPublik();
}

async function muatProdukPublik() {
  const hasil = await panggilApi({ params: { action: 'produk' } });
  if (hasil.ok) perbaruiProduk(hasil.produk);
}

async function masuk(e) {
  e.preventDefault();
  setGalatPin('');
  const pin = ambilEl('pin').value.trim();
  if (!pin) return setGalatPin('PIN wajib diisi.');
  if (!CONFIG.urlApi) return setGalatPin('Server belum tersambung. Isi urlApi di js/config.js dengan URL Web App Apps Script.');

  const tombol = e.target.querySelector('button[type="submit"]');
  tombol.disabled = true;
  const hasil = await panggilApi({ body: { action: 'dashboard', pin } });
  tombol.disabled = false;
  if (!hasil.ok) {
    setGalatPin(hasil.pesan || 'Dashboard belum bisa dibuka. Coba lagi.');
    ambilEl('pin').select();
    return;
  }

  pinAdmin = pin;
  simpanPin(pin);
  ambilEl('pin').value = '';
  // Setelah masuk selalu mulai dari Ringkasan, apa pun bagian yang terakhir dibuka di URL
  history.replaceState(null, '', '#ringkasan');
  window.scrollTo(0, 0);
  tampilkanDashboard(hasil);
}

async function muatUlang() {
  const tombol = ambilEl('muat-ulang');
  tombol.disabled = true;
  const hasil = await panggilApi({ body: { action: 'dashboard', pin: pinAdmin } });
  tombol.disabled = false;
  if (!hasil.ok) return tampilToast({ jenis: 'galat', pesan: hasil.pesan || 'Data belum bisa dimuat ulang.' });
  tampilkanDashboard(hasil);
  tampilToast({ pesan: 'Data terbaru dari Google Sheets sudah dimuat.' });
}

// Simpan PIN di browser ini supaya refresh atau pindah halaman tidak minta PIN lagi; dihapus saat Keluar.
// Pengaman demo: PIN tetap diperiksa di Apps Script setiap kali data diminta.
function simpanPin(pin) {
  try { localStorage.setItem(KUNCI_PIN, pin); } catch (err) { /* penyimpanan diblokir: tetap bisa dipakai tanpa ingat PIN */ }
}

function hapusPinTersimpan() {
  try { localStorage.removeItem(KUNCI_PIN); } catch (err) { /* diabaikan */ }
}

// Masuk otomatis memakai PIN tersimpan. Bila PIN sudah tidak berlaku, tampilkan form PIN seperti biasa.
async function masukOtomatis() {
  let pin = '';
  try { pin = localStorage.getItem(KUNCI_PIN) || ''; } catch (err) { /* diabaikan */ }
  if (!pin || !CONFIG.urlApi) return;
  ambilEl('gerbang-wadah').hidden = true; // hindari form PIN berkedip selagi data dimuat
  const hasil = await panggilApi({ body: { action: 'dashboard', pin } });
  if (hasil.ok) {
    pinAdmin = pin;
    tampilkanDashboard(hasil);
    return;
  }
  if (hasil.pesan === 'PIN salah.') hapusPinTersimpan();
  ambilEl('gerbang-wadah').hidden = false;
  setGalatPin(hasil.pesan === 'PIN salah.' ? 'PIN sudah berubah. Masukkan PIN yang baru.' : (hasil.pesan || 'Dashboard belum bisa dibuka. Coba lagi.'));
}

function keluar() {
  hapusPinTersimpan();
  pinAdmin = '';
  semuaPesanan = [];
  semuaProduk = [];
  tutupFormProduk();
  tutupFormPesanan();
  ambilEl('adm-tata').hidden = true;
  ambilEl('gerbang-wadah').hidden = false;
  ['adm-keluar', 'adm-nama', 'adm-toggle'].forEach((id) => { ambilEl(id).hidden = true; });
  ambilEl('pin').focus();
}

document.addEventListener('DOMContentLoaded', () => {
  isiSaringStatus();
  try { if (localStorage.getItem(KUNCI_MENU_KECIL) === '1') aturMenuKecil(true); } catch (err) { /* diabaikan */ }

  ambilEl('form-pin').addEventListener('submit', masuk);
  ambilEl('adm-keluar').addEventListener('click', () => {
    ambilEl('dialog-keluar').showModal();
    ambilEl('batal-keluar').focus(); // fokus awal di tombol aman
  });
  ambilEl('batal-keluar').addEventListener('click', () => ambilEl('dialog-keluar').close());
  ambilEl('ya-keluar').addEventListener('click', () => { ambilEl('dialog-keluar').close(); keluar(); });
  ambilEl('adm-toggle').addEventListener('click', () => aturMenuKecil(!document.body.classList.contains('adm-menu-kecil')));
  window.addEventListener('hashchange', tampilkanBagian);

  // Ringkasan
  ambilEl('muat-ulang').addEventListener('click', muatUlang);
  ambilEl('muat-ulang-keuangan').addEventListener('click', muatUlang);
  setInterval(segarkanKeuangan, 30000);
  ambilEl('cari-keuangan').addEventListener('input', tampilkanTabelKeuangan);
  ['saring-periode-keuangan', 'saring-lini-keuangan'].forEach((id) => ambilEl(id).addEventListener('change', tampilkanTabelKeuangan));
  ambilEl('reset-keuangan').addEventListener('click', () => {
    ambilEl('cari-keuangan').value = '';
    ambilEl('saring-periode-keuangan').value = 'semua';
    ambilEl('saring-lini-keuangan').value = '';
    tampilkanTabelKeuangan();
  });
  ['saring-periode', 'saring-lini-ringkasan'].forEach((id) => ambilEl(id).addEventListener('change', tampilkanRingkasan));
  ambilEl('reset-ringkasan').addEventListener('click', () => {
    ambilEl('saring-periode').value = '6';
    ambilEl('saring-lini-ringkasan').value = '';
    tampilkanRingkasan();
  });

  // Produk
  ambilEl('cari-produk').addEventListener('input', tampilkanTabelProduk);
  ['saring-lini', 'saring-status-produk'].forEach((id) => ambilEl(id).addEventListener('change', tampilkanTabelProduk));
  ambilEl('reset-produk').addEventListener('click', () => {
    ['cari-produk', 'saring-lini', 'saring-status-produk'].forEach((id) => { ambilEl(id).value = ''; });
    tampilkanTabelProduk();
  });
  ambilEl('tambah-produk').addEventListener('click', () => bukaFormProduk());
  ambilEl('batal-produk').addEventListener('click', tutupFormProduk);
  ambilEl('tutup-produk').addEventListener('click', tutupFormProduk);
  ambilEl('form-produk').addEventListener('submit', simpanProduk);
  ambilEl('batal-hapus').addEventListener('click', () => { produkDihapus = null; ambilEl('dialog-hapus').close(); });
  ambilEl('ya-hapus').addEventListener('click', konfirmasiHapus);
  ambilEl('tutup-hasil').addEventListener('click', () => ambilEl('dialog-hasil').close());
  // Klik di luar kotak dialog (latar gelap) menutup dialog konfirmasi/hasil
  ['dialog-hapus', 'dialog-hasil'].forEach((id) => ambilEl(id).addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const diLuar = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (e.target === e.currentTarget && diLuar && !ambilEl('ya-hapus').disabled) e.currentTarget.close();
  }));
  ambilEl('form-produk').addEventListener('input', (e) => {
    if (e.target.id?.startsWith('pr-') && ambilEl(`galat-${e.target.id}`)) setGalatProduk(e.target.id.slice(3), '');
    perbaruiPratinjau();
  });

  // Pesanan
  ambilEl('tambah-pesanan').addEventListener('click', () => bukaFormPesanan());
  ambilEl('batal-pesanan').addEventListener('click', tutupFormPesanan);
  ambilEl('tutup-pesanan').addEventListener('click', tutupFormPesanan);
  ambilEl('form-pesanan').addEventListener('submit', simpanPesanan);
  ambilEl('form-pesanan').addEventListener('input', (e) => {
    const nama = e.target.id?.startsWith('ps-') ? e.target.id.slice(3) : '';
    if (nama && ambilEl(`galat-ps-${nama}`)) setGalatPesanan(nama, '');
    perbaruiFormPesanan();
  });
  ambilEl('batal-hapus-pesanan').addEventListener('click', () => { pesananDihapus = null; ambilEl('dialog-hapus-pesanan').close(); });
  ambilEl('ya-hapus-pesanan').addEventListener('click', konfirmasiHapusPesanan);
  ambilEl('cari-pesanan').addEventListener('input', tampilkanTabelPesanan);
  ambilEl('saring-status').addEventListener('change', tampilkanTabelPesanan);
  ambilEl('reset-pesanan').addEventListener('click', () => {
    ambilEl('cari-pesanan').value = '';
    ambilEl('saring-status').value = '';
    tampilkanTabelPesanan();
  });

  masukOtomatis();
});
