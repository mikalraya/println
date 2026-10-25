// Halaman Pesanan Saya: daftar pesanan, detail dengan tahap pengerjaan, dan cek lewat kode.
// Tahap: Antri -> Dibuat -> Selesai (atau Dibatalkan). Teks dari database selalu lewat textContent.

const TAHAP = ['Antri', 'Dibuat', 'Selesai'];
const KETERANGAN_TAHAP = {
  Antri: 'Pesananmu sudah masuk dan menunggu giliran.',
  Dibuat: 'Pesananmu sedang dikerjakan.',
  Selesai: 'Pesananmu sudah selesai. Silakan diambil atau tunggu pengiriman.',
  Dibatalkan: 'Pesanan ini dibatalkan.',
};
const SARING = ['Semua', 'Antri', 'Dibuat', 'Selesai', 'Dibatalkan'];

const ambil = (id) => document.getElementById(id);
let semuaPesanan = [];
let saringAktif = 'Semua';

function buatEl(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

function lencanaStatus(status) {
  return buatEl('span', `lencana-pesanan status-${status.toLowerCase()}`, status);
}

// ----- Daftar pesanan -----

function tampilkanDaftar() {
  const tampil = semuaPesanan.filter((p) => saringAktif === 'Semua' || p.status === saringAktif);
  ambil('list-pesanan').replaceChildren(...tampil.map((p) => {
    const li = buatEl('li', 'kartu-pesanan');
    const kiri = buatEl('div');
    kiri.append(buatEl('strong', '', p.kode), buatEl('p', 'item-spek', tanggalJam(p.dibuat)));
    const produk = p.jumlahItem > 1 ? `${p.produkPertama} dan ${p.jumlahItem - 1} produk lain` : p.produkPertama;
    kiri.append(buatEl('p', 'item-nama', produk || '—'));

    const kanan = buatEl('div', 'kartu-pesanan-kanan');
    kanan.append(lencanaStatus(p.status));
    if (p.statusBayar !== 'Sudah bayar' && p.status !== 'Dibatalkan') kanan.append(buatEl('span', 'lencana-pesanan status-belum-bayar', 'Belum bayar'));
    kanan.append(buatEl('strong', '', rupiah.format(p.total)));

    const lihat = buatEl('a', 'btn btn-garis btn-kecil', 'Lihat detail');
    lihat.href = `status.html?kode=${encodeURIComponent(p.kode)}`;
    lihat.setAttribute('aria-label', `Lihat detail pesanan ${p.kode}`);
    kanan.append(lihat);

    li.append(kiri, kanan);
    return li;
  }));
  ambil('pesanan-kosong-saya').hidden = tampil.length > 0;
}

function buatFilter() {
  ambil('saring-status').replaceChildren(...SARING.map((nama) => {
    const jumlah = nama === 'Semua' ? semuaPesanan.length : semuaPesanan.filter((p) => p.status === nama).length;
    const tombol = buatEl('button', 'chip-filter', `${nama} (${jumlah})`);
    tombol.type = 'button';
    tombol.setAttribute('aria-pressed', String(nama === saringAktif));
    tombol.addEventListener('click', () => { saringAktif = nama; buatFilter(); tampilkanDaftar(); });
    return tombol;
  }));
}

// ----- Detail pesanan -----

// Garis waktu 3 tahap. riwayat dipakai untuk menampilkan kapan tiap tahap dimulai.
function buatTahap(pesanan) {
  const ol = buatEl('ol', 'tahap-pesanan');
  ol.setAttribute('aria-label', 'Tahap pengerjaan pesanan');
  const posisi = TAHAP.indexOf(pesanan.status);
  TAHAP.forEach((nama, i) => {
    const li = buatEl('li', 'tahap');
    if (i < posisi || (nama === 'Selesai' && posisi === i)) li.classList.add('tahap-selesai');
    else if (i === posisi) li.classList.add('tahap-sekarang');
    if (i === posisi) li.setAttribute('aria-current', 'step');
    const titik = buatEl('span', 'tahap-titik', i < posisi || (nama === 'Selesai' && posisi === i) ? '✓' : String(i + 1));
    titik.setAttribute('aria-hidden', 'true');
    const teks = buatEl('div', 'tahap-teks');
    teks.append(buatEl('strong', '', nama));
    const catatan = pesanan.riwayat.find((r) => r.status === nama);
    teks.append(buatEl('span', 'item-spek', i <= posisi && catatan ? tanggalJam(catatan.dibuat) : 'Belum'));
    li.append(titik, teks);
    ol.append(li);
  });
  return ol;
}

function barisInfo(nama, nilai) {
  const d = buatEl('div');
  d.append(buatEl('dt', '', nama), buatEl('dd', '', nilai));
  return d;
}

// pesanan penuh (login, milik sendiri) atau terbatas (cek publik: tanpa harga dan data pribadi)
function tampilkanDetail(pesanan, penuh) {
  const kotak = ambil('detail-pesanan');
  kotak.replaceChildren();

  const kepala = buatEl('div', 'detail-kepala');
  const judul = buatEl('div');
  judul.append(buatEl('p', 'item-spek', 'Kode pesanan'), buatEl('h2', '', pesanan.kode));
  kepala.append(judul, lencanaStatus(pesanan.status));
  kotak.append(kepala);

  if (pesanan.status === 'Dibatalkan') {
    kotak.append(buatEl('p', 'info-batal', KETERANGAN_TAHAP.Dibatalkan));
  } else {
    kotak.append(buatTahap(pesanan), buatEl('p', 'info-tahap', KETERANGAN_TAHAP[pesanan.status]));
  }

  const daftar = buatEl('ul', 'daftar-bersih daftar-ringkas');
  pesanan.item.forEach((i) => {
    const li = buatEl('li');
    li.append(buatEl('strong', '', i.nama));
    li.append(buatEl('span', '', penuh ? `${i.spesifikasi ? `${i.spesifikasi} · ` : ''}${i.jumlah} × ${rupiah.format(i.harga)}` : `${i.jumlah} pcs/lembar`));
    if (penuh) li.append(buatEl('span', 'ringkas-harga', rupiah.format(Math.round(i.harga * i.jumlah))));
    if (penuh && i.file) {
      const lihat = buatEl('a', '', 'Lihat desain');
      lihat.href = i.file;
      lihat.target = '_blank';
      lihat.rel = 'noopener';
      li.append(lihat);
    }
    daftar.append(li);
  });
  kotak.append(daftar);

  if (penuh) {
    const total = buatEl('div', 'hasil-total');
    total.append(buatEl('span', '', 'Perkiraan total'), buatEl('strong', '', rupiah.format(pesanan.total)));
    const info = buatEl('dl', 'info-daftar detail-info');
    info.append(
      barisInfo('Pembayaran', pesanan.statusBayar),
      barisInfo('Pengambilan', pesanan.pengambilan === 'kirim' ? `Dikirim ke ${pesanan.alamat}` : 'Ambil sendiri di toko'),
    );
    if (pesanan.tanggalButuh) info.append(barisInfo('Dibutuhkan tanggal', pesanan.tanggalButuh));
    if (pesanan.catatan) info.append(barisInfo('Catatan', pesanan.catatan));
    kotak.append(total, info);

    const aksi = buatEl('div', 'detail-aksi');
    if (pesanan.statusBayar !== 'Sudah bayar' && pesanan.status !== 'Dibatalkan') {
      const bayar = buatEl('a', 'btn btn-utama', 'Bayar sekarang');
      bayar.href = `bayar.html?kode=${encodeURIComponent(pesanan.kode)}`;
      aksi.append(bayar);
    }
    const wa = buatEl('a', 'btn btn-garis', 'Tanya admin lewat WhatsApp');
    wa.href = `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(`Halo ${CONFIG.namaToko}, saya mau tanya soal pesanan ${pesanan.kode}.`)}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    aksi.append(wa);
    if (pesanan.status === 'Antri') {
      const batal = buatEl('button', 'btn-hapus', 'Batalkan pesanan');
      batal.type = 'button';
      batal.addEventListener('click', () => batalkan(pesanan.kode));
      aksi.append(batal);
    }
    kotak.append(aksi);
  } else {
    kotak.append(buatEl('p', 'catatan-kecil', 'Untuk melihat harga dan detail lengkap, masuk ke akunmu.'));
  }

  const tutup = buatEl('a', 'btn btn-garis btn-kecil', '← Semua pesanan');
  tutup.href = 'status.html';
  kotak.append(tutup);
  kotak.hidden = false;
  kotak.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function batalkan(kode) {
  const yakin = await tanyaKonfirmasi({
    judul: 'Batalkan pesanan?',
    teks: `Pesanan ${kode} akan dibatalkan dan tidak bisa dibuka lagi. Pesanan yang sudah dikerjakan tidak bisa dibatalkan.`,
    ya: 'Ya, batalkan',
  });
  if (!yakin) return;
  const hasil = await panggilPesanan({ aksi: 'batal', kode });
  tampilToast({ jenis: hasil.ok ? 'sukses' : 'galat', pesan: hasil.pesan });
  if (hasil.ok) await muatKode(kode);
}

// Buka detail: pesanan milik sendiri (lengkap) atau, bila bukan, cek publik (terbatas)
async function muatKode(kode) {
  const milik = await panggilPesanan({ aksi: 'detail', kode });
  if (milik.ok) return tampilkanDetail(milik.pesanan, true);
  const publik = await panggilPesanan({ aksi: 'cek', kode });
  if (publik.ok) return tampilkanDetail(publik.pesanan, false);
  setGalatCek(publik.pesan);
}

function setGalatCek(teks) {
  const area = ambil('galat-cek-kode');
  area.textContent = teks || '';
  area.hidden = !teks;
  const input = ambil('cek-kode');
  if (teks) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

async function mulaiStatus() {
  ambil('form-cek').addEventListener('submit', async (e) => {
    e.preventDefault();
    const kode = ambil('cek-kode').value.trim().toUpperCase();
    setGalatCek('');
    if (!/^PRT-\d{4,}$/.test(kode)) return setGalatCek('Kode pesanan diawali PRT- lalu angka, contoh: PRT-0001.');
    await muatKode(kode);
  });

  const kode = new URLSearchParams(location.search).get('kode');
  if (kode) {
    ambil('cek-kode').value = kode;
    await muatKode(kode.toUpperCase());
  }

  const hasil = await panggilPesanan({ aksi: 'daftar' });
  if (hasil.perluMasuk) {
    ambil('status-masuk').hidden = false;
    return;
  }
  if (!hasil.ok) return tampilToast({ jenis: 'galat', pesan: hasil.pesan });
  semuaPesanan = hasil.pesanan;
  ambil('daftar-pesanan-saya').hidden = false;
  buatFilter();
  tampilkanDaftar();
}

document.addEventListener('DOMContentLoaded', mulaiStatus);
