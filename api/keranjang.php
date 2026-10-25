<?php
// API keranjang (tabel keranjang). Hanya untuk pelanggan yang sudah masuk.
// Body JSON: { aksi: ambil | tambah | jumlah | pilih | hapus | selesai, ... }
require __DIR__ . '/koneksi.php';

$b = bacaBody();
if (empty($_SESSION['user_id'])) {
  kirim(401, ['ok' => false, 'perluMasuk' => true, 'pesan' => 'Masuk dulu untuk memakai keranjang.']);
}
$uid = (int)$_SESSION['user_id'];
$pdo = db();
$aksi = (string)($b['aksi'] ?? '');
$id = (int)($b['id'] ?? 0);

// Daftar isi keranjang beserta info produk (perlu_desain, lini)
function isiKeranjang(PDO $pdo, int $uid): array {
  $q = $pdo->prepare(
    'SELECT k.id, k.produk_id AS produkId, p.nama, p.lini, k.spesifikasi, k.jumlah,
            k.harga_satuan AS harga, k.dipilih, p.perlu_desain AS perluDesain
     FROM keranjang k JOIN produk p ON p.id = k.produk_id
     WHERE k.user_id = ? ORDER BY k.id DESC'
  );
  $q->execute([$uid]);
  return array_map(function ($r) {
    return [
      'id' => (int)$r['id'], 'produkId' => $r['produkId'], 'nama' => $r['nama'], 'lini' => $r['lini'],
      'spesifikasi' => $r['spesifikasi'], 'jumlah' => (int)$r['jumlah'], 'harga' => (float)$r['harga'],
      'dipilih' => (bool)$r['dipilih'], 'perluDesain' => (bool)$r['perluDesain'],
    ];
  }, $q->fetchAll());
}

try {
  if ($aksi === 'tambah') {
    $produkId = (string)($b['produkId'] ?? '');
    $spek = mb_substr(trim((string)($b['spesifikasi'] ?? '')), 0, 100);
    $jumlah = (int)($b['jumlah'] ?? 0);
    $harga = (float)($b['harga'] ?? 0);
    if ($jumlah < 1 || $jumlah > 10000 || $harga <= 0) {
      kirim(422, ['ok' => false, 'pesan' => 'Jumlah atau harga tidak valid.']);
    }
    $ada = $pdo->prepare('SELECT status FROM produk WHERE id = ?');
    $ada->execute([$produkId]);
    $produk = $ada->fetch();
    if (!$produk) kirim(404, ['ok' => false, 'pesan' => 'Produk tidak ditemukan.']);
    if ($produk['status'] === 'Habis') kirim(422, ['ok' => false, 'pesan' => 'Produk ini sedang habis.']);

    // Produk + spesifikasi yang sama digabung; item yang ditambah otomatis diceklis
    $pdo->prepare(
      'INSERT INTO keranjang (user_id, produk_id, spesifikasi, jumlah, harga_satuan, dipilih)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE jumlah = LEAST(jumlah + VALUES(jumlah), 10000), harga_satuan = VALUES(harga_satuan), dipilih = 1'
    )->execute([$uid, $produkId, $spek, $jumlah, $harga]);
  } elseif ($aksi === 'jumlah') {
    $jumlah = max(1, min(10000, (int)($b['jumlah'] ?? 1)));
    $pdo->prepare('UPDATE keranjang SET jumlah = ? WHERE id = ? AND user_id = ?')->execute([$jumlah, $id, $uid]);
  } elseif ($aksi === 'pilih') {
    // id = 0 berarti semua item
    $nilai = empty($b['dipilih']) ? 0 : 1;
    if ($id > 0) {
      $pdo->prepare('UPDATE keranjang SET dipilih = ? WHERE id = ? AND user_id = ?')->execute([$nilai, $id, $uid]);
    } else {
      $pdo->prepare('UPDATE keranjang SET dipilih = ? WHERE user_id = ?')->execute([$nilai, $uid]);
    }
  } elseif ($aksi === 'hapus') {
    $pdo->prepare('DELETE FROM keranjang WHERE id = ? AND user_id = ?')->execute([$id, $uid]);
  } elseif ($aksi === 'selesai') {
    // Pesanan terkirim: hapus item yang diceklis
    $pdo->prepare('DELETE FROM keranjang WHERE user_id = ? AND dipilih = 1')->execute([$uid]);
  } elseif ($aksi !== 'ambil') {
    kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
  }
} catch (PDOException $e) {
  kirim(500, ['ok' => false, 'pesan' => 'Tabel keranjang belum ada. Jalankan SQL keranjang di database/println.sql.']);
}

kirim(200, ['ok' => true, 'item' => isiKeranjang($pdo, $uid)]);
