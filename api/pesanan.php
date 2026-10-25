<?php
// API pesanan untuk pelanggan.
// Body JSON: { aksi: buat | daftar | detail | bayar | batal | cek, ... }
// 'cek' boleh tanpa login (hanya status, tanpa data pribadi); aksi lain wajib masuk.
require __DIR__ . '/koneksi.php';

$b = bacaBody();
$aksi = (string)($b['aksi'] ?? '');
$pdo = db();

// Susun item dan riwayat untuk satu pesanan
function itemPesanan(PDO $pdo, int $pesananId): array {
  $q = $pdo->prepare('SELECT nama_produk AS nama, spesifikasi, jumlah, harga_satuan AS harga, file_desain AS file FROM pesanan_item WHERE pesanan_id = ? ORDER BY id');
  $q->execute([$pesananId]);
  return array_map(fn($r) => [
    'nama' => $r['nama'], 'spesifikasi' => $r['spesifikasi'],
    'jumlah' => (int)$r['jumlah'], 'harga' => (float)$r['harga'], 'file' => $r['file'],
  ], $q->fetchAll());
}

function riwayatPesanan(PDO $pdo, int $pesananId): array {
  $q = $pdo->prepare('SELECT status, keterangan, dibuat FROM pesanan_riwayat WHERE pesanan_id = ? ORDER BY id');
  $q->execute([$pesananId]);
  return $q->fetchAll();
}

function catatRiwayat(PDO $pdo, int $pesananId, string $status, string $keterangan): void {
  $pdo->prepare('INSERT INTO pesanan_riwayat (pesanan_id, status, keterangan) VALUES (?, ?, ?)')
      ->execute([$pesananId, $status, $keterangan]);
}

// Ambil satu pesanan milik pengguna yang sedang masuk
function pesananSaya(PDO $pdo, string $kode, int $uid): array {
  $q = $pdo->prepare('SELECT * FROM pesanan WHERE kode = ? AND user_id = ?');
  $q->execute([$kode, $uid]);
  $p = $q->fetch();
  if (!$p) kirim(404, ['ok' => false, 'pesan' => 'Pesanan tidak ditemukan.']);
  return $p;
}

// ----- Cek status publik: tanpa nama, WhatsApp, atau alamat -----
if ($aksi === 'cek') {
  $kode = strtoupper(trim((string)($b['kode'] ?? '')));
  $q = $pdo->prepare('SELECT id, kode, status, dibuat FROM pesanan WHERE kode = ?');
  $q->execute([$kode]);
  $p = $q->fetch();
  if (!$p) kirim(404, ['ok' => false, 'pesan' => 'Kode pesanan tidak ditemukan. Cek lagi penulisannya, contoh: PRT-0001.']);
  kirim(200, [
    'ok' => true,
    'pesanan' => [
      'kode' => $p['kode'], 'status' => $p['status'], 'dibuat' => $p['dibuat'],
      'item' => array_map(fn($i) => ['nama' => $i['nama'], 'jumlah' => $i['jumlah']], itemPesanan($pdo, (int)$p['id'])),
      'riwayat' => riwayatPesanan($pdo, (int)$p['id']),
    ],
  ]);
}

if (empty($_SESSION['user_id'])) {
  kirim(401, ['ok' => false, 'perluMasuk' => true, 'pesan' => 'Masuk dulu untuk memesan dan melihat pesananmu.']);
}
$uid = (int)$_SESSION['user_id'];

try {
  if ($aksi === 'buat') {
    $nama = trim((string)($b['nama'] ?? ''));
    $wa = bersihkanNomor((string)($b['wa'] ?? ''));
    $email = trim((string)($b['email'] ?? ''));
    $ambil = ($b['ambil'] ?? 'ambil') === 'kirim' ? 'kirim' : 'ambil';
    $alamat = trim((string)($b['alamat'] ?? ''));
    $tanggal = trim((string)($b['tanggal'] ?? ''));
    $catatan = mb_substr(trim((string)($b['catatan'] ?? '')), 0, 500);

    // Validasi sisi server (pengaman kedua setelah validasi di browser)
    $galat = [];
    if (mb_strlen($nama) < 2 || mb_strlen($nama) > 100) $galat[] = 'Nama wajib diisi, minimal 2 huruf.';
    if (!preg_match('/^08\d{8,12}$/', $wa)) $galat[] = 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.';
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $galat[] = 'Format email belum benar.';
    if ($ambil === 'kirim' && mb_strlen($alamat) < 10) $galat[] = 'Alamat wajib diisi lengkap kalau pesanan dikirim.';
    if ($tanggal !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal) || $tanggal < date('Y-m-d'))) {
      $galat[] = 'Tanggal dibutuhkan tidak boleh sebelum hari ini.';
    }
    if (empty($b['setuju'])) $galat[] = 'Centang persetujuan Kebijakan Privasi dulu.';
    if ($galat) kirim(422, ['ok' => false, 'pesan' => $galat[0]]);

    // Ambil item: dari keranjang (yang diceklis) atau satu produk "pesan langsung"
    $item = [];
    $dariKeranjang = ($b['sumber'] ?? '') === 'keranjang';
    if ($dariKeranjang) {
      $q = $pdo->prepare(
        'SELECT k.id, k.produk_id, p.nama, p.status, p.perlu_desain, k.spesifikasi, k.jumlah, k.harga_satuan
         FROM keranjang k JOIN produk p ON p.id = k.produk_id
         WHERE k.user_id = ? AND k.dipilih = 1 ORDER BY k.id'
      );
      $q->execute([$uid]);
      $item = $q->fetchAll();
      $files = is_array($b['files'] ?? null) ? $b['files'] : [];
      foreach ($item as &$i) $i['file'] = trim((string)($files[$i['id']] ?? ''));
      unset($i);
    } else {
      $l = $b['item'] ?? [];
      $q = $pdo->prepare('SELECT id AS produk_id, nama, status, perlu_desain FROM produk WHERE id = ?');
      $q->execute([(string)($l['produkId'] ?? '')]);
      $p = $q->fetch();
      $jumlah = (int)($l['jumlah'] ?? 0);
      $harga = (float)($l['harga'] ?? 0);
      if ($p && $jumlah >= 1 && $jumlah <= 10000 && $harga > 0) {
        $item[] = $p + ['spesifikasi' => mb_substr(trim((string)($l['spesifikasi'] ?? '')), 0, 100), 'jumlah' => $jumlah, 'harga_satuan' => $harga, 'file' => trim((string)($l['file'] ?? ''))];
      }
    }
    if (!$item) kirim(422, ['ok' => false, 'pesan' => 'Belum ada produk yang dipesan. Pilih produk dulu.']);

    $total = 0;
    $fileUtama = '';
    foreach ($item as $i) {
      if ($i['status'] === 'Habis') kirim(422, ['ok' => false, 'pesan' => "{$i['nama']} sedang habis. Hapus dari pesanan dulu."]);
      if ($i['file'] !== '' && (!preg_match('#^https?://#i', $i['file']) || strlen($i['file']) > 255)) {
        kirim(422, ['ok' => false, 'pesan' => "Link file desain {$i['nama']} tidak valid."]);
      }
      if ($i['file'] === '') {
        kirim(422, ['ok' => false, 'pesan' => "File untuk {$i['nama']} wajib diunggah dulu."]);
      }
      $total += (int)round($i['harga_satuan'] * $i['jumlah']);
      if ($fileUtama === '') $fileUtama = $i['file'];
    }

    $pdo->beginTransaction();
    $pdo->prepare(
      'INSERT INTO pesanan (user_id, nama, whatsapp, email, pengambilan, alamat, tanggal_butuh, catatan, link_file, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$uid, $nama, $wa, $email ?: null, $ambil, $ambil === 'kirim' ? $alamat : '', $tanggal ?: null, $catatan, $fileUtama, $total]);
    $id = (int)$pdo->lastInsertId();
    $kode = sprintf('PRT-%04d', $id);
    $pdo->prepare('UPDATE pesanan SET kode = ? WHERE id = ?')->execute([$kode, $id]);

    $simpanItem = $pdo->prepare('INSERT INTO pesanan_item (pesanan_id, produk_id, nama_produk, spesifikasi, jumlah, harga_satuan, file_desain) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($item as $i) {
      $simpanItem->execute([$id, $i['produk_id'], $i['nama'], $i['spesifikasi'], $i['jumlah'], $i['harga_satuan'], $i['file']]);
    }
    catatRiwayat($pdo, $id, 'Antri', 'Pesanan diterima dan masuk antrean.');
    if ($dariKeranjang) $pdo->prepare('DELETE FROM keranjang WHERE user_id = ? AND dipilih = 1')->execute([$uid]);
    $pdo->commit();

    kirim(200, ['ok' => true, 'kode' => $kode, 'total' => $total]);
  }

  if ($aksi === 'daftar') {
    $q = $pdo->prepare(
      'SELECT p.id, p.kode, p.status, p.status_bayar, p.total, p.dibuat,
              (SELECT COUNT(*) FROM pesanan_item i WHERE i.pesanan_id = p.id) AS jumlah_item,
              (SELECT i.nama_produk FROM pesanan_item i WHERE i.pesanan_id = p.id ORDER BY i.id LIMIT 1) AS produk_pertama
       FROM pesanan p WHERE p.user_id = ? ORDER BY p.id DESC'
    );
    $q->execute([$uid]);
    $daftar = array_map(fn($r) => [
      'kode' => $r['kode'], 'status' => $r['status'], 'statusBayar' => $r['status_bayar'],
      'total' => (int)$r['total'], 'dibuat' => $r['dibuat'],
      'jumlahItem' => (int)$r['jumlah_item'], 'produkPertama' => $r['produk_pertama'],
    ], $q->fetchAll());
    kirim(200, ['ok' => true, 'pesanan' => $daftar]);
  }

  $kode = strtoupper(trim((string)($b['kode'] ?? '')));

  if ($aksi === 'detail') {
    $p = pesananSaya($pdo, $kode, $uid);
    kirim(200, ['ok' => true, 'pesanan' => [
      'kode' => $p['kode'], 'status' => $p['status'], 'statusBayar' => $p['status_bayar'],
      'total' => (int)$p['total'], 'dibuat' => $p['dibuat'], 'nama' => $p['nama'], 'whatsapp' => $p['whatsapp'],
      'pengambilan' => $p['pengambilan'], 'alamat' => $p['alamat'], 'tanggalButuh' => $p['tanggal_butuh'],
      'catatan' => $p['catatan'], 'linkFile' => $p['link_file'],
      'item' => itemPesanan($pdo, (int)$p['id']), 'riwayat' => riwayatPesanan($pdo, (int)$p['id']),
    ]]);
  }

  if ($aksi === 'bayar') {
    // Pembayaran QRIS hanya contoh/mockup: pelanggan menandai "sudah bayar", admin mengecek manual
    $p = pesananSaya($pdo, $kode, $uid);
    if ($p['status'] === 'Dibatalkan') kirim(422, ['ok' => false, 'pesan' => 'Pesanan ini sudah dibatalkan.']);
    if ($p['status_bayar'] !== 'Sudah bayar') {
      $pdo->prepare("UPDATE pesanan SET status_bayar = 'Sudah bayar' WHERE id = ?")->execute([$p['id']]);
      catatRiwayat($pdo, (int)$p['id'], $p['status'], 'Pelanggan menandai sudah membayar (contoh).');
      sinkronKeuangan($pdo, (int)$p['id']);
    }
    kirim(200, ['ok' => true, 'pesan' => 'Terima kasih! Pembayaranmu dicatat.']);
  }

  if ($aksi === 'batal') {
    $p = pesananSaya($pdo, $kode, $uid);
    if ($p['status'] !== 'Antri') {
      kirim(422, ['ok' => false, 'pesan' => 'Pesanan yang sudah dikerjakan tidak bisa dibatalkan. Hubungi admin lewat WhatsApp.']);
    }
    $pdo->prepare("UPDATE pesanan SET status = 'Dibatalkan' WHERE id = ?")->execute([$p['id']]);
    catatRiwayat($pdo, (int)$p['id'], 'Dibatalkan', 'Pesanan dibatalkan oleh pelanggan.');
    sinkronKeuangan($pdo, (int)$p['id']);
    kirim(200, ['ok' => true, 'pesan' => 'Pesanan dibatalkan.']);
  }

  kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  kirim(500, ['ok' => false, 'pesan' => 'Pesanan belum bisa diproses. Pastikan tabel pesanan sudah dibuat (database/println.sql).']);
}
