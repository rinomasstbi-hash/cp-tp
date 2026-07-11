import React, { useState } from 'react';
import { ATPData, ATPTableRow } from '../types';
import { BackIcon, SaveIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, CalendarIcon, AlertIcon } from './icons';

interface ATPEditorProps {
    initialData: ATPData;
    globalSettings: any;
    grade: string;
    getSemesterTotalWeeks: (semester: 'Ganjil' | 'Genap', grade: string) => number;
    onSave: (id: string, data: Partial<ATPData>) => Promise<void>;
    onCancel: () => void;
}

// Add a temporary unique ID for stable React keys during editing
interface ATPTableRowWithId extends ATPTableRow {
    id: string;
}

const parseJpValue = (val: string): number => {
    if (!val) return 0;
    const match = val.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
};

const ATPEditor: React.FC<ATPEditorProps> = ({ 
    initialData, 
    globalSettings, 
    grade, 
    getSemesterTotalWeeks, 
    onSave, 
    onCancel 
}) => {
    const [content, setContent] = useState<ATPTableRowWithId[]>(() =>
        initialData.content.map((row) => ({
            ...row,
            id: `atp-row-${Math.random().toString(36).substr(2, 9)}`,
        }))
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [bypassValidation, setBypassValidation] = useState(false);

    // Calculate settings-based weeks and target JPs
    const weeksGanjil = getSemesterTotalWeeks ? getSemesterTotalWeeks('Ganjil', grade) : 18;
    const weeksGenap = getSemesterTotalWeeks ? getSemesterTotalWeeks('Genap', grade) : 16;
    const jamWeekly = initialData.jamPertemuan || 2;

    const targetGanjil = weeksGanjil * jamWeekly;
    const targetGenap = weeksGenap * jamWeekly;

    // Calculate current allocations in real-time
    const allocatedGanjil = content
        .filter(row => row.semester === 'Ganjil')
        .reduce((sum, row) => sum + parseJpValue(row.alokasiWaktu), 0);
    const allocatedGenap = content
        .filter(row => row.semester === 'Genap')
        .reduce((sum, row) => sum + parseJpValue(row.alokasiWaktu), 0);

    const hasMismatch = (allocatedGanjil !== targetGanjil) || (allocatedGenap !== targetGenap);

    const handleContentChange = (id: string, field: keyof ATPTableRow, value: string | number) => {
        setContent(currentContent =>
            currentContent.map(row =>
                row.id === id ? { ...row, [field]: value } : row
            )
        );
    };

    const addRow = () => {
        const newRow: ATPTableRowWithId = {
            topikMateri: '',
            tp: '',
            kodeTp: '',
            atpSequence: 0, // Will be re-sequenced on save
            semester: 'Ganjil',
            alokasiWaktu: `${jamWeekly} JP`,
            integrasiPancaCinta: '',
            aktivitasCinta: '',
            id: `atp-row-${Math.random().toString(36).substr(2, 9)}`,
        };
        setContent([...content, newRow]);
    };

    const removeRow = (id: string) => {
        setContent(content.filter(row => row.id !== id));
    };
    
    const moveRow = (index: number, direction: 'up' | 'down') => {
        const newContent = [...content];
        if (direction === 'up' && index > 0) {
            [newContent[index - 1], newContent[index]] = [newContent[index], newContent[index - 1]];
        } else if (direction === 'down' && index < newContent.length - 1) {
            [newContent[index + 1], newContent[index]] = [newContent[index], newContent[index + 1]];
        }
        setContent(newContent);
    };

    const handleSave = async () => {
        setError('');
        
        if (content.some(row => !row.tp || !row.topikMateri || !row.kodeTp || !row.alokasiWaktu || !row.integrasiPancaCinta || !row.aktivitasCinta)) {
            setError('Semua kolom (Topik Materi, TP, Kode TP, Alokasi JP, Integrasi Panca Cinta, dan Aktivitas Cinta) harus diisi untuk setiap baris.');
            return;
        }

        // Strict validation for wild/illogical JP values
        const maxLogicalJp = Math.max(6, 2 * jamWeekly);
        for (let i = 0; i < content.length; i++) {
            const row = content[i];
            const rowJp = parseJpValue(row.alokasiWaktu);
            if (rowJp <= 0) {
                setError(`Alokasi JP pada baris ke-${i + 1} harus lebih besar dari 0 JP (Contoh format: "2 JP", "4 JP").`);
                return;
            }
            if (rowJp > maxLogicalJp) {
                setError(`Alokasi JP pada baris ke-${i + 1} (${rowJp} JP) tidak logis atau terlalu besar. Alokasi JP maksimal per TP dibatasi hingga ${maxLogicalJp} JP agar distribusi jam pelajaran seimbang dan merata.`);
                return;
            }
        }

        // Validate target JP matching
        if (hasMismatch && !bypassValidation) {
            setError(`Alokasi waktu (JP) belum seimbang dengan target RPE. Harap sesuaikan total alokasi JP atau centang persetujuan di bawah tabel untuk menyimpan.`);
            return;
        }

        setIsSaving(true);
        // Re-sequence and strip temporary ID before saving
        const finalContent = content.map(({ id, ...rest }, index) => ({
            ...rest,
            atpSequence: index + 1,
        }));

        try {
            await onSave(initialData.id, { content: finalContent });
        } catch (err: any) {
            setError(err.message || "Gagal menyimpan data ATP.");
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <button onClick={onCancel} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-semibold transition-colors">
                <BackIcon className="w-5 h-5" />
                Kembali
            </button>
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Edit Alur Tujuan Pembelajaran (ATP)</h2>
                        <p className="text-slate-500 mt-1">Mata Pelajaran: <span className="font-semibold text-teal-600">{initialData.subject}</span> | Kelas: <span className="font-semibold text-teal-600">{grade}</span></p>
                    </div>
                </div>

                {/* Tracking Target JP Panel */}
                <div className="mb-8 bg-slate-50 border border-slate-200 rounded-lg p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-indigo-600" />
                        Analisis Distribusi JP Berdasarkan Alokasi Waktu Mingguan ({jamWeekly} JP/Minggu)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ganjil */}
                        <div className="bg-white p-4 border border-slate-200 rounded-md shadow-sm">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                <span className="font-bold text-slate-700 text-sm">Semester Ganjil</span>
                                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{weeksGanjil} Minggu Efektif</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                                <div>
                                    <p className="text-slate-400 font-medium">Target Alokasi:</p>
                                    <p className="font-extrabold text-slate-800 text-base">{targetGanjil} JP</p>
                                    <span className="text-[10px] text-slate-400 font-medium">({weeksGanjil} Mgg × {jamWeekly} JP)</span>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-medium">Teralokasi Saat Ini:</p>
                                    <p className="font-extrabold text-slate-800 text-base">{allocatedGanjil} JP</p>
                                    <span className="text-[10px] text-slate-400 font-medium">(Dari tabel di bawah)</span>
                                </div>
                            </div>
                            {allocatedGanjil === targetGanjil ? (
                                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md font-semibold flex items-center gap-1.5">
                                    <span>🟢 Alokasi Sempurna! Sesuai target.</span>
                                </div>
                            ) : allocatedGanjil < targetGanjil ? (
                                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md font-semibold flex items-center gap-1.5">
                                    <span>🟡 Kurang {targetGanjil - allocatedGanjil} JP. Silakan tambahkan jam pada TP.</span>
                                </div>
                            ) : (
                                <div className="text-xs text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-md font-semibold flex items-center gap-1.5">
                                    <span>🔴 Berlebih {allocatedGanjil - targetGanjil} JP! Kurangi jam pada TP.</span>
                                </div>
                            )}
                        </div>

                        {/* Genap */}
                        <div className="bg-white p-4 border border-slate-200 rounded-md shadow-sm">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                <span className="font-bold text-slate-700 text-sm">Semester Genap</span>
                                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{weeksGenap} Minggu Efektif</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                                <div>
                                    <p className="text-slate-400 font-medium">Target Alokasi:</p>
                                    <p className="font-extrabold text-slate-800 text-base">{targetGenap} JP</p>
                                    <span className="text-[10px] text-slate-400 font-medium">({weeksGenap} Mgg × {jamWeekly} JP)</span>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-medium">Teralokasi Saat Ini:</p>
                                    <p className="font-extrabold text-slate-800 text-base">{allocatedGenap} JP</p>
                                    <span className="text-[10px] text-slate-400 font-medium">(Dari tabel di bawah)</span>
                                </div>
                            </div>
                            {allocatedGenap === targetGenap ? (
                                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md font-semibold flex items-center gap-1.5">
                                    <span>🟢 Alokasi Sempurna! Sesuai target.</span>
                                </div>
                            ) : allocatedGenap < targetGenap ? (
                                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md font-semibold flex items-center gap-1.5">
                                    <span>🟡 Kurang {targetGenap - allocatedGenap} JP. Silakan tambahkan jam pada TP.</span>
                                </div>
                            ) : (
                                <div className="text-xs text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-md font-semibold flex items-center gap-1.5">
                                    <span>🔴 Berlebih {allocatedGenap - targetGenap} JP! Kurangi jam pada TP.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-md p-3.5 font-semibold flex items-start gap-2">
                        <span className="text-sm mt-0.5">💡</span>
                        <div>
                            <span className="font-bold text-indigo-950">Aturan Kelogisan Distribusi JP:</span> Alokasi JP per TP dibatasi maksimal <span className="font-extrabold text-indigo-950">{Math.max(6, 2 * jamWeekly)} JP</span> (setara maksimal 2 minggu pertemuan). Hal ini untuk memastikan materi pelajaran tersebar dengan seimbang dan logis sepanjang tahun ajaran serta mencegah pemberian alokasi JP yang tidak masuk akal (seperti 10 JP atau lebih untuk satu TP).
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative flex gap-3 items-start">
                        <AlertIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800 font-medium">{error}</div>
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-slate-300 text-sm">
                        <thead className="bg-slate-100 text-left">
                            <tr>
                                <th className="px-2 py-2 border-b border-slate-300 w-24">Aksi</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-12 text-center">No</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-24">Kode TP</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-1/6">Topik/Materi</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-1/4">Tujuan Pembelajaran (TP)</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-28">Alokasi JP</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-24">Semester</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-1/5">Integrasi Panca Cinta</th>
                                <th className="px-2 py-2 border-b border-slate-300 w-1/5">Aktivitas Cinta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {content.map((row, index) => (
                                <tr key={row.id} className="hover:bg-slate-50">
                                    <td className="px-2 py-2 align-top border-b">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => moveRow(index, 'up')} disabled={index === 0} className="p-1 text-slate-500 hover:bg-slate-200 rounded-full disabled:opacity-30" title="Geser ke atas"><ChevronUpIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => moveRow(index, 'down')} disabled={index === content.length - 1} className="p-1 text-slate-500 hover:bg-slate-200 rounded-full disabled:opacity-30" title="Geser ke bawah"><ChevronDownIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => removeRow(row.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full" title="Hapus baris"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 align-top text-center border-b font-medium text-slate-600 pt-3">{index + 1}</td>
                                    <td className="px-2 py-2 align-top border-b"><textarea value={row.kodeTp || ''} onChange={(e) => handleContentChange(row.id, 'kodeTp', e.target.value)} rows={3} className="w-full p-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-teal-500 font-mono"></textarea></td>
                                    <td className="px-2 py-2 align-top border-b"><textarea value={row.topikMateri || ''} onChange={(e) => handleContentChange(row.id, 'topikMateri', e.target.value)} rows={3} className="w-full p-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-teal-500"></textarea></td>
                                    <td className="px-2 py-2 align-top border-b"><textarea value={row.tp || ''} onChange={(e) => handleContentChange(row.id, 'tp', e.target.value)} rows={3} className="w-full p-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-teal-500"></textarea></td>
                                    <td className="px-2 py-2 align-top border-b">
                                        <input 
                                            type="text" 
                                            value={row.alokasiWaktu || ''} 
                                            onChange={(e) => handleContentChange(row.id, 'alokasiWaktu', e.target.value)} 
                                            className="w-full p-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-teal-500 font-bold text-center" 
                                            placeholder="Contoh: 4 JP" 
                                        />
                                        <div className="text-[10px] text-slate-400 text-center mt-1 font-medium">
                                            Parsed: {parseJpValue(row.alokasiWaktu)} JP
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 align-top border-b">
                                        <select value={row.semester} onChange={(e) => handleContentChange(row.id, 'semester', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded-md text-xs font-semibold focus:ring-1 focus:ring-teal-500">
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </td>
                                    <td className="px-2 py-2 align-top border-b"><textarea value={row.integrasiPancaCinta || ''} onChange={(e) => handleContentChange(row.id, 'integrasiPancaCinta', e.target.value)} rows={3} className="w-full p-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-teal-500" placeholder="Pilar Panca Cinta (Max 1-2)"></textarea></td>
                                    <td className="px-2 py-2 align-top border-b"><textarea value={row.aktivitasCinta || ''} onChange={(e) => handleContentChange(row.id, 'aktivitasCinta', e.target.value)} rows={3} className="w-full p-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-teal-500" placeholder="Aktivitas nyata Heart, Head, Hand"></textarea></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
                    <button onClick={addRow} className="text-teal-600 hover:text-teal-800 font-bold text-sm flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-md transition-colors border border-teal-200">
                        <PlusIcon className="w-4 h-4" />
                        Tambah Baris TP
                    </button>
                    
                    <div className="text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded border">
                        Total Alokasi Waktu: <span className="text-slate-800 font-extrabold">{allocatedGanjil + allocatedGenap} JP</span>
                    </div>
                </div>

                {/* Local Mismatch Confirmation */}
                {hasMismatch && (
                    <div className="mt-8 p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg text-amber-950 text-sm flex flex-col gap-3">
                        <div className="flex gap-2 items-start">
                            <AlertIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-amber-900 font-bold text-base">Peringatan: Alokasi JP Tidak Seimbang dengan RPE</strong>
                                <p className="mt-1 font-medium">
                                    Untuk menjamin keselarasan di Program Semester (PROSEM), total JP yang dimasukkan sebaiknya tepat sama dengan target pekan efektif dikali jam mingguan:
                                </p>
                                <ul className="list-disc list-inside mt-2 space-y-1 font-bold text-amber-900">
                                    {allocatedGanjil !== targetGanjil && (
                                        <li>Semester Ganjil: Target {targetGanjil} JP, teralokasi {allocatedGanjil} JP (Selisih {targetGanjil - allocatedGanjil} JP)</li>
                                    )}
                                    {allocatedGenap !== targetGenap && (
                                        <li>Semester Genap: Target {targetGenap} JP, teralokasi {allocatedGenap} JP (Selisih {targetGenap - allocatedGenap} JP)</li>
                                    )}
                                </ul>
                                <p className="mt-2 text-xs text-amber-700">
                                    *Catatan: Menolak penyeimbangan dapat menyebabkan kolom mingguan di PROSEM kelebihan alokasi atau memiliki baris kosong di akhir.
                                </p>
                            </div>
                        </div>
                        <label className="mt-2 flex items-center gap-2.5 cursor-pointer select-none bg-amber-100 hover:bg-amber-200 p-3 rounded-md border border-amber-300 transition text-amber-900 font-bold text-sm">
                            <input 
                                type="checkbox" 
                                checked={bypassValidation} 
                                onChange={(e) => setBypassValidation(e.target.checked)} 
                                className="rounded border-amber-400 text-amber-700 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Saya memahami alokasi JP tidak seimbang dengan target RPE dan bersedia melanjutkan penyimpanan.</span>
                        </label>
                    </div>
                )}

                <div className="mt-8 border-t pt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md border transition-colors">
                        Batal
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 transition-colors">
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <SaveIcon className="w-5 h-5"/>
                                Simpan Perubahan ATP
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ATPEditor;
