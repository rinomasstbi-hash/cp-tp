

import React, { useState, useEffect } from 'react';
import { TPData, TPGroup } from '../types';
import { generateTPs } from '../services/geminiService';
import { BackIcon, SaveIcon, SparklesIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

interface TPEditorProps {
  mode: 'create' | 'edit';
  initialData?: TPData;
  subject: string;
  onSave: (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onCancel: () => void;
}

const TPEditor: React.FC<TPEditorProps> = ({ mode, initialData, subject, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    grade: initialData?.grade || '7',
    creatorEmail: initialData?.creatorEmail || '',
    creatorName: initialData?.creatorName || '',
    cpSourceVersion: initialData?.cpSourceVersion || '',
    additionalNotes: initialData?.additionalNotes || '',
  });
  
  const [cpElements, setCpElements] = useState<{ element: string; cp: string }[]>(
    initialData?.cpElements && initialData.cpElements.length > 0
      ? initialData.cpElements
      : [{ element: '', cp: '' }]
  );

  const [tpGroups, setTpGroups] = useState<TPGroup[]>(initialData?.tpGroups || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCpElementChange = (index: number, field: 'element' | 'cp', value: string) => {
    const newItems = [...cpElements];
    newItems[index][field] = value;
    setCpElements(newItems);
  };

  const addCpElementRow = () => {
    setCpElements([...cpElements, { element: '', cp: '' }]);
  };

  const removeCpElementRow = (index: number) => {
    if (cpElements.length > 1) {
      setCpElements(cpElements.filter((_, i) => i !== index));
    }
  };

  // --- Handlers for TP Groups & Sub-Materi Groups ---
  const handleGroupChange = (groupIndex: number, field: 'semester' | 'materi', value: string) => {
    const newGroups = [...tpGroups];
    newGroups[groupIndex][field] = value as any;
    setTpGroups(newGroups);
  };
  
  const handleSubMateriChange = (groupIndex: number, subIndex: number, value: string) => {
     const newGroups = [...tpGroups];
     newGroups[groupIndex].subMateriGroups[subIndex].subMateri = value;
     setTpGroups(newGroups);
  }

  const handleTpChange = (groupIndex: number, subIndex: number, tpIndex: number, value: string) => {
    const newGroups = [...tpGroups];
    newGroups[groupIndex].subMateriGroups[subIndex].tps[tpIndex] = value;
    setTpGroups(newGroups);
  };
  
  const addTpField = (groupIndex: number, subIndex: number) => {
    const newGroups = [...tpGroups];
    newGroups[groupIndex].subMateriGroups[subIndex].tps.push('');
    setTpGroups(newGroups);
  };

  const removeTpField = (groupIndex: number, subIndex: number, tpIndex: number) => {
    const newGroups = [...tpGroups];
    newGroups[groupIndex].subMateriGroups[subIndex].tps = newGroups[groupIndex].subMateriGroups[subIndex].tps.filter((_, i) => i !== tpIndex);
    setTpGroups(newGroups);
  };

  const addSubMateriGroup = (groupIndex: number) => {
    const newGroups = [...tpGroups];
    newGroups[groupIndex].subMateriGroups.push({ subMateri: '', tps: [''] });
    setTpGroups(newGroups);
  };

  const removeSubMateriGroup = (groupIndex: number, subIndex: number) => {
    const newGroups = [...tpGroups];
    newGroups[groupIndex].subMateriGroups = newGroups[groupIndex].subMateriGroups.filter((_, i) => i !== subIndex);
    setTpGroups(newGroups);
  };

  const addTpGroup = () => {
    setTpGroups([...tpGroups, { semester: 'Ganjil', materi: '', subMateriGroups: [{ subMateri: '', tps: ['']}] }]);
  };

  const removeTpGroup = (groupIndex: number) => {
    setTpGroups(tpGroups.filter((_, i) => i !== groupIndex));
  };
  
  const handleReorderTpGroup = (index: number, direction: 'up' | 'down') => {
    const newGroups = [...tpGroups];
    if (direction === 'up' && index > 0) {
      // Swap with the element before
      [newGroups[index - 1], newGroups[index]] = [newGroups[index], newGroups[index - 1]];
    } else if (direction === 'down' && index < newGroups.length - 1) {
      // Swap with the element after
      [newGroups[index + 1], newGroups[index]] = [newGroups[index], newGroups[index + 1]];
    }
    setTpGroups(newGroups);
  };
  // --- End of Handlers ---

  const handleGenerate = async () => {
    if (cpElements.some(item => !item.cp || !item.element)) {
      setError('Setiap baris harus memiliki Elemen dan Capaian Pembelajaran (CP) yang diisi.');
      return;
    }
    setError('');
    setIsGenerating(true);
    setTpGroups([]);

    try {
      const generatedData = await generateTPs({ ...formData, cpElements });
      setTpGroups(generatedData);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat generate TP.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSave = async () => {
    if (!formData.creatorEmail || !formData.creatorName) {
      setError('Email dan Nama Guru pembuat harus diisi untuk menyimpan.');
      return;
    }
    if (tpGroups.length === 0 || tpGroups.every(g => g.subMateriGroups.length === 0)) {
        setError('Harus ada setidaknya satu Materi & Sub-Materi untuk disimpan.');
        return;
    }
    if (cpElements.some(item => !item.cp || !item.element)) {
        setError('Setiap baris Elemen dan CP harus diisi.');
        return;
    }
    if (!formData.additionalNotes.trim()) {
      setError('Urutan bab/materi semester ganjil dan genap wajib diisi.');
      return;
    }

    setError('');
    setIsSaving(true);
    
    const finalData = {
        subject,
        ...formData,
        cpElements,
        tpGroups,
    };

    try {
        await onSave(finalData);
    } catch(err: any) {
        setError(err.message || "Gagal menyimpan data.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={onCancel} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-semibold">
          <BackIcon className="w-5 h-5" />
          Kembali
        </button>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {mode === 'create' ? 'Buat Tujuan Pembelajaran Baru' : 'Edit Tujuan Pembelajaran'}
          </h2>
          <p className="text-slate-500 mb-6">Mata Pelajaran: <span className="font-semibold text-teal-600">{subject}</span></p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="creatorName" className="block text-sm font-medium text-slate-700 mb-1">Nama Guru</label>
              <input type="text" name="creatorName" id="creatorName" value={formData.creatorName} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Masukkan nama lengkap Anda" />
            </div>
            <div>
              <label htmlFor="creatorEmail" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" name="creatorEmail" id="creatorEmail" value={formData.creatorEmail} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Masukkan email aktif" />
            </div>
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
              <select name="grade" id="grade" value={formData.grade} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
            <div>
              <label htmlFor="cpSourceVersion" className="block text-sm font-medium text-slate-700 mb-1">Versi Sumber CP</label>
              <input type="text" name="cpSourceVersion" id="cpSourceVersion" value={formData.cpSourceVersion} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Cth: KMA No. 347 Tahun 2022" />
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-2 border-b pb-2">Detail Capaian Pembelajaran</h3>
            {cpElements.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-slate-50 relative">
                <div className="col-span-12 md:col-span-5">
                  <label htmlFor={`element-${index}`} className="block text-sm font-medium text-slate-700 mb-1">Elemen / Domain</label>
                  <textarea id={`element-${index}`} value={item.element} onChange={(e) => handleCpElementChange(index, 'element', e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Contoh: Bilangan"></textarea>
                </div>
                <div className="col-span-12 md:col-span-7">
                  <label htmlFor={`cp-${index}`} className="block text-sm font-medium text-slate-700 mb-1">Capaian Pembelajaran (CP)</label>
                  <textarea id={`cp-${index}`} value={item.cp} onChange={(e) => handleCpElementChange(index, 'cp', e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Masukkan CP yang sesuai..."></textarea>
                </div>
                {cpElements.length > 1 && (
                    <div className="absolute top-2 right-2">
                        <button onClick={() => removeCpElementRow(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full">
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </div>
                )}
              </div>
            ))}
             <button onClick={addCpElementRow} className="text-teal-600 hover:text-teal-800 font-semibold text-sm flex items-center gap-1">
              <PlusIcon className="w-4 h-4" />
              Tambah Baris Elemen & CP
            </button>
          </div>
          
           <div>
            <label htmlFor="additionalNotes" className="block text-sm font-medium text-slate-700 mb-1">Tambahkan urutan bab/materi semester ganjil dan genap</label>
            <textarea
              name="additionalNotes"
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              placeholder="Tuliskan urutan materi yang Anda inginkan, dipisahkan per semester. Contoh:&#10;Semester Ganjil: Bilangan, Aljabar, Geometri.&#10;Semester Genap: Statistika, Peluang.">
            </textarea>
          </div>
          
          <button onClick={handleGenerate} disabled={isGenerating || isSaving} className="mt-6 w-full flex justify-center items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400">
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menghasilkan...</span>
              </>
            ) : (
                <>
                <SparklesIcon className="w-5 h-5"/>
                Hasilkan TP dengan AI
                </>
            )}
          </button>

          {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

          {/* TP Groups Editor */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Hasil Tujuan Pembelajaran (TP)</h3>
            {tpGroups.length > 0 ? (
              <div className="space-y-6">
                {tpGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="p-4 border-2 border-slate-200 rounded-lg bg-white relative">
                     <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-full border">
                          <button 
                              onClick={() => handleReorderTpGroup(groupIndex, 'up')}
                              disabled={groupIndex === 0}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Pindah ke atas"
                          >
                              <ChevronUpIcon className="w-5 h-5"/>
                          </button>
                          <button 
                              onClick={() => handleReorderTpGroup(groupIndex, 'down')}
                              disabled={groupIndex === tpGroups.length - 1}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Pindah ke bawah"
                          >
                              <ChevronDownIcon className="w-5 h-5"/>
                          </button>
                          <div className="h-5 w-px bg-slate-200 mx-1"></div>
                          <button onClick={() => removeTpGroup(groupIndex)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full" title="Hapus Materi Pokok">
                              <TrashIcon className="w-5 h-5"/>
                          </button>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                        <select value={group.semester} onChange={(e) => handleGroupChange(groupIndex, 'semester', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Materi Pokok</label>
                        <input type="text" value={group.materi} onChange={(e) => handleGroupChange(groupIndex, 'materi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"/>
                      </div>
                    </div>
                    
                    <div className="space-y-4 pl-4 border-l-2 border-teal-200">
                      {group.subMateriGroups.map((subGroup, subIndex) => (
                        <div key={subIndex} className="p-4 border rounded-lg bg-slate-50 relative">
                           <button onClick={() => removeSubMateriGroup(groupIndex, subIndex)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-100 rounded-full">
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Materi</label>
                                <input type="text" value={subGroup.subMateri} onChange={(e) => handleSubMateriChange(groupIndex, subIndex, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 mb-3"/>
                            </div>
                             <div className="space-y-3">
                              {subGroup.tps.map((tp, tpIndex) => (
                                <div key={tpIndex} className="flex items-start gap-2">
                                  <span className="pt-2 text-slate-500 font-semibold">{tpIndex + 1}.</span>
                                  <textarea value={tp} onChange={(e) => handleTpChange(groupIndex, subIndex, tpIndex, e.target.value)} rows={2} className="flex-grow px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"></textarea>
                                  <button onClick={() => removeTpField(groupIndex, subIndex, tpIndex)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full mt-1">
                                      <TrashIcon className="w-5 h-5"/>
                                  </button>
                                </div>
                              ))}
                            </div>
                             <button onClick={() => addTpField(groupIndex, subIndex)} className="mt-3 text-teal-600 hover:text-teal-800 font-semibold text-sm">+ Tambah TP</button>
                        </div>
                      ))}
                       <button onClick={() => addSubMateriGroup(groupIndex)} className="mt-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">+ Tambah Grup Sub-Materi</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-slate-100 rounded-lg">
                <p className="text-slate-500">TP yang dikelompokkan berdasarkan materi dan semester akan muncul di sini.</p>
                <p className="text-sm text-slate-400 mt-1">Klik tombol "Hasilkan TP dengan AI" di atas.</p>
              </div>
            )}
          </div>

          <div className="mt-8 border-t pt-6 flex justify-end">
            <button onClick={handleSave} disabled={isSaving || isGenerating} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400">
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-5 h-5"/>
                    {mode === 'create' ? 'Simpan TP Baru' : 'Perbarui TP'}
                  </>
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TPEditor;