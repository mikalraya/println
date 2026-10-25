// Komponen bersama: menu HP, navbar, tombol melayang, animasi scroll, tab, akordeon.
// Membutuhkan js/config.js dimuat lebih dulu.

// Buka-tutup menu hamburger di HP
function aturMenuHp() {
  const tombol = document.querySelector('.tombol-menu');
  const menu = document.getElementById('menu-utama');
  if (!tombol || !menu) return;

  const tutup = () => {
    menu.classList.remove('terbuka');
    tombol.setAttribute('aria-expanded', 'false');
    tombol.setAttribute('aria-label', 'Buka menu');
  };

  tombol.addEventListener('click', () => {
    const terbuka = menu.classList.toggle('terbuka');
    tombol.setAttribute('aria-expanded', String(terbuka));
    tombol.setAttribute('aria-label', terbuka ? 'Tutup menu' : 'Buka menu');
  });

  // Tombol Esc menutup menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('terbuka')) {
      tutup();
      tombol.focus();
    }
  });

  // Klik di luar menu menutupnya
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('terbuka') && !e.target.closest('.pil-nav')) tutup();
  });
}

// Tandai menu halaman yang sedang dibuka
function tandaiMenuAktif() {
  const berkas = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu-utama a, .tombol-keranjang').forEach((a) => {
    if (a.getAttribute('href') === berkas) {
      a.setAttribute('aria-current', 'page');
    }
  });
}

// Bayangan navbar menebal saat halaman di-scroll
function aturBayanganNavbar() {
  const header = document.querySelector('.header-situs');
  if (!header) return;
  const perbarui = () => header.classList.toggle('melayang', window.scrollY > 8);
  window.addEventListener('scroll', perbarui, { passive: true });
  perbarui();
}

// Tombol WhatsApp melayang di semua halaman publik
function buatTombolMelayang() {
  if (document.body.dataset.halaman === 'admin') return;

  const linkWa = `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(CONFIG.pesanWaAwal)}`;
  const kotak = document.createElement('div');
  kotak.className = 'tombol-melayang';
  kotak.innerHTML = `
    <a class="btn-ikon btn-wa" href="${linkWa}" target="_blank" rel="noopener" aria-label="Chat WhatsApp admin ${CONFIG.namaToko}">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span class="label-ikon" aria-hidden="true">Chat WhatsApp</span>
    </a>
  `;
  document.body.appendChild(kotak);
}

// Format harga: Rp 55.000
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

// Keranjang: disimpan di database (tabel keranjang) lewat api/keranjang.php. Perlu login.
// Bentuk item: { id, produkId, nama, lini, spesifikasi, harga (per item, rupiah), jumlah, dipilih, perluDesain }
// "Pesan sekarang" tidak lewat keranjang: item disimpan sementara di sessionStorage (lihat Keranjang.pesanLangsung).
const KUNCI_LANGSUNG = 'printin_langsung';
let jenisKeranjang = 0;

const Keranjang = {
  // Panggil API keranjang. Mengembalikan { ok, item, perluMasuk, pesan }
  async panggil(isi) {
    try {
      const res = await fetch(`${CONFIG.urlApiAkun}keranjang.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isi),
      });
      const data = await res.json();
      if (data.ok) {
        jenisKeranjang = data.item.length;
        perbaruiLencana();
      }
      return data;
    } catch (err) {
      return { ok: false, pesan: 'Tidak bisa terhubung ke server. Buka lewat Laragon, lalu coba lagi.' };
    }
  },

  ambil() { return this.panggil({ aksi: 'ambil' }); },
  tambah(item) { return this.panggil({ aksi: 'tambah', ...item }); },
  ubahJumlah(id, jumlah) { return this.panggil({ aksi: 'jumlah', id, jumlah }); },
  pilih(id, dipilih) { return this.panggil({ aksi: 'pilih', id, dipilih }); },
  hapus(id) { return this.panggil({ aksi: 'hapus', id }); },
  selesai() { return this.panggil({ aksi: 'selesai' }); },

  // Simpan satu item untuk dipesan langsung (tanpa masuk keranjang)
  pesanLangsung(item) {
    try { sessionStorage.setItem(KUNCI_LANGSUNG, JSON.stringify(item)); } catch (err) { /* diabaikan */ }
  },
  ambilLangsung() {
    try { return JSON.parse(sessionStorage.getItem(KUNCI_LANGSUNG)); } catch (err) { return null; }
  },
  hapusLangsung() {
    try { sessionStorage.removeItem(KUNCI_LANGSUNG); } catch (err) { /* diabaikan */ }
  },
};

// Angka kecil di ikon keranjang navbar
function perbaruiLencana() {
  const total = jenisKeranjang;
  document.querySelectorAll('[data-jumlah-keranjang]').forEach((el) => {
    el.textContent = total > 99 ? '99+' : total;
    el.hidden = total === 0;
  });
  document.querySelectorAll('.tombol-keranjang').forEach((a) => {
    a.setAttribute('aria-label', total ? `Keranjang, ${total} jenis produk` : 'Keranjang, kosong');
  });
}

// Panggil api/pesanan.php. Mengembalikan { ok, pesan, perluMasuk, ... } (selalu objek, tidak melempar galat).
async function panggilPesanan(isi) {
  try {
    const res = await fetch(`${CONFIG.urlApiAkun}pesanan.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isi),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, pesan: 'Tidak bisa terhubung ke server. Buka lewat Laragon, lalu coba lagi.' };
  }
}

// Tanggal dan jam dari MySQL ("2026-10-25 06:31:09") -> "25 Okt 2026, 06.31"
function tanggalJam(teks) {
  const d = new Date(String(teks).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

// Notifikasi kecil (toast) di bawah layar. jenis: 'sukses' | 'galat'. tautan: { teks, href } (opsional).
// Memakai textContent, jadi aman untuk nama produk dari database.
let waktuToast;
function tampilToast({ pesan, jenis = 'sukses', tautan }) {
  document.querySelector('.toast')?.remove();
  clearTimeout(waktuToast);

  const kotak = document.createElement('div');
  kotak.className = `toast toast-${jenis}`;
  kotak.setAttribute('role', jenis === 'galat' ? 'alert' : 'status');

  const ikon = document.createElement('span');
  ikon.className = 'toast-ikon';
  ikon.setAttribute('aria-hidden', 'true');
  ikon.textContent = { galat: '!', info: 'i' }[jenis] || '✓';

  const teks = document.createElement('span');
  teks.className = 'toast-teks';
  teks.textContent = pesan;

  kotak.append(ikon, teks);
  if (tautan) {
    const a = document.createElement('a');
    a.className = 'toast-tautan';
    a.href = tautan.href;
    a.textContent = tautan.teks;
    kotak.append(a);
  }
  const tutup = document.createElement('button');
  tutup.type = 'button';
  tutup.className = 'toast-tutup';
  tutup.setAttribute('aria-label', 'Tutup pemberitahuan');
  tutup.textContent = '×';
  tutup.addEventListener('click', () => kotak.remove());
  kotak.append(tutup);

  document.body.appendChild(kotak);
  waktuToast = setTimeout(() => kotak.remove(), 6000);
}

// Beri tahu hasil menambah ke keranjang: sukses, perlu masuk, atau galat lain
function kabarKeranjang(hasil, namaProduk) {
  if (hasil.ok) {
    tampilToast({
      pesan: `${namaProduk} sudah masuk keranjang.`,
      tautan: { teks: 'Lihat keranjang', href: 'keranjang.html' },
    });
    document.querySelectorAll('.tombol-keranjang').forEach((a) => {
      a.classList.remove('loncat');
      void a.offsetWidth; // ulangi animasi
      a.classList.add('loncat');
    });
  } else if (hasil.perluMasuk) {
    tampilToast({
      jenis: 'galat',
      pesan: 'Masuk dulu untuk memakai keranjang.',
      tautan: { teks: 'Masuk', href: 'login.html' },
    });
  } else {
    tampilToast({ jenis: 'galat', pesan: hasil.pesan || 'Belum bisa menambah ke keranjang. Coba lagi.' });
  }
}

// Isi tahun otomatis di footer
function isiTahun() {
  document.querySelectorAll('[data-tahun]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

// Muncul bertahap saat elemen masuk layar. Anak dari [data-urut] muncul berurutan.
function aturAnimasiScroll() {
  const elemen = [...document.querySelectorAll('.reveal, .footer-lembar, .doodle')];

  document.querySelectorAll('[data-urut]').forEach((induk) => {
    [...induk.children].forEach((anak, i) => {
      anak.classList.add('reveal');
      anak.style.setProperty('--d', `${i * 90}ms`);
      elemen.push(anak);
    });
  });

  // Browser lama tanpa IntersectionObserver: langsung tampilkan semua
  if (!('IntersectionObserver' in window)) {
    elemen.forEach((el) => el.classList.add('terlihat'));
    return;
  }

  const pengamat = new IntersectionObserver((daftar) => {
    daftar.forEach((entri) => {
      if (entri.isIntersecting) {
        entri.target.classList.add('terlihat');
        pengamat.unobserve(entri.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  elemen.forEach((el) => pengamat.observe(el));
}

// Tab: klik atau tombol panah mengganti panel
function aturTab() {
  document.querySelectorAll('[data-tab]').forEach((kotak) => {
    const tab = [...kotak.querySelectorAll('[role="tab"]')];
    const panel = [...kotak.querySelectorAll('[role="tabpanel"]')];

    const pilih = (indeks, fokus) => {
      tab.forEach((t, i) => {
        const aktif = i === indeks;
        t.setAttribute('aria-selected', String(aktif));
        t.tabIndex = aktif ? 0 : -1;
        panel[i].hidden = !aktif;
      });
      if (fokus) tab[indeks].focus();
    };

    tab.forEach((t, i) => {
      t.addEventListener('click', () => pilih(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); pilih((i + 1) % tab.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); pilih((i - 1 + tab.length) % tab.length, true); }
      });
    });

    pilih(0);
  });
}

// Akordeon FAQ: satu butir terbuka dalam satu waktu
function aturAkordeon() {
  document.querySelectorAll('[data-akordeon]').forEach((kotak) => {
    const butir = [...kotak.querySelectorAll('.akordeon-item')];

    butir.forEach((item) => {
      const tombol = item.querySelector('.akordeon-tombol');
      tombol.addEventListener('click', () => {
        const bukaBaru = !item.classList.contains('terbuka');
        butir.forEach((lain) => {
          lain.classList.remove('terbuka');
          lain.querySelector('.akordeon-tombol').setAttribute('aria-expanded', 'false');
        });
        if (bukaBaru) {
          item.classList.add('terbuka');
          tombol.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });
}

// Isi teks dari CONFIG (alamat, jam buka, dll.) agar data perusahaan cukup diubah di config.js
function isiDariConfig() {
  document.querySelectorAll('[data-config]').forEach((el) => {
    const nilai = CONFIG[el.dataset.config];
    if (nilai) el.textContent = nilai;
  });
}

// Isi tautan WhatsApp, email, dan Instagram dari CONFIG
function isiTautanKontak() {
  const tautan = {
    wa: `https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(CONFIG.pesanWaAwal)}`,
    email: `mailto:${CONFIG.email}`,
    ig: `https://instagram.com/${CONFIG.instagram}`,
  };
  document.querySelectorAll('[data-kontak]').forEach((a) => {
    a.href = tautan[a.dataset.kontak] || '#';
  });
}

// Ikon dialog konfirmasi (SVG statis)
const IKON_KONFIRMASI = {
  keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  peran: '<path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6l8-3z"/>',
  hapus: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
};

// Dialog konfirmasi sesuai tema. Mengembalikan Promise<boolean>.
// Teks diisi lewat textContent, jadi aman dipakai untuk nama dari database.
function tanyaKonfirmasi({ judul, teks, ya, ikon = 'hapus' }) {
  return new Promise((selesai) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog-logout';
    dialog.setAttribute('aria-labelledby', 'judul-konfirmasi');
    dialog.innerHTML = `
      <div class="ikon-logout" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKON_KONFIRMASI[ikon]}</svg>
      </div>
      <h2 id="judul-konfirmasi"></h2>
      <p></p>
      <div class="aksi-dialog">
        <button class="btn btn-garis" type="button" data-batal>Batal</button>
        <button class="btn btn-bahaya" type="button" data-ya></button>
      </div>`;
    dialog.querySelector('h2').textContent = judul;
    dialog.querySelector('p').textContent = teks;
    dialog.querySelector('[data-ya]').textContent = ya;
    document.body.appendChild(dialog);

    let jawaban = false;
    dialog.addEventListener('close', () => { dialog.remove(); selesai(jawaban); });
    dialog.querySelector('[data-batal]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-ya]').addEventListener('click', () => { jawaban = true; dialog.close(); });
    // Klik area gelap di luar kotak = batal
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.showModal();
    dialog.querySelector('[data-batal]').focus();
  });
}

function tanyaLogout() {
  return tanyaKonfirmasi({
    judul: 'Yakin ingin keluar?',
    teks: 'Kamu perlu masuk lagi untuk memesan dan melihat keranjangmu.',
    ya: 'Ya, keluar',
    ikon: 'keluar',
  });
}

// Jadikan tombol/tautan "Masuk" sebagai "Logout" yang meminta konfirmasi dulu
function jadikanLogout(el) {
  el.textContent = 'Keluar';
  el.href = '#';
  el.classList.add('tombol-logout');
  el.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!(await tanyaLogout())) return;
    try {
      await fetch(`${CONFIG.urlApiAkun}keluar.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch { /* tetap kembali ke beranda */ }
    window.location.href = 'index.html';
  });
}

// Superadmin yang sedang melihat situs publik bisa kembali ke dashboard (navbar + menu HP)
function tambahTautanDashboard() {
  const keluar = document.querySelector('.aksi-nav .btn-masuk');
  if (keluar) {
    const tombol = document.createElement('a');
    tombol.className = 'btn btn-utama btn-dashboard';
    tombol.href = 'admin.html';
    tombol.setAttribute('aria-label', 'Dashboard');
    tombol.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg><span class="teks-dashboard">Dashboard</span>';
    keluar.before(tombol);
  }
  const menuHp = document.querySelector('.menu-utama a[href="#"]');
  if (menuHp) {
    const li = document.createElement('li');
    li.className = 'hanya-hp';
    li.innerHTML = '<a href="admin.html">Dashboard</a>';
    menuHp.parentElement.before(li);
  }
}

// Bila sudah login, tombol "Masuk" di navbar (dan menu HP) berubah jadi "Logout"
async function aturTombolAkun() {
  try {
    const res = await fetch(`${CONFIG.urlApiAkun}sesi.php`, { credentials: 'include' });
    const data = await res.json();
    if (!data.masuk) return;
    jenisKeranjang = data.keranjang || 0;
    perbaruiLencana();
    document.querySelectorAll('.btn-masuk, .menu-utama a[href="login.html"]').forEach(jadikanLogout);
    // Menu "Daftar" tidak perlu lagi setelah login
    document.querySelectorAll('.menu-utama a[href="daftar.html"]').forEach((a) => { a.parentElement.style.display = 'none'; });
    if (data.role === 'superadmin') tambahTautanDashboard();
  } catch { /* API tidak aktif: biarkan tombol Masuk */ }
}

document.addEventListener('DOMContentLoaded', () => {
  aturTombolAkun();
  isiDariConfig();
  isiTautanKontak();
  aturMenuHp();
  tandaiMenuAktif();
  aturBayanganNavbar();
  buatTombolMelayang();
  isiTahun();
  aturAnimasiScroll();
  aturTab();
  aturAkordeon();
});
