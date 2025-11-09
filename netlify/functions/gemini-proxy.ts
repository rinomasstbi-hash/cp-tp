import { GoogleGenAI, Type } from "@google/genai";
import { TPGroup, TPData, ATPTableRow, PROTARow, ATPData, KKTPRow } from "../../types";

// Helper untuk mengirim respons standar
const sendResponse = (statusCode: number, body: any) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Izinkan permintaan dari domain manapun
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
});

// Helper untuk menangani error
const sendError = (statusCode: number, message: string) => {
    console.error("Proxy Error:", message);
    return sendResponse(statusCode, { error: message });
};

// Impor fungsi-fungsi dari geminiService, kita akan memindahkannya ke sini
// dan menyesuaikannya untuk lingkungan serverless.
// Catatan: Impor ini tidak berfungsi di runtime, ini hanya untuk referensi.
// Logika akan disalin langsung ke dalam handler.

export const handler = async (event: any) => {
    // Netlify Functions hanya mendukung metode POST untuk body
    if (event.httpMethod !== 'POST') {
        return sendError(405, 'Method Not Allowed');
    }

    const { action, payload } = JSON.parse(event.body);
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        return sendError(500, "Kunci API (API Key) untuk layanan AI tidak diatur di environment server. Silakan hubungi administrator sistem.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    try {
        switch (action) {
            case 'generateTPs':
                // Logika dari generateTPs di geminiService.ts dipindahkan ke sini
                const { cpElements, grade, additionalNotes } = payload;
                const cpElementsString = cpElements
                    .map((item: any, index: number) => `Elemen ${index + 1}: ${item.element}\\nCapaian Pembelajaran (CP) ${index + 1}: "${item.cp}"`)
                    .join('\\n\\n');

                const promptTP = `
                    Anda adalah seorang ahli desain kurikulum dan pakar pedagogi untuk sistem pendidikan Indonesia, khususnya untuk tingkat Madrasah Tsanawiyah (MTs).
                    Tugas Anda adalah melakukan dekomposisi materi dari Capaian Pembelajaran (CP) yang diberikan, lalu merumuskan Tujuan Pembelajaran (TP) yang sangat rinci dan berkualitas tinggi.
                    Konteks:
                    - Jenjang: Madrasah Tsanawiyah (MTs)
                    - Kelas: ${grade}
                    - Kumpulan Capaian Pembelajaran (CP) dan Elemen/Domain terkait:
                ${cpElementsString}
                    - Keterangan Tambahan dari Guru: "${additionalNotes}"
                    Instruksi Wajib (Ikuti dengan Seksama):
                    1.  **Analisis Materi & Semester:** Identifikasi topik-topik materi utama dari CP. Tentukan apakah setiap materi paling cocok diajarkan di semester Ganjil atau Genap.
                    2.  **DEKOMPOSISI KE SUB-MATERI:** Ini adalah langkah paling penting. Untuk setiap materi utama, pecah lagi menjadi beberapa sub-materi yang lebih spesifik dan logis. Ini akan memungkinkan pembuatan TP yang lebih banyak dan mendalam.
                    3.  **Pembuatan TP per Sub-Materi:** Untuk SETIAP sub-materi, uraikan menjadi 2, 3, atau lebih TP.
                    4.  **Progresi & HOTS:** Dalam lingkup setiap sub-materi, rancang TP secara berurutan. TP awal untuk pemahaman dasar, diikuti oleh TP untuk penerapan. Pastikan **satu atau dua TP terakhir** untuk setiap sub-materi adalah HOTS (level C4-C6 Taksonomi Bloom revisi).
                    5.  **Format ABCD:** Setiap TP HARUS ditulis dalam format ABCD (Audience, Behavior, Condition, Degree), diawali dengan "Murid dapat...". Contoh: "Murid dapat menganalisis (B) tiga perbedaan utama antara sel hewan dan sel tumbuhan (D) setelah melakukan pengamatan menggunakan mikroskop (C)."
                    6.  **Format Output JSON:** Hasilkan respons HANYA dalam format JSON yang valid. Strukturnya harus berupa array objek. Setiap objek merepresentasikan satu MATERI POKOK dan memiliki properti: "semester", "materi", dan "subMateriGroups". "subMateriGroups" adalah sebuah array objek, di mana setiap objek merepresentasikan satu SUB-MATERI dan memiliki properti "subMateri" dan "tps".
                    7.  **Aturan Escaping JSON:** Jika ada teks yang Anda hasilkan (terutama di dalam properti "tps") yang mengandung karakter kutip ganda ("), Anda WAJIB melakukan escaping dengan menambahkan backslash sebelumnya (contoh: \\"). Ini untuk memastikan output JSON selalu valid.
                    PENTING: Hasilkan HANYA output JSON yang valid tanpa teks pembuka, penutup, atau markdown.
                `;

                const responseTP = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: promptTP,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              semester: { type: Type.STRING },
                              materi: { type: Type.STRING },
                              subMateriGroups: {
                                type: Type.ARRAY,
                                items: {
                                  type: Type.OBJECT,
                                  properties: {
                                    subMateri: { type: Type.STRING },
                                    tps: {
                                      type: Type.ARRAY,
                                      items: { type: Type.STRING },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                    },
                });
                
                return sendResponse(200, { text: responseTP.text });

            case 'generateATP':
                 const tpData = payload as TPData;
                 const tpCodeMap = new Map<string, string>();
                 let materiPokokNumber = 1;
                 tpData.tpGroups.forEach(group => {
                     let tpCounterWithinGroup = 1;
                     group.subMateriGroups.forEach(subGroup => {
                         subGroup.tps.forEach(tpText => {
                             tpCodeMap.set(tpText, `${materiPokokNumber}.${tpCounterWithinGroup++}`);
                         });
                     });
                     materiPokokNumber++;
                 });

                 const sourceOfTruthData = tpData.tpGroups.flatMap(group => 
                     group.subMateriGroups.flatMap(subGroup => 
                         subGroup.tps.map(tp => ({
                             semester: group.semester,
                             materi: group.materi,
                             tpText: tp,
                             tpCode: tpCodeMap.get(tp) || 'N/A'
                         }))
                     )
                 );

                 const tpsForAI_ATP = sourceOfTruthData.map((d, index) => ({
                     index: index,
                     tp: d.tpText
                 }));

                 const promptATP = `
                    Anda adalah seorang ahli perancangan kurikulum dan pedagogi di Indonesia.
                    Tugas Anda adalah menyusun Alur Tujuan Pembelajaran (ATP) yang logis dari sekumpulan Tujuan Pembelajaran (TP) yang tidak berurutan.
                    Konteks:
                    - Mata Pelajaran: ${tpData.subject}
                    - Kelas: ${tpData.grade}
                    - Berikut adalah daftar lengkap Tujuan Pembelajaran (TP) yang perlu Anda susun. Setiap TP memiliki 'index' asli.
                    \`\`\`json
                    ${JSON.stringify(tpsForAI_ATP, null, 2)}
                    \`\`\`
                    Instruksi Wajib (Ikuti dengan SANGAT SEKSAMA):
                    1.  **Analisis Menyeluruh:** Baca dan pahami setiap TP dalam daftar. Identifikasi keterkaitan antar TP, tingkat kesulitannya (dari konkret ke abstrak, dari mudah ke sulit), dan prasyarat pengetahuan.
                    2.  **Prinsip Penyusunan Alur:** Susun ulang TP-TP tersebut ke dalam urutan yang paling logis untuk diajarkan.
                    3.  **FOKUS PADA INDEKS:** Hasil akhir Anda HARUS berupa sebuah array JSON yang berisi **HANYA ANGKA-ANGKA** dari properti \`index\` asli, tetapi dalam URutan BARU yang sudah Anda tentukan. JANGAN mengembalikan teks TP.
                    4.  **Kelengkapan:** Pastikan jumlah indeks dalam output Anda sama persis dengan jumlah TP dalam input. Tidak boleh ada indeks yang hilang atau diduplikasi.
                    5.  **Format Output JSON Sederhana:** Hasilkan HANYA sebuah array JSON berisi ANGKA (integer).
                    PENTING: Hasilkan HANYA output JSON array berisi ANGKA yang valid tanpa teks pembuka, penutup, atau markdown.
                 `;
                const responseATP = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: promptATP,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: { type: Type.NUMBER }
                        }
                    }
                });
                return sendResponse(200, { text: responseATP.text });

            case 'generatePROTA':
                const { atpData, jamPertemuan } = payload;
                const tpsForAI_PROTA = atpData.content.map((row: ATPTableRow, index: number) => ({
                    index: index,
                    topikMateri: row.topikMateri,
                    tujuanPembelajaran: row.tp,
                }));
                const tpsForAIString_PROTA = JSON.stringify(tpsForAI_PROTA, null, 2);
                const totalJpEfektif = jamPertemuan * 32;

                const promptPROTA = `
                    Anda adalah seorang ahli perancangan kurikulum pendidikan di Indonesia yang sangat teliti dan akurat dalam menghitung alokasi waktu.
                    Tugas Anda adalah memberikan alokasi waktu (dalam Jam Pertemuan atau JP) untuk setiap Tujuan Pembelajaran (TP) yang diberikan.
                    Konteks:
                    - Mata Pelajaran: ${atpData.subject}
                    - Jam Pertemuan (JP) per minggu: ${jamPertemuan} JP.
                    - Berikut adalah daftar Tujuan Pembelajaran (TP) yang perlu Anda alokasikan waktunya. Setiap TP memiliki 'index' asli.
                    \`\`\`json
                    ${tpsForAIString_PROTA}
                    \`\`\`
                    Instruksi Wajib (Ikuti dengan SANGAT SEKSAMA):
                    1.  **Pahami Anggaran Waktu:** Total alokasi waktu yang harus Anda distribusikan untuk SEMUA TP adalah **${totalJpEfektif} JP**. Angka ini bersifat final dan jumlah akhir dari alokasi Anda HARUS SAMA PERSIS dengan angka ini. Ini dihitung dari (${jamPertemuan} JP/minggu * 32 minggu efektif).
                    2.  **Proses Berpikir untuk Alokasi (Ikuti Langkah Ini):**
                        a. **Analisis Kompleksitas:** Baca dan analisis setiap TP. Beri bobot pada setiap TP berdasarkan kesulitannya. TP yang memerlukan pemikiran tingkat tinggi (analisis, evaluasi, kreasi C4-C6) atau kegiatan praktik (proyek, eksperimen) harus diberi bobot lebih tinggi. TP yang bersifat pengenalan dasar (mengingat, memahami C1-C2) diberi bobot lebih rendah.
                        b. **Distribusi Proporsional:** Bagikan **${totalJpEfektif} JP** secara proporsional berdasarkan bobot yang telah Anda tentukan. TP dengan bobot lebih tinggi mendapatkan JP lebih banyak (misalnya 4-8 JP), dan TP dengan bobot lebih rendah mendapatkan JP lebih sedikit (misalnya 2-3 JP).
                        c. **Verifikasi Total (LANGKAH KRITIS):** Setelah mendistribusikan JP, JUMLAHKAN semua nilai JP yang telah Anda alokasikan. Jika totalnya tidak sama persis dengan **${totalJpEfektif} JP**, lakukan penyesuaian (tambah atau kurangi JP dari beberapa TP yang paling sesuai) hingga totalnya TEPAT **${totalJpEfektif} JP**.
                    3.  **ATURAN PENTING:**
                        a. **LARANGAN KERAS:** Jangan pernah memberikan alokasi waktu yang seragam untuk semua TP (contoh: semua diberi "2 JP"). Alokasi harus bervariasi dan mencerminkan analisis kompleksitas Anda.
                        b. **Format Alokasi:** Nilai \`alokasiWaktu\` WAJIB berupa string yang berisi angka bulat positif diikuti oleh spasi dan "JP" (contoh: "4 JP").
                    4.  **Format Output JSON:** Hasilkan **HANYA** berupa array JSON yang valid.
                    Contoh Format:
                    [ { "index": 0, "alokasiWaktu": "4 JP" }, { "index": 1, "alokasiWaktu": "6 JP" } ]
                `;
                const responsePROTA = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: promptPROTA,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    index: { type: Type.NUMBER },
                                    alokasiWaktu: { type: Type.STRING },
                                },
                                required: ['index', 'alokasiWaktu'],
                            }
                        }
                    }
                });
                return sendResponse(200, { text: responsePROTA.text });

            case 'generateKKTP':
                const { atpData: atpDataKKTP, semester, grade: gradeKKTP } = payload;
                const semesterContent = atpDataKKTP.content.filter((row: ATPTableRow) => row.semester === semester);
                const tpsForAI_KKTP = semesterContent.map((row: ATPTableRow, index: number) => ({
                    index: index,
                    materiPokok: row.topikMateri,
                    tp: row.tp,
                }));
                 if (tpsForAI_KKTP.length === 0) {
                    // Return an empty array instead of throwing an error, client can handle this.
                    return sendResponse(200, { text: '[]' });
                }
                const promptKKTP = `
                    Anda adalah seorang ahli evaluasi pembelajaran dan pakar desain kurikulum di Indonesia.
                    Tugas Anda adalah membuat Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) yang sangat rinci dan menentukan target ketercapaian minimal untuk setiap Tujuan Pembelajaran (TP) yang diberikan.
                    Konteks:
                    - Mata Pelajaran: ${atpDataKKTP.subject}
                    - Kelas: ${gradeKKTP}
                    - Semester: ${semester}
                    - Daftar Tujuan Pembelajaran (TP) yang perlu dibuatkan kriteria:
                    \`\`\`json
                    ${JSON.stringify(tpsForAI_KKTP, null, 2)}
                    \`\`\`
                    Instruksi Wajib (Ikuti dengan SANGAT SEKSAMA):
                    1.  **Buat 4 Level Kriteria:** Untuk setiap TP dalam input, buatlah deskripsi kriteria yang jelas dan terukur untuk 4 level pemahaman: \`sangatMahir\`, \`mahir\`, \`cukupMahir\`, \`perluBimbingan\`.
                    2.  **Tentukan Target KKTP:** Tentukan SATU level mana yang menjadi TARGET MINIMAL ketercapaian (KKTP). Nilai untuk properti \`targetKktp\` HARUS berupa SALAH SATU dari nilai string berikut: "sangatMahir", "mahir", "cukupMahir", atau "perluBimbingan".
                    3.  **Format Output JSON:** Hasilkan HANYA sebuah array JSON yang valid. Setiap objek dalam array adalah hasil analisis untuk SATU TP dari input. Urutan objek dalam output harus sama dengan urutan TP dalam input.
                    4.  **Kelengkapan:** Pastikan jumlah objek dalam array output Anda sama persis dengan jumlah TP dalam input.
                    Contoh Format Output JSON:
                    [
                      {
                        "index": 0,
                        "kriteria": { "sangatMahir": "...", "mahir": "...", "cukupMahir": "...", "perluBimbingan": "..." },
                        "targetKktp": "mahir"
                      }
                    ]
                    PENTING: Hasilkan HANYA output JSON array yang valid tanpa teks pembuka, penutup, atau markdown.
                `;
                const responseKKTP = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: promptKKTP,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    index: { type: Type.NUMBER },
                                    kriteria: {
                                        type: Type.OBJECT,
                                        properties: {
                                            sangatMahir: { type: Type.STRING },
                                            mahir: { type: Type.STRING },
                                            cukupMahir: { type: Type.STRING },
                                            perluBimbingan: { type: Type.STRING },
                                        },
                                        required: ['sangatMahir', 'mahir', 'cukupMahir', 'perluBimbingan'],
                                    },
                                    targetKktp: { type: Type.STRING },
                                },
                                required: ['index', 'kriteria', 'targetKktp'],
                            }
                        }
                    }
                });
                return sendResponse(200, { text: responseKKTP.text });

            default:
                return sendError(400, `Aksi tidak dikenal: ${action}`);
        }
    } catch (error: any) {
        return sendError(500, `Terjadi kesalahan internal saat memproses permintaan ke AI. Detail: ${error.message}`);
    }
};