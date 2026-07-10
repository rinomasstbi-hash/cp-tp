import React, { useState, useEffect } from 'react';
import { getAdminSettings, saveAdminSettings, AdminSettings as SettingsType } from '../services/dbService';
import { ApiKeyItem } from '../types';

interface AdminSettingsProps {
  onSave?: () => void;
}

const DEFAULT_GANJIL_78 = { 'Juli': [4, 5], 'Agustus': [1, 2, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [] };
const DEFAULT_GENAP_78 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 4, 5], 'Juni': [] };
const DEFAULT_GANJIL_9 = { 'Juli': [4, 5], 'Agustus': [1, 2, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [] };
const DEFAULT_GENAP_9 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 4, 5], 'Juni': [] };

const MONTH_MAX_WEEKS: Record<string, number> = {
  'Juli': 5,
  'Agustus': 5,
  'September': 5,
  'Oktober': 5,
  'November': 5,
  'Desember': 5,
  'Januari': 5,
  'Februari': 5,
  'Maret': 5,
  'April': 5,
  'Mei': 5,
  'Juni': 5
};

const DEFAULT_INACTIVE_LABELS_GANJIL_78: Record<string, Record<string, string>> = {
  'Juli': { '1': 'LS2', '2': 'LS2', '3': 'MTM' },
  'Agustus': { '3': 'PHBN' },
  'Desember': { '1': 'SAS', '2': 'UP', '3': 'LS1', '4': 'LS1' }
};

const DEFAULT_INACTIVE_LABELS_GENAP_78: Record<string, Record<string, string>> = {
  'Maret': { '1': 'LHR', '2': 'LHR', '3': 'LHR' },
  'Mei': { '3': 'LHR' },
  'Juni': { '1': 'SAS', '2': 'UP', '3': 'LS2', '4': 'LS2' }
};

const DEFAULT_INACTIVE_LABELS_GANJIL_9: Record<string, Record<string, string>> = {
  'Juli': { '1': 'LS2', '2': 'LS2', '3': 'MTM' },
  'Agustus': { '3': 'PHBN' },
  'Desember': { '1': 'SAS', '2': 'UP', '3': 'LS1', '4': 'LS1' }
};

const DEFAULT_INACTIVE_LABELS_GENAP_9: Record<string, Record<string, string>> = {
  'Maret': { '1': 'LHR', '2': 'LHR', '3': 'LHR' },
  'Mei': { '3': 'LHR' },
  'Juni': { '1': 'SAS', '2': 'UP', '3': 'LS2', '4': 'LS2' }
};

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

const sanitizeLabels = (val: any): Record<string, Record<string, string>> => {
    if (!val) return {};
    const sanitized: Record<string, Record<string, string>> = {};
    Object.keys(val).forEach(month => {
        sanitized[month] = {};
        if (val[month] && typeof val[month] === 'object') {
            Object.keys(val[month]).forEach(week => {
                if (typeof val[month][week] === 'string') {
                    sanitized[month][week] = val[month][week];
                }
            });
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
    const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

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
                        weekLabelsGanjil78: sanitizeLabels(data.weekLabelsGanjil78),
                        weekLabelsGenap78: sanitizeLabels(data.weekLabelsGenap78),
                        weekLabelsGanjil9: sanitizeLabels(data.weekLabelsGanjil9),
                        weekLabelsGenap9: sanitizeLabels(data.weekLabelsGenap9),
                    }));
                    if (Array.isArray(data.apiKeys)) {
                        setApiKeys(data.apiKeys);
                    }
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

    const handleAddApiKey = () => {
        if (!newKeyValue.trim()) return;
        const newItem: ApiKeyItem = {
            id: 'key_' + Math.random().toString(36).substr(2, 9),
            name: newKeyName.trim() || `API Key Cadangan ${apiKeys.length + 1}`,
            key: newKeyValue.trim(),
            status: 'Aktif'
        };
        const updated = [...apiKeys, newItem];
        setApiKeys(updated);
        setSettings(prev => ({ ...prev, apiKeys: updated }));
        setNewKeyName('');
        setNewKeyValue('');
    };

    const handleDeleteApiKey = (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus API Key ini dari pool?')) return;
        const updated = apiKeys.filter(k => k.id !== id);
        setApiKeys(updated);
        setSettings(prev => ({ ...prev, apiKeys: updated }));
    };

    const handleToggleApiKeyStatus = (id: string, newStatus: 'Aktif' | 'Limit Tercapai' | 'Error') => {
        const updated = apiKeys.map(k => {
            if (k.id === id) {
                return { ...k, status: newStatus, errorMessage: newStatus === 'Aktif' ? undefined : k.errorMessage };
            }
            return k;
        });
        setApiKeys(updated);
        setSettings(prev => ({ ...prev, apiKeys: updated }));
    };

    const toggleKeyVisibility = (id: string) => {
        setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatLastUsed = (timestamp?: number) => {
        if (!timestamp) return '-';
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Baru saja';
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} menit yang lalu`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} jam yang lalu`;
        return new Date(timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
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

    const handleWeekLabelChange = (gradeGroup: '78' | '9', semester: 'Ganjil' | 'Genap', month: string, weekNum: number, value: string) => {
        setSettings(prev => {
            const key = gradeGroup === '78' 
                ? (semester === 'Ganjil' ? 'weekLabelsGanjil78' : 'weekLabelsGenap78')
                : (semester === 'Ganjil' ? 'weekLabelsGanjil9' : 'weekLabelsGenap9');
            
            const currentLabels = prev[key] || {};
            const monthLabels = currentLabels[month] || {};
            
            return {
                ...prev,
                [key]: {
                    ...currentLabels,
                    [month]: {
                        ...monthLabels,
                        [weekNum]: value
                    }
                }
            };
        });
    };

    const getDefaultInactiveLabel = (semester: 'Ganjil' | 'Genap', month: string, weekNum: number): string => {
        const map = semester === 'Ganjil' ? DEFAULT_INACTIVE_LABELS_GANJIL_78 : DEFAULT_INACTIVE_LABELS_GENAP_78;
        return (map[month] && map[month][String(weekNum)]) || '';
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
                                const maxWeeks = MONTH_MAX_WEEKS[m] || 5;
                                const weekNumbers = Array.from({ length: maxWeeks }, (_, i) => i + 1);
                                const inactiveWeeks = weekNumbers.filter(w => !activeWeeks.includes(w));
                                
                                return (
                                    <div key={m} className="flex flex-col bg-slate-50 border border-slate-200 p-4 rounded-lg hover:border-slate-300 transition shadow-sm gap-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <span className="font-bold text-slate-800 text-base">{m}</span>
                                                <span className="text-xs text-slate-500 block">Semester Ganjil ({activeWeeks.length} minggu efektif)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm self-start sm:self-auto">
                                                {weekNumbers.map(weekNum => {
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
                                        {inactiveWeeks.length > 0 && (
                                            <div className="border-t border-slate-200/60 pt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-xs items-center">
                                                <span className="text-slate-500 font-medium">Kode Tidak Efektif:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {inactiveWeeks.map(w => {
                                                        const labelKey = weeksTab === '78' ? 'weekLabelsGanjil78' : 'weekLabelsGanjil9';
                                                        const currentLabels = settings[labelKey] || {};
                                                        const monthLabels = currentLabels[m] || {};
                                                        const labelVal = monthLabels[w] || '';
                                                        return (
                                                            <div key={w} className="flex items-center gap-1">
                                                                <span className="text-slate-600 font-semibold bg-slate-200/50 px-1 py-0.5 rounded">M{w}</span>
                                                                <input 
                                                                    type="text"
                                                                    value={labelVal}
                                                                    onChange={(e) => handleWeekLabelChange(weeksTab, 'Ganjil', m, w, e.target.value)}
                                                                    placeholder={getDefaultInactiveLabel('Ganjil', m, w) || 'Kode'}
                                                                    className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center font-bold text-xs uppercase text-teal-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
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
                                const maxWeeks = MONTH_MAX_WEEKS[m] || 5;
                                const weekNumbers = Array.from({ length: maxWeeks }, (_, i) => i + 1);
                                const inactiveWeeks = weekNumbers.filter(w => !activeWeeks.includes(w));
                                
                                return (
                                    <div key={m} className="flex flex-col bg-slate-50 border border-slate-200 p-4 rounded-lg hover:border-slate-300 transition shadow-sm gap-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <span className="font-bold text-slate-800 text-base">{m}</span>
                                                <span className="text-xs text-slate-500 block">Semester Genap ({activeWeeks.length} minggu efektif)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm self-start sm:self-auto">
                                                {weekNumbers.map(weekNum => {
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
                                        {inactiveWeeks.length > 0 && (
                                            <div className="border-t border-slate-200/60 pt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-xs items-center">
                                                <span className="text-slate-500 font-medium">Kode Tidak Efektif:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {inactiveWeeks.map(w => {
                                                        const labelKey = weeksTab === '78' ? 'weekLabelsGenap78' : 'weekLabelsGenap9';
                                                        const currentLabels = settings[labelKey] || {};
                                                        const monthLabels = currentLabels[m] || {};
                                                        const labelVal = monthLabels[w] || '';
                                                        return (
                                                            <div key={w} className="flex items-center gap-1">
                                                                <span className="text-slate-600 font-semibold bg-slate-200/50 px-1 py-0.5 rounded">M{w}</span>
                                                                <input 
                                                                    type="text"
                                                                    value={labelVal}
                                                                    onChange={(e) => handleWeekLabelChange(weeksTab, 'Genap', m, w, e.target.value)}
                                                                    placeholder={getDefaultInactiveLabel('Genap', m, w) || 'Kode'}
                                                                    className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center font-bold text-xs uppercase text-teal-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
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

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="border-b pb-4">
                    <h2 className="text-xl font-bold text-slate-800">Konfigurasi & Pool Gemini API</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Atur API Key utama dan ketersediaan API Key cadangan. Sistem akan memutar penggunaan key secara otomatis jika salah satu key cadangan mendeteksi batas limit harian tercapai.
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-sm flex gap-3">
                    <span className="text-lg">⚙️</span>
                    <div>
                        <strong className="block mb-0.5">Sistem Rotasi API Key Otomatis Aktif</strong>
                        Saat proses men-generate modul ajar atau perangkat ajar, apabila API Key yang sedang digunakan menyentuh batas limit harian (<code className="bg-blue-100 px-1 rounded text-xs font-mono">Quota Exceeded / 429</code>), sistem akan otomatis memperbarui statusnya menjadi <span className="font-semibold text-amber-700">"Limit Tercapai"</span> di database dan memindahkan pemrosesan ke API Key cadangan berikutnya yang berstatus <span className="font-semibold text-green-700">"Aktif"</span> secara real-time tanpa mengganggu kenyamanan pengguna.
                    </div>
                </div>

                {/* Primary API Key */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Gemini API Key Utama (Default Fallback)</label>
                    <input 
                        type="password"
                        value={settings.geminiApiKey}
                        onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                        placeholder="AIzaSy..."
                        className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                        API Key default yang digunakan sebagai prioritas terakhir apabila pool API Key cadangan kosong atau seluruhnya tidak aktif.
                    </p>
                </div>

                <div className="border-t pt-6 space-y-4">
                    <h3 className="font-bold text-slate-800 text-lg">Pool API Key Cadangan</h3>
                    
                    {/* Add Key Form */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <span className="text-sm font-semibold text-slate-700 block">Tambah API Key Baru ke Pool</span>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input 
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="Nama/Label Key (misal: Akun Cadangan B)"
                                className="flex-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                            />
                            <input 
                                type="text"
                                value={newKeyValue}
                                onChange={(e) => setNewKeyValue(e.target.value)}
                                placeholder="API Key (AIzaSy...)"
                                className="flex-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-teal-500 focus:border-teal-500 font-mono"
                            />
                            <button
                                type="button"
                                onClick={handleAddApiKey}
                                disabled={!newKeyValue.trim()}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-5 py-2 rounded-md transition disabled:opacity-50"
                            >
                                + Tambahkan ke Pool
                            </button>
                        </div>
                    </div>

                    {/* Keys Table */}
                    {apiKeys.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg font-medium">
                            Belum ada API Key cadangan dalam pool. Silakan tambahkan kunci di atas untuk mengaktifkan fitur rotasi otomatis.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                        <th className="p-3">Nama / Label</th>
                                        <th className="p-3">API Key</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Terakhir Digunakan</th>
                                        <th className="p-3">Keterangan / Error</th>
                                        <th className="p-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-700">
                                    {apiKeys.map((k) => {
                                        const isVisible = visibleKeys[k.id];
                                        return (
                                            <tr key={k.id} className="hover:bg-slate-50 transition">
                                                <td className="p-3 font-medium text-slate-800">{k.name}</td>
                                                <td className="p-3 font-mono text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            {isVisible 
                                                                ? k.key 
                                                                : `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}`}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleKeyVisibility(k.id)}
                                                            className="text-slate-400 hover:text-slate-600 transition"
                                                            title={isVisible ? "Sembunyikan" : "Tampilkan"}
                                                        >
                                                            {isVisible ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                                        k.status === 'Aktif' 
                                                            ? 'bg-green-100 text-green-800 border-green-200' 
                                                            : k.status === 'Limit Tercapai'
                                                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                                : 'bg-red-100 text-red-800 border-red-200'
                                                    }`}>
                                                        {k.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-xs text-slate-500 font-medium">{formatLastUsed(k.lastUsed)}</td>
                                                <td className="p-3 text-xs text-slate-500 max-w-xs truncate" title={k.errorMessage || ''}>
                                                    {k.errorMessage || '-'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {k.status !== 'Aktif' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleApiKeyStatus(k.id, 'Aktif')}
                                                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded font-semibold transition"
                                                                title="Reset status menjadi Aktif"
                                                            >
                                                                Aktifkan Kembali
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteApiKey(k.id)}
                                                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-md transition"
                                                            title="Hapus Key"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
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
