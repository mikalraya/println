// Halaman bayar: ringkasan pesanan + QRIS contoh (mockup, bukan pembayaran sungguhan).
// Data pesanan dari api/pesanan.php (aksi detail). Teks selalu lewat textContent.

const byId = (id) => document.getElementById(id);

// Pesan WhatsApp untuk konfirmasi pembayaran, berisi kode dan isi pesanan
function pesanKonfirmasi(p) {
  const baris = [`Halo ${CONFIG.namaToko}, saya sudah membuat pesanan dan ingin konfirmasi pembayaran.`, '', `Kode pesanan: ${p.kode}`, `Nama: ${p.nama}`, '', 'Pesanan:'];
  p.item.forEach((i, n) => {
    baris.push(`${n + 1}. ${i.nama}${i.spesifikasi ? ` (${i.spesifikasi})` : ''}`);
    baris.push(`   ${i.jumlah} × ${rupiah.format(i.harga)}`);
  });
  baris.push(`Perkiraan total: ${rupiah.format(p.total)}`);
  return baris.join('\n').replace(/ /g, ' ');
}

function tampilkanBayar(p) {
  byId('bayar-kode').textContent = p.kode;
  byId('bayar-nominal').textContent = rupiah.format(p.total);

  byId('bayar-item').replaceChildren(...p.item.map((i) => {
    const li = document.createElement('li');
    const nama = document.createElement('strong');
    nama.textContent = i.nama;
    const rinci = document.createElement('span');
    rinci.textContent = `${i.spesifikasi ? `${i.spesifikasi} · ` : ''}${i.jumlah} × ${rupiah.format(i.harga)}`;
    const harga = document.createElement('span');
    harga.className = 'ringkas-harga';
    harga.textContent = rupiah.format(Math.round(i.harga * i.jumlah));
    li.append(nama, rinci, harga);
    return li;
  }));

  byId('tautan-status').href = `status.html?kode=${encodeURIComponent(p.kode)}`;
  byId('tombol-wa-bayar').href = `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(pesanKonfirmasi(p))}`;

  const sudah = p.statusBayar === 'Sudah bayar';
  byId('blok-qris').hidden = sudah || p.status === 'Dibatalkan';
  byId('bayar-lunas').hidden = !sudah;
  byId('bayar-batal').hidden = p.status !== 'Dibatalkan';
  byId('bayar-isi').hidden = false;
}

function tampilkanGalat(teks, tautan, labelTautan) {
  byId('bayar-muat').hidden = true;
  const kotak = byId('bayar-galat');
  kotak.hidden = false;
  byId('bayar-galat-teks').textContent = teks;
  const a = byId('bayar-galat-tautan');
  a.href = tautan;
  a.textContent = labelTautan;
}

async function mulaiBayar() {
  const kode = new URLSearchParams(location.search).get('kode');
  if (!kode) return tampilkanGalat('Kode pesanan tidak ada. Buat pesanan dulu, atau buka dari halaman Pesanan Saya.', 'status.html', 'Lihat pesananku');

  const hasil = await panggilPesanan({ aksi: 'detail', kode });
  byId('bayar-muat').hidden = true;
  if (!hasil.ok) {
    return hasil.perluMasuk
      ? tampilkanGalat(hasil.pesan, 'login.html', 'Masuk')
      : tampilkanGalat(hasil.pesan, 'status.html', 'Lihat pesananku');
  }
  let pesanan = hasil.pesanan;
  tampilkanBayar(pesanan);

  byId('tombol-sudah-bayar').addEventListener('click', async (e) => {
    const tombol = e.currentTarget;
    tombol.disabled = true;
    const r = await panggilPesanan({ aksi: 'bayar', kode });
    tombol.disabled = false;
    if (!r.ok) return tampilToast({ jenis: 'galat', pesan: r.pesan });
    pesanan = { ...pesanan, statusBayar: 'Sudah bayar' };
    tampilkanBayar(pesanan);
    tampilToast({ pesan: 'Pembayaran dicatat. Admin akan mengecek pesananmu.', tautan: { teks: 'Pantau status', href: `status.html?kode=${encodeURIComponent(kode)}` } });
  });
}

document.addEventListener('DOMContentLoaded', mulaiBayar);
