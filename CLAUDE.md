# CLAUDE.md — Website SIM PrintIn (Jasa Printing & Custom Merchandise)

File ini memberi konteks untuk Claude Code saat bekerja di repo ini. Baca seluruhnya sebelum menulis kode.

## 1. Identitas Bisnis

| Item | Isi |
| --- | --- |
| Nama bisnis | **PrintIn** (penulisan selalu "PrintIn": P dan I kapital) |
| Tagline | *Your Design, Your Style.* |
| Bidang usaha | Jasa Printing dan Custom Merchandise |
| Jenis usaha | Jasa percetakan reguler + pembuatan merchandise custom; pelanggan bisa menyesuaikan desain produk sesuai kebutuhan |
| Lokasi | Semarang |
| Nama proyek akademik | Pengembangan Website Sistem Informasi Manajemen Jasa Printing dan Custom Merchandise PrintIn |

### Deskripsi

PrintIn adalah konsep bisnis jasa printing dan custom merchandise untuk kebutuhan akademik, pribadi, komunitas, dan bisnis. Lewat website, pelanggan dapat melihat katalog, memperoleh informasi harga, mengisi formulir pemesanan, dan mengirimkan desain untuk produk custom. Website juga membantu admin mengelola pesanan dan memperbarui status pengerjaan secara terstruktur.

### Visi

Menjadi layanan printing dan custom merchandise yang praktis, kreatif, dan terpercaya untuk memenuhi berbagai kebutuhan pelanggan.

### Misi

1. Menyediakan layanan printing reguler dan custom merchandise yang beragam.
2. Memudahkan pelanggan memperoleh informasi produk dan harga.
3. Mempermudah proses pemesanan melalui website.
4. Mendukung pengelolaan data produk dan pesanan secara terstruktur melalui penerapan Sistem Informasi Manajemen.

### Target pasar

- Mahasiswa dan pelajar
- Dosen dan tenaga pendidik
- Komunitas dan organisasi
- Pelaku UMKM dan pemilik usaha
- Perusahaan yang membutuhkan media promosi atau merchandise
- Masyarakat umum

### Fungsi website (media operasional)

Media informasi, katalog produk, pemesanan layanan, pengiriman desain custom, dan pemantauan status pesanan.

## 2. Konteks Tugas

- **Mata kuliah:** Sistem Informasi Manajemen (SIM), dosen Bogy Febriatmoko, S.T., M.M.
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

## 3. Produk & Harga

Semua harga adalah **harga simulasi** dalam rupiah (Rp). Di website, beri keterangan kecil "Harga simulasi" di katalog dan kalkulator. Harga "Mulai" berarti harga dasar; harga akhir dikonfirmasi admin.

### A. Printing Reguler

| id | Layanan | Harga | Satuan |
| --- | --- | --- | --- |
| `print-bw` | Print hitam putih | Rp500 | per lembar |
| `print-warna` | Print berwarna | Rp1.500 | per lembar |
| `fotokopi-bw` | Fotokopi hitam putih | Rp300 | per lembar |
| `scan` | Scan dokumen | Rp1.000 | per lembar |
| `brosur` | Cetak brosur | Mulai Rp1.500 | per lembar |
| `poster-a3` | Cetak poster A3 | Rp15.000 | per lembar |
| `kartu-nama` | Cetak kartu nama | Rp25.000 | per 100 pcs |
| `banner` | Cetak banner | Rp25.000 | per m² |
| `undangan` | Cetak undangan | Mulai Rp2.000 | per pcs |

### B. Custom Merchandise

| id | Produk | Harga | Satuan |
| --- | --- | --- | --- |
| `tumbler` | Custom Tumbler | Rp55.000 | per pcs |
| `mug` | Custom Mug | Rp25.000 | per pcs |
| `gantungan-kunci` | Custom Gantungan Kunci | Rp10.000 | per pcs |
| `tote-bag` | Custom Tote Bag | Rp35.000 | per pcs |

### Aturan kalkulator harga

| Tipe | Produk | Rumus |
| --- | --- | --- |
| `lembar` | print-bw, print-warna, fotokopi-bw, scan, brosur, poster-a3 | harga × jumlah lembar |
| `paket` | kartu-nama | harga × jumlah paket (1 paket = 100 pcs) |
| `luas` | banner | harga × panjang (m) × lebar (m) × jumlah |
| `pcs` | undangan, semua custom merchandise | harga × jumlah pcs |

- Produk dengan harga "Mulai" (brosur, undangan) menampilkan label **"Estimasi"** di hasil kalkulator.
- Jangan menambahkan diskon, ongkir, atau biaya lain yang tidak ada di tabel ini kecuali kelompok memutuskannya.

## 4. Batasan Teknis (WAJIB DIPATUHI)

- **Stack:** HTML5 + CSS3 + JavaScript biasa (vanilla). Boleh **Bootstrap 5** atau **Tailwind (CDN)** untuk styling, dan **Chart.js** untuk grafik.
- **JANGAN** memakai framework backend (Laravel, Express, Django, dll.), database sendiri (MySQL, dll.), atau build tool yang rumit (Webpack, Vite, React, Vue). Website harus bisa dibuka langsung sebagai file statis.
- **Backend ringan:** Google Sheets sebagai database + **Google Apps Script (Web App)** sebagai API.
- **Hosting:** GitHub Pages atau Netlify (gratis, HTTPS otomatis).
- **TIDAK ADA login/register pelanggan.** Pelanggan cukup isi form pesanan. Hanya admin yang masuk ke dashboard dengan **PIN sederhana**.
- **TIDAK ADA payment gateway sungguhan.** Pembayaran = halaman **QRIS mockup** yang diberi label jelas "contoh/mockup".
- Biaya total: **Rp0**. Jangan menambahkan layanan berbayar.

## 5. Struktur Folder

```
/
├── index.html          # Beranda (landing page)
├── produk.html         # Katalog (Printing Reguler & Custom Merchandise) + kalkulator harga
├── pesan.html          # Form pemesanan + upload desain
├── bayar.html          # Pembayaran QRIS mockup (setelah kirim form)
├── status.html         # Cek status pesanan via kode
├── tentang.html        # Tentang Kami (deskripsi, visi, misi)
├── kontak.html         # Kontak & FAQ
├── privasi.html        # Kebijakan Privasi & ketentuan desain
├── admin.html          # Dashboard admin (PIN, tidak tampil di menu)
├── css/
│   └── style.css       # Variabel warna/font + semua style
├── js/
│   ├── config.js       # URL Apps Script, no. WA admin, nama toko (tanpa rahasia)
│   ├── main.js         # Navbar mobile, tombol WA, komponen bersama
│   ├── produk.js       # Data/fetch produk, render katalog, filter
│   ├── kalkulator.js   # Logika hitung harga (lihat aturan di bagian 3)
│   ├── pesan.js        # Validasi form, kirim ke Apps Script, link WA
│   ├── status.js       # Cek status pesanan
│   ├── chatbot.js      # Chatbot FAQ berbasis aturan (F-13)
│   └── admin.js        # PIN, ringkasan, grafik, tabel pesanan
├── img/                # Gambar (format WebP, sudah dikompres); foto produk di img/produk/
└── apps-script/
    └── Code.gs         # Salinan kode Google Apps Script (untuk dokumentasi)
```

## 6. Sitemap & Navigasi

- Menu utama (maks. 6 item): Beranda · Produk · Pesan · Tentang Kami · Kontak & FAQ.
- Halaman Produk punya dua tab/filter utama: **Printing Reguler** dan **Custom Merchandise**.
- Kebijakan Privasi ditautkan di footer dan di form pemesanan.
- Alur pesanan: Produk/Kalkulator → Pesan (+ upload desain) → Bayar (QRIS mockup) → Cek Status.
- `admin.html` **tidak** muncul di menu; diakses langsung lewat URL + PIN.
- Tombol "Pesan Sekarang" dan tombol WhatsApp melayang tampil di **semua halaman publik**.

## 7. Fitur (Kebutuhan Fungsional)

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F-01 | Beranda: logo PrintIn, tagline "Your Design, Your Style.", value proposition, CTA, dua lini layanan (Printing Reguler & Custom Merchandise), keunggulan | Wajib |
| F-02 | Katalog produk: nama, foto, harga + satuan, label "Mulai" bila perlu, estimasi selesai, status ketersediaan (Tersedia/Terbatas/Habis), filter kategori | Wajib |
| F-03 | Kalkulator harga sesuai aturan bagian 3 (lembar, paket, luas, pcs) | Wajib |
| F-04 | Form pemesanan + upload/link file desain (wajib untuk produk custom, brosur, poster, kartu nama, banner, undangan) + centang persetujuan privasi; menghasilkan kode pesanan `PRT-0001` | Wajib |
| F-05 | Tombol WhatsApp dengan pesan otomatis berisi detail pesanan | Wajib |
| F-06 | Notifikasi email ke admin setiap pesanan baru (Apps Script `MailApp`) | Wajib |
| F-07 | Tentang Kami: deskripsi, visi, misi, target pelanggan, keunggulan, alamat Semarang, jam buka, Google Maps embed | Wajib |
| F-08 | Kontak & FAQ: WA, email, Instagram; FAQ format file desain, ukuran, lama pengerjaan, pembayaran, revisi, produk custom | Wajib |
| F-09 | Pembayaran QRIS mockup: nominal, gambar QRIS contoh berlabel "mockup", tombol konfirmasi via WA | Wajib |
| F-10 | Dashboard admin: PIN, menu Dashboard / Produk / Pesanan; kartu ringkasan, grafik produk terlaris & perbandingan Printing vs Merchandise (Chart.js), kelola produk (tambah/ubah/hapus ke tab `produk`), tabel pesanan | Wajib |
| F-11 | Kebijakan Privasi (dasar UU PDP) + ketentuan desain custom | Wajib |
| F-12 | Cek status pesanan via kode | Tambahan |
| F-13 | Chatbot FAQ sederhana berbasis aturan (JS) | Tambahan |
| F-14 | Statistik kunjungan (GoatCounter/Google Analytics) | Tambahan |
| F-15 | Banner persetujuan cookie; analytics aktif hanya setelah setuju | Tambahan |
| F-16 | Pratinjau desain sederhana untuk merchandise (gambar upload pelanggan ditampilkan di atas foto mug/tumbler/tote bag) | Tambahan |

Kerjakan semua fitur **Wajib** sebelum menyentuh fitur Tambahan.

### Ketentuan upload desain

- Format diterima: PDF, PNG, JPG (maks. 10 MB per file). Alternatif: link Google Drive.
- Produk Custom Merchandise **wajib** menyertakan desain; layanan print/fotokopi/scan dokumen menyertakan file dokumen.
- Form menampilkan catatan singkat: resolusi minimal yang disarankan dan bahwa admin akan menghubungi via WA bila file perlu revisi.

## 8. Data (Google Sheets)

### Tab `produk`

| Kolom | Contoh |
| --- | --- |
| id | `banner` |
| nama | Cetak banner |
| lini | Printing Reguler / Custom Merchandise |
| kategori | Dokumen / Promosi / Kartu & Undangan / Merchandise |
| harga | 25000 |
| satuan | m² / lembar / 100 pcs / pcs |
| tipe_hitung | lembar / paket / luas / pcs |
| harga_mulai | TRUE bila harga "Mulai" (brosur, undangan), selain itu FALSE |
| perlu_desain | TRUE / FALSE |
| estimasi | 1 hari |
| status | Tersedia / Terbatas / Habis |
| foto | `img/banner.webp` |
| deskripsi | Teks singkat, bahasa awam |

Isi awal tab ini (dan data dummy di `js/produk.js`) = **13 produk** di bagian 3, dengan harga persis sama.

### Tab `pesanan`

`kode, tanggal, nama, whatsapp, lini, produk, spesifikasi, jumlah, total, link_file, tanggal_butuh, pengambilan (ambil/kirim), alamat, catatan, status`

Nilai `status`: `Diterima` → `Cek desain` → `Diproses` → `Siap diambil` → `Selesai`.

### Endpoint Apps Script (satu Web App)

- `GET ?action=produk` → daftar produk (JSON).
- `GET ?action=status&kode=PRT-0001` → status satu pesanan (hanya kode, produk, status; **tanpa** data pribadi).
- `POST` dengan `action: "dashboard"` + PIN di body → ringkasan + daftar pesanan untuk admin (no. WA disamarkan). PIN jangan dikirim lewat URL.
- `POST` dengan `action: "ubah_status"` / `"produk_simpan"` (mode `tambah`/`ubah`) / `"produk_hapus"` + PIN di body → khusus admin; PIN diperiksa di Apps Script sebelum menulis ke Sheets.
- `POST` dengan `action: "pesan"` (body `text/plain` berisi JSON, untuk menghindari CORS preflight) → simpan pesanan, buat kode, kirim email admin, kembalikan `{kode, total}`.

**Penting:** selama backend belum siap, gunakan **data dummy** di `js/produk.js` dengan struktur yang sama persis, supaya nanti tinggal diganti ke `fetch`.

## 9. Urutan Pengerjaan (ikuti berurutan)

- [ ] **Langkah 1 — Setup:** buat struktur folder di atas, push ke GitHub, aktifkan GitHub Pages.
- [ ] **Langkah 2 — Komponen bersama:** header + navbar (hamburger di HP), footer, tombol WA melayang, variabel CSS (warna, font, spasi). Salin ke semua halaman.
- [ ] **Langkah 3 — Beranda (landing page):** hero dengan tagline, value proposition, CTA, dua lini layanan, keunggulan, produk unggulan.
- [ ] **Langkah 4 — Halaman statis:** Tentang Kami (deskripsi, visi, misi), Kontak & FAQ, Kebijakan Privasi.
- [ ] **Langkah 5 — Katalog produk** dengan data dummy 13 produk (array JS) + filter Printing Reguler / Custom Merchandise.
- [ ] **Langkah 6 — Kalkulator harga** di halaman Produk sesuai aturan bagian 3.
- [ ] **Langkah 7 — Form pemesanan (front-end):** field, upload/link desain, validasi, centang privasi, tombol WA berisi pesan otomatis. *Setelah ini website sudah bisa dipakai memesan via WA.*
- [ ] **Langkah 8 — Integrasi Google Sheets + Apps Script:** simpan pesanan, buat kode, email admin; ganti katalog dummy ke data Sheets.
- [ ] **Langkah 9 — Halaman Bayar (QRIS mockup) & Cek Status.**
- [ ] **Langkah 10 — Dashboard admin:** PIN, kartu ringkasan, grafik Chart.js, tabel pesanan.
- [ ] **Langkah 11 — Fitur tambahan:** chatbot FAQ, analytics, banner cookie, pratinjau desain merchandise.
- [ ] **Langkah 12 — Penyempurnaan:** cek responsif, aksesibilitas, kompres gambar, meta SEO, uji semua link.

Prinsip: **bagian bersama → halaman statis → fitur dinamis; data dummy → backend.** Di setiap langkah website harus tetap bisa dibuka dan tidak rusak.

## 10. Human-Centered Design (aturan UI/UX)

- **Mobile-first.** Tulis CSS untuk layar 360 px dulu, lalu `@media (min-width: ...)` untuk layar besar.
- Ukuran huruf isi minimal **16 px**; tombol/area sentuh minimal **44 px**.
- Kontras teks memenuhi WCAG AA; semua `<img>` punya `alt` yang bermakna; semua input punya `<label>`.
- Bahasa Indonesia sehari-hari. Istilah cetak dijelaskan (mis. "art paper 260 gsm = kertas tebal mengilap").
- Gaya visual mencerminkan tagline "Your Design, Your Style.": kreatif dan modern, tapi tetap rapi dan mudah dibaca.
- Pemesanan selesai dalam **≤ 3 langkah**.
- Pesan error form jelas dan spesifik ("Nomor WhatsApp harus diawali 08"), bukan "Input tidak valid".
- Halaman terbuka **< 3 detik** di 4G: gambar WebP, tanpa library yang tidak dipakai.

## 11. Keamanan, Etika & Hukum (WAJIB)

Dasar: **UU No. 27 Tahun 2022 (UU PDP)** dan **UU ITE** (UU 11/2008, diubah terakhir UU 1/2024).

- **Minimisasi data.** Form hanya meminta: nama, no. WhatsApp, detail pesanan, file desain, alamat (hanya jika pilih "dikirim"), email (opsional).
- **JANGAN PERNAH** meminta NIK/KTP, tanggal lahir, foto diri, atau data kartu pembayaran.
- Centang persetujuan Kebijakan Privasi **wajib** sebelum form bisa dikirim.
- Endpoint status publik **tidak boleh** mengembalikan nama, no. WA, atau alamat.
- Dashboard menampilkan no. WA tersamar (mis. `0812••••89`).
- PIN admin **tidak boleh** ada di kode front-end. Simpan di Script Properties Apps Script dan verifikasi di sana; data dashboard hanya dikirim jika PIN benar. Catat di dokumentasi bahwa ini pengaman demo, bukan keamanan tingkat produksi.
- Jangan commit kredensial/rahasia ke GitHub.
- Halaman QRIS diberi label "Contoh/mockup — bukan pembayaran sungguhan".
- **Ketentuan desain custom:** pelanggan menyatakan desain yang diunggah miliknya atau sudah berizin (tidak melanggar hak cipta/merek orang lain). PrintIn tidak memakai desain pelanggan untuk promosi tanpa izin tertulis. Tampilkan ketentuan ini di `privasi.html` dan sebagai teks singkat di form.
- **Semua** data contoh (pesanan, pelanggan, testimoni, angka dashboard) adalah data **fiktif** dan diberi label "contoh". Jangan membuat testimoni palsu yang terlihat asli.
- Logo dan foto produk dibuat sendiri atau memakai gambar bebas lisensi dengan atribusi.

## 12. Konvensi Kode

- HTML semantik (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), atribut `lang="id"`.
- Nama file, class, dan id: huruf kecil + tanda hubung (`kartu-produk`, `btn-pesan`).
- Semua konfigurasi (URL Apps Script, no. WA admin, nama toko) hanya di `js/config.js`.
- JS: `const`/`let`, fungsi kecil dan diberi nama jelas, `async/await` untuk `fetch`, selalu tangani error (`try/catch`) dan tampilkan pesan ramah ke pengguna.
- Format harga dengan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` → tampil "Rp25.000".
- Komentar kode dalam Bahasa Indonesia, singkat.
- Jangan menambah dependency baru tanpa alasan jelas; dahulukan solusi vanilla.
- Commit kecil dan deskriptif dalam Bahasa Indonesia, mis. `feat: tambah kalkulator harga banner`.

## 13. Pengujian Sebelum Go-live

- [ ] Form terkirim → baris baru muncul di Sheets → email admin masuk → kode pesanan tampil.
- [ ] Kalkulator benar untuk tiap tipe, misalnya:
  - 20 lembar print berwarna = Rp30.000
  - 2 paket kartu nama (200 pcs) = Rp50.000
  - Banner 2 × 1 m, 1 buah = Rp50.000
  - 10 custom mug = Rp250.000
- [ ] Produk custom tidak bisa dipesan tanpa file/link desain.
- [ ] Tombol WA membuka chat dengan pesan yang benar.
- [ ] Cek status menampilkan status terbaru setelah diubah di Sheets.
- [ ] Dashboard: PIN salah ditolak, PIN benar menampilkan data, grafik tampil.
- [ ] Tampilan rapi di 2 HP + 1 laptop; menu hamburger berfungsi.
- [ ] Semua link dan gambar tidak rusak; HTTPS aktif.
- [ ] Usability test 5 orang dengan 3 tugas: cari harga banner 2 × 1 m, pesan custom mug dengan desain sendiri, cek status pesanan. Catat hasilnya untuk slide.
- [ ] Rekam video demo 2–3 menit sebagai cadangan presentasi.

## 14. Cara Menjalankan

- Lokal: buka `index.html` di browser, atau jalankan `npx serve .` / Live Server di VS Code.
- Deploy: push ke branch `main` → GitHub Pages otomatis memperbarui situs.
- Apps Script: tempel `apps-script/Code.gs` ke editor Apps Script yang terhubung ke Google Sheets → Deploy sebagai Web App (Execute as: Me, Who has access: Anyone) → salin URL ke `js/config.js`.

## 15. Hal yang Harus Dihindari

- Menambahkan login/register pelanggan, framework backend, atau database sendiri.
- Mengubah nama bisnis, tagline, atau harga di bagian 1 dan 3 tanpa persetujuan kelompok.
- Fitur yang tidak ada di daftar F-01 s.d. F-16 tanpa persetujuan kelompok.
- Menyalin desain/kode website lain tanpa atribusi (plagiarisme = sanksi akademik).
- Memakai data pribadi orang nyata tanpa izin.
