import { GoogleGenAI, Type } from "@google/genai";
import { TPData, ATPData, PROTAData, KKTPData, PROSEMData, PROSEMHeader, PROSEMRow, TPGroup, ATPTableRow, PROTARow, KKTPRow } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
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
    const isGanjil = semester.toLowerCase() === 'ganjil';
    // Month names MUST match the keys used in the 'bulan' Record later
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    // Standard 5 weeks per month assumption
    const weeksPerMonth = 5;
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: weeksPerMonth }));

    const semesterContent = protaData.content.filter(row => 
        row.semester?.trim().toLowerCase() === semester.toLowerCase()
    );
    
    if (semesterContent.length === 0) {
        return { headers, content: [] };
    }

    // --- ALGORITMA DISTRIBUSI JP BERURUTAN (SEQUENTIAL WATERFALL) ---
    // Logika:
    // 1. Kita memiliki grid waktu linear: Total Minggu = Jumlah Bulan * 5.
    // 2. Kita memiliki pointer 'globalWeekIndex' (minggu ke berapa sekarang kita berada).
    // 3. Kita memiliki 'currentWeekFilledJp' (berapa JP yang sudah terisi di minggu tersebut).
    // 4. Untuk setiap TP, kita ambil alokasi waktunya (misal 3 JP).
    // 5. Kita tuangkan JP tersebut ke grid minggu. Jika minggu ini penuh, pindah ke minggu berikutnya.
    
    const maxJpPerWeek = Number(protaData.jamPertemuan) || 2;
    const totalWeeks = months.length * weeksPerMonth;
    
    // Trackers for the distribution state
    let globalWeekIndex = 0; // 0 to (totalWeeks - 1)
    let currentWeekFilledJp = 0; // 0 to maxJpPerWeek

    const finalContent: PROSEMRow[] = semesterContent.map((row) => {
        // Safe parsing of JP. Handles "4 JP", "4 JP (160 Menit)", "4"
        const jpMatch = row.alokasiWaktu.match(/(\d+)/);
        let remainingToDistribute = jpMatch ? parseInt(jpMatch[0]) : 0;
        
        // Initialize empty structure for this specific PROSEM Row
        const distribution: Record<string, (string | null)[]> = {};
        months.forEach(m => { distribution[m] = Array(weeksPerMonth).fill(null); });

        // Distribute the JP for this specific TP
        while (remainingToDistribute > 0 && globalWeekIndex < totalWeeks) {
            const availableInCurrentWeek = maxJpPerWeek - currentWeekFilledJp;

            if (availableInCurrentWeek > 0) {
                // Determine how much we can put in this week
                const amountToAssign = Math.min(remainingToDistribute, availableInCurrentWeek);
                
                // Convert linear global index to Month + Week Format
                const monthIndex = Math.floor(globalWeekIndex / weeksPerMonth);
                const weekIndexInMonth = globalWeekIndex % weeksPerMonth;
                
                if (monthIndex < months.length) {
                    const monthName = months[monthIndex];
                    
                    // If there's already a value (from a previous TP sharing this week), append/add?
                    // Current UI displays strings. Ideally we might want "2" or "2".
                    // If the cell is null, set it. If it has a value (from previous loop but same row? No, new row has new distribution obj), set it.
                    // Note: Since 'distribution' is unique per ROW, we just set the value.
                    
                    // BUT visually in the table, we want to show the number.
                    distribution[monthName][weekIndexInMonth] = String(amountToAssign);
                }
                
                // Update counters
                remainingToDistribute -= amountToAssign;
                currentWeekFilledJp += amountToAssign;
            }

            // If the current week is now full (or was already full), move to next week
            if (currentWeekFilledJp >= maxJpPerWeek) {
                globalWeekIndex++;
                currentWeekFilledJp = 0; // Reset usage for the new week
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