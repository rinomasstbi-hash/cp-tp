
import React, { useState, useEffect, useCallback } from 'react';
import { View, TPData, TPGroup } from './types';
import * as apiService from './services/dbService';
import SubjectSelector from './components/SubjectSelector';
import TPEditor from './components/TPEditor';
import { PlusIcon, EditIcon, TrashIcon, BackIcon, ClipboardIcon, AlertIcon, CloseIcon, FlowChartIcon } from './components/icons';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-lg w-full sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
               <img 
                 src="https://id.ppdb.mtsn4jombang.org/assets/img/logo/logo_ppdb695.png" 
                 alt="Logo MTsN 4 Jombang" 
                 className="h-12 w-auto"
               />
            </div>
            <div className="ml-4">
              <span className="block text-xl font-extrabold text-white tracking-wide uppercase">
                Tujuan Pembelajaran (TP)
              </span>
              <span className="block text-sm text-slate-300">
                Tahun Pelajaran 2025/2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('select_subject');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [tps, setTps] = useState<TPData[]>([]);
  const [selectedTP, setSelectedTP] = useState<TPData | null>(null);
  const [editingTP, setEditingTP] = useState<TPData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [copyNotification, setCopyNotification] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // State for ownership verification modal
  const [authPrompt, setAuthPrompt] = useState<{ action: 'edit' | 'delete'; tp: TPData; } | null>(null);
  const [authEmailInput, setAuthEmailInput] = useState('');


  const SELECTED_SUBJECT_KEY = 'mtsn4jombang_selected_subject';

  const loadTPsForSubject = useCallback(async (subject: string) => {
    setDataLoading(true);
    setGlobalError(null);
    try {
      const data = await apiService.getTPsBySubject(subject);
      setTps(data);
    // FIX: Added missing opening brace for the catch block. This was causing a major syntax error that broke the component's scope.
    } catch (error: any) {
      console.error(error);
      setGlobalError(error.message);
    } finally {
      setDataLoading(false);
    }
  }, []);
  
  // Effect to load data when subject and view are set correctly
  useEffect(() => {
    if (selectedSubject && view === 'view_tp_list') {
        loadTPsForSubject(selectedSubject);
    }
  }, [selectedSubject, view, loadTPsForSubject]);
  
  // Effect for initial load from localStorage
  useEffect(() => {
      const savedSubject = localStorage.getItem(SELECTED_SUBJECT_KEY);
      if (savedSubject) {
        setSelectedSubject(savedSubject);
        setView('view_tp_list');
      }
  }, []); // Run only once on mount

  const handleSelectSubject = (subject: string) => {
    localStorage.setItem(SELECTED_SUBJECT_KEY, subject);
    setTps([]);
    setGlobalError(null);
    setSelectedSubject(subject);
    setView('view_tp_list'); 
  };
  
  const handleBackToSubjects = () => {
    localStorage.removeItem(SELECTED_SUBJECT_KEY);
    setSelectedSubject(null);
    setTps([]);
    setGlobalError(null);
    setView('select_subject');
  };
  
  const handleBackToTPList = () => {
    setSelectedTP(null);
    setView('view_tp_list');
  };

  const handleCreateNew = () => {
    setEditingTP(null);
    setView('create_tp');
  };

  const handleViewTPDetail = (tp: TPData) => {
    setSelectedTP(tp);
    setView('view_tp_detail');
  };

  const handleEdit = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    setAuthEmailInput('');
    setAuthPrompt({ action: 'edit', tp });
  };

  const handleDelete = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    setAuthEmailInput('');
    setAuthPrompt({ action: 'delete', tp });
  };

  const handleAuthSubmit = async () => {
    if (!authPrompt || !selectedSubject) return;

    if (authEmailInput.trim().toLowerCase() !== authPrompt.tp.creatorEmail.trim().toLowerCase()) {
      alert('Email tidak sesuai. Anda tidak memiliki izin untuk melakukan tindakan ini.');
      return;
    }

    if (authPrompt.action === 'edit') {
      setEditingTP(authPrompt.tp);
      setView('edit_tp');
    } else if (authPrompt.action === 'delete') {
      if (window.confirm("Apakah Anda yakin ingin menghapus data TP ini secara permanen? Tindakan ini tidak dapat dibatalkan.")) {
        setGlobalError(null);
        try {
          await apiService.deleteTP(authPrompt.tp.id!);
          await loadTPsForSubject(selectedSubject);
        } catch (error: any) {
          console.error(error);
          setGlobalError(error.message);
        }
      }
    }

    setAuthPrompt(null);
  };

  const handleSave = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (selectedSubject) {
      setGlobalError(null);
      try {
        if(view === 'create_tp') {
            const now = new Date().toISOString();
            const dataToSave = { 
                ...data, 
                createdAt: now,
                updatedAt: now
            };
            await apiService.saveTP(dataToSave);
        } else if (view === 'edit_tp' && editingTP?.id) {
            const now = new Date().toISOString();
            const dataToUpdate = {
                ...data,
                updatedAt: now
            };
            await apiService.updateTP(editingTP.id, dataToUpdate);
        }
        setView('view_tp_list');
      } catch (error: any) {
          console.error(error);
          setGlobalError(error.message);
          throw error;
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopyNotification('Tujuan Pembelajaran berhasil disalin!');
        setTimeout(() => setCopyNotification(''), 2000);
    }, (err) => {
        console.error('Gagal menyalin teks: ', err);
        setCopyNotification('Gagal menyalin.');
        setTimeout(() => setCopyNotification(''), 2000);
    });
  };

  const SemesterDisplay: React.FC<{ title: string; groups: TPGroup[]; numberingOffset?: number }> = ({ title, groups, numberingOffset = 0 }) => {
    if (groups.length === 0) return null;
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-700 border-b-2 border-teal-500 pb-2 mb-4">{title}</h2>
            <div className="space-y-8">
                {groups.map((group, groupIndex) => {
                    let tpCounterWithinGroup = 1;
                    const materiPokokNumber = groupIndex + 1 + numberingOffset;
                    return (
                      <div key={groupIndex} className="p-4 rounded-lg bg-slate-50 border">
                          <h3 className="text-xl font-bold text-slate-800 mb-4">Materi Pokok {materiPokokNumber}: <span className="font-normal">{group.materi}</span></h3>
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
                                                    <th className="w-20 px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {subGroup.tps.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-3 align-top text-slate-500">{`${materiPokokNumber}.${tpCounterWithinGroup++}`}</td>
                                                        <td className="px-4 py-3 text-slate-700">{item}</td>
                                                        <td className="px-4 py-3 align-top text-center">
                                                            <button onClick={() => handleCopy(item)} title="Salin TP" className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                                                                <ClipboardIcon className="w-5 h-5"/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                          </div>
                      </div>
                    )
                })}
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case 'select_subject':
        return <SubjectSelector onSelectSubject={handleSelectSubject} />;
      
      case 'view_tp_list':
        if (!selectedSubject) return null;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
             {globalError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                  <div className="flex">
                      <div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div>
                      <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Terjadi Kesalahan</h3>
                          <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{globalError}</p></div>
                      </div>
                  </div>
                  <button onClick={() => setGlobalError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
              </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <button onClick={handleBackToSubjects} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"><BackIcon className="w-5 h-5" /> Kembali ke Pilihan Mapel</button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{selectedSubject}</h1>
                <p className="text-slate-500">Daftar set Tujuan Pembelajaran yang tersimpan. Klik untuk melihat rincian.</p>
              </div>
              <button onClick={handleCreateNew} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"><PlusIcon className="w-5 h-5" /> Buat TP Baru</button>
            </div>
            
            {dataLoading ? (
                <div className="text-center py-16"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-slate-600">Memuat data...</p></div>
            ) : globalError && !dataLoading ? (
                <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md"><h3 className="text-xl font-semibold text-slate-700">Gagal Memuat Data</h3><p className="text-slate-500 mt-2">Silakan periksa pesan error di atas dan coba lagi.</p></div>
            ) : tps.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md"><h3 className="text-xl font-semibold text-slate-700">Belum Ada Data</h3><p className="text-slate-500 mt-2">Tidak ada data Tujuan Pembelajaran untuk mata pelajaran ini.</p><p className="text-slate-500">Silakan klik tombol "Buat TP Baru" untuk memulai.</p></div>
            ) : (
                <div className="space-y-4">
                    {tps.map(tp => (
                      <div key={tp.id} onClick={() => handleViewTPDetail(tp)} className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-teal-500 cursor-pointer p-4 flex justify-between items-center">
                          <div>
                              <p className="text-lg font-bold text-slate-800">
                                  Kelas {tp.grade}
                                  {tp.cpSourceVersion && <span className="font-normal text-slate-400 mx-2">|</span>}
                                  {tp.cpSourceVersion}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                <span>Oleh: <span className="font-medium text-slate-600">{tp.creatorName}</span></span>
                                <span>Dibuat: <span className="font-medium text-slate-600">{new Date(tp.createdAt).toLocaleDateString('id-ID')}</span></span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                              <button onClick={(e) => handleEdit(e, tp)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full"><EditIcon className="w-5 h-5"/></button>
                              <button onClick={(e) => handleDelete(e, tp)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                          </div>
                      </div>
                    ))}
                </div>
            )}
          </div>
        );

      case 'view_tp_detail':
        if (!selectedTP) return null;
        const { creatorName, cpSourceVersion, createdAt, grade, tpGroups, cpElements, additionalNotes } = selectedTP;
        const ganjilTPs = tpGroups?.filter(g => g.semester === 'Ganjil') || [];
        const genapTPs = tpGroups?.filter(g => g.semester === 'Genap') || [];
        const ganjilMateriCount = ganjilTPs.length;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <button onClick={handleBackToTPList} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                  <BackIcon className="w-5 h-5" />
                  Kembali ke Daftar TP
                </button>
                <div className="flex flex-col sm:flex-row justify-end gap-3 w-full sm:w-auto">
                    <button
                        onClick={(e) => handleEdit(e, selectedTP)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <EditIcon className="w-5 h-5" />
                        Edit TP
                    </button>
                    <button
                        onClick={() => alert('Fitur pembuatan Alur Tujuan Pembelajaran (ATP) akan segera hadir!')}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        <FlowChartIcon className="w-5 h-5" />
                        Buat ATP (Alur Tujuan Pembelajaran)
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <p className="text-sm text-slate-500">Dibuat oleh: <span className="font-medium text-slate-700">{creatorName}</span></p>
                <p className="text-sm text-slate-500">Sumber CP: <span className="font-medium text-slate-700">{cpSourceVersion || '-'}</span></p>
                <p className="text-sm text-slate-500">Tanggal Dibuat: <span className="font-medium text-slate-700">{new Date(createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'})}</span></p>
                <p className="text-sm text-slate-500">Kelas: <span className="font-medium text-slate-700">{grade}</span></p>
              </div>

              <div className="mb-4 border-t pt-4">
                <h4 className="font-semibold text-slate-600">Capaian Pembelajaran & Elemen:</h4>
                <div className="mt-2 space-y-3">
                {cpElements.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-md border">
                        <p className="font-semibold text-slate-700">{item.element}</p>
                        <p className="text-slate-600 whitespace-pre-wrap mt-1">{item.cp}</p>
                    </div>
                ))}
                </div>
              </div>
              
              {additionalNotes && (
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-600">Catatan Tambahan:</h4>
                  <p className="text-slate-700 whitespace-pre-wrap p-3 bg-slate-50 rounded-md border">{additionalNotes}</p>
                </div>
              )}
              
              <div className="border-t mt-4 pt-4">
                  <SemesterDisplay title="Semester Ganjil" groups={ganjilTPs} />
                  <SemesterDisplay title="Semester Genap" groups={genapTPs} numberingOffset={ganjilMateriCount} />
              </div>
            </div>
          </div>
        );

      case 'create_tp':
      case 'edit_tp':
        if (!selectedSubject) return null;
        return <TPEditor 
                mode={view === 'create_tp' ? 'create' : 'edit'}
                initialData={editingTP || undefined}
                subject={selectedSubject}
                onSave={handleSave}
                onCancel={() => setView('view_tp_list')}
               />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen">
      <Header />

      {copyNotification && (
          <div className="fixed top-5 right-5 bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-transform transform animate-pulse">
              {copyNotification}
          </div>
      )}
      
      {authPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-slate-800">Verifikasi Kepemilikan</h3>
            <p className="text-sm text-slate-600 mb-4">
              Untuk {authPrompt.action === 'edit' ? 'mengedit' : 'menghapus'} data ini, silakan masukkan email guru yang membuatnya: <span className="font-semibold">{authPrompt.tp.creatorName}</span>.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleAuthSubmit(); }}>
                <input
                    type="email"
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    placeholder="Masukkan email pembuat"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    autoFocus
                />
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={() => setAuthPrompt(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                    Batal
                    </button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                    Konfirmasi
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
