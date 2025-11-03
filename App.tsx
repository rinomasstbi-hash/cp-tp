import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TPData, TPGroup, ATPData, ATPTableRow } from './types';
import * as apiService from './services/dbService';
import { generateATP } from './services/geminiService';
import SubjectSelector from './components/SubjectSelector';
import TPEditor from './components/TPEditor';
import ATPEditor from './components/ATPEditor';
import { PlusIcon, EditIcon, TrashIcon, BackIcon, ClipboardIcon, AlertIcon, CloseIcon, FlowChartIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, DownloadIcon } from './components/icons';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-lg w-full sticky top-0 z-40 print:hidden">
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
              <span className="block text-base sm:text-xl font-extrabold text-white tracking-wide uppercase">
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

const ATP_LOADING_MESSAGES = [
  "Menganalisis struktur Tujuan Pembelajaran...",
  "Memetakan setiap TP ke Capaian Pembelajaran yang relevan...",
  "Menyusun alur pembelajaran yang logis...",
  "Memastikan urutan materi sudah sesuai...",
  "Hampir selesai, memfinalisasi format tabel..."
];

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
  const [authPrompt, setAuthPrompt] = useState<{
    action: 'edit' | 'delete' | 'create_atp';
    type: 'tp' | 'atp';
    data: TPData | ATPData;
  } | null>(null);
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // State for collapsible CP info section
  const [isCpInfoVisible, setIsCpInfoVisible] = useState(false);
  
  // State for ATP Management
  const [atps, setAtps] = useState<ATPData[]>([]);
  const [selectedATP, setSelectedATP] = useState<ATPData | null>(null);
  const [editingATP, setEditingATP] = useState<ATPData | null>(null);
  const [isGeneratingAtp, setIsGeneratingAtp] = useState(false);
  const [atpError, setAtpError] = useState<string | null>(null);
  const [atpLoadingMessage, setAtpLoadingMessage] = useState(ATP_LOADING_MESSAGES[0]);
  const atpMessageIntervalRef = useRef<number | null>(null);


  const SELECTED_SUBJECT_KEY = 'mtsn4jombang_selected_subject';

  const loadTPsForSubject = useCallback(async (subject: string) => {
    setDataLoading(true);
    setGlobalError(null);
    try {
      const data = await apiService.getTPsBySubject(subject);
      setTps(data);
    } catch (error: any) {
      console.error(error);
      setGlobalError(error.message);
      setTps([]); // Reset state on error
    } finally {
      setDataLoading(false);
    }
  }, []);
  
  // Effect to load TPs only when the selected subject changes.
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

  const loadATPsForTP = useCallback(async (tpId: string) => {
    setDataLoading(true);
    setAtpError(null);
    try {
      const data = await apiService.getATPsByTPId(tpId);
      setAtps(data);
    } catch (error: any) {
      console.error(error);
      setAtpError(error.message);
      setAtps([]); // Reset state on error
    } finally {
      setDataLoading(false);
    }
  }, []);
  
  // Effect to load ATPs only when the selected TP changes and we are in the ATP list view.
  useEffect(() => {
      if (selectedTP?.id && view === 'view_atp_list') {
          loadATPsForTP(selectedTP.id);
      }
  }, [selectedTP, view, loadATPsForTP]);


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
    setIsCpInfoVisible(false); // Reset visibility when leaving detail view
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

  // Helper to open the auth modal with reset states
  const openAuthModal = (action: 'edit' | 'delete' | 'create_atp', type: 'tp' | 'atp', data: TPData | ATPData) => {
    setAuthEmailInput('');
    setAuthError(null);
    setAuthPrompt({ action, type, data });
  };


  const handleEdit = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    openAuthModal('edit', 'tp', tp);
  };

  const handleDelete = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    openAuthModal('delete', 'tp', tp);
  };
  
  const handleEditATP = (e: React.MouseEvent, atp: ATPData) => {
    e.stopPropagation();
    if (!selectedTP) return;
    openAuthModal('edit', 'atp', atp);
  };

  const handleDeleteATP = (e: React.MouseEvent, atp: ATPData) => {
    e.stopPropagation();
    if (!selectedTP) return;
    openAuthModal('delete', 'atp', atp);
  };

  const handleAuthSubmit = async () => {
    if (!authPrompt) return;

    setAuthError(null);
    setIsAuthorizing(true);
    
    try {
        const creatorEmail = authPrompt.type === 'tp'
            ? (authPrompt.data as TPData).creatorEmail
            : selectedTP?.creatorEmail;
            
        if (!creatorEmail) {
            throw new Error('Tidak dapat menemukan email pembuat untuk verifikasi.');
        }

        if (authEmailInput.trim().toLowerCase() !== creatorEmail.trim().toLowerCase()) {
          throw new Error('Email tidak sesuai. Anda tidak memiliki izin untuk melakukan tindakan ini.');
        }
        
        // Handle ATP creation after successful auth
        if (authPrompt.action === 'create_atp') {
            setAuthPrompt(null);
            _proceedWithAtpGeneration(); 
            return; 
        }

        // If email validation is successful, proceed with other actions
        if (authPrompt.type === 'tp') {
            const tpData = authPrompt.data as TPData;
            if (authPrompt.action === 'edit') {
                setEditingTP(tpData);
                setView('edit_tp');
                setAuthPrompt(null);
            } else if (authPrompt.action === 'delete') {
                // Cascade Delete: Delete ATPs first, then the TP.
                await apiService.deleteATPsByTPId(tpData.id!);
                await apiService.deleteTP(tpData.id!);
                if (selectedSubject) await loadTPsForSubject(selectedSubject);
                setAuthPrompt(null);
            }
        } else if (authPrompt.type === 'atp') {
            const atpToProcess = authPrompt.data as ATPData;
            if (authPrompt.action === 'edit') {
                setEditingATP(atpToProcess);
                setView('edit_atp');
                setAuthPrompt(null);
            } else if (authPrompt.action === 'delete') {
                if (!atpToProcess?.id) {
                    setAtpError("ID ATP tidak ditemukan. Tidak dapat menghapus.");
                    setAuthPrompt(null);
                    return;
                }

                setAtpError(null);
                const originalAtps = [...atps];
                
                setAtps(currentAtps => currentAtps.filter(atp => atp.id !== atpToProcess.id));
                setAuthPrompt(null); 

                try {
                    await apiService.deleteATP(atpToProcess.id);
                    if (selectedTP?.id) {
                        await loadATPsForTP(selectedTP.id);
                    }
                } catch (error: any) {
                    setAtps(originalAtps); 
                    setAuthError(`Gagal menghapus ATP di server: ${error.message}`);
                }
            }
        }
    } catch (error: any) {
        setAuthError(error.message);
    } finally {
        setIsAuthorizing(false);
    }
  };
  
  const handleNavigateToAtpList = (tp: TPData) => {
    setSelectedTP(tp);
    setAtps([]);
    setAtpError(null);
    setView('view_atp_list');
  };

  const handleViewAtpDetail = (atp: ATPData) => {
    setSelectedATP(atp);
    setView('view_atp_detail');
  };

  const _proceedWithAtpGeneration = async () => {
    if (!selectedTP) return;
    
    setIsGeneratingAtp(true);
    setAtpError(null);
    setAtpLoadingMessage(ATP_LOADING_MESSAGES[0]);

    let messageIndex = 0;
    atpMessageIntervalRef.current = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % ATP_LOADING_MESSAGES.length;
        setAtpLoadingMessage(ATP_LOADING_MESSAGES[messageIndex]);
    }, 3000);
    
    try {
        const generatedContent = await generateATP(selectedTP);
        const newAtpData: Omit<ATPData, 'id' | 'createdAt'> = {
            tpId: selectedTP.id!,
            subject: selectedTP.subject,
            content: generatedContent,
            creatorName: selectedTP.creatorName,
        };
        const savedAtp = await apiService.saveATP(newAtpData);
        await loadATPsForTP(selectedTP.id!);
        handleViewAtpDetail(savedAtp);

    } catch (error: any) {
        setAtpError(error.message);
    } finally {
        setIsGeneratingAtp(false);
        if (atpMessageIntervalRef.current) {
            clearInterval(atpMessageIntervalRef.current);
        }
    }
  };

  const handleCreateNewAtp = () => {
      if (!selectedTP) return;
      openAuthModal('create_atp', 'tp', selectedTP);
  };


  const handleSave = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (selectedSubject) {
      setGlobalError(null);
      try {
        if (view === 'create_tp') {
          await apiService.saveTP(data);
        } else if (view === 'edit_tp' && editingTP?.id) {
          // Check if fields that need to be cascaded have changed.
          const nameHasChanged = editingTP.creatorName !== data.creatorName;

          // First, update the main TP record.
          await apiService.updateTP(editingTP.id, data);

          // If the name changed, propagate the update to all associated ATPs.
          if (nameHasChanged && data.creatorName) {
            try {
              const associatedATPs = await apiService.getATPsByTPId(editingTP.id);
              
              if (associatedATPs.length > 0) {
                 const updatePromises = associatedATPs.map(atp => 
                    apiService.updateATP(atp.id, { creatorName: data.creatorName })
                 );
                 await Promise.all(updatePromises);
              }
            } catch (cascadeError: any) {
              console.error("Gagal melakukan sinkronisasi update ke ATP terkait:", cascadeError);
              // We'll throw a new error to be caught by the outer block,
              // providing more context to the user.
              throw new Error(`TP berhasil diperbarui, tetapi gagal menyinkronkan nama pembuat ke ATP terkait. Silakan coba lagi atau periksa data ATP secara manual. Detail: ${cascadeError.message}`);
            }
          }
        }
        setView('view_tp_list');
        // Data will be reloaded by the useEffect hook for 'view_tp_list'
      } catch (error: any) {
        console.error(error);
        setGlobalError(error.message);
        throw error; // Rethrow to notify the editor component
      }
    }
  };
  
  const handleSaveATP = async (id: string, data: Partial<ATPData>) => {
    if (selectedTP?.id) {
        setAtpError(null);
        try {
            await apiService.updateATP(id, data);
            setView('view_atp_list'); // Go back to the list after saving
            // Data will be reloaded by the useEffect hook for 'view_atp_list'
        } catch (error: any) {
            console.error(error);
            setAtpError(error.message);
            throw error; // Propagate error to the editor to display it
        }
    }
  };

  const handleCopy = (text: string, message: string = 'Teks berhasil disalin!') => {
    navigator.clipboard.writeText(text).then(() => {
        setCopyNotification(message);
        setTimeout(() => setCopyNotification(''), 2000);
    }, (err) => {
        console.error('Gagal menyalin teks: ', err);
        setCopyNotification('Gagal menyalin.');
        setTimeout(() => setCopyNotification(''), 2000);
    });
  };

  const handleExportAtpToWord = () => {
    if (!selectedATP || !selectedTP) return;

    // Create a map from TP text to its hierarchical code (e.g., "1.1")
    const tpCodeMap = new Map<string, string>();
    if (selectedTP) {
      let materiPokokNumber = 1;
      selectedTP.tpGroups.forEach(group => {
        let tpCounterWithinGroup = 1;
        group.subMateriGroups.forEach(subGroup => {
          subGroup.tps.forEach(tpText => {
            tpCodeMap.set(tpText, `${materiPokokNumber}.${tpCounterWithinGroup++}`);
          });
        });
        materiPokokNumber++;
      });
    }

    const styles = `
        <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h1, h2 { font-family: 'Times New Roman', Times, serif; }
        </style>
    `;

    let tableRows = '';
    selectedATP.content.forEach((row, index) => {
        const tpCode = tpCodeMap.get(row.tp) || row.atpSequence;
        tableRows += '<tr>';
        tableRows += `<td style="text-align: center;">${index + 1}</td>`;
        tableRows += `<td>${row.cp}</td>`;
        tableRows += `<td>${row.topikMateri}</td>`;
        tableRows += `<td>${row.tp}</td>`;
        tableRows += `<td style="text-align: center; font-weight: bold;">${tpCode}</td>`;
        tableRows += `<td>${row.semester}</td>`;
        tableRows += '</tr>';
    });

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            ${styles}
        </head>
        <body>
            <h1 style="text-align: center;">ALUR TUJUAN PEMBELAJARAN (ATP)</h1>
            <br/>
            <h2>Mata Pelajaran: ${selectedATP.subject}</h2>
            <h2>Kelas: ${selectedTP.grade}</h2>
            <h2>Nama Guru: ${selectedATP.creatorName}</h2>
            <br/>
            <table>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Capaian Pembelajaran (CP)</th>
                        <th>Topik Materi</th>
                        <th>Tujuan Pembelajaran (TP)</th>
                        <th>Kode TP</th>
                        <th>Semester</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `ATP_${selectedATP.subject.replace(/ /g, '_')}_Kelas_${selectedTP.grade}.doc`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setCopyNotification('File Word berhasil diunduh!');
    setTimeout(() => setCopyNotification(''), 2000);
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
                                                            <button onClick={() => handleCopy(item, 'Tujuan Pembelajaran berhasil disalin!')} title="Salin TP" className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
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
                        onClick={() => handleNavigateToAtpList(selectedTP)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        <FlowChartIcon className="w-5 h-5" />
                        Lihat Alur Tujuan Pembelajaran (ATP)
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Dibuat oleh: <span className="font-medium text-slate-700">{creatorName}</span></p>
                    <p className="text-sm text-slate-500">Sumber CP: <span className="font-medium text-slate-700">{cpSourceVersion || '-'}</span></p>
                    <p className="text-sm text-slate-500">Tanggal Dibuat: <span className="font-medium text-slate-700">{new Date(createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'})}</span></p>
                    <p className="text-sm text-slate-500">Kelas: <span className="font-medium text-slate-700">{grade}</span></p>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                      <button
                          onClick={(e) => handleEdit(e, selectedTP)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-blue-600 font-semibold rounded-md border border-blue-300 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                          <EditIcon className="w-4 h-4" />
                          Edit
                      </button>
                  </div>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={() => setIsCpInfoVisible(!isCpInfoVisible)}
                  className="flex items-center gap-2 text-teal-600 hover:text-teal-800 font-semibold text-sm w-full text-left p-2 rounded-md hover:bg-teal-50"
                  aria-expanded={isCpInfoVisible}
                >
                  {isCpInfoVisible ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                  <span>{isCpInfoVisible ? 'Sembunyikan' : 'Tampilkan'} Detail CP & Catatan</span>
                </button>
              </div>

              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCpInfoVisible ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <div className="mb-4">
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
              </div>
              
              <div className="border-t mt-4 pt-4">
                  <SemesterDisplay title="Semester Ganjil" groups={ganjilTPs} />
                  <SemesterDisplay title="Semester Genap" groups={genapTPs} numberingOffset={ganjilMateriCount} />
              </div>
            </div>
          </div>
        );

      case 'view_atp_list':
        if (!selectedTP) return null;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setView('view_tp_detail')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"><BackIcon className="w-5 h-5" /> Kembali ke Detail TP</button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Daftar Alur Tujuan Pembelajaran (ATP)</h1>
                <p className="text-slate-500">Mapel: {selectedTP.subject} | Kelas: {selectedTP.grade}</p>
              </div>
              <button onClick={handleCreateNewAtp} disabled={isGeneratingAtp} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400">
                  <SparklesIcon className="w-5 h-5"/> Buat ATP Baru dengan AI
              </button>
            </div>
            
             {atpError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                  <div className="flex">
                      <div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div>
                      <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Terjadi Kesalahan</h3>
                          <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{atpError}</p></div>
                      </div>
                  </div>
                  <button onClick={() => setAtpError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
              </div>
            )}
            
            {dataLoading ? (
              <div className="text-center py-16"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-slate-600">Memuat data ATP...</p></div>
            ) : atps.length === 0 && !atpError ? (
              <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md"><h3 className="text-xl font-semibold text-slate-700">Belum Ada ATP</h3><p className="text-slate-500 mt-2">Belum ada ATP yang dibuat untuk set TP ini.</p><p className="text-slate-500">Silakan klik tombol "Buat ATP Baru" untuk memulai.</p></div>
            ) : (
                <div className="space-y-4">
                  {atps.map(atp => (
                      <div key={atp.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl p-4 flex justify-between items-center">
                         <div onClick={() => handleViewAtpDetail(atp)} className="cursor-pointer flex-grow hover:text-teal-600">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                <span>Dibuat pada: <span className="font-medium text-slate-600">{new Date(atp.createdAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short'})}</span></span>
                                <span>Oleh: <span className="font-medium text-slate-600">{atp.creatorName}</span></span>
                            </div>
                         </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                              <button onClick={(e) => handleEditATP(e, atp)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full" title="Edit ATP"><EditIcon className="w-5 h-5"/></button>
                              <button onClick={(e) => handleDeleteATP(e, atp)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="Hapus ATP"><TrashIcon className="w-5 h-5"/></button>
                          </div>
                      </div>
                  ))}
                </div>
            )}
          </div>
        );
      
      case 'view_atp_detail':
        if (!selectedATP || !selectedTP) return null;

        // Create a map from TP text to its hierarchical code (e.g., "1.1")
        const tpCodeMap = new Map<string, string>();
        if (selectedTP) {
          let materiPokokNumber = 1;
          selectedTP.tpGroups.forEach(group => {
            let tpCounterWithinGroup = 1;
            group.subMateriGroups.forEach(subGroup => {
              subGroup.tps.forEach(tpText => {
                tpCodeMap.set(tpText, `${materiPokokNumber}.${tpCounterWithinGroup++}`);
              });
            });
            materiPokokNumber++;
          });
        }

        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <button onClick={() => setView('view_atp_list')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                        <BackIcon className="w-5 h-5" />
                        Kembali ke Daftar ATP
                    </button>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExportAtpToWord} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                           <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none print:border">
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Alur Tujuan Pembelajaran (ATP)</h1>
                    <p className="text-slate-500 mb-4">Mata Pelajaran: <span className="font-semibold text-teal-600">{selectedATP.subject}</span> | Dibuat: <span className="font-semibold text-teal-600">{new Date(selectedATP.createdAt).toLocaleDateString('id-ID')}</span></p>
                    
                    <div className="overflow-x-auto mt-4 border-t pt-4">
                        <table className="min-w-full bg-white border border-slate-300 text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2 border-b border-slate-300 w-12 text-center">No.</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-1/4">Capaian Pembelajaran (CP)</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-1/6">Topik Materi</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-1/3">Tujuan Pembelajaran (TP)</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-20 text-center">Kode TP</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-24">Semester</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {selectedATP.content.map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 align-top border-r text-center">{index + 1}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.cp}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.topikMateri}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.tp}</td>
                                        <td className="px-3 py-2 align-top border-r text-center font-semibold">{tpCodeMap.get(row.tp) || row.atpSequence}</td>
                                        <td className="px-3 py-2 align-top">{row.semester}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
      case 'edit_atp':
        if (!editingATP) return null;
        return <ATPEditor 
          initialData={editingATP}
          onSave={handleSaveATP}
          onCancel={() => setView('view_atp_list')}
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
            <div className="text-sm text-slate-600 mb-4">
                <p>
                  Untuk {
                    authPrompt.action === 'create_atp' ? 'membuat ATP baru dari TP ini' :
                    authPrompt.action === 'edit' ? `mengedit data ${authPrompt.type.toUpperCase()} ini` :
                    `menghapus data ${authPrompt.type.toUpperCase()} ini`
                  }, silakan masukkan email guru yang membuatnya: <span className="font-semibold">{authPrompt.type === 'tp' ? (authPrompt.data as TPData).creatorName : selectedTP?.creatorName}</span>.
                </p>
                {authPrompt.action === 'delete' && authPrompt.type === 'tp' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="font-bold text-red-800">Peringatan Penting</p>
                        <p className="text-red-700">Menghapus TP ini juga akan menghapus <strong>semua Alur Tujuan Pembelajaran (ATP)</strong> yang terkait secara permanen. Tindakan ini tidak dapat diurungkan.</p>
                    </div>
                )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAuthSubmit(); }}>
                <input
                    type="email"
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    placeholder="Masukkan email pembuat"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    autoFocus
                    disabled={isAuthorizing}
                />
                {authError && (
                  <p className="text-red-600 text-sm mt-2">{authError}</p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={() => setAuthPrompt(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300" disabled={isAuthorizing}>
                    Batal
                    </button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 disabled:cursor-wait w-32 text-center" disabled={isAuthorizing}>
                      {isAuthorizing ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                      ) : (
                          'Konfirmasi'
                      )}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
      
      {isGeneratingAtp && (
         <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex flex-col justify-center items-center z-50 p-4 text-center">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
                <SparklesIcon className="w-16 h-16 text-teal-500 mx-auto animate-pulse" />
                <h3 className="text-2xl font-bold text-slate-800 mt-4">AI sedang bekerja...</h3>
                <p className="text-slate-600 mt-2">Harap tunggu sejenak, proses ini bisa memakan waktu hingga satu menit.</p>
                <div className="mt-6 h-16 flex items-center justify-center">
                  <p key={atpLoadingMessage} className="text-teal-700 font-semibold animate-fade-in">
                      {atpLoadingMessage}
                  </p>
                </div>
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