const fs = require('fs');
const code = `import React, { useState, useEffect } from 'react';
import { getAdminSettings, saveAdminSettings, AdminSettings as SettingsType } from '../services/dbService';

export const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<SettingsType>({
        geminiApiKey: '',
        tahunPelajaran: '2025/2026',
        kepalaMadrasah: 'Sulthon Sulaiman, M.Pd.I',
        nipKepalaMadrasah: '198106162005011003',
        mataPelajaran: [
          "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam", 
          "Bahasa Arab", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", 
          "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", "Bahasa Inggris", 
          "Pend. Jasmani, Olahraga, dan Kesehatan", "Informatika", "Seni Budaya & Prakarya", 
          "Mabadi' Fiqh", "Aswaja", "Bahasa Jawa"
        ]
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [newSubject, setNewSubject] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getAdminSettings();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
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
            await saveAdminSettings(settings);
            setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Gagal menyimpan: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const addSubject = () => {
        if (newSubject.trim() && !settings.mataPelajaran.includes(newSubject.trim())) {
            setSettings(prev => ({
                ...prev,
                mataPelajaran: [...prev.mataPelajaran, newSubject.trim()]
            }));
            setNewSubject('');
        }
    };

    const removeSubject = (subject: string) => {
        setSettings(prev => ({
            ...prev,
            mataPelajaran: prev.mataPelajaran.filter(s => s !== subject)
        }));
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-600">Memuat pengaturan...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Konfigurasi Umum (Export Word)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tahun Pelajaran</label>
                        <input 
                            type="text"
                            value={settings.tahunPelajaran}
                            onChange={(e) => setSettings({...settings, tahunPelajaran: e.target.value})}
                            className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div></div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kepala Madrasah</label>
                        <input 
                            type="text"
                            value={settings.kepalaMadrasah}
                            onChange={(e) => setSettings({...settings, kepalaMadrasah: e.target.value})}
                            className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">NIP Kepala Madrasah</label>
                        <input 
                            type="text"
                            value={settings.nipKepalaMadrasah}
                            onChange={(e) => setSettings({...settings, nipKepalaMadrasah: e.target.value})}
                            className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Manajemen Mata Pelajaran</h2>
                <div className="mb-6 flex gap-4">
                    <input 
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Nama mata pelajaran baru..."
                        className="flex-1 border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                    />
                    <button 
                        onClick={addSubject}
                        className="bg-teal-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition"
                    >
                        Tambah Mapel
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {settings.mataPelajaran.map(subject => (
                        <div key={subject} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-md">
                            <span className="text-sm font-medium text-slate-700 truncate mr-2">{subject}</span>
                            <button 
                                onClick={() => removeSubject(subject)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Hapus Mapel"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Konfigurasi Gemini API</h2>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Gemini API Key</label>
                    <input 
                        type="password"
                        value={settings.geminiApiKey}
                        onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                        placeholder="AIzaSy..."
                        className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                        API Key ini akan digunakan oleh seluruh pengguna aplikasi untuk men-generate perangkat ajar.
                    </p>
                </div>
            </div>

            {message && (
                <div className={\`p-4 rounded-md font-medium \${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}\`}>
                    {message.text}
                </div>
            )}
            
            <div className="flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-amber-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 transition shadow-md flex items-center"
                >
                    {saving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Menyimpan...
                        </>
                    ) : 'Simpan Semua Pengaturan'}
                </button>
            </div>
        </div>
    );
};
`;
fs.writeFileSync('components/AdminSettings.tsx', code);
