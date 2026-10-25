-- Database Println (MySQL/MariaDB, untuk Laragon)
-- Jalankan lewat HeidiSQL/phpMyAdmin, atau: mysql -u root < database/println.sql

CREATE DATABASE IF NOT EXISTS println
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE println;

-- Tabel pengguna (pelanggan)
CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama           VARCHAR(100) NOT NULL,
  whatsapp       VARCHAR(15)  NOT NULL,           -- format 08xxxxxxxxxx
  email          VARCHAR(150) NULL,               -- opsional
  password       VARCHAR(255) NOT NULL,           -- SEMENTARA teks biasa; panjang 255 muat untuk hash nanti
  setuju_privasi TINYINT(1)   NOT NULL DEFAULT 0, -- 1 = sudah centang Kebijakan Privasi
  dibuat         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  role           VARCHAR(20)  NOT NULL DEFAULT 'pelanggan', -- semua pendaftar baru = pelanggan
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_whatsapp (whatsapp),
  UNIQUE KEY uq_users_email (email)               -- NULL boleh berulang, email terisi harus unik
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data contoh (FIKTIF), hapus sebelum go-live
INSERT INTO users (nama, whatsapp, email, password, setuju_privasi) VALUES
  ('Contoh Pelanggan', '081200000000', 'contoh@contoh.id', 'sandi12345', 1);

-- Tabel produk (katalog). Dikelola superadmin lewat dashboard; harga = harga simulasi
CREATE TABLE IF NOT EXISTS produk (
  id           VARCHAR(40)  NOT NULL,                 -- slug, mis. 'banner'
  nama         VARCHAR(100) NOT NULL,
  lini         VARCHAR(30)  NOT NULL,                 -- Printing Reguler / Custom Merchandise
  kategori     VARCHAR(40)  NOT NULL,
  harga        INT UNSIGNED NOT NULL,
  satuan       VARCHAR(20)  NOT NULL,
  tipe_hitung  VARCHAR(10)  NOT NULL,                 -- lembar / paket / luas / pcs
  harga_mulai  TINYINT(1)   NOT NULL DEFAULT 0,
  perlu_desain TINYINT(1)   NOT NULL DEFAULT 0,
  estimasi     VARCHAR(30)  NOT NULL,
  status       VARCHAR(10)  NOT NULL DEFAULT 'Tersedia', -- Tersedia / Terbatas / Habis
  foto         VARCHAR(255) NOT NULL DEFAULT '',
  deskripsi    VARCHAR(500) NOT NULL DEFAULT '',
  urutan       INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO produk (id, nama, lini, kategori, harga, satuan, tipe_hitung, harga_mulai, perlu_desain, estimasi, status, foto, deskripsi, urutan) VALUES
  ('print-bw', 'Print hitam putih', 'Printing Reguler', 'Dokumen', 500, 'lembar', 'lembar', 0, 0, 'Hari ini', 'Tersedia', '', 'Print dokumen, makalah, atau skripsi dengan tinta hitam putih.', 1),
  ('print-warna', 'Print berwarna', 'Printing Reguler', 'Dokumen', 1500, 'lembar', 'lembar', 0, 0, 'Hari ini', 'Tersedia', '', 'Print dokumen berwarna, cocok untuk presentasi, laporan bergambar, atau materi belajar.', 2),
  ('fotokopi-bw', 'Fotokopi hitam putih', 'Printing Reguler', 'Dokumen', 300, 'lembar', 'lembar', 0, 0, 'Hari ini', 'Tersedia', '', 'Fotokopi dokumen hitam putih dengan harga hemat, bisa dalam jumlah banyak.', 3),
  ('scan', 'Scan dokumen', 'Printing Reguler', 'Dokumen', 1000, 'lembar', 'lembar', 0, 0, 'Hari ini', 'Tersedia', '', 'Ubah dokumen kertas jadi file digital yang rapi dan mudah dikirim.', 4),
  ('brosur', 'Cetak brosur', 'Printing Reguler', 'Promosi', 1500, 'lembar', 'lembar', 1, 1, '2 hari', 'Tersedia', '', 'Brosur untuk promosi usaha, acara, atau organisasi. Harga akhir tergantung ukuran dan bahan.', 5),
  ('poster-a3', 'Cetak poster A3', 'Printing Reguler', 'Promosi', 15000, 'lembar', 'lembar', 0, 1, '1 hari', 'Tersedia', '', 'Poster ukuran A3 (29,7 × 42 cm) untuk pengumuman, acara, atau dekorasi.', 6),
  ('kartu-nama', 'Cetak kartu nama', 'Printing Reguler', 'Kartu & Undangan', 25000, '100 pcs', 'paket', 0, 1, '2 hari', 'Tersedia', '', 'Kartu nama kertas tebal. Satu paket berisi 100 lembar.', 7),
  ('banner', 'Cetak banner', 'Printing Reguler', 'Promosi', 25000, 'm²', 'luas', 0, 1, '1 hari', 'Tersedia', '', 'Banner untuk spanduk usaha atau acara. Harga dihitung per meter persegi (panjang × lebar).', 8),
  ('undangan', 'Cetak undangan', 'Printing Reguler', 'Kartu & Undangan', 2000, 'pcs', 'pcs', 1, 1, '3 hari', 'Tersedia', '', 'Undangan pernikahan, ulang tahun, atau acara kantor. Harga akhir tergantung kertas dan ukuran.', 9),
  ('tumbler', 'Custom Tumbler', 'Custom Merchandise', 'Merchandise', 55000, 'pcs', 'pcs', 0, 1, '4 hari', 'Tersedia', '', 'Tumbler dengan desainmu sendiri, cocok untuk hadiah atau seragam komunitas.', 10),
  ('mug', 'Custom Mug', 'Custom Merchandise', 'Merchandise', 25000, 'pcs', 'pcs', 0, 1, '3 hari', 'Tersedia', '', 'Mug keramik dengan foto atau desain pilihanmu.', 11),
  ('gantungan-kunci', 'Custom Gantungan Kunci', 'Custom Merchandise', 'Merchandise', 10000, 'pcs', 'pcs', 0, 1, '3 hari', 'Tersedia', '', 'Gantungan kunci mungil untuk suvenir acara atau merchandise usaha.', 12),
  ('tote-bag', 'Custom Tote Bag', 'Custom Merchandise', 'Merchandise', 35000, 'pcs', 'pcs', 0, 1, '5 hari', 'Terbatas', '', 'Tas kain dengan sablon desainmu. Bahan sedang terbatas, hubungi admin untuk jumlah besar.', 13);

-- Tabel keuangan (pemasukan dan pengeluaran)
CREATE TABLE IF NOT EXISTS keuangan (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tanggal    DATE         NOT NULL,
  jenis      VARCHAR(12)  NOT NULL,                   -- pemasukan / pengeluaran
  kategori   VARCHAR(40)  NOT NULL,
  keterangan VARCHAR(200) NOT NULL DEFAULT '',
  jumlah     INT UNSIGNED NOT NULL,                   -- rupiah
  dibuat     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_keuangan_tanggal (tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data contoh (FIKTIF), hapus sebelum go-live
INSERT INTO keuangan (tanggal, jenis, kategori, keterangan, jumlah) VALUES
  (DATE_SUB(CURDATE(), INTERVAL 40 DAY), 'pemasukan',   'Printing Reguler',   '(contoh) Print dan fotokopi harian', 450000),
  (DATE_SUB(CURDATE(), INTERVAL 38 DAY), 'pengeluaran', 'Bahan baku',         '(contoh) Kertas dan tinta', 300000),
  (DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'pemasukan',   'Custom Merchandise', '(contoh) Pesanan 10 mug custom', 250000),
  (DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'pengeluaran', 'Operasional',        '(contoh) Listrik dan internet', 200000),
  (DATE_SUB(CURDATE(), INTERVAL 6 DAY),  'pemasukan',   'Printing Reguler',   '(contoh) Cetak banner dan kartu nama', 380000),
  (DATE_SUB(CURDATE(), INTERVAL 3 DAY),  'pengeluaran', 'Peralatan',          '(contoh) Perawatan mesin cetak', 150000);

-- Tabel keranjang. Satu baris = satu produk (dengan spesifikasi tertentu) milik satu pelanggan.
-- dipilih = 1 berarti item diceklis di halaman keranjang dan ikut ke proses pemesanan.
CREATE TABLE IF NOT EXISTS keranjang (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED  NOT NULL,
  produk_id    VARCHAR(40)   NOT NULL,
  spesifikasi  VARCHAR(100)  NOT NULL DEFAULT '',          -- mis. '2 × 1 m' untuk banner
  jumlah       INT UNSIGNED  NOT NULL DEFAULT 1,
  harga_satuan DECIMAL(12,2) NOT NULL,                     -- harga per 1 jumlah, hasil kalkulator (simulasi)
  dipilih      TINYINT(1)    NOT NULL DEFAULT 1,           -- 1 = diceklis
  dibuat       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diubah       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_keranjang_item (user_id, produk_id, spesifikasi), -- produk yang sama digabung, jumlah bertambah
  KEY idx_keranjang_user (user_id),
  CONSTRAINT fk_keranjang_user   FOREIGN KEY (user_id)   REFERENCES users (id)  ON DELETE CASCADE,
  CONSTRAINT fk_keranjang_produk FOREIGN KEY (produk_id) REFERENCES produk (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel pesanan (checkout). Satu baris = satu pesanan milik satu pelanggan.
-- status = tahap pengerjaan: Antri -> Dibuat -> Selesai (atau Dibatalkan).
-- status_bayar = Belum bayar / Sudah bayar (pembayaran QRIS hanya contoh/mockup).
CREATE TABLE IF NOT EXISTS pesanan (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kode          VARCHAR(12)  NULL,                          -- PRT-0001, diisi setelah baris dibuat
  user_id       INT UNSIGNED NOT NULL,
  nama          VARCHAR(100) NOT NULL,
  whatsapp      VARCHAR(15)  NOT NULL,
  email         VARCHAR(150) NULL,
  pengambilan   VARCHAR(10)  NOT NULL DEFAULT 'ambil',      -- ambil / kirim
  alamat        VARCHAR(300) NOT NULL DEFAULT '',           -- hanya jika dikirim
  tanggal_butuh DATE         NULL,
  catatan       VARCHAR(500) NOT NULL DEFAULT '',
  link_file     VARCHAR(255) NOT NULL DEFAULT '',           -- file desain/dokumen yang diunggah
  total         INT UNSIGNED NOT NULL,                      -- rupiah (perkiraan, dikonfirmasi admin)
  status        VARCHAR(12)  NOT NULL DEFAULT 'Antri',
  status_bayar  VARCHAR(12)  NOT NULL DEFAULT 'Belum bayar',
  dibuat        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diubah        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pesanan_kode (kode),
  KEY idx_pesanan_user (user_id),
  KEY idx_pesanan_status (status),
  CONSTRAINT fk_pesanan_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Isi pesanan. Nama dan harga disalin saat checkout agar tidak berubah bila produk diedit.
CREATE TABLE IF NOT EXISTS pesanan_item (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pesanan_id   INT UNSIGNED  NOT NULL,
  produk_id    VARCHAR(40)   NULL,
  nama_produk  VARCHAR(100)  NOT NULL,
  spesifikasi  VARCHAR(100)  NOT NULL DEFAULT '',
  jumlah       INT UNSIGNED  NOT NULL,
  harga_satuan DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_item_pesanan (pesanan_id),
  CONSTRAINT fk_item_pesanan FOREIGN KEY (pesanan_id) REFERENCES pesanan (id) ON DELETE CASCADE,
  CONSTRAINT fk_item_produk  FOREIGN KEY (produk_id)  REFERENCES produk (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Riwayat perubahan status (untuk garis waktu di halaman Pesanan Saya)
CREATE TABLE IF NOT EXISTS pesanan_riwayat (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pesanan_id INT UNSIGNED NOT NULL,
  status     VARCHAR(12)  NOT NULL,
  keterangan VARCHAR(200) NOT NULL DEFAULT '',
  dibuat     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_riwayat_pesanan (pesanan_id),
  CONSTRAINT fk_riwayat_pesanan FOREIGN KEY (pesanan_id) REFERENCES pesanan (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hubungkan pemasukan di keuangan dengan pesanan yang sudah dibayar (otomatis).
-- Jalankan sekali saja (kolom tidak bisa ditambah dua kali).
ALTER TABLE keuangan
  ADD COLUMN pesanan_id INT UNSIGNED NULL AFTER jumlah,
  ADD UNIQUE KEY uq_keuangan_pesanan (pesanan_id),
  ADD CONSTRAINT fk_keuangan_pesanan FOREIGN KEY (pesanan_id) REFERENCES pesanan (id) ON DELETE CASCADE;

-- File desain per produk dalam pesanan (satu pesanan bisa berisi beberapa desain berbeda).
ALTER TABLE pesanan_item
  ADD COLUMN file_desain VARCHAR(255) NOT NULL DEFAULT '' AFTER harga_satuan;
