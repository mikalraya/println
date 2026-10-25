<?php
// Kelola pengguna: daftar, detail, simpan (tambah/ubah), ubah role, hapus. Akun sendiri tidak bisa diubah/dihapus dari sini.
require __DIR__ . '/guard.php';

$saya = wajibSuperadmin();
$b = bacaBody();
$aksi = $b['aksi'] ?? '';
$pdo = db();
$id = (int)($b['id'] ?? 0);

if ($aksi === 'daftar') {
  $daftar = $pdo->query('SELECT id, nama, whatsapp, email, role, dibuat FROM users ORDER BY dibuat DESC, id DESC')->fetchAll();
  foreach ($daftar as &$u) {
    $u['id'] = (int)$u['id'];
    $u['whatsapp'] = samarkanNomor($u['whatsapp']);
    $u['saya'] = $u['id'] === (int)$saya['id'];
  }
  kirim(200, ['ok' => true, 'users' => $daftar]);
}

if ($aksi === 'detail') {
  $q = $pdo->prepare(
    "SELECT u.id, u.nama, u.whatsapp, u.email, u.role, u.dibuat, u.setuju_privasi,
            (SELECT COUNT(*) FROM pesanan p WHERE p.user_id = u.id) AS jumlah_pesanan,
            (SELECT COALESCE(SUM(p.total), 0) FROM pesanan p WHERE p.user_id = u.id AND p.status <> 'Dibatalkan') AS total_belanja
     FROM users u WHERE u.id = ?"
  );
  $q->execute([$id]);
  $u = $q->fetch();
  if (!$u) kirim(404, ['ok' => false, 'pesan' => 'Pengguna tidak ditemukan.']);
  $u['id'] = (int)$u['id'];
  $u['whatsapp'] = samarkanNomor($u['whatsapp']);
  $u['setuju_privasi'] = (bool)$u['setuju_privasi'];
  $u['jumlah_pesanan'] = (int)$u['jumlah_pesanan'];
  $u['total_belanja'] = (int)$u['total_belanja'];
  kirim(200, ['ok' => true, 'user' => $u]);
}

// Tambah (id 0) atau ubah pengguna. Nomor WA dan kata sandi kosong saat ubah = tidak diganti.
if ($aksi === 'simpan') {
  $u = is_array($b['user'] ?? null) ? $b['user'] : [];
  $uid = (int)($u['id'] ?? 0);
  $nama = trim((string)($u['nama'] ?? ''));
  $wa = bersihkanNomor((string)($u['wa'] ?? ''));
  $email = trim((string)($u['email'] ?? ''));
  $sandi = (string)($u['sandi'] ?? '');
  $role = (string)($u['role'] ?? 'pelanggan');

  if ($uid === (int)$saya['id']) {
    kirim(400, ['ok' => false, 'pesan' => 'Akunmu sendiri diubah lewat menu Profil.']);
  }
  $baru = $uid === 0;
  if (!$baru) {
    $ada = $pdo->prepare('SELECT COUNT(*) FROM users WHERE id = ?');
    $ada->execute([$uid]);
    if (!(int)$ada->fetchColumn()) kirim(404, ['ok' => false, 'pesan' => 'Pengguna tidak ditemukan.']);
  }

  $galat = [];
  if (mb_strlen($nama) < 2 || mb_strlen($nama) > 100) $galat['nama'] = 'Nama wajib diisi, minimal 2 huruf.';
  if (($baru || $wa !== '') && !preg_match('/^08\d{8,12}$/', $wa)) $galat['wa'] = 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.';
  if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150)) $galat['email'] = 'Format email belum benar, contoh: nama@email.com.';
  if (($baru || $sandi !== '') && strlen($sandi) < 8) $galat['sandi'] = 'Kata sandi minimal 8 karakter.';
  if (!in_array($role, ['pelanggan', 'superadmin'], true)) $galat['role'] = 'Pilih pelanggan atau superadmin.';

  // Cek duplikat (tidak menghitung dirinya sendiri)
  if (!isset($galat['wa']) && $wa !== '') {
    $d = $pdo->prepare('SELECT COUNT(*) FROM users WHERE whatsapp = ? AND id <> ?');
    $d->execute([$wa, $uid]);
    if ((int)$d->fetchColumn()) $galat['wa'] = 'Nomor WhatsApp ini sudah dipakai pengguna lain.';
  }
  if (!isset($galat['email']) && $email !== '') {
    $d = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = ? AND id <> ?');
    $d->execute([$email, $uid]);
    if ((int)$d->fetchColumn()) $galat['email'] = 'Email ini sudah dipakai pengguna lain.';
  }
  if ($galat) kirim(422, ['ok' => false, 'pesan' => 'Data belum benar.', 'galat' => $galat]);

  if ($baru) {
    $pdo->prepare('INSERT INTO users (nama, whatsapp, email, password, setuju_privasi, role) VALUES (?, ?, ?, ?, 1, ?)')
        ->execute([$nama, $wa, $email === '' ? null : $email, password_hash($sandi, PASSWORD_DEFAULT), $role]);
    kirim(200, ['ok' => true, 'pesan' => 'Pengguna ditambahkan.']);
  }
  $pdo->prepare('UPDATE users SET nama = ?, email = ?, role = ? WHERE id = ?')->execute([$nama, $email === '' ? null : $email, $role, $uid]);
  if ($wa !== '') $pdo->prepare('UPDATE users SET whatsapp = ? WHERE id = ?')->execute([$wa, $uid]);
  if ($sandi !== '') $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([password_hash($sandi, PASSWORD_DEFAULT), $uid]);
  kirim(200, ['ok' => true, 'pesan' => 'Data pengguna diperbarui.']);
}

if ($aksi === 'ubah_role' || $aksi === 'hapus') {
  if ($id === (int)$saya['id']) {
    kirim(400, ['ok' => false, 'pesan' => 'Akun yang sedang kamu pakai tidak bisa diubah atau dihapus dari sini.']);
  }
}

if ($aksi === 'ubah_role') {
  $role = (string)($b['role'] ?? '');
  if (!in_array($role, ['pelanggan', 'superadmin'], true)) kirim(422, ['ok' => false, 'pesan' => 'Role tidak dikenal.']);
  $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);
  kirim(200, ['ok' => true, 'pesan' => 'Role diperbarui.']);
}

if ($aksi === 'hapus') {
  $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
  kirim(200, ['ok' => true, 'pesan' => 'Pengguna dihapus.']);
}

kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
