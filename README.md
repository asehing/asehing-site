# asehing-site — panduan editor

Situs dikelola lewat **Pages CMS** (https://app.pagescms.org, login GitHub → repo `asehing-site`).
Setiap **Save** = satu commit di GitHub → Vercel build ulang → situs berubah ±1–2 menit kemudian.

## Menu
| Menu | Isi |
|---|---|
| Work | Project portofolio (kartu galeri + halaman detail) |
| Thoughts | Artikel |
| Home page | Teks halaman utama |
| Contact page | Teks & tombol booking |
| Social links | Link X, Instagram, Dribbble, Behance, LinkedIn (Home + Contact) |

## Aturan penting
- **Jangan ganti slug** project/artikel yang sudah tayang — URL lamanya mati.
- Project baru **wajib punya cover image**. Kategori hanya: Graphic Design, UIX, Social Media Design, Exploration, Case Study.
- Gambar: lebar maksimal ±2000px (kompres dulu, mis. dengan squoosh.app).
- Isi case study per project belum bisa diedit dari CMS.

## Mencoba perubahan sebelum tayang (pratinjau)
1. Di Pages CMS, pilih branch **draft** di pojok atas (buat dari `main` lewat GitHub bila belum ada).
2. Edit & Save seperti biasa — hanya branch `draft` yang berubah, situs utama aman.
3. Vercel otomatis membuat **Preview Deployment** untuk branch `draft`
   (Vercel → project `asehing` → Deployments → klik deploy `draft` → Visit).
4. Puas? Buka PR `draft` → `main` di GitHub dan **Merge** → situs utama berubah.

## Bila build gagal
Situs tetap menampilkan versi sebelumnya. Aktifkan notifikasi supaya langsung tahu:
Vercel → Settings → Notifications → **Deployment Failed** (email/Slack). Pesan error build menyebut
file dan penyebabnya (mis. `work/xxx: unknown category`).

## Untuk pengembang
```bash
npm install
npm run build        # menghasilkan ./dist
npx serve dist       # pratinjau lokal
```
- `build.mjs` — orkestrasi build · `work-cms.mjs`/`framercms.mjs` — tulis data CMS biner Framer untuk Work
- `render.mjs` — halaman Thoughts · `content/pages/*.yml` — teks Home/Contact/Social
