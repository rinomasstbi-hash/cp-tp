import { TPGroup, ATPTableRow, PROTARow, KKTPRow, PROSEMHeader, PROSEMRow, ATPData, PROTAData } from '../types';

const handleGeminiError = (e: any, context: string) => {
    console.error(e);
    let errorMsg = e.message || 'Terjadi kesalahan tidak terduga';
    if (errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand')) {
        errorMsg = 'Server AI Google saat ini sedang sibuk (high demand). Silakan coba lagi beberapa saat.';
    } else if (errorMsg.includes('429')) {
        errorMsg = 'Terlalu banyak permintaan ke server AI. Silakan tunggu beberapa saat lalu coba lagi.';
    } else if (errorMsg.includes('403') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('PERMISSION_DENIED')) {
        errorMsg = 'API Key Anda tidak valid atau telah diblokir. Harap periksa kembali konfigurasi API Key Anda.';
    }
    throw new Error(`${context}: ${errorMsg}`);
};

export const generateTPs = async (input: { subject: string; grade: string; cpElements: { element: string; cp: string }[]; additionalNotes: string }): Promise<TPGroup[]> => {
    try {
        const response = await fetch('/api/generate/tps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate TPs');
        }
        return await response.json();
    } catch (e: any) {
        handleGeminiError(e, 'Gagal membuat TP');
    }
    return []; // Should not reach here
};

export const generateATP = async (tpData: { subject: string; grade: string; tpGroups: TPGroup[] }): Promise<ATPTableRow[]> => {
    try {
        const response = await fetch('/api/generate/atp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tpData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate ATP');
        }
        return await response.json();
    } catch (error: any) {
       handleGeminiError(error, 'Gagal membuat ATP');
    }
    return [];
};

export const generatePROTA = async (atpData: ATPData, totalJpPerWeek: number): Promise<PROTARow[]> => {
    try {
        const response = await fetch('/api/generate/prota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ atpData, totalJpPerWeek })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate PROTA');
        }
        return await response.json();
    } catch (error: any) {
       handleGeminiError(error, 'Gagal membuat PROTA');
    }
    return [];
};

export const generateKKTP = async (atpData: ATPData, semester: string, grade: string): Promise<KKTPRow[]> => {
    try {
        const response = await fetch('/api/generate/kktp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ atpData, semester, grade })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate KKTP');
        }
        return await response.json();
    } catch (error: any) {
       handleGeminiError(error, 'Gagal membuat KKTP');
    }
    return [];
};

export const generatePROSEM = async (protaData: PROTAData, semester: 'Ganjil' | 'Genap', grade: string): Promise<{ headers: PROSEMHeader[], content: PROSEMRow[] }> => {
    const isGanjil = semester.toLowerCase() === 'ganjil';
    const months = isGanjil 
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    
    const weeksPerMonth = 5;
    const headers: PROSEMHeader[] = months.map(m => ({ month: m, weeks: weeksPerMonth }));

    const isSemesterMatch = (itemSem: string, targetSem: string) => {
        if (!itemSem) return false;
        const iLower = String(itemSem).toLowerCase();
        const tLower = String(targetSem).toLowerCase();
        if (iLower === tLower) return true;
        if (tLower === 'ganjil') return ['ganjil', '1', 'gasal', 'odd', 'satu'].some(s => iLower.includes(s));
        if (tLower === 'genap') return ['genap', '2', 'even', 'dua'].some(s => iLower.includes(s));
        return false;
    };

    const semesterContent = protaData.content.filter(row => 
        isSemesterMatch(row.semester, semester)
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
