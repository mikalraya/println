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
  alamat: 'Jl. Contoh No. 1, Semarang',
  jamBuka: 'Senin–Sabtu, 08.00–17.00',
  // TODO: isi setelah Apps Script di-deploy sebagai Web App (Langkah 8)
  urlApi: '',
  // API PHP untuk akun (login/daftar). Bila halaman dibuka lewat Live Server (port 5500), arahkan ke Laragon
  urlApiAkun: location.port === '5500' ? 'http://localhost:8080/println/api/' : 'api/',
  // Alamat dasar server tempat foto unggahan disimpan (folder uploads/ ada di server PHP, bukan Live Server)
  get urlDasarServer() { return this.urlApiAkun.replace(/api\/$/, ''); },
  // Pesan awal saat pelanggan membuka WhatsApp dari tombol melayang
  pesanWaAwal: 'Halo PrintIn, saya ingin bertanya tentang produk printing atau custom merchandise.',
};
