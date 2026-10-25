<?php
// Daftar produk untuk katalog publik (GET). Isi dikelola superadmin lewat dashboard.
require __DIR__ . '/koneksi.php';

$daftar = db()->query('SELECT * FROM produk ORDER BY urutan, id')->fetchAll();
foreach ($daftar as &$p) {
  $p['harga'] = (int)$p['harga'];
  $p['harga_mulai'] = (bool)$p['harga_mulai'];
  $p['perlu_desain'] = (bool)$p['perlu_desain'];
  unset($p['urutan']);
}
kirim(200, ['produk' => $daftar]);
