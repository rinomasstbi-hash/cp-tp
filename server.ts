import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    return new GoogleGenAI({ apiKey: key });
  };
  const model = "gemini-2.5-pro";

  app.post("/api/generate/tps", async (req, res) => {
    try {
      const input = req.body;
      const ai = getAI();
      const response = await ai.models.generateContent({
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
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate/atp", async (req, res) => {
    try {
      const tpData = req.body;
      const ai = getAI();
      const response = await ai.models.generateContent({
        model,
        contents: `Susun Alur Tujuan Pembelajaran (ATP) dari data TP berikut: ${JSON.stringify(tpData.tpGroups)}`,
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
                        semester: { type: Type.STRING }
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
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate/prota", async (req, res) => {
    try {
      const { atpData, totalJpPerWeek } = req.body;
      const ai = getAI();
      const response = await ai.models.generateContent({
        model,
        contents: `Buatkan Program Tahunan (PROTA) berdasarkan ATP berikut: ${JSON.stringify(atpData.content)}. Total JP per minggu: ${totalJpPerWeek}. Hitung alokasi waktu semestinya.`,
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
                        semester: { type: Type.STRING }
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
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate/kktp", async (req, res) => {
    try {
      const { atpData, semester, grade } = req.body;
      const contentBySem = atpData.content.filter((x: any) => x.semester.toLowerCase() === semester.toLowerCase());
      if (contentBySem.length === 0) {
          res.json([]);
          return;
      }
      const ai = getAI();
      const response = await ai.models.generateContent({
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
      res.status(500).json({ error: e.message });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
