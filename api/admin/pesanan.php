<?php
// Kelola pesanan (superadmin): daftar, ubah status pengerjaan, ubah status bayar.
require __DIR__ . '/guard.php';

wajibSuperadmin();
$b = bacaBody();
$aksi = (string)($b['aksi'] ?? '');
$pdo = db();

const STATUS_KERJA = ['Antri', 'Dibuat', 'Selesai', 'Dibatalkan'];
const STATUS_BAYAR = ['Belum bayar', 'Sudah bayar'];

if ($aksi === 'daftar') {
  $baris = $pdo->query(
    'SELECT p.id, p.kode, p.nama, p.whatsapp, p.email, p.pengambilan, p.alamat, p.tanggal_butuh, p.catatan, p.link_file,
            p.total, p.status, p.status_bayar, p.dibuat
     FROM pesanan p ORDER BY p.id DESC'
  )->fetchAll();
  $itemQ = $pdo->prepare('SELECT nama_produk AS nama, spesifikasi, jumlah, harga_satuan AS harga, file_desain AS file FROM pesanan_item WHERE pesanan_id = ? ORDER BY id');
  $riwayatQ = $pdo->prepare('SELECT status, keterangan, dibuat FROM pesanan_riwayat WHERE pesanan_id = ? ORDER BY id');
  $hasil = [];
  foreach ($baris as $r) {
    $itemQ->execute([$r['id']]);
    $riwayatQ->execute([$r['id']]);
    $item = array_map(fn($i) => ['nama' => $i['nama'], 'spesifikasi' => $i['spesifikasi'], 'jumlah' => (int)$i['jumlah'], 'harga' => (float)$i['harga'], 'file' => $i['file']], $itemQ->fetchAll());
    $hasil[] = [
      'id' => (int)$r['id'], 'kode' => $r['kode'], 'nama' => $r['nama'],
      'whatsapp' => samarkanNomor($r['whatsapp']),
      'email' => $r['email'], 'alamat' => $r['alamat'],
      'pengambilan' => $r['pengambilan'], 'tanggalButuh' => $r['tanggal_butuh'], 'catatan' => $r['catatan'],
      'linkFile' => $r['link_file'], 'total' => (int)$r['total'],
      'status' => $r['status'], 'statusBayar' => $r['status_bayar'], 'dibuat' => $r['dibuat'],
      'item' => $item,
      'riwayat' => $riwayatQ->fetchAll(),
    ];
  }
  kirim(200, ['ok' => true, 'pesanan' => $hasil]);
}

$id = (int)($b['id'] ?? 0);
$cari = $pdo->prepare('SELECT id, status FROM pesanan WHERE id = ?');
$cari->execute([$id]);
$p = $cari->fetch();
if (!$p) kirim(404, ['ok' => false, 'pesan' => 'Pesanan tidak ditemukan.']);

if ($aksi === 'ubah_status') {
  $baru = (string)($b['status'] ?? '');
  if (!in_array($baru, STATUS_KERJA, true)) kirim(422, ['ok' => false, 'pesan' => 'Status tidak valid.']);
  if ($baru !== $p['status']) {
    $keterangan = ['Antri' => 'Pesanan masuk antrean.', 'Dibuat' => 'Pesananmu sedang dikerjakan.',
                   'Selesai' => 'Pesanan selesai dan siap diambil atau dikirim.', 'Dibatalkan' => 'Pesanan dibatalkan oleh admin.'][$baru];
    $pdo->prepare('UPDATE pesanan SET status = ? WHERE id = ?')->execute([$baru, $id]);
    $pdo->prepare('INSERT INTO pesanan_riwayat (pesanan_id, status, keterangan) VALUES (?, ?, ?)')->execute([$id, $baru, $keterangan]);
    sinkronKeuangan($pdo, $id);
  }
  kirim(200, ['ok' => true, 'pesan' => "Status diubah menjadi $baru."]);
}

if ($aksi === 'ubah_bayar') {
  $baru = (string)($b['statusBayar'] ?? '');
  if (!in_array($baru, STATUS_BAYAR, true)) kirim(422, ['ok' => false, 'pesan' => 'Status bayar tidak valid.']);
  $pdo->prepare('UPDATE pesanan SET status_bayar = ? WHERE id = ?')->execute([$baru, $id]);
  $pdo->prepare('INSERT INTO pesanan_riwayat (pesanan_id, status, keterangan) VALUES (?, ?, ?)')
      ->execute([$id, $p['status'], "Admin menandai pembayaran: $baru."]);
  sinkronKeuangan($pdo, $id);
  kirim(200, ['ok' => true, 'pesan' => "Pembayaran ditandai: $baru."]);
}

kirim(400, ['ok' => false, 'pesan' => 'Aksi tidak dikenal.']);
