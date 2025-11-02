import { GoogleGenAI, Type } from "@google/genai";
import { TPGroup } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTPs = async (
  data: {
    cpElements: { element: string; cp: string; }[];
    grade: string;
    additionalNotes: string;
  }
): Promise<TPGroup[]> => {
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
        // FIX: Added responseSchema to ensure the AI returns a well-structured JSON object, improving reliability.
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
    const text = response.text.trim();
    // Basic validation to ensure we have the correct structure
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every(p => 'materi' in p && 'subMateriGroups' in p)) {
        return parsed;
    } else {
        throw new Error("Struktur JSON yang dihasilkan AI tidak sesuai format yang diharapkan.");
    }
  } catch (error) {
    console.error("Error generating or parsing TPs:", error);
    throw new Error("Gagal generate atau memproses data TP dari AI. Periksa format output dan coba lagi.");
  }
};