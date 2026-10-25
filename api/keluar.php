<?php
// Keluar: hapus sesi
require __DIR__ . '/koneksi.php';

bacaBody();
$_SESSION = [];
session_destroy();
kirim(200, ['ok' => true]);
