// ====================================================================================
// PENTING: Layanan ini sekarang menggunakan Google Sheets sebagai database.
// Ini memerlukan skrip Google Apps Script yang disebarkan sebagai aplikasi web
// untuk bertindak sebagai backend yang aman.
// PASTIKAN ANDA SUDAH MENGIKUTI LANGKAH-LANGKAH PENYIAPAN DI DOKUMENTASI.
// ====================================================================================
const GOOGLE_APPS_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbwO8db3SZ7f9HSV0zmuoBAv3s0SBkSGjFg8wZ4qB4-HVFx_PmNT-8rArl-vq86Fnwvu/exec';
const PLACEHOLDER_URL = '';

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
const apiRequest = async (action: string, params: Record<string, any> = {}) => {
    if (GOOGLE_APPS_SCRIPT_URL === PLACEHOLDER_URL || !GOOGLE_APPS_SCRIPT_URL) {
        throw new Error('URL Google Apps Script belum diatur. Silakan salin URL dari hasil deploy Google Apps Script Anda dan tempelkan ke dalam variabel GOOGLE_APPS_SCRIPT_URL di file services/dbService.ts.');
    }
    
    const url = GOOGLE_APPS_SCRIPT_URL;
    
    // Menggunakan FormData seringkali lebih andal untuk menghindari masalah CORS dengan Google Apps Script.
    // Backend script perlu diperbarui untuk membaca dari `e.parameter` bukan `e.postData.contents`.
    const formData = new FormData();
    formData.append('action', action);
    formData.append('params', JSON.stringify(params)); // Kirim parameter sebagai string JSON

    const options: RequestInit = {
        method: 'POST',
        mode: 'cors',
        body: formData,
        // PENTING: JANGAN atur header 'Content-Type' saat menggunakan FormData.
        // Browser akan secara otomatis mengaturnya ke 'multipart/form-data' dengan boundary yang benar.
    };

    try {
        const response = await fetch(url, options);
        let responseData;
        try {
            responseData = await response.json();
        } catch (e) {
            if (!response.ok) {
                 throw new Error(`HTTP error ${response.status} - ${response.statusText}. Respons server tidak valid.`);
            }
            responseData = {}; 
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

        // Secara spesifik menangani "Failed to fetch" yang merupakan error jaringan atau CORS
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            detailedMessage = `Gagal melakukan koneksi ke server. Ini biasanya disebabkan oleh masalah di backend (Google Apps Script), bukan di aplikasi ini.
- Pastikan Anda telah menyalin kode Google Apps Script terbaru.
- Pastikan Anda telah melakukan "Deploy" ulang script setelah membuat perubahan.
- Periksa apakah ada kesalahan (error) di dalam log eksekusi Google Apps Script Anda untuk aksi "${action}".`;
        } 
        // Menangani error konfigurasi umum dari Google Sheets
        else if (typeof error.message === 'string' && error.message.includes("Cannot read properties of null")) {
            detailedMessage = `Terjadi kesalahan konfigurasi di backend. Kemungkinan besar, salah satu sheet (TP, ATP, PROTA, dll.) tidak ada di dalam file Google Sheet Anda, atau ada kesalahan pengetikan pada nama sheet di dalam script. Harap periksa kembali.`;
        }

        throw new Error(`Gagal mengambil data dari server. Detail: ${detailedMessage}`);
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