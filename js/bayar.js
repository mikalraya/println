// Halaman bayar: ringkasan pesanan + QRIS contoh (mockup, bukan pembayaran sungguhan).
// Ringkasan pesanan disimpan sementara di sessionStorage oleh js/pesan.js setelah pesanan terkirim.
// Teks selalu lewat textContent.

const KUNCI_TERAKHIR = 'printin_terakhir';
const byId = (id) => document.getElementById(id);

function bacaRingkasan() {
  try { return JSON.parse(sessionStorage.getItem(KUNCI_TERAKHIR)); } catch (err) { return null; }
}

function tampilkanBayar(p) {
  byId('bayar-kode').textContent = p.kode;
  byId('bayar-nominal').textContent = rupiah.format(p.total);

  const li = document.createElement('li');
  const nama = document.createElement('strong');
  nama.textContent = p.produk;
  const rinci = document.createElement('span');
  rinci.textContent = `${p.spesifikasi ? `${p.spesifikasi} · ` : ''}Jumlah: ${p.jumlah}`;
  li.append(nama, rinci);
  byId('bayar-item').replaceChildren(li);

  byId('tautan-status').href = `status.html?kode=${encodeURIComponent(p.kode)}`;
  byId('tombol-wa-bayar').href = `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(pesanWaPesanan(p))}`;
  byId('unduh-struk').addEventListener('click', () => unduhStruk(p));
  byId('bayar-isi').hidden = false;
}

// ----- Struk PDF -----
// jsPDF (cdnjs, versi dikunci) hanya dimuat saat tombol "Unduh struk PDF" diklik agar halaman tetap ringan.
const URL_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const LEBAR_STRUK = 80; // mm, selebar struk kasir

function muatJsPdf() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((selesai, gagal) => {
    const s = document.createElement('script');
    s.src = URL_JSPDF;
    s.onload = () => (window.jspdf ? selesai(window.jspdf.jsPDF) : gagal(new Error('jsPDF tidak tersedia')));
    s.onerror = () => gagal(new Error('jsPDF gagal dimuat'));
    document.head.append(s);
  });
}

// Logo PNG -> data URL untuk ditempel di PDF. Gagal dimuat: struk tetap dibuat tanpa logo.
async function muatLogo() {
  try {
    const blob = await (await fetch('img/printin-logo.png')).blob();
    return await new Promise((selesai) => {
      const r = new FileReader();
      r.onload = () => selesai(r.result);
      r.onerror = () => selesai(null);
      r.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

// Font standar PDF tidak punya spasi tak-putus dari Intl.NumberFormat
const teksPdf = (t) => String(t ?? '').replace(/ | /g, ' ');

// Menulis isi struk dan mengembalikan tinggi yang terpakai (mm).
// Dipanggil dua kali: sekali untuk mengukur tinggi, sekali untuk PDF sebenarnya.
function tulisStruk(doc, p, logo) {
  const kiri = 6;
  const kanan = LEBAR_STRUK - 6;
  const lebarIsi = kanan - kiri;
  let y = 8;

  const garisPutus = () => {
    doc.setDrawColor(170);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(kiri, y, kanan, y);
    doc.setLineDashPattern([], 0);
    y += 5;
  };
  const tengah = (teks, ukuran, tebal = false, warna = 20) => {
    doc.setFont('helvetica', tebal ? 'bold' : 'normal').setFontSize(ukuran).setTextColor(warna);
    doc.splitTextToSize(teksPdf(teks), lebarIsi).forEach((baris) => {
      doc.text(baris, LEBAR_STRUK / 2, y, { align: 'center' });
      y += ukuran * 0.45;
    });
  };
  // Baris "label ..... nilai"; nilai panjang dilipat di kolom kanan
  const baris = (label, nilai, tebal = false) => {
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(90);
    doc.text(teksPdf(label), kiri, y);
    doc.setFont('helvetica', tebal ? 'bold' : 'normal').setTextColor(20);
    const potongan = doc.splitTextToSize(teksPdf(nilai), lebarIsi * 0.6);
    potongan.forEach((b, i) => doc.text(b, kanan, y + i * 4, { align: 'right' }));
    y += Math.max(1, potongan.length) * 4 + 1.5;
  };

  if (logo) {
    doc.addImage(logo, 'PNG', LEBAR_STRUK / 2 - 10, y, 20, 16.4, 'logo', 'FAST'); // dikompres agar file kecil
    y += 21;
  } else {
    tengah(CONFIG.namaToko, 13, true); // logo sudah memuat nama toko
  }
  tengah(CONFIG.tagline, 8, false, 90);
  tengah(CONFIG.alamat, 7.5, false, 90);
  y += 2;
  garisPutus();

  tengah('STRUK PESANAN', 9, true, 60);
  y += 5; // ruang untuk huruf kode yang besar
  tengah(p.kode, 18, true, 20);
  y += 2;
  garisPutus();

  const tanggal = p.tanggal ? tanggalJam(p.tanggal) : '';
  baris('Tanggal', tanggal || tanggalJam(new Date().toISOString()));
  baris('Nama', p.nama || '-');
  baris('Produk', p.produk);
  if (p.spesifikasi) baris('Spesifikasi', p.spesifikasi);
  baris('Jumlah', String(p.jumlah));
  baris('Pengambilan', p.ambil === 'kirim' ? 'Dikirim ke alamat' : 'Ambil di toko');
  y += 1;
  garisPutus();

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(20);
  doc.text('TOTAL', kiri, y);
  doc.text(teksPdf(rupiah.format(p.total)), kanan, y, { align: 'right' });
  y += 6;
  baris('Pembayaran', 'QRIS (contoh/mockup)');
  baris('Status', 'Menunggu konfirmasi admin');
  y += 1;
  garisPutus();

  tengah(`Terima kasih sudah memesan di ${CONFIG.namaToko}!`, 9, true, 20);
  y += 1;
  tengah('Simpan struk ini dan tunjukkan ke kasir sebagai bukti pesanan saat mengambil pesanan di toko.', 7.5, false, 90);
  y += 2;
  garisPutus();
  tengah('Contoh struk untuk tugas kuliah SIM. Bukan bukti pembayaran sungguhan.', 7, true, 120);
  return y + 4;
}

async function unduhStruk(p) {
  const tombol = byId('unduh-struk');
  const teks = tombol.querySelector('span');
  tombol.disabled = true;
  teks.textContent = 'Menyiapkan struk…';
  try {
    const [JsPdf, logo] = await Promise.all([muatJsPdf(), muatLogo()]);
    const tinggi = tulisStruk(new JsPdf({ unit: 'mm', format: [LEBAR_STRUK, 400] }), p, logo);
    const doc = new JsPdf({ unit: 'mm', format: [LEBAR_STRUK, tinggi] });
    doc.setProperties({ title: `Struk ${p.kode} - ${CONFIG.namaToko}`, author: CONFIG.namaToko });
    tulisStruk(doc, p, logo);
    doc.save(`struk-${p.kode}.pdf`);
    tampilToast({ pesan: `Struk ${p.kode} berhasil diunduh.` });
  } catch (err) {
    tampilToast({ jenis: 'galat', pesan: 'Struk belum bisa dibuat. Periksa koneksi internet lalu coba lagi.' });
  } finally {
    tombol.disabled = false;
    teks.textContent = 'Unduh struk PDF';
  }
}

function tampilkanGalat(teks) {
  byId('bayar-muat').hidden = true;
  byId('bayar-galat').hidden = false;
  byId('bayar-galat-teks').textContent = teks;
}

function mulaiBayar() {
  const kode = new URLSearchParams(location.search).get('kode');
  const ringkasan = bacaRingkasan();
  byId('bayar-muat').hidden = true;

  if (!kode || !ringkasan || ringkasan.kode !== kode) {
    return tampilkanGalat('Data pesanan tidak ditemukan di perangkat ini. Buat pesanan dulu di halaman Pesan, atau cek status pesananmu dengan kode.');
  }
  tampilkanBayar(ringkasan);
}

document.addEventListener('DOMContentLoaded', mulaiBayar);
