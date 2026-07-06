const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf-8');

code = code.replace(
    "import { GoogleGenAI, Type } from '@google/genai';",
    "import { GoogleGenAI, Type } from '@google/genai';\nimport { doc, getDoc } from 'firebase/firestore';\nimport { db } from './dbService';"
);

code = code.replace(
    `const getAI = () => {
    const geminiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;
    if (!geminiKey) {
        throw new Error('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY diset di Environment Variables.');
    }
    return new GoogleGenAI({ apiKey: geminiKey });
};`,
    `const getAI = async () => {
    let geminiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;
    try {
        const docRef = doc(db, 'settings', 'admin');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().geminiApiKey) {
            geminiKey = snap.data().geminiApiKey;
        }
    } catch (e) {
        console.error("Gagal memuat API Key dari database", e);
    }
    if (!geminiKey) {
        throw new Error('API Key tidak ditemukan. Silakan login sebagai admin dan atur di menu Pengaturan API.');
    }
    return new GoogleGenAI({ apiKey: geminiKey });
};`
);

code = code.replace(/const ai = getAI\(\);/g, "const ai = await getAI();");

fs.writeFileSync('services/geminiService.ts', code);
