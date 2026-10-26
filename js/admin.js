// Dashboard admin: PIN, menu Ringkasan (statistik + grafik Chart.js), Produk (CRUD), Pesanan (tabel + ubah status).
// PIN dikirim lewat POST ke Apps Script dan diperiksa di sana (tidak ada PIN di front-end).
// PIN hanya disimpan di memori halaman ini, hilang saat halaman ditutup atau tombol Keluar ditekan.

const STATUS_PESANAN = ['Diterima', 'Cek desain', 'Diproses', 'Siap diambil', 'Selesai'];
const LINI = ['Printing Reguler', 'Custom Merchandise'];
const WARNA = { biru: '#1f6fe8', oranye: '#ff8a3d', tosca: '#3de0b5' };
const KELAS_STATUS_PRODUK = { Tersedia: 'status-tersedia', Terbatas: 'status-terbatas', Habis: 'status-habis' };
const KUNCI_MENU_KECIL = 'printin_menu_kecil';
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
  return ['ringkasan', 'produk', 'pesanan'].includes(nama) ? nama : 'ringkasan';
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

function labelPeriode(nilai) {
  return ambilEl('saring-periode').selectedOptions[0]?.textContent || nilai;
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
    const sel = (...konten) => { const td = document.createElement('td'); td.append(...konten); return td; };

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

    tr.append(sel(kode), sel(tanggalJam(p.tanggal) || p.tanggal), sel(pelanggan), sel(produk), sel(rupiah.format(p.total)), sel(desain), sel(buatPilihanStatus(p)));
    return tr;
  });
  if (!isi.length) {
    const tr = document.createElement('tr');
    const td = buatEl('td', 'adm-kosong', 'Tidak ada pesanan yang cocok dengan filter.');
    td.colSpan = 7;
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
    const sel = (...konten) => { const td = document.createElement('td'); td.append(...konten); return td; };

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
    tr.append(sel(nama), sel(p.lini), sel(harga), sel(p.estimasi), sel(buatEl('span', `lencana-status ${KELAS_STATUS_PRODUK[p.status] || ''}`, p.status)), sel(aksi));
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
  const hasil = await panggilApi({ body: { action: 'produk_simpan', pin: pinAdmin, mode: modeUbah ? 'ubah' : 'tambah', produk: data } });
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
  ambilEl('pin').value = '';
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

function keluar() {
  pinAdmin = '';
  semuaPesanan = [];
  semuaProduk = [];
  tutupFormProduk();
  ambilEl('adm-tata').hidden = true;
  ambilEl('gerbang-wadah').hidden = false;
  ['adm-keluar', 'adm-nama', 'adm-toggle'].forEach((id) => { ambilEl(id).hidden = true; });
  ambilEl('pin').focus();
}

document.addEventListener('DOMContentLoaded', () => {
  isiSaringStatus();
  try { if (localStorage.getItem(KUNCI_MENU_KECIL) === '1') aturMenuKecil(true); } catch (err) { /* diabaikan */ }

  ambilEl('form-pin').addEventListener('submit', masuk);
  ambilEl('adm-keluar').addEventListener('click', keluar);
  ambilEl('adm-toggle').addEventListener('click', () => aturMenuKecil(!document.body.classList.contains('adm-menu-kecil')));
  window.addEventListener('hashchange', tampilkanBagian);

  // Ringkasan
  ambilEl('muat-ulang').addEventListener('click', muatUlang);
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
  ambilEl('cari-pesanan').addEventListener('input', tampilkanTabelPesanan);
  ambilEl('saring-status').addEventListener('change', tampilkanTabelPesanan);
  ambilEl('reset-pesanan').addEventListener('click', () => {
    ambilEl('cari-pesanan').value = '';
    ambilEl('saring-status').value = '';
    tampilkanTabelPesanan();
  });
});
