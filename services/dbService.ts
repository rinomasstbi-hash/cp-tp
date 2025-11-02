// ====================================================================================
// PENTING: Layanan ini sekarang menggunakan Google Sheets sebagai database.
// Ini memerlukan skrip Google Apps Script yang disebarkan sebagai aplikasi web
// untuk bertindak sebagai backend yang aman.
// PASTIKAN ANDA SUDAH MENGIKUTI LANGKAH-LANGKAH PENYIAPAN DI DOKUMENTASI.
// ====================================================================================
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw-qsZV3CnJbi91_Slz-JpR-7z-LEqiQb25DkZxmE5QGfg4UfAD8mF8PHbHk_Y91Bcq/exec';

import { TPData } from '../types';

const apiRequest = async (action: string, method: 'GET' | 'POST', body?: object) => {
    // FIX: Removed the obsolete check for a placeholder URL. This comparison was causing
    // a TypeScript error because the constant GOOGLE_APPS_SCRIPT_URL will never be equal
    // to the placeholder string. The check is no longer needed since the URL is configured.

    let url = `${GOOGLE_APPS_SCRIPT_URL}?action=${action}`;
    const options: RequestInit = {
        method,
        headers: {},
        mode: 'cors',
    };

    if (method === 'POST' && body) {
        options.body = JSON.stringify(body);
        // FIX: Changed Content-Type to 'text/plain' to avoid CORS preflight (OPTIONS)
        // requests, which is a common issue with Google Apps Script web apps.
        // The server-side script is expected to parse the text content as JSON.
        options.headers = {'Content-Type': 'text/plain;charset=utf-8'};
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gagal terhubung ke server: ${response.statusText} | ${errorText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Terjadi kesalahan pada server.');
        }
        return result.data;
    } catch (error: any) {
        console.error(`API request error for action "${action}":`, error);
        throw new Error(`${error.message}`);
    }
};

export const getTPsBySubject = async (subject: string): Promise<TPData[]> => {
    const url = `${GOOGLE_APPS_SCRIPT_URL}?action=getTPs&subject=${encodeURIComponent(subject)}`;
     try {
        const response = await fetch(url);
         if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Terjadi kesalahan pada server.');
        }
        // Data dari sheet yang berupa JSON string di-parse kembali menjadi objek.
        const parsedData = result.data.map((item: any) => ({
            ...item,
            cpElements: typeof item.cpElements === 'string' ? JSON.parse(item.cpElements || '[]') : item.cpElements,
            tpGroups: typeof item.tpGroups === 'string' ? JSON.parse(item.tpGroups || '[]') : item.tpGroups,
        }));
        return parsedData;
    } catch (error: any) {
        console.error(`API request error for action "getTPs":`, error);
        throw new Error(`Gagal mengambil data: ${error.message}`);
    }
};

export const saveTP = async (data: Omit<TPData, 'id' | 'userId'>): Promise<TPData> => {
    return apiRequest('saveTP', 'POST', data);
};

export const updateTP = async (tpId: string, updatedData: Partial<Omit<TPData, 'id'>>): Promise<void> => {
    return apiRequest('updateTP', 'POST', { tpId, updatedData });
};

export const deleteTP = async (tpId: string): Promise<void> => {
    return apiRequest('deleteTP', 'POST', { tpId });
};