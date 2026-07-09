import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (error.status === 503 || error.status === 429 || error.message?.includes('503') || error.message?.includes('429')) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '50mb' }));

  const getAI = () => {
    const key = (process.env.MY_GEMINI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    return new GoogleGenAI({ apiKey: key });
  };

  const model = "gemini-2.5-flash";

  app.post("/api/generate/tps", async (req, res) => {
    try {
      const input = req.body;
      const ai = getAI();
      const response = await generateWithRetry(ai, {
        model,
        contents: `Buatkan Tujuan Pembelajaran (TP) untuk mata pelajaran ${input.subject} kelas ${input.grade}. Berikut Capaian Pembelajarannya: ${JSON.stringify(input.cpElements)}. Note tambahan: ${input.additionalNotes}`,
        config: {
            systemInstruction: "Anda adalah AI asisten guru MTsN 4 Jombang. Hasilkan array objek TPGroup. Hasilkan data JSON murni.",
            responseMimeType: "application/json",
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
                                    tps: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["subMateri", "tps"]
                            }
                        }
                    },
                    required: ["semester", "materi", "subMateriGroups"]
                }
            }
        }
      });
      const result = response.text ? JSON.parse(response.text) : null;
      if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
      res.json(result);
    } catch (e: any) {
      console.error("API ERROR:", e.message); res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate/atp", async (req, res) => {
    try {
      const tpData = req.body;
      const ai = getAI();
      const response = await generateWithRetry(ai, {
        model,
        contents: `Susun Alur Tujuan Pembelajaran (ATP) dari data TP berikut: ${JSON.stringify(tpData.tpGroups)}. Pastikan kolom semester HANYA berisi nilai 'Ganjil' atau 'Genap'.`,
        config: {
            systemInstruction: "Anda adalah AI pembuat ATP. Kembalikan array berisi objek ATP. Berikan output JSON murni.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topikMateri: { type: Type.STRING },
                        tp: { type: Type.STRING },
                        kodeTp: { type: Type.STRING },
                        atpSequence: { type: Type.INTEGER },
                        semester: { type: Type.STRING, enum: ["Ganjil", "Genap"], description: "Harus 'Ganjil' atau 'Genap'" }
                    },
                    required: ["topikMateri", "tp", "kodeTp", "atpSequence", "semester"]
                }
            }
        }
      });
      const result = response.text ? JSON.parse(response.text) : null;
      if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
      res.json(result);
    } catch (e: any) {
      console.error("API ERROR:", e.message); res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate/prota", async (req, res) => {
    try {
      const { atpData, totalJpPerWeek, grade } = req.body;
      const ai = getAI();
      const isGrade9 = grade && (grade.includes('9') || grade.toUpperCase().includes('IX'));
      const standardWeeks = isGrade9 ? '32-34 minggu (Semester Ganjil: 16-17 minggu, Semester Genap: 16-17 minggu)' : '36-40 minggu (Semester Ganjil: 18-20 minggu, Semester Genap: 18-20 minggu)';
      const minJp = isGrade9 ? 32 * totalJpPerWeek : 36 * totalJpPerWeek;
      const maxJp = isGrade9 ? 34 * totalJpPerWeek : 40 * totalJpPerWeek;

      const response = await generateWithRetry(ai, {
        model,
        contents: `Buatkan Program Tahunan (PROTA) berdasarkan ATP berikut: ${JSON.stringify(atpData.content)}. 
Total JP per minggu: ${totalJpPerWeek}. 
Standar minggu efektif untuk kelas ini (${grade || 'Umum'}): ${standardWeeks}. 
Total alokasi waktu JP seluruh materi dalam setahun WAJIB berada di rentang ${minJp} JP sampai ${maxJp} JP (berdasarkan ${isGrade9 ? '32-34' : '36-40'} minggu efektif x ${totalJpPerWeek} JP/minggu). 
Silakan bagi dan distribusikan alokasi waktu JP per TP secara proporsional dan logis agar total setahun memenuhi standar tersebut. Pastikan kolom semester HANYA berisi 'Ganjil' atau 'Genap'.`,
        config: {
            systemInstruction: "Anda adalah pembuat PROTA. Kembalikan array PROTARow dalam JSON.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        no: { type: Type.INTEGER },
                        topikMateri: { type: Type.STRING },
                        alurTujuanPembelajaran: { type: Type.STRING },
                        tujuanPembelajaran: { type: Type.STRING },
                        alokasiWaktu: { type: Type.STRING },
                        semester: { type: Type.STRING, enum: ["Ganjil", "Genap"], description: "Harus 'Ganjil' atau 'Genap'" }
                    },
                    required: ["no", "topikMateri", "alurTujuanPembelajaran", "tujuanPembelajaran", "alokasiWaktu", "semester"]
                }
            }
        }
      });
      const result = response.text ? JSON.parse(response.text) : null;
      if (!result || !Array.isArray(result) || result.length === 0) throw new Error("Respons kosong");
      res.json(result);
    } catch (e: any) {
      console.error("API ERROR:", e.message); res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate/kktp", async (req, res) => {
    try {
      const { atpData, semester, grade } = req.body;
      const isSemesterMatch = (itemSem: string, targetSem: string) => {
          if (!itemSem) return false;
          const iLower = String(itemSem).toLowerCase();
          const tLower = String(targetSem).toLowerCase();
          if (iLower === tLower) return true;
          if (tLower === 'ganjil') return ['ganjil', '1', 'gasal', 'odd', 'satu'].some(s => iLower.includes(s));
          if (tLower === 'genap') return ['genap', '2', 'even', 'dua'].some(s => iLower.includes(s));
          return false;
      };
      const contentBySem = atpData.content.filter((x: any) => isSemesterMatch(x.semester, semester));
      if (contentBySem.length === 0) {
          res.json([]);
          return;
      }
      const ai = getAI();
      const response = await generateWithRetry(ai, {
        model,
        contents: `Berdasarkan ATP berikut (Semester ${semester}, kelas ${grade}): ${JSON.stringify(contentBySem)}, buatkan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP). Kriteria: Sangat Mahir, Mahir, Cukup Mahir, Perlu Bimbingan. Tentukan targetnya (sangatMahir, mahir, cukupMahir, atau perluBimbingan).`,
        config: {
            systemInstruction: "Hasilkan array dari KKTPRow dalam JSON murni.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        no: { type: Type.INTEGER },
                        materiPokok: { type: Type.STRING },
                        tp: { type: Type.STRING },
                        kriteria: {
                            type: Type.OBJECT,
                            properties: {
                                sangatMahir: { type: Type.STRING },
                                mahir: { type: Type.STRING },
                                cukupMahir: { type: Type.STRING },
                                perluBimbingan: { type: Type.STRING }
                            },
                            required: ["sangatMahir", "mahir", "cukupMahir", "perluBimbingan"]
                        },
                        targetKktp: { type: Type.STRING }
                    },
                    required: ["no", "materiPokok", "tp", "kriteria", "targetKktp"]
                }
            }
        }
      });
      const result = response.text ? JSON.parse(response.text) : null;
      if (!result || !Array.isArray(result)) throw new Error("Respons invalid");
      res.json(result);
    } catch (e: any) {
      console.error("API ERROR:", e.message); res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
