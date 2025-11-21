import { GoogleGenAI, Type } from "@google/genai";
import { TPData, ATPData, PROTAData, KKTPData, PROSEMData, PROSEMHeader, PROSEMRow, TPGroup, ATPTableRow, PROTARow, KKTPRow } from '../types';

// Helper to extract JSON from AI response which might be wrapped in markdown
const extractJsonArray = (text: string): any[] => {
    try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;
        // Simple attempt to find array brackets if raw text
        const start = jsonString.indexOf('[');
        const end = jsonString.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            return JSON.parse(jsonString.substring(start, end + 1));
        }
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn("Failed to parse JSON from AI response:", e);
        return [];
    }
};

// Helper aman untuk mengambil API Key dari process.env atau global scope
const getApiKey = (): string => {
    try {
        // Cek process.env standard
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
        // Cek window.process (polyfill)
        if (typeof window !== 'undefined' && (window as any).process && (window as any).process.env && (window as any).process.env.API_KEY) {
            return (window as any).process.env.API_KEY;
        }
    } catch (e) {
        console.error("Error accessing API Key:", e);
    }
    return '';
};

const createAIClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key tidak ditemukan. Pastikan Environment Variable 'API_KEY' sudah dikonfigurasi di Netlify.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    // Inisialisasi di dalam fungsi
    const ai = createAIClient();
    
    const prompt = `
    Role: Curriculum Expert (Kurikulum Merdeka Indonesia).
    Task: Generate Learning Objectives (Tujuan Pembelajaran - TP) from Learning Outcomes (Capaian Pembelajaran - CP).

    Subject: ${input.subject}
    Grade: ${input.grade}
    
    CP Data:
    ${input.cpElements.map(e => `- ${e.element}: ${e.cp}`).join('\n')}

    Additional Notes:
    ${input.additionalNotes}

    Requirements:
    1. Break down CP into concrete TPs.
    2. Group TPs by "Materi Pokok" (Main Topic) and "Sub-Materi".
    3. Assign Semester (Ganjil/Genap).
    4. Output strictly JSON Array.
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
                        materi: { type: Type.STRING },
                        subMateriGroups: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    subMateri: { type: Type.STRING },
                                    tps: { type: Type.ARRAY, items: { type: Type.STRING } }
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

    return extractJsonArray(response.text);
};

export const generateATP = async (tpData: TPData): Promise<ATPTableRow[]> => {
    const ai = createAIClient();
    
    // Flatten TPs for context
    let allTps: any[] = [];
    let sequence = 1;
    tpData.tpGroups.forEach(group => {
        group.subMateriGroups.forEach(sub => {
            sub.tps.forEach(tp => {
                allTps.push({
                    seq: sequence++,
                    semester: group.semester,
                    materi: group.materi,
                    tp: tp
                });
            });
        });
    });

    const prompt = `
    Create Learning Objectives Flow (ATP - Alur Tujuan Pembelajaran).
    Subject: ${tpData.subject}
    Grade: ${tpData.grade}

    TP List:
    ${JSON.stringify(allTps)}

    Task:
    1. Order TPs logically.
    2. Assign Code (e.g. 7.1, 7.2).
    3. Return JSON Array of ATP rows.
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
                    }
                }
            }
        }
    });

    return extractJsonArray(response.text);
};

export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number): Promise<PROTARow[]> => {
    const ai = createAIClient();
    
    const prompt = `
    Create Annual Program (PROTA).
    Subject: ${atpData.subject}
    Total JP/Week: ${totalJpPerWeek}
    
    ATP Data:
    ${JSON.stringify(atpData.content.map(r => ({ tp: r.tp, materi: r.topikMateri, sem: r.semester, kode: r.kodeTp })))}

    Task:
    1. Estimate "Alokasi Waktu" (Time Allocation in JP) for each TP.
    2. Ensure total fits academic year (~18 weeks/semester).
    3. Output ONLY the number of JP followed by "JP" (e.g., "4 JP"). Do not add minutes.
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
                        alurTujuanPembelajaran: { type: Type.STRING },
                        tujuanPembelajaran: { type: Type.STRING },
                        alokasiWaktu: { type: Type.STRING },
                        semester: { type: Type.STRING, enum: ['Ganjil', 'Genap'] }
                    }
                }
            }
        }
    });
    
    return extractJsonArray(response.text);
};

export const generateKKTP = async (atpData: ATPData, semester: string, grade: string): Promise<KKTPRow[]> => {
    const ai = createAIClient();
    
    const filteredContent = atpData.content.filter(c => c.semester.toLowerCase() === semester.toLowerCase());
    
    const prompt = `
    Create Criteria for Learning Objectives Achievement (KKTP - Rubric).
    Semester: ${semester}
    Grade: ${grade}
    
    TPs:
    ${JSON.stringify(filteredContent.map(r => ({ tp: r.tp, materi: r.topikMateri })))}

    Task:
    1. Define criteria for: Sangat Mahir, Mahir, Cukup Mahir, Perlu Bimbingan.
    2. Set targetKktp (e.g., 'cukupMahir').
    3. Return JSON Array.
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
                            }
                        },
                        targetKktp: { type: Type.STRING, enum: ['sangatMahir', 'mahir', 'cukupMahir', 'perluBimbingan'] }
                    }
                }
            }
        }
    });

    return extractJsonArray(response.text);
};

export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    // Fungsi ini murni algoritmik dan tidak menggunakan AI, jadi tidak perlu inisialisasi GoogleGenAI
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    // We assume 5 weeks per month for standard grid distribution
    const weeksPerMonth = 5;
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: weeksPerMonth }));

    const semesterContent = protaData.content.filter(row => 
        row.semester?.trim().toLowerCase() === semester.toLowerCase()
    );
    
    if (semesterContent.length === 0) {
        // Return empty structure rather than error to allow UI to handle it gracefully
        return { headers, content: [] };
    }

    // Use algorithmic distribution instead of AI to ensure strict adherence to Math constraints.
    // Rules:
    // 1. Distribute JP sequentially.
    // 2. Max JP per week = protaData.jamPertemuan.
    // 3. If TP1 needs 3 JP and Week1 has 2 JP space: Week1 gets 2, Week2 gets 1. Next TP starts at Week2 (remaining space).

    const maxJpPerWeek = Number(protaData.jamPertemuan) || 2;
    const totalWeeks = months.length * weeksPerMonth;
    
    // Track accumulated usage for every week slot [0...29]
    const weeklyUsage = new Array(totalWeeks).fill(0);
    
    let globalWeekCursor = 0; // Points to the current week index (0-29) being filled

    const finalContent: PROSEMRow[] = semesterContent.map((row) => {
        // Fix: Robustly extract ONLY the first numeric value.
        // If string is "4 JP", gets 4.
        // If string is "4 JP (160 Menit)", gets 4.
        // If string is "2 Pertemuan (6 JP)", gets 2 (risk), so we look for digits.
        // We assume PROTA generation standardizes on "X JP".
        const jpMatch = row.alokasiWaktu.match(/(\d+)/);
        const totalJpForTp = jpMatch ? parseInt(jpMatch[0]) : 0;
        
        let remainingToDistribute = totalJpForTp;
        
        // Initialize empty structure for this row
        const distribution: Record<string, (string | null)[]> = {};
        months.forEach(m => { distribution[m] = Array(weeksPerMonth).fill(null); });

        // Distribute JP
        while (remainingToDistribute > 0 && globalWeekCursor < totalWeeks) {
            const currentUsage = weeklyUsage[globalWeekCursor];
            const availableSpace = maxJpPerWeek - currentUsage;

            if (availableSpace > 0) {
                // Determine how much we can put in this week
                const amountToAssign = Math.min(remainingToDistribute, availableSpace);
                
                // Map global week index to Month + Week Index
                const monthIndex = Math.floor(globalWeekCursor / weeksPerMonth);
                const weekIndexInMonth = globalWeekCursor % weeksPerMonth;
                
                if (monthIndex < months.length) {
                    const monthName = months[monthIndex];
                    // Assign to data structure
                    distribution[monthName][weekIndexInMonth] = String(amountToAssign);
                }
                
                // Update trackers
                weeklyUsage[globalWeekCursor] += amountToAssign;
                remainingToDistribute -= amountToAssign;
            }

            // If this week is now full, move cursor to next week
            if (weeklyUsage[globalWeekCursor] >= maxJpPerWeek) {
                globalWeekCursor++;
            }
            
            // If we filled the current TP but the week isn't full yet, 
            // we DON'T increment the cursor. The next TP will fill the rest of this week.
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