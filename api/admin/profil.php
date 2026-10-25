<?php
// Profil akun superadmin yang sedang masuk: ambil dan simpan (nama, WA, email, kata sandi)
require __DIR__ . '/guard.php';

$saya = wajibSuperadmin();
$b = bacaBody();
$aksi = $b['aksi'] ?? '';
$pdo = db();

if ($aksi === 'ambil') {
  $q = $pdo->prepare('SELECT nama, whatsapp, email, role, dibuat FROM users WHERE id = ?');
  $q->execute([$saya['id']]);
  kirim(200, ['ok' => true, 'profil' => $q->fetch()]);
}

if ($aksi === 'simpan') {
  $nama = trim((string)($b['nama'] ?? ''));
  $wa = bersihkanNomor((string)($b['wa'] ?? ''));
  $email = trim((string)($b['email'] ?? ''));
  $lama = (string)($b['sandi_lama'] ?? '');
  $baru = (string)($b['sandi_baru'] ?? '');

  $galat = [];
  if (mb_strlen($nama) < 2 || mb_strlen($nama) > 100) $galat['nama'] = 'Nama wajib diisi, minimal 2 huruf.';
  if (!preg_match('/^08\d{8,12}$/', $wa)) $galat['wa'] = 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.';
  if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150)) $galat['email'] = 'Format email belum benar.';
  if ($baru !== '' && strlen($baru) < 8) $galat['sandi_baru'] = 'Kata sandi baru minimal 8 karakter.';

  // Nomor/email tidak boleh sama dengan akun lain
  $dup = $pdo->prepare('SELECT whatsapp, email FROM users WHERE id <> ? AND (whatsapp = ? OR (? <> "" AND email = ?))');
  $dup->execute([$saya['id'], $wa, $email, $email]);
  foreach ($dup->fetchAll() as $r) {
    if ($r['whatsapp'] === $wa) $galat['wa'] = 'Nomor WhatsApp ini sudah dipakai akun lain.';
    if ($email !== '' && $r['email'] === $email) $galat['email'] = 'Email ini sudah dipakai akun lain.';
  }

  // Ganti kata sandi: wajib mengetik sandi lama
  if ($baru !== '' && !isset($galat['sandi_baru'])) {
    $q = $pdo->prepare('SELECT password FROM users WHERE id = ?');
    $q->execute([$saya['id']]);
    $hash = (string)$q->fetchColumn();
    if (!password_verify($lama, $hash) && !hash_equals($hash, $lama)) $galat['sandi_lama'] = 'Kata sandi lama salah.';
  }
  if ($galat) kirim(422, ['ok' => false, 'pesan' => 'Data belum benar.', 'galat' => $galat]);

  $pdo->prepare('UPDATE users SET nama = ?, whatsapp = ?, email = ? WHERE id = ?')
      ->execute([$nama, $wa, $email === '' ? null : $email, $saya['id']]);
  if ($baru !== '') {
    $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([password_hash($baru, PASSWORD_DEFAULT), $saya['id']]);
  }
  kirim(200, ['ok' => true, 'pesan' => 'Profil disimpan.', 'nama' => $nama]);
}

kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
