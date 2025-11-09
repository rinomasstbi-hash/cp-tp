// ====================================================================================
// !! PENTING: KONFIGURASI BACKEND !!
// ====================================================================================
// Ganti nilai placeholder di bawah ini dengan URL "Aplikasi Web" dari Google Apps Script Anda.
// Contoh: const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/ABCDEFG.../exec";
// Pastikan URL berada di dalam tanda kutip tunggal (').
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQSRJ99FFzKkOJUxa8MF_6ndknDX-54ILJKikkySulqL-DFFtnmcofe96UKZu-7s5n/exec';


import { TPData, ATPData, PROTAData, KKTPData } from '../types';

/**
 * Helper function to ensure nested JSON strings are parsed into arrays.
 * This adds robustness, in case the backend returns stringified JSON for these fields.
 * It handles strings, null, or undefined values to prevent runtime errors.
 * @param data The data object to parse.
 * @param jsonFields An array of keys that should contain array data.
 * @returns The parsed data object.
 */
const parseData = <T extends object>(data: any, jsonFields: (keyof T)[]): T => {
    if (!data || typeof data !== 'object') {
        return data as T;
    }
    const parsedData = { ...data };
    for (const field of jsonFields) {
        const key = field as string;
        const value = parsedData[key];
        
        if (typeof value === 'string') {
            try {
                // Only parse non-empty strings, otherwise default to an empty array.
                parsedData[key] = value ? JSON.parse(value) : [];
            } catch (e) {
                console.error(`Failed to parse field "${key}". Defaulting to empty array. Value was:`, value, e);
                parsedData[key] = [];
            }
        } else if (value === null || value === undefined) {
             // If the field is null or undefined, initialize it as an empty array to ensure type safety.
             parsedData[key] = [];
        }
        // If it's already a valid array, do nothing.
    }
    return parsedData as T;
};


/**
 * Mengirim permintaan ke backend Google Apps Script.
 * SEMUA permintaan sekarang menggunakan metode POST dengan FormData untuk keandalan CORS yang lebih baik.
 * @param {string} action - Aksi yang akan dilakukan oleh backend.
 * @param {Record<string, any>} params - Parameter untuk aksi tersebut.
 * @returns {Promise<any>} - Data yang dikembalikan dari API.
 */
// FIX: Export apiRequest to be used in other services.
export const apiRequest = async (action: string, params: Record<string, any> = {}) => {
    // FIX: Removed the check for a placeholder URL. Since the GOOGLE_APPS_SCRIPT_URL
    // is a `const` with a value, the check is redundant and causes a TypeScript
    // error because the literal type will never match the placeholder string.
    
    const url = GOOGLE_APPS_SCRIPT_URL;
    
    const formData = new FormData();
    formData.append('action', action);
    formData.append('params', JSON.stringify(params));

    const options: RequestInit = {
        method: 'POST',
        mode: 'cors',
        body: formData,
    };

    try {
        const response = await fetch(url, options);
        const rawResponseText = await response.text();

        // Cek jika respons adalah halaman HTML error dari Google
        if (rawResponseText.trim().startsWith('<!DOCTYPE html>')) {
             throw new Error(`Server Google Apps Script mengembalikan halaman HTML, bukan data JSON. Ini adalah tanda adanya error di sisi server.
- PASTIKAN Anda sudah melakukan "Deploy" -> "Penerapan baru" setelah menyimpan perubahan pada skrip.
- Periksa Log Eksekusi di editor Google Apps Script untuk melihat detail error yang sebenarnya.`);
        }

        let responseData;
        try {
            responseData = JSON.parse(rawResponseText);
        } catch (e) {
             // Jika parsing gagal setelah cek HTML, ini adalah error format yang tidak terduga
            console.error('Gagal mem-parsing respons JSON dari server:', rawResponseText);
            if (!response.ok) {
                 throw new Error(`HTTP error ${response.status} - ${response.statusText}. Respons server tidak dapat diproses.`);
            }
            throw new Error('Server memberikan respons dalam format yang tidak terduga. Silakan periksa log server.');
        }

        if (!response.ok) {
            const errorMessage = responseData?.message || `HTTP error ${response.status}`;
            throw new Error(`Terjadi kesalahan di server: ${errorMessage}`);
        }
        
        if (responseData.status === 'error') {
            throw new Error(`Terjadi kesalahan di server: ${responseData.message || 'Aksi tidak valid.'}`);
        }

        return responseData.data;

    } catch (error: any) {
        console.error(`API request error for action "${action}":`, error);
        
        let detailedMessage = error.message;

        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            detailedMessage = `Gagal terhubung ke server Google Apps Script.
- Periksa koneksi internet Anda.
- Pastikan URL Google Apps Script sudah benar dan telah di-deploy ulang.
- Periksa Log Eksekusi di Google Apps Script untuk melihat apakah ada error saat skrip dijalankan.`;
        } 
        else if (typeof error.message === 'string' && error.message.includes("Cannot read properties of null")) {
            detailedMessage = `Terjadi kesalahan konfigurasi di backend. Kemungkinan besar, nama salah satu sheet (TP_Data, ATP_Data, dll.) tidak ditemukan di file Google Sheet Anda atau salah ketik di dalam skrip.`;
        }

        throw new Error(`Gagal memproses permintaan. Detail: ${detailedMessage}`);
    }
};

export const getTPsBySubject = async (subject: string): Promise<TPData[]> => {
    const data = await apiRequest('getTPsBySubject', { subject });
    if (Array.isArray(data)) {
        return data.map(tp => parseData<TPData>(tp, ['tpGroups', 'cpElements']));
    }
    return [];
};

export const saveTP = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TPData> => {
    const result = await apiRequest('saveTP', { data });
    return parseData<TPData>(result, ['tpGroups', 'cpElements']);
};

export const updateTP = async (id: string, data: Partial<TPData>): Promise<TPData> => {
    const result = await apiRequest('updateTP', { id, data });
    return parseData<TPData>(result, ['tpGroups', 'cpElements']);
};

export const deleteTP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteTP', { id });
};

export const deleteATPsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteATPsByTPId', { tpId });
};

export const getATPsByTPId = async (tpId: string): Promise<ATPData[]> => {
    const data = await apiRequest('getATPsByTPId', { tpId });
    if (Array.isArray(data)) {
        return data.map(atp => parseData<ATPData>(atp, ['content']));
    }
    return [];
};

export const saveATP = async (data: Omit<ATPData, 'id' | 'createdAt'>): Promise<ATPData> => {
    const result = await apiRequest('saveATP', { data });
    return parseData<ATPData>(result, ['content']);
};

export const deleteATP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteATP', { id });
};

export const updateATP = async (id: string, data: Partial<ATPData>): Promise<ATPData> => {
    const result = await apiRequest('updateATP', { id, data });
    return parseData<ATPData>(result, ['content']);
};

// --- PROTA Functions ---
export const deletePROTAsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROTAsByTPId', { tpId });
};

export const getPROTAsByTPId = async (tpId: string): Promise<PROTAData[]> => {
    const data = await apiRequest('getPROTAsByTPId', { tpId });
    if (Array.isArray(data)) {
        return data.map(prota => parseData<PROTAData>(prota, ['content']));
    }
    return [];
};

export const savePROTA = async (data: Omit<PROTAData, 'id' | 'createdAt'>): Promise<PROTAData> => {
    const result = await apiRequest('savePROTA', { data });
    return parseData<PROTAData>(result, ['content']);
};

export const deletePROTA = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROTA', { id });
};

export const updatePROTA = async (id: string, data: Partial<PROTAData>): Promise<PROTAData> => {
    const result = await apiRequest('updatePROTA', { id, data });
    return parseData<PROTAData>(result, ['content']);
};

// --- KKTP Functions ---
export const getKKTPsByATPId = async (atpId: string): Promise<KKTPData[]> => {
    const data = await apiRequest('getKKTPsByATPId', { atpId });
    if (Array.isArray(data)) {
        return data.map(kktp => parseData<KKTPData>(kktp, ['content']));
    }
    return [];
};

export const saveKKTP = async (data: Omit<KKTPData, 'id' | 'createdAt'>): Promise<KKTPData> => {
    const result = await apiRequest('saveKKTP', { data });
    return parseData<KKTPData>(result, ['content']);
};

export const deleteKKTPsByATPId = (atpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTPsByATPId', { atpId });
};

export const deleteKKTPsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTPsByTPId', { tpId });
};