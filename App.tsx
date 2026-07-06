import React, { useState, useEffect, useCallback } from 'react';
import { View, TPData, TPGroup, ATPData, ATPTableRow, PROTAData, KKTPData, PROSEMData } from './types';
import * as apiService from './services/dbService';
import * as geminiService from './services/geminiService';
import SubjectSelector from './components/SubjectSelector';
import SubjectDashboard from './components/SubjectDashboard';
import TPMenu from './components/TPMenu';
import TPEditor from './components/TPEditor';
import ATPEditor from './components/ATPEditor';
import LoadingOverlay from './components/LoadingOverlay';
import { PlusIcon, EditIcon, TrashIcon, BackIcon, ClipboardIcon, AlertIcon, CloseIcon, FlowChartIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, DownloadIcon, BookOpenIcon, ChecklistIcon, CalendarIcon, ListIcon, SaveIcon } from './components/icons';

import Login from './components/Login';
import ManageAccess from './components/ManageAccess';
import { AdminSettings } from './components/AdminSettings';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, auth } from './services/authService';

const Header: React.FC<{ userEmail?: string | null; currentView: string; onViewChange: (v: string) => void; onLogin: () => void }> = ({ userEmail, currentView, onViewChange, onLogin }) => {
  return (
    <header className="bg-slate-800 shadow-lg w-full sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center cursor-pointer" onClick={() => onViewChange('select_subject')}>
            <div className="flex-shrink-0">
               <img 
                 src="https://id.ppdb.mtsn4jombang.org/assets/img/logo/logo_ppdb695.png" 
                 alt="Logo MTsN 4 Jombang" 
                 className="h-12 w-auto"
               />
            </div>
            <div className="ml-4 hidden sm:block">
              <span className="block text-base sm:text-xl font-extrabold text-white tracking-wide uppercase">
                Asisten Guru (AGRU)
              </span>
              <span className="block text-sm text-slate-300">
                Tahun Pelajaran 2025/2026
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (<>
              <button
                onClick={() => onViewChange(currentView === 'view_admin_settings' ? 'select_subject' : 'view_admin_settings')}
                className="text-xs md:text-sm font-bold bg-amber-500 text-white px-2 py-1 md:px-3 md:py-1.5 rounded hover:bg-amber-600 transition"
              >
                {currentView === 'view_admin_settings' ? 'Kembali' : 'API'}
              </button>
              <button
                onClick={() => onViewChange(currentView === 'manage_access' ? 'select_subject' : 'manage_access')}
                className="text-xs md:text-sm font-bold bg-teal-500 text-white px-2 py-1 md:px-3 md:py-1.5 rounded hover:bg-teal-600 transition"
              >
                {currentView === 'manage_access' ? 'Kembali' : 'Users'}
              </button>
            </>)}
            {userEmail ? (
                <div className="flex items-center gap-3">
                  <span className="hidden md:block text-slate-300 text-xs">{userEmail}</span>
                  <button
                   onClick={() => signOut(auth).then(() => window.location.reload())}
                   className="text-sm font-medium border border-slate-600 rounded-md px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  Sign out
                </button>
                </div>
            ) : (
                <button
                   onClick={onLogin}
                   className="text-sm font-medium border border-teal-500 bg-teal-600 rounded-md px-4 py-1.5 text-white hover:bg-teal-700 transition flex items-center space-x-2"
                >
                  <span>Login Guru</span>
                </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Updated SemesterDisplay component to include accordion functionality
const SemesterDisplay: React.FC<{ title: string; groups: TPGroup[]; numberingOffset?: number, onCopy: (text: string, message?: string) => void }> = ({ title, groups, numberingOffset = 0, onCopy }) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    const handleToggleGroup = (index: number) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    if (groups.length === 0) return null;
    
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-700 border-b-2 border-teal-500 pb-2 mb-4">{title}</h2>
            <div className="space-y-4">
                {groups.map((group, groupIndex) => {
                    let tpCounterWithinGroup = 1;
                    const materiPokokNumber = groupIndex + 1 + numberingOffset;
                    const isExpanded = expandedGroups.has(groupIndex);

                    return (
                      <div key={groupIndex} className="rounded-lg bg-white border">
                          <button 
                            onClick={() => handleToggleGroup(groupIndex)}
                            className="w-full flex justify-between items-center text-left p-4 hover:bg-slate-50 transition-colors rounded-t-lg"
                            aria-expanded={isExpanded}
                            aria-controls={`content-${title}-${groupIndex}`}
                          >
                            <h3 className="text-xl font-bold text-slate-800">Materi Pokok {materiPokokNumber}: <span className="font-normal">{group.materi}</span></h3>
                            {isExpanded ? 
                                <ChevronUpIcon className="w-6 h-6 text-slate-500 flex-shrink-0" /> : 
                                <ChevronDownIcon className="w-6 h-6 text-slate-500 flex-shrink-0" />
                            }
                          </button>
                          
                          <div
                            id={`content-${title}-${groupIndex}`}
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[3000px]' : 'max-h-0'}`}
                          >
                            <div className="p-4 border-t">
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
                                                                  <button onClick={() => onCopy(item, 'Tujuan Pembelajaran berhasil disalin!')} title="Salin TP" className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
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
                          </div>
                      </div>
                    )
                })}
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Fallback if Firebase auth listener fails to respond
    const timeoutId = setTimeout(() => {
       if (isMounted) {
           console.warn("Auth check timed out.");
           setAuthChecking(false);
       }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutId);
      if (!isMounted) return;
      setUser(currentUser);
      if (!currentUser && isMounted) {
          setAuthChecking(false);
      }
    });

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
        unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
        setIsApproved(false);
        setAuthChecking(false);
        return;
    }
    
    // Bypass approval - all logged in users are approved
    setIsApproved(true);
    setAuthChecking(false);
  }, [user]);

  const [view, setView] = useState<View | 'manage_access'>('select_subject');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [tps, setTps] = useState<TPData[]>([]);
  const [selectedTP, setSelectedTP] = useState<TPData | null>(null);
  const [editingTP, setEditingTP] = useState<TPData | null>(null);
  const [loadingState, setLoadingState] = useState({ isLoading: false, title: '', message: '' });
  const [isSubjectDashboardLoading, setIsSubjectDashboardLoading] = useState(false);
  const isAdmin = user?.email?.toLowerCase().trim() === 'rinomasstbi@gmail.com';

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const [isTPMenuLoading, setIsTPMenuLoading] = useState(false);
  const [copyNotification, setCopyNotification] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [transientMessage, setTransientMessage] = useState<string | null>(null);
  
  // State for collapsible CP info section
  const [isCpInfoVisible, setIsCpInfoVisible] = useState(false);
  
  // State for ATP Management
  const [atps, setAtps] = useState<ATPData[]>([]);
  const [selectedATP, setSelectedATP] = useState<ATPData | null>(null);
  const [editingATP, setEditingATP] = useState<ATPData | null>(null);
  const [atpError, setAtpError] = useState<string | null>(null);
  
  // State for PROTA Management
  const [protas, setProtas] = useState<PROTAData[]>([]);
  const [protaError, setProtaError] = useState<string | null>(null);
  const [isProtaJpModalOpen, setIsProtaJpModalOpen] = useState(false);
  const [protaJpInput, setProtaJpInput] = useState<number | ''>('');

  // State for KKTP Management
  const [kktpData, setKktpData] = useState<{ ganjil: KKTPData | null; genap: KKTPData | null } | null>(null);
  const [kktpError, setKktpError] = useState<string | null>(null);
  const [kktpGenerationProgress, setKktpGenerationProgress] = useState({ isLoading: false, message: '' });
  const [activeKktpSemester, setActiveKktpSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

  // State for PROSEM Management
  const [prosemData, setProsemData] = useState<{ ganjil: PROSEMData | null; genap: PROSEMData | null } | null>(null);
  const [prosemError, setProsemError] = useState<string | null>(null);
  const [prosemGenerationProgress, setProsemGenerationProgress] = useState({ isLoading: false, message: '' });
  const [activeProsemSemester, setActiveProsemSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');


  // State for AI generation progress
  const [atpGenerationProgress, setAtpGenerationProgress] = useState({ isLoading: false, message: '', progress: 0 });
  const [protaGenerationProgress, setProtaGenerationProgress] = useState({ isLoading: false, message: '', progress: 0 });
  
  const SELECTED_SUBJECT_KEY = 'mtsn4jombang_selected_subject';
  const tpsCache = React.useRef<Record<string, TPData[]>>({});

  const loadTPsForSubject = useCallback(async (subject: string) => {
    const cachedData = tpsCache.current[subject];
    if (cachedData !== undefined) {
        setTps(cachedData);
        return; // Skip network call if we have cached data (even if empty)
    }
    
    setIsSubjectDashboardLoading(true);
    setGlobalError(null);
    try {
      const data = await apiService.getTPsBySubject(subject);
      setTps(data);
      tpsCache.current[subject] = data;
    } catch (error: any) {
      console.error(error);
      setGlobalError(error.message);
      setTps([]); 
    } finally {
      setIsSubjectDashboardLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (selectedSubject && (view === 'subject_dashboard' || view === 'view_tp_list')) {
        loadTPsForSubject(selectedSubject);
    }
  }, [selectedSubject, view, loadTPsForSubject]);
  
  useEffect(() => {
      const savedSubject = localStorage.getItem(SELECTED_SUBJECT_KEY);
      if (savedSubject) {
        setSelectedSubject(savedSubject);
        setView('subject_dashboard');
      }
  }, []);

  const loadATPsForTP = useCallback(async (tpId: string) => {
    setLoadingState({ isLoading: true, title: 'Memuat Data ATP', message: 'Sedang mengambil daftar Alur Tujuan Pembelajaran dari server...' });
    setAtpError(null);
    try {
      const data = await apiService.getATPsByTPId(tpId);
      setAtps(data);
    } catch (error: any) {
      console.error(error);
      setAtpError(error.message);
      setAtps([]);
    } finally {
      setLoadingState({ isLoading: false, title: '', message: '' });
    }
  }, []);

  const loadPROTAsForTP = useCallback(async (tpId: string) => {
    setLoadingState({ isLoading: true, title: 'Memuat Data PROTA', message: 'Memeriksa Program Tahunan yang ada...' });
    setProtaError(null);
    try {
      const data = await apiService.getPROTAsByTPId(tpId);
      setProtas(data);
    } catch (error: any) {
      console.error(error);
      setProtaError(error.message);
      setProtas([]);
    } finally {
      setLoadingState({ isLoading: false, title: '', message: '' });
    }
  }, []);
  
    // New effect to load all device statuses when entering the TP menu
  useEffect(() => {
    const loadAllDeviceStatus = async (tpId: string) => {
        setIsTPMenuLoading(true);

        try {
            const [atpsResult, protasResult] = await Promise.allSettled([
                apiService.getATPsByTPId(tpId),
                apiService.getPROTAsByTPId(tpId)
            ]);

            let atpsData: ATPData[] = [];
            let protasData: PROTAData[] = [];

            if (atpsResult.status === 'fulfilled') {
                atpsData = atpsResult.value;
                setAtps(atpsData);
            } else {
                console.error("Gagal memuat ATP:", atpsResult.reason);
                setAtpError("Gagal memuat data ATP.");
            }

            if (protasResult.status === 'fulfilled') {
                protasData = protasResult.value;
                setProtas(protasData);
            } else {
                console.error("Gagal memuat PROTA:", protasResult.reason);
                setProtaError("Gagal memuat data PROTA.");
            }

            const dependentPromises = [];

            if (atpsData.length > 0) {
                dependentPromises.push((async () => {
                    try {
                        const kktpsData = await apiService.getKKTPsByATPId(atpsData[0].id);
                        setKktpData(kktpsData.length > 0 ? {
                            ganjil: kktpsData.find(k => k.semester === 'Ganjil') || null,
                            genap: kktpsData.find(k => k.semester === 'Genap') || null,
                        } : null);
                    } catch (e) {
                         console.error("Gagal memuat KKTP:", e);
                    }
                })());
            } else {
                setKktpData(null);
            }

            if (protasData.length > 0) {
                dependentPromises.push((async () => {
                    try {
                        const prosemDataResult = await apiService.getPROSEMByProtaId(protasData[0].id);
                        setProsemData(prosemDataResult.length > 0 ? {
                            ganjil: prosemDataResult.find(p => p.semester === 'Ganjil') || null,
                            genap: prosemDataResult.find(p => p.semester === 'Genap') || null,
                        } : null);
                    } catch (e) {
                        console.error("Gagal memuat PROSEM:", e);
                    }
                })());
            } else {
                setProsemData(null);
            }

            await Promise.allSettled(dependentPromises);

        } catch (error: any) {
            setGlobalError(error.message);
            setAtps([]);
            setProtas([]);
            setKktpData(null);
            setProsemData(null);
        } finally {
            setIsTPMenuLoading(false);
        }
    };

    if (view === 'tp_menu' && selectedTP?.id) {
        loadAllDeviceStatus(selectedTP.id);
    }
  }, [view, selectedTP]);


  const handleSelectSubject = (subject: string) => {
    localStorage.setItem(SELECTED_SUBJECT_KEY, subject);
    setTps([]);
    setGlobalError(null);
    setSelectedSubject(subject);
    setView('subject_dashboard'); 
  };
  
  const handleBackToSubjects = () => {
    localStorage.removeItem(SELECTED_SUBJECT_KEY);
    setSelectedSubject(null);
    setTps([]);
    setGlobalError(null);
    setView('select_subject');
  };

  const handleCreateNew = () => {
    if (!user) {
        setShowLoginModal(true);
        return;
    }
    setEditingTP(null);
    setView('create_tp');
  };

  const handleSelectTP = (tp: TPData) => {
    setSelectedTP(tp);
    // Reset related data before entering menu to ensure fresh load via useEffect
    setAtps([]);
    setProtas([]);
    setKktpData(null);
    setProsemData(null);
    setView('tp_menu');
  };

  const _performDeleteATP = async (atpToDelete: ATPData) => {
    if (!selectedTP?.id) return;

    // Optimistic Update
    setAtps(prev => prev.filter(a => a.id !== atpToDelete.id));
    setTransientMessage('Data ATP berhasil dihapus.');

    try {
        // Step 1: Attempt to delete dependencies (KKTPs) first.
        try {
             apiService.deleteKKTPsByATPId(atpToDelete.id).catch(console.warn);
        } catch (kktpErr) {
            console.warn("Info: Gagal menghapus KKTP terkait otomatis:", kktpErr);
        }

        // Step 2: Delete the ATP itself
        apiService.deleteATP(atpToDelete.id).catch(console.warn);
        
        // We do not await loadATPsForTP since it will fetch in background
    } catch (error: any) {
        console.error("Delete ATP Error:", error);
        setAtpError(`Gagal menghapus ATP. Detail: ${error.message}`);
        loadATPsForTP(selectedTP.id).catch(() => {});
    }
  };

  const handleEdit = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    setEditingTP(tp);
    setView('edit_tp');
  };

  const handleDelete = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    showConfirm(
      'Hapus Data TP',
      'Apakah Anda yakin ingin menghapus data TP ini?',
      () => {
        // Optimistic update
        setTps(prev => prev.filter(t => t.id !== tp.id));
        if (selectedSubject) {
            const cached = tpsCache.current[selectedSubject];
            if (cached) {
                tpsCache.current[selectedSubject] = cached.filter(t => t.id !== tp.id);
            }
            setView('subject_dashboard');
        }

        apiService.deleteATPsByTPId(tp.id!).catch(console.warn);
        apiService.deletePROTAsByTPId(tp.id!).catch(console.warn);
        apiService.deleteKKTPsByTPId(tp.id!).catch(console.warn);
        apiService.deletePROSEMsByTPId(tp.id!).catch(console.warn);
        apiService.deleteTP(tp.id!).catch(console.warn);
        closeConfirm();
      }
    );
  };
  
  const handleEditATP = (e: React.MouseEvent, atp: ATPData) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedTP) return;
    setEditingATP(atp);
    setView('edit_atp');
  };

  const handleDeleteATP = (e: React.MouseEvent, atp: ATPData) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedTP) return;
    showConfirm(
        'Hapus Data ATP',
        'Apakah Anda yakin ingin menghapus data ATP ini? Tindakan ini tidak dapat diurungkan.',
        () => {
            _performDeleteATP(atp);
            closeConfirm();
        }
    );
  };
  
  const handleDeleteAndRegenerateKKTP = async (semester: 'Ganjil' | 'Genap') => {
    const dataToDelete = semester === 'Ganjil' ? kktpData?.ganjil : kktpData?.genap;
    if (!dataToDelete || !selectedATP) {
        return;
    }

    showConfirm(
        'Buat Ulang KKTP',
        `Apakah Anda yakin ingin membuat ulang KKTP Semester ${semester}? Data lama akan dihapus dan dibuat baru oleh AI.`,
        async () => {
            closeConfirm();
            setKktpGenerationProgress({ isLoading: true, message: `Membuat ulang KKTP Semester ${semester}...` });
            setKktpError(null);

            try {
                await apiService.deleteKKTP(dataToDelete.id);
                
                const newContent = await geminiService.generateKKTP(selectedATP, semester, selectedTP?.grade || '7');
        
        let savedData: KKTPData | null = null;
        if (newContent.length > 0) {
            const payload: Omit<KKTPData, 'id' | 'createdAt' | 'userId'> = { 
                atpId: selectedATP.id, 
                subject: selectedATP.subject, 
                grade: selectedTP?.grade || '7', 
                semester: semester, 
                content: newContent 
            };
            savedData = await apiService.saveKKTP(payload);
        }
        
        setKktpData(prev => ({
            ...prev,
            [semester.toLowerCase()]: savedData
        } as any));
        
        setTransientMessage(`KKTP Semester ${semester} berhasil dibuat ulang.`);
            } catch (error: any) {
                console.error("Regenerate KKTP Error:", error);
                setKktpError(`Gagal membuat ulang KKTP: ${error.message}`);
            } finally {
                setKktpGenerationProgress({ isLoading: false, message: '' });
            }
        }
    );
  };

  const handleNavigateToAtpList = (tp: TPData) => {
    setSelectedTP(tp);
    setAtps([]);
    setAtpError(null);
    setTransientMessage(null);
    setView('view_atp_list');
  };

  const handleViewAtpDetail = (atp: ATPData) => {
    setSelectedATP(atp);
    setActiveKktpSemester('Ganjil'); // Reset state
    setView('view_atp_detail');
  };

  const _proceedWithAtpGeneration = async (creatorName: string, creatorEmail: string) => {
      if (!selectedTP) return;
      setAtpGenerationProgress({ isLoading: true, message: 'Memulai proses...', progress: 0 });
      setAtpError(null);
      try {
          setAtpGenerationProgress(prev => ({ ...prev, message: 'Menghubungi AI untuk membuat draf ATP...', progress: 25 }));
          const generatedContent = await geminiService.generateATP({
              subject: selectedTP.subject,
              grade: selectedTP.grade,
              tpGroups: selectedTP.tpGroups
          });
          setAtpGenerationProgress(prev => ({ ...prev, message: 'Draf ATP diterima. Menyimpan ke database...', progress: 60 }));
          const newAtpData: Omit<ATPData, 'id' | 'createdAt' | 'userId'> = {
              tpId: selectedTP.id!,
              subject: selectedTP.subject,
              content: generatedContent,
              creatorName: creatorName,
              creatorEmail: creatorEmail,
          };
          const savedAtp = await apiService.saveATP(newAtpData);
          setAtpGenerationProgress(prev => ({ ...prev, message: 'Data berhasil disimpan.', progress: 90 }));
          setAtps(prev => [...prev, savedAtp]);
          setAtpGenerationProgress(prev => ({ ...prev, message: 'Selesai!', progress: 100 }));
          setTimeout(() => {
              handleViewAtpDetail(savedAtp);
              setAtpGenerationProgress({ isLoading: false, message: '', progress: 0 });
          }, 500);
      } catch (error: any) {
          setAtpError(error.message);
          setAtpGenerationProgress({ isLoading: false, message: '', progress: 0 });
      }
  };

  const handleCreateNewAtp = () => {
    if (!selectedTP) return;
    _proceedWithAtpGeneration(user?.displayName || user?.email || "User", user?.email || "");
  };
  
  const handleCreateNewProta = () => {
    setProtaJpInput('');
    setIsProtaJpModalOpen(true);
  };

  const handleProtaGenerationSubmit = async () => {
    if (!selectedTP || !selectedATP || !protaJpInput || protaJpInput < 1) {
        setProtaError("Harap pilih ATP yang valid dan masukkan jumlah JP (minimal 1).");
        setIsProtaJpModalOpen(false);
        return;
    }
    
    setIsProtaJpModalOpen(false);
    setProtaGenerationProgress({ isLoading: true, message: 'Memulai proses...', progress: 0 });
    setProtaError(null);

    try {
        setProtaGenerationProgress(prev => ({ ...prev, message: 'Menghubungi AI untuk membuat draf PROTA...', progress: 25 }));
        const generatedContent = await geminiService.generatePROTA(selectedATP, protaJpInput);

        setProtaGenerationProgress(prev => ({ ...prev, message: 'Draf PROTA diterima. Menyimpan ke database...', progress: 60 }));
        const newProtaData: Omit<PROTAData, 'id' | 'createdAt' | 'userId'> = {
            tpId: selectedTP.id!,
            subject: selectedTP.subject,
            jamPertemuan: protaJpInput,
            content: generatedContent,
            creatorName: selectedATP.creatorName,
        };
        const savedProta = await apiService.savePROTA(newProtaData);

        setProtaGenerationProgress(prev => ({ ...prev, message: 'Data berhasil disimpan.', progress: 90 }));
        setProtas(prev => [...prev, savedProta]);
        
        setProtaGenerationProgress({ isLoading: false, message: '', progress: 0 });
        setView('view_prota_list');

    } catch (error: any) {
        setProtaError(error.message);
        setProtaGenerationProgress({ isLoading: false, message: '', progress: 0 });
    }
  };

  const handleDeleteAndRegenerateProta = async () => {
    if (!selectedTP) return;
    
    showConfirm(
        'Buat Ulang PROTA & PROSEM',
        'Apakah Anda yakin ingin membuat ulang PROTA & PROSEM? Data lama akan dihapus.',
        async () => {
            closeConfirm();
            setLoadingState({ isLoading: true, title: 'Menghapus PROTA & PROSEM', message: 'Sedang menghapus data PROTA dan PROSEM lama...' });
            setProtaError(null);
            try {
                // We must delete downstream dependencies first. PROSEM depends on PROTA.
                // Both deletion services are keyed by tpId, but this logic is cleaner.
                await apiService.deletePROSEMsByTPId(selectedTP.id!);
                await apiService.deletePROTAsByTPId(selectedTP.id!);
                
                setProtas([]); // Clear state immediately
                setProsemData(null); // Also clear prosem state
        
                // Ensures we go back to the main menu to see the 'Create' button
                setView('tp_menu'); 
                setTransientMessage("PROTA & PROSEM lama telah dihapus. Silakan buat PROTA baru.");
            } catch (error: any) {
                setProtaError(`Gagal menghapus data lama: ${error.message}`);
            } finally {
                setLoadingState({ isLoading: false, title: '', message: '' });
            }
        }
    );
  };

  const handleDeleteAndRegenerateProsem = async () => {
    if (!selectedTP || protas.length === 0) return;
    const protaId = protas[0].id;
    
    showConfirm(
        'Buat Ulang PROSEM',
        'Apakah Anda yakin ingin membuat ulang PROSEM? Data lama akan dihapus.',
        async () => {
            closeConfirm();
            setLoadingState({ isLoading: true, title: 'Menghapus PROSEM', message: 'Sedang menghapus data PROSEM lama...' });
            setProsemError(null);
            try {
                await apiService.deletePROSEMsByPROTAId(protaId);
                setProsemData(null); // Clear state immediately
                await handleNavigateToProsem();
                setTransientMessage("PROSEM lama telah dihapus. Silakan buat yang baru untuk setiap semester.");
            } catch (error: any) {
                setProsemError(`Gagal menghapus PROSEM lama: ${error.message}`);
            } finally {
                setLoadingState({ isLoading: false, title: '', message: '' });
            }
        }
    );
  };

  const handleSave = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (selectedSubject) {
      setGlobalError(null);
      try {
        console.log("App.tsx: handleSave called for view:", view);
        if (view === 'create_tp') {
          console.log("App.tsx: calling apiService.saveTP");
          const savedTP = await apiService.saveTP(data);
          console.log("App.tsx: saveTP returned:", savedTP);
          tpsCache.current[selectedSubject] = undefined; // Invalidate cache
          setSelectedTP(savedTP);
          setView('view_tp_detail');
        } else if (view === 'edit_tp' && editingTP?.id) {
          console.log("App.tsx: calling apiService.updateTP");
          await apiService.updateTP(editingTP.id, data);
          console.log("App.tsx: updateTP completed");
          tpsCache.current[selectedSubject] = undefined; // Invalidate cache
          setView('view_tp_list');
        }
      } catch (error: any) {
        console.error("App.tsx: handleSave caught error:", error);
        setGlobalError(error.message);
        throw error;
      }
    } else {
        console.warn("App.tsx: handleSave called but selectedSubject is empty!");
    }
  };
  
  const handleSaveATP = async (id: string, data: Partial<ATPData>) => {
    if (selectedTP?.id) {
        setAtpError(null);
        try {
            await apiService.updateATP(id, data);
            setView('view_atp_list');
        } catch (error: any) {
            console.error(error);
            setAtpError(error.message);
            throw error;
        }
    }
  };

  const handleViewAndGenerateKktp = async () => {
    if (!selectedTP) {
      setKktpError("Data TP tidak ditemukan.");
      return;
    }
    
    setView('view_kktp');
    setKktpError(null);

    try {
        let atpsForKktp = atps;
        if (atpsForKktp.length === 0) {
            setKktpGenerationProgress({ isLoading: true, message: 'Memuat data KKTP...' });
            atpsForKktp = await apiService.getATPsByTPId(selectedTP.id!);
            setAtps(atpsForKktp);
        }

        if (atpsForKktp.length === 0) {
            setKktpGenerationProgress({ isLoading: false, message: '' }); 
            setTransientMessage('Anda harus membuat ATP terlebih dahulu untuk membuat KKTP.');
            setView('view_atp_list'); 
            return;
        }
        
        const atp = atpsForKktp[0]; 
        setSelectedATP(atp); 

        let finalGanjilData = kktpData?.ganjil || null;
        let finalGenapData = kktpData?.genap || null;

        if (!finalGanjilData && !finalGenapData) {
            setKktpGenerationProgress({ isLoading: true, message: 'Memeriksa KKTP yang ada...' });
            const existingKktps = await apiService.getKKTPsByATPId(atp.id);
            finalGanjilData = existingKktps.find(k => k.semester === 'Ganjil') || null;
            finalGenapData = existingKktps.find(k => k.semester === 'Genap') || null;
        }

        if (!finalGanjilData && !finalGenapData) {
            setKktpGenerationProgress({ isLoading: true, message: 'Membuat KKTP dengan AI...' });

            // Generate Ganjil
            const ganjilContent = await geminiService.generateKKTP(atp, 'Ganjil', selectedTP.grade);
            if (ganjilContent.length > 0) {
              const ganjilPayload: Omit<KKTPData, 'id' | 'createdAt' | 'userId'> = { atpId: atp.id, subject: selectedTP.subject, grade: selectedTP.grade, semester: 'Ganjil', content: ganjilContent };
              finalGanjilData = await apiService.saveKKTP(ganjilPayload);
            }

            // Generate Genap
            const genapContent = await geminiService.generateKKTP(atp, 'Genap', selectedTP.grade);
            if (genapContent.length > 0) {
              const genapPayload: Omit<KKTPData, 'id' | 'createdAt' | 'userId'> = { atpId: atp.id, subject: selectedTP.subject, grade: selectedTP.grade, semester: 'Genap', content: genapContent };
              finalGenapData = await apiService.saveKKTP(genapPayload);
            }
        }
        
        setKktpData({ ganjil: finalGanjilData, genap: finalGenapData });
        setActiveKktpSemester('Ganjil'); // Selalu mulai dari Ganjil
    } catch (error: any) {
        setKktpError(error.message);
    } finally {
        setKktpGenerationProgress({ isLoading: false, message: '' });
    }
  };

  const handleGenerateSingleKktp = async (semester: 'Ganjil' | 'Genap') => {
    if (!selectedTP) return;
    
    setKktpGenerationProgress({ isLoading: true, message: `Membuat KKTP Semester ${semester}...` });
    setKktpError(null);

    try {
        // Pastikan ATP terpilih / dimuat
        let atpToUse = selectedATP;
        if (!atpToUse) {
             // Coba ambil dari list jika ada
             if(atps.length > 0) {
                 atpToUse = atps[0];
             } else {
                 // Coba fetch
                 const atpsForKktp = await apiService.getATPsByTPId(selectedTP.id!);
                 if (atpsForKktp.length > 0) {
                     atpToUse = atpsForKktp[0];
                     setAtps(atpsForKktp); // Update state
                 }
             }
        }
        
        if (!atpToUse) {
            throw new Error("Data ATP tidak ditemukan. Mohon buat ATP terlebih dahulu.");
        }
        
        // Generate content
        const content = await geminiService.generateKKTP(atpToUse, semester, selectedTP.grade);
        
        if (content.length > 0) {
             const payload: Omit<KKTPData, 'id' | 'createdAt' | 'userId'> = { 
                atpId: atpToUse.id, 
                subject: selectedTP.subject, 
                grade: selectedTP.grade, 
                semester: semester, 
                content: content 
            };
            
            // Save to DB
            const savedData = await apiService.saveKKTP(payload);
            
            // Update State
            setKktpData(prev => {
                const newData = { ...(prev || { ganjil: null, genap: null }) };
                if (semester === 'Ganjil') newData.ganjil = savedData;
                else newData.genap = savedData;
                return newData;
            });
            
            setTransientMessage(`KKTP Semester ${semester} berhasil dibuat.`);
        } else {
             throw new Error(`AI tidak menghasilkan konten untuk Semester ${semester}.`);
        }

    } catch (error: any) {
        console.error("Generate Single KKTP Error:", error);
        setKktpError(`Gagal membuat KKTP: ${error.message}`);
    } finally {
        setKktpGenerationProgress({ isLoading: false, message: '' });
    }
  };

  const handleNavigateToProsem = async () => {
    if (!selectedTP) {
      setProsemError("Data TP tidak ditemukan.");
      return;
    }

    setView('view_prosem');
    setProsemError(null);

    try {
        let currentProtas = protas;
        if (currentProtas.length === 0) {
            setProsemGenerationProgress({ isLoading: true, message: 'Memuat data PROTA...' });
            try {
                 const loadedProtas = await apiService.getPROTAsByTPId(selectedTP.id!);
                 setProtas(loadedProtas);
                 currentProtas = loadedProtas;
            } catch (e) {
                console.error("Auto-reload PROTA failed in handleNavigateToProsem", e);
            }
        }

        if (currentProtas.length === 0) {
            setProsemGenerationProgress({ isLoading: false, message: '' });
            setTransientMessage('Anda harus membuat PROTA terlebih dahulu untuk membuat PROSEM.');
            setView('tp_menu');
            return;
        }
        const prota = currentProtas[0];

        let ganjilData = prosemData?.ganjil || null;
        let genapData = prosemData?.genap || null;
        
        if (!ganjilData && !genapData) {
             setProsemGenerationProgress({ isLoading: true, message: 'Memuat data PROSEM...' });
             const existingProsems = await apiService.getPROSEMByProtaId(prota.id);
             ganjilData = existingProsems.find(p => p.semester === 'Ganjil') || null;
             genapData = existingProsems.find(p => p.semester === 'Genap') || null;
             
             if (ganjilData || genapData) {
                 setProsemData({ ganjil: ganjilData, genap: genapData });
             }
        }
        
        setActiveProsemSemester('Ganjil'); // Default to Ganjil tab

    } catch (error: any) {
        setProsemError(error.message);
        setProsemData({ ganjil: null, genap: null }); // Ensure state is clean on error
    } finally {
        setProsemGenerationProgress({ isLoading: false, message: '' });
    }
  };

  const handleGenerateSingleProsem = async (semester: 'Ganjil' | 'Genap') => {
    if (!selectedTP) return;
    
    // Robustness: Check if protas are loaded, if not try to load them
    let currentProtas = protas;
    if (currentProtas.length === 0) {
        try {
             const loadedProtas = await apiService.getPROTAsByTPId(selectedTP.id!);
             setProtas(loadedProtas);
             currentProtas = loadedProtas;
        } catch (e) {
            setProsemError("Gagal memuat data PROTA yang diperlukan. Silakan refresh halaman.");
            return;
        }
    }

    if (currentProtas.length === 0) {
        setProsemError("Data PROTA tidak ditemukan. PROSEM tidak dapat dibuat.");
        return;
    }
    const prota = currentProtas[0];

    const isSemesterMatch = (itemSem: string, targetSem: string) => {
        if (!itemSem) return false;
        const iLower = String(itemSem).toLowerCase();
        const tLower = String(targetSem).toLowerCase();
        if (iLower === tLower) return true;
        if (tLower === 'ganjil') return ['ganjil', '1', 'gasal', 'odd', 'satu'].some(s => iLower.includes(s));
        if (tLower === 'genap') return ['genap', '2', 'even', 'dua'].some(s => iLower.includes(s));
        return false;
    };

    // Check if specific semester content exists in PROTA
    const hasSemesterContent = prota.content.some(p => 
        isSemesterMatch(p.semester, semester)
    );

    if (!hasSemesterContent) {
        setProsemError(`Tidak ada data PROTA untuk semester ${semester}, jadi PROSEM tidak dapat dibuat.`);
        return;
    }

    setProsemGenerationProgress({ isLoading: true, message: `Membuat PROSEM ${semester}...` });
    setProsemError(null);

    const generateWithRetry = async (semesterToGen: 'Ganjil' | 'Genap') => {
        const MAX_ATTEMPTS = 3;
        const DELAY = 2500;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const message = `Menghubungi AI untuk PROSEM ${semesterToGen}... ${MAX_ATTEMPTS > 1 ? `(Percobaan ${attempt}/${MAX_ATTEMPTS})` : ''}`;
                setProsemGenerationProgress({ isLoading: true, message });
                return await geminiService.generatePROSEM(prota, semesterToGen, selectedTP.grade);
            } catch (error: any) {
                if (typeof error.message === 'string' && error.message.includes("503") && attempt < MAX_ATTEMPTS) {
                    await new Promise(res => setTimeout(res, DELAY));
                    continue; // Retry
                }
                throw error;
            }
        }
        throw new Error(`Gagal menghasilkan PROSEM ${semesterToGen} setelah beberapa kali percobaan.`);
    };

    try {
        const result = await generateWithRetry(semester);
        if (result.content.length > 0) {
            setProsemGenerationProgress({ isLoading: true, message: `Menyimpan PROSEM ${semester}...` });
            const payload: Omit<PROSEMData, 'id' | 'createdAt' | 'userId'> = {
                protaId: prota.id,
                subject: selectedTP.subject,
                grade: selectedTP.grade,
                semester: semester,
                ...result
            };
            const savedData = await apiService.savePROSEM(payload);
            setProsemData(prev => ({
                ...prev,
                [semester.toLowerCase() as 'ganjil' | 'genap']: savedData,
            }));
        } else {
             setProsemError(`AI tidak menghasilkan konten untuk PROSEM ${semester}. Ini mungkin karena tidak ada data PROTA yang relevan.`);
        }
    } catch (error: any) {
        setProsemError(error.message);
    } finally {
        setProsemGenerationProgress({ isLoading: false, message: '' });
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
    
    const styles = `
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
        p, li, h2, h1 { margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin: 0; padding: 0;}
        .header-table { margin-bottom: 15px; }
        .header-table td { border: none; font-size: 12pt; padding: 1px 0; }
        .no-wrap { white-space: nowrap; }
        .text-center { text-align: center; }
        .cp-container { border: 1px solid black; padding: 10px; margin-bottom: 15px; background-color: #f9f9f9; }
        .cp-title { font-size: 12pt; font-weight: bold; margin: 0 0 10px 0; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 1px 5px; }
      </style>
    `;

    const identityTable = `
      <table class="header-table">
        <tr><td class="no-wrap" style="width: 150px; padding-left: 0;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td class="no-wrap" style="padding-left: 0;">Mata Pelajaran</td><td>: ${selectedATP.subject}</td></tr>
        <tr><td class="no-wrap" style="padding-left: 0;">Kelas</td><td>: ${selectedTP.grade} / Fase D</td></tr>
        <tr><td class="no-wrap" style="padding-left: 0;">Tahun Ajaran</td><td>: 2025/2026</td></tr>
      </table>
    `;

    const atpRows = selectedATP.content.map(row => `
      <tr>
        <td class="text-center">${row.atpSequence}</td>
        <td>${row.topikMateri}</td>
        <td>${row.tp}</td>
        <td class="text-center">${row.kodeTp || ''}</td>
        <td class="text-center">${row.semester}</td>
      </tr>
    `).join('');
    
    const cpElementsHtml = `
      <div class="cp-container">
        <p class="cp-title">Capaian Pembelajaran (CP) Acuan</p>
        ${selectedTP.cpElements.map(item => `
          <p style="text-align: justify; margin: 0 0 5px 0;"><span style="font-weight: bold;">${item.element}:</span> ${item.cp}</p>
        `).join('')}
      </div>
    `;

    const mainContent = `
      <p class="title">ALUR TUJUAN PEMBELAJARAN (ATP)</p>
      <br>
      ${identityTable}
      ${cpElementsHtml}
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 5%;">No. ATP</th>
            <th style="width: 25%;">Topik/Materi</th>
            <th style="width: 45%;">Tujuan Pembelajaran (TP)</th>
            <th class="text-center" style="width: 10%;">Kode TP</th>
            <th class="text-center" style="width: 15%;">Semester</th>
          </tr>
        </thead>
        <tbody>
          ${atpRows}
        </tbody>
      </table>
    `;

    const signatureBlock = `
      <div class="signature-table-container">
        <br>
        <table style="width: 100%; border: none; text-align: center;">
          <tbody>
            <tr>
              <td class="signature-td">Mengetahui,</td>
              <td class="signature-td">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td">Kepala Madrasah,</td>
              <td class="signature-td">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">Dr. Aziz Ja'far, S.Th.I., M.Pd.I</td>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${selectedATP.creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td">NIP. 197610062007101008</td>
              <td class="signature-td">NIP. -</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          ${mainContent}
          ${signatureBlock}
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
  
  const handleExportProtaToWord = () => {
    if (protas.length === 0 || !selectedTP) return;
    const currentProta = protas[0];

    const styles = `
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
        p, li, h2, h1 { margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; }
        .header-table { margin-bottom: 15px; }
        .header-table td { border: none; font-size: 12pt; padding: 1px 0; }
        .no-wrap { white-space: nowrap; }
        .text-center { text-align: center; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 1px 5px; }
      </style>
    `;

    const identityTable = `
      <table class="header-table">
        <tr><td class="no-wrap" style="width: 150px;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td class="no-wrap">Mata Pelajaran</td><td>: ${currentProta.subject}</td></tr>
        <tr><td class="no-wrap">Kelas</td><td>: ${selectedTP.grade} / Fase D</td></tr>
        <tr><td class="no-wrap">Tahun Ajaran</td><td>: 2025/2026</td></tr>
      </table>
    `;

    const protaRows = currentProta.content.map(row => `
      <tr>
        <td class="text-center">${row.no}</td>
        <td>${row.topikMateri}</td>
        <td class="text-center">${row.alurTujuanPembelajaran}</td>
        <td>${row.tujuanPembelajaran}</td>
        <td class="text-center">${row.alokasiWaktu}</td>
        <td class="text-center">${row.semester}</td>
      </tr>
    `).join('');

    const totalJp = currentProta.content.reduce((sum, row) => sum + (parseInt(row.alokasiWaktu) || 0), 0);
    
    const totalRow = `
        <tfoot>
            <tr>
                <td colspan="4" style="font-weight: bold; text-align: right; padding-right: 10px;">Total Jam Pertemuan (JP)</td>
                <td class="text-center" style="font-weight: bold;">${totalJp} JP</td>
                <td></td>
            </tr>
        </tfoot>
    `;

    const mainContent = `
      <p class="title">PROGRAM TAHUNAN (PROTA)</p>
      <br>
      ${identityTable}
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 5%;">No</th>
            <th style="width: 20%;">Topik / Materi Pokok</th>
            <th class="text-center" style="width: 10%;">Alur Tujuan Pembelajaran</th>
            <th style="width: 45%;">Tujuan Pembelajaran</th>
            <th class="text-center" style="width: 10%;">Alokasi Waktu</th>
            <th class="text-center" style="width: 10%;">Semester</th>
          </tr>
        </thead>
        <tbody>
          ${protaRows}
        </tbody>
        ${totalRow}
      </table>
    `;
    
    const signatureBlock = `
      <div class="signature-table-container">
        <br>
        <table style="width: 100%; border: none; text-align: center;">
          <tbody>
            <tr>
              <td class="signature-td">Mengetahui,</td>
              <td class="signature-td">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td">Kepala Madrasah,</td>
              <td class="signature-td">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">Sulthon Sulaiman, M.Pd.I</td>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${currentProta.creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td">NIP. 198106162005011003</td>
              <td class="signature-td">NIP. -</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;


    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          ${mainContent}
          ${signatureBlock}
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `PROTA_${currentProta.subject.replace(/ /g, '_')}_Kelas_${selectedTP.grade}.doc`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setCopyNotification('File Word PROTA berhasil diunduh!');
    setTimeout(() => setCopyNotification(''), 2000);
  };

  const handleExportKktpToWord = (semester: 'Ganjil' | 'Genap') => {
    const dataToExport = semester === 'Ganjil' ? kktpData?.ganjil : kktpData?.genap;
    if (!dataToExport || !selectedTP || !selectedATP) return;
    
    const styles = `
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
        p, li, h2, h1 { margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 5px; }
        .header-table { margin-bottom: 15px; width: auto; }
        .header-table td { border: none; font-size: 12pt; padding: 1px 0; }
        .text-center { text-align: center; }
        .kriteria-cell { padding: 0; margin: 0; }
        .kriteria-table { width: 100%; height: 100%; border: none; }
        .kriteria-table td { border: none; border-bottom: 1px solid #dddddd; padding: 4px; }
        .kriteria-table tr:last-child td { border-bottom: none; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 1px 5px; }
      </style>
    `;

    const identityTable = `
      <table class="header-table">
        <tr><td style="padding-right: 10px;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td>Mata Pelajaran</td><td>: ${dataToExport.subject}</td></tr>
        <tr><td>Kelas/Fase</td><td>: ${dataToExport.grade} / Fase D</td></tr>
        <tr><td>Semester</td><td>: ${dataToExport.semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}</td></tr>
      </table>
    `;

    const kktpRows = dataToExport.content.map(row => `
      <tr>
        <td class="text-center" rowspan="4" style="vertical-align: top;">${row.no}</td>
        <td rowspan="4" style="vertical-align: top;">${row.materiPokok}</td>
        <td rowspan="4" style="vertical-align: top;">${row.tp}</td>
        <td>${row.kriteria.sangatMahir}</td>
        <td class="text-center" style="font-family: 'Wingdings 2', 'Zapf Dingbats', sans-serif; font-size: 14pt;">${row.targetKktp === 'sangatMahir' ? 'P' : ''}</td>
      </tr>
      <tr>
        <td>${row.kriteria.mahir}</td>
        <td class="text-center" style="font-family: 'Wingdings 2', 'Zapf Dingbats', sans-serif; font-size: 14pt;">${row.targetKktp === 'mahir' ? 'P' : ''}</td>
      </tr>
      <tr>
        <td>${row.kriteria.cukupMahir}</td>
        <td class="text-center" style="font-family: 'Wingdings 2', 'Zapf Dingbats', sans-serif; font-size: 14pt;">${row.targetKktp === 'cukupMahir' ? 'P' : ''}</td>
      </tr>
       <tr>
        <td>${row.kriteria.perluBimbingan}</td>
        <td class="text-center" style="font-family: 'Wingdings 2', 'Zapf Dingbats', sans-serif; font-size: 14pt;">${row.targetKktp === 'perluBimbingan' ? 'P' : ''}</td>
      </tr>
    `).join('');


    const mainContent = `
      <p class="title">KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)</p>
      <br>
      ${identityTable}
      <table>
        <thead>
          <tr>
            <th style="width: 3%;">No</th>
            <th style="width: 20%;">Materi Pokok</th>
            <th style="width: 32%;">Tujuan Pembelajaran</th>
            <th style="width: 35%;">Kriteria</th>
            <th style="width: 10%;">KKTP</th>
          </tr>
        </thead>
        <tbody>
          ${kktpRows}
        </tbody>
      </table>
    `;
    
    const signatureBlock = `
      <div class="signature-table-container">
        <br>
        <table style="width: 100%; border: none; text-align: center;">
          <tbody>
            <tr>
              <td class="signature-td">Mengetahui,</td>
              <td class="signature-td">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td">Kepala Madrasah,</td>
              <td class="signature-td">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">Sulthon Sulaiman, M.Pd.I</td>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${selectedATP.creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td">NIP. 198106162005011003</td>
              <td class="signature-td">NIP. -</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Note for checkmark: Using 'P' with Wingdings 2 font is a common trick for a checkmark in Word.
    // The user's Word processor needs to have this font. A regular '✓' might not always render correctly.
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          ${mainContent}
          ${signatureBlock}
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `KKTP_${dataToExport.subject.replace(/ /g, '_')}_Kelas_${dataToExport.grade}_${dataToExport.semester}.doc`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setCopyNotification(`File Word KKTP ${semester} berhasil diunduh!`);
    setTimeout(() => setCopyNotification(''), 2000);
  };

  const handleExportProsemToWord = (semester: 'Ganjil' | 'Genap') => {
      const dataToExport = semester === 'Ganjil' ? prosemData?.ganjil : prosemData?.genap;
      if (!dataToExport || !selectedTP || protas.length === 0) return;
      const creatorName = protas[0].creatorName;
  
      const styles = `
        <style>
          @page { size: landscape; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; }
          p, li, h2, h1 { margin: 0; padding: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 3px; text-align: left; vertical-align: middle; }
          th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
          .title { text-align: center; font-weight: bold; font-size: 14pt; }
          .header-table { margin-bottom: 15px; width: auto; }
          .header-table td { border: none; font-size: 12pt; padding: 1px 0; }
          .text-center { text-align: center; }
          .rotate { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
          .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
          .signature-td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 1px 5px; }
        </style>
      `;
  
      const identityTable = `
        <table class="header-table">
          <tr><td style="padding-right: 10px;">Madrasah</td><td>: MTsN 4 Jombang</td></tr>
          <tr><td>Mata Pelajaran</td><td>: ${dataToExport.subject}</td></tr>
          <tr><td>Kelas/Semester</td><td>: ${dataToExport.grade} / ${dataToExport.semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}</td></tr>
          <tr><td>Tahun Pelajaran</td><td>: 2025/2026</td></tr>
        </table>
      `;
  
      const monthHeaders = dataToExport.headers.map(h => `<th colspan="${h.weeks}" class="text-center">${h.month}</th>`).join('');
      const weekHeaders = dataToExport.headers.flatMap(h => Array.from({ length: h.weeks }, (_, i) => `<th class="text-center">${i + 1}</th>`)).join('');
  
      const prosemRows = dataToExport.content.map(row => {
          const weekCells = dataToExport.headers.flatMap(h => 
              row.bulan[h.month]?.map(cell => `<td class="text-center">${cell || ''}</td>`) || Array(h.weeks).fill('<td></td>')
          ).join('');
          return `
              <tr>
                  <td class="text-center">${row.no}</td>
                  <td>${row.tujuanPembelajaran}</td>
                  <td class="text-center">${row.alokasiWaktu}</td>
                  ${weekCells}
                  <td>${row.keterangan}</td>
              </tr>
          `;
      }).join('');
  
      const mainContent = `
        <p class="title">PROGRAM SEMESTER (PROSEM)</p>
        <br>
        ${identityTable}
        <table>
          <thead>
            <tr>
              <th rowspan="2" class="text-center">No</th>
              <th rowspan="2" class="text-center">Tujuan Pembelajaran</th>
              <th rowspan="2" class="text-center rotate">Alokasi Waktu</th>
              ${monthHeaders}
              <th rowspan="2" class="text-center">Keterangan</th>
            </tr>
            <tr>
              ${weekHeaders}
            </tr>
          </thead>
          <tbody>
            ${prosemRows}
          </tbody>
        </table>
      `;
  
      const signatureBlock = `
      <div class="signature-table-container">
        <br>
        <table style="width: 100%; border: none; text-align: center;">
          <tbody>
            <tr>
              <td class="signature-td">Mengetahui,</td>
              <td class="signature-td">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td">Kepala Madrasah,</td>
              <td class="signature-td">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr><td class="signature-td" style="height: 30px;"></td><td class="signature-td" style="height: 30px;"></td></tr>
            <tr>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">Sulthon Sulaiman, M.Pd.I</td>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td">NIP. 198106162005011003</td>
              <td class="signature-td">NIP. -</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            ${styles}
          </head>
          <body>
            ${mainContent}
            ${signatureBlock}
          </body>
        </html>
      `;
  
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `PROSEM_${dataToExport.subject.replace(/ /g, '_')}_${dataToExport.semester}.doc`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setCopyNotification(`File Word PROSEM ${semester} berhasil diunduh!`);
      setTimeout(() => setCopyNotification(''), 2000);
  };

  const handleNavigateFromMenu = async (destination: 'detail' | 'atp' | 'kktp' | 'prota' | 'prosem') => {
    if (!selectedTP) return;

    setGlobalError(null);
    setTransientMessage(null);

    if (destination === 'detail') {
        setView('view_tp_detail');
        return;
    }
    
    if (destination === 'kktp') {
        await handleViewAndGenerateKktp();
        return;
    }
    
    if (destination === 'prosem') {
        await handleNavigateToProsem();
        return;
    }

    if (destination === 'prota') {
        if(protas.length > 0) {
            setView('view_prota_list');
        } else {
            // Logic to create new PROTA
            if (atps.length > 0) {
                setSelectedATP(atps[0]); // Assume first ATP
                handleCreateNewProta();
            } else {
                setTransientMessage('Anda harus membuat ATP terlebih dahulu untuk membuat PROTA.');
                setView('view_atp_list');
            }
        }
        return;
    }


    try {
        switch (destination) {
            case 'atp': {
                // This logic is simplified because data is pre-loaded by the time user clicks.
                setView('view_atp_list');
                break;
            }
        }
    } catch (error: any) {
        setGlobalError(error.message);
        setView('tp_menu');
    } finally {
        setLoadingState({ isLoading: false, title: '', message: '' });
    }
};


  const renderContent = () => {
    if (loadingState.isLoading && view !== 'subject_dashboard' && view !== 'tp_menu') {
      return null; 
    }

    switch (view) {
      case 'view_admin_settings':
        return <AdminSettings />;
      case 'manage_access':
        return <ManageAccess />;

      case 'select_subject':
        return <SubjectSelector onSelectSubject={handleSelectSubject} isAdmin={isAdmin} onViewChange={setView} />;

      case 'subject_dashboard':
        return (
          <SubjectDashboard
            subjectName={selectedSubject!}
            tps={tps}
            onCreateNew={() => setView('create_tp')}
            onSelectTP={handleSelectTP}
            onBack={handleBackToSubjects}
            isLoading={isSubjectDashboardLoading}
          />
        );
      
      case 'tp_menu':
        if (!selectedTP) return null;
        return (
            <TPMenu 
                tp={selectedTP}
                atps={atps}
                protas={protas}
                kktpData={kktpData}
                prosemData={prosemData}
                onNavigate={handleNavigateFromMenu}
                onBack={() => setView('subject_dashboard')}
                isLoading={isTPMenuLoading}
            />
        );

      case 'view_tp_list':
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <button onClick={() => setView('subject_dashboard')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold">
                  <BackIcon className="w-5 h-5" />
                  Kembali ke Dasbor
                </button>
                <h1 className="text-3xl font-bold text-slate-800">Tujuan Pembelajaran</h1>
                <p className="text-slate-500">Mata Pelajaran: {selectedSubject}</p>
              </div>
            </div>
            {globalError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                  <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Terjadi Kesalahan</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{globalError}</p></div></div></div>
                  <button onClick={() => setGlobalError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
              </div>
            )}
            <div className="space-y-4">
              {tps.map((tp) => (
                <div key={tp.id} onClick={() => handleSelectTP(tp)} className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl hover:ring-2 hover:ring-teal-500 transition-all duration-300 cursor-pointer flex items-center">
                   <div className="flex items-center gap-5 w-full">
                      <div className="flex-shrink-0 w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center">
                          <span className="text-5xl font-black text-slate-400">{tp.grade}</span>
                      </div>
                      <div className="flex-grow">
                          <p className="text-sm text-slate-500">
                              Dibuat oleh <span className="font-semibold text-slate-700">{tp.creatorName}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                              Pada: {new Date(tp.createdAt).toLocaleString('id-ID')}
                          </p>
                      </div>
                      {user && isApproved && (
                          <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                             <button onClick={(e) => handleEdit(e, tp)} title="Edit TP" className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors">
                              <EditIcon className="w-4 h-4"/>
                              <span>Edit</span>
                            </button>
                            <button onClick={(e) => handleDelete(e, tp)} title="Hapus TP" className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors">
                              <TrashIcon className="w-4 h-4"/>
                              <span>Hapus</span>
                            </button>
                          </div>
                      )}
                  </div>
                </div>
              ))}
              {user && isApproved && (
                  <button 
                    onClick={handleCreateNew} 
                    className="group w-full bg-transparent p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-slate-50 transition-all duration-300 cursor-pointer flex items-center text-slate-500 hover:text-teal-600"
                  >
                    <div className="flex items-center gap-5 w-full">
                        <div className="flex-shrink-0 w-20 h-20 bg-slate-200/50 rounded-xl flex items-center justify-center group-hover:bg-teal-100/50 transition-colors">
                            <PlusIcon className="w-10 h-10" />
                        </div>
                        <div className="flex-grow text-left">
                            <h3 className="text-lg font-semibold">Buat Tujuan Pembelajaran Baru</h3>
                            <p className="text-sm mt-1">Mulai dari awal untuk membuat set TP, ATP, dan perangkat ajar lainnya.</p>
                        </div>
                    </div>
                  </button>
              )}
            </div>
          </div>
        );

      case 'view_tp_detail':
        if (!selectedTP) return null;
        const ganjilGroups = selectedTP.tpGroups.filter(g => g.semester === 'Ganjil');
        const genapGroups = selectedTP.tpGroups.filter(g => g.semester === 'Genap');
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <button onClick={() => setView('tp_menu')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                    <BackIcon className="w-5 h-5" />
                    Kembali ke Menu TP
                </button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="border-b pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Detail Tujuan Pembelajaran</h1>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-slate-600">
                            <span><span className="font-semibold">Mapel:</span> {selectedTP.subject}</span>
                            <span><span className="font-semibold">Kelas:</span> {selectedTP.grade}</span>
                            <span><span className="font-semibold">Penyusun:</span> {selectedTP.creatorName}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button 
                            onClick={(e) => handleEdit(e, selectedTP)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-md shadow-sm hover:bg-blue-200 transition-colors text-sm"
                        >
                            <EditIcon className="w-4 h-4"/>
                            <span>Edit TP</span>
                        </button>
                        <button 
                            onClick={(e) => handleDelete(e, selectedTP)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-md shadow-sm hover:bg-red-200 transition-colors text-sm"
                        >
                            <TrashIcon className="w-4 h-4"/>
                            <span>Hapus TP</span>
                        </button>
                    </div>
                </div>

                 <div>
                  <button onClick={() => setIsCpInfoVisible(!isCpInfoVisible)} className="w-full flex justify-between items-center p-3 bg-slate-100 rounded-md hover:bg-slate-200">
                    <span className="font-semibold text-slate-700">Lihat Detail Capaian Pembelajaran (CP)</span>
                    {isCpInfoVisible ? <ChevronUpIcon className="w-5 h-5 text-slate-600"/> : <ChevronDownIcon className="w-5 h-5 text-slate-600"/>}
                  </button>
                  {isCpInfoVisible && (
                    <div className="mt-3 p-4 border rounded-b-md bg-white space-y-3">
                      <p className="text-sm"><span className="font-semibold">Sumber CP:</span> {selectedTP.cpSourceVersion || '-'}</p>
                      {selectedTP.cpElements.map((item, index) => (
                          <div key={index} className="p-3 bg-slate-50 rounded">
                              <p className="font-semibold text-slate-800">{item.element}</p>
                              <p className="text-slate-600 text-sm mt-1">{item.cp}</p>
                          </div>
                      ))}
                      {selectedTP.additionalNotes && (
                          <div className="p-3 bg-blue-50 rounded border border-blue-200">
                              <p className="font-semibold text-blue-800">Catatan Tambahan dari Guru</p>
                              <p className="text-blue-700 text-sm mt-1 whitespace-pre-wrap">{selectedTP.additionalNotes}</p>
                          </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
            
            <div className="mt-8">
              <SemesterDisplay title="Semester Ganjil" groups={ganjilGroups} onCopy={handleCopy}/>
              <SemesterDisplay title="Semester Genap" groups={genapGroups} numberingOffset={ganjilGroups.length} onCopy={handleCopy}/>
            </div>
          </div>
        );

      case 'view_atp_list':
        if (!selectedTP) return null;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <button onClick={() => setView('tp_menu')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold">
                      <BackIcon className="w-5 h-5" />
                      Kembali ke Menu TP
                  </button>
                  <h1 className="text-3xl font-bold text-slate-800">Alur Tujuan Pembelajaran (ATP)</h1>
                  <p className="text-slate-500">Mapel: {selectedTP.subject} | Kelas: {selectedTP.grade}</p>
                </div>
                {user && isApproved && (
                    <button onClick={handleCreateNewAtp} disabled={atpGenerationProgress.isLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 disabled:bg-slate-400">
                        <SparklesIcon className="w-5 h-5"/>
                        Buat ATP Baru dengan AI
                    </button>
                )}
            </div>
            {atpError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                  <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Terjadi Kesalahan</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{atpError}</p></div></div></div>
                  <button onClick={() => setAtpError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
              </div>
            )}
             {transientMessage && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left relative">
                    <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-blue-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-blue-800">Informasi</h3><div className="mt-2 text-sm text-blue-700"><p>{transientMessage}</p></div></div></div>
                    <button onClick={() => setTransientMessage(null)} className="absolute top-2 right-2 p-1.5 text-blue-500 hover:bg-blue-200 rounded-full" title="Tutup"><CloseIcon className="w-5 h-5" /></button>
                </div>
            )}
            {atps.length > 0 ? (
                <div className="space-y-4">
                {atps.map((atp) => (
                    <div key={atp.id} onClick={() => handleViewAtpDetail(atp)} className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl hover:ring-2 hover:ring-indigo-500 transition-all duration-300 cursor-pointer">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Versi ATP Dibuat oleh: {atp.creatorName}</h3>
                            <p className="text-sm text-slate-500">Total {atp.content.length} alur tujuan pembelajaran</p>
                            <p className="text-xs text-slate-400 mt-2">Dibuat pada: {new Date(atp.createdAt).toLocaleString('id-ID')}</p>
                        </div>
                        {user && isApproved && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                               <button onClick={(e) => handleEditATP(e, atp)} title="Edit ATP" className="p-2 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-full"><EditIcon className="w-5 h-5"/></button>
                               <button onClick={(e) => handleDeleteATP(e, atp)} title="Hapus ATP" className="p-2 text-red-600 bg-red-100 hover:bg-red-200 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        )}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md">
                   <h3 className="text-xl font-semibold text-slate-700">Belum Ada ATP</h3>
                   <p className="text-slate-500 mt-2">Belum ada Alur Tujuan Pembelajaran yang dibuat untuk set TP ini.</p>
                   {user && isApproved && <p className="text-slate-500">Silakan klik tombol "Buat ATP Baru" untuk memulai.</p>}
                </div>
            )}
          </div>
        );
      
      case 'view_atp_detail':
        if (!selectedATP || !selectedTP) return null;
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <button onClick={() => setView('tp_menu')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                        <BackIcon className="w-5 h-5" />
                        Kembali ke Menu Perangkat Ajar
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <button onClick={handleExportAtpToWord} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                           <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                        </button>
                    </div>
                </div>

                {protaError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                      <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Gagal Membuat PROTA</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{protaError}</p></div></div></div>
                      <button onClick={() => setProtaError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
                  </div>
                )}
                
                 {kktpError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                        <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Gagal Membuat KKTP</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{kktpError}</p></div></div></div>
                        <button onClick={() => setKktpError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
                    </div>
                 )}

                <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none print:border">
                    <h1 className="text-2xl font-bold text-slate-800 text-center print:text-3xl">ALUR TUJUAN PEMBELAJARAN (ATP)</h1>
                    <div className="my-6 w-full max-w-md mx-auto print:max-w-full">
                         <table className="w-full text-sm">
                            <tbody>
                                <tr>
                                    <td className="font-semibold pr-4 py-1 whitespace-nowrap w-1/3">Nama Madrasah</td>
                                    <td className="w-2/3">: MTsN 4 Jombang</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold pr-4 py-1 whitespace-nowrap">Mata Pelajaran</td>
                                    <td>: ${selectedATP.subject}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold pr-4 py-1 whitespace-nowrap">Kelas</td>
                                    <td>: ${selectedTP.grade} / Fase D</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold pr-4 py-1 whitespace-nowrap">Tahun Ajaran</td>
                                    <td>: 2025/2026</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="my-6 p-4 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 print:border-solid print:border-black">
                        <h3 className="text-lg font-bold text-slate-700 mb-3">Capaian Pembelajaran (CP) Acuan</h3>
                        <div className="space-y-4 text-sm">
                            {selectedTP.cpElements.map((item, index) => (
                                <div key={index}>
                                    <p className="font-semibold text-slate-800">{item.element}</p>
                                    <p className="text-slate-600 mt-1">{item.cp}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full bg-white border border-slate-300 text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2 border-b border-slate-300 w-12 text-center">No. ATP</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-1/4">Topik/Materi</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-1/2">Tujuan Pembelajaran (TP)</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-16 text-center">Kode TP</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-20 text-center">Semester</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {selectedATP.content.map((row) => (
                                    <tr key={row.atpSequence} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 align-top border-r text-center">{row.atpSequence}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.topikMateri}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.tp}</td>
                                        <td className="px-3 py-2 align-top border-r text-center">{row.kodeTp}</td>
                                        <td className="px-3 py-2 align-top text-center">{row.semester}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );

      case 'view_prota_list':
        if (!selectedTP) return null;
        const protaExists = protas.length > 0;
        const currentProta = protaExists ? protas[0] : null;
        const totalJp = protaExists ? currentProta!.content.reduce((sum, row) => sum + (parseInt(row.alokasiWaktu) || 0), 0) : 0;

        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
               <button onClick={() => setView('tp_menu')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                  <BackIcon className="w-5 h-5" /> 
                  Kembali ke Menu Perangkat Ajar
               </button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Program Tahunan (PROTA)</h1>
                <p className="text-slate-500">Mapel: {selectedTP.subject} | Kelas: {selectedTP.grade}</p>
              </div>
              <div className="flex items-center gap-3">
                {protaExists && (
                  <>
                    {user && isApproved && (
                        <button onClick={handleDeleteAndRegenerateProta} disabled={protaGenerationProgress.isLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-md shadow-sm hover:bg-yellow-600 disabled:bg-slate-400">
                          <SparklesIcon className="w-5 h-5"/> Buat Ulang
                        </button>
                    )}
                    <button onClick={handleExportProtaToWord} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                      <DownloadIcon className="w-5 h-5"/> Ekspor ke Word
                    </button>
                  </>
                )}
              </div>
            </div>

            {protaError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                  <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Terjadi Kesalahan</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{protaError}</p></div></div></div>
                  <button onClick={() => setProtaError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
              </div>
            )}
            
            {!protaExists ? (
                <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-slate-700">Belum Ada PROTA</h3>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">Program Tahunan (PROTA) dibuat berdasarkan Alur Tujuan Pembelajaran (ATP). Silakan pilih ATP terlebih dahulu.</p>
                    {user && isApproved && (
                        <button 
                            onClick={() => setView('view_atp_list')} 
                            className="mt-6 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700"
                        >
                            <FlowChartIcon className="w-5 h-5"/>
                            Pilih ATP untuk Membuat PROTA
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full bg-white border border-slate-300 text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2 border-b border-slate-300 w-10 text-center">No</th>
                                    <th className="px-3 py-2 border-b border-slate-300">Topik / Materi Pokok</th>
                                    <th className="px-3 py-2 border-b border-slate-300 text-center">Alur Tujuan Pembelajaran</th>
                                    <th className="px-3 py-2 border-b border-slate-300">Tujuan Pembelajaran</th>
                                    <th className="px-3 py-2 border-b border-slate-300 text-center">Alokasi Waktu</th>
                                    <th className="px-3 py-2 border-b border-slate-300 text-center">Semester</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {currentProta!.content.map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 align-top border-r text-center">{row.no}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.topikMateri}</td>
                                        <td className="px-3 py-2 align-top border-r text-center">{row.alurTujuanPembelajaran}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.tujuanPembelajaran}</td>
                                        <td className="px-3 py-2 align-top border-r text-center">{row.alokasiWaktu}</td>
                                        <td className="px-3 py-2 align-top text-center">{row.semester}</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-slate-100 font-bold">
                                <tr>
                                    <td colSpan={4} className="px-3 py-2 text-right border-r">Total Jam Pertemuan (JP)</td>
                                    <td className="px-3 py-2 text-center border-r">{totalJp} JP</td>
                                    <td className="px-3 py-2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
          </div>
        );
      
      case 'view_kktp':
        if (!selectedTP) return null;
        const KKTPTable: React.FC<{ data: KKTPData }> = ({ data }) => (
            <div className="bg-white rounded-lg shadow-lg p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">
                        Rincian KKTP - Semester {data.semester}
                    </h2>
                    <div className="flex gap-2 print:hidden">
                        {user && isApproved && (
                            <button onClick={() => handleDeleteAndRegenerateKKTP(data.semester)} className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-md shadow-sm hover:bg-yellow-600">
                                <SparklesIcon className="w-5 h-5" /> Buat Ulang
                            </button>
                        )}
                        <button onClick={() => handleExportKktpToWord(data.semester)} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                            <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full bg-white border border-slate-300 text-sm">
                        <thead className="bg-slate-100 text-left">
                            <tr>
                                <th className="px-3 py-2 border-b border-slate-300 text-center w-[5%]">No</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-[20%]">Materi Pokok</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-[30%]">Tujuan Pembelajaran</th>
                                <th className="px-3 py-2 border-b border-slate-300 w-[35%]">Kriteria</th>
                                <th className="px-3 py-2 border-b border-slate-300 text-center w-[10%]">KKTP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.content.map((row) => (
                              <React.Fragment key={row.no}>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-3 py-2 align-top border-r text-center" rowSpan={4}>{row.no}</td>
                                    <td className="px-3 py-2 align-top border-r" rowSpan={4}>{row.materiPokok}</td>
                                    <td className="px-3 py-2 align-top border-r" rowSpan={4}>{row.tp}</td>
                                    <td className="px-3 py-2 align-top border-r">{row.kriteria.sangatMahir}</td>
                                    <td className="px-3 py-2 align-top border-r text-center text-lg font-bold">{row.targetKktp === 'sangatMahir' && '✓'}</td>
                                </tr>
                                <tr className="hover:bg-slate-50"><td className="px-3 py-2 align-top border-r">{row.kriteria.mahir}</td><td className="px-3 py-2 align-top border-r text-center text-lg font-bold">{row.targetKktp === 'mahir' && '✓'}</td></tr>
                                <tr className="hover:bg-slate-50"><td className="px-3 py-2 align-top border-r">{row.kriteria.cukupMahir}</td><td className="px-3 py-2 align-top border-r text-center text-lg font-bold">{row.targetKktp === 'cukupMahir' && '✓'}</td></tr>
                                <tr className="hover:bg-slate-50 border-b"><td className="px-3 py-2 align-top border-r">{row.kriteria.perluBimbingan}</td><td className="px-3 py-2 align-top border-r text-center text-lg font-bold">{row.targetKktp === 'perluBimbingan' && '✓'}</td></tr>
                              </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );

        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                     <button onClick={() => setView('tp_menu')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
                        <BackIcon className="w-5 h-5" />
                        Kembali ke Menu Perangkat Ajar
                    </button>
                </div>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h1>
                    <p className="text-slate-500">Mapel: {selectedTP.subject} | Kelas: {selectedTP.grade}</p>
                </div>

                 {kktpError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                        <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Gagal Membuat KKTP</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{kktpError}</p></div></div></div>
                        <button onClick={() => setKktpError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
                    </div>
                 )}
                
                <div className="mb-6">
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveKktpSemester('Ganjil')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${activeKktpSemester === 'Ganjil' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                Semester Ganjil
                            </button>
                            <button
                                onClick={() => setActiveKktpSemester('Genap')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${activeKktpSemester === 'Genap' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                Semester Genap
                            </button>
                        </nav>
                    </div>
                </div>

                <div>
                  {activeKktpSemester === 'Ganjil' && (
                    kktpData?.ganjil 
                      ? <KKTPTable data={kktpData.ganjil} /> 
                      : (
                        <div className="bg-white rounded-lg shadow-lg p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <ChecklistIcon className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Data KKTP Kosong</h3>
                            <p className="text-slate-500 mt-1 mb-6 max-w-sm">
                                Belum ada Kriteria Ketercapaian Tujuan Pembelajaran untuk Semester Ganjil.
                            </p>
                            {user && isApproved && (
                                <button 
                                    onClick={() => handleGenerateSingleKktp('Ganjil')} 
                                    disabled={kktpGenerationProgress.isLoading}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
                                >
                                    {kktpGenerationProgress.isLoading && activeKktpSemester === 'Ganjil' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Buat KKTP Semester Ganjil
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                      )
                  )}
                  {activeKktpSemester === 'Genap' && (
                    kktpData?.genap 
                      ? <KKTPTable data={kktpData.genap} /> 
                      : (
                        <div className="bg-white rounded-lg shadow-lg p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <ChecklistIcon className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Data KKTP Kosong</h3>
                            <p className="text-slate-500 mt-1 mb-6 max-w-sm">
                                Belum ada Kriteria Ketercapaian Tujuan Pembelajaran untuk Semester Genap.
                            </p>
                            {user && isApproved && (
                                <button 
                                    onClick={() => handleGenerateSingleKktp('Genap')} 
                                    disabled={kktpGenerationProgress.isLoading}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
                                >
                                    {kktpGenerationProgress.isLoading && activeKktpSemester === 'Genap' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Buat KKTP Semester Genap
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                      )
                  )}
                </div>
            </div>
        );

      case 'view_prosem': {
        if (!selectedTP) return null;
        const prosemExists = prosemData?.ganjil || prosemData?.genap;

        const PROSEMTableContent: React.FC<{ data: PROSEMData }> = ({ data }) => (
            <div className="overflow-x-auto mt-4">
                <table className="min-w-full bg-white border border-slate-300 text-xs">
                    <thead className="bg-slate-100 text-center">
                        <tr>
                            <th rowSpan={2} className="px-2 py-2 border-b border-slate-300 align-middle">No</th>
                            <th rowSpan={2} className="px-2 py-2 border-b border-slate-300 align-middle">Tujuan Pembelajaran</th>
                            <th rowSpan={2} className="px-2 py-2 border-b border-slate-300 align-middle"><span className="[writing-mode:vertical-rl] transform rotate-180">Alokasi Waktu</span></th>
                            {data.headers.map(header => (
                                <th key={header.month} colSpan={header.weeks} className="px-2 py-2 border-b border-slate-300">{header.month}</th>
                            ))}
                            <th rowSpan={2} className="px-2 py-2 border-b border-slate-300 align-middle">Keterangan</th>
                        </tr>
                        <tr>
                            {data.headers.flatMap(header => 
                                Array.from({ length: header.weeks }, (_, i) => <th key={`${header.month}-${i}`} className="px-2 py-1 border-b border-slate-300 w-8">{i + 1}</th>)
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.content.map((row, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                                <td className="px-2 py-2 border-r text-center">{row.no}</td>
                                <td className="px-2 py-2 border-r">{row.tujuanPembelajaran}</td>
                                <td className="px-2 py-2 border-r text-center">{row.alokasiWaktu}</td>
                                {data.headers.flatMap(h =>
                                    Array.from({ length: h.weeks }, (_, weekIndex) => (
                                        <td key={`${h.month}-w${weekIndex}`} className="px-2 py-2 border-r text-center">
                                            {(row.bulan[h.month] && row.bulan[h.month][weekIndex]) || ''}
                                        </td>
                                    ))
                                )}
                                <td className="px-2 py-2">{row.keterangan}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
      
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-[95vw] mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <button onClick={() => setView('tp_menu')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold">
                            <BackIcon className="w-5 h-5" />
                            Kembali ke Menu Perangkat Ajar
                        </button>
                        <h1 className="text-3xl font-bold text-slate-800">Program Semester (PROSEM)</h1>
                        <p className="text-slate-500">Mapel: {selectedTP.subject} | Kelas: {selectedTP.grade}</p>
                    </div>
                    {prosemExists && (
                        <div className="flex items-center gap-3">
                            {user && isApproved && (
                                <button onClick={handleDeleteAndRegenerateProsem} disabled={prosemGenerationProgress.isLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-md shadow-sm hover:bg-yellow-600 disabled:bg-slate-400">
                                    <SparklesIcon className="w-5 h-5"/> Buat Ulang
                                </button>
                            )}
                        </div>
                    )}
                </div>
      
                {prosemError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left relative">
                        <div className="flex"><div className="flex-shrink-0"><AlertIcon className="h-5 w-5 text-red-400" /></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Gagal Membuat PROSEM</h3><div className="mt-2 text-sm text-red-700 whitespace-pre-wrap"><p>{prosemError}</p></div></div></div>
                        <button onClick={() => setProsemError(null)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-200 rounded-full" title="Tutup peringatan"><CloseIcon className="w-5 h-5" /></button>
                    </div>
                )}
      
                <div className="mb-6">
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveProsemSemester('Ganjil')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${activeProsemSemester === 'Ganjil' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                Semester Ganjil
                            </button>
                            <button
                                onClick={() => setActiveProsemSemester('Genap')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${activeProsemSemester === 'Genap' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                Semester Genap
                            </button>
                        </nav>
                    </div>
                </div>
      
                <div>
                    {activeProsemSemester === 'Ganjil' && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-800">Rincian PROSEM - Semester Ganjil</h2>
                                <div className="flex items-center gap-3">
                                    {prosemData?.ganjil ? (
                                        <button onClick={() => handleExportProsemToWord('Ganjil')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                                            <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                                        </button>
                                    ) : (
                                        user && isApproved && (
                                            <button onClick={() => handleGenerateSingleProsem('Ganjil')} disabled={prosemGenerationProgress.isLoading} className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 disabled:bg-slate-400">
                                                <SparklesIcon className="w-5 h-5" /> Buat PROSEM Ganjil
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                            {prosemData?.ganjil 
                                ? <PROSEMTableContent data={prosemData.ganjil} /> 
                                : <div className="text-center py-10 text-slate-500">Tidak ada data PROSEM untuk Semester Ganjil. {user && isApproved && "Klik tombol 'Buat PROSEM Ganjil' untuk memulai."}</div>
                            }
                        </div>
                    )}
                    {activeProsemSemester === 'Genap' && (
                         <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-800">Rincian PROSEM - Semester Genap</h2>
                                <div className="flex items-center gap-3">
                                    {prosemData?.genap ? (
                                        <button onClick={() => handleExportProsemToWord('Genap')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                                            <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                                        </button>
                                    ) : (
                                        user && isApproved && (
                                            <button onClick={() => handleGenerateSingleProsem('Genap')} disabled={prosemGenerationProgress.isLoading} className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 disabled:bg-slate-400">
                                                <SparklesIcon className="w-5 h-5" /> Buat PROSEM Genap
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                            {prosemData?.genap 
                                ? <PROSEMTableContent data={prosemData.genap} /> 
                                : <div className="text-center py-10 text-slate-500">Tidak ada data PROSEM untuk Semester Genap. {user && isApproved && "Klik tombol 'Buat PROSEM Genap' untuk memulai."}</div>
                            }
                        </div>
                    )}
                </div>
            </div>
        );
      }


      case 'create_tp':
      case 'edit_tp':
        return <TPEditor 
                mode={view === 'create_tp' ? 'create' : 'edit'}
                initialData={editingTP || undefined}
                subject={selectedSubject!}
                onSave={handleSave}
                onCancel={() => setView(view === 'create_tp' ? 'subject_dashboard' : 'view_tp_list')}
                existingTPsForSubject={view === 'create_tp' ? tps : undefined}
               />;
      case 'edit_atp':
        return <ATPEditor 
          initialData={editingATP!}
          onSave={handleSaveATP}
          onCancel={() => setView('view_atp_list')}
        />;
      default:
        return null;
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && !isApproved) {
    return (
      <div className="bg-slate-100 min-h-screen">
        <Header userEmail={user.email} currentView={view} onViewChange={(v) => setView(v as View | 'manage_access')} onLogin={() => {}} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <AlertIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Akses Menunggu Verifikasi</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Akun Anda (<span className="font-semibold">{user.email}</span>) telah berhasil login, dan permintaan akses Anda <span className="font-semibold text-teal-600">telah otomatis dikirim</span> ke admin.
            <br/><br/>
            Silakan tunggu hingga admin menyetujui akun Anda. Jika ada urgensi, Anda bisa menghubungi <a href="mailto:rinomasstbi@gmail.com" className="text-teal-600 font-bold hover:underline">rinomasstbi@gmail.com</a>.
          </p>
          <button 
             onClick={() => window.location.reload()}
             className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-8 rounded-lg shadow-md transition"
          >
            Cek Status Akses Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      <Header userEmail={user?.email} currentView={view} onViewChange={(v) => setView(v as View | 'manage_access')} onLogin={() => setShowLoginModal(true)} />
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
               <CloseIcon className="w-6 h-6" />
            </button>
            <Login onLoginSuccess={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}
      {copyNotification && (
          <div className="fixed top-24 right-6 bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-md shadow-lg z-50 animate-fade-in-out">
              {copyNotification}
          </div>
      )}
      
       {isProtaJpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-slate-800">Input Jam Pertemuan</h3>
            <p className="text-sm text-slate-600 mb-4">
                Masukkan jumlah Jam Pertemuan (JP) per minggu untuk mata pelajaran <span className="font-semibold">{selectedSubject}</span>. Data ini akan digunakan oleh AI untuk menghitung alokasi waktu.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleProtaGenerationSubmit(); }}>
                <input
                    type="number"
                    value={protaJpInput}
                    onChange={(e) => setProtaJpInput(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="Contoh: 3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    min="1"
                    autoFocus
                />
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsProtaJpModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                    Batal
                    </button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                      Hasilkan PROTA
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
      
      {/* --- Loading & Generation Overlays --- */}
      <LoadingOverlay
        isLoading={loadingState.isLoading && view !== 'subject_dashboard' && view !== 'tp_menu'}
        title={loadingState.title}
        message={loadingState.message}
      />
      <LoadingOverlay
        isLoading={atpGenerationProgress.isLoading}
        title="AI sedang bekerja..."
        message={atpGenerationProgress.message || 'Harap tunggu, Alur Tujuan Pembelajaran sedang dibuat.'}
        progress={atpGenerationProgress.progress}
      />
      <LoadingOverlay
        isLoading={protaGenerationProgress.isLoading}
        title="AI sedang menyusun PROTA..."
        message={protaGenerationProgress.message || 'Harap tunggu, Program Tahunan sedang dibuat.'}
        progress={protaGenerationProgress.progress}
      />
      <LoadingOverlay
        isLoading={kktpGenerationProgress.isLoading}
        title="Memproses KKTP..."
        message={kktpGenerationProgress.message || 'Memproses permintaan Anda...'}
      />
       <LoadingOverlay
        isLoading={prosemGenerationProgress.isLoading}
        title="Memproses PROSEM..."
        message={prosemGenerationProgress.message || 'Memproses permintaan Anda...'}
      />

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeConfirm} 
                className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDialog.onConfirm} 
                className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-200"
              >
                Ya, Lanjutkan
              </button>
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