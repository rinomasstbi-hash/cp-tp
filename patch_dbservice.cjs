const fs = require('fs');
let code = fs.readFileSync('services/dbService.ts', 'utf-8');
code = code.replace(
    `export interface AdminSettings {
  geminiApiKey: string;
  tahunPelajaran: string;
  kepalaMadrasah: string;
  nipKepalaMadrasah: string;
  mataPelajaran: string[];
}`,
    `export interface AdminSettings {
  geminiApiKey: string;
  tahunPelajaran: string;
  kepalaMadrasah: string;
  nipKepalaMadrasah: string;
  mataPelajaran: string[];
  namaAplikasi?: string;
}`
);
fs.writeFileSync('services/dbService.ts', code);
