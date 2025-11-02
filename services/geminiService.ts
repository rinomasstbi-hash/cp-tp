import { GoogleGenAI, Type } from "@google/genai";
import { TPGroup } from "../types";

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