<?php
// Kelola produk: daftar, simpan (tambah/ubah), hapus
require __DIR__ . '/guard.php';

wajibSuperadmin();
$b = bacaBody();
$aksi = $b['aksi'] ?? '';
$pdo = db();

// Hapus file foto hasil unggahan (hanya di uploads/produk/, aman dari path traversal)
function hapusFileFoto(string $foto): void {
  if (preg_match('#^uploads/produk/[a-f0-9]{16}\.webp$#', $foto)) {
    $file = __DIR__ . '/../../' . $foto;
    if (is_file($file)) @unlink($file);
  }
}

if ($aksi === 'daftar') {
  $daftar = $pdo->query('SELECT * FROM produk ORDER BY urutan, id')->fetchAll();
  foreach ($daftar as &$p) {
    $p['harga'] = (int)$p['harga'];
    $p['harga_mulai'] = (bool)$p['harga_mulai'];
    $p['perlu_desain'] = (bool)$p['perlu_desain'];
  }
  kirim(200, ['ok' => true, 'produk' => $daftar]);
}

if ($aksi === 'simpan') {
  $baru = !empty($b['baru']);
  $p = is_array($b['produk'] ?? null) ? $b['produk'] : [];
  $d = [
    'id' => trim((string)($p['id'] ?? '')),
    'nama' => trim((string)($p['nama'] ?? '')),
    'lini' => (string)($p['lini'] ?? ''),
    'kategori' => trim((string)($p['kategori'] ?? '')),
    'harga' => $p['harga'] ?? '',
    'satuan' => trim((string)($p['satuan'] ?? '')),
    'tipe_hitung' => (string)($p['tipe_hitung'] ?? ''),
    'harga_mulai' => !empty($p['harga_mulai']) ? 1 : 0,
    'perlu_desain' => !empty($p['perlu_desain']) ? 1 : 0,
    'estimasi' => trim((string)($p['estimasi'] ?? '')),
    'status' => (string)($p['status'] ?? ''),
    'foto' => trim((string)($p['foto'] ?? '')),
    'deskripsi' => trim((string)($p['deskripsi'] ?? '')),
  ];

  $galat = [];
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $d['id'])) $galat['id'] = 'Kode produk hanya huruf kecil, angka, dan tanda hubung (2–40 karakter).';
  if ($d['nama'] === '' || mb_strlen($d['nama']) > 100) $galat['nama'] = 'Nama produk wajib diisi (maks. 100 huruf).';
  if (!in_array($d['lini'], ['Printing Reguler', 'Custom Merchandise'], true)) $galat['lini'] = 'Pilih lini produk.';
  if ($d['kategori'] === '' || mb_strlen($d['kategori']) > 40) $galat['kategori'] = 'Kategori wajib diisi (maks. 40 huruf).';
  if (!is_numeric($d['harga']) || $d['harga'] < 0 || $d['harga'] > 100000000) $galat['harga'] = 'Harga harus angka rupiah, 0 sampai 100.000.000.';
  if ($d['satuan'] === '' || mb_strlen($d['satuan']) > 20) $galat['satuan'] = 'Satuan wajib diisi (maks. 20 huruf).';
  if (!in_array($d['tipe_hitung'], ['lembar', 'paket', 'luas', 'pcs'], true)) $galat['tipe_hitung'] = 'Pilih tipe hitung.';
  if ($d['estimasi'] === '' || mb_strlen($d['estimasi']) > 30) $galat['estimasi'] = 'Estimasi selesai wajib diisi (maks. 30 huruf).';
  if (!in_array($d['status'], ['Tersedia', 'Terbatas', 'Habis'], true)) $galat['status'] = 'Pilih status ketersediaan.';
  if ($d['foto'] !== '' && !preg_match('#^(uploads/produk/[a-f0-9]{16}\.webp|img/[\w./-]{1,200})$#', $d['foto'])) $galat['foto'] = 'Foto tidak valid. Unggah ulang fotonya.';
  if (mb_strlen($d['deskripsi']) > 500) $galat['deskripsi'] = 'Deskripsi maks. 500 huruf.';
  if ($galat) kirim(422, ['ok' => false, 'pesan' => 'Data produk belum benar.', 'galat' => $galat]);
  $d['harga'] = (int)$d['harga'];

  if ($baru) {
    $ada = $pdo->prepare('SELECT 1 FROM produk WHERE id = ?');
    $ada->execute([$d['id']]);
    if ($ada->fetchColumn()) {
      kirim(409, ['ok' => false, 'pesan' => 'Kode produk sudah dipakai.', 'galat' => ['id' => 'Kode ini sudah dipakai produk lain.']]);
    }
    $d['urutan'] = (int)$pdo->query('SELECT COALESCE(MAX(urutan), 0) + 1 FROM produk')->fetchColumn();
    $kolom = array_keys($d);
    $tanya = implode(',', array_fill(0, count($kolom), '?'));
    $pdo->prepare('INSERT INTO produk (' . implode(',', $kolom) . ") VALUES ($tanya)")->execute(array_values($d));
  } else {
    $id = $d['id'];
    // Foto lama dihapus dari server bila diganti atau dibuang
    $lama = $pdo->prepare('SELECT foto FROM produk WHERE id = ?');
    $lama->execute([$id]);
    $fotoLama = (string)$lama->fetchColumn();
    if ($fotoLama !== '' && $fotoLama !== $d['foto']) hapusFileFoto($fotoLama);
    unset($d['id']);
    $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($d)));
    $pdo->prepare("UPDATE produk SET $set WHERE id = ?")->execute([...array_values($d), $id]);
  }
  kirim(200, ['ok' => true, 'pesan' => $baru ? 'Produk ditambahkan.' : 'Produk diperbarui.']);
}

if ($aksi === 'hapus') {
  $id = (string)($b['id'] ?? '');
  $lama = $pdo->prepare('SELECT foto FROM produk WHERE id = ?');
  $lama->execute([$id]);
  hapusFileFoto((string)$lama->fetchColumn());
  $pdo->prepare('DELETE FROM produk WHERE id = ?')->execute([$id]);
  kirim(200, ['ok' => true, 'pesan' => 'Produk dihapus.']);
}

kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
