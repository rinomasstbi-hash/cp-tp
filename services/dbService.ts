
// ====================================================================================
// PENTING: Layanan ini sekarang menggunakan Google Sheets sebagai database.
// Ini memerlukan skrip Google Apps Script yang disebarkan sebagai aplikasi web
// untuk bertindak sebagai backend yang aman.
// PASTIKAN ANDA SUDAH MENGIKUTI LANGKAH-LANGKAH PENYIAPAN DI DOKUMENTASI.
// ====================================================================================
const GOOGLE_APPS_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbzCd2pfTo3ow4nkVx9VRb94Ncm2sbf5hsMiXsGaxcZgMJArL2E2A_3uoY0cuT_mzgDW/exec';
const PLACEHOLDER_URL = '';

import { TPData, ATPData, PROTAData, KKTPData } from '../types';

/**
 * Mengirim permintaan ke backend Google Apps Script.
 * SEMUA permintaan sekarang menggunakan metode POST untuk menghindari masalah CORS
 * yang terkait dengan pengalihan (redirects) pada permintaan GET.
 * @param {string} action - Aksi yang akan dilakukan oleh backend.
 * @param {Record<string, any>} params - Parameter untuk aksi tersebut.
 * @returns {Promise<any>} - Data yang dikembalikan dari API.
 */
const apiRequest = async (action: string, params: Record<string, any> = {}) => {
    if (GOOGLE_APPS_SCRIPT_URL === PLACEHOLDER_URL || !GOOGLE_APPS_SCRIPT_URL) {
        throw new Error('URL Google Apps Script belum diatur. Silakan salin URL dari hasil deploy Google Apps Script Anda dan tempelkan ke dalam variabel GOOGLE_APPS_SCRIPT_URL di file services/dbService.ts.');
    }
    
    const url = GOOGLE_APPS_SCRIPT_URL;
    
    // Semua parameter sekarang dibungkus dalam objek payload tunggal.
    // Backend akan membaca 'action' dan 'params' dari body POST.
    const payload = {
        action,
        params,
    };

    const options: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        mode: 'cors',
        body: JSON.stringify(payload),
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
        if (typeof error.message === 'string' && error.message.includes("Cannot read properties of null") && error.message.includes("getLastRow")) {
            detailedMessage = "Terjadi kesalahan konfigurasi di backend. Kemungkinan besar, salah satu sheet (TP, ATP, dll.) tidak ada di dalam file Google Sheet Anda. Harap periksa kembali.";
        }

        throw new Error(`Gagal mengambil data dari server. Pastikan Anda terhubung ke internet. Detail: ${detailedMessage}`);
    }
};

export const getTPsBySubject = async (subject: string): Promise<TPData[]> => {
    const data = await apiRequest('getTPsBySubject', { subject });
    return Array.isArray(data) ? data : [];
};

export const saveTP = (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TPData> => {
    return apiRequest('saveTP', { data });
};

export const updateTP = (id: string, data: Partial<TPData>): Promise<TPData> => {
    return apiRequest('updateTP', { id, data });
};

export const deleteTP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteTP', { id });
};

export const deleteATPsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteATPsByTPId', { tpId });
};

export const getATPsByTPId = async (tpId: string): Promise<ATPData[]> => {
    const data = await apiRequest('getATPsByTPId', { tpId });
    return Array.isArray(data) ? data : [];
};

export const saveATP = (data: Omit<ATPData, 'id' | 'createdAt'>): Promise<ATPData> => {
    return apiRequest('saveATP', { data });
};

export const deleteATP = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteATP', { id });
};

export const updateATP = (id: string, data: Partial<ATPData>): Promise<ATPData> => {
    return apiRequest('updateATP', { id, data });
};

// --- PROTA Functions ---
export const deletePROTAsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROTAsByTPId', { tpId });
};

export const getPROTAsByTPId = async (tpId: string): Promise<PROTAData[]> => {
    const data = await apiRequest('getPROTAsByTPId', { tpId });
    return Array.isArray(data) ? data : [];
};

export const savePROTA = (data: Omit<PROTAData, 'id' | 'createdAt'>): Promise<PROTAData> => {
    return apiRequest('savePROTA', { data });
};

export const deletePROTA = (id: string): Promise<{ success: boolean }> => {
    return apiRequest('deletePROTA', { id });
};

export const updatePROTA = (id: string, data: Partial<PROTAData>): Promise<PROTAData> => {
    return apiRequest('updatePROTA', { id, data });
};

// --- KKTP Functions ---
export const getKKTPsByATPId = async (atpId: string): Promise<KKTPData[]> => {
    const data = await apiRequest('getKKTPsByATPId', { atpId });
    return Array.isArray(data) ? data : [];
};

export const saveKKTP = (data: Omit<KKTPData, 'id' | 'createdAt'>): Promise<KKTPData> => {
    return apiRequest('saveKKTP', { data });
};

export const deleteKKTPsByATPId = (atpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTPsByATPId', { atpId });
};

export const deleteKKTPsByTPId = (tpId: string): Promise<{ success: boolean }> => {
    return apiRequest('deleteKKTPsByTPId', { tpId });
};
