# PantauWakil — AI Political Intelligence Platform

> Platform Intelijen Politik & Transparansi Publik Indonesia berbasis AI
> **v1.1.1** · Node.js · Google Gemini AI · D3.js

---

## Tentang Proyek

**PantauWakil** adalah platform intelijen politik open-source yang memanfaatkan AI (Google Gemini) untuk memantau, menganalisis, dan memvisualisasikan dinamika politik Indonesia secara real-time. Data bersumber dari 11 RSS feed berita nasional yang diskor menggunakan sistem validasi OSINT 100/100.

Platform ini dirancang untuk masyarakat, jurnalis, dan peneliti yang ingin memahami lanskap politik Indonesia dengan lebih transparan dan berbasis data.

---

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Dashboard OSINT Real-Time** | Agregasi & skoring otomatis dari 11 RSS feed nasional, tampil dalam sidebar fakta mentah |
| **Profiler Tokoh Politik** | Analisis mendalam profil, rekam jejak legislasi, dan matriks retorika vs fakta |
| **SITREP Executive** | One-pager Situation Report intelijen strategis berbasis headline terkini |
| **Radar Flip-Flop** | Deteksi inkonsistensi pernyataan tokoh dari masa lalu ke kini, lengkap dengan skor konsistensi |
| **What-If Simulator** | Simulasi manuver politik dengan prediksi probabilitas, reaksi koalisi, dan hambatan konstitusional |
| **Network Graph D3.js** | Visualisasi interaktif konstelasi relasi antar aktor politik (force-directed graph) |
| **Kabar Dapil** | Informasi wakil rakyat, komisi, dan isu terkini per Daerah Pemilihan (DPR/DPRD 2024-2029) |
| **Red Flags & Timeline** | Peringatan dini anomali integritas dan kronologi dinamika politik harian |

---

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js v5
- **AI Engine:** Google Gemini (`gemini-3.1-flash-lite-preview` & `gemini-3.1-pro-preview`)
- **RSS Parsing:** rss-parser
- **Visualisasi:** D3.js v7 (Force-Directed Graph)
- **Frontend:** Vanilla HTML/CSS/JS (Single Page Application)
- **Lainnya:** dotenv, multer, cors

---

## Prerequisites

- **Node.js** versi 18 atau lebih baru
- **API Key** dari [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Instalasi & Setup

```bash
# 1. Clone repositori
git clone <url-repo>
cd PantauWakil

# 2. Install dependensi
npm install

# 3. Buat file .env
cp .env.example .env   # atau buat manual (lihat bagian Konfigurasi)

# 4. Jalankan server
node index.js
```

Buka browser dan akses: **http://localhost:3000**

---

## Konfigurasi `.env`

Buat file `.env` di root proyek dengan isi berikut:

```env
API_KEY=your_google_gemini_api_key_here
PORT=3000
```

> **Penting:** File `.env` sudah masuk `.gitignore`. Jangan pernah commit API key ke repository.

---

## API Endpoints

### Endpoint Utama (PantauWakil)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/dashboard` | Ambil data OSINT + timeline + red_flags (AI-generated) |
| `POST` | `/api/profile` | Profil analisis tokoh politik |
| `GET` | `/api/sitrep` | One-pager SITREP intelijen strategis |
| `POST` | `/api/flipflop` | Deteksi inkonsistensi pernyataan tokoh |
| `GET` | `/api/network` | Ekstrak nodes & edges relasi aktor untuk graf |
| `POST` | `/api/whatif` | Simulasi manuver politik |
| `POST` | `/api/dapil` | Informasi Daerah Pemilihan |
| `POST` | `/api/chat` | Chat berbasis riwayat percakapan |

#### Contoh Request Body

```json
// POST /api/profile
{ "nama": "Prabowo Subianto" }

// POST /api/flipflop
{ "nama": "Anies Baswedan", "isu": "reklamasi" }

// POST /api/whatif
{ "skenario": "PKS dan PDIP membentuk koalisi oposisi" }

// POST /api/dapil
{ "dapil": "Jawa Barat I" }

// POST /api/chat
{ "history": [{ "role": "user", "text": "Apa itu hak angket?" }] }
```

### Endpoint Generik (Warisan)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/generate-text` | Generate teks dari prompt |
| `POST` | `/generate-from-image` | Generate dari gambar (multipart) |
| `POST` | `/generate-from-document` | Generate dari dokumen (multipart) |
| `POST` | `/generate-from-audio` | Generate dari audio (multipart) |

---

## Strategi Model AI

Dua model Gemini digunakan untuk keseimbangan kecepatan vs. kedalaman analisis:

| Konstanta | Model | Digunakan Untuk |
|-----------|-------|----------------|
| `GEMINI_FAST` | `gemini-3.1-flash-lite-preview` | `/api/dashboard`, `/api/network` (bulk processing) |
| `GEMINI_PRO` | `gemini-3.1-pro-preview` | `/api/profile`, `/api/sitrep`, `/api/flipflop`, `/api/whatif`, `/api/dapil`, `/api/chat` (analisis mendalam) |

Semua endpoint Pro menggunakan **Google Search Grounding** untuk akurasi data real-time.

---

## Sistem Skoring OSINT (100/100)

Setiap artikel RSS diskor sebelum masuk ke dashboard. Hanya artikel dengan skor ≥ 85 yang ditampilkan.

| Komponen | Poin | Kondisi |
|----------|------|---------|
| Base Score | +50 | Semua artikel dari feed resmi |
| Topik Relevan | +20 | Mengandung kata kunci politik (dpr, presiden, menteri, kpk, korupsi, pemilu, dst.) |
| Timestamp ≤ 24 jam | +15 | Artikel sangat baru |
| Timestamp ≤ 72 jam | +10 | Artikel relatif baru |
| Timestamp > 72 jam | +5 | Artikel lebih lama |
| Author Tag | +15 | Feed menyertakan tag `creator` / `author` |

**Cache:** Hasil RSS di-cache selama **10 menit** untuk efisiensi.

---

## Sumber RSS Feed

11 feed berita nasional yang dipantau:

- Tempo Nasional & Politik
- CNN Indonesia Nasional & Politik
- Antara Hukum
- Sindonews Nasional
- Republika Politik
- CNBC Indonesia
- Kompas Nasional
- Detik News
- Bisnis.com

---

## Struktur Proyek

```
PantauWakil/
├── index.js          # Server utama (Express + Gemini AI + RSS Engine)
├── package.json
├── .env              # Konfigurasi (tidak di-commit)
├── .gitignore
└── public/
    ├── index.html    # Single Page Application
    ├── script.js     # Frontend logic (D3.js, fetch, DOM)
    └── style.css     # Styling
```

---

## Changelog

### v1.1.1 — Maret 2026
- Upgrade ke Gemini 3.1 (dual-model strategy: Flash Lite + Pro Preview)
- Prompt engineering upgrade: `maxOutputTokens`, Chain-of-Thought, JSON enforcement
- Fitur Kabar Dapil aktif dengan Google Search Grounding
- Cache RSS 10 menit, 4 sumber berita backup tambahan
- Klik node Network Graph → buka Profiler otomatis
- Skor OSINT ditampilkan per artikel, tombol Reset View pada graf
- Loading skeleton sidebar, artikel & transparansi sumber bisa diklik

### v1.1.0 — Enterprise Intel
- SITREP Executive Report
- Radar Flip-Flop Detector
- What-If Political Simulator
- D3.js Network Graph dengan zoom, drag, dan legenda warna partai

### v1.0.0 — Rilis Awal
- Dashboard OSINT dari 7 RSS feed nasional
- Sistem skoring validasi berita 100/100
- Profiler tokoh politik
- Red Flags & Timeline berbasis AI
- Terminal loading dengan efek typewriter

---

## Author

Dibuat oleh **[@kunc_pro](https://www.instagram.com/kunc_pro)**

---

> **Disclaimer:** PantauWakil beroperasi berbasis Open Source Intelligence (OSINT) — hanya data publik. Tidak mengakses atau mengklaim data tertutup/rahasia. Verifikasi independen sangat disarankan.
