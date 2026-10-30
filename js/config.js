// Konfigurasi bersama. Jangan taruh rahasia (PIN, token) di sini — file ini publik.
const CONFIG = {
  namaToko: 'PrintIn',
  tagline: 'Your Design, Your Style.',
  // TODO: ganti dengan nomor WhatsApp admin asli (format 62, tanpa + atau spasi)
  waAdmin: '6281234567890',
  // Nomor WA dalam format yang enak dibaca (tampil di halaman Kontak)
  waTampil: '0812-3456-7890',
  // TODO: semua data di bawah ini masih anonim/placeholder. Ganti dengan data asli PrintIn.
  email: 'halo@contoh.id',
  instagram: 'printin.contoh',
  alamat: 'Fakultas Ekonomika dan Bisnis UNNES, Semarang',
  jamBuka: 'Senin–Sabtu, 08.00–17.00',
  // URL Web App Google Apps Script (lihat apps-script/Code.gs). Kosong = mode contoh:
  // katalog memakai data di js/produk.js dan pesanan dikirim lewat WhatsApp saja.
  urlApi: 'https://script.google.com/macros/s/AKfycbzW2N-yZ5QpMl-6rJ4f3Wlqdvl25RRVGJPT_kkCtD4tBoHRJTXG9lvawmW6-FGAT9is/exec',
  // Kode situs GoatCounter (bagian depan https://KODE.goatcounter.com). Kosong = statistik tidak aktif.
  // Statistik hanya dimuat setelah pengunjung menyetujui banner cookie.
  goatCounter: '',
  // Pesan awal saat pelanggan membuka WhatsApp dari tombol melayang
  pesanWaAwal: 'Halo PrintIn, saya ingin bertanya tentang produk printing atau custom merchandise.',
};
