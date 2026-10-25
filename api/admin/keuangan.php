<?php
// Kelola data keuangan: daftar (bisa per bulan), simpan (tambah/ubah), hapus
require __DIR__ . '/guard.php';

wajibSuperadmin();
$b = bacaBody();
$aksi = $b['aksi'] ?? '';
$pdo = db();

// Transaksi otomatis dari pesanan hanya berubah lewat menu Pesanan
function wajibManual(PDO $pdo, int $id): void {
  if ($id <= 0) return;
  $q = $pdo->prepare('SELECT COUNT(*) FROM keuangan WHERE id = ? AND pesanan_id IS NOT NULL');
  $q->execute([$id]);
  if ((int)$q->fetchColumn() > 0) {
    kirim(422, ['ok' => false, 'pesan' => 'Transaksi ini otomatis dari pesanan. Ubah lewat menu Pesanan (status bayar).']);
  }
}

if ($aksi === 'daftar') {
  $bulan = (string)($b['bulan'] ?? '');
  if ($bulan !== '' && preg_match('/^\d{4}-\d{2}$/', $bulan)) {
    $q = $pdo->prepare("SELECT * FROM keuangan WHERE DATE_FORMAT(tanggal,'%Y-%m') = ? ORDER BY tanggal DESC, id DESC");
    $q->execute([$bulan]);
  } else {
    $q = $pdo->query('SELECT * FROM keuangan ORDER BY tanggal DESC, id DESC LIMIT 500');
  }
  $baris = $q->fetchAll();
  $total = ['pemasukan' => 0, 'pengeluaran' => 0];
  foreach ($baris as &$r) {
    $r['id'] = (int)$r['id'];
    $r['jumlah'] = (int)$r['jumlah'];
    $total[$r['jenis']] += $r['jumlah'];
  }
  kirim(200, ['ok' => true, 'transaksi' => $baris, 'total' => $total + ['laba' => $total['pemasukan'] - $total['pengeluaran']]]);
}

if ($aksi === 'simpan') {
  $t = is_array($b['transaksi'] ?? null) ? $b['transaksi'] : [];
  $id = (int)($t['id'] ?? 0);
  $tanggal = (string)($t['tanggal'] ?? '');
  $jenis = (string)($t['jenis'] ?? '');
  $kategori = trim((string)($t['kategori'] ?? ''));
  $ket = trim((string)($t['keterangan'] ?? ''));
  $jumlah = $t['jumlah'] ?? '';

  $galat = [];
  $tgl = DateTime::createFromFormat('Y-m-d', $tanggal);
  if (!$tgl || $tgl->format('Y-m-d') !== $tanggal) $galat['tanggal'] = 'Isi tanggal yang benar.';
  if (!in_array($jenis, ['pemasukan', 'pengeluaran'], true)) $galat['jenis'] = 'Pilih pemasukan atau pengeluaran.';
  if ($kategori === '' || mb_strlen($kategori) > 40) $galat['kategori'] = 'Kategori wajib diisi (maks. 40 huruf).';
  if (mb_strlen($ket) > 200) $galat['keterangan'] = 'Keterangan maks. 200 huruf.';
  if (!is_numeric($jumlah) || $jumlah <= 0 || $jumlah > 2000000000) $galat['jumlah'] = 'Jumlah harus angka rupiah lebih dari 0.';
  if ($galat) kirim(422, ['ok' => false, 'pesan' => 'Data belum benar.', 'galat' => $galat]);

  wajibManual($pdo, $id);
  if ($id > 0) {
    $pdo->prepare('UPDATE keuangan SET tanggal=?, jenis=?, kategori=?, keterangan=?, jumlah=? WHERE id=?')
        ->execute([$tanggal, $jenis, $kategori, $ket, (int)$jumlah, $id]);
  } else {
    $pdo->prepare('INSERT INTO keuangan (tanggal, jenis, kategori, keterangan, jumlah) VALUES (?,?,?,?,?)')
        ->execute([$tanggal, $jenis, $kategori, $ket, (int)$jumlah]);
  }
  kirim(200, ['ok' => true, 'pesan' => $id > 0 ? 'Transaksi diperbarui.' : 'Transaksi ditambahkan.']);
}

if ($aksi === 'hapus') {
  wajibManual($pdo, (int)($b['id'] ?? 0));
  $pdo->prepare('DELETE FROM keuangan WHERE id = ?')->execute([(int)($b['id'] ?? 0)]);
  kirim(200, ['ok' => true, 'pesan' => 'Transaksi dihapus.']);
}

kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
