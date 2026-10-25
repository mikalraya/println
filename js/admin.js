// Dashboard admin: PIN, kartu ringkasan, grafik Chart.js, tabel pesanan.
// PIN dikirim lewat POST ke Apps Script dan diperiksa di sana (tidak ada PIN di front-end).
// PIN hanya disimpan di memori halaman ini, hilang saat halaman ditutup atau tombol Keluar ditekan.

const STATUS_PESANAN = ['Diterima', 'Cek desain', 'Diproses', 'Siap diambil', 'Selesai'];
const WARNA = ['#1f6fe8', '#3de0b5', '#ff8a3d', '#f6ee14', '#3b8cff'];

const ambilEl = (id) => document.getElementById(id);
let pinAdmin = '';
let semuaPesanan = [];
const grafik = {};

function buatEl(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

function setGalatPin(teks) {
  const area = ambilEl('galat-pin');
  area.textContent = teks || '';
  area.hidden = !teks;
  const input = ambilEl('pin');
  if (teks) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

// ----- Tampilan -----

function tampilkanKartu(r) {
  const data = [
    ['Total pesanan', String(r.totalPesanan)],
    ['Pesanan baru (Diterima)', String(r.pesananBaru)],
    ['Pesanan selesai', String(r.selesai)],
    ['Perkiraan omzet', rupiah.format(r.omzet)],
  ];
  ambilEl('kartu-angka').replaceChildren(...data.map(([nama, nilai]) => {
    const kartu = buatEl('div', 'kartu adm-angka');
    kartu.append(buatEl('span', 'adm-angka-nama', nama), buatEl('strong', 'adm-angka-nilai', nilai));
    return kartu;
  }));
}

function gambarGrafik(kunci, kanvas, konfigurasi) {
  grafik[kunci]?.destroy();
  grafik[kunci] = new Chart(kanvas, konfigurasi);
}

function tampilkanGrafik(r) {
  if (typeof Chart === 'undefined') {
    ambilEl('info-grafik').hidden = false;
    return;
  }
  const urut = Object.entries(r.perProduk).sort((a, b) => b[1] - a[1]).slice(0, 5);
  gambarGrafik('produk', ambilEl('grafik-produk'), {
    type: 'bar',
    data: { labels: urut.map(([n]) => n), datasets: [{ label: 'Jumlah dipesan', data: urut.map(([, j]) => j), backgroundColor: WARNA[0] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });

  const lini = Object.entries(r.perLini);
  gambarGrafik('lini', ambilEl('grafik-lini'), {
    type: 'doughnut',
    data: { labels: lini.map(([n]) => n), datasets: [{ data: lini.map(([, j]) => j), backgroundColor: [WARNA[0], WARNA[2]] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}

function buatPilihanStatus(pesanan) {
  const pilih = buatEl('select', 'adm-pilih-status');
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
      tampilkanKartu(hitungRingkasan());
    } else {
      pilih.value = lama;
      tampilToast({ jenis: 'galat', pesan: hasil.pesan || 'Status belum bisa diubah. Coba lagi.' });
    }
  });
  return pilih;
}

// Hitung ulang ringkasan dari daftar pesanan (setelah status diubah)
function hitungRingkasan() {
  const perProduk = {};
  const perLini = { 'Printing Reguler': 0, 'Custom Merchandise': 0 };
  let omzet = 0;
  semuaPesanan.forEach((p) => {
    perProduk[p.produk] = (perProduk[p.produk] || 0) + p.jumlah;
    perLini[p.lini] = (perLini[p.lini] || 0) + 1;
    omzet += p.total;
  });
  return {
    totalPesanan: semuaPesanan.length,
    pesananBaru: semuaPesanan.filter((p) => p.status === 'Diterima').length,
    selesai: semuaPesanan.filter((p) => p.status === 'Selesai').length,
    omzet, perProduk, perLini,
  };
}

function tampilkanTabel() {
  const saring = ambilEl('saring-status').value;
  const tampil = semuaPesanan.filter((p) => !saring || p.status === saring);
  ambilEl('info-tabel').textContent = `Menampilkan ${tampil.length} dari ${semuaPesanan.length} pesanan.`;

  ambilEl('isi-tabel').replaceChildren(...tampil.map((p) => {
    const tr = document.createElement('tr');
    const sel = (...isi) => { const td = document.createElement('td'); td.append(...isi); return td; };

    const pelanggan = buatEl('div');
    pelanggan.append(buatEl('strong', '', p.nama), buatEl('div', 'item-spek', p.whatsapp));

    const produk = buatEl('div');
    produk.append(buatEl('strong', '', p.produk), buatEl('div', 'item-spek', `${p.spesifikasi ? `${p.spesifikasi} · ` : ''}${p.jumlah}`));

    // Hanya tautan https yang dijadikan link
    let desain = buatEl('span', '', '—');
    if (/^https:\/\//.test(String(p.link_file))) {
      desain = buatEl('a', '', 'Buka desain');
      desain.href = p.link_file;
      desain.target = '_blank';
      desain.rel = 'noopener';
    }

    tr.append(sel(p.kode), sel(p.tanggal), sel(pelanggan), sel(produk), sel(rupiah.format(p.total)), sel(desain), sel(buatPilihanStatus(p)));
    return tr;
  }));
}

function isiSaringStatus() {
  const pilih = ambilEl('saring-status');
  pilih.replaceChildren(...[['', 'Semua status'], ...STATUS_PESANAN.map((s) => [s, s])].map(([nilai, teks]) => {
    const o = buatEl('option', '', teks);
    o.value = nilai;
    return o;
  }));
}

function tampilkanDashboard(hasil) {
  semuaPesanan = hasil.pesanan;
  ambilEl('gerbang').hidden = true;
  ambilEl('dashboard').hidden = false;
  ambilEl('adm-keluar').hidden = false;
  tampilkanKartu(hasil.ringkasan);
  tampilkanGrafik(hasil.ringkasan);
  tampilkanTabel();
}

// ----- Alur -----

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
}

function keluar() {
  pinAdmin = '';
  semuaPesanan = [];
  ambilEl('dashboard').hidden = true;
  ambilEl('gerbang').hidden = false;
  ambilEl('adm-keluar').hidden = true;
  ambilEl('pin').focus();
}

document.addEventListener('DOMContentLoaded', () => {
  isiSaringStatus();
  ambilEl('form-pin').addEventListener('submit', masuk);
  ambilEl('saring-status').addEventListener('change', tampilkanTabel);
  ambilEl('muat-ulang').addEventListener('click', muatUlang);
  ambilEl('adm-keluar').addEventListener('click', keluar);
});
