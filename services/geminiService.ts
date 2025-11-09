import { TPGroup, TPData, ATPTableRow, PROTARow, ATPData, KKTPRow } from "../types";

// Alamat proxy Netlify Function yang akan kita buat
const GEMINI_PROXY_ENDPOINT = '/.netlify/functions/gemini-proxy';

/**
 * Mengirim permintaan ke proxy Netlify Function yang aman.
 * @param action - Jenis generasi yang diminta (misalnya, 'generateTPs').
 * @param payload - Data yang diperlukan untuk generasi tersebut.
 * @returns {Promise<any>} - Data yang dikembalikan dari AI.
 */
const callGeminiProxy = async (action: string, payload: any): Promise<any> => {
  try {
    const response = await fetch(GEMINI_PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Menangkap pesan error dari serverless function
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Error calling Gemini proxy for action "${action}":`, error);
    // Melempar error dengan pesan yang lebih informatif untuk ditangkap oleh UI
    throw new Error(`Gagal berkomunikasi dengan server AI. Detail: ${error.message}`);
  }
};


export const generateTPs = async (
  data: {
    cpElements: { element: string; cp: string; }[];
    grade: string;
    additionalNotes: string;
  }
): Promise<TPGroup[]> => {
  try {
    const response = await callGeminiProxy('generateTPs', data);
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
    }

    let parsed = JSON.parse(jsonStr);

    // --- FIX: Proactively fix a common AI error where 'materi' is missing ---
    const fixMissingMateri = (data: any): any => {
      if (!Array.isArray(data)) return data;
      return data.map((item, index) => {
        if (typeof item === 'object' && item !== null && !('materi' in item) && 'subMateriGroups' in item) {
          const placeholderMateri = item.subMateriGroups?.[0]?.subMateri || `Materi Pokok #${index + 1}`;
          return { ...item, materi: placeholderMateri };
        }
        return item;
      });
    };

    if (Array.isArray(parsed)) {
      parsed = fixMissingMateri(parsed);
    } else if (typeof parsed === 'object' && parsed !== null) {
      for (const key in parsed) {
        const value = (parsed as any)[key];
        if (Array.isArray(value)) {
          (parsed as any)[key] = fixMissingMateri(value);
          break;
        }
      }
    }
    // --- END FIX ---

    const isValidTPGroupArray = (arr: any): arr is TPGroup[] => {
      return Array.isArray(arr) && arr.every(p => p && typeof p === 'object' && 'materi' in p && 'subMateriGroups' in p);
    };

    if (isValidTPGroupArray(parsed)) {
        return parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
        for (const key in parsed) {
            const value = (parsed as any)[key];
            if (isValidTPGroupArray(value)) {
                return value;
            }
        }
    }
    
    console.error("Unexpected AI JSON structure:", JSON.stringify(JSON.parse(jsonStr), null, 2));
    throw new Error("Struktur JSON yang dihasilkan AI tidak sesuai format yang diharapkan.");

  } catch (error: any) {
    console.error("Error generating or parsing TPs:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Gagal memproses respons dari AI karena format tidak valid. Silakan coba generate lagi.");
    }
    // Error sudah diformat dari callGeminiProxy, jadi kita bisa melemparnya kembali.
    throw error;
  }
};


export const generateATP = async (tpData: TPData): Promise<ATPTableRow[]> => {
    try {
        const response = await callGeminiProxy('generateATP', tpData);
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }
        const reorderedIndices = JSON.parse(jsonStr) as number[];

        // Logika post-processing tetap di sini karena ini adalah logika bisnis sisi klien
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

        if (reorderedIndices.length !== sourceOfTruthData.length) {
            throw new Error(`Inkonsistensi data: Jumlah TP dikirim (${sourceOfTruthData.length}) tidak cocok dengan jumlah indeks diterima (${reorderedIndices.length}).`);
        }
        
        const finalATPTable: ATPTableRow[] = reorderedIndices.map((originalIndex, newSequenceIndex) => {
            const originalData = sourceOfTruthData[originalIndex];
            return {
                topikMateri: originalData.materi,
                tp: originalData.tpText,
                kodeTp: originalData.tpCode,
                atpSequence: newSequenceIndex + 1,
                semester: originalData.semester,
            };
        });
        
        return finalATPTable;

    } catch (error: any) {
        console.error("Error generating ATP:", error);
        if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons pengurutan ATP dari AI karena format tidak valid.");
        }
        throw error;
    }
};


export const generatePROTA = async (atpData: ATPData, jamPertemuan: number): Promise<PROTARow[]> => {
    try {
        const response = await callGeminiProxy('generatePROTA', { atpData, jamPertemuan });

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const parsedAllocations = JSON.parse(jsonStr) as { index: number; alokasiWaktu: string }[];
        
        if (!Array.isArray(parsedAllocations) || parsedAllocations.length !== atpData.content.length) {
            throw new Error(`Respons AI tidak valid. Jumlah alokasi (${parsedAllocations.length}) tidak cocok dengan jumlah TP (${atpData.content.length}).`);
        }

        const finalProtaData: PROTARow[] = atpData.content.map((originalRow, index) => {
            const allocationData = parsedAllocations[index];
            let allocatedTime = '2 JP'; 

            if (allocationData && allocationData.index === index && typeof allocationData.alokasiWaktu === 'string' && allocationData.alokasiWaktu.match(/^\d+\s*JP$/i)) {
                allocatedTime = allocationData.alokasiWaktu;
            } else {
                console.warn(`Alokasi waktu tidak valid untuk index ${index}. Menggunakan default '2 JP'.`, allocationData);
            }
            
            const safeKodeTp = originalRow.kodeTp || String(originalRow.atpSequence || index + 1);

            return {
                no: index + 1,
                topikMateri: originalRow.topikMateri,
                alurTujuanPembelajaran: safeKodeTp,
                tujuanPembelajaran: originalRow.tp,
                alokasiWaktu: allocatedTime,
                semester: originalRow.semester,
            };
        });

        return finalProtaData;

    } catch (error: any) {
        console.error("Error generating PROTA:", error);
        if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons PROTA dari AI karena format tidak valid.");
        }
        throw error;
    }
};

export const generateKKTP = async (atpData: ATPData, semester: 'Ganjil' | 'Genap', grade: string): Promise<KKTPRow[]> => {
    try {
        const response = await callGeminiProxy('generateKKTP', { atpData, semester, grade });

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const parsedResult = JSON.parse(jsonStr) as { index: number; kriteria: any; targetKktp: any }[];
        
        const semesterContent = atpData.content.filter(row => row.semester === semester);
        if (parsedResult.length !== semesterContent.length) {
            throw new Error(`Respons AI tidak valid. Jumlah kriteria (${parsedResult.length}) tidak cocok dengan jumlah TP (${semesterContent.length}).`);
        }

        const finalKKTPTable: KKTPRow[] = parsedResult.map((result, index) => {
            const originalData = semesterContent[result.index];
            if (!originalData || result.index !== index) {
                 throw new Error(`Kesalahan data dari AI: Indeks tidak berurutan (diharapkan: ${index}, diterima: ${result.index}).`);
            }
            
            return {
                no: index + 1,
                materiPokok: originalData.topikMateri,
                tp: originalData.tp,
                kriteria: result.kriteria,
                targetKktp: result.targetKktp,
            };
        });

        return finalKKTPTable;

    } catch (error: any) {
        console.error("Error generating KKTP:", error);
        if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons KKTP dari AI karena format tidak valid.");
        }
        throw error;
    }
};
