<?php
// Data ringkasan untuk dashboard: kartu angka, grafik, dan daftar terbaru
require __DIR__ . '/guard.php';

wajibSuperadmin();
bacaBody();
$pdo = db();

// Produk
$produk = ['total' => 0, 'perLini' => [], 'perStatus' => ['Tersedia' => 0, 'Terbatas' => 0, 'Habis' => 0]];
foreach ($pdo->query('SELECT lini, status, COUNT(*) n FROM produk GROUP BY lini, status') as $r) {
  $produk['total'] += $r['n'];
  $produk['perLini'][$r['lini']] = ($produk['perLini'][$r['lini']] ?? 0) + (int)$r['n'];
  $produk['perStatus'][$r['status']] = ($produk['perStatus'][$r['status']] ?? 0) + (int)$r['n'];
}

// Pengguna
$pengguna = ['total' => 0, 'pelanggan' => 0, 'superadmin' => 0];
foreach ($pdo->query('SELECT role, COUNT(*) n FROM users GROUP BY role') as $r) {
  $pengguna['total'] += $r['n'];
  $pengguna[$r['role']] = (int)$r['n'];
}
$pengguna['baru30hari'] = (int)$pdo->query('SELECT COUNT(*) FROM users WHERE dibuat >= DATE_SUB(NOW(), INTERVAL 30 DAY)')->fetchColumn();

// Keuangan: total, bulan ini, dan 6 bulan terakhir
$uang = ['pemasukan' => 0, 'pengeluaran' => 0, 'bulanIniPemasukan' => 0, 'bulanIniPengeluaran' => 0];
foreach ($pdo->query('SELECT jenis, SUM(jumlah) t FROM keuangan GROUP BY jenis') as $r) {
  $uang[$r['jenis']] = (int)$r['t'];
}
foreach ($pdo->query("SELECT jenis, SUM(jumlah) t FROM keuangan WHERE DATE_FORMAT(tanggal,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m') GROUP BY jenis") as $r) {
  $uang[$r['jenis'] === 'pemasukan' ? 'bulanIniPemasukan' : 'bulanIniPengeluaran'] = (int)$r['t'];
}
$bulan = [];
for ($i = 5; $i >= 0; $i--) {
  $kunci = date('Y-m', strtotime("first day of -$i month"));
  $bulan[$kunci] = ['bulan' => $kunci, 'pemasukan' => 0, 'pengeluaran' => 0];
}
$q = $pdo->query("SELECT DATE_FORMAT(tanggal,'%Y-%m') b, jenis, SUM(jumlah) t FROM keuangan GROUP BY b, jenis");
foreach ($q as $r) {
  if (isset($bulan[$r['b']])) $bulan[$r['b']][$r['jenis']] = (int)$r['t'];
}

$terbaru = $pdo->query('SELECT id, tanggal, jenis, kategori, keterangan, jumlah FROM keuangan ORDER BY tanggal DESC, id DESC LIMIT 5')->fetchAll();
foreach ($terbaru as &$t) $t['jumlah'] = (int)$t['jumlah'];
$perhatian = $pdo->query("SELECT nama, status FROM produk WHERE status <> 'Tersedia' ORDER BY status DESC, nama")->fetchAll();

kirim(200, [
  'ok' => true,
  'produk' => $produk,
  'pengguna' => $pengguna,
  'keuangan' => $uang + ['laba' => $uang['pemasukan'] - $uang['pengeluaran']],
  'perBulan' => array_values($bulan),
  'transaksiTerbaru' => $terbaru,
  'produkPerhatian' => $perhatian,
]);
