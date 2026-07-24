import { GoogleGenAI, Type } from '@google/genai';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './dbService';
import { TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow, ATPData, PROTAData, ApiKeyItem, RPMInput, IntegrationOption } from '../types';

interface KeyAttemptInfo {
  key: string;
  id?: string;
  isPoolKey: boolean;
}

const model = "gemini-3.6-flash";

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
    let legacyKey = process.env.GEMINI_API_KEY || process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as any).MY_GEMINI_API_KEY;

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

// ============================================================================
// RPM (Rencana Pembelajaran Mendalam) AI Generator
// ============================================================================

const RPM_SYSTEM_INSTRUCTION = `Anda adalah asisten ahli dalam pembuatan Rencana Pembelajaran Mendalam (RPM) untuk kurikulum madrasah di Indonesia, khususnya untuk MTsN 4 Jombang. Tugas Anda adalah membuat dokumen RPM yang lengkap, terstruktur, dan siap pakai dalam format HTML.

SANGAT PENTING:
1. Buatlah dokumen RPM yang FOKUS HANYA pada Materi Pelajaran dan Tujuan Pembelajaran (TP) terpilih yang diberikan dalam prompt. DILARANG KERAS memasukkan materi pelajaran atau TP dari bab/topik lain yang tidak dipilih oleh pengguna.
2. Ikuti struktur dan instruksi dengan TELITI menggunakan Ejaan Bahasa Indonesia yang baik dan benar.
3. Pastikan semua teks berwarna hitam atau sangat gelap agar kontrasnya tinggi dan mudah dibaca. Jangan gunakan sintaks Markdown seperti **teks tebal** di dalam output HTML Anda; sebagai gantinya, gunakan tag HTML yang sesuai seperti <b> atau <strong>.

**INSTRUKSI UNTUK VISUAL DAN SUMBER DAYA EKSTERNAL:**
Jika materi pelajaran dapat diperkaya dengan visual (gambar, diagram, video) atau sumber daya online (simulasi, artikel), Anda HARUS menyediakan tautan langsung ke sumber daya tersebut menggunakan format placeholder berikut. JANGAN memberikan deskripsi atau saran visual jika tautan tidak tersedia; lewati saja.

1.  **Untuk Tautan Visual/Sumber Daya:** Gunakan format [Visual: https://contoh.link/sumberdaya]. Sistem akan mengubah ini menjadi tautan yang dapat diklik. Contoh: [Visual: https://www.youtube.com/watch?v=some_video].

2.  **Untuk Kode QR (Akses Cepat):** Gunakan format [QR Code: https://contoh.link/sumberdaya] HANYA jika Anda ingin menyediakan akses cepat melalui pemindaian (misalnya untuk LKPD cetak). Sistem akan membuat kode QR dari tautan tersebut.`;

function createRPMPrompt(data: RPMInput): string {
  const {
    teacherName,
    teacherNip,
    className,
    semester,
    subject,
    learningObjectives,
    subjectMatter,
    studentTarget,
    language,
    meetings,
    pedagogicalPractices,
    graduateDimensions,
    integrationOption,
    kbcPancaCintaFromATP
  } = data;

  const studentDescription = studentTarget && studentTarget.trim() !== ''
    ? studentTarget.trim()
    : `Generate deskripsi singkat karakteristik umum murid kelas ${className} di madrasah tsaniyah.`;

  const practicesText = (pedagogicalPractices || [])
    .map((practice, index) => `Pertemuan ${index + 1}: ${practice}`)
    .join(', ');

  const atpPancaCintaText = kbcPancaCintaFromATP ? `
    **DATA INTEGRASI PANCA CINTA (DARI DOKUMEN ATP):**
    ${kbcPancaCintaFromATP}
    (Gunakan data Integrasi Panca Cinta dan Aktivitas Cinta di atas secara langsung pada bagian Topik Panca Cinta, Materi Insersi, dan Pengalaman Belajar KBC).
  ` : '';

  const kbcInstruction = `
    **INSTRUKSI INTEGRASI KBC (PENTING DAN SELALU DITERAPKAN):**
    Setiap kali Anda mengintegrasikan nilai dari "Topik Panca Cinta" (Kurikulum Berbasis Cinta/KBC) ke dalam aktivitas atau penjelasan, Anda HARUS:
    1. Membungkus teks yang relevan dengan tag <span style="background-color: #FDB5EE;">.
    2. Mengakhiri teks yang disorot dengan label tebal: <b>(KBC)</b>.
    ${atpPancaCintaText}
  `;

  let integrationPrompt = '';
  if (integrationOption === IntegrationOption.SRA || integrationOption === 'Satuan Pendidikan Ramah Anak (SRA)') {
    integrationPrompt = `
      **INSTRUKSI TAMBAHAN (SRA):**
      Integrasikan prinsip-prinsip Satuan Pendidikan Ramah Anak (SRA) berikut ke dalam aktivitas pembelajaran:
      - **Inklusif & Non-Diskriminatif:** Pastikan semua murid merasa diterima dan dihargai tanpa memandang latar belakang.
      - **Partisipatif:** Rancang kegiatan yang mendorong murid untuk aktif menyuarakan pendapat dan terlibat dalam pengambilan keputusan.
      - **Disiplin Positif:** Terapkan pendekatan disiplin tanpa kekerasan fisik/psikis dan tidak merendahkan martabat murid dalam skenario interaksi guru-murid.
      - **Penanda dan Pewarnaan (PENTING):**
        - Untuk setiap bagian yang secara eksplisit mengintegrasikan nilai SRA, bungkus teks yang relevan dalam tag <span style="background-color: #37E69A;">.
        - AKHIRI teks yang disorot dengan penanda tebal yang spesifik, yang menjelaskan prinsip SRA yang sedang diintegrasikan. Contoh: <b>(Prinsip Partisipasi Anak)</b>, <b>(Pendekatan Disiplin Positif)</b>, atau <b>(Prinsip Inklusivitas)</b>. JANGAN gunakan label generik "Insersi Nilai SRA".
    `;
  } else if (integrationOption === IntegrationOption.LITERASI || integrationOption === 'Penguatan Literasi') {
    integrationPrompt = `
      **INSTRUKSI TAMBAHAN (LITERASI):**
      Sisipkan kompetensi Literasi (pemahaman tekstual, inferensi, evaluasi) ke dalam modul ajar ini.
      Fokuskan modifikasi pada:
      - Aktivitas: Menggunakan stimulus berupa teks (artikel, berita, kutipan, atau studi kasus) yang relevan dengan materi.
      - Asesmen: Mengukur kemampuan penalaran dan analisis teks murid terhadap stimulus tersebut.
      - **Penanda dan Pewarnaan (PENTING):**
        - Untuk setiap bagian yang dimodifikasi untuk integrasi Literasi, bungkus teks yang relevan dalam tag <span style="background-color: #F0F32B;">.
        - Setelah teks yang disorot, tambahkan penanda tebal yang spesifik, yang menjelaskan kompetensi Literasi yang sedang diperkuat. Contoh: <b>(Penguatan Literasi: Evaluasi Teks)</b>, atau <b>(Penguatan Literasi: Pemahaman Tekstual)</b>. JANGAN gunakan label generik "Penguatan Literasi".

      **INSTRUKSI ASESMEN KHUSUS LITERASI (SANGAT PENTING):**
      Saat membuat soal untuk asesmen formatif dan sumatif, Anda HARUS mengikuti format soal HOTS (Higher-Order Thinking Skills) berbasis Literasi yang mengukur <b>PENALARAN TEKS</b>, bukan sekadar hafalan.
      
      <b>Format Wajib untuk Setiap Soal:</b>
      <ol style="list-style-type: none; padding-left: 0;">
        <li><b>1. Stimulus:</b> Awali SETIAP soal dengan stimulus berbasis teks yang relevan dengan materi. Stimulus dapat berupa:<br/>
        - Teks singkat (artikel, berita, kutipan)<br/>
        - Studi kasus singkat</li>
        <li><b>2. Pertanyaan:</b> Buat pertanyaan yang menuntut murid untuk:<br/>
        - <b>Menganalisis:</b> Menguraikan informasi dari stimulus teks.<br/>
        - <b>Mengevaluasi:</b> Memberikan penilaian atau argumen berdasarkan stimulus teks.<br/>
        - <b>Menghubungkan:</b> Mengaitkan konsep dalam teks dengan konteks lain.</li>
      </ol>
      <b>Contoh Struktur:</b><br/>
      <i>[STIMULUS: Sebuah artikel pendek tentang sejarah penemuan...]</i><br/>
      <b>Pertanyaan:</b> Berdasarkan teks tersebut, simpulan apa yang bisa diambil tentang... Jelaskan alasanmu. <b>(Penguatan Literasi: Evaluasi Teks)</b>
    `;
  } else if (integrationOption === IntegrationOption.NUMERASI || integrationOption === 'Penguatan Numerasi') {
    integrationPrompt = `
      **INSTRUKSI TAMBAHAN (NUMERASI):**
      Sisipkan kompetensi Numerasi (interpretasi data, penalaran matematis, pemecahan masalah) ke dalam modul ajar ini.
      Fokuskan modifikasi pada:
      - Aktivitas: Menggunakan stimulus berupa angka, data, tabel, statistik, atau infografis yang relevan dengan materi.
      - Asesmen: Mengukur kemampuan interpretasi data dan pemecahan masalah murid terhadap stimulus tersebut.
      - **Penanda dan Pewarnaan (PENTING):**
        - Untuk setiap bagian yang dimodifikasi untuk integrasi Numerasi, bungkus teks yang relevan dalam tag <span style="background-color: #90CDF4;">.
        - Setelah teks yang disorot, tambahkan penanda tebal yang spesifik, yang menjelaskan kompetensi Numerasi yang sedang diperkuat. Contoh: <b>(Penguatan Numerasi: Interpretasi Data)</b>, atau <b>(Penguatan Numerasi: Pemecahan Masalah)</b>. JANGAN gunakan label generik "Penguatan Numerasi".

      **INSTRUKSI ASESMEN KHUSUS NUMERASI (SANGAT PENTING):**
      Saat membuat soal untuk asesmen formatif dan sumatif, Anda HARUS mengikuti format soal HOTS (Higher-Order Thinking Skills) berbasis Numerasi yang mengukur <b>PENALARAN DATA/ANGKA</b>, bukan sekadar hafalan.
      
      <b>Format Wajib untuk Setiap Soal:</b>
      <ol style="list-style-type: none; padding-left: 0;">
        <li><b>1. Stimulus:</b> Awali SETIAP soal dengan stimulus berbasis numerik/data yang relevan dengan materi. Stimulus dapat berupa:<br/>
        - Data (tabel, statistik)<br/>
        - Visual (grafik, diagram, infografis)</li>
        <li><b>2. Pertanyaan:</b> Buat pertanyaan yang menuntut murid untuk:<br/>
        - <b>Menganalisis:</b> Menguraikan atau membaca tren dari data.<br/>
        - <b>Mengevaluasi:</b> Memberikan penilaian kuantitatif berdasarkan stimulus.<br/>
        - <b>Memecahkan masalah:</b> Menggunakan data untuk menarik simpulan atau solusi logis.</li>
      </ol>
      <b>Contoh Struktur:</b><br/>
      <i>[STIMULUS: Sebuah infografis statistik tentang...]</i><br/>
      <b>Pertanyaan:</b> Berdasarkan data pada infografis tersebut, apa yang akan terjadi jika... Jelaskan berdasarkan perhitungan atau tren data. <b>(Penguatan Numerasi: Interpretasi Data)</b>
    `;
  }
    
  let lkpdInstructions = '';
  for (let i = 0; i < meetings; i++) {
    const meetingNumber = i + 1;
    const practice = (pedagogicalPractices && pedagogicalPractices[i]) || 'Pembelajaran Interaktif';
    lkpdInstructions += `
        <br class="page-break" />
        <h3><b>Lampiran ${meetingNumber}: Lembar Kerja Murid (Pertemuan Ke-${meetingNumber})</b></h3>
          <p><b>PENTING:</b> Desain LKM ini secara spesifik untuk mendukung praktik pedagogis <b>${practice}</b>.</p>
          <h4><b>A. Identitas</b></h4>
          <p>Nama: _______________________<br>
             Kelas: ${className}<br>
             No. Absen: _______________________<br>
             Pertemuan Ke: ${meetingNumber}</p>
          <h4><b>B. Petunjuk Penggunaan</b></h4>
          <p>Jelaskan cara mengerjakan LKM yang disesuaikan dengan sintaks dari <b>${practice}</b>.</p>
          <h4><b>C. Kegiatan Pembelajaran (Sintaks: ${practice})</b></h4>
          <p>Integrasikan sintaks dan pengalaman belajar tanpa menggunakan tabel. Buat kegiatan yang relevan dengan sintaks <b>${practice}</b>. Misalnya, jika PjBL, fokus pada langkah-langkah proyek. Jika Inquiry-Discovery, fokus pada pertanyaan penuntun dan observasi.</p>
            <h5><b>1. Memahami</b></h5>
            <p>Sajikan ringkasan materi singkat yang relevan untuk pertemuan ini + 2-3 pertanyaan pemahaman kunci.</p>
            <h5><b>2. Mengaplikasikan</b></h5>
            <p>Berikan 1 tugas inti atau studi kasus yang mencerminkan sintaks <b>${practice}</b> secara nyata, dengan instruksi yang jelas.</p>
            <h5><b>3. Merefleksikan</b></h5>
            <p>Berikan 2-3 pertanyaan refleksi yang mendalam terkait pengalaman belajar murid menggunakan metode <b>${practice}</b> pada pertemuan ini.</p>
          <h4><b>D. Penutup</b></h4>
          <p>Berikan sebuah kalimat penyemangat dan checklist pemahaman diri sederhana.</p>
    `;
  }

  let openingInstruction: string;
  let closingInstruction: string;

  switch (language) {
    case 'Bahasa Arab':
      openingInstruction = `**Mulai kegiatan awal dengan salam pembuka Islami yang interaktif dalam Bahasa Arab. PENTING: Tuliskan transliterasi Latin terlebih dahulu, diikuti dengan teks Arab asli dalam tanda kurung. Contoh: 'Assalamu'alaikum warahmatullahi wabarakatuh (السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ). Kaifa halukum jamian? (كَيْفَ حَالُكُمْ جَمِيْعًا؟) Mari kita mulai pelajaran hari ini dengan membaca doa bersama.' Buatlah kalimat yang mengajak murid berinteraksi, BUKAN hanya salam saja.**`;
      closingInstruction = `**Akhiri kegiatan penutup dengan kalimat penutup yang interaktif dalam Bahasa Arab. PENTING: Tuliskan transliterasi Latin terlebih dahulu, diikuti dengan teks Arab asli dalam tanda kurung. Contoh: 'Alhamdulillah, kita telah menyelesaikan pelajaran hari ini. Hayya nakhtatim darsana bi qira'ati hamdalah (هيا نختتم درسنا بقراءة الحمدلة). Wassalamu'alaikum warahmatullahi wabarakatuh (وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ).' Buatlah kalimat penutup yang baik, BUKAN hanya salam saja.**`;
      break;
    case 'Bahasa Inggris':
      openingInstruction = `**Mulai kegiatan awal ini dengan salam pembuka yang interaktif dalam Bahasa Inggris. Contohnya, 'Good morning, class! How is everyone today? Let's start our lesson by...' Buatlah kalimat yang mengajak murid berinteraksi, BUKAN hanya salam saja.**`;
      closingInstruction = `**Akhiri kegiatan penutup ini dengan kalimat penutup yang interaktif dalam Bahasa Inggris. Contohnya, 'Alright everyone, that's all for today. Do you have any questions? See you next time! Good bye.' Buatlah kalimat penutup yang baik, BUKAN hanya salam saja.**`;
      break;
    default:
      openingInstruction = `**Mulai kegiatan awal dengan salam pembuka.**`;
      closingInstruction = `**Akhiri kegiatan penutup dengan salam penutup.**`;
  }

  let assessmentSectionHtml = `
    <br class="page-break" />
    <h3><b>Lampiran ${meetings + 1}: Instrumen Asesmen</b></h3>
      <h4><b>A. Asesmen Diagnostik (Awal)</b></h4>
      <p>Buat 5 soal pertanyaan pemantik atau kuis singkat yang relevan dengan materi, beserta kunci jawabannya, untuk mengukur pemahaman awal murid.</p>
      
      <h4><b>B. Instrumen Asesmen Formatif</b></h4>
      <p><b>PENTING:</b> Buat instrumen yang relevan dengan metode asesmen formatif yang Anda jelaskan di bagian E.2. Misalnya: Jika penilaian LKM (Lembar Kerja Murid), buat rubrik penilaian detail untuk setiap LKM. Jika observasi, buat lembar ceklis observasi partisipasi murid.</p>
      
      <h4><b>C. Instrumen Asesmen Sumatif</b></h4>
      <p><b>PENTING:</b> Buat instrumen yang relevan dengan metode asesmen sumatif yang Anda jelaskan di bagian E.3. Misalnya: Jika tes tulis, buat 5-10 soal pilihan ganda atau esai lengkap dengan kunci jawaban dan pedoman penskoran. Jika penilaian proyek/produk, buat rubrik penilaian yang komprehensif.</p>
      
      <h4><b>D. Rubrik Penilaian Sikap</b></h4>
      <p>Buat satu tabel rubrik HTML untuk menilai sikap murid yang mencakup dimensi lulusan yang dipilih (misalnya: Bernalar Kritis, Kreatif, Gotong Royong, dll.).</p>
  `;

  if (integrationOption === IntegrationOption.LITERASI || integrationOption === 'Penguatan Literasi' || integrationOption === IntegrationOption.NUMERASI || integrationOption === 'Penguatan Numerasi') {
    const isLiterasi = integrationOption === IntegrationOption.LITERASI || integrationOption === 'Penguatan Literasi';
    const label = isLiterasi ? "Literasi" : "Numerasi";
    assessmentSectionHtml = `
    <br class="page-break" />
    <h3><b>Lampiran ${meetings + 1}: Instrumen Asesmen</b></h3>
      <h4><b>A. Asesmen Diagnostik (Awal)</b></h4>
      <p>Buat 5 soal pertanyaan pemantik atau kuis singkat yang relevan dengan materi, beserta kunci jawabannya, untuk mengukur pemahaman awal murid.</p>
      
      <h4><b>B. Instrumen Asesmen Formatif (Berbasis ${label})</b></h4>
      <p>Buatlah instrumen asesmen formatif (misalnya, soal analisis kasus dalam LKM). Pastikan setiap soal mengikuti format HOTS berbasis ${label} (Stimulus lalu Pertanyaan) seperti yang telah diinstruksikan sebelumnya, lengkap dengan kunci jawaban dan pedoman penskoran. Ingat untuk menerapkan penandaan ${label} <span style="background-color: ${isLiterasi ? '#F0F32B' : '#90CDF4'};">(warna disorot)</span> pada soal yang Anda buat.</p>
      
      <h4><b>C. Instrumen Asesmen Sumatif (Berbasis ${label})</b></h4>
      <p>Buatlah 5-10 soal untuk asesmen sumatif (bisa pilihan ganda atau esai). Pastikan setiap soal mengikuti format HOTS berbasis ${label} (Stimulus lalu Pertanyaan) seperti yang telah diinstruksikan sebelumnya, lengkap dengan kunci jawaban dan pedoman penskoran. Ingat untuk menerapkan penandaan ${label} <span style="background-color: ${isLiterasi ? '#F0F32B' : '#90CDF4'};">(warna disorot)</span> pada soal yang Anda buat.</p>
      
      <h4><b>D. Rubrik Penilaian Sikap</b></h4>
      <p>Buat satu tabel rubrik HTML untuk menilai sikap murid yang mencakup dimensi lulusan yang dipilih (misalnya: Bernalar Kritis, Kreatif, Gotong Royong, dll.).</p>
    `;
  }


  return `
    Berdasarkan input berikut:
    - Nama Guru: ${teacherName}
    - NIP Guru: ${teacherNip}
    - Kelas: ${className}
    - Semester: ${semester}
    - Mata Pelajaran: ${subject}
    - Tujuan Pembelajaran Terpilih: ${learningObjectives}
    - Materi Pelajaran Terpilih: ${subjectMatter}
    - Target Murid: ${studentDescription}
    - Bahasa Pembuka/Penutup: ${language}
    - Jumlah Pertemuan: ${meetings}
    - Praktik Pedagogis per Pertemuan: ${practicesText}
    - Dimensi Lulusan: ${(graduateDimensions || []).join(', ')}
    - Opsi Integrasi: ${integrationOption}

    **INSTRUKSI BATASAN CAKUPAN DOKUMEN (SANGAT PENTING & UTAMA):**
    - Dokumen RPM ini HARUS DIBUAT KHUSUS DAN HANYA UNTUK MATERI PELAJARAN: "${subjectMatter}" DAN TUJUAN PEMBELAJARAN TERPILIH SAJA:
      "${learningObjectives}"
    - DILARANG KERAS membuat RPM untuk materi pelajaran lain, bab/topik lain, atau TP di luar yang tertera di atas.
    - Semua bagian dokumen (termasuk Identifikasi, Desain Pembelajaran, Pengalaman Belajar per Pertemuan, LKM, dan Instrumen Asesmen) HARUS HANYA FOKUS pada materi (${subjectMatter}) dan TP terpilih di atas.
    - Buat dokumen yang terstruktur, padat, dan berkualitas tinggi tanpa memperluas cakupan ke topik/materi lain yang tidak dipilih.

    ${kbcInstruction}
    ${integrationPrompt}

    **INTEGRASI PANCA CINTA ATP (SANGAT PENTING):**
    ${kbcPancaCintaFromATP ? `Gunakan data Panca Cinta & Aktivitas Cinta dari ATP berikut untuk diintegrasikan secara alami ke dalam alur pembelajaran (Awal, Inti, Penutup) dan topik RPM:\n${kbcPancaCintaFromATP}` : 'Hubungkan topik pembelajaran dengan dimensi Panca Cinta (Cinta Allah/Rasul, Cinta Ilmu, Cinta Lingkungan, Cinta Diri/Sesama, Cinta Tanah Air) secara kontekstual.'}

    **ATURAN GAYA PENTING (PERATAAN TEKS & LAMPIRAN):**
    - Untuk bagian utama Tabel RPM (Pengalaman Belajar, Identifikasi, dll.): gunakan perataan rata kanan-kiri (style="text-align: justify;").
    - UNTUK SELURUH BAGIAN LAMPIRAN (termasuk LKPD/LKM, Instrumen Asesmen Formatif, Asesmen Sumatif, Soal, Kunci Jawaban, dan Rubrik Penilaian), Anda HARUS menggunakan perataan RATA KIRI (style="text-align: left;") - DILARANG KERAS justify pada elemen-elemen di dalam Lampiran.
    - Bungkus seluruh bagian Lampiran mulai dari "LAMPIRAN-LAMPIRAN" dalam elemen <div class="lampiran-section" style="text-align: left;">...</div>.

    **ATURAN POIN BULLET DAN NUMBERING:** Untuk semua poin bullet dan penomoran (<ul>, <ol>, <li>), atur indentasi menggunakan indent left 0 cm dan hanging by 0,63 cm (menggunakan style="margin-left: 0.63cm; text-indent: -0.63cm; padding-left: 0;" atau CSS list style terkait).

    **ATURAN TABEL TANDA TANGAN (PRESISI & FIXED LAYOUT):**
    Tabel tanda tangan pada dokumen ekspor WAJIB disetel secara tetap (table-layout: fixed) untuk memastikan tata letak tidak berubah ukuran secara otomatis (no autofit):
    - Tabel tanda tangan menggunakan tag: <table class="signature-table" style="width: 100%; table-layout: fixed; border-collapse: collapse; border: none; text-align: left; margin-top: 0;">
    - Memiliki 1 baris (<tr>) dan 2 kolom (<td>).
    - **Kolom Kiri:** Lebar 566.9 pt (20 cm) untuk bagian "Mengetahui / Kepala Madrasah". Tag: <td class="col-left" style="width: 566.9pt; border: none; line-height: 1.2; text-align: left; vertical-align: top; padding: 0;">
    - **Kolom Kanan:** Lebar 226.77 pt (8 cm) untuk bagian penulisan tanggal dan "Guru Mata Pelajaran". Tag: <td class="col-right" style="width: 226.77pt; border: none; line-height: 1.2; text-align: left; vertical-align: top; padding: 0;">
    - **Perataan Teks:** Semua teks dalam tabel tanda tangan HARUS **rata kiri** (text-align: left;).

    **ATURAN PEMISAH HALAMAN (SANGAT PENTING):**
    Untuk memulai halaman baru, sisipkan tag **hanya-satu** <br class="page-break" /> TEPAT SEBELUM elemen judul (<h2> atau <h3>) dari setiap bagian yang harus memulai halaman baru. Ini berlaku untuk judul utama "Lampiran" dan untuk setiap sub-lampiran (misalnya, "Lampiran 1", "Lampiran 2", "Instrumen Asesmen").
    **DILARANG KERAS:** Jangan pernah menggunakan <div class="page-break"> atau menerapkan gaya CSS page-break-before: always secara langsung pada elemen lain seperti <p>, <div>, <li>, atau di dalam tabel. Metode <br class="page-break" /> adalah satu-satunya cara yang diizinkan.

    **ATURAN KONTEN BERSIH (SANGAT PENTING):**
    JANGAN PERNAH membuat tag HTML yang kosong atau hanya berisi spasi. Contoh yang DILARANG: <p></p>, <p>&nbsp;</p>, <li></li>. Setiap tag harus berisi konten yang substantif untuk mencegah adanya baris-baris kosong yang tidak perlu dalam dokumen akhir.

    **STRUKTUR OUTPUT HTML UTAMA:**

    Gunakan sebuah div kontainer utama dengan gaya style="color: #000;". Di dalamnya, buatlah struktur berikut:

    1.  **Tabel RPM (Dua Kolom):** Buat sebuah tabel HTML (<table>) dengan kelas 'w-full border-collapse'. Kolom pertama adalah "Komponen" dan kedua "Isi". 
        - Gunakan <thead> untuk header.
        - Gunakan <tbody> untuk konten.
        - Untuk setiap baris komponen, gunakan <tr>.
        - Kolom "Komponen" (<td>) harus bold dan rata atas (style="font-weight: bold; vertical-align: top; width: 30%; padding: 8px; border: 1px solid #ddd;").
        - Kolom "Isi" (<td>) harus diberi gaya style="padding: 8px; border: 1px solid #ddd;". Gunakan aturan gaya umum untuk perataan teks paragraf di dalamnya.
        - Untuk header seksi seperti "IDENTITAS", gunakan <tr style="background-color: #f2f2f2;"><td colspan="2" style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">NAMA SEKSI</td></tr>.

    **Isi Tabel RPM:**

    a. **IDENTITAS**
       - Nama Madrasah: MTsN 4 Jombang
       - Mata Pelajaran: ${subject}
       - Kelas/Semester: ${className} / ${semester}
       - Durasi Pertemuan: ${meetings} x (2 x 40 menit)

    b. **IDENTIFIKASI**
       - Target Murid: ${studentDescription}
       - Materi Pelajaran: ${subjectMatter}
       - Capaian Dimensi Lulusan: ${(graduateDimensions || []).join(', ')}
       - Topik Panca Cinta: Analisislah materi pelajaran dan tujuan pembelajaran untuk memilih 2-3 dimensi Kurikulum Berbasis Cinta (KBC) yang paling relevan dari daftar berikut: [Cinta Allah dan Rasul-Nya, Cinta Ilmu, Cinta Lingkungan, Cinta Diri dan Sesama, Cinta Tanah Air].
       - Materi Insersi: Untuk setiap Topik Panca Cinta yang dipilih, tuliskan satu kalimat singkat yang menggambarkan nilai cinta yang diintegrasikan dalam pembelajaran.

    c. **DESAIN PEMBELAJARAN**
       - Lintas Disiplin Ilmu: Generate 1-2 disiplin ilmu lain yang relevan dengan materi.
       - Tujuan Pembelajaran: ${learningObjectives}
       - Topik Pembelajaran: Buat judul topik yang lebih spesifik dan menarik dari input 'Materi Pelajaran'.
       - Praktik Pedagogis per Pertemuan: ${practicesText}
       - Kemitraan Pembelajaran: Generate saran kemitraan yang relevan (misal: orang tua, perpustakaan sekolah).
       - Lingkungan Pembelajaran: Generate saran lingkungan belajar yang sesuai (misal: di dalam kelas, di luar kelas, laboratorium).
       - Pemanfaatan Digital: Generate saran tools digital relevan beserta tautan (contoh: Quizizz, Canva, YouTube).

    d. **PENGALAMAN BELAJAR**
       - Memahami (berkesadaran, bermakna, menggembirakan): Generate langkah-langkah kegiatan awal. ${openingInstruction} Setelah menjelaskan tujuan, tambahkan satu paragraf singkat untuk membangun koneksi emosional murid dengan mengaitkan materi pada salah satu nilai KBC (ingat untuk menerapkan penanda dan pewarnaan KBC sesuai instruksi di atas).
       - Mengaplikasi (berkesadaran, bermakna, menggembirakan): Generate langkah-langkah kegiatan inti detail untuk setiap pertemuan sesuai sintaks dari praktik pedagogis masing-masing (${practicesText}). Tambahkan instruksi spesifik untuk mendorong refleksi nilai KBC dalam aktivitas (ingat untuk menerapkan penanda dan pewarnaan KBC sesuai instruksi di atas).
       - Refleksi (berkesadaran, bermakna, menggembirakan): Generate langkah-langkah kegiatan penutup. ${closingInstruction}

    e. **ASESMEN PEMBELAJARAN**
       - Asesmen Awal (diagnostik/apersepsi): Jelaskan metode asesmen awal (misal: pertanyaan pemantik lisan, kuis singkat).
       - Asesmen Formatif (for/as learning): Jelaskan metode asesmen formatif (misal: observasi partisipasi, penilaian LKM/LKPD, penilaian antar teman).
       - Asesmen Sumatif (of learning): Jelaskan metode asesmen sumatif (misal: tes tulis di akhir bab, penilaian proyek, presentasi).

    2.  **Tanda Tangan:** Setelah tabel utama, buatlah sebuah tabel baru untuk bagian tanda tangan dengan gaya <table class="signature-table" style="width: 100%; table-layout: fixed; border-collapse: collapse; border: none; text-align: left; margin-top: 0;">. PASTIKAN TIDAK ADA MARGIN SEBELUM ATAU SESUDAH TABEL INI. Tabel ini harus memiliki satu baris (<tr>) dan dua kolom (<td>). Semua teks di dalamnya rata kiri (text-align: left).
        - Kolom kiri (lebar 566.9 pt / 20 cm): <td class="col-left" style="width: 566.9pt; border: none; line-height: 1.2; text-align: left; vertical-align: top; padding: 0;">Mengetahui,<br/>Kepala MTsN 4 Jombang<br/><br/><br/><br/><b>Dr. Aziz Ja'far, S.Th.I., M.Pd.I</b><br/>NIP. 197610062007101008</td>
        - Kolom kanan (lebar 226.77 pt / 8 cm): <td class="col-right" style="width: 226.77pt; border: none; line-height: 1.2; text-align: left; vertical-align: top; padding: 0;">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Guru Mata Pelajaran<br/><br/><br/><br/><b>${teacherName}</b><br/>NIP. ${teacherNip}</td>

    3.  **LAMPIRAN:** Gunakan <br class="page-break" /><h2 style="text-align: center; font-size: 36px; font-weight: bold;">LAMPIRAN-LAMPIRAN</h2> untuk memulai di halaman baru.
        ${lkpdInstructions}
        ${assessmentSectionHtml}

    Pastikan seluruh output adalah satu blok kode HTML yang valid dan rapi (tanpa pembungkus markdown codeblock \`\`\`html).
    `;
}

export const generateRPMStream = async (
  data: RPMInput,
  onChunk: (currentHtml: string) => void
): Promise<string> => {
  const prompt = createRPMPrompt(data);
  let accumulatedText = '';

  await runWithAutoRotatedApiKey(async (ai) => {
    accumulatedText = '';
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: RPM_SYSTEM_INSTRUCTION,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        // Strip markdown code block wrappers if generated by AI
        let cleanText = accumulatedText;
        cleanText = cleanText.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
        onChunk(cleanText);
      }
    }
    return accumulatedText;
  }, "Membuat Rencana Pembelajaran Mendalam (RPM)");

  let cleanFinal = accumulatedText.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
  return cleanFinal;
};
