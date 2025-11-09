import { TPGroup, TPData, ATPTableRow, PROTARow, ATPData, KKTPRow } from "../types";
// Mengimpor fungsi apiRequest yang sudah ada untuk konsistensi
import { apiRequest } from './dbService';

/**
 * Helper function untuk membersihkan respons JSON dari AI.
 * @param text Respons mentah dari AI.
 * @returns String JSON yang sudah dibersihkan.
 */
const cleanJsonString = (text: string): string => {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
  }
  return jsonStr;
};

export const generateTPs = async (
  data: {
    cpElements: { element: string; cp: string; }[];
    grade: string;
    additionalNotes: string;
  }
): Promise<TPGroup[]> => {
  try {
    // Memanggil Google Apps Script dengan action 'generateTPs'
    const response = await apiRequest('generateTPs', data);
    
    const jsonStr = cleanJsonString(response.text);
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

    // --- FIX: Clean unwanted '$' symbols from AI-generated text ---
    const cleanDollarSigns = (data: TPGroup[]): TPGroup[] => {
      if (!Array.isArray(data)) return data;
      return data.map(group => ({
        ...group,
        materi: group.materi ? group.materi.replace(/\$/g, '') : '',
        subMateriGroups: Array.isArray(group.subMateriGroups) ? group.subMateriGroups.map(subGroup => ({
          ...subGroup,
          subMateri: subGroup.subMateri ? subGroup.subMateri.replace(/\$/g, '') : '',
          tps: Array.isArray(subGroup.tps) ? subGroup.tps.map(tp => (typeof tp === 'string' ? tp.replace(/\$/g, '') : tp)) : []
        })) : []
      }));
    };
    // --- END FIX ---

    const isValidTPGroupArray = (arr: any): arr is TPGroup[] => {
      return Array.isArray(arr) && arr.every(p => p && typeof p === 'object' && 'materi' in p && 'subMateriGroups' in p);
    };

    if (isValidTPGroupArray(parsed)) {
        return cleanDollarSigns(parsed);
    } else if (typeof parsed === 'object' && parsed !== null) {
        for (const key in parsed) {
            const value = (parsed as any)[key];
            if (isValidTPGroupArray(value)) {
                return cleanDollarSigns(value);
            }
        }
    }
    
    console.error("Unexpected AI JSON structure:", JSON.stringify(JSON.parse(jsonStr), null, 2));
    throw new Error("Struktur JSON yang dihasilkan AI tidak sesuai format yang diharapkan.");

  } catch (error: any)
 {
    console.error("Error generating or parsing TPs:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Gagal memproses respons dari AI karena format tidak valid. Silakan coba generate lagi.");
    }
    // Melempar error dengan pesan yang lebih informatif
    throw new Error(`Gagal berkomunikasi dengan AI. Detail: ${error.message}`);
  }
};


export const generateATP = async (tpData: TPData): Promise<ATPTableRow[]> => {
    try {
        const response = await apiRequest('generateATP', { tpData });
        const jsonStr = cleanJsonString(response.text);
        const reorderedIndices = JSON.parse(jsonStr) as number[];

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
            if (!originalData) {
                // Tambahkan fallback untuk mencegah crash jika AI memberikan indeks yang salah
                throw new Error(`AI mengembalikan indeks yang tidak valid: ${originalIndex}.`);
            }
            return {
                topikMateri: originalData.materi.replace(/\$/g, ''),
                tp: originalData.tpText.replace(/\$/g, ''),
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
        throw new Error(`Gagal berkomunikasi dengan AI untuk ATP. Detail: ${error.message}`);
    }
};


export const generatePROTA = async (atpData: ATPData, jamPertemuan: number): Promise<PROTARow[]> => {
    try {
        const response = await apiRequest('generatePROTA', { atpData, jamPertemuan });
        const jsonStr = cleanJsonString(response.text);
        const parsedAllocations = JSON.parse(jsonStr) as { index: number; alokasiWaktu: string }[];
        
        if (!Array.isArray(parsedAllocations) || parsedAllocations.length !== atpData.content.length) {
            throw new Error(`Respons AI tidak valid. Jumlah alokasi (${parsedAllocations.length}) tidak cocok dengan jumlah TP (${atpData.content.length}).`);
        }

        const finalProtaData: PROTARow[] = atpData.content.map((originalRow, index) => {
            const allocationData = parsedAllocations.find(p => p.index === index);
            let allocatedTime = '2 JP'; 

            if (allocationData && typeof allocationData.alokasiWaktu === 'string' && allocationData.alokasiWaktu.match(/^\d+\s*JP$/i)) {
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
        throw new Error(`Gagal berkomunikasi dengan AI untuk PROTA. Detail: ${error.message}`);
    }
};

export const generateKKTP = async (atpData: ATPData, semester: 'Ganjil' | 'Genap', grade: string): Promise<KKTPRow[]> => {
    try {
        const response = await apiRequest('generateKKTP', { atpData, semester, grade });
        const jsonStr = cleanJsonString(response.text);
        const parsedResult = JSON.parse(jsonStr) as { index: number; kriteria: any; targetKktp: any }[];
        
        const semesterContent = atpData.content.filter(row => row.semester === semester);
        if (parsedResult.length !== semesterContent.length) {
            throw new Error(`Respons AI tidak valid. Jumlah kriteria (${parsedResult.length}) tidak cocok dengan jumlah TP (${semesterContent.length}).`);
        }

        const finalKKTPTable: KKTPRow[] = parsedResult.map((result, i) => {
            const originalData = semesterContent[i]; // Gunakan urutan yang sama
            if (!originalData) {
                 throw new Error(`Kesalahan data dari AI: Tidak dapat menemukan data asli untuk indeks ${i}.`);
            }
            
            return {
                no: i + 1,
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
        throw new Error(`Gagal berkomunikasi dengan AI untuk KKTP. Detail: ${error.message}`);
    }
};