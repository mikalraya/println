/**
 * PrintIn — Google Apps Script (Web App) sebagai API, Google Sheets sebagai database.
 * Salinan kode ini hanya untuk dokumentasi; kode yang berjalan ada di editor Apps Script.
 *
 * SETUP (sekali saja):
 * 1. Buat Google Sheets baru. Beri dua tab: "produk" dan "pesanan" (judul kolom di bawah).
 * 2. Extensions > Apps Script, tempel seluruh file ini.
 * 3. Project Settings > Script Properties, tambahkan:
 *      PIN_ADMIN   = PIN dashboard admin (mis. 6 angka)
 *      EMAIL_ADMIN = email penerima notifikasi pesanan baru
 *      FOLDER_ID   = (opsional) ID folder Drive induk, mis. PrintIn/Pesanan. Desain pelanggan
 *                    disimpan di subfolder per hari ("Rabu, 28 Oktober 2026") yang dibuat otomatis
 * 4. Jalankan fungsi siapkanSheet() sekali untuk membuat judul kolom dan isi 13 produk awal.
 * 5. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 6. Salin URL web app ke js/config.js (urlApi).
 *
 * KEAMANAN: PIN hanya ada di Script Properties dan diperiksa di sini, tidak pernah di front-end.
 * Ini pengaman untuk demo, bukan keamanan tingkat produksi.
 *
 * Tab "produk": id, nama, lini, kategori, harga, satuan, tipe_hitung, harga_mulai, perlu_desain,
 *               estimasi, status, foto, deskripsi
 * Tab "pesanan": kode, tanggal, nama, whatsapp, lini, produk, spesifikasi, jumlah, total, link_file,
 *                tanggal_butuh, pengambilan, alamat, catatan, status, email
 */

const KOLOM_PRODUK = ['id', 'nama', 'lini', 'kategori', 'harga', 'satuan', 'tipe_hitung', 'harga_mulai', 'perlu_desain', 'estimasi', 'status', 'foto', 'deskripsi'];
const KOLOM_PESANAN = ['kode', 'tanggal', 'nama', 'whatsapp', 'lini', 'produk', 'spesifikasi', 'jumlah', 'total', 'link_file', 'tanggal_butuh', 'pengambilan', 'alamat', 'catatan', 'status', 'email'];
const STATUS_PESANAN = ['Diterima', 'Cek desain', 'Diproses', 'Siap diambil', 'Selesai'];
const LINI_PRODUK = ['Printing Reguler', 'Custom Merchandise'];
const TIPE_HITUNG = ['lembar', 'paket', 'luas', 'pcs'];
const STATUS_PRODUK = ['Tersedia', 'Terbatas', 'Habis'];
const JENIS_FILE = ['application/pdf', 'image/png', 'image/jpeg'];
const MAKS_BYTE = 10 * 1024 * 1024;
const MAKS_FOTO_BYTE = 5 * 1024 * 1024;

// ----- Pintu masuk -----

function doGet(e) {
  try {
    const aksi = (e.parameter.action || '').trim();
    if (aksi === 'produk') return balas({ ok: true, produk: ambilProduk() });
    if (aksi === 'status') return balas(cekStatus(e.parameter.kode));
    return balas({ ok: false, pesan: 'Aksi tidak dikenal.' });
  } catch (err) {
    return balas({ ok: false, pesan: 'Terjadi kesalahan di server. Coba lagi nanti.' });
  }
}

// Body berupa teks JSON (text/plain) supaya browser tidak mengirim preflight CORS
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'pesan') return balas(simpanPesanan(data));
    if (data.action === 'dashboard') return balas(dashboard(data));
    if (data.action === 'ubah_status') return balas(ubahStatus(data));
    if (data.action === 'produk_simpan') return balas(simpanProduk(data));
    if (data.action === 'produk_hapus') return balas(hapusProduk(data));
    if (data.action === 'pesanan_simpan') return balas(simpanPesananAdmin(data));
    if (data.action === 'pesanan_hapus') return balas(hapusPesanan(data));
    return balas({ ok: false, pesan: 'Aksi tidak dikenal.' });
  } catch (err) {
    return balas({ ok: false, pesan: 'Terjadi kesalahan di server. Coba lagi nanti.' });
  }
}

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ----- Helper sheet -----

function sheet(nama) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
}

// Ubah isi tab menjadi array objek berdasarkan baris judul
function bacaTabel(nama) {
  const nilai = sheet(nama).getDataRange().getValues();
  const judul = nilai.shift();
  return nilai.filter(function (b) { return b[0] !== ''; }).map(function (b) {
    const o = {};
    judul.forEach(function (j, i) { o[j] = b[i]; });
    return o;
  });
}

function props() {
  return PropertiesService.getScriptProperties();
}

function adaPin(pin) {
  const benar = props().getProperty('PIN_ADMIN');
  return Boolean(benar) && String(pin) === String(benar);
}

function bersihkan(teks, maks) {
  return String(teks === undefined || teks === null ? '' : teks).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, maks);
}

// Cegah teks di sel dibaca sebagai rumus Sheets
function amanSel(teks) {
  return /^[=+\-@]/.test(teks) ? "'" + teks : teks;
}

// ----- Produk -----

function ambilProduk() {
  return bacaTabel('produk').map(function (p) {
    p.harga = Number(p.harga);
    p.harga_mulai = String(p.harga_mulai).toUpperCase() === 'TRUE';
    p.perlu_desain = String(p.perlu_desain).toUpperCase() === 'TRUE';
    return p;
  });
}

// ----- Pesanan -----

function kodeBerikut() {
  const baris = sheet('pesanan').getLastRow(); // baris 1 = judul
  let angka = baris; // jumlah pesanan + 1
  const kodeAda = sheet('pesanan').getRange(2, 1, Math.max(baris - 1, 1), 1).getValues().map(function (b) { return String(b[0]); });
  while (kodeAda.indexOf('PRT-' + ('0000' + angka).slice(-4)) !== -1) angka++;
  return 'PRT-' + ('0000' + angka).slice(-4);
}

// Folder per hari di dalam folder induk (FOLDER_ID), mis. "Rabu, 28 Oktober 2026". Dibuat bila belum ada.
function folderHariIni() {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tz = 'Asia/Jakarta';
  const sekarang = new Date();
  const nama = hari[Number(Utilities.formatDate(sekarang, tz, 'u')) % 7] + ', '
    + Number(Utilities.formatDate(sekarang, tz, 'd')) + ' '
    + bulan[Number(Utilities.formatDate(sekarang, tz, 'M')) - 1] + ' '
    + Utilities.formatDate(sekarang, tz, 'yyyy');
  const idFolder = props().getProperty('FOLDER_ID');
  // Tanpa FOLDER_ID, pakai jalur Drive Saya/PrintIn/Pesanan (dibuat bila belum ada)
  const induk = idFolder ? DriveApp.getFolderById(idFolder)
    : cariAtauBuatFolder(cariAtauBuatFolder(DriveApp.getRootFolder(), 'PrintIn'), 'Pesanan');
  return cariAtauBuatFolder(induk, nama);
}

function cariAtauBuatFolder(induk, nama) {
  const ada = induk.getFoldersByName(nama);
  return ada.hasNext() ? ada.next() : induk.createFolder(nama);
}

function simpanFile(berkas, kode) {
  if (JENIS_FILE.indexOf(berkas.tipe) === -1) throw new Error('Format file harus PDF, PNG, atau JPG.');
  const bytes = Utilities.base64Decode(berkas.data);
  if (bytes.length > MAKS_BYTE) throw new Error('Ukuran file maksimal 10 MB.');
  const ekstensi = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' }[berkas.tipe];
  const blob = Utilities.newBlob(bytes, berkas.tipe, kode + '-desain.' + ekstensi);
  const berkasDrive = folderHariIni().createFile(blob);
  berkasDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return berkasDrive.getUrl();
}

// Hitung ulang total di server dengan aturan CLAUDE.md bagian 3 (jangan percaya angka dari browser)
function hitungTotal(p, d) {
  const jumlah = Math.floor(Number(d.jumlah));
  if (!(jumlah >= 1 && jumlah <= 10000)) throw new Error('Jumlah harus antara 1 dan 10.000.');
  let luas = 1;
  if (p.tipe_hitung === 'luas') {
    const panjang = Number(d.panjang);
    const lebar = Number(d.lebar);
    if (!(panjang >= 0.1 && panjang <= 20 && lebar >= 0.1 && lebar <= 20)) throw new Error('Ukuran banner harus antara 0,1 dan 20 meter.');
    luas = panjang * lebar;
  }
  return { jumlah: jumlah, total: Math.round(p.harga * luas * jumlah) };
}

function simpanPesanan(d) {
  const nama = bersihkan(d.nama, 80);
  const wa = bersihkan(d.wa, 20).replace(/[\s-]/g, '');
  const email = bersihkan(d.email, 100);
  const ambil = d.ambil === 'kirim' ? 'kirim' : 'ambil';
  const alamat = ambil === 'kirim' ? bersihkan(d.alamat, 300) : '';

  if (nama.length < 2) return { ok: false, pesan: 'Nama wajib diisi, minimal 2 huruf.' };
  if (!/^08\d{8,12}$/.test(wa)) return { ok: false, pesan: 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, pesan: 'Format email belum benar.' };
  if (ambil === 'kirim' && alamat.length < 10) return { ok: false, pesan: 'Alamat wajib diisi lengkap kalau pesanan dikirim.' };
  if (d.setuju !== true) return { ok: false, pesan: 'Centang persetujuan Kebijakan Privasi dulu.' };

  const produk = ambilProduk().filter(function (p) { return p.id === d.produkId; })[0];
  if (!produk) return { ok: false, pesan: 'Produk tidak ditemukan.' };
  if (produk.status === 'Habis') return { ok: false, pesan: 'Maaf, bahan produk ini sedang habis.' };

  let hitung;
  try { hitung = hitungTotal(produk, d); } catch (err) { return { ok: false, pesan: err.message }; }

  // Cegah dua pesanan mendapat kode yang sama saat dikirim bersamaan
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const kode = kodeBerikut();
    let linkFile = bersihkan(d.linkFile, 300);
    if (d.berkas && d.berkas.data) {
      try { linkFile = simpanFile(d.berkas, kode); } catch (err) { return { ok: false, pesan: err.message }; }
    }
    if (produk.perlu_desain && !linkFile) return { ok: false, pesan: 'Produk ini wajib menyertakan file desain atau link Google Drive.' };
    if (linkFile && !/^https:\/\//.test(linkFile)) return { ok: false, pesan: 'Link desain harus diawali https://' };

    const spesifikasi = produk.tipe_hitung === 'luas'
      ? Number(d.panjang) + ' x ' + Number(d.lebar) + ' m'
      : produk.tipe_hitung === 'paket' ? hitung.jumlah * 100 + ' pcs' : '';

    const baris = {
      kode: kode, tanggal: new Date(), nama: amanSel(nama), whatsapp: wa, lini: produk.lini, produk: produk.nama,
      spesifikasi: spesifikasi, jumlah: hitung.jumlah, total: hitung.total, link_file: linkFile,
      tanggal_butuh: bersihkan(d.tanggal, 10), pengambilan: ambil, alamat: amanSel(alamat),
      catatan: amanSel(bersihkan(d.catatan, 500)), status: 'Diterima', email: amanSel(email),
    };
    const lembar = sheet('pesanan');
    lembar.appendRow(KOLOM_PESANAN.map(function (k) { return baris[k]; }));
    // Tulis ulang no. WA sebagai teks supaya angka 0 di depan tidak hilang
    lembar.getRange(lembar.getLastRow(), KOLOM_PESANAN.indexOf('whatsapp') + 1).setNumberFormat('@').setValue(wa);
    kirimEmailAdmin(baris);
    return { ok: true, kode: kode, total: hitung.total };
  } finally {
    kunci.releaseLock();
  }
}

function kirimEmailAdmin(b) {
  const tujuan = props().getProperty('EMAIL_ADMIN');
  if (!tujuan) return;
  try {
    MailApp.sendEmail({
      to: tujuan,
      subject: 'Pesanan baru PrintIn ' + b.kode,
      body: 'Ada pesanan baru.\n\nKode: ' + b.kode + '\nProduk: ' + b.produk + ' (' + b.jumlah + ')\nTotal: Rp' + b.total
        + '\nNama: ' + b.nama + '\nWhatsApp: ' + String(b.whatsapp) + '\nFile desain: ' + (b.link_file || '-')
        + '\n\nBuka dashboard admin untuk melihat detailnya.',
    });
  } catch (err) { /* pesanan tetap tersimpan walau email gagal */ }
}

// Status publik: hanya kode, produk, status (tanpa nama, no. WA, alamat)
function cekStatus(kode) {
  const k = String(kode || '').trim().toUpperCase();
  if (!/^PRT-\d{4,}$/.test(k)) return { ok: false, pesan: 'Kode pesanan diawali PRT- lalu angka, contoh: PRT-0001.' };
  const p = bacaTabel('pesanan').filter(function (b) { return String(b.kode) === k; })[0];
  if (!p) return { ok: false, pesan: 'Kode pesanan tidak ditemukan. Periksa lagi kodenya.' };
  return { ok: true, pesanan: { kode: p.kode, produk: p.produk, status: p.status } };
}

// ----- Admin (PIN) -----

function samarkanNomor(wa) {
  let n = String(wa);
  if (n.charAt(0) !== '0') n = '0' + n; // pulihkan 0 di depan pada baris lama yang terlanjur jadi angka
  return n.length > 6 ? n.slice(0, 4) + '••••' + n.slice(-2) : n;
}

// Sel tanggal bisa terbaca sebagai Date oleh Sheets; ubah kembali ke teks yyyy-MM-dd
function teksTanggalButuh(nilai) {
  if (nilai instanceof Date) return Utilities.formatDate(nilai, 'Asia/Jakarta', 'yyyy-MM-dd');
  return String(nilai || '');
}

// Daftar pesanan untuk admin (terbaru di atas). No. WA disamarkan.
function daftarPesanan() {
  const katalog = ambilProduk();
  return bacaTabel('pesanan').map(function (p) {
    const cocok = katalog.filter(function (k) { return k.nama === p.produk; })[0];
    return {
      kode: p.kode, tanggal: Utilities.formatDate(new Date(p.tanggal), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm'),
      nama: p.nama, whatsapp: samarkanNomor(String(p.whatsapp)), lini: p.lini, produk: p.produk,
      produk_id: cocok ? cocok.id : '',
      spesifikasi: p.spesifikasi, jumlah: Number(p.jumlah), total: Number(p.total), link_file: p.link_file,
      tanggal_butuh: teksTanggalButuh(p.tanggal_butuh), alamat: p.alamat, catatan: p.catatan,
      pengambilan: p.pengambilan, status: p.status,
    };
  }).reverse();
}

function dashboard(d) {
  if (!adaPin(d.pin)) return { ok: false, pesan: 'PIN salah.' };
  const pesanan = daftarPesanan();

  const perProduk = {};
  const perLini = { 'Printing Reguler': 0, 'Custom Merchandise': 0 };
  let omzet = 0;
  pesanan.forEach(function (p) {
    perProduk[p.produk] = (perProduk[p.produk] || 0) + p.jumlah;
    perLini[p.lini] = (perLini[p.lini] || 0) + 1;
    omzet += p.total;
  });
  return {
    ok: true,
    ringkasan: {
      totalPesanan: pesanan.length,
      pesananBaru: pesanan.filter(function (p) { return p.status === 'Diterima'; }).length,
      selesai: pesanan.filter(function (p) { return p.status === 'Selesai'; }).length,
      omzet: omzet, perProduk: perProduk, perLini: perLini,
    },
    pesanan: pesanan,
    produk: ambilProduk(),
  };
}

// ----- Admin: kelola produk (CRUD) -----

// Periksa dan rapikan data produk dari dashboard. Mengembalikan { galat } atau { produk }.
function periksaProduk(d) {
  const p = {
    id: bersihkan(d.id, 40).toLowerCase(),
    nama: bersihkan(d.nama, 80),
    lini: bersihkan(d.lini, 30),
    kategori: bersihkan(d.kategori, 40),
    harga: Number(d.harga),
    satuan: bersihkan(d.satuan, 20),
    tipe_hitung: bersihkan(d.tipe_hitung, 10),
    harga_mulai: d.harga_mulai === true,
    perlu_desain: d.perlu_desain === true,
    estimasi: bersihkan(d.estimasi, 30),
    status: bersihkan(d.status, 10),
    foto: bersihkan(d.foto, 300),
    deskripsi: bersihkan(d.deskripsi, 300),
  };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) return { galat: 'ID hanya boleh huruf kecil, angka, dan tanda hubung, contoh: stiker-vinyl.' };
  if (p.nama.length < 2) return { galat: 'Nama produk wajib diisi, minimal 2 huruf.' };
  if (LINI_PRODUK.indexOf(p.lini) === -1) return { galat: 'Lini harus Printing Reguler atau Custom Merchandise.' };
  if (p.kategori.length < 2) return { galat: 'Kategori wajib diisi.' };
  if (!(Number.isInteger(p.harga) && p.harga >= 1 && p.harga <= 100000000)) return { galat: 'Harga harus angka bulat antara 1 dan 100.000.000.' };
  if (!p.satuan) return { galat: 'Satuan wajib diisi, contoh: lembar atau pcs.' };
  if (TIPE_HITUNG.indexOf(p.tipe_hitung) === -1) return { galat: 'Tipe hitung harus lembar, paket, luas, atau pcs.' };
  if (!p.estimasi) return { galat: 'Estimasi selesai wajib diisi, contoh: 2 hari.' };
  if (STATUS_PRODUK.indexOf(p.status) === -1) return { galat: 'Status harus Tersedia, Terbatas, atau Habis.' };
  if (p.foto && !/^img\/[a-z0-9_\/.-]+\.(webp|png|jpe?g|svg)$/i.test(p.foto) && !/^https:\/\/\S+$/.test(p.foto)) {
    return { galat: 'Foto harus path gambar di folder img/ (contoh: img/produk/mug.webp) atau link https://.' };
  }
  // Cegah teks di sel dibaca sebagai rumus
  ['nama', 'kategori', 'satuan', 'estimasi', 'deskripsi'].forEach(function (k) { p[k] = amanSel(p[k]); });
  return { produk: p };
}

// Simpan foto produk ke Drive Saya/PrintIn/Produk dan kembalikan link gambar yang bisa dipakai di <img>
function simpanFotoProduk(berkas, id) {
  const ekstensi = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[berkas.tipe];
  if (!ekstensi) throw new Error('Format foto harus WebP, PNG, atau JPG.');
  const bytes = Utilities.base64Decode(berkas.data);
  if (bytes.length > MAKS_FOTO_BYTE) throw new Error('Ukuran foto maksimal 5 MB.');
  const blob = Utilities.newBlob(bytes, berkas.tipe, id + '-' + Date.now() + '.' + ekstensi);
  const folder = cariAtauBuatFolder(cariAtauBuatFolder(DriveApp.getRootFolder(), 'PrintIn'), 'Produk');
  const berkasDrive = folder.createFile(blob);
  berkasDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + berkasDrive.getId() + '&sz=w1000';
}

// Cari nomor baris (mulai 1) produk berdasarkan id; 0 bila tidak ada
function barisProduk(nilai, id) {
  for (let i = 1; i < nilai.length; i++) {
    if (String(nilai[i][0]) === id) return i + 1;
  }
  return 0;
}

// Tambah (mode "tambah") atau ubah (mode "ubah") satu produk. ID tidak bisa diganti saat mengubah.
function simpanProduk(d) {
  if (!adaPin(d.pin)) return { ok: false, pesan: 'PIN salah.' };
  const cek = periksaProduk(d.produk || {});
  if (cek.galat) return { ok: false, pesan: cek.galat };
  const p = cek.produk;

  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const lembar = sheet('produk');
    const nilai = lembar.getDataRange().getValues();
    const judul = nilai[0];
    const baris = barisProduk(nilai, p.id);

    if (d.mode !== 'tambah' && d.mode !== 'ubah') return { ok: false, pesan: 'Mode simpan tidak dikenal.' };
    if (d.mode === 'tambah' && baris) return { ok: false, pesan: 'ID "' + p.id + '" sudah dipakai produk lain. Pakai ID yang berbeda.' };
    if (d.mode === 'ubah' && !baris) return { ok: false, pesan: 'Produk tidak ditemukan. Muat ulang data lalu coba lagi.' };

    // Foto yang diunggah menggantikan isian path/link foto
    const berkas = d.berkas && d.berkas.data ? d.berkas : null;
    if (berkas) {
      try { p.foto = simpanFotoProduk(berkas, p.id); } catch (err) { return { ok: false, pesan: err.message }; }
    }

    const isi = [judul.map(function (j) { return p[j] !== undefined ? p[j] : ''; })];
    if (d.mode === 'tambah') lembar.getRange(lembar.getLastRow() + 1, 1, 1, judul.length).setValues(isi);
    else lembar.getRange(baris, 1, 1, judul.length).setValues(isi);
  } finally {
    kunci.releaseLock();
  }
  return { ok: true, produk: ambilProduk() };
}

function hapusProduk(d) {
  if (!adaPin(d.pin)) return { ok: false, pesan: 'PIN salah.' };
  const id = bersihkan(d.id, 40);
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const lembar = sheet('produk');
    const baris = barisProduk(lembar.getDataRange().getValues(), id);
    if (!baris) return { ok: false, pesan: 'Produk tidak ditemukan. Muat ulang data lalu coba lagi.' };
    lembar.deleteRow(baris);
  } finally {
    kunci.releaseLock();
  }
  return { ok: true, produk: ambilProduk() };
}

function ubahStatus(d) {
  if (!adaPin(d.pin)) return { ok: false, pesan: 'PIN salah.' };
  if (STATUS_PESANAN.indexOf(d.status) === -1) return { ok: false, pesan: 'Status tidak dikenal.' };
  const lembar = sheet('pesanan');
  const nilai = lembar.getDataRange().getValues();
  const kolomStatus = nilai[0].indexOf('status') + 1;
  for (let i = 1; i < nilai.length; i++) {
    if (String(nilai[i][0]) === String(d.kode)) {
      lembar.getRange(i + 1, kolomStatus).setValue(d.status);
      return { ok: true };
    }
  }
  return { ok: false, pesan: 'Pesanan tidak ditemukan.' };
}

// ----- Admin: kelola pesanan (tambah/ubah/hapus) -----

// Periksa isian pesanan dari dashboard. mode "tambah": no. WA wajib; mode "ubah": no. WA kosong = tidak diganti.
function periksaPesanan(f, mode) {
  const p = {
    nama: bersihkan(f.nama, 80),
    wa: bersihkan(f.wa, 20).replace(/[\s-]/g, ''),
    produkId: bersihkan(f.produkId, 40),
    ambil: f.ambil === 'kirim' ? 'kirim' : 'ambil',
    alamat: bersihkan(f.alamat, 300),
    linkFile: bersihkan(f.linkFile, 300),
    tanggalButuh: bersihkan(f.tanggalButuh, 10),
    catatan: bersihkan(f.catatan, 500),
    status: bersihkan(f.status, 20),
    jumlah: f.jumlah, panjang: f.panjang, lebar: f.lebar,
    berkas: f.berkas && f.berkas.data ? f.berkas : null, // file desain yang diunggah admin (base64)
  };
  if (p.ambil === 'ambil') p.alamat = '';
  if (p.nama.length < 2) return { galat: 'Nama wajib diisi, minimal 2 huruf.' };
  if ((mode === 'tambah' || p.wa) && !/^08\d{8,12}$/.test(p.wa)) return { galat: 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.' };
  if (p.ambil === 'kirim' && p.alamat.length < 10) return { galat: 'Alamat wajib diisi lengkap kalau pesanan dikirim.' };
  if (p.linkFile && !/^https:\/\/\S+$/.test(p.linkFile)) return { galat: 'Link desain harus diawali https://' };
  if (p.tanggalButuh && !/^\d{4}-\d{2}-\d{2}$/.test(p.tanggalButuh)) return { galat: 'Format tanggal dibutuhkan belum benar.' };
  if (STATUS_PESANAN.indexOf(p.status) === -1) return { galat: 'Status tidak dikenal.' };
  return { pesanan: p };
}

function spesifikasiPesanan(produk, hitung, d) {
  if (produk.tipe_hitung === 'luas') return Number(d.panjang) + ' x ' + Number(d.lebar) + ' m';
  return produk.tipe_hitung === 'paket' ? hitung.jumlah * 100 + ' pcs' : '';
}

// Tambah pesanan manual (mis. pelanggan datang langsung atau pesan lewat WA)
function tambahPesananAdmin(p) {
  const produk = ambilProduk().filter(function (x) { return x.id === p.produkId; })[0];
  if (!produk) return { ok: false, pesan: 'Pilih produk dulu.' };
  let hitung;
  try { hitung = hitungTotal(produk, p); } catch (err) { return { ok: false, pesan: err.message }; }

  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const kode = kodeBerikut();
    if (p.berkas) {
      try { p.linkFile = simpanFile(p.berkas, kode); } catch (err) { return { ok: false, pesan: err.message }; }
    }
    const baris = {
      kode: kode, tanggal: new Date(), nama: amanSel(p.nama), whatsapp: p.wa, lini: produk.lini, produk: produk.nama,
      spesifikasi: spesifikasiPesanan(produk, hitung, p), jumlah: hitung.jumlah, total: hitung.total, link_file: p.linkFile,
      tanggal_butuh: p.tanggalButuh, pengambilan: p.ambil, alamat: amanSel(p.alamat),
      catatan: amanSel(p.catatan), status: p.status, email: '',
    };
    const lembar = sheet('pesanan');
    lembar.appendRow(KOLOM_PESANAN.map(function (k) { return baris[k]; }));
    lembar.getRange(lembar.getLastRow(), KOLOM_PESANAN.indexOf('whatsapp') + 1).setNumberFormat('@').setValue(p.wa);
    return { ok: true, kode: kode };
  } finally {
    kunci.releaseLock();
  }
}

// Ubah pesanan. Total dihitung ulang hanya bila produk, jumlah, atau ukuran berubah.
function ubahPesananAdmin(kode, p) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const lembar = sheet('pesanan');
    const nilai = lembar.getDataRange().getValues();
    const judul = nilai[0];
    let nomor = 0;
    for (let i = 1; i < nilai.length; i++) { if (String(nilai[i][0]) === kode) { nomor = i + 1; break; } }
    if (!nomor) return { ok: false, pesan: 'Pesanan tidak ditemukan. Muat ulang data lalu coba lagi.' };

    if (p.berkas) {
      try { p.linkFile = simpanFile(p.berkas, kode); } catch (err) { return { ok: false, pesan: err.message }; }
    }
    const lama = {};
    judul.forEach(function (j, i) { lama[j] = nilai[nomor - 1][i]; });
    const baru = {};
    Object.keys(lama).forEach(function (k) { baru[k] = lama[k]; });

    if (p.produkId) {
      const produk = ambilProduk().filter(function (x) { return x.id === p.produkId; })[0];
      if (!produk) return { ok: false, pesan: 'Produk tidak ditemukan.' };
      let hitung;
      try { hitung = hitungTotal(produk, p); } catch (err) { return { ok: false, pesan: err.message }; }
      const spek = spesifikasiPesanan(produk, hitung, p);
      const berubah = produk.nama !== lama.produk || hitung.jumlah !== Number(lama.jumlah) || spek !== String(lama.spesifikasi);
      baru.lini = produk.lini; baru.produk = produk.nama; baru.spesifikasi = spek; baru.jumlah = hitung.jumlah;
      if (berubah) baru.total = hitung.total;
    }
    baru.nama = amanSel(p.nama);
    baru.link_file = p.linkFile;
    baru.tanggal_butuh = p.tanggalButuh;
    baru.pengambilan = p.ambil;
    baru.alamat = amanSel(p.alamat);
    baru.catatan = amanSel(p.catatan);
    baru.status = p.status;

    lembar.getRange(nomor, 1, 1, judul.length).setValues([judul.map(function (j) { return baru[j]; })]);
    if (p.wa) lembar.getRange(nomor, judul.indexOf('whatsapp') + 1).setNumberFormat('@').setValue(p.wa);
    return { ok: true };
  } finally {
    kunci.releaseLock();
  }
}

// mode "tambah" atau "ubah" (butuh kode); PIN diperiksa di sini
function simpanPesananAdmin(d) {
  if (!adaPin(d.pin)) return { ok: false, pesan: 'PIN salah.' };
  if (d.mode !== 'tambah' && d.mode !== 'ubah') return { ok: false, pesan: 'Mode simpan tidak dikenal.' };
  const cek = periksaPesanan(d.pesanan || {}, d.mode);
  if (cek.galat) return { ok: false, pesan: cek.galat };
  const hasil = d.mode === 'tambah' ? tambahPesananAdmin(cek.pesanan) : ubahPesananAdmin(String(d.kode || ''), cek.pesanan);
  if (!hasil.ok) return hasil;
  hasil.pesanan = daftarPesanan();
  return hasil;
}

// Hapus baris pesanan. File desain di Google Drive tidak ikut dihapus.
function hapusPesanan(d) {
  if (!adaPin(d.pin)) return { ok: false, pesan: 'PIN salah.' };
  const kode = bersihkan(d.kode, 20);
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const lembar = sheet('pesanan');
    const nilai = lembar.getDataRange().getValues();
    for (let i = 1; i < nilai.length; i++) {
      if (String(nilai[i][0]) === kode) {
        lembar.deleteRow(i + 1);
        return { ok: true, pesanan: daftarPesanan() };
      }
    }
    return { ok: false, pesan: 'Pesanan tidak ditemukan. Muat ulang data lalu coba lagi.' };
  } finally {
    kunci.releaseLock();
  }
}

// ----- Persiapan awal (jalankan sekali dari editor) -----

function siapkanSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const produk = ss.getSheetByName('produk') || ss.insertSheet('produk');
  const pesanan = ss.getSheetByName('pesanan') || ss.insertSheet('pesanan');
  produk.clear().appendRow(KOLOM_PRODUK);
  pesanan.clear().appendRow(KOLOM_PESANAN);
  const P = 'Printing Reguler';
  const M = 'Custom Merchandise';
  const isi = [
    ['print-bw', 'Print hitam putih', P, 'Dokumen', 500, 'lembar', 'lembar', false, false, 'Hari ini', 'Tersedia', 'img/produk/print-bw.webp', 'Print dokumen, makalah, atau skripsi dengan tinta hitam putih.'],
    ['print-warna', 'Print berwarna', P, 'Dokumen', 1500, 'lembar', 'lembar', false, false, 'Hari ini', 'Tersedia', 'img/produk/print-warna.webp', 'Print dokumen berwarna, cocok untuk presentasi, laporan bergambar, atau materi belajar.'],
    ['fotokopi-bw', 'Fotokopi hitam putih', P, 'Dokumen', 300, 'lembar', 'lembar', false, false, 'Hari ini', 'Tersedia', 'img/produk/fotokopi-bw.webp', 'Fotokopi dokumen hitam putih dengan harga hemat, bisa dalam jumlah banyak.'],
    ['scan', 'Scan dokumen', P, 'Dokumen', 1000, 'lembar', 'lembar', false, false, 'Hari ini', 'Tersedia', 'img/produk/scan.webp', 'Ubah dokumen kertas jadi file digital yang rapi dan mudah dikirim.'],
    ['brosur', 'Cetak brosur', P, 'Promosi', 1500, 'lembar', 'lembar', true, true, '2 hari', 'Tersedia', 'img/produk/brosur.webp', 'Brosur untuk promosi usaha, acara, atau organisasi. Harga akhir tergantung ukuran dan bahan.'],
    ['poster-a3', 'Cetak poster A3', P, 'Promosi', 15000, 'lembar', 'lembar', false, true, '1 hari', 'Tersedia', 'img/produk/poster-a3.webp', 'Poster ukuran A3 (29,7 × 42 cm) untuk pengumuman, acara, atau dekorasi.'],
    ['kartu-nama', 'Cetak kartu nama', P, 'Kartu & Undangan', 25000, '100 pcs', 'paket', false, true, '2 hari', 'Tersedia', 'img/produk/kartu-nama.webp', 'Kartu nama kertas tebal. Satu paket berisi 100 lembar.'],
    ['banner', 'Cetak banner', P, 'Promosi', 25000, 'm²', 'luas', false, true, '1 hari', 'Tersedia', 'img/produk/banner.webp', 'Banner untuk spanduk usaha atau acara. Harga dihitung per meter persegi (panjang × lebar).'],
    ['undangan', 'Cetak undangan', P, 'Kartu & Undangan', 2000, 'pcs', 'pcs', true, true, '3 hari', 'Tersedia', 'img/produk/undangan.webp', 'Undangan pernikahan, ulang tahun, atau acara kantor. Harga akhir tergantung kertas dan ukuran.'],
    ['tumbler', 'Custom Tumbler', M, 'Merchandise', 55000, 'pcs', 'pcs', false, true, '4 hari', 'Tersedia', 'img/produk/tumbler.webp', 'Tumbler dengan desainmu sendiri, cocok untuk hadiah atau seragam komunitas.'],
    ['mug', 'Custom Mug', M, 'Merchandise', 25000, 'pcs', 'pcs', false, true, '3 hari', 'Tersedia', 'img/produk/mug.webp', 'Mug keramik dengan foto atau desain pilihanmu.'],
    ['gantungan-kunci', 'Custom Gantungan Kunci', M, 'Merchandise', 10000, 'pcs', 'pcs', false, true, '3 hari', 'Tersedia', 'img/produk/gantungan-kunci.webp', 'Gantungan kunci mungil untuk suvenir acara atau merchandise usaha.'],
    ['tote-bag', 'Custom Tote Bag', M, 'Merchandise', 35000, 'pcs', 'pcs', false, true, '5 hari', 'Terbatas', 'img/produk/tote-bag.webp', 'Tas kain dengan sablon desainmu. Bahan sedang terbatas, hubungi admin untuk jumlah besar.'],
  ];
  produk.getRange(2, 1, isi.length, KOLOM_PRODUK.length).setValues(isi);
  // Kolom whatsapp sebagai teks agar angka 0 di depan tidak hilang
  pesanan.getRange('D:D').setNumberFormat('@');
}
