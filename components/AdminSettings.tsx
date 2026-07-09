import React, { useState, useEffect } from 'react';
import { getAdminSettings, saveAdminSettings, AdminSettings as SettingsType } from '../services/dbService';

interface AdminSettingsProps {
  onSave?: () => void;
}

const DEFAULT_GANJIL_78 = { 'Juli': [1, 2, 3, 4], 'Agustus': [1, 2, 3, 4], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4], 'Desember': [1, 2] };
const DEFAULT_GENAP_78 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [1, 2, 3, 4], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 3, 4], 'Juni': [1, 2] };
const DEFAULT_GANJIL_9 = { 'Juli': [1, 2, 3], 'Agustus': [1, 2, 3, 4], 'September': [1, 2, 3], 'Oktober': [1, 2, 3], 'November': [1, 2, 3], 'Desember': [1] };
const DEFAULT_GENAP_9 = { 'Januari': [1, 2, 3], 'Februari': [1, 2, 3], 'Maret': [1, 2, 3, 4], 'April': [1, 2, 3], 'Mei': [1, 2, 3], 'Juni': [1] };

const sanitizeWeeks = (val: any, defaultVal: Record<string, number[]>): Record<string, number[]> => {
    if (!val) return defaultVal;
    const sanitized: Record<string, number[]> = {};
    Object.keys(defaultVal).forEach(month => {
        const value = val[month];
        if (Array.isArray(value)) {
            sanitized[month] = value.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5).sort((a, b) => a - b);
        } else if (typeof value === 'number') {
            sanitized[month] = Array.from({ length: value }, (_, i) => i + 1);
        } else {
            sanitized[month] = defaultVal[month];
        }
    });
    return sanitized;
};

const getSelectedWeeks = (weeksObj: any, month: string, defaultArray: number[]): number[] => {
    if (!weeksObj) return defaultArray;
    const val = weeksObj[month];
    if (Array.isArray(val)) {
        return val;
    } else if (typeof val === 'number') {
        return Array.from({ length: val }, (_, i) => i + 1);
    }
    return defaultArray;
};

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onSave }) => {
    const [settings, setSettings] = useState<SettingsType>({
        geminiApiKey: '',
        tahunPelajaran: '2025/2026',
        namaAplikasi: 'Asisten Guru (AGRU)',
        kepalaMadrasah: 'Sulthon Sulaiman, M.Pd.I',
        nipKepalaMadrasah: '198106162005011003',
        mataPelajaran: [
          "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam", 
          "Bahasa Arab", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", 
          "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", "Bahasa Inggris", 
          "Pend. Jasmani, Olahraga, dan Kesehatan", "Informatika", "Seni Budaya & Prakarya", 
          "Mabadi' Fiqh", "Aswaja", "Bahasa Jawa"
        ],
        weeksGanjil78: DEFAULT_GANJIL_78,
        weeksGenap78: DEFAULT_GENAP_78,
        weeksGanjil9: DEFAULT_GANJIL_9,
        weeksGenap9: DEFAULT_GENAP_9,
    });
    const [weeksTab, setWeeksTab] = useState<'78' | '9'>('78');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [newSubject, setNewSubject] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getAdminSettings();
                if (data) {
                    setSettings(prev => ({ 
                        ...prev, 
                        ...data,
                        weeksGanjil78: sanitizeWeeks(data.weeksGanjil78, DEFAULT_GANJIL_78),
                        weeksGenap78: sanitizeWeeks(data.weeksGenap78, DEFAULT_GENAP_78),
                        weeksGanjil9: sanitizeWeeks(data.weeksGanjil9, DEFAULT_GANJIL_9),
                        weeksGenap9: sanitizeWeeks(data.weeksGenap9, DEFAULT_GENAP_9),
                    }));
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
            if (onSave) onSave();
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

    const toggleWeekSelection = (gradeGroup: '78' | '9', semester: 'Ganjil' | 'Genap', month: string, weekNum: number) => {
        setSettings(prev => {
            const key = gradeGroup === '78' 
                ? (semester === 'Ganjil' ? 'weeksGanjil78' : 'weeksGenap78')
                : (semester === 'Ganjil' ? 'weeksGanjil9' : 'weeksGenap9');
            
            const currentWeeks = prev[key] || {};
            const currentVal = currentWeeks[month];
            
            let currentList: number[] = [];
            if (Array.isArray(currentVal)) {
                currentList = [...currentVal];
            } else if (typeof currentVal === 'number') {
                currentList = Array.from({ length: currentVal }, (_, i) => i + 1);
            } else {
                const defaultsMap = {
                    '78-Ganjil': DEFAULT_GANJIL_78,
                    '78-Genap': DEFAULT_GENAP_78,
                    '9-Ganjil': DEFAULT_GANJIL_9,
                    '9-Genap': DEFAULT_GENAP_9
                };
                const lookupKey = `${gradeGroup}-${semester}` as keyof typeof defaultsMap;
                currentList = (defaultsMap[lookupKey] as any)[month] || [1, 2, 3, 4];
            }
            
            let newList: number[];
            if (currentList.includes(weekNum)) {
                newList = currentList.filter(w => w !== weekNum);
            } else {
                newList = [...currentList, weekNum].sort((a, b) => a - b);
            }
            
            return {
                ...prev,
                [key]: {
                    ...currentWeeks,
                    [month]: newList
                }
            };
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-600">Memuat pengaturan...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Konfigurasi Umum</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Aplikasi</label>
                        <input 
                            type="text"
                            value={settings.namaAplikasi || 'Asisten Guru (AGRU)'}
                            onChange={(e) => setSettings({...settings, namaAplikasi: e.target.value})}
                            className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tahun Pelajaran</label>
                        <input 
                            type="text"
                            value={settings.tahunPelajaran}
                            onChange={(e) => setSettings({...settings, tahunPelajaran: e.target.value})}
                            className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
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
                <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input 
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Nama mata pelajaran baru..."
                        className="w-full sm:flex-1 border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                    />
                    <button 
                        onClick={addSubject}
                        className="bg-teal-600 text-white w-full sm:w-auto px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition"
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Manajemen Minggu Efektif</h2>
                        <p className="text-sm text-slate-500 mt-1">Sesuaikan jumlah minggu efektif per bulan untuk masing-masing tingkatan kelas.</p>
                    </div>
                    {/* Grade Selector Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setWeeksTab('78')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${weeksTab === '78' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Kelas 7 & 8
                        </button>
                        <button
                            type="button"
                            onClick={() => setWeeksTab('9')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${weeksTab === '9' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Kelas 9
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Semester Ganjil Column */}
                    <div>
                        <div className="flex justify-between items-center bg-teal-50 border border-teal-100 px-4 py-3 rounded-lg mb-4">
                            <h3 className="font-bold text-teal-900">Semester Ganjil</h3>
                            <span className="text-xs font-semibold bg-teal-600 text-white px-2.5 py-1 rounded-full">
                                Total: {['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].reduce((sum, m) => {
                                    const weeksObj = weeksTab === '78' ? (settings.weeksGanjil78 || {}) : (settings.weeksGanjil9 || {});
                                    const defaultVal = weeksTab === '78' ? DEFAULT_GANJIL_78[m as keyof typeof DEFAULT_GANJIL_78] : DEFAULT_GANJIL_9[m as keyof typeof DEFAULT_GANJIL_9];
                                    const arr = getSelectedWeeks(weeksObj, m, defaultVal);
                                    return sum + arr.length;
                                }, 0)} Minggu
                            </span>
                        </div>
                        <div className="space-y-3.5">
                            {['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => {
                                const weeksObj = weeksTab === '78' ? (settings.weeksGanjil78 || {}) : (settings.weeksGanjil9 || {});
                                const defaultVal = weeksTab === '78' ? DEFAULT_GANJIL_78[m as keyof typeof DEFAULT_GANJIL_78] : DEFAULT_GANJIL_9[m as keyof typeof DEFAULT_GANJIL_9];
                                const activeWeeks = getSelectedWeeks(weeksObj, m, defaultVal);
                                return (
                                    <div key={m} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-lg hover:border-slate-300 transition shadow-sm gap-4">
                                        <div>
                                            <span className="font-bold text-slate-800 text-base">{m}</span>
                                            <span className="text-xs text-slate-500 block">Semester Ganjil ({activeWeeks.length} minggu efektif)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                                            {[1, 2, 3, 4, 5].map(weekNum => {
                                                const isSelected = activeWeeks.includes(weekNum);
                                                return (
                                                    <button
                                                        key={weekNum}
                                                        type="button"
                                                        onClick={() => toggleWeekSelection(weeksTab, 'Ganjil', m, weekNum)}
                                                        className={`w-8 h-8 rounded font-bold text-sm transition-all flex items-center justify-center active:scale-90 select-none ${
                                                            isSelected 
                                                                ? 'bg-teal-600 text-white shadow-sm' 
                                                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                                                        }`}
                                                        title={`Minggu ke-${weekNum}`}
                                                    >
                                                        {weekNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Semester Genap Column */}
                    <div>
                        <div className="flex justify-between items-center bg-teal-50 border border-teal-100 px-4 py-3 rounded-lg mb-4">
                            <h3 className="font-bold text-teal-900">Semester Genap</h3>
                            <span className="text-xs font-semibold bg-teal-600 text-white px-2.5 py-1 rounded-full">
                                Total: {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'].reduce((sum, m) => {
                                    const weeksObj = weeksTab === '78' ? (settings.weeksGenap78 || {}) : (settings.weeksGenap9 || {});
                                    const defaultVal = weeksTab === '78' ? DEFAULT_GENAP_78[m as keyof typeof DEFAULT_GENAP_78] : DEFAULT_GENAP_9[m as keyof typeof DEFAULT_GENAP_9];
                                    const arr = getSelectedWeeks(weeksObj, m, defaultVal);
                                    return sum + arr.length;
                                }, 0)} Minggu
                            </span>
                        </div>
                        <div className="space-y-3.5">
                            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'].map(m => {
                                const weeksObj = weeksTab === '78' ? (settings.weeksGenap78 || {}) : (settings.weeksGenap9 || {});
                                const defaultVal = weeksTab === '78' ? DEFAULT_GENAP_78[m as keyof typeof DEFAULT_GENAP_78] : DEFAULT_GENAP_9[m as keyof typeof DEFAULT_GENAP_9];
                                const activeWeeks = getSelectedWeeks(weeksObj, m, defaultVal);
                                return (
                                    <div key={m} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-lg hover:border-slate-300 transition shadow-sm gap-4">
                                        <div>
                                            <span className="font-bold text-slate-800 text-base">{m}</span>
                                            <span className="text-xs text-slate-500 block">Semester Genap ({activeWeeks.length} minggu efektif)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                                            {[1, 2, 3, 4, 5].map(weekNum => {
                                                const isSelected = activeWeeks.includes(weekNum);
                                                return (
                                                    <button
                                                        key={weekNum}
                                                        type="button"
                                                        onClick={() => toggleWeekSelection(weeksTab, 'Genap', m, weekNum)}
                                                        className={`w-8 h-8 rounded font-bold text-sm transition-all flex items-center justify-center active:scale-90 select-none ${
                                                            isSelected 
                                                                ? 'bg-teal-600 text-white shadow-sm' 
                                                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                                                        }`}
                                                        title={`Minggu ke-${weekNum}`}
                                                    >
                                                        {weekNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Recommendation indicator */}
                <div className="mt-6 p-4 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 text-sm">
                    {weeksTab === '78' ? (
                        <span>💡 <strong>Rekomendasi Kelas 7 & 8:</strong> Standar total minggu efektif berkisar antara <strong>18 - 20 minggu</strong> per semester (total 36 - 40 minggu setahun).</span>
                    ) : (
                        <span>💡 <strong>Rekomendasi Kelas 9:</strong> Standar total minggu efektif berkisar antara <strong>16 - 17 minggu</strong> per semester (total 32 - 34 minggu setahun).</span>
                    )}
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
                <div className={`p-4 rounded-md font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
