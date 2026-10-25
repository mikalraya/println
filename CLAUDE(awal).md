# CLAUDE.md — Website Bisnis Println (Percetakan, Semarang)

File ini memberi konteks untuk Claude Code saat bekerja di repo ini. Baca seluruhnya sebelum menulis kode.

## 1. Konteks Proyek

- **Apa:** Website bisnis sederhana untuk **Println**, usaha percetakan di Semarang (mitra nyata).
- **Untuk apa:** Tugas Kelompok mata kuliah **Sistem Informasi Manajemen (SIM)**, dosen Bogy Febriatmoko, S.T., M.M.
- **Tim:** 6 orang (PM, UI/UX Designer, Technical Lead/Front-end, Integrasi Data, Content Writer & Legal, Presenter & QA).
- **Deadline:** Website **wajib online** dan link + file .pptx dikumpulkan **paling lambat H-1** sebelum presentasi (minggu kuliah ke-13/14/15).
- **Prinsip penilaian dosen:** "Yang dinilai adalah penerapan prinsip SIM, bukan kompleksitas teknis." Utamakan fitur yang jelas, mudah dipakai, dan mendukung tujuan bisnis — bukan kode yang rumit.

### Bobot penilaian (jadikan acuan prioritas)

| Aspek | Bobot |
| --- | --- |
| Penerapan prinsip SIM (tren TI, sinergi SI–strategi, integrasi aktivitas) | 25% |
| Human-Centered Design & kualitas website | 20% |
| Keamanan, etika & hukum TI | 15% |
| Kualitas presentasi | 25% |
| Kerja tim & profesionalisme | 15% |

## 2. Batasan Teknis (WAJIB DIPATUHI)

- **Stack:** HTML5 + CSS3 + JavaScript biasa (vanilla). Boleh **Bootstrap 5** atau **Tailwind (CDN)** untuk styling, dan **Chart.js** untuk grafik.
- **JANGAN** memakai framework backend (Laravel, Express, Django, dll.), database sendiri (MySQL, dll.), atau build tool yang rumit (Webpack, Vite, React, Vue). Website harus bisa dibuka langsung sebagai file statis.
- **Backend ringan:** Google Sheets sebagai database + **Google Apps Script (Web App)** sebagai API.
- **Hosting:** GitHub Pages atau Netlify (gratis, HTTPS otomatis).
- **TIDAK ADA login/register pelanggan.** Pelanggan cukup isi form pesanan. Hanya admin yang masuk ke dashboard dengan **PIN sederhana**.
- **TIDAK ADA payment gateway sungguhan.** Pembayaran = halaman **QRIS mockup** yang diberi label jelas "contoh/mockup".
- Biaya total: **Rp0**. Jangan menambahkan layanan berbayar.

## 3. Struktur Folder

```
/
├── index.html          # Beranda (landing page)
├── produk.html         # Katalog + kalkulator harga
├── pesan.html          # Form pemesanan
├── bayar.html          # Pembayaran QRIS mockup (setelah kirim form)
├── status.html         # Cek status pesanan via kode
├── tentang.html        # Tentang Kami
├── kontak.html         # Kontak & FAQ
├── privasi.html        # Kebijakan Privasi
├── admin.html          # Dashboard admin (PIN, tidak tampil di menu)
├── css/
│   └── style.css       # Variabel warna/font + semua style
├── js/
│   ├── config.js       # URL Apps Script, no. WA admin, nama toko (tanpa rahasia)
│   ├── main.js         # Navbar mobile, tombol WA, komponen bersama
│   ├── produk.js       # Data/fetch produk, render katalog, filter
│   ├── kalkulator.js   # Logika hitung harga
│   ├── pesan.js        # Validasi form, kirim ke Apps Script, link WA
│   ├── status.js       # Cek status pesanan
│   └── admin.js        # PIN, ringkasan, grafik, tabel pesanan
├── img/                # Gambar (format WebP, sudah dikompres)
└── apps-script/
    └── Code.gs         # Salinan kode Google Apps Script (untuk dokumentasi)
```

## 4. Sitemap & Navigasi

- Menu utama (maks. 6 item): Beranda · Produk · Pesan · Tentang Kami · Kontak & FAQ.
- Kebijakan Privasi ditautkan di footer dan di form pemesanan.
- Alur pesanan: Produk/Kalkulator → Pesan → Bayar (QRIS mockup) → Cek Status.
- `admin.html` **tidak** muncul di menu; diakses langsung lewat URL + PIN.
- Tombol "Pesan Sekarang" dan tombol WhatsApp melayang tampil di **semua halaman publik**.

## 5. Fitur (Kebutuhan Fungsional)

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F-01 | Beranda: logo, value proposition ("Cetak cepat, harga jelas, pesan dari HP"), CTA, promo, 3 keunggulan | Wajib |
| F-02 | Katalog produk: nama, foto, harga mulai, satuan, estimasi selesai, status bahan (Tersedia/Terbatas/Habis), filter kategori | Wajib |
| F-03 | Kalkulator harga: produk, ukuran, bahan, finishing, jumlah → total estimasi + diskon jumlah besar | Wajib |
| F-04 | Form pemesanan + upload/link file desain + centang persetujuan privasi; menghasilkan kode pesanan `PRN-0001` | Wajib |
| F-05 | Tombol WhatsApp dengan pesan otomatis berisi detail pesanan | Wajib |
| F-06 | Notifikasi email ke admin setiap pesanan baru (Apps Script `MailApp`) | Wajib |
| F-07 | Tentang Kami: profil, visi, keunggulan, alamat, jam buka, Google Maps embed | Wajib |
| F-08 | Kontak & FAQ: WA, email, Instagram; FAQ format file, ukuran, lama cetak, pembayaran, revisi | Wajib |
| F-09 | Pembayaran QRIS mockup: nominal, gambar QRIS contoh berlabel "mockup", tombol konfirmasi via WA | Wajib |
| F-10 | Dashboard admin: PIN, kartu ringkasan, grafik produk terlaris (Chart.js), tabel pesanan | Wajib |
| F-11 | Kebijakan Privasi (dasar UU PDP) | Wajib |
| F-12 | Cek status pesanan via kode | Tambahan |
| F-13 | Chatbot FAQ sederhana berbasis aturan (JS) | Tambahan |
| F-14 | Statistik kunjungan (GoatCounter/Google Analytics) | Tambahan |
| F-15 | Banner persetujuan cookie; analytics aktif hanya setelah setuju | Tambahan |

Kerjakan semua fitur **Wajib** sebelum menyentuh fitur Tambahan.

## 6. Data (Google Sheets)

### Tab `produk`

| Kolom | Contoh |
| --- | --- |
| id | `banner-flexi` |
| nama | Banner Flexi 280 gsm |
| kategori | Banner / Kartu Nama / Stiker / Undangan / Brosur / Dokumen |
| harga | 25000 |
| satuan | per m² |
| estimasi | 1 hari |
| status_bahan | Tersedia / Terbatas / Habis |
| foto | `img/banner.webp` |
| deskripsi | Teks singkat, bahasa awam |

### Tab `pesanan`

`kode, tanggal, nama, whatsapp, produk, spesifikasi, jumlah, total, link_file, tanggal_butuh, pengambilan (ambil/kirim), alamat, catatan, status`

Nilai `status`: `Diterima` → `Cek desain` → `Dicetak` → `Siap diambil` → `Selesai`.

### Endpoint Apps Script (satu Web App)

- `GET ?action=produk` → daftar produk (JSON).
- `GET ?action=status&kode=PRN-0001` → status satu pesanan (hanya kode, produk, status; **tanpa** data pribadi).
- `GET ?action=dashboard&pin=...` → ringkasan + daftar pesanan untuk admin (no. WA disamarkan).
- `POST` (body `text/plain` berisi JSON, untuk menghindari CORS preflight) → simpan pesanan, buat kode, kirim email admin, kembalikan `{kode, total}`.

**Penting:** selama backend belum siap, gunakan **data dummy** di `js/produk.js` dengan struktur yang sama persis, supaya nanti tinggal diganti ke `fetch`.

## 7. Urutan Pengerjaan (ikuti berurutan)

- [ ] **Langkah 1 — Setup:** buat struktur folder di atas, push ke GitHub, aktifkan GitHub Pages.
- [ ] **Langkah 2 — Komponen bersama:** header + navbar (hamburger di HP), footer, tombol WA melayang, variabel CSS (warna, font, spasi). Salin ke semua halaman.
- [ ] **Langkah 3 — Beranda (landing page):** hero, value proposition, CTA, keunggulan, produk unggulan, promo.
- [ ] **Langkah 4 — Halaman statis:** Tentang Kami, Kontak & FAQ, Kebijakan Privasi.
- [ ] **Langkah 5 — Katalog produk** dengan data dummy (array JS) + filter kategori.
- [ ] **Langkah 6 — Kalkulator harga** di halaman Produk.
- [ ] **Langkah 7 — Form pemesanan (front-end):** field, validasi, centang privasi, tombol WA berisi pesan otomatis. *Setelah ini website sudah bisa dipakai memesan via WA.*
- [ ] **Langkah 8 — Integrasi Google Sheets + Apps Script:** simpan pesanan, buat kode, email admin; ganti katalog dummy ke data Sheets.
- [ ] **Langkah 9 — Halaman Bayar (QRIS mockup) & Cek Status.**
- [ ] **Langkah 10 — Dashboard admin:** PIN, kartu ringkasan, grafik Chart.js, tabel pesanan.
- [ ] **Langkah 11 — Fitur tambahan:** chatbot FAQ, analytics, banner cookie.
- [ ] **Langkah 12 — Penyempurnaan:** cek responsif, aksesibilitas, kompres gambar, meta SEO, uji semua link.

Prinsip: **bagian bersama → halaman statis → fitur dinamis; data dummy → backend.** Di setiap langkah website harus tetap bisa dibuka dan tidak rusak.

## 8. Human-Centered Design (aturan UI/UX)

- **Mobile-first.** Tulis CSS untuk layar 360 px dulu, lalu `@media (min-width: ...)` untuk layar besar.
- Ukuran huruf isi minimal **16 px**; tombol/area sentuh minimal **44 px**.
- Kontras teks memenuhi WCAG AA; semua `<img>` punya `alt` yang bermakna; semua input punya `<label>`.
- Bahasa Indonesia sehari-hari. Istilah cetak dijelaskan (mis. "art paper 260 gsm = kertas tebal mengilap").
- Pemesanan selesai dalam **≤ 3 langkah**.
- Pesan error form jelas dan spesifik ("Nomor WhatsApp harus diawali 08"), bukan "Input tidak valid".
- Halaman terbuka **< 3 detik** di 4G: gambar WebP, tanpa library yang tidak dipakai.

## 9. Keamanan, Etika & Hukum (WAJIB)

Dasar: **UU No. 27 Tahun 2022 (UU PDP)** dan **UU ITE** (UU 11/2008, diubah terakhir UU 1/2024).

- **Minimisasi data.** Form hanya meminta: nama, no. WhatsApp, detail pesanan, file desain, alamat (hanya jika pilih "dikirim"), email (opsional).
- **JANGAN PERNAH** meminta NIK/KTP, tanggal lahir, foto diri, atau data kartu pembayaran.
- Centang persetujuan Kebijakan Privasi **wajib** sebelum form bisa dikirim.
- Endpoint status publik **tidak boleh** mengembalikan nama, no. WA, atau alamat.
- Dashboard menampilkan no. WA tersamar (mis. `0812••••89`).
- PIN admin **tidak boleh** ada di kode front-end. Simpan di Script Properties Apps Script dan verifikasi di sana; data dashboard hanya dikirim jika PIN benar. Catat di dokumentasi bahwa ini pengaman demo, bukan keamanan tingkat produksi.
- Jangan commit kredensial/rahasia ke GitHub.
- Halaman QRIS diberi label "Contoh/mockup — bukan pembayaran sungguhan".
- **Semua** data contoh (pesanan, pelanggan, testimoni, angka dashboard) adalah data **fiktif** dan diberi label "contoh". Jangan membuat testimoni palsu yang terlihat asli.
- Nama, logo, dan foto Println hanya dipakai dengan izin pemilik.

## 10. Konvensi Kode

- HTML semantik (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), atribut `lang="id"`.
- Nama file, class, dan id: huruf kecil + tanda hubung (`kartu-produk`, `btn-pesan`).
- Semua konfigurasi (URL Apps Script, no. WA admin, nama toko) hanya di `js/config.js`.
- JS: `const`/`let`, fungsi kecil dan diberi nama jelas, `async/await` untuk `fetch`, selalu tangani error (`try/catch`) dan tampilkan pesan ramah ke pengguna.
- Format harga dengan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- Komentar kode dalam Bahasa Indonesia, singkat.
- Jangan menambah dependency baru tanpa alasan jelas; dahulukan solusi vanilla.
- Commit kecil dan deskriptif dalam Bahasa Indonesia, mis. `feat: tambah kalkulator harga banner`.

## 11. Pengujian Sebelum Go-live

- [ ] Form terkirim → baris baru muncul di Sheets → email admin masuk → kode pesanan tampil.
- [ ] Hasil kalkulator sesuai hitungan manual untuk minimal 3 produk.
- [ ] Tombol WA membuka chat dengan pesan yang benar.
- [ ] Cek status menampilkan status terbaru setelah diubah di Sheets.
- [ ] Dashboard: PIN salah ditolak, PIN benar menampilkan data, grafik tampil.
- [ ] Tampilan rapi di 2 HP + 1 laptop; menu hamburger berfungsi.
- [ ] Semua link dan gambar tidak rusak; HTTPS aktif.
- [ ] Usability test 5 orang (cari harga banner 2x1 m, buat pesanan, cek status); catat hasilnya untuk slide.
- [ ] Rekam video demo 2–3 menit sebagai cadangan presentasi.

## 12. Cara Menjalankan

- Lokal: buka `index.html` di browser, atau jalankan `npx serve .` / Live Server di VS Code.
- Deploy: push ke branch `main` → GitHub Pages otomatis memperbarui situs.
- Apps Script: tempel `apps-script/Code.gs` ke editor Apps Script yang terhubung ke Google Sheets → Deploy sebagai Web App (Execute as: Me, Who has access: Anyone) → salin URL ke `js/config.js`.

## 13. Hal yang Harus Dihindari

- Menambahkan login/register pelanggan, framework backend, atau database sendiri.
- Fitur yang tidak ada di daftar F-01 s.d. F-15 tanpa persetujuan kelompok.
- Menyalin desain/kode website lain tanpa atribusi (plagiarisme = sanksi akademik).
- Memakai data pribadi orang nyata tanpa izin.
