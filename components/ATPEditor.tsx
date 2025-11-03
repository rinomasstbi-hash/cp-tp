
import React, { useState } from 'react';
import { ATPData, ATPTableRow } from '../types';
import { BackIcon, SaveIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

interface ATPEditorProps {
    initialData: ATPData;
    onSave: (id: string, data: Partial<ATPData>) => Promise<void>;
    onCancel: () => void;
}

const ATPEditor: React.FC<ATPEditorProps> = ({ initialData, onSave, onCancel }) => {
    const [content, setContent] = useState<ATPTableRow[]>(initialData.content);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleContentChange = (index: number, field: keyof ATPTableRow, value: string | number) => {
        const newContent = [...content];
        (newContent[index] as any)[field] = value;
        setContent(newContent);
    };

    const addRow = () => {
        const newRow: ATPTableRow = {
            cp: '',
            topikMateri: '',
            tp: '',
            atpSequence: content.length + 1, // Will be re-sequenced on save
            semester: 'Ganjil',
        };
        setContent([...content, newRow]);
    };

    const removeRow = (index: number) => {
        setContent(content.filter((_, i) => i !== index));
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
        if (content.some(row => !row.cp || !row.tp || !row.topikMateri)) {
            setError('Semua kolom (CP, Topik Materi, TP) harus diisi untuk setiap baris.');
            return;
        }

        setIsSaving(true);
        // Re-sequence before saving
        const finalContent = content.map((row, index) => ({
            ...row,
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
            <button onClick={onCancel} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-semibold">
                <BackIcon className="w-5 h-5" />
                Kembali
            </button>
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Edit Alur Tujuan Pembelajaran (ATP)</h2>
                <p className="text-slate-500 mb-6">Mata Pelajaran: <span className="font-semibold text-teal-600">{initialData.subject}</span></p>

                {error && <p className="text-red-500 mb-4 text-center p-3 bg-red-50 border border-red-200 rounded-md">{error}</p>}
                
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-slate-300 text-sm">
                        <thead className="bg-slate-100 text-left">
                            <tr>
                                <th className="px-3 py-2 border-b border-slate-300 w-24">Aksi</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-1/4">Capaian Pembelajaran (CP)</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-1/6">Topik Materi</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-1/3">Tujuan Pembelajaran (TP)</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-28">Semester</th>
                            </tr>
                        </thead>
                        <tbody>
                            {content.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 align-top border-b">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => moveRow(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                                            <button onClick={() => moveRow(index, 'down')} disabled={index === content.length - 1} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
                                            <button onClick={() => removeRow(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 align-top border-b"><textarea value={row.cp} onChange={(e) => handleContentChange(index, 'cp', e.target.value)} rows={4} className="w-full p-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500"></textarea></td>
                                    <td className="px-3 py-2 align-top border-b"><textarea value={row.topikMateri} onChange={(e) => handleContentChange(index, 'topikMateri', e.target.value)} rows={4} className="w-full p-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500"></textarea></td>
                                    <td className="px-3 py-2 align-top border-b"><textarea value={row.tp} onChange={(e) => handleContentChange(index, 'tp', e.target.value)} rows={4} className="w-full p-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500"></textarea></td>
                                    <td className="px-3 py-2 align-top border-b">
                                        <select value={row.semester} onChange={(e) => handleContentChange(index, 'semester', e.target.value)} className="w-full p-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500">
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button onClick={addRow} className="mt-4 text-teal-600 hover:text-teal-800 font-semibold text-sm flex items-center gap-1">
                    <PlusIcon className="w-4 h-4" />
                    Tambah Baris
                </button>

                <div className="mt-8 border-t pt-6 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400">
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <SaveIcon className="w-5 h-5"/>
                                Perbarui ATP
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ATPEditor;
