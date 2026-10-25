<?php
// Unggah foto produk (multipart/form-data, field "foto"). Hanya superadmin.
// Foto dicek isinya, diperkecil, lalu disimpan sebagai WebP di uploads/produk/.
require __DIR__ . '/guard.php';

wajibSuperadmin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim(405, ['ok' => false, 'pesan' => 'Metode tidak diizinkan.']);
}

const FOTO_MAKS_BYTE = 5 * 1024 * 1024; // 5 MB
const FOTO_LEBAR_MAKS = 1200;

$f = $_FILES['foto'] ?? null;
if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) {
  kirim(422, ['ok' => false, 'pesan' => 'Pilih file foto dulu.']);
}
if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE || $f['size'] > FOTO_MAKS_BYTE) {
  kirim(422, ['ok' => false, 'pesan' => 'Ukuran foto maksimal 5 MB. Kecilkan dulu fotonya.']);
}
if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
  kirim(400, ['ok' => false, 'pesan' => 'Foto gagal diunggah. Coba lagi.']);
}

// Cek jenis file dari isinya, bukan dari nama/ekstensi
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
$buka = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp'];
if (!isset($buka[$mime])) {
  kirim(422, ['ok' => false, 'pesan' => 'Format foto harus JPG, PNG, atau WebP.']);
}
$gambar = @$buka[$mime]($f['tmp_name']);
if (!$gambar) {
  kirim(422, ['ok' => false, 'pesan' => 'File foto rusak atau tidak bisa dibaca.']);
}

// Perkecil bila terlalu lebar, pertahankan transparansi PNG
$lebar = imagesx($gambar);
if ($lebar > FOTO_LEBAR_MAKS) {
  $gambar = imagescale($gambar, FOTO_LEBAR_MAKS);
}
imagepalettetotruecolor($gambar);
imagealphablending($gambar, false);
imagesavealpha($gambar, true);

$folder = __DIR__ . '/../../uploads/produk';
if (!is_dir($folder) && !mkdir($folder, 0755, true)) {
  kirim(500, ['ok' => false, 'pesan' => 'Folder penyimpanan foto belum bisa dibuat.']);
}
$nama = bin2hex(random_bytes(8)) . '.webp';
if (!imagewebp($gambar, "$folder/$nama", 85)) {
  kirim(500, ['ok' => false, 'pesan' => 'Foto belum bisa disimpan. Coba lagi.']);
}
kirim(200, ['ok' => true, 'foto' => "uploads/produk/$nama"]);
