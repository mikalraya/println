<?php
// Daftar akun baru -> simpan ke tabel users
require __DIR__ . '/koneksi.php';

$b = bacaBody();
$nama = trim((string)($b['nama'] ?? ''));
$wa = bersihkanNomor((string)($b['wa'] ?? ''));
$email = trim((string)($b['email'] ?? ''));
$sandi = (string)($b['sandi'] ?? '');
$setuju = !empty($b['setuju']);

// Validasi ulang di server (validasi browser bisa dilewati)
$galat = [];
if (mb_strlen($nama) < 2 || mb_strlen($nama) > 100) $galat['nama'] = 'Nama wajib diisi, minimal 2 huruf.';
if (!preg_match('/^08\d{8,12}$/', $wa)) $galat['wa'] = 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.';
if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150)) {
  $galat['email'] = 'Format email belum benar, contoh: nama@email.com.';
}
if (strlen($sandi) < 8) $galat['sandi'] = 'Kata sandi minimal 8 karakter.';
if (!$setuju) $galat['setuju'] = 'Centang persetujuan Kebijakan Privasi dulu.';
if ($galat) kirim(422, ['ok' => false, 'pesan' => 'Data belum lengkap.', 'galat' => $galat]);

$pdo = db();

// Cek duplikat agar pesan galat jelas
$cek = $pdo->prepare('SELECT whatsapp, email FROM users WHERE whatsapp = ? OR (? <> "" AND email = ?)');
$cek->execute([$wa, $email, $email]);
foreach ($cek->fetchAll() as $baris) {
  if ($baris['whatsapp'] === $wa) $galat['wa'] = 'Nomor WhatsApp ini sudah terdaftar. Coba masuk.';
  if ($email !== '' && $baris['email'] === $email) $galat['email'] = 'Email ini sudah terdaftar. Coba masuk.';
}
if ($galat) kirim(409, ['ok' => false, 'pesan' => 'Akun sudah ada.', 'galat' => $galat]);

$simpan = $pdo->prepare(
  "INSERT INTO users (nama, whatsapp, email, password, setuju_privasi, role) VALUES (?, ?, ?, ?, 1, 'pelanggan')"
);
$simpan->execute([$nama, $wa, $email === '' ? null : $email, password_hash($sandi, PASSWORD_DEFAULT)]);

// Langsung masuk setelah daftar
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$pdo->lastInsertId();
kirim(201, ['ok' => true, 'pesan' => 'Akun berhasil dibuat.', 'nama' => $nama]);
