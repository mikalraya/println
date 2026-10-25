<?php
// Pengaman bersama: hanya akun berole superadmin yang boleh memakai API di folder ini.
// Role dicek ulang ke database di setiap permintaan (bukan dari data yang dikirim browser).
require __DIR__ . '/../koneksi.php';

function wajibSuperadmin(): array {
  if (empty($_SESSION['user_id'])) {
    kirim(401, ['ok' => false, 'pesan' => 'Kamu belum masuk. Silakan login dulu.']);
  }
  $cari = db()->prepare('SELECT id, nama, role FROM users WHERE id = ?');
  $cari->execute([$_SESSION['user_id']]);
  $user = $cari->fetch();
  if (!$user || $user['role'] !== 'superadmin') {
    kirim(403, ['ok' => false, 'pesan' => 'Halaman ini hanya untuk superadmin.']);
  }
  return $user;
}

// Samarkan nomor WA, mis. 0812••••89 (aturan CLAUDE.md bagian 11)
function samarkanNomor(string $wa): string {
  return strlen($wa) > 6 ? substr($wa, 0, 4) . '••••' . substr($wa, -2) : $wa;
}
