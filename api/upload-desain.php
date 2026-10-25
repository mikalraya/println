<?php
// Unggah file desain/dokumen dari form pesanan (multipart/form-data, field "berkas").
// Tanpa login (pelanggan tidak punya akun), jadi dibatasi: jenis file dicek dari isinya,
// maksimal 10 MB, dan maksimal 10 unggahan per sesi per jam.
require __DIR__ . '/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim(405, ['ok' => false, 'pesan' => 'Metode tidak diizinkan.']);
}

const DESAIN_MAKS_BYTE = 10 * 1024 * 1024; // 10 MB
const DESAIN_MAKS_PIKSEL = 100000000;      // cegah gambar raksasa yang menghabiskan memori
const DESAIN_BATAS_PER_JAM = 10;

// Batas unggahan per sesi
$sekarang = time();
$_SESSION['unggah'] = array_values(array_filter($_SESSION['unggah'] ?? [], fn($t) => $t > $sekarang - 3600));
if (count($_SESSION['unggah']) >= DESAIN_BATAS_PER_JAM) {
  kirim(429, ['ok' => false, 'pesan' => 'Terlalu banyak file diunggah. Coba lagi satu jam lagi atau hubungi admin lewat WhatsApp.']);
}

$f = $_FILES['berkas'] ?? null;
if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) {
  kirim(422, ['ok' => false, 'pesan' => 'Pilih file dulu.']);
}
if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE || $f['size'] > DESAIN_MAKS_BYTE) {
  kirim(422, ['ok' => false, 'pesan' => 'Ukuran file maksimal 10 MB. Kecilkan dulu filenya.']);
}
if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
  kirim(400, ['ok' => false, 'pesan' => 'File gagal diunggah. Coba lagi.']);
}

// Jenis file dicek dari isinya, bukan dari nama atau ekstensi
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
$ekstensi = ['application/pdf' => 'pdf', 'image/png' => 'png', 'image/jpeg' => 'jpg'][$mime] ?? null;
if (!$ekstensi) {
  kirim(422, ['ok' => false, 'pesan' => 'Format file harus PDF, PNG, atau JPG.']);
}
if ($ekstensi === 'pdf') {
  $kepala = file_get_contents($f['tmp_name'], false, null, 0, 5);
  if ($kepala !== '%PDF-') kirim(422, ['ok' => false, 'pesan' => 'File PDF rusak atau tidak valid.']);
} else {
  $ukuran = @getimagesize($f['tmp_name']);
  if (!$ukuran || $ukuran[0] * $ukuran[1] > DESAIN_MAKS_PIKSEL) {
    kirim(422, ['ok' => false, 'pesan' => 'Gambar rusak atau resolusinya terlalu besar.']);
  }
}

$folder = __DIR__ . '/../uploads/desain';
if (!is_dir($folder) && !mkdir($folder, 0755, true)) {
  kirim(500, ['ok' => false, 'pesan' => 'Folder penyimpanan belum bisa dibuat.']);
}
$nama = bin2hex(random_bytes(12)) . '.' . $ekstensi;
if (!move_uploaded_file($f['tmp_name'], "$folder/$nama")) {
  kirim(500, ['ok' => false, 'pesan' => 'File belum bisa disimpan. Coba lagi.']);
}

$_SESSION['unggah'][] = $sekarang;
kirim(200, ['ok' => true, 'file' => "uploads/desain/$nama"]);
