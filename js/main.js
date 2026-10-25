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
  document.querySelectorAll('.menu-utama a').forEach((a) => {
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
  const berkas = location.pathname.split('/').pop() || 'index.html';
  const tombolPesan = berkas === 'pesan.html' ? '' : '<a class="btn btn-utama btn-pesan-melayang" href="pesan.html">Pesan Sekarang</a>';
  kotak.innerHTML = `
    ${tombolPesan}
    <a class="btn-ikon btn-wa" href="${linkWa}" target="_blank" rel="noopener" aria-label="Chat WhatsApp admin ${CONFIG.namaToko}">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span class="label-ikon" aria-hidden="true">Chat WhatsApp</span>
    </a>
  `;
  document.body.appendChild(kotak);
}

// Format harga: Rp 55.000
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

// Panggil Google Apps Script (CONFIG.urlApi). Selalu mengembalikan objek { ok, pesan, ... } dan tidak melempar galat.
// GET untuk membaca; POST memakai body text/plain berisi JSON agar tidak ada preflight CORS.
async function panggilApi({ params, body } = {}) {
  if (!CONFIG.urlApi) return { ok: false, tanpaApi: true, pesan: 'Server pesanan belum disambungkan.' };
  try {
    let res;
    if (body) {
      res = await fetch(CONFIG.urlApi, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    } else {
      res = await fetch(`${CONFIG.urlApi}?${new URLSearchParams(params)}`);
    }
    return await res.json();
  } catch (err) {
    return { ok: false, pesan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.' };
  }
}

// Pesan WhatsApp berisi detail pesanan (dipakai di halaman Pesan dan Bayar)
// p: { kode, nama, produk, spesifikasi, jumlah, total, ambil, tanpaServer }
function pesanWaPesanan(p) {
  const baris = [`Halo ${CONFIG.namaToko}, saya ingin memesan.`, ''];
  if (p.kode) baris.push(`Kode pesanan: ${p.kode}`);
  baris.push(
    `Nama: ${p.nama}`,
    `Produk: ${p.produk}${p.spesifikasi ? ` (${p.spesifikasi})` : ''}`,
    `Jumlah: ${p.jumlah}`,
    `Perkiraan total: ${rupiah.format(p.total)}`,
    `Pengambilan: ${p.ambil === 'kirim' ? 'dikirim ke alamat' : 'ambil di toko'}`,
  );
  if (p.tanpaServer) baris.push('', 'File desain saya kirim lewat chat ini.');
  return baris.join('\n').replace(/\u00a0/g, ' ');
}

// Tanggal dan jam dari Sheets ("2026-10-25 06:31") -> "25 Okt 2026, 06.31"
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

// ----- Persetujuan cookie (F-15) dan statistik kunjungan GoatCounter (F-14) -----
// Skrip statistik hanya dimuat setelah pengunjung menekan "Setuju". Aktif bila CONFIG.goatCounter terisi.
const KUNCI_COOKIE = 'printin_cookie';

function bacaPilihanCookie() {
  try { return localStorage.getItem(KUNCI_COOKIE); } catch (err) { return null; }
}

function simpanPilihanCookie(nilai) {
  try { localStorage.setItem(KUNCI_COOKIE, nilai); } catch (err) { /* pilihan hanya berlaku di halaman ini */ }
}

function aktifkanStatistik() {
  if (!CONFIG.goatCounter || document.getElementById('skrip-statistik')) return;
  const skrip = document.createElement('script');
  skrip.id = 'skrip-statistik';
  skrip.async = true;
  skrip.dataset.goatcounter = `https://${CONFIG.goatCounter}.goatcounter.com/count`;
  skrip.src = 'https://gc.zgo.at/count.js';
  document.head.appendChild(skrip);
}

function tampilkanBannerCookie() {
  if (document.querySelector('.banner-cookie')) return;
  const banner = document.createElement('div');
  banner.className = 'banner-cookie';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Persetujuan cookie');
  const teks = document.createElement('p');
  teks.append('Kami ingin memakai statistik kunjungan sederhana untuk memperbaiki website. Statistik hanya aktif kalau kamu setuju. Baca ');
  const tautan = document.createElement('a');
  tautan.href = 'privasi.html#cookie';
  tautan.textContent = 'Kebijakan Privasi';
  teks.append(tautan, '.');

  const aksi = document.createElement('div');
  aksi.className = 'banner-cookie-aksi';
  [['tolak', 'Tolak', 'btn btn-garis'], ['setuju', 'Setuju', 'btn btn-utama']].forEach(([nilai, label, kelas]) => {
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = kelas;
    tombol.textContent = label;
    tombol.addEventListener('click', () => {
      simpanPilihanCookie(nilai);
      if (nilai === 'setuju') aktifkanStatistik();
      banner.remove();
    });
    aksi.append(tombol);
  });
  banner.append(teks, aksi);
  document.body.appendChild(banner);
}

function aturCookie() {
  if (document.body.dataset.halaman === 'admin') return;
  const pilihan = bacaPilihanCookie();
  if (pilihan === 'setuju') aktifkanStatistik();
  else if (!pilihan) tampilkanBannerCookie();
  // Tombol "Ubah pilihan cookie" di halaman Kebijakan Privasi
  document.querySelectorAll('[data-ubah-cookie]').forEach((t) => t.addEventListener('click', () => {
    try { localStorage.removeItem(KUNCI_COOKIE); } catch (err) { /* diabaikan */ }
    tampilkanBannerCookie();
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  isiDariConfig();
  isiTautanKontak();
  aturMenuHp();
  tandaiMenuAktif();
  aturBayanganNavbar();
  buatTombolMelayang();
  aturCookie();
  isiTahun();
  aturAnimasiScroll();
  aturTab();
  aturAkordeon();
});
