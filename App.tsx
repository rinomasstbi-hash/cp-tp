import React, { useState, useEffect, useCallback } from 'react';
import { View, TPData, TPGroup } from './types';
import * as dbService from './services/dbService';
import SubjectSelector from './components/SubjectSelector';
import TPEditor from './components/TPEditor';
import { PlusIcon, EditIcon, TrashIcon, BackIcon } from './components/icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>('select_subject');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [tps, setTps] = useState<TPData[]>([]);
  const [editingTP, setEditingTP] = useState<TPData | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [promptEmail, setPromptEmail] = useState<boolean>(false);
  const [tpToEdit, setTpToEdit] = useState<TPData | null>(null);

  const SELECTED_SUBJECT_KEY = 'mtsn4jombang_selected_subject';

  const loadTPsForSubject = useCallback((subject: string) => {
    const data = dbService.getTPsBySubject(subject);
    setTps(data);
    setSelectedSubject(subject);
    setView('view_tps');
  }, []);
  
  const handleSelectSubject = (subject: string) => {
    localStorage.setItem(SELECTED_SUBJECT_KEY, subject);
    loadTPsForSubject(subject);
  };
  
  const handleBackToSubjects = () => {
    localStorage.removeItem(SELECTED_SUBJECT_KEY);
    setSelectedSubject(null);
    setTps([]);
    setView('select_subject');
  };

  const handleCreateNew = () => {
    setEditingTP(null);
    setView('create_tp');
  };

  const handleEdit = (tp: TPData) => {
    if(!userEmail) {
        setTpToEdit(tp);
        setPromptEmail(true);
        return;
    }
    
    if (userEmail.toLowerCase() === tp.creatorEmail.toLowerCase()) {
        setEditingTP(tp);
        setView('edit_tp');
    } else {
        alert("Otentikasi gagal: Email tidak cocok dengan email pembuat.");
    }
  };

  const handleDelete = (tpId: string) => {
    if (selectedSubject && window.confirm("Apakah Anda yakin ingin menghapus data TP ini?")) {
        const tpToDelete = tps.find(tp => tp.id === tpId);
        if (!tpToDelete) return;

        if (!userEmail) {
            alert("Silakan masukkan email Anda terlebih dahulu untuk verifikasi.");
            setPromptEmail(true);
            return;
        }

        if (userEmail.toLowerCase() !== tpToDelete.creatorEmail.toLowerCase()) {
            alert("Otentikasi gagal: Anda bukan pembuat data TP ini.");
            return;
        }

        dbService.deleteTP(selectedSubject, tpId);
        loadTPsForSubject(selectedSubject);
    }
  };
  
  const handleSave = (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedSubject) {
        if(view === 'create_tp') {
            dbService.saveTP(selectedSubject, data);
        } else if (view === 'edit_tp' && editingTP) {
            const fullData = { ...data, id: editingTP.id, createdAt: editingTP.createdAt, updatedAt: new Date().toISOString() };
            dbService.updateTP(selectedSubject, fullData as TPData);
        }
      loadTPsForSubject(selectedSubject);
    }
  };

  const handleEmailSubmit = () => {
    localStorage.setItem('userEmail', userEmail);
    setPromptEmail(false);
    if(tpToEdit) {
        handleEdit(tpToEdit);
        setTpToEdit(null);
    }
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        setUserEmail(savedEmail);
    }

    const savedSubject = localStorage.getItem(SELECTED_SUBJECT_KEY);
    if (savedSubject) {
        loadTPsForSubject(savedSubject);
    }
  }, [loadTPsForSubject]);

  const SemesterDisplay: React.FC<{ title: string; groups: TPGroup[] }> = ({ title, groups }) => {
    if (groups.length === 0) return null;
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-700 border-b-2 border-teal-500 pb-2 mb-4">{title}</h2>
            <div className="space-y-8">
                {groups.map((group, groupIndex) => (
                    <div key={groupIndex} className="p-4 rounded-lg bg-slate-50 border">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Materi Pokok: <span className="font-normal">{group.materi}</span></h3>
                        <div className="space-y-6 pl-4 border-l-2 border-teal-300">
                          {group.subMateriGroups.map((subGroup, subIndex) => (
                              <div key={subIndex}>
                                  <h4 className="text-lg font-semibold text-slate-700 mb-2">Sub-Materi: <span className="font-normal">{subGroup.subMateri}</span></h4>
                                  <div className="overflow-x-auto">
                                     <table className="min-w-full bg-white border border-slate-200">
                                          <thead className="bg-slate-100">
                                              <tr>
                                                  <th className="w-16 px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No.</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tujuan Pembelajaran</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-200">
                                              {subGroup.tps.map((item, index) => (
                                                  <tr key={index}>
                                                      <td className="px-4 py-3 align-top text-slate-500">{index + 1}</td>
                                                      <td className="px-4 py-3 text-slate-700">{item}</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case 'select_subject':
        return <SubjectSelector onSelectSubject={handleSelectSubject} />;
      
      case 'view_tps':
        if (!selectedSubject) return null;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <button onClick={handleBackToSubjects} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-semibold">
                <BackIcon className="w-5 h-5" />
                Kembali ke Pilihan Mapel
            </button>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{selectedSubject}</h1>
                <p className="text-slate-500">Daftar Tujuan Pembelajaran yang tersimpan.</p>
              </div>
              <button onClick={handleCreateNew} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                <PlusIcon className="w-5 h-5" />
                Buat TP Baru
              </button>
            </div>
            
            {tps.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-slate-700">Belum Ada Data</h3>
                    <p className="text-slate-500 mt-2">Tidak ada data Tujuan Pembelajaran untuk mata pelajaran ini.</p>
                    <p className="text-slate-500">Silakan klik tombol "Buat TP Baru" untuk memulai.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {tps.map(tp => {
                        const ganjilTPs = tp.tpGroups?.filter(g => g.semester === 'Ganjil') || [];
                        const genapTPs = tp.tpGroups?.filter(g => g.semester === 'Genap') || [];

                        return (
                        <div key={tp.id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-shadow hover:shadow-xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-slate-500">Dibuat oleh: <span className="font-medium text-slate-700">{tp.creatorName}</span></p>
                                    <p className="text-sm text-slate-500">Sumber CP: <span className="font-medium text-slate-700">{tp.cpSourceVersion || '-'}</span></p>
                                    <p className="text-sm text-slate-500">Tanggal Dibuat: <span className="font-medium text-slate-700">{new Date(tp.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'})}</span></p>
                                    <p className="text-sm text-slate-500">Kelas: <span className="font-medium text-slate-700">{tp.grade}</span></p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEdit(tp)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(tp.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>

                            <div className="mb-4 border-t pt-4">
                              <h4 className="font-semibold text-slate-600">Capaian Pembelajaran & Elemen:</h4>
                              <div className="mt-2 space-y-3">
                              {tp.cpElements.map((item, index) => (
                                  <div key={index} className="p-3 bg-slate-50 rounded-md border">
                                      <p className="font-semibold text-slate-700">{item.element}</p>
                                      <p className="text-slate-600 whitespace-pre-wrap mt-1">{item.cp}</p>
                                  </div>
                              ))}
                              </div>
                            </div>
                           
                            {tp.additionalNotes && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-slate-600">Catatan Tambahan:</h4>
                                <p className="text-slate-700 whitespace-pre-wrap p-3 bg-slate-50 rounded-md border">{tp.additionalNotes}</p>
                              </div>
                            )}
                            
                            <div className="border-t mt-4 pt-4">
                                <SemesterDisplay title="Semester Ganjil" groups={ganjilTPs} />
                                <SemesterDisplay title="Semester Genap" groups={genapTPs} />
                            </div>
                        </div>
                    )})}
                </div>
            )}
          </div>
        );

      case 'create_tp':
      case 'edit_tp':
        return <TPEditor 
                mode={view === 'create_tp' ? 'create' : 'edit'}
                initialData={editingTP}
                subject={selectedSubject!}
                onSave={handleSave}
                onCancel={() => loadTPsForSubject(selectedSubject!)}
               />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen">
      {promptEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                  <h2 className="text-lg font-bold mb-4">Verifikasi Email</h2>
                  <p className="text-sm text-slate-600 mb-4">Untuk mengedit atau menghapus, silakan masukkan email yang Anda gunakan saat membuat data ini.</p>
                  <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Masukkan email Anda"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 mb-4"
                  />
                  <div className="flex justify-end gap-2">
                       <button onClick={() => { setPromptEmail(false); setTpToEdit(null); }} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Batal</button>
                       <button onClick={handleEmailSubmit} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Lanjutkan</button>
                  </div>
              </div>
          </div>
      )}
      {renderContent()}
    </div>
  );
};

export default App;