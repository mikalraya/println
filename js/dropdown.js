// Dropdown buatan sendiri untuk dashboard admin.
// Setiap <select> tetap ada (tersembunyi) sebagai sumber nilai, jadi kode lain tidak perlu diubah.
(() => {
  const IKON_PANAH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const IKON_CENTANG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const deskValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const deskIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  let terbuka = null; // fungsi penutup dropdown yang sedang terbuka
  let nomorUnik = 0;

  function buat(tag, kelas) {
    const el = document.createElement(tag);
    if (kelas) el.className = kelas;
    return el;
  }

  function pasang(select) {
    if (select.dataset.dd || select.multiple) return;
    select.dataset.dd = '1';
    const id = `dd-${++nomorUnik}`;

    const wadah = buat('div', `dd${select.classList.contains('adm-pilih') ? ' dd-kecil' : ''}`);
    const tombol = buat('button', 'dd-tombol');
    tombol.type = 'button';
    tombol.setAttribute('aria-haspopup', 'listbox');
    tombol.setAttribute('aria-expanded', 'false');
    tombol.setAttribute('aria-controls', id);
    const label = buat('span', 'dd-label');
    const panah = buat('span', 'dd-panah');
    panah.innerHTML = IKON_PANAH;
    tombol.append(label, panah);

    const daftar = buat('ul', 'dd-daftar');
    daftar.id = id;
    daftar.setAttribute('role', 'listbox');
    daftar.tabIndex = -1;
    daftar.hidden = true;

    select.before(wadah);
    wadah.append(select, tombol, daftar);
    select.classList.add('dd-asli');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    // Nama tombol untuk pembaca layar: ikut <label for=...> atau aria-label bawaan select
    const labelTeks = select.id && document.querySelector(`label[for="${select.id}"]`);
    if (labelTeks) {
      if (!labelTeks.id) labelTeks.id = `${id}-label`;
      label.id = `${id}-nilai`;
      tombol.setAttribute('aria-labelledby', `${labelTeks.id} ${id}-nilai`);
    } else if (select.getAttribute('aria-label')) {
      tombol.setAttribute('aria-label', select.getAttribute('aria-label'));
    }

    let aktif = -1; // indeks opsi yang disorot
    let ketik = '';
    let waktuKetik = 0;

    const opsi = () => [...select.options];

    function tandai() {
      const terpilih = select.selectedIndex;
      const o = select.options[terpilih];
      label.textContent = o ? o.textContent : '';
      // Filter dengan nilai kosong (mis. "Semua") dianggap belum menyaring
      wadah.classList.toggle('dd-aktif', Boolean(o && o.value !== '' && select.closest('.adm-saring')));
      [...daftar.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === terpilih)));
    }

    function segarkan() {
      daftar.replaceChildren();
      opsi().forEach((o, i) => {
        const li = buat('li', 'dd-opsi');
        li.setAttribute('role', 'option');
        li.id = `${id}-o${i}`;
        li.dataset.i = String(i);
        const teks = buat('span', 'dd-teks');
        teks.textContent = o.textContent;
        const cek = buat('span', 'dd-cek');
        cek.innerHTML = IKON_CENTANG;
        li.append(teks, cek);
        if (o.disabled) li.setAttribute('aria-disabled', 'true');
        daftar.append(li);
      });
      tandai();
    }

    function sorot(i, gulir = true) {
      const semua = [...daftar.children];
      if (!semua.length) return;
      aktif = Math.max(0, Math.min(semua.length - 1, i));
      semua.forEach((li, n) => li.classList.toggle('dd-sorot', n === aktif));
      daftar.setAttribute('aria-activedescendant', semua[aktif].id);
      if (gulir) semua[aktif].scrollIntoView({ block: 'nearest' });
    }

    // Daftar memakai posisi fixed agar tidak terpotong dialog atau tabel
    function letakkan() {
      const r = tombol.getBoundingClientRect();
      const tinggiIdeal = Math.min(daftar.scrollHeight, 288);
      const bawah = window.innerHeight - r.bottom - 12;
      const atas = r.top - 12;
      const keAtas = bawah < tinggiIdeal && atas > bawah;
      daftar.style.minWidth = `${r.width}px`;
      daftar.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8))}px`;
      daftar.style.maxHeight = `${Math.max(120, Math.min(288, keAtas ? atas : bawah))}px`;
      if (keAtas) {
        daftar.style.top = 'auto';
        daftar.style.bottom = `${window.innerHeight - r.top + 6}px`;
      } else {
        daftar.style.bottom = 'auto';
        daftar.style.top = `${r.bottom + 6}px`;
      }
    }

    function tutup(balikFokus = false) {
      if (daftar.hidden) return;
      daftar.hidden = true;
      tombol.setAttribute('aria-expanded', 'false');
      wadah.classList.remove('dd-buka');
      if (terbuka === tutup) terbuka = null;
      if (balikFokus === true) tombol.focus();
    }

    function buka() {
      if (select.disabled || !daftar.hidden) return;
      if (terbuka) terbuka();
      daftar.hidden = false;
      tombol.setAttribute('aria-expanded', 'true');
      wadah.classList.add('dd-buka');
      letakkan();
      sorot(select.selectedIndex);
      terbuka = tutup;
    }

    function pilih(i) {
      const o = select.options[i];
      if (!o || o.disabled) return;
      const berubah = select.selectedIndex !== i;
      deskIndex.set.call(select, i);
      tandai();
      tutup(true);
      if (berubah) {
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    tombol.addEventListener('click', () => (daftar.hidden ? buka() : tutup()));

    daftar.addEventListener('click', (e) => {
      const li = e.target.closest('.dd-opsi');
      if (li) pilih(Number(li.dataset.i));
    });
    daftar.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.dd-opsi');
      if (li && Number(li.dataset.i) !== aktif) sorot(Number(li.dataset.i), false);
    });
    // Tombol tetap berfokus saat klik di dalam daftar
    daftar.addEventListener('mousedown', (e) => e.preventDefault());

    tombol.addEventListener('keydown', (e) => {
      const terbukaSkrg = !daftar.hidden;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (terbukaSkrg) sorot(aktif + 1); else buka();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (terbukaSkrg) sorot(aktif - 1); else buka();
          break;
        case 'Home':
          if (terbukaSkrg) { e.preventDefault(); sorot(0); }
          break;
        case 'End':
          if (terbukaSkrg) { e.preventDefault(); sorot(opsi().length - 1); }
          break;
        case 'Enter':
        case ' ':
          if (terbukaSkrg) { e.preventDefault(); pilih(aktif); }
          break;
        case 'Escape':
          // Esc menutup dropdown saja, bukan dialog di belakangnya
          if (terbukaSkrg) { e.preventDefault(); e.stopPropagation(); tutup(true); }
          break;
        case 'Tab':
          tutup();
          break;
        default:
          // Ketik huruf awal untuk loncat ke pilihan
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const sekarang = Date.now();
            ketik = sekarang - waktuKetik > 700 ? e.key.toLowerCase() : ketik + e.key.toLowerCase();
            waktuKetik = sekarang;
            const cocok = opsi().findIndex((o) => o.textContent.trim().toLowerCase().startsWith(ketik));
            if (cocok >= 0) {
              if (terbukaSkrg) sorot(cocok); else pilih(cocok);
            }
          }
      }
    });

    // Klik <label> atau focus() pada select asli dialihkan ke tombol
    select.addEventListener('focus', () => tombol.focus());

    // Nilai diubah lewat kode (select.value = ...) harus ikut tampil
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() { return deskValue.get.call(this); },
      set(v) { deskValue.set.call(this, v); tandai(); },
    });
    Object.defineProperty(select, 'selectedIndex', {
      configurable: true,
      get() { return deskIndex.get.call(this); },
      set(v) { deskIndex.set.call(this, v); tandai(); },
    });
    if (select.form) select.form.addEventListener('reset', () => setTimeout(tandai, 0));

    // Opsi diganti lewat kode (mis. kategori dari data) -> bangun ulang daftar
    new MutationObserver(segarkan).observe(select, { childList: true, subtree: true, characterData: true });
    segarkan();
  }

  function pasangSemua(akar = document) {
    akar.querySelectorAll('select').forEach(pasang);
  }

  // Tutup saat klik di luar, layar digulir, atau ukuran jendela berubah
  document.addEventListener('mousedown', (e) => {
    if (terbuka && !e.target.closest('.dd')) terbuka();
  });
  window.addEventListener('resize', () => { if (terbuka) terbuka(); });
  window.addEventListener('scroll', (e) => {
    if (terbuka && !(e.target instanceof Element && e.target.closest('.dd-daftar'))) terbuka();
  }, true);

  pasangSemua();
  // Select yang dibuat belakangan (mis. pilihan role di tabel pengguna)
  new MutationObserver((catatan) => {
    catatan.forEach((c) => c.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.matches('select')) pasang(n); else pasangSemua(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });
})();
