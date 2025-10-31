import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { View, TPData, TPGroup } from './types';
import * as dbService from './services/dbService';
import SubjectSelector from './components/SubjectSelector';
import TPEditor from './components/TPEditor';
import Login from './components/Login';
import { PlusIcon, EditIcon, TrashIcon, BackIcon } from './components/icons';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('select_subject');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [tps, setTps] = useState<TPData[]>([]);
  const [editingTP, setEditingTP] = useState<TPData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const SELECTED_SUBJECT_KEY_PREFIX = 'mtsn4jombang_selected_subject_';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        // Clear subject selection on logout
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(SELECTED_SUBJECT_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        setView('select_subject');
        setSelectedSubject(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadTPsForSubject = useCallback(async (subject: string, userId: string) => {
    setDataLoading(true);
    try {
      const data = await dbService.getTPsBySubject(subject, userId);
      setTps(data);
    } catch (error) {
      console.error(error);
      alert("Gagal memuat data. Silakan coba lagi.");
    } finally {
      setDataLoading(false);
      setSelectedSubject(subject);
      setView('view_tps');
    }
  }, []);

  useEffect(() => {
    if (user) {
      const savedSubject = localStorage.getItem(SELECTED_SUBJECT_KEY_PREFIX + user.uid);
      if (savedSubject) {
        loadTPsForSubject(savedSubject, user.uid);
      }
    }
  }, [user, loadTPsForSubject]);
  
  const handleSelectSubject = (subject: string) => {
    if (!user) return;
    localStorage.setItem(SELECTED_SUBJECT_KEY_PREFIX + user.uid, subject);
    loadTPsForSubject(subject, user.uid);
  };
  
  const handleBackToSubjects = () => {
    if (user) {
        localStorage.removeItem(SELECTED_SUBJECT_KEY_PREFIX + user.uid);
    }
    setSelectedSubject(null);
    setTps([]);
    setView('select_subject');
  };

  const handleCreateNew = () => {
    setEditingTP(null);
    setView('create_tp');
  };

  const handleEdit = (tp: TPData) => {
    setEditingTP(tp);
    setView('edit_tp');
  };

  const handleDelete = async (tpId: string) => {
    if (!selectedSubject || !user || !tpId) return;
    if (window.confirm("Apakah Anda yakin ingin menghapus data TP ini secara permanen?")) {
      try {
        await dbService.deleteTP(tpId);
        await loadTPsForSubject(selectedSubject, user.uid);
      } catch (error) {
        console.error(error);
        alert("Gagal menghapus data. Silakan coba lagi.");
      }
    }
  };
  
  const handleSave = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (selectedSubject && user) {
      if(view === 'create_tp') {
        const dataToSave = { ...data, userId: user.uid };
        await dbService.saveTP(dataToSave);
      } else if (view === 'edit_tp' && editingTP?.id) {
        await dbService.updateTP(editingTP.id, data);
      }
      await loadTPsForSubject(selectedSubject, user.uid);
    }
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out: ", error);
        alert("Gagal untuk logout.");
    }
  };


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
    if (authLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!user) {
      return <Login />;
    }

    switch (view) {
      case 'select_subject':
        return <SubjectSelector onSelectSubject={handleSelectSubject} />;
      
      case 'view_tps':
        if (!selectedSubject) return null;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button onClick={handleBackToSubjects} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                  <BackIcon className="w-5 h-5" />
                  Kembali ke Pilihan Mapel
              </button>
              <div className="flex items-center gap-4">
                  <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{user.displayName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button onClick={handleLogout} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600">Logout</button>
              </div>
            </div>

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
            
            {dataLoading ? (
                <div className="text-center py-16"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-slate-600">Memuat data...</p></div>
            ) : tps.length === 0 ? (
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
                                    <button onClick={() => handleDelete(tp.id!)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5"/></button>
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
                initialData={editingTP || undefined}
                subject={selectedSubject!}
                user={user}
                onSave={handleSave}
                onCancel={() => loadTPsForSubject(selectedSubject!, user.uid)}
               />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen">
      {renderContent()}
    </div>
  );
};

export default App;
