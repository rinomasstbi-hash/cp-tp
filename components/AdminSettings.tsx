import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/dbService';

export const AdminSettings: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'admin');
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().geminiApiKey) {
                    setApiKey(snap.data().geminiApiKey);
                }
            } catch (error) {
                console.error("Gagal memuat pengaturan:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await setDoc(doc(db, 'settings', 'admin'), { geminiApiKey: apiKey.trim() }, { merge: true });
            setMessage({ type: 'success', text: 'API Key berhasil disimpan! Aplikasi sekarang akan menggunakan key ini.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Gagal menyimpan: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-600">Memuat pengaturan...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            
            
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Konfigurasi Gemini API</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Gemini API Key</label>
                    <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full border border-slate-300 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                        API Key ini akan digunakan oleh seluruh pengguna aplikasi untuk men-generate perangkat ajar.
                        Pastikan Anda memiliki kuota yang cukup di Google AI Studio.
                    </p>
                </div>
                
                {message && (
                    <div className={`mb-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
                
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                    {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
            </div>
        </div>
    );
};
