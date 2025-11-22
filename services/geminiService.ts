import { TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow, ATPData, PROTAData } from '../types';
import { apiRequest } from './dbService';

// ============================================================================
// CATATAN PENTING: ARSITEKTUR PROXY
// ============================================================================
// Service ini telah diubah total. Alih-alih memanggil Google Gemini API
// secara langsung dari browser (yang tidak aman), sekarang semua permintaan
// dikirim ke backend Google Apps Script kita.
//
// Backend-lah yang akan menyimpan API Key secara aman dan melakukan
// panggilan ke Gemini, lalu mengembalikan hasilnya ke sini. Ini disebut
// "Proxy Pattern" dan merupakan praktik keamanan standar.
//
// Anda TIDAK PERLU lagi memasukkan API Key di browser.
// ============================================================================


// ============================================================================
// LANGKAH 1: GENERATE TUJUAN PEMBELAJARAN (TP)
// ============================================================================
export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    try {
        // 'input' akan di-serialize dan dikirim ke backend.
        const result = await apiRequest('proxyGenerateTPs', { input });
        
        // Asumsi backend mengembalikan array JSON yang sudah bersih.
        if (!result || !Array.isArray(result) || result.length === 0) {
            throw new Error("AI tidak menghasilkan data TP yang valid. Backend mungkin mengalami masalah atau respons kosong.");
        }
        
        return result as TPGroup[];

    } catch (error: any) {
        console.error("Error in generateTPs proxy call:", error);
        // Lempar ulang error agar bisa ditangkap oleh UI
        throw new Error(`Gagal membuat TP: ${error.message || 'Kesalahan tidak diketahui dari backend.'}`);
    }
};

// ============================================================================
// LANGKAH 2: GENERATE ALUR TUJUAN PEMBELAJARAN (ATP)
// ============================================================================
export const generateATP = async (tpData: { subject: string; grade: string; tpGroups: TPGroup[] }): Promise<ATPTableRow[]> => {
    try {
        const result = await apiRequest('proxyGenerateATP', { tpData });
        if (!result || !Array.isArray(result) || result.length === 0) {
            throw new Error("AI tidak menghasilkan data ATP yang valid.");
        }
        return result as ATPTableRow[];
    } catch (error: any) {
       console.error("Error in generateATP proxy call:", error);
       throw new Error(`Gagal membuat ATP: ${error.message}`);
    }
};

// ============================================================================
// LANGKAH 3: GENERATE PROGRAM TAHUNAN (PROTA)
// ============================================================================
export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number): Promise<PROTARow[]> => {
    try {
        const result = await apiRequest('proxyGeneratePROTA', { atpData, totalJpPerWeek });
        if (!result || !Array.isArray(result) || result.length === 0) {
            throw new Error("AI tidak menghasilkan data PROTA yang valid.");
        }
        return result as PROTARow[];
    } catch (error: any) {
       console.error("Error in generatePROTA proxy call:", error);
       throw new Error(`Gagal membuat PROTA: ${error.message}`);
    }
};

// ============================================================================
// LANGKAH 4: GENERATE KRITERIA KETERCAPAIAN (KKTP)
// ============================================================================
export const generateKKTP = async (atpData: ATPData, semester: string, grade: string): Promise<KKTPRow[]> => {
    try {
        const result = await apiRequest('proxyGenerateKKTP', { atpData, semester, grade });
         if (!result || !Array.isArray(result)) { // Boleh array kosong
            throw new Error("AI mengembalikan data KKTP dalam format yang tidak valid.");
        }
        return result as KKTPRow[];
    } catch (error: any) {
       console.error("Error in generateKKTP proxy call:", error);
       throw new Error(`Gagal membuat KKTP: ${error.message}`);
    }
};

// ============================================================================
// LANGKAH 5: GENERATE PROGRAM SEMESTER (PROSEM) - Murni Algoritmik
// ============================================================================
// Fungsi ini tidak memanggil AI, sehingga tidak perlu diubah menjadi proxy.
// Tetap berjalan di sisi klien untuk kecepatan dan efisiensi.
export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    const weeksPerMonth = 5;
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: weeksPerMonth }));

    const semesterContent = protaData.content.filter(row => 
        row.semester?.trim().toLowerCase() === semester.toLowerCase()
    );
    
    if (semesterContent.length === 0) {
        return { headers, content: [] };
    }

    const maxJpPerWeek = Number(protaData.jamPertemuan) || 2;
    const totalWeeks = months.length * weeksPerMonth;
    
    const weeklyUsage = new Array(totalWeeks).fill(0);
    let globalWeekCursor = 0; 

    const finalContent: PROSEMRow[] = semesterContent.map((row) => {
        const jpMatch = row.alokasiWaktu.match(/(\d+)/);
        const totalJpForTp = jpMatch ? parseInt(jpMatch[0]) : 0;
        
        let remainingToDistribute = totalJpForTp;
        
        const distribution: Record<string, (string | null)[]> = {};
        months.forEach(m => { distribution[m] = Array(weeksPerMonth).fill(null); });

        while (remainingToDistribute > 0 && globalWeekCursor < totalWeeks) {
            const currentUsage = weeklyUsage[globalWeekCursor];
            const availableSpace = maxJpPerWeek - currentUsage;

            if (availableSpace > 0) {
                const amountToAssign = Math.min(remainingToDistribute, availableSpace);
                const monthIndex = Math.floor(globalWeekCursor / weeksPerMonth);
                const weekIndexInMonth = globalWeekCursor % weeksPerMonth;
                
                if (monthIndex < months.length) {
                    const monthName = months[monthIndex];
                    distribution[monthName][weekIndexInMonth] = String(amountToAssign);
                }
                
                weeklyUsage[globalWeekCursor] += amountToAssign;
                remainingToDistribute -= amountToAssign;
            }

            if (weeklyUsage[globalWeekCursor] >= maxJpPerWeek) {
                globalWeekCursor++;
            }
        }

        return {
            no: row.no,
            tujuanPembelajaran: row.tujuanPembelajaran,
            alokasiWaktu: row.alokasiWaktu,
            bulan: distribution,
            keterangan: '' 
        };
    });

    return { headers, content: finalContent };
};
