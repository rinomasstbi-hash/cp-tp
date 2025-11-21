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
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: 5 }));

    const semesterContent = protaData.content.filter(row => 
        row.semester?.trim().toLowerCase() === semester.toLowerCase()
    );
    
    if (semesterContent.length === 0) {
        throw new Error(`Data PROTA untuk semester ${semester} tidak ditemukan.`);
    }

    // Create a lightweight map for the AI to focus on distribution only
    const distributionMap = semesterContent.map((row, index) => ({
        id: index + 1,
        total_jp: parseInt(row.alokasiWaktu.replace(/\D/g, '') || '0')
    }));

    const prompt = `
       Role: Academic Scheduler (Kurikulum Merdeka).
       Task: Distribute teaching hours (JP) into weekly slots for a Semester Program (PROSEM).
       
       Semester: ${semester} (Months: ${months.join(', ')})
       
       Input Data (Items to distribute):
       ${JSON.stringify(distributionMap)}
       
       CRITICAL RULES:
       1. You MUST use these EXACT month names as keys in the 'bulan' object: ${JSON.stringify(months)}.
       2. For each month, provide an array of exactly 5 numbers (0 if no class).
       3. The SUM of all weekly values for a single item MUST equal its 'total_jp'.
       4. Distribute logically (e.g., 2 JP per week until total is reached).
       
       Response Schema (JSON Array):
       [
         {
           "id": number, // Matches Input ID
           "bulan": {
             "${months[0]}": [number, number, number, number, number],
             "${months[1]}": [number, number, number, number, number],
             ... and so on for all months
           },
           "keterangan": string // Optional short note
         }
       ]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    const aiOutput = extractJsonArray(response.text);

    const finalContent: PROSEMRow[] = semesterContent.map((originalRow, index) => {
        const inputId = index + 1;
        const aiItem = aiOutput.find((x: any) => x.id == inputId);
        
        const emptyDistribution: Record<string, (string | null)[]> = {};
        months.forEach(m => { emptyDistribution[m] = [null, null, null, null, null]; });

        let finalBulan = emptyDistribution;
        let keterangan = '';

        if (aiItem && aiItem.bulan) {
            finalBulan = {};
            months.forEach(m => {
                // Flexible key matching (case-insensitive check if exact match fails)
                let rawWeeks = aiItem.bulan[m];
                if (!rawWeeks) {
                    // Try lowercase or case-insensitive search
                    const key = Object.keys(aiItem.bulan).find(k => k.toLowerCase() === m.toLowerCase());
                    if (key) rawWeeks = aiItem.bulan[key];
                }

                if (Array.isArray(rawWeeks)) {
                    finalBulan[m] = rawWeeks.slice(0, 5).map((val: any) => 
                        (val === 0 || val === '0' || val === null) ? null : String(val)
                    );
                    // Pad if less than 5
                    while (finalBulan[m].length < 5) finalBulan[m].push(null);
                } else {
                     finalBulan[m] = [null, null, null, null, null];
                }
            });
            keterangan = aiItem.keterangan || '';
        }

        // Strict validation: Ensure distribution sums up to original Total JP
        const targetTotal = parseInt(originalRow.alokasiWaktu.replace(/\D/g, '') || '0');
        let currentTotal = 0;
        months.forEach(m => {
            if (finalBulan[m]) finalBulan[m].forEach(val => currentTotal += parseInt(val || '0'));
        });

        // Auto-correct if AI failed math or returned empty
        if (targetTotal > 0 && currentTotal !== targetTotal) {
             const diff = targetTotal - currentTotal;
             // Simple adjustment: Add/subtract diff from the first available slot found
             let adjusted = false;
             
             // Strategy: Fill strictly from the first month onwards if total is 0 (AI failed completely)
             // Or adjust existing numbers if off by a bit
             
             for (const m of months) {
                 for (let i = 0; i < 5; i++) {
                     const val = parseInt(finalBulan[m][i] || '0');
                     
                     // If we need to add (diff > 0), prioritize empty slots if AI returned nothing, OR existing slots
                     if (diff > 0) {
                        if (currentTotal === 0) {
                            // Distribution failed completely, simple fill: 2 JP per week until done
                            // This is a fallback heuristic
                            const toFill = Math.min(targetTotal - currentTotal, 2); // Max 2 per slot fallback
                             finalBulan[m][i] = String(toFill);
                             currentTotal += toFill;
                             if (currentTotal >= targetTotal) {
                                 adjusted = true; 
                                 break;
                             }
                             continue; // Continue filling next slots
                        } else {
                             // Minor adjustment to existing
                             const newVal = Math.max(0, val + diff);
                             finalBulan[m][i] = newVal === 0 ? null : String(newVal);
                             adjusted = true;
                             break;
                        }
                     } 
                     // If we need to subtract (diff < 0)
                     else if (diff < 0 && val > 0) {
                         const reduceBy = Math.min(val, Math.abs(diff));
                         const newVal = val - reduceBy;
                         finalBulan[m][i] = newVal === 0 ? null : String(newVal);
                         // Update diff local var logic conceptually (though we break)
                         adjusted = true;
                         break; 
                     }
                 }
                 if (adjusted) break;
                 if (currentTotal >= targetTotal && currentTotal > 0) break; // Stop if we filled it manually
             }
        }

        return {
            no: originalRow.no,
            tujuanPembelajaran: originalRow.tujuanPembelajaran, // Strictly from PROTA
            alokasiWaktu: originalRow.alokasiWaktu, // Strictly from PROTA
            bulan: finalBulan,
            keterangan: keterangan
        };
    });

    return { headers, content: finalContent };
};