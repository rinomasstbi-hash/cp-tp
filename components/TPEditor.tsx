

import React, { useState } from 'react';
import { TPData, TPGroup } from '../types';
import { generateTPs } from '../services/geminiService';
import { BackIcon, SaveIcon, SparklesIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, ClipboardIcon } from './icons';

interface TPEditorProps {
  mode: 'create' | 'edit';
  initialData?: TPData;
  subject: string;
  onSave: (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onCancel: () => void;
  existingTPsForSubject?: TPData[];
}

// Helper to generate unique IDs for state management
const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// Define state shapes with unique IDs for stable keys in React
interface CPElementWithId { element: string; cp: string; id: string; }
interface TPWithValue { id: string; value: string; }
interface SubMateriGroupWithId { subMateri: string; tps: TPWithValue[]; id: string; }
interface TPGroupWithId { semester: 'Ganjil' | 'Genap'; materi: string; subMateriGroups: SubMateriGroupWithId[]; id: string; }

const TPEditor: React.FC<TPEditorProps> = ({ mode, initialData, subject, onSave, onCancel, existingTPsForSubject }) => {
  const [formData, setFormData] = useState({
    grade: initialData?.grade || '7',
    creatorEmail: initialData?.creatorEmail || '',
    creatorName: initialData?.creatorName || '',
    cpSourceVersion: initialData?.cpSourceVersion || '',
    additionalNotes: initialData?.additionalNotes || '',
  });
  
  const [cpElements, setCpElements] = useState<CPElementWithId[]>(() =>
    (initialData?.cpElements && initialData.cpElements.length > 0
      ? initialData.cpElements
      : [{ element: '', cp: '' }]
    ).map((el) => ({ ...el, id: newId('cp') }))
  );

  const [tpGroups, setTpGroups] = useState<TPGroupWithId[]>(() =>
    (initialData?.tpGroups || []).map((group) => ({
      ...group,
      id: newId('group'),
      subMateriGroups: group.subMateriGroups.map((subGroup) => ({
        ...subGroup,
        id: newId('subgroup'),
        tps: subGroup.tps.map(tpText => ({ id: newId('tp'), value: tpText }))
      }))
    }))
  );
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isReuseModalOpen, setIsReuseModalOpen] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCpElementChange = (id: string, field: 'element' | 'cp', value: string) => {
    setCpElements(elements => elements.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

  const addCpElementRow = () => {
    setCpElements([...cpElements, { element: '', cp: '', id: newId('cp') }]);
  };

  const removeCpElementRow = (id: string) => {
    if (cpElements.length > 1) {
      setCpElements(cpElements.filter(el => el.id !== id));
    }
  };
  
  const handleReuseCp = (tp: TPData) => {
    setCpElements(tp.cpElements.map(el => ({ ...el, id: newId('cp') })));
    setFormData(prev => ({
      ...prev,
      cpSourceVersion: tp.cpSourceVersion,
      additionalNotes: '', // PENTING: Kosongkan catatan untuk memaksa input baru
    }));
    setIsReuseModalOpen(false);
    const notesElement = document.getElementById('additionalNotes');
    if (notesElement) {
        notesElement.focus();
        notesElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setError('CP telah dimuat. Harap sesuaikan kelas (jika perlu) dan isi urutan materi yang baru di bawah.');
    setTimeout(() => setError(''), 5000); // Hapus pesan setelah 5 detik
  };

  // --- Handlers for TP Groups & Sub-Materi Groups ---
  const handleGroupChange = (groupId: string, field: 'semester' | 'materi', value: string) => {
    setTpGroups(groups => groups.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  };
  
  const handleSubMateriChange = (groupId: string, subGroupId: string, value: string) => {
     setTpGroups(groups => groups.map(g => g.id === groupId ? {
         ...g,
         subMateriGroups: g.subMateriGroups.map(sg => sg.id === subGroupId ? { ...sg, subMateri: value } : sg)
     } : g));
  }

  const handleTpChange = (groupId: string, subGroupId: string, tpId: string, value: string) => {
    setTpGroups(groups => groups.map(g => g.id === groupId ? {
        ...g,
        subMateriGroups: g.subMateriGroups.map(sg => sg.id === subGroupId ? {
            ...sg,
            tps: sg.tps.map(tp => tp.id === tpId ? { ...tp, value } : tp)
        } : sg)
    } : g));
  };
  
  const addTpField = (groupId: string, subGroupId: string) => {
    setTpGroups(groups => groups.map(g => g.id === groupId ? {
        ...g,
        subMateriGroups: g.subMateriGroups.map(sg => sg.id === subGroupId ? {
            ...sg,
            tps: [...sg.tps, { id: newId('tp'), value: '' }]
        } : sg)
    } : g));
  };

  const removeTpField = (groupId: string, subGroupId: string, tpId: string) => {
    setTpGroups(groups => groups.map(g => g.id === groupId ? {
        ...g,
        subMateriGroups: g.subMateriGroups.map(sg => sg.id === subGroupId ? {
            ...sg,
            tps: sg.tps.filter(tp => tp.id !== tpId)
        } : sg)
    } : g));
  };

  const addSubMateriGroup = (groupId: string) => {
    setTpGroups(groups => groups.map(g => g.id === groupId ? {
        ...g,
        subMateriGroups: [...g.subMateriGroups, { subMateri: '', tps: [{ id: newId('tp'), value: '' }], id: newId('subgroup') }]
    } : g));
  };

  const removeSubMateriGroup = (groupId: string, subGroupId: string) => {
    setTpGroups(groups => groups.map(g => g.id === groupId ? {
        ...g,
        subMateriGroups: g.subMateriGroups.filter(sg => sg.id !== subGroupId)
    } : g));
  };

  const addTpGroup = () => {
    setTpGroups([...tpGroups, { 
      semester: 'Ganjil', 
      materi: '', 
      subMateriGroups: [{ subMateri: '', tps: [{id: newId('tp'), value: ''}], id: newId('subgroup') }],
      id: newId('group')
    }]);
  };

  const removeTpGroup = (id: string) => {
    setTpGroups(tpGroups.filter(g => g.id !== id));
  };
  
  const handleReorderTpGroup = (index: number, direction: 'up' | 'down') => {
    const newGroups = [...tpGroups];
    if (direction === 'up' && index > 0) {
      [newGroups[index - 1], newGroups[index]] = [newGroups[index], newGroups[index - 1]];
    } else if (direction === 'down' && index < newGroups.length - 1) {
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
      const generatedData = await generateTPs({ ...formData, subject, cpElements });
      setTpGroups(generatedData.map((group) => ({
        ...group,
        id: newId('group'),
        subMateriGroups: group.subMateriGroups.map((subGroup) => ({
            ...subGroup,
            id: newId('subgroup'),
            tps: subGroup.tps.map(tpText => ({ id: newId('tp'), value: tpText }))
        }))
      })));
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
    if (!/\S+@\S+\.\S+/.test(formData.creatorEmail)) {
        setError('Format email yang Anda masukkan tidak valid.');
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
    
    // Strip temporary IDs before saving
    const finalCpElements = cpElements.map(({ id, ...rest }) => rest);
    const finalTpGroups = tpGroups.map(({ id, ...restGroup }) => ({
        ...restGroup,
        subMateriGroups: restGroup.subMateriGroups.map(({ id, ...restSubGroup }) => ({
            ...restSubGroup,
            tps: restSubGroup.tps.map(tp => tp.value)
        }))
    }));

    const finalData = {
        subject,
        ...formData,
        cpElements: finalCpElements,
        tpGroups: finalTpGroups,
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
       {isReuseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Pilih CP untuk Digunakan Ulang</h3>
            <p className="text-sm text-slate-600 mb-6">Pilih salah satu set data di bawah ini untuk menyalin Capaian Pembelajaran (CP) dan Elemennya ke formulir. Anda **wajib** mengisi ulang urutan materi untuk menghasilkan TP yang baru.</p>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {existingTPsForSubject?.map(tp => (
                <button 
                  key={tp.id} 
                  onClick={() => handleReuseCp(tp)}
                  className="w-full text-left p-4 border rounded-lg hover:bg-teal-50 hover:border-teal-400 transition-colors"
                >
                  <p className="font-semibold text-slate-700">Dibuat oleh: {tp.creatorName} (Kelas {tp.grade})</p>
                  <p className="text-xs text-slate-500 mt-1">Dibuat pada: {new Date(tp.createdAt).toLocaleString('id-ID')}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 text-right">
              <button type="button" onClick={() => setIsReuseModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
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
             <div className="flex justify-between items-center mb-2 border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-700">Detail Capaian Pembelajaran</h3>
                {mode === 'create' && existingTPsForSubject && existingTPsForSubject.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setIsReuseModalOpen(true)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 p-2 rounded-md hover:bg-indigo-50"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                    Gunakan CP yang Ada
                  </button>
                )}
              </div>
            {cpElements.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-slate-50 relative">
                <div className="col-span-12 md:col-span-5">
                  <label htmlFor={`element-${item.id}`} className="block text-sm font-medium text-slate-700 mb-1">Elemen / Domain</label>
                  <textarea id={`element-${item.id}`} value={item.element} onChange={(e) => handleCpElementChange(item.id, 'element', e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Contoh: Bilangan"></textarea>
                </div>
                <div className="col-span-12 md:col-span-7">
                  <label htmlFor={`cp-${item.id}`} className="block text-sm font-medium text-slate-700 mb-1">Capaian Pembelajaran (CP)</label>
                  <textarea id={`cp-${item.id}`} value={item.cp} onChange={(e) => handleCpElementChange(item.id, 'cp', e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="Masukkan CP yang sesuai..."></textarea>
                </div>
                {cpElements.length > 1 && (
                    <div className="absolute top-2 right-2">
                        <button onClick={() => removeCpElementRow(item.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full">
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
            <label htmlFor="additionalNotes" className="block text-sm font-medium text-slate-700 mb-1">Tambahkan urutan bab/materi semester ganjil dan genap (WAJIB diisi)</label>
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
                  <div key={group.id} className="p-4 border-2 border-slate-200 rounded-lg bg-white relative">
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
                          <button onClick={() => removeTpGroup(group.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full" title="Hapus Materi Pokok">
                              <TrashIcon className="w-5 h-5"/>
                          </button>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                        <select value={group.semester} onChange={(e) => handleGroupChange(group.id, 'semester', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Materi Pokok</label>
                        <input type="text" value={group.materi} onChange={(e) => handleGroupChange(group.id, 'materi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"/>
                      </div>
                    </div>
                    
                    <div className="space-y-4 pl-4 border-l-2 border-teal-200">
                      {group.subMateriGroups.map((subGroup) => (
                        <div key={subGroup.id} className="p-4 border rounded-lg bg-slate-50 relative">
                           <button onClick={() => removeSubMateriGroup(group.id, subGroup.id)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-100 rounded-full">
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Materi</label>
                                <input type="text" value={subGroup.subMateri} onChange={(e) => handleSubMateriChange(group.id, subGroup.id, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 mb-3"/>
                            </div>
                             <div className="space-y-3">
                              {subGroup.tps.map((tp, tpIndex) => (
                                <div key={tp.id} className="flex items-start gap-2">
                                  <span className="pt-2 text-slate-500 font-semibold">{tpIndex + 1}.</span>
                                  <textarea value={tp.value} onChange={(e) => handleTpChange(group.id, subGroup.id, tp.id, e.target.value)} rows={2} className="flex-grow px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"></textarea>
                                  <button onClick={() => removeTpField(group.id, subGroup.id, tp.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full mt-1">
                                      <TrashIcon className="w-5 h-5"/>
                                  </button>
                                </div>
                              ))}
                            </div>
                             <button onClick={() => addTpField(group.id, subGroup.id)} className="mt-3 text-teal-600 hover:text-teal-800 font-semibold text-sm">+ Tambah TP</button>
                        </div>
                      ))}
                       <button onClick={() => addSubMateriGroup(group.id)} className="mt-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">+ Tambah Grup Sub-Materi</button>
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
             <button onClick={addTpGroup} className="mt-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
              <PlusIcon className="w-4 h-4" />
              Tambah Grup Materi Pokok
            </button>
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
