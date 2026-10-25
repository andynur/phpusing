# What phpusing Never Does / Yang Tidak Pernah Dilakukan phpusing

These promises are product boundaries, not marketing. Code that breaks one is a bug.

Janji berikut adalah batas produk, bukan pesan pemasaran. Kode yang melanggarnya adalah bug.

## English

### We never attack
- We never send exploit payloads, fuzz inputs, submit forms or try logins.
- We only send a small, limited number of read-only requests (at most 60 per check).
- We never try to confirm a vulnerability by triggering it.

### We never scan behind your back
- A check starts only when you click it, on the site in your current tab.
- We never crawl, schedule, monitor or scan lists of sites.
- You confirm you own or may test each site, and Chrome asks you to allow that one site.

### We never take your data
- No account, no server, no analytics, no tracking.
- Results stay in your browser and disappear when you close it.
- Vulnerability data is downloaded as one whole file, so nobody learns what your site runs.

### We never spread your secrets
- If your `.env` or backup is public, we tell you it is public. We never show, save or send its contents.

### We never promise "safe"
- An outside check cannot see everything. Our best result is "no critical issues found in what we can see".

## Bahasa Indonesia

### Kami tidak pernah menyerang
- Tidak mengirim payload exploit, fuzzing, mengisi form, atau mencoba login.
- Hanya mengirim sedikit request baca-saja yang dibatasi (maksimal 60 per pemeriksaan).
- Tidak pernah memastikan celah dengan cara memicunya.

### Kami tidak pernah memeriksa diam-diam
- Pemeriksaan hanya berjalan saat Anda mengekliknya, pada situs di tab yang sedang terbuka.
- Tidak ada crawling, jadwal, pemantauan, atau pemeriksaan daftar situs.
- Anda menyatakan memiliki atau berwenang menguji setiap situs, dan Chrome meminta izin untuk situs itu saja.

### Kami tidak pernah mengambil data Anda
- Tanpa akun, tanpa server, tanpa analitik, tanpa pelacakan.
- Hasil hanya ada di browser Anda dan hilang saat browser ditutup.
- Data kerentanan diunduh utuh dalam satu file, sehingga tidak ada yang tahu teknologi situs Anda.

### Kami tidak pernah menyebarkan rahasia Anda
- Jika `.env` atau backup Anda terbuka untuk publik, kami hanya memberi tahu bahwa file itu terbuka. Isinya tidak pernah ditampilkan, disimpan, atau dikirim.

### Kami tidak pernah menjanjikan "aman"
- Pemeriksaan dari luar tidak bisa melihat semuanya. Hasil terbaik kami adalah "tidak ditemukan masalah kritis pada bagian yang terlihat".
