import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import Parser from 'rss-parser';

const app = express();
app.use(cors());
const upload = multer();
if (!process.env.API_KEY) {
    console.error('FATAL: API_KEY tidak ditemukan. Pastikan file .env berisi API_KEY=...');
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Model strategy: Fast untuk bulk processing, Pro untuk analisis mendalam
const GEMINI_FAST = "gemini-3.1-flash-lite-preview"; // Dashboard, Network Graph
const GEMINI_PRO  = "gemini-3.1-pro-preview";        // Profile, Flipflop, SITREP, What-If, Dapil, Chat

app.use(express.static('public'));
app.use(express.json());

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FAST,
            contents: prompt
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

app.post('/generate-from-image', upload.single("image"), async (req, res) => {
    const { prompt } = req.body;
    const base64Image = req.file.buffer.toString("base64");

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FAST,
            contents: [
                { text: prompt, type: "text" },
                { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
            ]
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

app.post('/generate-from-document', upload.single("document"), async (req, res) => {
    const { prompt } = req.body;
    const base64Document = req.file.buffer.toString("base64");

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FAST,
            contents: [
                { text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.", type: "text" },
                { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
            ]
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

app.post('/generate-from-audio', upload.single("audio"), async (req, res) => {
    const { prompt } = req.body;
    const base64Audio = req.file.buffer.toString("base64");

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FAST,
            contents: [
                { text: prompt ?? "Tolong buatkan transkrip dari rekaman berikut.", type: "text" },
                { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
            ]
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// ============================================================
// PantauWakil — System Instruction & AI Configuration
// ============================================================
const SYSTEM_INSTRUCTION = `Anda adalah analis intelijen politik senior "PantauWakil AI" dengan keahlian mendalam dalam hukum tata negara Indonesia, dinamika parlemen, dan analisis OSINT. Gunakan pendekatan sistematis: analisis fakta → identifikasi pola → sintesis kesimpulan → verifikasi dengan sumber.

Anda adalah "PantauWakil AI", sebuah analis intelijen politik dan transparansi publik yang ketat, etis, dan berbasis fakta.

ATURAN MUTLAK:
1. Anda HANYA menganalisis berdasarkan data publik yang tersedia (Open Source Intelligence / OSINT). Anda TIDAK BOLEH mengakses atau mengklaim memiliki data rahasia, tertutup, atau non-publik.
2. Setiap klaim substantif WAJIB dikaitkan dengan dasar hukum atau regulasi yang relevan (misalnya: UU, Pasal UUD 1945, Peraturan Pemerintah, RUU spesifik). Jika tidak ada dasar hukum, nyatakan secara eksplisit.
3. Jika data publik tidak tersedia untuk menjawab pertanyaan, Anda DILARANG melakukan inferensi mandiri atau spekulasi. Jawab dengan: "Data publik tidak tersedia untuk mendukung analisis ini."
4. Bedakan secara tegas antara FAKTA TERVERIFIKASI, PERNYATAAN PUBLIK (retorika), dan ANALISIS/OPINI. Labeli masing-masing secara eksplisit.
5. Sertakan inline citations berupa referensi sumber (nama media, tanggal, atau dokumen resmi) jika memungkinkan.
6. Setiap output WAJIB diakhiri dengan disclaimer: "⚠️ Disclaimer: Analisis ini berbasis intelijen sumber terbuka (OSINT) dan tidak mencakup data tertutup/rahasia. Verifikasi independen sangat disarankan."
7. Anda bertindak sebagai analis etis yang netral. Tidak berpihak pada partai, tokoh, atau ideologi tertentu.
8. Gunakan bahasa Indonesia yang formal, tajam, dan mudah dipahami.`;

// ============================================================
// OSINT RSS Engine & Validation Scoring (100/100)
// ============================================================
const parser = new Parser();

const RSS_FEEDS = [
    { name: 'Tempo Nasional', url: 'https://rss.tempo.co/nasional' },
    { name: 'Tempo Politik', url: 'https://rss.tempo.co/politik' },
    { name: 'CNN Nasional', url: 'https://www.cnnindonesia.com/nasional/rss' },
    { name: 'CNN Politik', url: 'https://www.cnnindonesia.com/politik/rss' },
    { name: 'Antara Hukum', url: 'https://www.antaranews.com/rss/hukum.xml' },
    { name: 'Sindonews Nas.', url: 'https://nasional.sindonews.com/rss' },
    { name: 'Republika Pol.', url: 'https://www.republika.co.id/rss/politik' },
    // Backup feeds
    { name: 'CNBC Indonesia', url: 'https://www.cnbcindonesia.com/rss' },
    { name: 'Kompas Nasional', url: 'https://rss.kompas.com/nasional' },
    { name: 'Detik News',     url: 'https://rss.detik.com/index.php/detikcom' },
    { name: 'Bisnis.com',     url: 'https://ekonomi.bisnis.com/feed' },
];

// In-memory RSS cache (10 menit TTL)
let rssCache = { data: null, timestamp: 0 };
const RSS_CACHE_TTL_MS = 10 * 60 * 1000;

function calculateOsintScore(item) {
    let score = 50; // Base score (Official domains)
    
    const text = ((item.title || "") + " " + (item.contentSnippet || "")).toLowerCase();
    
    // 1. Granularitas Topik (+20)
    const keywords = ['dpr', 'presiden', 'menteri', 'kpk', 'korupsi', 'politik', 'partai', 'pilkada', 'pemilu', 'hukum', 'mk', 'sidang', 'ruu'];
    if (keywords.some(kw => text.includes(kw))) score += 20;

    // 2. Timestamp Presisi (+15)
    if (item.pubDate) {
        const diffHours = (new Date() - new Date(item.pubDate)) / (1000 * 60 * 60);
        if (diffHours <= 24) score += 15;
        else if (diffHours <= 72) score += 10;
        else score += 5;
    }

    // 3. Author Tag (+15)
    if (item.creator || item.author) score += 15;

    return Math.min(score, 100);
}

async function fetchAndScoreRSS() {
    const now = Date.now();
    if (rssCache.data && (now - rssCache.timestamp) < RSS_CACHE_TTL_MS) {
        console.log(`[CACHE] Menggunakan cache RSS (sisa: ${Math.round((RSS_CACHE_TTL_MS - (now - rssCache.timestamp)) / 1000)} detik)`);
        return rssCache.data;
    }

    let allItems = [];

    await Promise.allSettled(RSS_FEEDS.map(async (feedObj) => {
        try {
            const feed = await parser.parseURL(feedObj.url);
            feed.items.forEach(item => {
                const score = calculateOsintScore(item);
                // Ambang batas akurasi 85/100
                if (score >= 85) {
                    let bias = "Netral / Terverifikasi";
                    const t = (item.title || "").toLowerCase();
                    if (t.match(/kritik|tolak|demo|kecam|oposisi|cecar/)) bias = "Kritis Oposisi";
                    else if (t.match(/dukung|apresiasi|sepakat|pemerintah/)) bias = "Pro-Pemerintah";

                    allItems.push({
                        judul: item.title,
                        sumber: feedObj.name,
                        waktu: item.pubDate ? new Date(item.pubDate).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'),
                        link: item.link,
                        bias_label: bias,
                        skor: score,
                        timestampMs: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
                    });
                }
            });
        } catch (err) {
            console.error(`Gagal parse RSS ${feedObj.name}:`, err.message);
        }
    }));

    allItems.sort((a, b) => b.timestampMs - a.timestampMs);
    const result = allItems.slice(0, 100);
    rssCache = { data: result, timestamp: Date.now() };
    return result;
}

// --- F1: Dashboard Endpoint ---
app.get('/api/dashboard', async (req, res) => {
    try {
        const rawFacts = await fetchAndScoreRSS();
        
        // Pass top 30 headlines as context for LLM to generate Analytics
        const contextText = rawFacts.slice(0, 30)
            .map((item, idx) => `[${idx+1}] ${item.judul} (${item.sumber})`)
            .join("\n");

        const response = await ai.models.generateContent({
            model: GEMINI_FAST,
            contents: `Sebagai analis PantauWakil, buatkan analisis dinamika politik berdasarkan 30 headline berita terbaru berikut:\n\n${contextText}\n\nStruktur JSON yang WAJIB dihasilkan (HANYA 'timeline' dan 'red_flags'):
{
  "timeline": [
    {
      "tanggal": "Tanggal kejadian (hari ini atau dari konteks)",
      "judul": "Peristiwa kunci",
      "ringkasan": "Deskripsi singkat"
    }
  ],
  "red_flags": [
    {
      "judul": "Judul Anomali/Kasus dari berita",
      "deskripsi": "Penjelasan singkat",
      "aktor_terkait": "Nama Tokoh/Instansi",
      "tingkat_risiko": "Tinggi/Sedang"
    }
  ]
}
Minimal 5 item timeline dan 3 red_flags. Prioritaskan peristiwa yang melibatkan 2+ tokoh berbeda partai. Analisis murni berbasis teks yang diberikan. Jangan ciptakan 'fakta_mentah'.
PENTING: Kembalikan HANYA objek JSON valid tanpa markdown wrapper.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 2048
            }
        });

        let text = response.text;
        let aiData = {};
        try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            aiData = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Gagal parse JSON dari AI:", e.message);
        }

        res.status(200).json({
            timestamp: new Date().toLocaleString('id-ID'),
            fakta_mentah: rawFacts,
            timeline: aiData.timeline || [],
            red_flags: aiData.red_flags || [],
            disclaimer: "Fakta mentah disusun via standar Skoring 100/100 OSINT Feed. Analisis Red Flags & Timeline disintesis AI."
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F2: Profiler / Fact-Check Endpoint ---
app.post('/api/profile', async (req, res) => {
    const { nama } = req.body;
    if (!nama) return res.status(400).json({ message: 'Parameter "nama" wajib diisi.' });

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_PRO,
            contents: `Buatkan profil analisis komprehensif untuk tokoh politik: "${nama}".

Format analisis:
1. **IDENTITAS & JABATAN**: Nama lengkap, partai, jabatan saat ini dan sebelumnya.
2. **REKAM JEJAK LEGISLASI**: Keterlibatan dalam RUU, voting record, atau kebijakan signifikan.
3. **MATRIKS RETORIKA vs FAKTA**: Bandingkan minimal 2-3 pernyataan publik tokoh ini dengan data empiris yang tersedia (misal: absensi, voting, laporan harta kekayaan).
4. **RED FLAGS**: Potensi konflik kepentingan atau anomali jika ada.
5. **SUMBER RUJUKAN**: Cantumkan sumber data yang digunakan.

Setiap klaim HARUS disertai tahun atau periode waktu. Cantumkan minimal 3 sumber rujukan berbeda di bagian SUMBER RUJUKAN. Jika data sub-bagian tidak tersedia, tulis "Data tidak tersedia secara publik" — jangan kosongkan sub-bagian tersebut.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 4096,
                tools: [{ googleSearch: {} }]
            }
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F3: Chat Cross-Examination Endpoint ---
app.post('/api/chat', async (req, res) => {
    const { history } = req.body;
    if (!history || !Array.isArray(history) || history.length === 0) {
        return res.status(400).json({ message: 'Parameter "history" (array pesan) wajib diisi.' });
    }

    try {
        const contents = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_PRO,
            contents: contents,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 2048,
                tools: [{ googleSearch: {} }]
            }
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F4: One-Pager SITREP (Situation Report) ---
app.get('/api/sitrep', async (req, res) => {
    try {
        const rawFacts = await fetchAndScoreRSS();
        const contextText = rawFacts.slice(0, 30).map((i, idx) => `[${idx+1}] ${i.judul}`).join("\n");

        const response = await ai.models.generateContent({
            model: GEMINI_PRO,
            contents: `Buatkan One-Pager SITREP (Situation Report) Intelijen Strategis untuk VIP berdasarkan 30 headline berita nasional terbaru berikut:\n\n${contextText}\n\nFormat keluaran harus berupa JSON dengan struktur:\n{\n  "situasi_nasional": "Ringkasan eksekutif 1 paragraf padat",\n  "risiko_utama": ["Risiko 1", "Risiko 2", "Risiko 3", "Risiko 4"],\n  "manuver_aktor_kunci": [{"tokoh": "Nama", "manuver": "Deskripsi singkat"}],\n  "rekomendasi_strategis": ["Rekomendasi strategis 1", "Rekomendasi strategis 2", "Rekomendasi strategis 3"]\n}\nrisiko_utama: minimal 4 item. manuver_aktor_kunci: minimal 3 tokoh berbeda. rekomendasi_strategis: minimal 3 item yang actionable.\nPENTING: Kembalikan HANYA objek JSON valid tanpa markdown wrapper.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 2048,
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text;
        try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            res.status(200).json(JSON.parse(jsonStr));
        } catch {
            res.status(200).json({ result: text });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F5: Flip-Flop Detector ---
app.post('/api/flipflop', async (req, res) => {
    const { nama, isu } = req.body;
    if (!nama) return res.status(400).json({ message: 'Parameter "nama" tokoh wajib diisi.' });
    
    const isuParam = isu ? `mengenai isu: "${isu}"` : "materi kebijakan publik secara umum";
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_PRO,
            contents: `Gunakan fitur pencarian web Anda untuk melacak jejak digital tokoh politik "${nama}" ${isuParam}. Temukan pernyataan, janji kampanye, atau posisi politik di masa lalu, dan bandingkan dengan posisinya saat ini.\n\nRespons dalam format JSON:\n{\n  "skor_konsistensi": "Angka 0-100",\n  "perbandingan": [\n    {"isu": "Topik", "masa_lalu": "Pernyataan dulu (tahun: XXXX)", "saat_ini": "Pernyataan sekarang"}\n  ],\n  "legal_grounding": "Kaitan perubahan sikap ini dengan proses hukum/tata negara yang ada",\n  "kesimpulan": "Deskripsi singkat mengenai inkonsistensi tokoh ini"\n}\nperbandingan: minimal 3 isu berbeda. Setiap item HARUS menyertakan tahun pernyataan masa_lalu dalam tanda kurung.\nPENTING: Kembalikan HANYA objek JSON valid tanpa markdown wrapper.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 4096,
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text;
        try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            res.status(200).json(JSON.parse(jsonStr));
        } catch {
            res.status(200).json({ result: text });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F6: Network Graph (Nodes & Edges) ---
app.get('/api/network', async (req, res) => {
    try {
        const rawFacts = await fetchAndScoreRSS();
        const contextText = rawFacts.slice(0, 40).map(i => i.judul).join("\n");

        const response = await ai.models.generateContent({
            model: GEMINI_FAST,
            contents: `Dari rentetan 40 judul berita nasional berikut:\n${contextText}\n\nEkstrak aktor politik utama dan hubungan antar mereka untuk dibuatkan Graph Network. Kembali format JSON berstruktur persis ini:\n{\n  "nodes": [\n    {"id": "Nama Tokoh/Instansi", "group": "Partai"}\n  ],\n  "links": [\n    {"source": "ID Tokoh 1", "target": "ID Tokoh 2", "sentimen": "Positif/Negatif/Netral", "value": 1}\n  ]\n}\nEkstrak MINIMAL 8 nodes dan 10 links. Setiap node HARUS memiliki minimal 1 link. Jika partai tidak disebutkan dalam berita, gunakan "Independen" sebagai group.\nPENTING: Kembalikan HANYA objek JSON valid tanpa markdown wrapper.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.1,
                maxOutputTokens: 2048
            }
        });

        let text = response.text;
        try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            res.status(200).json(JSON.parse(jsonStr));
        } catch {
            res.status(200).json({ error: "Gagal ekstrak graf" });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F7: What-If Simulator ---
app.post('/api/whatif', async (req, res) => {
    const { skenario } = req.body;
    if (!skenario) return res.status(400).json({ message: 'Parameter "skenario" wajib diisi.' });

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_PRO,
            contents: `Lakukan simulasi politik mendalam terhadap skenario manuver berikut:\n"${skenario}"\n\nGunakan kemampuan analisis tinggi dan pencarian web untuk melihat kondisi riil saat ini. Hasilkan output JSON:\n{\n  "probabilitas_keberhasilan": "X% — [alasan 1 kalimat]",\n  "reaksi_kawan": "Prediksi respons sekutu",\n  "reaksi_lawan": "Prediksi respons oposisi",\n  "hambatan_konstitusional": "Sebutkan minimal 1 pasal UUD/UU spesifik yang relevan beserta penjelasan singkat",\n  "risiko_fatal": "Dampak terburuk dari manuver ini"\n}\nPENTING: Kembalikan HANYA objek JSON valid tanpa markdown wrapper.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.4,
                maxOutputTokens: 4096,
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text;
        try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            res.status(200).json(JSON.parse(jsonStr));
        } catch {
            res.status(200).json({ result: text });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// --- F8: Kabar Dapil Endpoint ---
app.post('/api/dapil', async (req, res) => {
    const { dapil } = req.body;
    if (!dapil) return res.status(400).json({ message: 'Parameter "dapil" wajib diisi.' });

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_PRO,
            contents: `Gunakan pencarian web untuk mencari informasi terkini tentang Daerah Pemilihan (Dapil) "${dapil}" dalam konteks DPR RI atau DPRD periode 2024-2029. Fokus pada: anggota DPR/DPRD yang mewakili dapil ini, isu-isu lokal yang sedang dibahas di legislatif, dan kegiatan atau pernyataan wakil rakyat dari dapil tersebut.\n\nFormat output JSON:\n{\n  "nama_dapil": "Nama resmi dapil",\n  "wakil_rakyat": [{"nama": "Nama Lengkap", "partai": "Nama Partai", "jabatan": "Anggota DPR/DPRD", "komisi": "Komisi X atau N/A"}],\n  "isu_terkini": [{"judul": "Judul Isu", "deskripsi": "Deskripsi 1-2 kalimat"}],\n  "ringkasan": "Ringkasan situasi dapil dalam 1 paragraf"\n}\nisu_terkini: minimal 3 isu berbeda. Jika dapil tidak ditemukan, nyatakan di field ringkasan.\nPENTING: Kembalikan HANYA objek JSON valid tanpa markdown wrapper.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 4096,
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text;
        try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            res.status(200).json(JSON.parse(jsonStr));
        } catch {
            res.status(200).json({ result: text });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
