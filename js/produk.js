// Katalog produk + filter lini dan kategori.
// Data DUMMY, harga sesuai CLAUDE.md bagian 3 (harga simulasi). Strukturnya sama persis dengan
// tab "produk" di Google Sheets, jadi di Langkah 8 cukup mengganti isi PRODUK dengan hasil fetch.

const PRODUK = [
  // ----- Printing Reguler -----
  { id: 'print-bw', nama: 'Print hitam putih', lini: 'Printing Reguler', kategori: 'Dokumen', harga: 500, satuan: 'lembar', tipe_hitung: 'lembar', harga_mulai: false, perlu_desain: false, estimasi: 'Hari ini', status: 'Tersedia', foto: '', deskripsi: 'Print dokumen, makalah, atau skripsi dengan tinta hitam putih.' },
  { id: 'print-warna', nama: 'Print berwarna', lini: 'Printing Reguler', kategori: 'Dokumen', harga: 1500, satuan: 'lembar', tipe_hitung: 'lembar', harga_mulai: false, perlu_desain: false, estimasi: 'Hari ini', status: 'Tersedia', foto: '', deskripsi: 'Print dokumen berwarna, cocok untuk presentasi, laporan bergambar, atau materi belajar.' },
  { id: 'fotokopi-bw', nama: 'Fotokopi hitam putih', lini: 'Printing Reguler', kategori: 'Dokumen', harga: 300, satuan: 'lembar', tipe_hitung: 'lembar', harga_mulai: false, perlu_desain: false, estimasi: 'Hari ini', status: 'Tersedia', foto: '', deskripsi: 'Fotokopi dokumen hitam putih dengan harga hemat, bisa dalam jumlah banyak.' },
  { id: 'scan', nama: 'Scan dokumen', lini: 'Printing Reguler', kategori: 'Dokumen', harga: 1000, satuan: 'lembar', tipe_hitung: 'lembar', harga_mulai: false, perlu_desain: false, estimasi: 'Hari ini', status: 'Tersedia', foto: '', deskripsi: 'Ubah dokumen kertas jadi file digital yang rapi dan mudah dikirim.' },
  { id: 'brosur', nama: 'Cetak brosur', lini: 'Printing Reguler', kategori: 'Promosi', harga: 1500, satuan: 'lembar', tipe_hitung: 'lembar', harga_mulai: true, perlu_desain: true, estimasi: '2 hari', status: 'Tersedia', foto: '', deskripsi: 'Brosur untuk promosi usaha, acara, atau organisasi. Harga akhir tergantung ukuran dan bahan.' },
  { id: 'poster-a3', nama: 'Cetak poster A3', lini: 'Printing Reguler', kategori: 'Promosi', harga: 15000, satuan: 'lembar', tipe_hitung: 'lembar', harga_mulai: false, perlu_desain: true, estimasi: '1 hari', status: 'Tersedia', foto: '', deskripsi: 'Poster ukuran A3 (29,7 × 42 cm) untuk pengumuman, acara, atau dekorasi.' },
  { id: 'kartu-nama', nama: 'Cetak kartu nama', lini: 'Printing Reguler', kategori: 'Kartu & Undangan', harga: 25000, satuan: '100 pcs', tipe_hitung: 'paket', harga_mulai: false, perlu_desain: true, estimasi: '2 hari', status: 'Tersedia', foto: '', deskripsi: 'Kartu nama kertas tebal. Satu paket berisi 100 lembar.' },
  { id: 'banner', nama: 'Cetak banner', lini: 'Printing Reguler', kategori: 'Promosi', harga: 25000, satuan: 'm²', tipe_hitung: 'luas', harga_mulai: false, perlu_desain: true, estimasi: '1 hari', status: 'Tersedia', foto: '', deskripsi: 'Banner untuk spanduk usaha atau acara. Harga dihitung per meter persegi (panjang × lebar).' },
  { id: 'undangan', nama: 'Cetak undangan', lini: 'Printing Reguler', kategori: 'Kartu & Undangan', harga: 2000, satuan: 'pcs', tipe_hitung: 'pcs', harga_mulai: true, perlu_desain: true, estimasi: '3 hari', status: 'Tersedia', foto: '', deskripsi: 'Undangan pernikahan, ulang tahun, atau acara kantor. Harga akhir tergantung kertas dan ukuran.' },
  // ----- Custom Merchandise -----
  { id: 'tumbler', nama: 'Custom Tumbler', lini: 'Custom Merchandise', kategori: 'Merchandise', harga: 55000, satuan: 'pcs', tipe_hitung: 'pcs', harga_mulai: false, perlu_desain: true, estimasi: '4 hari', status: 'Tersedia', foto: '', deskripsi: 'Tumbler dengan desainmu sendiri, cocok untuk hadiah atau seragam komunitas.' },
  { id: 'mug', nama: 'Custom Mug', lini: 'Custom Merchandise', kategori: 'Merchandise', harga: 25000, satuan: 'pcs', tipe_hitung: 'pcs', harga_mulai: false, perlu_desain: true, estimasi: '3 hari', status: 'Tersedia', foto: '', deskripsi: 'Mug keramik dengan foto atau desain pilihanmu.' },
  { id: 'gantungan-kunci', nama: 'Custom Gantungan Kunci', lini: 'Custom Merchandise', kategori: 'Merchandise', harga: 10000, satuan: 'pcs', tipe_hitung: 'pcs', harga_mulai: false, perlu_desain: true, estimasi: '3 hari', status: 'Tersedia', foto: '', deskripsi: 'Gantungan kunci mungil untuk suvenir acara atau merchandise usaha.' },
  { id: 'tote-bag', nama: 'Custom Tote Bag', lini: 'Custom Merchandise', kategori: 'Merchandise', harga: 35000, satuan: 'pcs', tipe_hitung: 'pcs', harga_mulai: false, perlu_desain: true, estimasi: '5 hari', status: 'Terbatas', foto: '', deskripsi: 'Tas kain dengan sablon desainmu. Bahan sedang terbatas, hubungi admin untuk jumlah besar.' },
];

const LINI = ['Printing Reguler', 'Custom Merchandise'];

const KELAS_STATUS = { Tersedia: 'status-tersedia', Terbatas: 'status-terbatas', Habis: 'status-habis' };
const KELAS_VISUAL = {
  Dokumen: 'visual-dokumen', Promosi: 'visual-banner', 'Kartu & Undangan': 'visual-kartu', Merchandise: 'visual-stiker',
};

let liniAktif = 'Semua';
let kategoriAktif = 'Semua';

// Teks harga: "Rp25.000 per m²" atau "Mulai Rp1.500 per lembar"
function teksHarga(p) {
  return `${p.harga_mulai ? 'Mulai ' : ''}${rupiah.format(p.harga)}`;
}

function buatKartuProduk(p) {
  const li = document.createElement('li');
  li.className = 'kartu kartu-katalog';

  // Foto produk. Jika belum ada foto, pakai gambar pengganti berpola dari CSS.
  let visual;
  if (p.foto) {
    visual = document.createElement('img');
    // Foto unggahan admin disimpan di server PHP; foto bawaan (img/) ada di situs
    visual.src = p.foto.startsWith('uploads/') ? CONFIG.urlDasarServer + p.foto : p.foto;
    visual.alt = p.nama;
    visual.loading = 'lazy';
    visual.className = 'foto-produk';
  } else {
    visual = document.createElement('div');
    visual.className = `visual-produk ${KELAS_VISUAL[p.kategori] || ''}`;
    visual.setAttribute('role', 'img');
    visual.setAttribute('aria-label', `Ilustrasi ${p.nama}, foto menyusul`);
    const kat = document.createElement('span');
    kat.textContent = p.kategori;
    visual.append(kat);
  }

  const isi = document.createElement('div');
  isi.className = 'katalog-isi';

  const status = document.createElement('span');
  status.className = `lencana-status ${KELAS_STATUS[p.status] || ''}`;
  status.textContent = p.status === 'Tersedia' ? 'Tersedia' : `Bahan ${p.status.toLowerCase()}`;

  const judul = document.createElement('h3');
  judul.textContent = p.nama;

  const deskripsi = document.createElement('p');
  deskripsi.className = 'katalog-deskripsi';
  deskripsi.textContent = p.deskripsi;

  const harga = document.createElement('p');
  harga.className = 'katalog-harga';
  const angka = document.createElement('strong');
  angka.textContent = teksHarga(p);
  const satuan = document.createElement('span');
  satuan.textContent = ` per ${p.satuan}`;
  harga.append(angka, satuan);

  const info = document.createElement('p');
  info.className = 'katalog-estimasi';
  info.textContent = `Estimasi selesai: ${p.estimasi}${p.perlu_desain ? ' · Perlu file desain' : ''}`;

  const tombol = document.createElement('button');
  tombol.type = 'button';
  tombol.className = 'btn btn-utama';
  tombol.textContent = p.status === 'Habis' ? 'Bahan habis' : 'Hitung harga';
  if (p.status === 'Habis') {
    tombol.disabled = true;
    tombol.setAttribute('aria-disabled', 'true');
  } else {
    tombol.setAttribute('aria-label', `Hitung harga ${p.nama}`);
    tombol.addEventListener('click', () => {
      if (typeof pilihProdukDiKalkulator === 'function') pilihProdukDiKalkulator(p.id);
    });
  }

  // Tombol cepat ke keranjang (produk banner perlu ukuran, jadi diarahkan ke kalkulator)
  const aksi = document.createElement('div');
  aksi.className = 'katalog-aksi';
  aksi.append(tombol);
  if (p.status !== 'Habis') aksi.append(buatTombolKeranjang(p));

  isi.append(status, judul, deskripsi, harga, info, aksi);
  li.append(visual, isi);
  return li;
}

// Ikon tombol keranjang (SVG statis): keranjang, dan centang saat berhasil
const IKON_KERANJANG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.5L21.5 7H6"/></svg>';
const IKON_CENTANG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Tombol "Keranjang" di kartu produk: tambah 1 (lembar/paket/pcs) ke database
function buatTombolKeranjang(p) {
  const tombol = document.createElement('button');
  tombol.type = 'button';
  tombol.className = 'btn btn-garis btn-keranjang-ikon';
  tombol.innerHTML = IKON_KERANJANG;
  tombol.setAttribute('aria-label', `Tambah ${p.nama} ke keranjang`);
  tombol.title = 'Tambah ke keranjang';

  tombol.addEventListener('click', async () => {
    // Banner dihitung dari ukuran, jadi isi ukuran dulu di kalkulator
    if (p.tipe_hitung === 'luas') {
      if (typeof pilihProdukDiKalkulator === 'function') pilihProdukDiKalkulator(p.id);
      tampilToast({ pesan: 'Isi ukuran banner dulu, lalu klik "Tambah ke keranjang".', jenis: 'info' });
      return;
    }
    tombol.disabled = true;
    const hasil = await Keranjang.tambah({
      produkId: p.id,
      spesifikasi: p.tipe_hitung === 'paket' ? '100 pcs (1 paket)' : '',
      jumlah: 1,
      harga: p.harga,
    });
    kabarKeranjang(hasil, p.nama);
    tombol.innerHTML = hasil.ok ? IKON_CENTANG : IKON_KERANJANG;
    tombol.classList.toggle('berhasil', hasil.ok);
    setTimeout(() => {
      tombol.disabled = false;
      tombol.innerHTML = IKON_KERANJANG;
      tombol.classList.remove('berhasil');
    }, hasil.ok ? 1800 : 0);
  });
  return tombol;
}

function tampilkanKatalog() {
  const terpilih = PRODUK.filter((p) => (liniAktif === 'Semua' || p.lini === liniAktif)
    && (kategoriAktif === 'Semua' || p.kategori === kategoriAktif));
  document.getElementById('katalog').replaceChildren(...terpilih.map(buatKartuProduk));

  const bagian = [liniAktif !== 'Semua' ? liniAktif : '', kategoriAktif !== 'Semua' ? `kategori ${kategoriAktif}` : ''].filter(Boolean).join(', ');
  document.getElementById('info-katalog').textContent = terpilih.length
    ? `Menampilkan ${terpilih.length} produk${bagian ? ` (${bagian})` : ''}. Semua harga adalah harga simulasi.`
    : 'Belum ada produk di pilihan ini.';
}

// Tombol filter dengan satu pilihan aktif (aria-pressed)
function buatTombolFilter(kotak, daftar, aktif, saatPilih) {
  kotak.replaceChildren(...daftar.map((nama) => {
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'chip-filter';
    tombol.textContent = nama;
    tombol.setAttribute('aria-pressed', String(nama === aktif));
    tombol.addEventListener('click', () => saatPilih(nama));
    return tombol;
  }));
}

// Kategori yang tersedia mengikuti lini yang dipilih
function buatFilter() {
  const kotakLini = document.getElementById('filter-lini');
  const kotakKategori = document.getElementById('filter-kategori');

  const segarkan = () => {
    buatTombolFilter(kotakLini, ['Semua', ...LINI], liniAktif, (nama) => {
      liniAktif = nama;
      kategoriAktif = 'Semua';
      segarkan();
    });
    const kategori = [...new Set(PRODUK.filter((p) => liniAktif === 'Semua' || p.lini === liniAktif).map((p) => p.kategori))];
    buatTombolFilter(kotakKategori, ['Semua', ...kategori], kategoriAktif, (nama) => {
      kategoriAktif = nama;
      segarkan();
    });
    tampilkanKatalog();
  };
  segarkan();
}

// Ambil produk dari database (api/produk.php) dan timpa data contoh di atas.
// Bila API tidak aktif, katalog tetap memakai data contoh. Aman dipanggil berkali-kali.
let janjiProduk;
function muatProdukDariDb() {
  janjiProduk ??= (async () => {
    try {
      const res = await fetch(`${CONFIG.urlApiAkun}produk.php`);
      const data = await res.json();
      if (Array.isArray(data.produk) && data.produk.length) PRODUK.splice(0, PRODUK.length, ...data.produk);
    } catch { /* pakai data contoh */ }
  })();
  return janjiProduk;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('katalog')) return;
  await muatProdukDariDb();
  // Tautan dari Beranda: produk.html?lini=Custom%20Merchandise
  const dariUrl = new URLSearchParams(location.search).get('lini');
  if (LINI.includes(dariUrl)) liniAktif = dariUrl;
  buatFilter();
});
