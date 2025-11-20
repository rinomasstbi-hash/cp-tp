import { TPGroup, TPData, ATPTableRow, PROTARow, ATPData, KKTPRow, PROTAData, PROSEMRow, PROSEMHeader } from "../types";
// Mengimpor fungsi apiRequest yang sudah ada untuk konsistensi
import { apiRequest } from './dbService';

/**
 * Helper function untuk membersihkan respons JSON dari AI.
 * Menggunakan regex untuk mengekstrak blok kode JSON jika ada teks pengantar.
 * Juga mencoba menemukan kurung kurawal jika format markdown tidak ditemukan.
 * @param text Respons mentah dari AI.
 * @returns String JSON yang sudah dibersihkan.
 */
const cleanJsonString = (text: string): string => {
  let jsonStr = text.trim();
  
  // 1. Mencari pola blok kode markdown ```json ... ``` atau ``` ... ```
  const jsonBlockMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // 2. Jika tidak ada blok kode, cari kurung kurawal/siku pertama dan terakhir
  // Ini menangani kasus di mana AI memberikan teks pengantar "Berikut JSON-nya: { ... }" tanpa markdown
  const firstBrace = jsonStr.indexOf('{');
  const firstBracket = jsonStr.indexOf('[');
  
  let startIndex = -1;
  // Tentukan apakah ini objek atau array
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    const lastBrace = jsonStr.lastIndexOf('}');
    const lastBracket = jsonStr.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);

    if (endIndex > startIndex) {
        return jsonStr.substring(startIndex, endIndex + 1);
    }
  }
  
  return jsonStr;
};

/**
 * Helper function untuk mem-parsing JSON dengan toleransi kesalahan sintaks ringan
 * (seperti kunci tanpa tanda kutip atau kurang koma yang sering dihasilkan LLM).
 */
const relaxedJsonParse = (text: string): any => {
    // Bersihkan komentar gaya JS (// ...) yang mungkin ditambahkan AI
    const cleanText = text.replace(/\/\/.*$/gm, '');

    try {
        // Percobaan 1: Parse standar
        return JSON.parse(cleanText);
    } catch (originalError) {
        try {
             // Percobaan 2: Terapkan serangkaian perbaikan regex umum
             let fixed = cleanText;

             // A. Tambahkan koma yang hilang antar objek (Penyebab utama error "Expected ',' or ']'")
             // Mengubah "} {" menjadi "}, {" (menangani spasi/baris baru diantaranya)
             fixed = fixed.replace(/}\s*{/g, '},{');
             // Menangani kasus newline tanpa koma yang lebih agresif: } <newline> {
             fixed = fixed.replace(/}\s*[\r\n]+\s*{/g, '},{');
             // Menangani kasus array: ] [ -> ], [
             fixed = fixed.replace(/]\s*\[/g, '],[');

             // B. Tambahkan tanda kutip pada kunci yang tidak dikutip (misal: { key: "val" } -> { "key": "val" })
             // Hati-hati agar tidak merusak URL atau string yang sudah dikutip
             fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

             // C. Hapus koma di akhir array/objek (trailing comma)
             fixed = fixed.replace(/,\s*([\]}])/g, '$1');

             return JSON.parse(fixed);
        } catch (e2) {
             // Jika masih gagal, lempar error asli agar pesannya jelas
             console.warn("Relaxed JSON parse failed. Original text:", text);
             throw originalError;
        }
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
    // Memanggil Google Apps Script dengan action 'generateTPs'
    const response = await apiRequest('generateTPs', { ...data, model: 'gemini-2.5-pro' });
    
    const jsonStr = cleanJsonString(response.text);
    let parsed = relaxedJsonParse(jsonStr);

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
      // Handle case where AI returns { tps: [...] } instead of [...]
      for (const key in parsed) {
        const value = (parsed as any)[key];
        if (Array.isArray(value)) {
          (parsed as any)[key] = fixMissingMateri(value);
          // If it looks like the main data array is nested, return that array
          if (value.length > 0 && typeof value[0] === 'object' && 'subMateriGroups' in value[0]) {
              return value;
          }
        }
      }
    }
    // --- END FIX ---

    const isValidTPGroupArray = (arr: any): arr is TPGroup[] => {
      return Array.isArray(arr) && arr.every(p => p && typeof p === 'object' && 'materi' in p && 'subMateriGroups' in p);
    };

    if (isValidTPGroupArray(parsed)) {
        return parsed;
    }
    
    console.error("Unexpected AI JSON structure:", JSON.stringify(relaxedJsonParse(jsonStr), null, 2));
    throw new Error("Struktur JSON yang dihasilkan AI tidak sesuai format yang diharapkan.");

  } catch (error: any)
 {
    console.error("Error generating or parsing TPs:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Gagal memproses respons dari AI karena format tidak valid. Silakan coba generate lagi.");
    }
    // Melempar kembali error asli untuk penanganan yang lebih baik di UI
    throw error;
  }
};


export const generateATP = async (tpData: TPData): Promise<ATPTableRow[]> => {
    try {
        const response = await apiRequest('generateATP', { tpData, model: 'gemini-2.5-pro' });
        const jsonStr = cleanJsonString(response.text);
        let reorderedIndices: number[] = [];
        
        try {
             reorderedIndices = relaxedJsonParse(jsonStr) as number[];
        } catch (e) {
             console.warn("ATP JSON Parse Error, fallback enabled:", e);
             reorderedIndices = []; // Force fallback
        }

        // 1. Prepare Source of Truth (Original Flattened Data)
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

        // 2. Validation and Strategy Selection
        const flattenedCount = sourceOfTruthData.length;
        const groupCount = tpData.tpGroups.length;
        
        // Ensure indices are numbers
        if (!Array.isArray(reorderedIndices) || reorderedIndices.some(n => typeof n !== 'number')) {
             console.warn("AI response is not an array of numbers. Falling back to default.");
             reorderedIndices = []; 
        }

        let finalATPTable: ATPTableRow[] = [];

        // Strategy A: AI reordered individual TPs (Ideal case)
        if (reorderedIndices.length === flattenedCount) {
            finalATPTable = reorderedIndices.map((originalIndex, newSequenceIndex) => {
                const originalData = sourceOfTruthData[originalIndex];
                // Fallback if index is out of bounds (hallucination)
                if (!originalData) {
                     console.warn(`Invalid index from AI: ${originalIndex}. Using fallback logic for this row.`);
                     return {
                        topikMateri: "Error Index",
                        tp: "Data TP tidak ditemukan untuk indeks ini",
                        kodeTp: "?",
                        atpSequence: newSequenceIndex + 1,
                        semester: "Ganjil" as const
                     };
                }
                return {
                    topikMateri: originalData.materi,
                    tp: originalData.tpText,
                    kodeTp: originalData.tpCode,
                    atpSequence: newSequenceIndex + 1,
                    semester: originalData.semester,
                };
            });
        } 
        // Strategy B: AI reordered Groups (Common case for large data)
        else if (reorderedIndices.length === groupCount && groupCount > 0) {
            // Check validity of group indices
            const validIndices = reorderedIndices.every(idx => idx >= 0 && idx < groupCount);
            
            if (validIndices) {
                let currentSequence = 1;
                reorderedIndices.forEach(groupIndex => {
                    const group = tpData.tpGroups[groupIndex];
                    if (group) {
                        group.subMateriGroups.forEach(subGroup => {
                            subGroup.tps.forEach(tpText => {
                                const originalData = sourceOfTruthData.find(
                                    d => d.tpText === tpText && d.materi === group.materi
                                );
                                if (originalData) {
                                    finalATPTable.push({
                                        topikMateri: originalData.materi,
                                        tp: originalData.tpText,
                                        kodeTp: originalData.tpCode,
                                        atpSequence: currentSequence++,
                                        semester: originalData.semester,
                                    });
                                }
                            });
                        });
                    }
                });
            } else {
                // If indices are invalid, force fallback
                reorderedIndices = [];
            }
        } 
        
        // Strategy C: Fallback (Size Mismatch or Empty)
        // This catches `else` or if `finalATPTable` is still empty despite Strategy B
        if (finalATPTable.length === 0) {
             console.warn(`ATP Gen Mismatch: TPs=${flattenedCount}, Groups=${groupCount}, AI_Indices=${reorderedIndices.length}. Defaulting to original order.`);
             finalATPTable = sourceOfTruthData.map((data, idx) => ({
                topikMateri: data.materi,
                tp: data.tpText,
                kodeTp: data.tpCode,
                atpSequence: idx + 1,
                semester: data.semester,
            }));
        }
        
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
        const response = await apiRequest('generatePROTA', { atpData, jamPertemuan, model: 'gemini-2.5-pro' });
        const jsonStr = cleanJsonString(response.text);
        const parsedAllocations = relaxedJsonParse(jsonStr) as { index: number; alokasiWaktu: string }[];
        
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
            throw new Error("Gagal memproses respons PROTA dari AI karena format tidak valid. Pastikan AI menghasilkan JSON yang benar.");
        }
        throw error;
    }
};

export const generateKKTP = async (atpData: ATPData, semester: 'Ganjil' | 'Genap', grade: string): Promise<KKTPRow[]> => {
    try {
        const semesterContent = atpData.content.filter(row => row.semester === semester);
        
        if (semesterContent.length === 0) {
             console.warn(`No ATP content found for semester ${semester}. Skipping AI generation.`);
             return [];
        }

        // --- BATCHING STRATEGY ---
        // Membagi request menjadi beberapa chunk kecil (misal 5 TP per request)
        // Ini mencegah error "token limit exceeded" atau AI memotong respons di tengah jalan.
        const CHUNK_SIZE = 5;
        const resultsMap = new Map<number, { kriteria: any, targetKktp: any }>();

        for (let i = 0; i < semesterContent.length; i += CHUNK_SIZE) {
            const chunk = semesterContent.slice(i, i + CHUNK_SIZE);
            
            // Delay antar chunk untuk mencegah rate limiting di Google Apps Script dan memberikan waktu jeda
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const simplifiedAtpDataChunk = {
                subject: atpData.subject,
                content: chunk.map(row => ({
                    topikMateri: row.topikMateri,
                    tp: row.tp
                }))
            };

            try {
                const response = await apiRequest('generateKKTP', { 
                    atpData: simplifiedAtpDataChunk, 
                    semester, 
                    grade, 
                    model: 'gemini-2.5-pro' 
                });

                const jsonStr = cleanJsonString(response.text);
                let parsedChunk = relaxedJsonParse(jsonStr);

                // Normalisasi jika AI membungkus array dalam objek
                if (!Array.isArray(parsedChunk) && typeof parsedChunk === 'object' && parsedChunk !== null) {
                    const values = Object.values(parsedChunk);
                    if (values.length > 0 && Array.isArray(values[0])) {
                        parsedChunk = values[0];
                    }
                }

                if (Array.isArray(parsedChunk)) {
                    parsedChunk.forEach((item: any, idx: number) => {
                        // Kita asumsikan urutan respons AI sesuai dengan urutan array input chunk
                        const absoluteIndex = i + idx;
                        if (absoluteIndex < semesterContent.length) {
                            resultsMap.set(absoluteIndex, {
                                kriteria: item.kriteria,
                                targetKktp: item.targetKktp
                            });
                        }
                    });
                } else {
                    console.warn(`Chunk ${i} gagal diparsing sebagai array.`, parsedChunk);
                }

            } catch (chunkError) {
                console.error(`Error processing chunk ${i}:`, chunkError);
                // Kita lanjut ke chunk berikutnya agar setidaknya sebagian data terambil
            }
        }

        // Gabungkan hasil
        const finalKKTPTable: KKTPRow[] = semesterContent.map((originalData, i) => {
            const result = resultsMap.get(i);
            
            const defaultKriteria = {
                sangatMahir: "-",
                mahir: "-",
                cukupMahir: "-",
                perluBimbingan: "-"
            };

            return {
                no: originalData.kodeTp || String(i + 1),
                materiPokok: originalData.topikMateri,
                tp: originalData.tp,
                kriteria: result?.kriteria || defaultKriteria,
                targetKktp: result?.targetKktp || "mahir",
            };
        });

        return finalKKTPTable;

    } catch (error: any) {
        console.error("Error generating KKTP:", error);
        if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons KKTP dari AI karena format tidak valid (Syntax Error).");
        }
        throw error;
    }
};

export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    try {
        // Pre-flight validation to ensure we have data to send
        if (!protaData || !protaData.content || protaData.content.length === 0) {
            throw new Error("Data PROTA kosong atau tidak valid.");
        }

        const semesterContent = protaData.content.filter(row => 
            row.semester?.trim().toLowerCase() === semester.toLowerCase()
        );

        if (semesterContent.length === 0) {
            throw new Error(`Data PROTA untuk semester ${semester} tidak ditemukan. Pastikan PROTA sudah terisi dengan benar.`);
        }

        // Context Injection:
        // Memaksa AI untuk menggunakan materi yang benar dan mencegah halusinasi (misal: mapel Qur'an Hadis tapi output Akidah Akhlak).
        const materialList = semesterContent.map(r => r.topikMateri).join(', ');
        
        const simplifiedProta = {
            subject: protaData.subject,
            // Tambahkan instruksi eksplisit di dalam payload data untuk memandu AI
            instruction: `STRICTLY GENERATE VALID JSON. USE DOUBLE QUOTES ONLY. Buat PROSEM untuk mapel: ${protaData.subject}. Gunakan HANYA materi berikut: ${materialList}. JANGAN gunakan materi dari mapel lain.`,
            content: semesterContent.map(row => ({
                    topikMateri: row.topikMateri,
                    tujuanPembelajaran: row.tujuanPembelajaran,
                    alokasiWaktu: row.alokasiWaktu,
                }))
        };

        const response = await apiRequest('generatePROSEM', { protaData: simplifiedProta, semester, grade, model: 'gemini-2.5-flash' });
        const jsonStr = cleanJsonString(response.text);
        
        let parsedResult;
        try {
             parsedResult = relaxedJsonParse(jsonStr);
        } catch (e) {
             console.error("JSON Parse Error:", e, "Raw String:", jsonStr);
             throw new SyntaxError("Struktur JSON tidak valid.");
        }

        // Resilience: Handle case where AI wraps the object in an array [ { headers: ..., content: ... } ]
        if (Array.isArray(parsedResult) && parsedResult.length > 0 && parsedResult[0].headers && parsedResult[0].content) {
            parsedResult = parsedResult[0];
        }

        if (!parsedResult || !Array.isArray(parsedResult.headers) || !Array.isArray(parsedResult.content)) {
            throw new Error(`Respons AI tidak valid. Struktur JSON tidak memiliki properti 'headers' dan 'content' yang diharapkan.`);
        }
        
        return parsedResult as { headers: PROSEMHeader[], content: PROSEMRow[] };

    } catch (error: any) {
        console.error("Error generating PROSEM:", error);

        if (typeof error.message === 'string' && error.message.includes("models/gemini-pro is not found")) {
            throw new Error(`Gagal menghubungi AI. Server backend kemungkinan dikonfigurasi untuk menggunakan model AI ('gemini-pro') yang sudah usang khusus untuk fitur PROSEM. Harap hubungi administrator untuk memperbarui skrip backend.`);
        }

        if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons PROSEM dari AI karena format tidak valid. Ini sering terjadi jika nama mapel mengandung tanda kutip (misal: Al-Qur'an). Silakan coba lagi.");
        }
        // Melempar kembali error asli agar UI bisa menangani logika retry dengan benar
        throw error;
    }
};