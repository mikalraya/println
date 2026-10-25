<?php
// Cek siapa yang sedang masuk (untuk tombol "Masuk" di navbar)
require __DIR__ . '/koneksi.php';

if (empty($_SESSION['user_id'])) kirim(200, ['masuk' => false]);

$cari = db()->prepare('SELECT nama, role, whatsapp, email FROM users WHERE id = ?');
$cari->execute([$_SESSION['user_id']]);
$user = $cari->fetch();
if (!$user) {
  session_destroy();
  kirim(200, ['masuk' => false]);
}
// Jumlah jenis produk di keranjang (untuk lencana navbar); 0 bila tabel belum dibuat
$jumlahKeranjang = 0;
try {
  $hitung = db()->prepare('SELECT COUNT(*) FROM keranjang WHERE user_id = ?');
  $hitung->execute([$_SESSION['user_id']]);
  $jumlahKeranjang = (int)$hitung->fetchColumn();
} catch (PDOException $e) {}
kirim(200, ['masuk' => true, 'nama' => $user['nama'], 'role' => $user['role'], 'keranjang' => $jumlahKeranjang,
  // untuk mengisi otomatis form pesanan
  'wa' => $user['whatsapp'], 'email' => $user['email'] ?? '']);
