
// ====================================================================================
// !! PENTING: KONFIGURASI BACKEND !!
// ====================================================================================
// Ganti nilai placeholder di bawah ini dengan URL "Aplikasi Web" dari Google Apps Script Anda.
// Contoh: const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/ABCDEFG.../exec";
// Pastikan URL berada di dalam tanda kutip tunggal (').
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzI7hoPyZCDRxL7Ip2DEzmYGxDealcO1nZL4rZpnLOLFSMQ84on3lG0itq0LO2NUA4M/exec';


import { TPData, ATPData, PROTAData, KKTPData, PROSEMData } from '../types';

/**
 * Recursively cleans '$' symbols from all string values within an object or array.
 * This is a defensive measure to ensure data integrity throughout the app.
 * @param data The data to clean (object, array, string, etc.).
 * @returns The cleaned data.
 */
const cleanStringsInObject = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => cleanStringsInObject(item));
    }
    if (data !== null && typeof data === 'object') {
        const cleanedObject: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                cleanedObject[key] = cleanStringsInObject(data[key]);
            }
        }
        return cleanedObject;
    }
    if (typeof data === 'string') {
        return data.replace(/\$/g, '');
    }
    return data;
};


/**
 * Helper function to ensure nested JSON strings are parsed into arrays and cleans all string fields.
 * This adds robustness, in case the backend returns stringified JSON for these fields.
 * It handles strings, null, or undefined values to prevent runtime errors.
 * @param data The data object to parse.
 * @param jsonFields An array of keys that should contain array data.
 * @returns The parsed and cleaned data object.
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
    
    // **FIX:** After parsing structure, clean all string values recursively.
    return cleanStringsInObject(parsedData) as T;
};


/**
 * Mengirim permintaan ke backend Google Apps Script dengan mekanisme coba lagi (retry).
 * SEMUA permintaan sekarang menggunakan metode POST dengan URLSearchParams untuk keandalan CORS yang lebih baik.
 * @param {string} action - Aksi yang akan dilakukan oleh backend.
 * @param {Record<string, any>} params - Parameter untuk aksi tersebut.
 * @returns {Promise<any>} - Data yang dikembalikan dari API.
 */
export const apiRequest = async (action: string, params: Record<string, any> = {}) => {
    const url = GOOGLE_APPS_SCRIPT_URL;
    
    const payload = new URLSearchParams();
    payload.append('action', action);
    payload.append('params', JSON.stringify(params));

    const options: RequestInit = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store', // Disable caching explicitly
        body: payload,
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    const MAX_ATTEMPTS = 5; // Increased reliability
    // Increased delay to 5000ms to handle "Failed to fetch" errors better (often caused by GAS rate limits or network flakiness)
    const RETRY_DELAY = 5000; 

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(url, options);
            const rawResponseText = await response.text();

            if (rawResponseText.trim().startsWith('<!DOCTYPE html>')) {
                 throw new Error(`Server Google Apps Script mengembalikan halaman HTML, bukan data JSON. Ini adalah tanda adanya error di sisi server.
- PASTIKAN Anda sudah melakukan "Deploy" -> "Penerapan baru" setelah menyimpan perubahan pada skrip.
- Periksa Log Eksekusi di editor Google Apps Script untuk melihat detail error yang sebenarnya.`);
            }

            let responseData;
            try {
                responseData = JSON.parse(rawResponseText);
            } catch (e) {
                console.error('Gagal mem-parsing respons JSON dari server:', rawResponseText);
                if (!response.ok) {
                     throw new Error(`HTTP error ${response.status} - ${response.statusText}. Respons server tidak dapat diproses.`);
                }
                throw new Error('Server memberikan respons dalam format yang tidak terduga. Silakan periksa log server.');
            }

            if (!response.ok) {
                const errorMessage = responseData?.message || `HTTP error ${response.status} - ${response.statusText}`;
                throw new Error(errorMessage);
            }
            
            if (responseData.status === 'error') {
                throw new Error(responseData.message || 'Aksi tidak valid.');
            }

            return responseData.data; // Sukses, keluar dari loop

        } catch (error: any) {
            console.error(`API request error for action "${action}" (Attempt ${attempt}/${MAX_ATTEMPTS}):`, error);

            const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
            
            // Check for specific AI-related errors that should trigger a retry with longer backoff
            const isAiTransientError = error.message && (
                error.message.includes('429') || 
                error.message.includes('503') || 
                error.message.includes('quota') ||
                error.message.includes('overloaded') ||
                error.message.includes('UNAVAILABLE') ||
                error.message.includes('RESOURCE_EXHAUSTED') ||
                error.message.toLowerCase().includes('terblokir') ||
                error.message.toLowerCase().includes('kosong') ||
                error.message.toLowerCase().includes('blocked')
            );

            if ((isNetworkError || isAiTransientError) && attempt < MAX_ATTEMPTS) {
                // Exponential backoff
                // If it's an AI rate limit or overload, wait significantly longer (20s) to let it cool down
                const waitTime = isAiTransientError ? 20000 : (RETRY_DELAY * attempt);
                console.warn(`Retrying action "${action}" due to transient error. Waiting ${waitTime}ms...`);
                await new Promise(res => setTimeout(res, waitTime)); 
                continue; // Lanjut ke percobaan berikutnya
            }
            
            // Jika ini percobaan terakhir atau bukan error yang bisa di-retry, format dan lempar error.
            let detailedMessage = error.message;

            if (isNetworkError) {
                detailedMessage = `Gagal terhubung ke server (Failed to fetch).
1. Periksa koneksi internet Anda.
2. Jika menggunakan VPN/Proxy, coba matikan.
3. Script backend mungkin sedang "cold start", silakan coba lagi tombol aksi.`;
            } 
            else if (typeof error.message === 'string' && error.message.includes("Cannot read properties of null")) {
                detailedMessage = `Terjadi kesalahan konfigurasi di backend. Kemungkinan besar, nama salah satu sheet (TP_Data, ATP_Data, dll.) tidak ditemukan di file Google Sheet Anda atau salah ketik di dalam skrip.`;
            }

            throw new Error(detailedMessage);
        }
    }
     // Baris ini seharusnya tidak akan tercapai, tetapi diperlukan agar fungsi memiliki return path.
    throw new Error('Gagal memproses permintaan setelah semua percobaan.');
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

export const deleteKKTP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTP', { id });
};

export const deleteKKTPsByATPId = (atpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTPsByATPId', { atpId });
};

export const deleteKKTPsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTPsByTPId', { tpId });
};

// --- PROSEM Functions ---
export const getPROSEMByProtaId = async (protaId: string): Promise<PROSEMData[]> => {
    const data = await apiRequest('getPROSEMsByPROTAId', { protaId });
    if (Array.isArray(data)) {
        return data.map(prosem => parseData<PROSEMData>(prosem, ['content', 'headers']));
    }
    return [];
};

export const savePROSEM = async (data: Omit<PROSEMData, 'id' | 'createdAt'>): Promise<PROSEMData> => {
    const result = await apiRequest('savePROSEM', { data });
    return parseData<PROSEMData>(result, ['content', 'headers']);
};

export const deletePROSEMsByPROTAId = (protaId: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROSEMsByPROTAId', { protaId });
};

export const deletePROSEMsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROSEMsByTPId', { tpId });
};