# Spin Challenge Panitia

Web sederhana untuk panitia memilih nama sendiri lalu roll salah satu dari
3 challenge yang sudah ditentukan. Tidak pakai backend/database — semua
data challenge disimpan di satu file, jadi bisa langsung di-host gratis
lewat GitHub Pages.

## Struktur folder

```
spin-challenge/
├── index.html          # Halaman utama
├── css/
│   └── style.css        # Semua styling
├── js/
│   ├── data.js           # DATA CHALLENGE — edit file ini untuk update
│   └── script.js         # Logic roster & mekanisme roll
└── README.md
```

## Cara edit challenge (kamu sebagai admin)

Buka `js/data.js`, edit array `PANITIA`. Setiap panitia wajib punya
tepat 3 challenge:

```js
{
  name: "Nama Panitia",
  challenges: [
    "Challenge pertama",
    "Challenge kedua",
    "Challenge ketiga",
  ],
},
```

Tambah/hapus panitia dengan menambah/menghapus objek di dalam array.
Setelah edit, commit + push — kalau sudah di-deploy ke GitHub Pages,
web otomatis ter-update dalam beberapa menit.

## Cara deploy ke GitHub Pages (gratis)

1. Buat repository baru di GitHub, lalu push folder ini ke repo tersebut:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
2. Di GitHub, buka repo → **Settings** → **Pages**.
3. Pada **Source**, pilih branch `main` dan folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit, link web akan muncul di halaman yang sama, formatnya:
   `https://USERNAME.github.io/NAMA-REPO/`
5. Bagikan link itu ke panitia lain.

## Catatan

- Tidak ada login/role. Siapa pun yang buka link bisa pilih nama mana pun
  dan roll — sesuai kebutuhan (panitia pilih nama sendiri).
- Untuk update challenge, cukup edit `js/data.js` lalu push ulang. Tidak
  perlu halaman admin terpisah karena hanya kamu yang mengedit.
- Kalau nanti butuh histori siapa sudah roll apa, atau proteksi supaya
  1 nama cuma bisa roll sekali, itu butuh backend + database — bisa
  dikembangkan lebih lanjut dari versi ini.
