
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

/**
 * Helper robust untuk mengekstrak Array JSON dari teks apa pun.
 * Mencoba berbagai strategi untuk menemukan array [ ... ] yang valid.
 */
const extractJsonArray = (text: string): any[] | null => {
    // Strategi 1: Clean standard + relaxed parse
    try {
        const cleaned = cleanJsonString(text);
        const parsed = relaxedJsonParse(cleaned);
        if (Array.isArray(parsed)) return parsed;
        
        // Jika hasilnya objek, cari properti yang merupakan array
        if (typeof parsed === 'object' && parsed !== null) {
            for (const key in parsed) {
                if (Array.isArray(parsed[key])) return parsed[key];
            }
        }
    } catch (e) {}

    // Strategi 2: Regex greedy untuk menemukan [ ... ]
    try {
        // Mencari kurung siku pembuka pertama dan penutup terakhir
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
             const parsed = relaxedJsonParse(match[0]);
             if (Array.isArray(parsed)) return parsed;
        }
    } catch(e) {}

    return null;
};

export const generateTPs = async (
  data: {
    cpElements: { element: string; cp: string; }[];
    grade: string;
    additionalNotes: string;
  }
): Promise<TPGroup[]> => {
  try {
    // Menggunakan gemini-2.5-flash untuk kecepatan dan kuota yang lebih baik
    const response = await apiRequest('generateTPs', { ...data, model: 'gemini-2.5-flash' });
    
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
        // Menggunakan gemini-2.5-flash
        const response = await apiRequest('generateATP', { tpData, model: 'gemini-2.5-flash' });
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
        // --- IMPLEMENT BATCHING FOR PROTA & TOTAL JP LOGIC ---
        // Formula: Input JP x 36 (Updated per user request)
        const TARGET_TOTAL_JP = jamPertemuan * 36;
        const TOTAL_TPS = atpData.content.length;
        
        // Target for actual TP content. We aim to use about 90-95% of the budget for TPs
        // so that the remaining can be put into "Cadangan".
        // But we must ensure each TP gets at least 2 JP if possible.
        const TARGET_FOR_CONTENT = Math.floor(TARGET_TOTAL_JP * 0.90); 
        const AVG_JP = Math.max(2, Math.floor(TARGET_FOR_CONTENT / TOTAL_TPS));

        // Reduced from 8 to 5 for better stability
        const CHUNK_SIZE = 5;
        const chunks = [];
        for (let i = 0; i < atpData.content.length; i += CHUNK_SIZE) {
            chunks.push(atpData.content.slice(i, i + CHUNK_SIZE));
        }

        let allAllocations: { index: number; alokasiWaktu: string }[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkStartIndex = i * CHUNK_SIZE;
            
            const simplifiedContent = chunk.map((r, idx) => ({
                index: chunkStartIndex + idx,
                topikMateri: r.topikMateri,
                tp: r.tp,
                kodeTp: r.kodeTp
            }));

            const simplifiedAtpData = {
                subject: atpData.subject,
                instruction: `Assign 'alokasiWaktu' (JP) for these TPs. 
                Context: Total annual JP available is around ${TARGET_FOR_CONTENT} for ${TOTAL_TPS} TPs (excluding reserve). 
                Average per TP should be around ${AVG_JP} JP. 
                Complex topics get more, simple get less. Range: ${Math.max(1, AVG_JP - 1)} to ${AVG_JP + 2} JP.
                STRICTLY RETURN JSON ARRAY.
                Return array of objects { index: number, alokasiWaktu: string (e.g., "4 JP") } matching input indices.`,
                content: simplifiedContent
            };

            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Increased delay to 5s to prevent rate limits/blocks
            }

            try {
                // Menggunakan gemini-2.5-flash
                const response = await apiRequest('generatePROTA', { atpData: simplifiedAtpData, jamPertemuan, model: 'gemini-2.5-flash' });
                const parsedChunk = extractJsonArray(response.text);
                
                if (Array.isArray(parsedChunk)) {
                    allAllocations = [...allAllocations, ...parsedChunk];
                } else {
                    console.warn(`PROTA Chunk ${i} failed to parse as array.`, parsedChunk);
                    throw new Error("Chunk is not an array");
                }
            } catch (chunkErr) {
                console.error(`PROTA Chunk ${i} error:`, chunkErr);
                // Robust Fallback
                const defaultChunk = simplifiedContent.map(item => ({ 
                    index: item.index, 
                    alokasiWaktu: `${AVG_JP} JP` 
                }));
                allAllocations = [...allAllocations, ...defaultChunk];
            }
        }

        // Map results to rows
        const finalProtaData: PROTARow[] = atpData.content.map((originalRow, index) => {
            const allocationData = allAllocations.find(p => p.index === index);
            let allocatedTime = `${AVG_JP} JP`; 

            if (allocationData && typeof allocationData.alokasiWaktu === 'string' && allocationData.alokasiWaktu.match(/^\d+\s*JP$/i)) {
                allocatedTime = allocationData.alokasiWaktu;
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

        // --- POST-PROCESSING FOR TOTAL JP & CADANGAN (REMAINDER) ---
        let currentUsedJp = 0;
        finalProtaData.forEach(r => {
             currentUsedJp += (parseInt(r.alokasiWaktu.replace(/\D/g,'')) || 0);
        });

        let remainder = TARGET_TOTAL_JP - currentUsedJp;

        // Logic: If we exceeded the target (unlikely given AVG_JP calc, but possible), shave off JP
        if (remainder < 0) {
            let toRemove = Math.abs(remainder);
            let loopGuard = 0;
            while (toRemove > 0 && loopGuard < 100) { // safety break
                let reduced = false;
                // Priority 1: Reduce items > 3 JP
                for (let i = 0; i < finalProtaData.length; i++) {
                    const val = parseInt(finalProtaData[i].alokasiWaktu.replace(/\D/g,'')) || 0;
                    if (val > 3 && toRemove > 0) {
                        finalProtaData[i].alokasiWaktu = `${val - 1} JP`;
                        toRemove--;
                        reduced = true;
                    }
                }
                // Priority 2: Reduce items > 1 JP if still needed
                if (!reduced) {
                     for (let i = 0; i < finalProtaData.length; i++) {
                        const val = parseInt(finalProtaData[i].alokasiWaktu.replace(/\D/g,'')) || 0;
                        if (val > 1 && toRemove > 0) {
                            finalProtaData[i].alokasiWaktu = `${val - 1} JP`;
                            toRemove--;
                            reduced = true;
                        }
                    }
                }
                if (!reduced) break; // Cannot reduce further
                loopGuard++;
            }
            
            // Recalculate remainder
            currentUsedJp = finalProtaData.reduce((acc, r) => acc + (parseInt(r.alokasiWaktu.replace(/\D/g,'')) || 0), 0);
            remainder = TARGET_TOTAL_JP - currentUsedJp;
        }

        // Add Cadangan Row at the END
        // "Cadangan yang berisi sisa dari pemberian JP tiap TP"
        // Even if remainder is 0, it's good to show it or maybe show minimum if user wants strict math.
        // We assume remainder is non-negative now.
        const sisaAkhir = Math.max(0, remainder);
        
        finalProtaData.push({
            no: '',
            topikMateri: 'Cadangan Jam Pelajaran',
            alurTujuanPembelajaran: '',
            tujuanPembelajaran: 'Digunakan untuk kegiatan insidental, remedial, atau pengayaan.',
            alokasiWaktu: `${sisaAkhir} JP`,
            semester: 'Genap' // Conventionally at end of year
        });

        return finalProtaData;

    } catch (error: any) {
        console.error("Error generating PROTA:", error);
        // Fallback darurat
        if (atpData && atpData.content) {
             return atpData.content.map((row, idx) => ({
                no: idx + 1,
                topikMateri: row.topikMateri,
                alurTujuanPembelajaran: row.kodeTp || String(idx + 1),
                tujuanPembelajaran: row.tp,
                alokasiWaktu: '2 JP',
                semester: row.semester
             }));
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

        // --- BATCHING STRATEGY & ROBUSTNESS ---
        // Keep chunk size small (3) to avoid hallucinations on complex rubrics
        const CHUNK_SIZE = 3;
        const resultsMap = new Map<number, { kriteria: any, targetKktp: any }>();

        for (let i = 0; i < semesterContent.length; i += CHUNK_SIZE) {
            const chunk = semesterContent.slice(i, i + CHUNK_SIZE);
            
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 4000)); // Increased delay to 4s to satisfy limits
            }

            // Add IDs to help AI map 1-to-1
            const chunkInput = chunk.map((row, idx) => ({
                id: idx + 1, // 1-based ID for AI context
                topikMateri: row.topikMateri,
                tp: row.tp,
                kodeTp: row.kodeTp 
            }));

            const simplifiedAtpDataChunk = {
                subject: atpData.subject,
                grade: grade,
                // Updated Instruction: Use ID mapping instead of strict count logic
                instruction: `Anda adalah Guru Mata Pelajaran ${atpData.subject} Kelas ${grade}.
                Tugas: Buat Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) untuk ${chunk.length} TP berikut.
                
                ATURAN PENTING:
                1. Output HARUS Array JSON.
                2. Setiap item output HARUS memiliki "id" yang sama dengan input.
                3. Jangan menggabungkan TP. Buat 1 objek untuk setiap 1 input.
                
                ATURAN KRITERIA (4 Level):
                1. "sangatMahir": Melampaui target TP, mandiri.
                2. "mahir": Mencapai target TP dengan tepat.
                3. "cukupMahir": Baru sebagian mencapai TP.
                4. "perluBimbingan": Belum paham konsep dasar.

                Format Output:
                [
                    {
                        "id": 1,
                        "kriteria": {
                            "sangatMahir": "...",
                            "mahir": "...",
                            "cukupMahir": "...",
                            "perluBimbingan": "..."
                        },
                        "targetKktp": "mahir"
                    }
                ]`,
                content: chunkInput.map(c => ({ id: c.id, tp: c.tp, materi: c.topikMateri }))
            };

            let aiOutput: any[] = [];
            
            try {
                // Menggunakan gemini-2.5-flash
                const response = await apiRequest('generateKKTP', { 
                    atpData: simplifiedAtpDataChunk, 
                    semester, 
                    grade, 
                    model: 'gemini-2.5-flash' 
                });

                const parsed = extractJsonArray(response.text);
                if (Array.isArray(parsed)) {
                    aiOutput = parsed;
                }
            } catch (chunkError: any) {
                console.error(`KKTP Chunk ${i/CHUNK_SIZE} AI generation failed. Using placeholders.`, chunkError);
                // We continue without AI data for this chunk, forcing fallbacks below.
                // This prevents "Blocked" or network errors from stopping the whole flow.
            }

            // Map results back to the map
            chunkInput.forEach((inputItem, idx) => {
                const absoluteIndex = i + idx;
                
                // Attempt 1: Match by Explicit ID
                let match = aiOutput.find((o: any) => o.id == inputItem.id);
                
                // Attempt 2: Match by Position if AI dropped IDs but kept order
                if (!match && aiOutput[idx]) {
                    match = aiOutput[idx];
                }

                if (match && match.kriteria) {
                     resultsMap.set(absoluteIndex, {
                        kriteria: match.kriteria,
                        targetKktp: match.targetKktp
                    });
                } else {
                    // Robust Fallback: Default rubric
                    // This ensures we never throw "Count mismatch" error
                    resultsMap.set(absoluteIndex, {
                        kriteria: {
                            sangatMahir: "Peserta didik mampu mencapai tujuan pembelajaran secara mandiri dan melampaui standar.",
                            mahir: "Peserta didik mampu mencapai tujuan pembelajaran sesuai standar.",
                            cukupMahir: "Peserta didik cukup mampu mencapai tujuan pembelajaran namun butuh perbaikan.",
                            perluBimbingan: "Peserta didik belum mencapai tujuan pembelajaran dan butuh bimbingan."
                        },
                        targetKktp: "mahir"
                    });
                }
            });
        }

        // Construct Final Table
        const finalKKTPTable: KKTPRow[] = semesterContent.map((originalData, i) => {
            const result = resultsMap.get(i);
            const rawKriteria = result?.kriteria;
            
            // Additional safety check on kriteria structure
            const safeKriteria = {
                sangatMahir: rawKriteria?.sangatMahir || "Peserta didik mampu menerapkan konsep dengan sangat baik dan mandiri.",
                mahir: rawKriteria?.mahir || "Peserta didik mampu menerapkan konsep dengan baik.",
                cukupMahir: rawKriteria?.cukupMahir || "Peserta didik mampu menerapkan konsep dengan bimbingan.",
                perluBimbingan: rawKriteria?.perluBimbingan || "Peserta didik belum mampu menerapkan konsep dan butuh bimbingan intensif."
            };

            return {
                no: originalData.kodeTp || String(i + 1),
                materiPokok: originalData.topikMateri,
                tp: originalData.tp,
                kriteria: safeKriteria,
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
        // Pre-flight validation
        if (!protaData || !protaData.content || protaData.content.length === 0) {
            throw new Error("Data PROTA kosong atau tidak valid.");
        }

        const semesterContent = protaData.content.filter(row => 
            row.semester?.trim().toLowerCase() === semester.toLowerCase()
        );

        if (semesterContent.length === 0) {
            throw new Error(`Data PROTA untuk semester ${semester} tidak ditemukan. Pastikan PROTA sudah terisi dengan benar.`);
        }

        // --- FIXED STRATEGY: Define Months & Headers manually, use AI only for distribution ---
        const isGanjil = semester.toLowerCase() === 'ganjil';
        
        // Define months and weeks based on Semester (Indonesian Academic Year standard)
        // Ganjil: Juli - Desember | Genap: Januari - Juni
        const months = isGanjil 
            ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
            : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

        const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: 5 })); // Default 5 weeks per month

        // Simplify input for AI: only send ID, summary of TP, and JP amount.
        // We do NOT ask AI to return the TP text to avoid hallucinations.
        const simplifiedProtaInput = semesterContent.map((row, index) => ({
            id: index + 1, // Temporary ID for mapping
            tp_summary: row.tujuanPembelajaran.substring(0, 80) + (row.tujuanPembelajaran.length > 80 ? '...' : ''),
            total_jp: parseInt(row.alokasiWaktu.replace(/\D/g, '') || '0')
        }));

        const simplifiedProtaPayload = {
            subject: protaData.subject,
            instruction: `You are an administrative assistant for a teacher.
            Task: Create a Semester Program (PROSEM) distribution schedule.
            
            INPUT: List of Learning Objectives (TP) with 'total_jp'.
            OUTPUT: A JSON Array mapping each ID to a monthly distribution matrix.
            
            RULES:
            1. Months are: ${months.join(', ')}. Each month has 5 weeks.
            2. Distribute 'total_jp' hours into the weeks (columns).
            3. The SUM of hours in the matrix MUST equal 'total_jp'.
            4. Return purely the schedule numbers (e.g., 2, 4, or 0).
            
            Expected JSON Format:
            [
              {
                "id": 1,
                "bulan": {
                  "${months[0]}": [2, 2, 0, 0, 0], 
                  "${months[1]}": [0, 0, 0, 0, 0],
                  ...
                },
                "keterangan": "..."
              },
              ...
            ]`,
            content: simplifiedProtaInput
        };

        const MAX_PROSEM_RETRIES = 3;
        let aiOutput: any[] = [];

        for(let attempt = 1; attempt <= MAX_PROSEM_RETRIES; attempt++) {
            try {
                // Menggunakan gemini-2.5-flash
                const response = await apiRequest('generatePROSEM', { 
                    protaData: simplifiedProtaPayload, 
                    semester, 
                    grade, 
                    model: 'gemini-2.5-flash' 
                });
                
                const parsed = extractJsonArray(response.text);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    aiOutput = parsed;
                    break; 
                }
                
                if (attempt === MAX_PROSEM_RETRIES) throw new Error("Empty or invalid AI response.");
                await new Promise(r => setTimeout(r, 2000));
            } catch (e: any) {
                console.warn(`PROSEM attempt ${attempt} failed:`, e);
                if (attempt === MAX_PROSEM_RETRIES) throw e;
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        // --- MERGING STRATEGY: Use Original PROTA Data + AI Schedule ---
        const finalContent: PROSEMRow[] = semesterContent.map((originalRow, index) => {
            const inputId = index + 1;
            const aiItem = aiOutput.find(x => x.id == inputId);
            
            // Default empty distribution if AI failed for this row
            const emptyDistribution: Record<string, (string | null)[]> = {};
            months.forEach(m => { emptyDistribution[m] = [null, null, null, null, null]; });

            let finalBulan = emptyDistribution;
            let keterangan = '';

            if (aiItem && aiItem.bulan) {
                finalBulan = {};
                months.forEach(m => {
                    const rawWeeks = aiItem.bulan[m];
                    if (Array.isArray(rawWeeks)) {
                        // Convert numbers to strings/nulls for the table
                        finalBulan[m] = rawWeeks.slice(0, 5).map((val: any) => 
                            (val === 0 || val === '0' || val === null) ? null : String(val)
                        );
                        // Fill remaining weeks if less than 5
                        while (finalBulan[m].length < 5) finalBulan[m].push(null);
                    } else {
                         finalBulan[m] = [null, null, null, null, null];
                    }
                });
                keterangan = aiItem.keterangan || '';
            }

            return {
                no: originalRow.no,
                // CRITICAL: We strictly use the original PROTA text and Time
                tujuanPembelajaran: originalRow.tujuanPembelajaran, 
                alokasiWaktu: originalRow.alokasiWaktu,
                bulan: finalBulan,
                keterangan: keterangan
            };
        });

        return { headers, content: finalContent };

    } catch (error: any) {
        console.error("Error generating PROSEM:", error);
        if (typeof error.message === 'string' && error.message.includes("models/gemini-pro is not found")) {
            throw new Error(`Gagal menghubungi AI. Config error backend.`);
        }
        if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons PROSEM dari AI. Format JSON tidak valid.");
        }
        throw error;
    }
};