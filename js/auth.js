// Form masuk dan daftar: validasi di browser, lalu kirim ke api/*.php (tabel users).
// PIN admin tidak boleh diperiksa di sini; nanti diverifikasi di server.

const POLA_WA = /^08\d{8,12}$/;
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Tampilkan atau hapus pesan galat pada satu kolom
function setGalat(input, pesan) {
  const area = document.getElementById(`galat-${input.id}`);
  if (!area) return;
  area.textContent = pesan || '';
  area.hidden = !pesan;
  if (pesan) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function bersihkanNomor(teks) {
  return teks.replace(/[\s-]/g, '');
}

// Aturan tiap form: mengembalikan daftar [input, pesan] untuk kolom yang salah
const aturan = {
  masuk(f) {
    const id = f.elements.id;
    const sandi = f.elements.sandi;
    const nilaiId = id.value.trim();
    const salah = [];
    if (!nilaiId) salah.push([id, 'Isi nomor WhatsApp (diawali 08) atau email.']);
    else if (!POLA_WA.test(bersihkanNomor(nilaiId)) && !POLA_EMAIL.test(nilaiId)) {
      salah.push([id, 'Nomor WhatsApp harus diawali 08, atau isi email yang benar.']);
    }
    if (!sandi.value) salah.push([sandi, 'Kata sandi wajib diisi.']);
    return salah;
  },

  daftar(f) {
    const { nama, wa, email, sandi, ulang, setuju } = f.elements;
    const salah = [];
    if (nama.value.trim().length < 2) salah.push([nama, 'Nama wajib diisi, minimal 2 huruf.']);
    if (!POLA_WA.test(bersihkanNomor(wa.value))) {
      salah.push([wa, 'Nomor WhatsApp harus diawali 08 dan berisi 10 sampai 13 angka.']);
    }
    if (email.value.trim() && !POLA_EMAIL.test(email.value.trim())) {
      salah.push([email, 'Format email belum benar, contoh: nama@email.com.']);
    }
    if (sandi.value.length < 8) salah.push([sandi, 'Kata sandi minimal 8 karakter.']);
    if (ulang.value !== sandi.value) salah.push([ulang, 'Kata sandi belum sama, coba ketik ulang.']);
    if (!setuju.checked) salah.push([setuju, 'Centang persetujuan Kebijakan Privasi dulu.']);
    return salah;
  },
};

// Kirim ke API PHP (tabel users). Mengembalikan { status, data }
async function kirimApi(file, isi) {
  const res = await fetch(`${CONFIG.urlApiAkun}${file}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isi),
  });
  let data = {};
  try { data = await res.json(); } catch { /* respons bukan JSON */ }
  return { status: res.status, data };
}

// Isi body API sesuai jenis form
const bodyApi = {
  masuk: (f) => ({ id: f.elements.id.value.trim(), sandi: f.elements.sandi.value }),
  daftar: (f) => ({
    nama: f.elements.nama.value.trim(),
    wa: f.elements.wa.value,
    email: f.elements.email.value.trim(),
    sandi: f.elements.sandi.value,
    setuju: f.elements.setuju.checked,
  }),
};

// Nama kolom dari server -> id input di form daftar
const kolomGalat = { nama: 'nama', wa: 'wa', email: 'email', sandi: 'sandi', setuju: 'setuju' };

function tampilInfo(info, teks) {
  info.textContent = teks;
  info.hidden = false;
}

async function prosesForm(form, jenis, info) {
  const tombol = form.querySelector('button[type="submit"]');
  tombol.disabled = true;
  try {
    const { status, data } = await kirimApi(jenis === 'masuk' ? 'masuk.php' : 'daftar.php', bodyApi[jenis](form));
    if (data.ok) {
      tampilInfo(info, data.pesan);
      // Superadmin langsung ke dashboard, pelanggan ke beranda
      window.location.href = data.role === 'superadmin' ? 'admin.html' : 'index.html';
      return;
    }
    // Galat per kolom dari server (mis. nomor sudah terdaftar)
    Object.entries(data.galat || {}).forEach(([kunci, pesan]) => {
      const input = form.elements[kolomGalat[kunci]];
      if (input) setGalat(input, pesan);
    });
    if (!data.galat) {
      // 404/405 = halaman dibuka lewat server yang tidak menjalankan PHP (mis. Live Server)
      const tanpaPhp = status === 404 || status === 405;
      tampilInfo(info, data.pesan || (tanpaPhp
        ? 'Server ini tidak menjalankan PHP. Buka lewat Laragon, mis. http://localhost:8080/println/'
        : `Terjadi masalah (kode ${status}). Coba lagi.`));
    }
  } catch {
    tampilInfo(info, 'Tidak bisa terhubung ke server. Buka lewat Laragon (http://localhost/println/), bukan file langsung.');
  } finally {
    tombol.disabled = false;
  }
}

function aturForm(form) {
  const jenis = form.dataset.formAuth;
  const info = form.querySelector('.info-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.querySelectorAll('input').forEach((i) => setGalat(i, ''));
    info.hidden = true;

    const salah = aturan[jenis](form);
    if (salah.length) {
      salah.forEach(([input, pesan]) => setGalat(input, pesan));
      salah[0][0].focus();
      return;
    }

    prosesForm(form, jenis, info);
  });

  // Hapus pesan galat begitu pengguna mulai memperbaiki
  form.addEventListener('input', (e) => {
    if (e.target.matches('input')) setGalat(e.target, '');
  });
}

// Ikon mata terbuka (sandi tersembunyi) dan mata dicoret (sandi tampil)
const IKON_MATA = {
  buka: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.5 0-10-7-10-7a17.7 17.7 0 0 1 4.1-4.9M9.9 5.2A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M2 2l20 20"/></svg>',
};

// Tombol ikon mata untuk menampilkan atau menyembunyikan kata sandi
function aturTampilSandi() {
  document.querySelectorAll('[data-tampil-sandi]').forEach((tombol) => {
    const input = document.getElementById(tombol.dataset.tampilSandi);
    const atur = (tampil) => {
      input.type = tampil ? 'text' : 'password';
      tombol.innerHTML = tampil ? IKON_MATA.tutup : IKON_MATA.buka;
      tombol.setAttribute('aria-label', tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      tombol.setAttribute('aria-pressed', String(tampil));
    };
    atur(false);
    tombol.addEventListener('click', () => atur(input.type === 'password'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-form-auth]').forEach(aturForm);
  aturTampilSandi();
});
