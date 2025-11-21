

export const MATA_PELAJARAN = [
  "Al-Qur'an Hadis",
  "Akidah Akhlak",
  "Fikih",
  "Sejarah Kebudayaan Islam",
  "Bahasa Arab",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam",
  "Ilmu Pengetahuan Sosial",
  "Bahasa Inggris",
  "Pend. Jasmani, Olahraga, dan Kesehatan",
  "Informatika",
  "Seni Budaya & Prakarya",
  "Mabadi' Fiqh",
  "Aswaja",
  "Bahasa Jawa"
];

export const APP_TITLE = "TP Generator MTsN 4 Jombang";

// =================================================================
// KONFIGURASI KEAMANAN
// =================================================================
// API Key tidak lagi disimpan di sini (hardcoded) untuk mencegah kebocoran.
// Aplikasi sekarang menggunakan:
// 1. Environment Variables (VITE_GEMINI_API_KEY) - Disarankan untuk Deploy
// 2. LocalStorage (Input via UI) - Disarankan untuk testing/pengguna umum
export const GEMINI_API_KEY_FALLBACK: string = ''; 
// =================================================================