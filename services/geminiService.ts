import { GoogleGenAI, Type } from '@google/genai';
import { TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow, ATPData, PROTAData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-pro";

export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    try {
        const response = await ai.models.generateContent({
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
        return result as TPGroup[];
    } catch (e: any) {
        console.error(e);
        throw new Error(`Gagal membuat TP: ${e.message}`);
    }
};

export const generateATP = async (tpData: { subject: string; grade: string; tpGroups: TPGroup[] }): Promise<ATPTableRow[]> => {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Susun Alur Tujuan Pembelajaran (ATP) dari data TP berikut: ${JSON.stringify(tpData.tpGroups)}`,
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
                            semester: { type: Type.STRING }
                        },
                        required: ["topikMateri", "tp", "kodeTp", "atpSequence", "semester"]
                    }
                }
            }
        });
        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result as ATPTableRow[];
    } catch (error: any) {
       console.error(error);
       throw new Error(`Gagal membuat ATP: ${error.message}`);
    }
};

export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number): Promise<PROTARow[]> => {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Buatkan Program Tahunan (PROTA) berdasarkan ATP berikut: ${JSON.stringify(atpData.content)}. Total JP per minggu: ${totalJpPerWeek}. Hitung alokasi waktu semestinya.`,
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
                            semester: { type: Type.STRING }
                        },
                        required: ["no", "topikMateri", "alurTujuanPembelajaran", "tujuanPembelajaran", "alokasiWaktu", "semester"]
                    }
                }
            }
        });
        const result = response.text ? JSON.parse(response.text) : null;
        if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
        return result as PROTARow[];
    } catch (error: any) {
       console.error(error);
       throw new Error(`Gagal membuat PROTA: ${error.message}`);
    }
};

export const generateKKTP = async (atpData: ATPData, semester: string, grade: string): Promise<KKTPRow[]> => {
    try {
        const contentBySem = atpData.content.filter(x => x.semester.toLowerCase() === semester.toLowerCase());
        if (contentBySem.length === 0) return [];
        const response = await ai.models.generateContent({
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
        return result as KKTPRow[];
    } catch (error: any) {
       console.error(error);
       throw new Error(`Gagal membuat KKTP: ${error.message}`);
    }
};

export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
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
