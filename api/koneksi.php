<?php
// Koneksi database + fungsi bersama untuk API akun.
// Default Laragon: user root, tanpa kata sandi. Sesuaikan jika berbeda.
const DB_HOST = '127.0.0.1';
const DB_NAMA = 'println';
const DB_USER = 'root';
const DB_PASS = '';

header('Content-Type: application/json; charset=utf-8');

// Izinkan halaman dari Live Server (localhost/127.0.0.1 dengan port apa pun) memanggil API ini
$asal = $_SERVER['HTTP_ORIGIN'] ?? '';
$lintasAsal = $asal !== '' && $asal !== 'http://' . $_SERVER['HTTP_HOST'];
if ($lintasAsal && preg_match('#^http://(localhost|127\.0\.0\.1):\d+$#', $asal)) {
  header("Access-Control-Allow-Origin: $asal");
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Vary: Origin');
  // Cookie sesi harus SameSite=None agar ikut terkirim dari alamat yang berbeda
  session_set_cookie_params(['samesite' => 'None', 'secure' => true]);
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}
session_start();

// Kirim JSON lalu berhenti
function kirim(int $kode, array $data): never {
  http_response_code($kode);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

// Hanya terima POST dengan body JSON
function bacaBody(): array {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    kirim(405, ['ok' => false, 'pesan' => 'Metode tidak diizinkan.']);
  }
  $data = json_decode(file_get_contents('php://input'), true);
  return is_array($data) ? $data : [];
}

function db(): PDO {
  try {
    return new PDO(
      'mysql:host=' . DB_HOST . ';dbname=' . DB_NAMA . ';charset=utf8mb4',
      DB_USER,
      DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
  } catch (PDOException $e) {
    kirim(500, ['ok' => false, 'pesan' => 'Database belum bisa dihubungi. Pastikan MySQL di Laragon sudah jalan.']);
  }
}

// Hapus spasi dan tanda hubung dari nomor WA
function bersihkanNomor(string $teks): string {
  return preg_replace('/[\s-]/', '', $teks);
}

// Samakan tabel keuangan dengan status bayar pesanan:
// pesanan "Sudah bayar" (dan tidak dibatalkan) = satu baris pemasukan; selain itu barisnya dihapus.
// Aman dipanggil berulang. Dipakai setiap status pesanan atau status bayar berubah.
function sinkronKeuangan(PDO $pdo, int $pesananId): void {
  $q = $pdo->prepare('SELECT kode, total, status, status_bayar FROM pesanan WHERE id = ?');
  $q->execute([$pesananId]);
  $p = $q->fetch();
  if (!$p) return;

  if ($p['status_bayar'] !== 'Sudah bayar' || $p['status'] === 'Dibatalkan') {
    $pdo->prepare('DELETE FROM keuangan WHERE pesanan_id = ?')->execute([$pesananId]);
    return;
  }

  // Kategori mengikuti lini produk; campuran atau produk yang sudah dihapus = Lainnya
  $l = $pdo->prepare('SELECT DISTINCT pr.lini FROM pesanan_item i LEFT JOIN produk pr ON pr.id = i.produk_id WHERE i.pesanan_id = ?');
  $l->execute([$pesananId]);
  $lini = $l->fetchAll(PDO::FETCH_COLUMN);
  $kategori = (count($lini) === 1 && $lini[0] !== null) ? $lini[0] : 'Lainnya';

  $pdo->prepare(
    "INSERT INTO keuangan (tanggal, jenis, kategori, keterangan, jumlah, pesanan_id)
     VALUES (CURDATE(), 'pemasukan', ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE kategori = VALUES(kategori), jumlah = VALUES(jumlah)"
  )->execute([$kategori, "Pesanan {$p['kode']}", $p['total'], $pesananId]);
}
