
// ====================================================================================
// PENTING: Layanan ini sekarang menggunakan Google Sheets sebagai database.
// Ini memerlukan skrip Google Apps Script yang disebarkan sebagai aplikasi web
// untuk bertindak sebagai backend yang aman.
// PASTIKAN ANDA SUDAH MENGIKUTI LANGKAH-LANGKAH PENYIAPAN DI DOKUMENTASI.
// ====================================================================================
// FIX: Explicitly type GOOGLE_APPS_SCRIPT_URL as string to prevent a compile-time error
// on the validation check below. The compiler is smart enough to know the two const
// literals are different, but we want to keep the check for future developers.
const GOOGLE_APPS_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycby3TkDWG4P5kWFSGw_SlJTi6X_Y7zTUhoNlRNG0z1MlKcEqEM9gK4uopHzR9bkpgvE/exec';
const PLACEHOLDER_URL = '';

import { TPData, ATPData, PROTAData } from '../types';

// FIX: Changed `params` type from `object` to `Record<string, any>` to allow safe spreading.
const apiRequest = async (action: string, method: 'GET' | 'POST', params: Record<string, any> = {}) => {
    if (GOOGLE_APPS_SCRIPT_URL === PLACEHOLDER_URL || !GOOGLE_APPS_SCRIPT_URL) {
        throw new Error('URL Google Apps Script belum diatur. Silakan salin URL dari hasil deploy Google Apps Script Anda dan tempelkan ke dalam variabel GOOGLE_APPS_SCRIPT_URL di file services/dbService.ts.');
    }
    
    let url = GOOGLE_APPS_SCRIPT_URL;
    const options: RequestInit = {
        method,
        headers: {},
        mode: 'cors',
    };

    if (method === 'POST') {
        const payload = {
            action,
            ...params
        };
        options.headers = {
            // FIX: Change Content-Type to text/plain to avoid CORS preflight (OPTIONS) request,
            // which is a common point of failure for Google Apps Script backends that don't
            // have a doOptions function. The GAS backend can still parse the JSON string from the body.
            'Content-Type': 'text/plain;charset=utf-8',
        };
        options.body = JSON.stringify(payload);
    } else { // GET
        // FIX: Correctly construct URLSearchParams from params, ensuring values are treated as strings.
        const queryParams = new URLSearchParams({ action, ...params } as Record<string, string>);
        url += `?${queryParams.toString()}`;
    }

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
        // Check for the specific backend error indicating a missing sheet.
        if (typeof error.message === 'string' && error.message.includes("Cannot read properties of null") && error.message.includes("getLastRow")) {
            detailedMessage = "Terjadi kesalahan konfigurasi di backend. Kemungkinan besar, sheet 'TP' atau 'ATP' tidak ada di dalam file Google Sheet Anda. Harap periksa dan pastikan kedua sheet tersebut ada dengan nama dan header kolom yang benar.";
        }

        throw new Error(`Gagal mengambil data dari server. Pastikan Anda terhubung ke internet. Detail: ${detailedMessage}`);
    }
};

export const getTPsBySubject = async (subject: string): Promise<TPData[]> => {
    const data = await apiRequest('getTPsBySubject', 'GET', { subject });
    // This check is critical to prevent TypeError if the API returns a non-array value
    return Array.isArray(data) ? data : [];
};

export const saveTP = (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TPData> => {
    return apiRequest('saveTP', 'POST', { data });
};

export const updateTP = (id: string, data: Partial<TPData>): Promise<TPData> => {
    return apiRequest('updateTP', 'POST', { id, data });
};

export const deleteTP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteTP', 'POST', { id });
};

export const deleteATPsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteATPsByTPId', 'POST', { tpId });
};

export const getATPsByTPId = async (tpId: string): Promise<ATPData[]> => {
    const data = await apiRequest('getATPsByTPId', 'GET', { tpId });
     // This check is critical to prevent TypeError if the API returns a non-array value
    return Array.isArray(data) ? data : [];
};

export const saveATP = (data: Omit<ATPData, 'id' | 'createdAt'>): Promise<ATPData> => {
    return apiRequest('saveATP', 'POST', { data });
};

export const deleteATP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteATP', 'POST', { id });
};

export const updateATP = (id: string, data: Partial<ATPData>): Promise<ATPData> => {
    return apiRequest('updateATP', 'POST', { id, data });
};

// --- PROTA Functions ---
export const deletePROTAsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROTAsByTPId', 'POST', { tpId });
};

export const getPROTAsByTPId = async (tpId: string): Promise<PROTAData[]> => {
    const data = await apiRequest('getPROTAsByTPId', 'GET', { tpId });
    return Array.isArray(data) ? data : [];
};

export const savePROTA = (data: Omit<PROTAData, 'id' | 'createdAt'>): Promise<PROTAData> => {
    return apiRequest('savePROTA', 'POST', { data });
};

export const deletePROTA = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROTA', 'POST', { id });
};

export const updatePROTA = (id: string, data: Partial<PROTAData>): Promise<PROTAData> => {
    return apiRequest('updatePROTA', 'POST', { id, data });
};
