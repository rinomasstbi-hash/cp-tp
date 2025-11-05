

import { GoogleGenAI, Type } from "@google/genai";
import { TPGroup, TPData, ATPTableRow, PROTARow, ATPData } from "../types";

// The 'ai' instance is no longer created here at the top level.

export const generateTPs = async (
  data: {
    cpElements: { element: string; cp: string; }[];
    grade: string;
    additionalNotes: string;
  }
): Promise<TPGroup[]> => {
  // Initialize the GoogleGenAI client here, just before it's needed.
  // This ensures the app doesn't crash on load if process.env.API_KEY is not available.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const { cpElements, grade, additionalNotes } = data;

  const cpElementsString = cpElements
    .map((item, index) => `Elemen ${index + 1}: ${item.element}\\nCapaian Pembelajaran (CP) ${index + 1}: "${item.cp}"`)
    .join('\\n\\n');

  const prompt = `
    Anda adalah seorang ahli desain kurikulum dan pakar pedagogi untuk sistem pendidikan Indonesia, khususnya untuk tingkat Madrasah Tsanawiyah (MTs).
    Tugas Anda adalah melakukan dekomposisi materi dari Capaian Pembelajaran (CP) yang diberikan, lalu merumuskan Tujuan Pembelajaran (TP) yang sangat rinci dan berkualitas tinggi.

    Konteks:
    - Jenjang: Madrasah Tsanawiyah (MTs)
    - Kelas: ${grade}
    - Kumpulan Capaian Pembelajaran (CP) dan Elemen/Domain terkait:
${cpElementsString}
    - Keterangan Tambahan dari Guru: "${additionalNotes}"

    Instruksi Wajib (Ikuti dengan Seksama):
    1.  **Analisis Materi & Semester:** Identifikasi topik-topik materi utama dari CP. Tentukan apakah setiap materi paling cocok diajarkan di semester Ganjil atau Genap.
    2.  **DEKOMPOSISI KE SUB-MATERI:** Ini adalah langkah paling penting. Untuk setiap materi utama, pecah lagi menjadi beberapa sub-materi yang lebih spesifik dan logis. Ini akan memungkinkan pembuatan TP yang lebih banyak dan mendalam.
    3.  **Pembuatan TP per Sub-Materi:** Untuk SETIAP sub-materi, uraikan menjadi 2, 3, atau lebih TP.
    4.  **Progresi & HOTS:** Dalam lingkup setiap sub-materi, rancang TP secara berurutan. TP awal untuk pemahaman dasar, diikuti oleh TP untuk penerapan. Pastikan **satu atau dua TP terakhir** untuk setiap sub-materi adalah HOTS (level C4-C6 Taksonomi Bloom revisi).
    5.  **Format ABCD:** Setiap TP HARUS ditulis dalam format ABCD (Audience, Behavior, Condition, Degree), diawali dengan "Murid dapat...". Contoh: "Murid dapat menganalisis (B) tiga perbedaan utama antara sel hewan dan sel tumbuhan (D) setelah melakukan pengamatan menggunakan mikroskop (C)."
    6.  **Format Output JSON:** Hasilkan respons HANYA dalam format JSON yang valid. Strukturnya harus berupa array objek. Setiap objek merepresentasikan satu MATERI POKOK dan memiliki properti: "semester", "materi", dan "subMateriGroups". "subMateriGroups" adalah sebuah array objek, di mana setiap objek merepresentasikan satu SUB-MATERI dan memiliki properti "subMateri" dan "tps".
    7.  **Aturan Escaping JSON:** Jika ada teks yang Anda hasilkan (terutama di dalam properti "tps") yang mengandung karakter kutip ganda ("), Anda WAJIB melakukan escaping dengan menambahkan backslash sebelumnya (contoh: \\"). Ini untuk memastikan output JSON selalu valid.

    Contoh Format Output JSON:
    [
      {
        "semester": "Ganjil",
        "materi": "Bilangan",
        "subMateriGroups": [
          {
            "subMateri": "Konsep Bilangan Bulat dan Pecahan",
            "tps": [
              "Murid dapat menjelaskan konsep bilangan bulat dan posisinya pada garis bilangan dengan benar setelah mengikuti penjelasan guru.",
              "Murid dapat membandingkan dan mengurutkan bilangan pecahan dengan tepat setelah menggunakan model visual."
            ]
          },
          {
            "subMateri": "Operasi Hitung Campuran",
            "tps": [
              "Murid dapat menerapkan operasi hitung campuran pada bilangan bulat dan pecahan untuk menyelesaikan soal cerita dalam konteks kehidupan sehari-hari secara akurat.",
              "Murid dapat menganalisis kesalahan dalam pengerjaan soal operasi hitung campuran yang diberikan dengan teliti."
            ]
          }
        ]
      },
      {
        "semester": "Genap",
        "materi": "Aljabar",
        "subMateriGroups": [
           {
            "subMateri": "Pengenalan Bentuk Aljabar",
            "tps": [
              "Murid dapat mengidentifikasi variabel, koefisien, dan konstanta dalam bentuk aljabar dengan benar setelah diberikan beberapa contoh."
            ]
          }
        ]
      }
    ]

    PENTING: Hasilkan HANYA output JSON yang valid tanpa teks pembuka, penutup, atau markdown.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
       config: {
        responseMimeType: "application/json",
        // The responseSchema helps ensure the AI returns a well-structured JSON object, improving reliability.
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
                    tps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    let jsonStr = response.text.trim();
    
    // The model may still wrap the JSON in markdown backticks despite the configuration.
    // This logic strips any markdown wrappers to ensure the string is valid JSON before parsing.
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
        // Check if it's an object, looks like a TPGroup, but is missing 'materi'.
        if (typeof item === 'object' && item !== null && !('materi' in item) && 'subMateriGroups' in item) {
          // Generate a placeholder materi from the first sub-materi, or a generic one.
          const placeholderMateri = item.subMateriGroups?.[0]?.subMateri || `Materi Pokok #${index + 1}`;
          return {
            ...item,
            materi: placeholderMateri,
          };
        }
        return item; // Return item as is if it's fine or doesn't match the pattern.
      });
    };

    if (Array.isArray(parsed)) {
      parsed = fixMissingMateri(parsed);
    } else if (typeof parsed === 'object' && parsed !== null) {
      // If the data is wrapped in an object, find the first array value and fix it.
      for (const key in parsed) {
        const value = (parsed as any)[key];
        if (Array.isArray(value)) {
          (parsed as any)[key] = fixMissingMateri(value);
          break; // Assume only one main data array per response.
        }
      }
    }
    // --- END FIX ---


    let dataArray: TPGroup[] | null = null;
    
    // Type guard to check if an array conforms to the expected TPGroup structure.
    const isValidTPGroupArray = (arr: any): arr is TPGroup[] => {
      return Array.isArray(arr) && arr.every(p => 
        p && typeof p === 'object' && 'materi' in p && 'subMateriGroups' in p
      );
    };

    // Case 1: The entire response is the array we want.
    if (isValidTPGroupArray(parsed)) {
        dataArray = parsed;
    } 
    // Case 2: The response is an object that CONTAINS the array (e.g., { "data": [...] }).
    else if (typeof parsed === 'object' && parsed !== null) {
        for (const key in parsed) {
            const value = (parsed as any)[key];
            if (isValidTPGroupArray(value)) {
                dataArray = value;
                break; // Found the array, no need to look further.
            }
        }
    }

    if (dataArray) {
        return dataArray;
    } else {
        // If we still haven't found a valid array, the structure is truly unexpected.
        // Log the original, un-fixed response for better debugging.
        console.error("Unexpected AI JSON structure:", JSON.stringify(JSON.parse(jsonStr), null, 2));
        throw new Error("Struktur JSON yang dihasilkan AI tidak sesuai format yang diharapkan.");
    }
  } catch (error: any) {
    console.error("Error generating or parsing TPs:", error);
    if (error instanceof SyntaxError) {
        // This error occurs if JSON.parse fails, likely due to an invalid format from the AI.
        throw new Error("Gagal memproses respons dari AI karena format tidak valid. Silakan coba generate lagi.");
    }
    // This provides a more specific error, including the actual message from the API client,
    // which helps diagnose issues like invalid API keys instead of generic network errors.
    throw new Error(`Gagal berkomunikasi dengan AI. Detail: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'} Pastikan koneksi internet dan API Key Anda sudah benar.`);
  }
};


export const generateATP = async (tpData: TPData): Promise<ATPTableRow[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Step 1: Create the "source of truth" data structure locally. This contains all TP info.
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

    // Step 2: Create a data structure for the AI with indices and text.
    const tpsForAI = sourceOfTruthData.map((d, index) => ({
        index: index,
        tp: d.tpText
    }));

    const prompt = `
    Anda adalah seorang ahli perancangan kurikulum dan pedagogi di Indonesia.
    Tugas Anda adalah menyusun Alur Tujuan Pembelajaran (ATP) yang logis dari sekumpulan Tujuan Pembelajaran (TP) yang tidak berurutan.

    Konteks:
    - Mata Pelajaran: ${tpData.subject}
    - Kelas: ${tpData.grade}
    - Berikut adalah daftar lengkap Tujuan Pembelajaran (TP) yang perlu Anda susun. Setiap TP memiliki 'index' asli.
    \`\`\`json
    ${JSON.stringify(tpsForAI, null, 2)}
    \`\`\`

    Instruksi Wajib (Ikuti dengan SANGAT SEKSAMA):
    1.  **Analisis Menyeluruh:** Baca dan pahami setiap TP dalam daftar. Identifikasi keterkaitan antar TP, tingkat kesulitannya (dari konkret ke abstrak, dari mudah ke sulit), dan prasyarat pengetahuan.
    2.  **Prinsip Penyusunan Alur:** Susun ulang TP-TP tersebut ke dalam urutan yang paling logis untuk diajarkan.
    3.  **FOKUS PADA INDEKS:** Hasil akhir Anda HARUS berupa sebuah array JSON yang berisi **HANYA ANGKA-ANGKA** dari properti \`index\` asli, tetapi dalam URutan BARU yang sudah Anda tentukan. JANGAN mengembalikan teks TP.
    4.  **Kelengkapan:** Pastikan jumlah indeks dalam output Anda sama persis dengan jumlah TP dalam input. Tidak boleh ada indeks yang hilang atau diduplikasi.
    5.  **Format Output JSON Sederhana:** Hasilkan HANYA sebuah array JSON berisi ANGKA (integer).

    Contoh Format Input:
    [
      { "index": 0, "tp": "TP tentang konsep dasar." },
      { "index": 1, "tp": "TP tentang penerapan konsep." },
      { "index": 2, "tp": "TP tentang evaluasi konsep." }
    ]

    Contoh Format Output JSON yang Diharapkan (jika urutannya tetap sama):
    [
      0,
      1,
      2
    ]
    
    Contoh Format Output JSON yang Diharapkan (jika urutannya diubah):
    [
      1,
      0,
      2
    ]

    PENTING: Hasilkan HANYA output JSON array berisi ANGKA yang valid tanpa teks pembuka, penutup, atau markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.NUMBER,
                    }
                }
            }
        });
        
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const reorderedIndices = JSON.parse(jsonStr) as number[];

        // Step 3: Critical post-processing and validation on indices.
        if (!Array.isArray(reorderedIndices) || !reorderedIndices.every(i => typeof i === 'number')) {
            console.error("Unexpected AI JSON structure for ATP sequencing:", reorderedIndices);
            throw new Error("Struktur JSON pengurutan ATP yang dihasilkan AI tidak sesuai format array angka yang diharapkan.");
        }
        
        if (reorderedIndices.length !== sourceOfTruthData.length) {
            throw new Error(`Inkonsistensi data dari AI: Jumlah TP yang dikirim (${sourceOfTruthData.length}) tidak cocok dengan jumlah indeks yang diurutkan kembali (${reorderedIndices.length}). Coba generate lagi.`);
        }
        
        const originalIndicesSet = new Set(sourceOfTruthData.map((_, i) => i));
        const returnedIndicesSet = new Set(reorderedIndices);

        if (returnedIndicesSet.size !== originalIndicesSet.size) {
            throw new Error("Inkonsistensi data dari AI: Terdeteksi ada indeks TP yang hilang atau diduplikasi dalam respons. Coba generate lagi.");
        }

        for (const index of reorderedIndices) {
            if (!originalIndicesSet.has(index)) {
                throw new Error(`Inkonsistensi data dari AI: AI mengembalikan indeks tidak valid (${index}) yang tidak ada di input asli. Coba generate lagi.`);
            }
        }


        // Step 4: Reconstruct the full ATP table using the new, validated order of indices.
        const finalATPTable: ATPTableRow[] = reorderedIndices.map((originalIndex, newSequenceIndex) => {
            const originalData = sourceOfTruthData[originalIndex];
            if (!originalData) {
                // This case should be prevented by the validation above, but it's a safe fallback.
                throw new Error(`Kesalahan internal: Tidak dapat menemukan data asli untuk indeks: ${originalIndex}`);
            }
            
            return {
                topikMateri: originalData.materi,
                tp: originalData.tpText,
                kodeTp: originalData.tpCode,
                atpSequence: newSequenceIndex + 1, // The new sequence is based on the reordered array index.
                semester: originalData.semester,
            };
        });
        
        return finalATPTable;

    } catch (error: any) {
        console.error("Error generating ATP:", error);
         if (error instanceof SyntaxError) {
            throw new Error("Gagal memproses respons pengurutan ATP dari AI karena format tidak valid. Silakan coba generate lagi.");
        }
        throw new Error(`Gagal menghasilkan alur ATP dari AI. Detail: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'}`);
    }
};


export const generatePROTA = async (atpData: ATPData, jamPertemuan: number): Promise<PROTARow[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const tpsForAI = atpData.content.map((row, index) => ({
        index: index,
        topikMateri: row.topikMateri,
        tujuanPembelajaran: row.tp,
    }));
    
    const tpsForAIString = JSON.stringify(tpsForAI, null, 2);
    const totalJpSetahun = jamPertemuan * 32;
    const totalJpEfektif = totalJpSetahun;

    const prompt = `
    Anda adalah seorang ahli perancangan kurikulum pendidikan di Indonesia yang sangat teliti dan akurat dalam menghitung alokasi waktu.
    Tugas Anda adalah memberikan alokasi waktu (dalam Jam Pertemuan atau JP) untuk setiap Tujuan Pembelajaran (TP) yang diberikan.

    Konteks:
    - Mata Pelajaran: ${atpData.subject}
    - Jam Pertemuan (JP) per minggu: ${jamPertemuan} JP.
    - Berikut adalah daftar Tujuan Pembelajaran (TP) yang perlu Anda alokasikan waktunya. Setiap TP memiliki 'index' asli.
    \`\`\`json
    ${tpsForAIString}
    \`\`\`

    Instruksi Wajib (Ikuti dengan SANGAT SEKSAMA):
    1.  **Pahami Anggaran Waktu:** Total alokasi waktu yang harus Anda distribusikan untuk SEMUA TP adalah **${totalJpEfektif} JP**. Angka ini bersifat final dan jumlah akhir dari alokasi Anda HARUS SAMA PERSIS dengan angka ini. Ini dihitung dari (${jamPertemuan} JP/minggu * 32 minggu efektif).
    2.  **Proses Berpikir untuk Alokasi (Ikuti Langkah Ini):**
        a. **Analisis Kompleksitas:** Baca dan analisis setiap TP. Beri bobot pada setiap TP berdasarkan kesulitannya. TP yang memerlukan pemikiran tingkat tinggi (analisis, evaluasi, kreasi C4-C6) atau kegiatan praktik (proyek, eksperimen) harus diberi bobot lebih tinggi. TP yang bersifat pengenalan dasar (mengingat, memahami C1-C2) diberi bobot lebih rendah.
        b. **Distribusi Proporsional:** Bagikan **${totalJpEfektif} JP** secara proporsional berdasarkan bobot yang telah Anda tentukan. TP dengan bobot lebih tinggi mendapatkan JP lebih banyak (misalnya 4-8 JP), dan TP dengan bobot lebih rendah mendapatkan JP lebih sedikit (misalnya 2-3 JP).
        c. **Verifikasi Total (LANGKAH KRITIS):** Setelah mendistribusikan JP, JUMLAHKAN semua nilai JP yang telah Anda alokasikan. Jika totalnya tidak sama persis dengan **${totalJpEfektif} JP**, lakukan penyesuaian (tambah atau kurangi JP dari beberapa TP yang paling sesuai) hingga totalnya TEPAT **${totalJpEfektif} JP**.
    3.  **ATURAN PENTING:**
        a. **LARANGAN KERAS:** Jangan pernah memberikan alokasi waktu yang seragam untuk semua TP (contoh: semua diberi "2 JP"). Alokasi harus bervariasi dan mencerminkan analisis kompleksitas Anda.
        b. **Format Alokasi:** Nilai \`alokasiWaktu\` WAJIB berupa string yang berisi angka bulat positif diikuti oleh spasi dan "JP" (contoh: "4 JP").
    4.  **Format Output JSON:**
        a. Hasilkan sebuah array JSON.
        b. Setiap elemen dalam array adalah objek dengan dua properti: \`index\` (salin dari input) dan \`alokasiWaktu\` (hasil perhitungan Anda).
        c. Urutan objek dalam output HARUS sama dengan urutan input.
    5.  **ATURAN FINAL:** Output Anda harus **HANYA** berupa array JSON yang valid tanpa teks pembuka, penjelasan, komentar, atau markdown.

    Contoh Format Output JSON yang Diharapkan:
    [
      {
        "index": 0,
        "alokasiWaktu": "4 JP"
      },
      {
        "index": 1,
        "alokasiWaktu": "6 JP"
      }
    ]

    PENTING: Hasilkan HANYA output JSON array yang valid.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            index: { type: Type.NUMBER },
                            alokasiWaktu: { type: Type.STRING },
                        },
                        required: ['index', 'alokasiWaktu'],
                    }
                }
            }
        });
        
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const parsedAllocations = JSON.parse(jsonStr) as { index: number; alokasiWaktu: string }[];

        // --- Post-processing Validation & Reconstruction ---
        if (!Array.isArray(parsedAllocations) || parsedAllocations.length !== atpData.content.length) {
            throw new Error(`Respons AI tidak valid. Jumlah alokasi waktu (${parsedAllocations.length}) tidak cocok dengan jumlah TP (${atpData.content.length}).`);
        }

        const finalProtaData: PROTARow[] = atpData.content.map((originalRow, index) => {
            const allocationData = parsedAllocations[index];
            let allocatedTime = '2 JP'; // Default value

            // Validate the allocation for this index
            if (allocationData && allocationData.index === index && typeof allocationData.alokasiWaktu === 'string' && allocationData.alokasiWaktu.match(/^\d+\s*JP$/i)) {
                allocatedTime = allocationData.alokasiWaktu;
            } else {
                console.warn(`Alokasi waktu tidak valid atau indeks tidak cocok untuk index ${index}. Menggunakan nilai default '2 JP'.`, allocationData);
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
            throw new Error("Gagal memproses respons PROTA dari AI karena format tidak valid. Silakan coba generate lagi.");
        }
        throw new Error(`Gagal menghasilkan PROTA dari AI. Detail: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'}`);
    }
};