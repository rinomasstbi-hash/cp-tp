import { GoogleGenAI, Type } from "@google/genai";
import { TPData, ATPData, PROTAData, KKTPData, PROSEMData, TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow } from '../types';

// Key untuk menyimpan API Key di browser user
export const LOCAL_STORAGE_API_KEY = 'AGRU_GEMINI_API_KEY';

// Helper to extract JSON from AI response which might be wrapped in markdown
const extractJsonArray = (text: string): any[] => {
    try {
        // Remove markdown code blocks if present
        let cleanText = text.replace(/```json\n/g, '').replace(/```/g, '');
        
        // Find the first '[' and the last ']'
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            cleanText = cleanText.substring(firstBracket, lastBracket + 1);
        }

        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("Failed to parse JSON from AI response. Raw text:", text, e);
        return [];
    }
};

// Cek apakah API Key tersedia (baik dari Env maupun LocalStorage)
export const hasApiKey = (): boolean => {
    const envKey = process.env.API_KEY;
    const storedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    return !!(envKey || storedKey);
};

// Simpan API Key ke LocalStorage (dipanggil dari UI)
export const saveApiKeyToStorage = (key: string) => {
    localStorage.setItem(LOCAL_STORAGE_API_KEY, key);
};

// Helper aman untuk mengambil API Key dengan prioritas yang benar
const getApiKey = (): string => {
    // 1. Cek Environment Variable (Prioritas untuk Deployment yang benar)
    if (process.env.API_KEY) {
        return process.env.API_KEY;
    }

    // 2. Cek LocalStorage (Prioritas untuk User yang input manual via UI)
    const storedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedKey) {
        return storedKey;
    }

    return '';
};

const createAIClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY_MISSING"); // Error khusus untuk ditangkap UI
    }
    return new GoogleGenAI({ apiKey });
};

// Helper untuk menangani error spesifik API Gemini
const handleGeminiError = (error: any) => {
    const msg = error?.message || '';
    
    // Jika error karena key hilang (dari pengecekan kita sendiri)
    if (msg === "API_KEY_MISSING") {
        throw new Error("API Key Gemini belum diatur. Silakan masukkan API Key Anda pada tombol pengaturan di pojok kanan atas atau refresh halaman.");
    }

    // Cek error spesifik "leaked key" atau Permission Denied
    if (msg.includes('leaked') || msg.includes('key was reported as leaked') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
        // Jika key bocor dan itu berasal dari LocalStorage, hapus agar user bisa input baru
        if (localStorage.getItem(LOCAL_STORAGE_API_KEY)) {
            localStorage.removeItem(LOCAL_STORAGE_API_KEY);
        }
        throw new Error("AKSES DITOLAK: API Key Gemini tidak valid atau telah diblokir oleh Google. Silakan refresh halaman dan masukkan API Key yang baru.");
    }
    
    if (msg.includes('429') || msg.includes('quota') || msg.includes('Resource has been exhausted')) {
        throw new Error("KUOTA HABIS: Anda telah mencapai batas penggunaan API Gemini. Silakan tunggu beberapa saat atau gunakan API Key dari akun Google lain.");
    }

    // Lempar error asli jika bukan kasus khusus
    throw error;
};

// ============================================================================
// LANGKAH 1: GENERATE TUJUAN PEMBELAJARAN (TP)
// ============================================================================
export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    try {
        const ai = createAIClient();
        
        const prompt = `
        Bertindaklah sebagai Pakar Kurikulum Merdeka Indonesia.
        Tugas Anda: Merumuskan Tujuan Pembelajaran (TP) yang spesifik dan terukur berdasarkan Capaian Pembelajaran (CP) yang diberikan.

        INFORMASI MATA PELAJARAN:
        - Mapel: ${input.subject}
        - Kelas/Fase: ${input.grade} (Fase D untuk SMP/MTs)

        DATA CP (ELEMEN & DESKRIPSI):
        ${input.cpElements.map((e, i) => `${i + 1}. Elemen: ${e.element}\n   Deskripsi CP: ${e.cp}`).join('\n')}

        CATATAN GURU (PENTING UNTUK PEMBAGIAN SEMESTER):
        ${input.additionalNotes}

        INSTRUKSI PENGERJAAN:
        1. Analisis Kompetensi (Kata Kerja Operasional) dan Konten (Materi) dari setiap deskripsi CP.
        2. Pecah CP menjadi beberapa Tujuan Pembelajaran (TP) yang lebih kecil.
        3. Kelompokkan TP tersebut ke dalam "Materi Pokok" yang relevan.
        4. Bagilah materi tersebut ke dalam Semester Ganjil atau Genap (Wajib ada keduanya jika catatan guru mengindikasikan demikian).
        5. Output HARUS berupa Array JSON murni tanpa teks pengantar.

        FORMAT JSON YANG DIHARAPKAN:
        [
          {
            "semester": "Ganjil" | "Genap",
            "materi": "Judul Materi Pokok (misal: Bilangan Bulat)",
            "subMateriGroups": [
              {
                "subMateri": "Sub Bab (misal: Operasi Hitung)",
                "tps": [
                  "Peserta didik mampu...",
                  "Peserta didik mampu..."
                ]
              }
            ]
          }
        ]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            semester: { type: Type.STRING, enum: ['Ganjil', 'Genap'] },
                            materi: { type: Type.STRING, description: "Judul Bab atau Materi Pokok Utama" },
                            subMateriGroups: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        subMateri: { type: Type.STRING, description: "Sub topik spesifik" },
                                        tps: { 
                                            type: Type.ARRAY, 
                                            items: { type: Type.STRING },
                                            description: "Daftar kalimat Tujuan Pembelajaran"
                                        }
                                    },
                                    required: ['subMateri', 'tps']
                                }
                            }
                        },
                        required: ['semester', 'materi', 'subMateriGroups']
                    }
                }
            }
        });

        const result = extractJsonArray(response.text);
        
        if (!result || result.length === 0) {
            throw new Error("AI tidak menghasilkan data TP yang valid. Silakan coba lagi.");
        }
        
        return result;

    } catch (error: any) {
        console.error("Error in generateTPs:", error);
        handleGeminiError(error); 
        throw new Error(`Gagal membuat TP: ${error.message || 'Kesalahan tidak diketahui'}`);
    }
};

// ============================================================================
// LANGKAH 2: GENERATE ALUR TUJUAN PEMBELAJARAN (ATP)
// ============================================================================
export const generateATP = async (tpData: TPData): Promise<ATPTableRow[]> => {
    try {
        const ai = createAIClient();
        
        let allTps: any[] = [];
        let sequence = 1;
        tpData.tpGroups.forEach(group => {
            group.subMateriGroups.forEach(sub => {
                sub.tps.forEach(tp => {
                    allTps.push({
                        original_seq: sequence++,
                        semester: group.semester,
                        materi: group.materi,
                        tp_text: tp
                    });
                });
            });
        });

        const prompt = `
        Peran: Pakar Kurikulum.
        Tugas: Menyusun Alur Tujuan Pembelajaran (ATP) yang logis dan sistematis.
        
        Mapel: ${tpData.subject}
        Kelas: ${tpData.grade}

        DAFTAR TP MENTAH:
        ${JSON.stringify(allTps)}

        INSTRUKSI:
        1. Urutkan TP dari yang paling mudah/mendasar ke yang kompleks (Hierarki Pembelajaran).
        2. Berikan Kode TP (misal: 7.1, 7.2 untuk kelas 7).
        3. Pastikan alur mengalir logis antar semester (Ganjil -> Genap).
        4. Return JSON Array.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            topikMateri: { type: Type.STRING },
                            tp: { type: Type.STRING },
                            kodeTp: { type: Type.STRING },
                            atpSequence: { type: Type.NUMBER },
                            semester: { type: Type.STRING, enum: ['Ganjil', 'Genap'] }
                        },
                        required: ['topikMateri', 'tp', 'kodeTp', 'atpSequence', 'semester']
                    }
                }
            }
        });

        return extractJsonArray(response.text);
    } catch (error: any) {
        handleGeminiError(error);
        throw error;
    }
};

// ============================================================================
// LANGKAH 3: GENERATE PROGRAM TAHUNAN (PROTA)
// ============================================================================
export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number): Promise<PROTARow[]> => {
    try {
        const ai = createAIClient();
        
        const simplifiedATP = atpData.content.map(r => ({ 
            tp: r.tp, 
            materi: r.topikMateri, 
            sem: r.semester, 
            kode: r.kodeTp 
        }));

        const prompt = `
        Peran: Guru Profesional.
        Tugas: Membuat Program Tahunan (PROTA).

        Mapel: ${atpData.subject}
        Jam Pelajaran (JP) per Minggu: ${totalJpPerWeek} JP
        
        DATA ATP:
        ${JSON.stringify(simplifiedATP)}

        INSTRUKSI:
        1. Perkirakan "Alokasi Waktu" untuk setiap TP berdasarkan kompleksitas materi.
        2. Pastikan total JP masuk akal untuk 1 tahun ajaran (Sekitar 18 minggu efektif per semester).
        3. Format output Alokasi Waktu harus berupa string angka + " JP" (contoh: "4 JP").
        4. Return JSON Array.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                 responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            no: { type: Type.NUMBER },
                            topikMateri: { type: Type.STRING },
                            alurTujuanPembelajaran: { type: Type.STRING, description: "Kode ATP (misal: 7.1, 7.2)" },
                            tujuanPembelajaran: { type: Type.STRING },
                            alokasiWaktu: { type: Type.STRING },
                            semester: { type: Type.STRING, enum: ['Ganjil', 'Genap'] }
                        },
                        required: ['no', 'topikMateri', 'alurTujuanPembelajaran', 'tujuanPembelajaran', 'alokasiWaktu', 'semester']
                    }
                }
            }
        });
        
        return extractJsonArray(response.text);
    } catch (error: any) {
        handleGeminiError(error);
        throw error;
    }
};

// ============================================================================
// LANGKAH 4: GENERATE KRITERIA KETERCAPAIAN (KKTP)
// ============================================================================
export const generateKKTP = async (atpData: ATPData, semester: string, grade: string): Promise<KKTPRow[]> => {
    try {
        const ai = createAIClient();
        
        const filteredContent = atpData.content.filter(c => c.semester.toLowerCase() === semester.toLowerCase());
        
        if (filteredContent.length === 0) return [];

        const prompt = `
        Peran: Guru Profesional.
        Tugas: Membuat Rubrik KKTP (Kriteria Ketercapaian Tujuan Pembelajaran).
        
        Semester: ${semester}
        Kelas: ${grade}
        
        DAFTAR TP:
        ${JSON.stringify(filteredContent.map(r => ({ tp: r.tp, materi: r.topikMateri })))}

        INSTRUKSI:
        1. Buat deskripsi kriteria penilaian (Rubrik) untuk 4 level: Sangat Mahir, Mahir, Cukup Mahir, Perlu Bimbingan.
        2. Tentukan target minimal (biasanya 'cukupMahir' atau 'mahir').
        3. Pastikan return adalah valid JSON array.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            no: { type: Type.NUMBER },
                            materiPokok: { type: Type.STRING },
                            tp: { type: Type.STRING },
                            kriteria: {
                                type: Type.OBJECT,
                                properties: {
                                    sangatMahir: { type: Type.STRING },
                                    mahir: { type: Type.STRING },
                                    cukupMahir: { type: Type.STRING },
                                    perluBimbingan: { type: Type.STRING }
                                },
                                required: ['sangatMahir', 'mahir', 'cukupMahir', 'perluBimbingan']
                            },
                            targetKktp: { type: Type.STRING, enum: ['sangatMahir', 'mahir', 'cukupMahir', 'perluBimbingan'] }
                        },
                        required: ['no', 'materiPokok', 'tp', 'kriteria', 'targetKktp']
                    }
                }
            }
        });

        return extractJsonArray(response.text);
    } catch (error: any) {
        handleGeminiError(error);
        throw error;
    }
};

// ============================================================================
// LANGKAH 5: GENERATE PROGRAM SEMESTER (PROSEM) - Algoritmik
// ============================================================================
export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    // Fungsi ini murni algoritmik untuk distribusi waktu, tidak menggunakan call AI untuk menghemat token & kecepatan.
    
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    // Asumsi 5 minggu per bulan untuk grid standar
    const weeksPerMonth = 5;
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: weeksPerMonth }));

    const semesterContent = protaData.content.filter(row => 
        row.semester?.trim().toLowerCase() === semester.toLowerCase()
    );
    
    if (semesterContent.length === 0) {
        return { headers, content: [] };
    }

    const maxJpPerWeek = Number(protaData.jamPertemuan) || 2;
    const totalWeeks = months.length * weeksPerMonth;
    
    const weeklyUsage = new Array(totalWeeks).fill(0);
    let globalWeekCursor = 0; 

    const finalContent: PROSEMRow[] = semesterContent.map((row) => {
        // Ekstrak angka dari string "4 JP" -> 4
        const jpMatch = row.alokasiWaktu.match(/(\d+)/);
        const totalJpForTp = jpMatch ? parseInt(jpMatch[0]) : 0;
        
        let remainingToDistribute = totalJpForTp;
        
        const distribution: Record<string, (string | null)[]> = {};
        months.forEach(m => { distribution[m] = Array(weeksPerMonth).fill(null); });

        // Algoritma Distribusi JP ke Grid Minggu
        while (remainingToDistribute > 0 && globalWeekCursor < totalWeeks) {
            const currentUsage = weeklyUsage[globalWeekCursor];
            const availableSpace = maxJpPerWeek - currentUsage;

            if (availableSpace > 0) {
                const amountToAssign = Math.min(remainingToDistribute, availableSpace);
                const monthIndex = Math.floor(globalWeekCursor / weeksPerMonth);
                const weekIndexInMonth = globalWeekCursor % weeksPerMonth;
                
                if (monthIndex < months.length) {
                    const monthName = months[monthIndex];
                    distribution[monthName][weekIndexInMonth] = String(amountToAssign);
                }
                
                weeklyUsage[globalWeekCursor] += amountToAssign;
                remainingToDistribute -= amountToAssign;
            }

            // Pindah ke minggu berikutnya jika minggu ini penuh atau kita sudah mengalokasikan
            if (weeklyUsage[globalWeekCursor] >= maxJpPerWeek) {
                globalWeekCursor++;
            }
        }

        return {
            no: row.no,
            tujuanPembelajaran: row.tujuanPembelajaran,
            alokasiWaktu: row.alokasiWaktu,
            bulan: distribution,
            keterangan: '' 
        };
    });

    return { headers, content: finalContent };
};