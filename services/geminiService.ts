import { GoogleGenAI, Type } from '@google/genai';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './dbService';
import { TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow, ATPData, PROTAData } from '../types';

const getAI = async () => {
    let geminiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;
    try {
        const docRef = doc(db, 'settings', 'admin');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().geminiApiKey) {
            geminiKey = snap.data().geminiApiKey;
        }
    } catch (e) {
        console.error("Gagal memuat API Key dari database", e);
    }
    if (!geminiKey) {
        throw new Error('API Key tidak ditemukan. Silakan login sebagai admin dan atur di menu Pengaturan API.');
    }
    return new GoogleGenAI({ apiKey: geminiKey });
};

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
    } else if (errorMsg.includes('429')) {
        errorMsg = 'Terlalu banyak permintaan ke server AI. Silakan tunggu beberapa saat lalu coba lagi.';
    } else if (errorMsg.includes('403') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('PERMISSION_DENIED')) {
        errorMsg = 'API Key Anda tidak valid atau telah diblokir. Harap periksa kembali konfigurasi API Key Anda.';
    }
    throw new Error(`${context}: ${errorMsg}`);
};

export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    try {
        const ai = await getAI();
        const response = await generateWithRetry(ai, {
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
                            semester: { type: Type.STRING },
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
        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result;
    } catch (e: any) {
        handleGeminiError(e, 'Gagal membuat TP');
    }
    return [];
};

export const generateATP = async (tpData: { subject: string; grade: string; tpGroups: TPGroup[] }): Promise<ATPTableRow[]> => {
    try {
        const ai = await getAI();
        const response = await generateWithRetry(ai, {
            model,
            contents: `Susun Alur Tujuan Pembelajaran (ATP) dari data TP berikut: ${JSON.stringify(tpData.tpGroups)}. Pastikan kolom semester HANYA berisi nilai 'Ganjil' atau 'Genap'.`,
            config: {
                systemInstruction: "Anda adalah AI pembuat ATP. Kembalikan array berisi objek ATP. Berikan output JSON murni.",
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
                            semester: { type: Type.STRING, enum: ["Ganjil", "Genap"], description: "Harus 'Ganjil' atau 'Genap'" }
                        },
                        required: ["topikMateri", "tp", "kodeTp", "atpSequence", "semester"]
                    }
                }
            }
        });
        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result;
    } catch (error: any) {
       handleGeminiError(error, 'Gagal membuat ATP');
    }
    return [];
};

export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number): Promise<PROTARow[]> => {
    try {
        const ai = await getAI();
        const response = await generateWithRetry(ai, {
            model,
            contents: `Buatkan Program Tahunan (PROTA) berdasarkan ATP berikut: ${JSON.stringify(atpData.content)}. Total JP per minggu: ${totalJpPerWeek}. Hitung alokasi waktu semestinya. Pastikan kolom semester HANYA berisi 'Ganjil' atau 'Genap'.`,
            config: {
                systemInstruction: "Anda adalah pembuat PROTA. Kembalikan array PROTARow dalam JSON.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            no: { type: Type.INTEGER },
                            topikMateri: { type: Type.STRING },
                            alurTujuanPembelajaran: { type: Type.STRING },
                            tujuanPembelajaran: { type: Type.STRING },
                            alokasiWaktu: { type: Type.STRING },
                            semester: { type: Type.STRING, enum: ["Ganjil", "Genap"], description: "Harus 'Ganjil' atau 'Genap'" }
                        },
                        required: ["no", "topikMateri", "alurTujuanPembelajaran", "tujuanPembelajaran", "alokasiWaktu", "semester"]
                    }
                }
            }
        });
        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result;
    } catch (error: any) {
       handleGeminiError(error, 'Gagal membuat PROTA');
    }
    return [];
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
        const ai = await getAI();
        const response = await generateWithRetry(ai, {
            model,
            contents: `Berdasarkan ATP berikut (Semester ${semester}, kelas ${grade}): ${JSON.stringify(contentBySem)}, buatkan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP). Kriteria: Sangat Mahir, Mahir, Cukup Mahir, Perlu Bimbingan. Tentukan targetnya (sangatMahir, mahir, cukupMahir, atau perluBimbingan).`,
            config: {
                systemInstruction: "Hasilkan array dari KKTPRow dalam JSON murni.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            no: { type: Type.INTEGER },
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
                                required: ["sangatMahir", "mahir", "cukupMahir", "perluBimbingan"]
                            },
                            targetKktp: { type: Type.STRING }
                        },
                        required: ["no", "materiPokok", "tp", "kriteria", "targetKktp"]
                    }
                }
            }
        });
        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result)) throw new Error("Respons invalid");
        return result;
    } catch (error: any) {
       handleGeminiError(error, 'Gagal membuat KKTP');
    }
    return [];
};

export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    const weeksPerMonth = 5;
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: weeksPerMonth }));

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
    const totalWeeks = months.length * weeksPerMonth;
    
    const weeklyUsage = new Array(totalWeeks).fill(0);
    let globalWeekCursor = 0; 

    const finalContent: PROSEMRow[] = semesterContent.map((row) => {
        const jpMatch = row.alokasiWaktu.match(/(\d+)/);
        const totalJpForTp = jpMatch ? parseInt(jpMatch[0]) : 0;
        
        let remainingToDistribute = totalJpForTp;
        
        const distribution: Record<string, (string | null)[]> = {};
        months.forEach(m => { distribution[m] = Array(weeksPerMonth).fill(null); });

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
