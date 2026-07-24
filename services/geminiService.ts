import { GoogleGenAI, Type } from '@google/genai';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './dbService';
import { TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow, ATPData, PROTAData, ApiKeyItem } from '../types';

interface KeyAttemptInfo {
  key: string;
  id?: string;
  isPoolKey: boolean;
}

const model = "gemini-2.5-flash";

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await ai.models.generateContent(params);
        } catch (error: any) {
            lastError = error;
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (error.status === 503 || error.status === 429 || error.message?.includes('503') || error.message?.includes('429')) {
                const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.log(`Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

const handleGeminiError = (e: any, context: string) => {
    console.error(e);
    let errorMsg = e.message || 'Terjadi kesalahan tidak terduga';
    if (errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand')) {
        errorMsg = 'Server AI Google saat ini sedang sibuk (high demand). Silakan coba lagi beberapa saat.';
    } else if (errorMsg.includes('429') || errorMsg.includes('Quota exceeded') || errorMsg.includes('quota')) {
        errorMsg = 'Kuota pemakaian AI telah habis (Limit Tercapai). Silakan hubungi admin atau tunggu beberapa saat.';
    } else if (errorMsg.includes('403') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('PERMISSION_DENIED')) {
        errorMsg = 'API Key Anda tidak valid atau telah diblokir. Harap periksa kembali konfigurasi API Key Anda.';
    }
    throw new Error(`${context}: ${errorMsg}`);
};

const runWithAutoRotatedApiKey = async <T>(
    apiCall: (ai: GoogleGenAI) => Promise<T>,
    context: string
): Promise<T> => {
    let adminSettingsData: any = null;
    let poolKeys: ApiKeyItem[] = [];
    let legacyKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;

    try {
        const docRef = doc(db, 'settings', 'admin');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            adminSettingsData = snap.data();
            if (adminSettingsData.geminiApiKey) {
                legacyKey = adminSettingsData.geminiApiKey;
            }
            if (Array.isArray(adminSettingsData.apiKeys)) {
                poolKeys = adminSettingsData.apiKeys;
            }
        }
    } catch (e) {
        console.error("Gagal memuat pengaturan API dari Firestore", e);
    }

    const candidates: KeyAttemptInfo[] = [];

    // Prioritaskan API Key aktif dari pool
    poolKeys.forEach((pk) => {
        if (pk.status === 'Aktif' && pk.key) {
            candidates.push({
                key: pk.key,
                id: pk.id,
                isPoolKey: true
            });
        }
    });

    // Gunakan legacy/default key sebagai fallback terakhir
    if (legacyKey) {
        candidates.push({
            key: legacyKey,
            isPoolKey: false
        });
    }

    if (candidates.length === 0) {
        throw new Error('API Key tidak ditemukan atau semua key dalam status tidak aktif. Silakan hubungi admin.');
    }

    let lastError: any = null;

    for (let idx = 0; idx < candidates.length; idx++) {
        const candidate = candidates[idx];
        const ai = new GoogleGenAI({ apiKey: candidate.key });
        
        try {
            console.log(`Mencoba membuat AI menggunakan key: ${candidate.isPoolKey ? 'Pool Key ID ' + candidate.id : 'Legacy/Default Key'}`);
            const result = await apiCall(ai);
            
            // Jika sukses dan merupakan pool key, update lastUsed timestamp secara asinkron
            if (candidate.isPoolKey && candidate.id) {
                try {
                    const docRef = doc(db, 'settings', 'admin');
                    const updatedPool = poolKeys.map(k => {
                        if (k.id === candidate.id) {
                            return { ...k, lastUsed: Date.now() };
                        }
                        return k;
                    });
                    await setDoc(docRef, { apiKeys: updatedPool }, { merge: true });
                } catch (e) {
                    console.error("Gagal memperbarui timestamp lastUsed", e);
                }
            }

            return result;
        } catch (error: any) {
            lastError = error;
            console.error(`Gagal menggunakan key (${candidate.isPoolKey ? 'Pool Key ID: ' + candidate.id : 'Legacy Key'}):`, error);

            const isKeyIssue = (
                error.status === 429 ||
                error.status === 403 ||
                String(error.message || '').toLowerCase().includes('429') ||
                String(error.message || '').toLowerCase().includes('403') ||
                String(error.message || '').toLowerCase().includes('quota') ||
                String(error.message || '').toLowerCase().includes('exhausted') ||
                String(error.message || '').toLowerCase().includes('api key') ||
                String(error.message || '').toLowerCase().includes('api_key_invalid') ||
                String(error.message || '').toLowerCase().includes('permission_denied') ||
                String(error.message || '').toLowerCase().includes('invalid api key')
            );

            if (isKeyIssue && candidate.isPoolKey && candidate.id) {
                const isLimit = String(error.message || '').toLowerCase().includes('quota') || 
                                String(error.message || '').toLowerCase().includes('exhausted') || 
                                error.status === 429 || 
                                String(error.message || '').toLowerCase().includes('429');
                const newStatus = isLimit ? 'Limit Tercapai' : 'Error';
                const errMsg = error.message || String(error);

                console.warn(`[Auto-Rotation] API Key (${candidate.id}) terdeteksi bermasalah. Mengubah status ke: ${newStatus}`);

                try {
                    const docRef = doc(db, 'settings', 'admin');
                    const updatedPool = poolKeys.map(k => {
                        if (k.id === candidate.id) {
                            return { 
                                ...k, 
                                status: newStatus as any,
                                errorMessage: errMsg,
                                lastUsed: Date.now()
                            };
                        }
                        return k;
                    });
                    await setDoc(docRef, { apiKeys: updatedPool }, { merge: true });
                    poolKeys = updatedPool;
                } catch (dbErr) {
                    console.error("Gagal memperbarui status API Key bermasalah di database", dbErr);
                }
            }

            // Jika error bukan masalah API Key (misalnya prompt diblokir, bad request), hentikan rotasi dan lempar error
            if (!isKeyIssue) {
                break;
            }

            console.log("Memutar ke API Key berikutnya yang aktif...");
        }
    }

    handleGeminiError(lastError, context);
    throw lastError; 
};

export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    try {
        const response = await runWithAutoRotatedApiKey(async (ai) => {
            return await generateWithRetry(ai, {
                model,
                contents: `Buatkan Tujuan Pembelajaran (TP) untuk mata pelajaran ${input.subject} kelas ${input.grade}. Berikut Capaian Pembelajarannya: ${JSON.stringify(input.cpElements)}. Note tambahan: ${input.additionalNotes}`,
                config: {
                    systemInstruction: "Anda adalah AI asisten guru MTsN 4 Jombang. Hasilkan array objek TPGroup. Hasilkan data JSON murni.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                semester: { type: Type.STRING, enum: ["Ganjil", "Genap"], description: "Harus 'Ganjil' atau 'Genap'" },
                                materi: { type: Type.STRING },
                                subMateriGroups: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            subMateri: { type: Type.STRING },
                                            tps: { type: Type.ARRAY, items: { type: Type.STRING } }
                                        },
                                        required: ["subMateri", "tps"]
                                    }
                                }
                            },
                            required: ["semester", "materi", "subMateriGroups"]
                        }
                    }
                }
            });
        }, 'Gagal membuat TP');

        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const generateATP = async (tpData: { subject: string; grade: string; tpGroups: TPGroup[]; totalJpPerWeek: number }): Promise<ATPTableRow[]> => {
    try {
        const isGrade9 = tpData.grade && (tpData.grade.includes('9') || tpData.grade.toUpperCase().includes('IX'));
        const standardWeeks = isGrade9 ? '32-34 minggu (Semester Ganjil: 16-17 minggu, Semester Genap: 16-17 minggu)' : '36-40 minggu (Semester Ganjil: 18-20 minggu, Semester Genap: 18-20 minggu)';
        const minJp = isGrade9 ? 32 * tpData.totalJpPerWeek : 36 * tpData.totalJpPerWeek;
        const maxJp = isGrade9 ? 34 * tpData.totalJpPerWeek : 40 * tpData.totalJpPerWeek;

        // Calculate the exact count of TPs in tpGroups to enforce completeness
        let totalTpCount = 0;
        tpData.tpGroups.forEach(group => {
            group.subMateriGroups.forEach(sub => {
                totalTpCount += (sub.tps || []).length;
            });
        });

        const response = await runWithAutoRotatedApiKey(async (ai) => {
            return await generateWithRetry(ai, {
                model,
                contents: `Susun Alur Tujuan Pembelajaran (ATP) dari data TP berikut: ${JSON.stringify(tpData.tpGroups)}.
Mata Pelajaran: ${tpData.subject}
Kelas: ${tpData.grade}
Jam Pelajaran (JP) per minggu: ${tpData.totalJpPerWeek} JP
Standar minggu efektif kelas ini: ${standardWeeks}
Total alokasi JP seluruh TP dalam setahun WAJIB berada di rentang ${minJp} JP sampai ${maxJp} JP (berdasarkan minggu efektif x JP/minggu).
Pastikan kolom semester HANYA berisi nilai 'Ganjil' atau 'Genap'.
JUMLAH TP YANG DIKIRIM: Ada total ${totalTpCount} buah TP dalam input di atas. Output Anda WAJIB menghasilkan tepat ${totalTpCount} baris ATP tanpa ada satupun TP yang tertinggal, terlewat, digabungkan, atau dikurangi!`,
                config: {
                    systemInstruction: `Anda adalah AI pembuat Alur Tujuan Pembelajaran (ATP) untuk MTsN 4 Jombang. Tugas Anda adalah menghasilkan array objek ATP berdasarkan data TP dan kriteria berikut:

1. KELENGKAPAN PENUH DAN WAJIB (SANGAT KRITIS):
   - Input yang Anda terima berisi total ${totalTpCount} buah Tujuan Pembelajaran (TP).
   - Output Anda WAJIB menghasilkan tepat ${totalTpCount} objek di dalam array (satu baris untuk setiap TP secara lengkap).
   - TIDAK BOLEH ada satupun TP yang terlewat, diabaikan, atau tertinggal dalam proses pembuatan ATP.
   - JANGAN PERNAH menggabungkan dua atau lebih TP menjadi satu baris ATP. Setiap TP tunggal harus memiliki barisnya sendiri secara eksklusif.

2. Pembagian Alokasi Waktu (JP) Semester:
   - Distribusikan total JP tahunan (${minJp} - ${maxJp} JP) secara proporsional, wajar, dan logis ke seluruh Tujuan Pembelajaran (TP).
   - Tulis alokasi waktu dalam format angka diikuti 'JP' (contoh: '2 JP', '4 JP', '6 JP').
   - Alokasi JP untuk SETIAP baris TP harus logis dan tidak boleh terlalu besar. Alokasi untuk satu TP TIDAK BOLEH MELEBIHI 2 minggu pertemuan (maksimal ${Math.max(6, 2 * tpData.totalJpPerWeek)} JP, dan idealnya adalah 2 JP, 3 JP, atau 4 JP). 
   - SANGAT DILARANG memberi alokasi waktu liar seperti 8 JP, 10 JP, atau lebih besar, apalagi mengulang nilai besar tersebut berulang kali di beberapa TP. Jika materi TP panjang, bagi menjadi sub-materi dengan baris TP terpisah yang masing-masing berukuran logis (2 JP s.d 4 JP).
   - Total alokasi waktu JP semua TP harus sesuai dengan jumlah minggu efektif dikali JP per minggu.

3. Integrasi Panca Cinta (Maksimal 1-2 Pilar per TP):
   - Jangan memasukkan kelima pilar sekaligus dalam satu TP. Fokus pada 1 atau 2 pilar utama yang paling melekat secara alami dengan materi pembelajaran agar penanaman karakternya mendalam.
   - Pilihan Pilar Resmi MTsN 4 Jombang:
     * Cinta kepada Allah SWT dan Rasul-Nya (Nilai spiritual, ibadah, syukur)
     * Cinta kepada ilmu pengetahuan (Semangat belajar, jujur, penasaran, logis)
     * Cinta kepada diri sendiri dan sesama manusia (Empati, kerja sama, anti-bullying, kesehatan)
     * Cinta kepada lingkungan alam/ekologi (Peduli lingkungan, hemat energi, merawat flora/fauna)
     * Cinta kepada tanah air/bangsa dan negara (Menghargai tradisi, toleransi, bangga produk lokal)
   - ATURAN FORMAT SANGAT PENTING:
     * JANGAN PERNAH menuliskan kata/label "Pilar 1:", "Pilar 2:", "Pilar 3:", "Pilar 4:", atau "Pilar 5:" di dalam hasil teks. Cukup tuliskan nama pilarnya saja secara langsung.
     * Jika pilar yang terintegrasi HANYA 1: Tuliskan nama pilarnya secara langsung (contoh: "Cinta kepada Allah SWT dan Rasul-Nya").
     * Jika pilar yang terintegrasi LEBIH DARI 1 (maksimal 2): WAJIB ditulis dalam bentuk bullet points (setiap pilar berada di baris baru dengan diawali tanda minus/bullet "- "). Contoh:
- Cinta kepada Allah SWT dan Rasul-Nya
- Cinta kepada ilmu pengetahuan
     * JANGAN menggabungkan beberapa pilar dengan kata sambung "&" atau tanda koma jika jumlahnya lebih dari satu. Gunakan format bullet points di atas.

4. Aktivitas Cinta dalam Pembelajaran (Aksi Nyata):
   - Manifestasi aktivitas cinta harus berupa tindakan nyata menggunakan Kata Kerja Operasional (KKO) yang konkrit. Hindari kalimat pasif/abstrak seperti "Murid diharapkan memiliki rasa...".
   - Gunakan kata kerja konkrit seperti: Merawat, membagikan, membersihkan, mendoakan, menghargai, mendengarkan, menuliskan, mendiskusikan, mempraktikkan.
   - Aktivitas wajib menyentuh aspek merasakan (feeling), memikirkan kemaslahatan (thinking), dan melakukan aksi kasih sayang (acting), namun JANGAN menuliskan kata-kata label "(Heart, Head, Hand)" atau "(Heart)", "(Head)", "(Hand)" di dalam teks hasil akhir. Tuliskan rangkaian tindakan nyatanya secara langsung dan mengalir.
   - Kegiatan harus benar-benar bisa dipraktikkan langsung saat tatap muka di kelas atau sebagai proyek pembiasaan.

Kembalikan draf ATP dalam format JSON murni yang sesuai dengan responseSchema.`,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                topikMateri: { type: Type.STRING },
                                tp: { type: Type.STRING },
                                kodeTp: { type: Type.STRING },
                                atpSequence: { type: Type.INTEGER },
                                semester: { type: Type.STRING, enum: ["Ganjil", "Genap"], description: "Harus 'Ganjil' atau 'Genap'" },
                                alokasiWaktu: { type: Type.STRING, description: "Alokasi waktu dalam JP, contoh: '4 JP'" },
                                integrasiPancaCinta: { type: Type.STRING, description: "Pilar Panca Cinta yang dipilih, maksimal 1-2 pilar resmi" },
                                aktivitasCinta: { type: Type.STRING, description: "Aktivitas tindakan nyata pembiasaan dengan kata kerja operasional tanpa menuliskan kata-kata label 'Heart/Head/Hand'" }
                            },
                            required: ["topikMateri", "tp", "kodeTp", "atpSequence", "semester", "alokasiWaktu", "integrasiPancaCinta", "aktivitasCinta"]
                        }
                    }
                }
            });
        }, 'Gagal membuat ATP');

        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result;
    } catch (error: any) {
        throw error;
    }
};

export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number, grade?: string): Promise<PROTARow[]> => {
    try {
        // Just map from ATP's content directly! No Gemini call needed, 100% perfect mapping and consistency.
        return atpData.content.map((row, index) => ({
            no: index + 1,
            semester: row.semester,
            kodeTp: row.kodeTp,
            topikMateri: row.topikMateri,
            tp: row.tp,
            integrasiPancaCinta: row.integrasiPancaCinta,
            aktivitasCinta: row.aktivitasCinta,
            alokasiWaktu: row.alokasiWaktu || "0 JP",
        }));
    } catch (error: any) {
        throw error;
    }
};

export const generateKKTP = async (atpData: ATPData, semester: string, grade: string): Promise<KKTPRow[]> => {
    try {
        const isSemesterMatch = (itemSem: string, targetSem: string) => {
            if (!itemSem) return false;
            const iLower = String(itemSem).toLowerCase();
            const tLower = String(targetSem).toLowerCase();
            if (iLower === tLower) return true;
            if (tLower === 'ganjil') return ['ganjil', '1', 'gasal', 'odd', 'satu'].some(s => iLower.includes(s));
            if (tLower === 'genap') return ['genap', '2', 'even', 'dua'].some(s => iLower.includes(s));
            return false;
        };
        const contentBySem = atpData.content.filter((x: any) => isSemesterMatch(x.semester, semester));
        if (contentBySem.length === 0) {
            return [];
        }

        const response = await runWithAutoRotatedApiKey(async (ai) => {
            return await generateWithRetry(ai, {
                model,
                contents: `Berdasarkan data ATP berikut (Semester ${semester}, kelas ${grade}): ${JSON.stringify(contentBySem)}, buatkan kriteria perkembangan akademik dan karakter (Integrasi Panca Cinta) untuk setiap Tujuan Pembelajaran (TP) dalam format Kriteria Ketercapaian Tujuan Pembelajaran (KKTP).

Setiap Tujuan Pembelajaran (TP) wajib memiliki 4 kriteria tahapan perkembangan berikut:
1. mahir: Tuliskan kriteria tingkat mahir/pembiasaan untuk pemahaman TP tersebut + kriteria bagaimana murid mempraktikkan minimal 2 aktivitas cinta secara konsisten/membudaya (ambil rujukan dari kolom aktivitasCinta).
2. cakap: Tuliskan kriteria target utama akademis/pemahaman esensial TP tersebut + kriteria murid melakukan minimal 1 aktivitas cinta (ambil rujukan dari kolom aktivitasCinta).
3. layak: Tuliskan kriteria perkembangan dasar/pemahaman minimal untuk TP tersebut (fokus ke aspek akademis dasar).
4. baruBerkembang: Tuliskan kriteria perkembangan terendah/pemahaman awal untuk TP tersebut (fokus ke aspek akademis terendah/perlu bimbingan).

Ambil data materiPokok dari topikMateri ATP, tp dari tp ATP, integrasiPancaCinta dari integrasiPancaCinta ATP, dan aktivitasCinta dari aktivitasCinta ATP secara lengkap dan presisi!`,
                config: {
                    systemInstruction: `Anda adalah AI ahli penyusun Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) untuk MTsN 4 Jombang. Tugas Anda adalah menghasilkan array dari KKTPRow dalam JSON murni.
Setiap objek KKTPRow harus merepresentasikan satu TP dari input secara lengkap tanpa ada yang terlewat atau digabungkan.
Target KKTP (targetKktp) secara standar/default diatur ke 'cakap'.`,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                no: { type: Type.INTEGER },
                                materiPokok: { type: Type.STRING },
                                tp: { type: Type.STRING },
                                integrasiPancaCinta: { type: Type.STRING },
                                aktivitasCinta: { type: Type.STRING },
                                kriteria: {
                                    type: Type.OBJECT,
                                    properties: {
                                        mahir: { type: Type.STRING },
                                        cakap: { type: Type.STRING },
                                        layak: { type: Type.STRING },
                                        baruBerkembang: { type: Type.STRING }
                                    },
                                    required: ["mahir", "cakap", "layak", "baruBerkembang"]
                                },
                                targetKktp: { type: Type.STRING }
                            },
                            required: ["no", "materiPokok", "tp", "integrasiPancaCinta", "aktivitasCinta", "kriteria", "targetKktp"]
                        }
                    }
                }
            });
        }, 'Gagal membuat KKTP');

        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result)) throw new Error("Respons invalid");
        return result;
    } catch (error: any) {
        throw error;
    }
};

export const generatePROSEM = async (
    protaData: PROTAData, 
    semester: 'Ganjil' | 'Genap', 
    grade: string,
    customWeeks?: Record<string, number> | Record<string, number[]>
): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    // Default effective weeks per month if customWeeks not provided
    const defaultWeeks: Record<string, number[]> = isGanjil
        ? { 'Juli': [1, 2, 3, 4], 'Agustus': [1, 2, 3, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [1, 2, 3, 4] }
        : { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [1, 2, 3, 4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 3, 4], 'Juni': [1, 2, 3, 4, 5] };

    const headers: PROSEMHeader[] = months.map(m => {
        let weeks = 5;
        let weekNumbers: number[] | undefined = undefined;
        
        if (customWeeks) {
            const val = (customWeeks as any)[m];
            if (Array.isArray(val)) {
                weeks = val.length;
                weekNumbers = val;
            } else if (typeof val === 'number') {
                weeks = val;
                weekNumbers = Array.from({ length: val }, (_, i) => i + 1);
            } else {
                const defVal = defaultWeeks[m] || [1, 2, 3, 4, 5];
                weeks = defVal.length;
                weekNumbers = defVal;
            }
        } else {
            const defVal = defaultWeeks[m] || [1, 2, 3, 4, 5];
            weeks = defVal.length;
            weekNumbers = defVal;
        }
        return { month: m, weeks, weekNumbers };
    }).filter(h => h.weeks > 0);

    const isSemesterMatch = (itemSem: string, targetSem: string) => {
        if (!itemSem) return false;
        const iLower = String(itemSem).toLowerCase();
        const tLower = String(targetSem).toLowerCase();
        if (iLower === tLower) return true;
        if (tLower === 'ganjil') return ['ganjil', '1', 'gasal', 'odd', 'satu'].some(s => iLower.includes(s));
        if (tLower === 'genap') return ['genap', '2', 'even', 'dua'].some(s => iLower.includes(s));
        return false;
    };

    const semesterContent = protaData.content.filter(row => 
        isSemesterMatch(row.semester, semester)
    );
    
    if (semesterContent.length === 0) {
        return { headers, content: [] };
    }

    const maxJpPerWeek = Number(protaData.jamPertemuan) || 2;
    
    // Build metadata for each week of the semester
    const weekMeta: { monthName: string; weekIndexInMonth: number }[] = [];
    headers.forEach(h => {
        for (let w = 0; w < h.weeks; w++) {
            weekMeta.push({ monthName: h.month, weekIndexInMonth: w });
        }
    });

    const totalWeeks = weekMeta.length;
    const weeklyUsage = new Array(totalWeeks).fill(0);
    let globalWeekCursor = 0; 

    const finalContent: PROSEMRow[] = semesterContent.map((row) => {
        const jpMatch = row.alokasiWaktu.match(/(\d+)/);
        const totalJpForTp = jpMatch ? parseInt(jpMatch[0]) : 0;
        
        let remainingToDistribute = totalJpForTp;
        
        const distribution: Record<string, (string | null)[]> = {};
        headers.forEach(h => {
            distribution[h.month] = Array(h.weeks).fill(null);
        });

        while (remainingToDistribute > 0 && globalWeekCursor < totalWeeks) {
            const currentUsage = weeklyUsage[globalWeekCursor];
            const availableSpace = maxJpPerWeek - currentUsage;

            if (availableSpace > 0) {
                const amountToAssign = Math.min(remainingToDistribute, availableSpace);
                const meta = weekMeta[globalWeekCursor];
                
                distribution[meta.monthName][meta.weekIndexInMonth] = String(amountToAssign);
                
                weeklyUsage[globalWeekCursor] += amountToAssign;
                remainingToDistribute -= amountToAssign;
            }

            if (weeklyUsage[globalWeekCursor] >= maxJpPerWeek || availableSpace <= 0) {
                globalWeekCursor++;
            }
        }

        return {
            no: row.no,
            tujuanPembelajaran: row.tp,
            alokasiWaktu: row.alokasiWaktu,
            bulan: distribution,
            keterangan: '' 
        };
    });

    return { headers, content: finalContent };
};
