<?php
// Masuk dengan nomor WhatsApp atau email + kata sandi
require __DIR__ . '/koneksi.php';

$b = bacaBody();
$id = trim((string)($b['id'] ?? ''));
$sandi = (string)($b['sandi'] ?? '');
if ($id === '' || $sandi === '') {
  kirim(422, ['ok' => false, 'pesan' => 'Isi nomor WhatsApp atau email dan kata sandi.']);
}

$pdo = db();
$cari = $pdo->prepare('SELECT id, nama, role, password FROM users WHERE whatsapp = ? OR email = ? LIMIT 1');
$cari->execute([bersihkanNomor($id), $id]);
$user = $cari->fetch();

// Hash biasa; teks biasa diterima sementara (data contoh lama) lalu dihash otomatis
$cocok = false;
if ($user) {
  if (password_verify($sandi, $user['password'])) {
    $cocok = true;
  } elseif (hash_equals($user['password'], $sandi)) {
    $cocok = true;
    $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')
        ->execute([password_hash($sandi, PASSWORD_DEFAULT), $user['id']]);
  }
}

// Pesan sama untuk akun tak ada dan sandi salah, agar akun orang tidak bisa ditebak
if (!$cocok) kirim(401, ['ok' => false, 'pesan' => 'Nomor/email atau kata sandi salah.']);

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
kirim(200, ['ok' => true, 'pesan' => 'Berhasil masuk.', 'nama' => $user['nama'], 'role' => $user['role']]);
