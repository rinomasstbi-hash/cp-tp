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
import { RpeDetail } from './components/RpeDetail';
import { PlusIcon, EditIcon, TrashIcon, BackIcon, ClipboardIcon, AlertIcon, CloseIcon, FlowChartIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, DownloadIcon, BookOpenIcon, ChecklistIcon, CalendarIcon, ListIcon, SaveIcon } from './components/icons';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, auth } from './services/authService';
import { AdminSettings as GlobalSettings, getAdminSettings } from './services/dbService';

const renderMultilineText = (text?: string) => {
    if (!text) return "-";
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
        return (
            <ul className="list-disc pl-4 space-y-1 text-left">
                {lines.map((line, idx) => {
                    const clean = line.replace(/^[\s\-\*\•\+]+/, '').trim();
                    return <li key={idx}>{clean}</li>;
                })}
            </ul>
        );
    }
    const cleanSingle = text.replace(/^[\s\-\*\•\+]+/, '').trim();
    return <span>{cleanSingle}</span>;
};

const Header: React.FC<{ userEmail?: string | null; currentView: string; onViewChange: (v: string) => void; onLogin: () => void; globalSettings?: GlobalSettings | null; isAdmin?: boolean }> = ({ userEmail, currentView, onViewChange, onLogin, globalSettings, isAdmin }) => {
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
                {globalSettings?.namaAplikasi || 'Asisten Guru (AGRU)'}
              </span>
              <span className="block text-sm text-slate-300">
                Tahun Pelajaran {globalSettings?.tahunPelajaran || '2025/2026'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            
            {userEmail ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <button
                      onClick={() => onViewChange(currentView === 'admin_dashboard' ? 'select_subject' : 'admin_dashboard')}
                      className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition"
                      title="Pengaturan Admin"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  )}
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
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  const getSemesterWeeksList = (semester: 'Ganjil' | 'Genap', grade: string): Record<string, number[]> => {
    const isGrade9 = grade.includes('9') || grade.toUpperCase().includes('IX');
    
    const defaultGanjil78 = { 'Juli': [4, 5], 'Agustus': [1, 2, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [] };
    const defaultGenap78 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 4, 5], 'Juni': [] };
    const defaultGanjil9 = { 'Juli': [4, 5], 'Agustus': [1, 2, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [] };
    const defaultGenap9 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 4, 5], 'Juni': [] };

    const defaultVal = semester === 'Ganjil'
        ? (isGrade9 ? defaultGanjil9 : defaultGanjil78)
        : (isGrade9 ? defaultGenap9 : defaultGenap78);

    if (!globalSettings) {
        return defaultVal;
    }

    let rawWeeksObj: any = null;
    if (isGrade9) {
        rawWeeksObj = semester === 'Ganjil' ? globalSettings.weeksGanjil9 : globalSettings.weeksGenap9;
    } else {
        rawWeeksObj = semester === 'Ganjil' ? globalSettings.weeksGanjil78 : globalSettings.weeksGenap78;
    }

    if (!rawWeeksObj) return defaultVal;

    const result: Record<string, number[]> = {};
    Object.keys(defaultVal).forEach(month => {
        const val = rawWeeksObj[month];
        if (Array.isArray(val)) {
            result[month] = val.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5).sort((a, b) => a - b);
        } else if (typeof val === 'number') {
            result[month] = Array.from({ length: val }, (_, i) => i + 1);
        } else {
            result[month] = defaultVal[month as keyof typeof defaultVal];
        }
    });

    return result;
  };

  const getSemesterTotalWeeks = (semester: 'Ganjil' | 'Genap', grade: string): number => {
    const weeksList = getSemesterWeeksList(semester, grade);
    return Object.values(weeksList).reduce((sum, list) => sum + list.length, 0);
  };

  const getWeekInactiveLabel = (semester: 'Ganjil' | 'Genap', grade: string, month: string, weekNum: number): string => {
    const isGrade9 = grade.includes('9') || grade.toUpperCase().includes('IX');
    const labelKey = isGrade9
      ? (semester === 'Ganjil' ? 'weekLabelsGanjil9' : 'weekLabelsGenap9')
      : (semester === 'Ganjil' ? 'weekLabelsGanjil78' : 'weekLabelsGenap78');
    
    if (globalSettings && globalSettings[labelKey]) {
      const currentLabels = globalSettings[labelKey] as Record<string, Record<string, string>>;
      if (currentLabels[month] && typeof currentLabels[month][String(weekNum)] === 'string' && currentLabels[month][String(weekNum)].trim() !== '') {
        return currentLabels[month][String(weekNum)].trim().toUpperCase();
      }
    }
    
    // Fallback to default inactive labels
    const defaultLabelsMap = semester === 'Ganjil'
      ? {
          'Juli': { '1': 'LS2', '2': 'LS2', '3': 'MTM' },
          'Agustus': { '3': 'PHBN' },
          'Desember': { '1': 'SAS', '2': 'UP', '3': 'LS1', '4': 'LS1' }
        }
      : {
          'Maret': { '1': 'LHR', '2': 'LHR', '3': 'LHR' },
          'Mei': { '3': 'LHR' },
          'Juni': { '1': 'SAS', '2': 'UP', '3': 'LS2', '4': 'LS2' }
        };
    
    const monthMap = defaultLabelsMap[month as keyof typeof defaultLabelsMap] as Record<string, string> | undefined;
    return (monthMap && monthMap[String(weekNum)]) || '';
  };

  const parseJpValue = (val: string): number => {
    if (!val) return 0;
    const match = val.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const refreshSettings = () => {
    getAdminSettings().then(res => {
      if (res) setGlobalSettings(res);
    });
  };

  useEffect(() => {
    let isMounted = true;
    getAdminSettings().then(res => {
        if (res && isMounted) setGlobalSettings(res);
    });
    
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

  const [view, setView] = useState<View | 'admin_dashboard'>('select_subject');
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
      onConfirm: () => {
        onConfirm();
        closeConfirm();
      }
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
  const [isEditingProtaJp, setIsEditingProtaJp] = useState(false);
  const [tempProtaContent, setTempProtaContent] = useState<PROTARow[]>([]);

  // State for ATP JP Management
  const [isAtpJpModalOpen, setIsAtpJpModalOpen] = useState(false);
  const [atpJpInput, setAtpJpInput] = useState<number | ''>('');

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
    setProtas([]);
    setProsemData(null);
    setKktpData(null);
    setTransientMessage('Data ATP serta PROTA, PROSEM, dan KKTP terkait berhasil dihapus.');

    try {
        // Delete related KKTPs, PROTAs, PROSEMs, and the ATP itself
        await Promise.allSettled([
            apiService.deleteKKTPsByATPId(atpToDelete.id),
            apiService.deletePROTAsByTPId(selectedTP.id!),
            apiService.deletePROSEMsByTPId(selectedTP.id!),
            apiService.deleteATP(atpToDelete.id)
        ]);
    } catch (error: any) {
        console.error("Delete ATP Error:", error);
        setAtpError(`Gagal menghapus ATP. Detail: ${error.message}`);
        loadATPsForTP(selectedTP.id).catch(() => {});
    }
  };

  const handleEdit = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    
    const isOwner = tp.userId === user?.uid || (tp.creatorEmail && user?.email && tp.creatorEmail.toLowerCase().trim() === user.email.toLowerCase().trim());
    if (!isAdmin && !isOwner) {
      showConfirm(
        'Akses Ditolak',
        `Anda tidak memiliki izin untuk mengedit TP ini karena dibuat oleh ${tp.creatorName || tp.creatorEmail || 'guru lain'}.`,
        () => closeConfirm()
      );
      return;
    }
    
    setEditingTP(tp);
    setView('edit_tp');
  };

  const handleDelete = (e: React.MouseEvent, tp: TPData) => {
    e.stopPropagation();
    
    const isOwner = tp.userId === user?.uid || (tp.creatorEmail && user?.email && tp.creatorEmail.toLowerCase().trim() === user.email.toLowerCase().trim());
    if (!isAdmin && !isOwner) {
      showConfirm(
        'Akses Ditolak',
        `Anda tidak memiliki izin untuk menghapus TP ini karena dibuat oleh ${tp.creatorName || tp.creatorEmail || 'guru lain'}.`,
        () => closeConfirm()
      );
      return;
    }

    showConfirm(
      'Hapus Data TP',
      'Apakah Anda yakin ingin menghapus data TP ini? Semua data ATP, Prota, KKTP, dan Prosem yang terhubung juga akan dihapus.',
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
  
  const handleEditATP = (e: React.MouseEvent | null | undefined, atp: ATPData) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!selectedTP) return;
    setEditingATP(atp);
    setView('edit_atp');
  };

  const handleDeleteATP = (e: React.MouseEvent | null | undefined, atp: ATPData) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!selectedTP) return;
    showConfirm(
        'Hapus Data ATP',
        'Apakah Anda yakin ingin menghapus data ATP ini? Tindakan ini tidak dapat diurungkan.',
        () => {
            _performDeleteATP(atp);
            closeConfirm();
            setView('tp_menu');
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

  const _proceedWithAtpGeneration = async (creatorName: string, creatorEmail: string, jpWeekly: number) => {
      if (!selectedTP) return;
      setAtpGenerationProgress({ isLoading: true, message: 'Memulai proses...', progress: 0 });
      setAtpError(null);
      try {
          setAtpGenerationProgress(prev => ({ ...prev, message: 'Menghubungi AI untuk membuat draf ATP...', progress: 25 }));
          const generatedContent = await geminiService.generateATP({
              subject: selectedTP.subject,
              grade: selectedTP.grade,
              tpGroups: selectedTP.tpGroups,
              totalJpPerWeek: jpWeekly
          });
          setAtpGenerationProgress(prev => ({ ...prev, message: 'Draf ATP diterima. Menyimpan ke database...', progress: 60 }));
          const newAtpData: Omit<ATPData, 'id' | 'createdAt' | 'userId'> = {
              tpId: selectedTP.id!,
              subject: selectedTP.subject,
              jamPertemuan: jpWeekly,
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
    setAtpJpInput('');
    setIsAtpJpModalOpen(true);
  };

  const handleAtpGenerationSubmit = async () => {
    if (!selectedTP || !atpJpInput || atpJpInput < 1) {
        setAtpError("Harap masukkan jumlah JP (minimal 1).");
        setIsAtpJpModalOpen(false);
        return;
    }
    setIsAtpJpModalOpen(false);
    await _proceedWithAtpGeneration(
        user?.displayName || user?.email || "User", 
        user?.email || "", 
        Number(atpJpInput)
    );
  };

  const handleDeleteAndRegenerateATP = async () => {
    if (!selectedTP || !selectedATP) return;
    
    showConfirm(
        'Buat Ulang ATP',
        'Apakah Anda yakin ingin membuat ulang ATP? Data lama dan data terkait (PROTA, KKTP, PROSEM) akan dihapus, lalu AI akan menyusun ATP baru.',
        async () => {
            closeConfirm();
            setLoadingState({ isLoading: true, title: 'Menghapus Data Lama', message: 'Sedang menghapus data ATP lama dan perangkat ajar yang terkait...' });
            setAtpError(null);
            try {
                // Delete downstream dependencies first: PROSEM, PROTA, KKTP
                try {
                    await apiService.deletePROSEMsByTPId(selectedTP.id!);
                } catch (e) {
                    console.warn("Gagal menghapus PROSEM:", e);
                }
                try {
                    await apiService.deletePROTAsByTPId(selectedTP.id!);
                } catch (e) {
                    console.warn("Gagal menghapus PROTA:", e);
                }
                try {
                    await apiService.deleteKKTPsByATPId(selectedATP.id);
                } catch (e) {
                    console.warn("Gagal menghapus KKTP:", e);
                }
                await apiService.deleteATP(selectedATP.id);
                
                // Clear state
                setAtps([]);
                setProtas([]);
                setKktpData(null);
                setProsemData(null);
                
                setLoadingState({ isLoading: false, title: '', message: '' });
                
                // Now generate a new ATP using same JP
                setAtpGenerationProgress({ isLoading: true, message: 'Memulai proses...', progress: 0 });
                try {
                    setAtpGenerationProgress(prev => ({ ...prev, message: 'Menghubungi AI untuk membuat draf ATP baru...', progress: 25 }));
                    const jpToUse = selectedATP.jamPertemuan || 2;
                    const generatedContent = await geminiService.generateATP({
                        subject: selectedTP.subject,
                        grade: selectedTP.grade,
                        tpGroups: selectedTP.tpGroups,
                        totalJpPerWeek: jpToUse
                    });
                    setAtpGenerationProgress(prev => ({ ...prev, message: 'Draf ATP diterima. Menyimpan ke database...', progress: 60 }));
                    const newAtpData: Omit<ATPData, 'id' | 'createdAt' | 'userId'> = {
                        tpId: selectedTP.id!,
                        subject: selectedTP.subject,
                        jamPertemuan: jpToUse,
                        content: generatedContent,
                        creatorName: user?.displayName || user?.email || "User",
                        creatorEmail: user?.email || "",
                    };
                    const savedAtp = await apiService.saveATP(newAtpData);
                    setAtpGenerationProgress(prev => ({ ...prev, message: 'Data berhasil disimpan.', progress: 90 }));
                    setAtps([savedAtp]);
                    setAtpGenerationProgress(prev => ({ ...prev, message: 'Selesai!', progress: 100 }));
                    setTimeout(() => {
                        handleViewAtpDetail(savedAtp);
                        setAtpGenerationProgress({ isLoading: false, message: '', progress: 0 });
                    }, 500);
                } catch (error: any) {
                    setAtpError(`Gagal membuat ATP baru: ${error.message}`);
                    setAtpGenerationProgress({ isLoading: false, message: '', progress: 0 });
                    setView('tp_menu');
                }
            } catch (error: any) {
                setAtpError(`Gagal menghapus data lama: ${error.message}`);
                setLoadingState({ isLoading: false, title: '', message: '' });
            }
        }
    );
  };
  
  const handleCreateNewProta = async (atpToUse?: ATPData) => {
    const activeAtp = atpToUse || selectedATP;
    if (!selectedTP || !activeAtp) {
        setProtaError("Harap pilih ATP yang valid.");
        return;
    }
    
    const jpWeekly = activeAtp.jamPertemuan || 2;
    setProtaGenerationProgress({ isLoading: true, message: 'Memulai proses...', progress: 0 });
    setProtaError(null);

    try {
        setProtaGenerationProgress(prev => ({ ...prev, message: 'Menghubungi AI untuk membuat draf PROTA...', progress: 25 }));
        const generatedContent = await geminiService.generatePROTA(activeAtp, jpWeekly, selectedTP.grade);

        setProtaGenerationProgress(prev => ({ ...prev, message: 'Draf PROTA diterima. Menyimpan ke database...', progress: 60 }));
        const newProtaData: Omit<PROTAData, 'id' | 'createdAt' | 'userId'> = {
            tpId: selectedTP.id!,
            subject: selectedTP.subject,
            jamPertemuan: jpWeekly,
            content: generatedContent,
            creatorName: activeAtp.creatorName,
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

  const handleStartEditProtaJp = () => {
    if (protas.length > 0) {
      setTempProtaContent(JSON.parse(JSON.stringify(protas[0].content)));
      setIsEditingProtaJp(true);
    }
  };

  const handleProtaJpChange = (index: number, value: string) => {
    const updatedContent = [...tempProtaContent];
    updatedContent[index] = {
      ...updatedContent[index],
      alokasiWaktu: value
    };
    setTempProtaContent(updatedContent);
  };

  const handleCancelEditProtaJp = () => {
    setIsEditingProtaJp(false);
    setTempProtaContent([]);
  };

  const handleSaveProtaJp = async () => {
    if (protas.length === 0 || !selectedTP) return;
    const protaToUpdate = protas[0];

    const weeksGanjil = getSemesterTotalWeeks('Ganjil', selectedTP.grade);
    const weeksGenap = getSemesterTotalWeeks('Genap', selectedTP.grade);
    const jamWeekly = protaToUpdate.jamPertemuan || 2;
    const targetGanjil = weeksGanjil * jamWeekly;
    const targetGenap = weeksGenap * jamWeekly;

    const allocatedGanjil = tempProtaContent.filter(r => r.semester === 'Ganjil').reduce((sum, r) => sum + parseJpValue(r.alokasiWaktu), 0);
    const allocatedGenap = tempProtaContent.filter(r => r.semester === 'Genap').reduce((sum, r) => sum + parseJpValue(r.alokasiWaktu), 0);

    const hasGanjilMismatch = allocatedGanjil !== targetGanjil;
    const hasGenapMismatch = allocatedGenap !== targetGenap;

    const saveAction = async () => {
      setLoadingState({ isLoading: true, title: 'Menyimpan Perubahan', message: 'Sedang menyimpan perubahan JP PROTA dan menyelaraskan perangkat ajar lainnya...' });
      setProtaError(null);
      try {
        // 1. Update PROTA
        const updatedProta = await apiService.updatePROTA(protaToUpdate.id, {
          content: tempProtaContent
        });
        
        // 2. Sync to ATP (Alur Tujuan Pembelajaran) if exists
        const activeAtp = selectedATP || (atps.length > 0 ? atps[0] : null);
        if (activeAtp) {
            const updatedAtpContent = activeAtp.content.map((row) => {
                // Find matching PROTA row by kodeTp / alurTujuanPembelajaran
                const matchedProtaRow = tempProtaContent.find(pRow => String(pRow.kodeTp).trim() === String(row.kodeTp).trim());
                if (matchedProtaRow) {
                    return {
                        ...row,
                        alokasiWaktu: matchedProtaRow.alokasiWaktu
                    };
                }
                return row;
            });

            // Update ATP in Firestore
            const updatedAtp = await apiService.updateATP(activeAtp.id, {
                content: updatedAtpContent
            });

            // Update local states
            setAtps(prev => prev.map(a => a.id === activeAtp.id ? { ...a, content: updatedAtpContent } : a));
            setSelectedATP(updatedAtp);
        }

        // 3. Sync to PROSEM (Program Semester) if exists (Regenerate in-place programmatically)
        const isGrade9 = selectedTP.grade.includes('9') || selectedTP.grade.toUpperCase().includes('IX');
        const defaultGanjil78 = { 'Juli': [1, 2, 3, 4], 'Agustus': [1, 2, 3, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [1, 2, 3, 4] };
        const defaultGenap78 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [1, 2, 3, 4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 3, 4], 'Juni': [1, 2, 3, 4, 5] };
        const defaultGanjil9 = { 'Juli': [1, 2, 3], 'Agustus': [1, 2, 3, 4], 'September': [1, 2, 3], 'Oktober': [1, 2, 3], 'November': [1, 2, 3], 'Desember': [1] };
        const defaultGenap9 = { 'Januari': [1, 2, 3], 'Februari': [1, 2, 3], 'Maret': [1, 2, 3, 4], 'April': [1, 2, 3], 'Mei': [1, 2, 3], 'Juni': [1] };

        const sanitizeWeeksObj = (val: any, defaultVal: Record<string, number[]>): Record<string, number[]> => {
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

        let weeksToUseGanjil = isGrade9 ? defaultGanjil9 : defaultGanjil78;
        let weeksToUseGenap = isGrade9 ? defaultGenap9 : defaultGenap78;

        if (globalSettings) {
            if (isGrade9) {
                weeksToUseGanjil = sanitizeWeeksObj(globalSettings.weeksGanjil9, defaultGanjil9);
                weeksToUseGenap = sanitizeWeeksObj(globalSettings.weeksGenap9, defaultGenap9);
            } else {
                weeksToUseGanjil = sanitizeWeeksObj(globalSettings.weeksGanjil78, defaultGanjil78);
                weeksToUseGenap = sanitizeWeeksObj(globalSettings.weeksGenap78, defaultGenap78);
            }
        }

        let existingProsems: PROSEMData[] = [];
        try {
            existingProsems = await apiService.getPROSEMByProtaId(protaToUpdate.id);
        } catch (err) {
            console.warn("Gagal mengambil PROSEM lama:", err);
        }

        let updatedGanjilProsem: PROSEMData | null = null;
        let updatedGenapProsem: PROSEMData | null = null;

        const ganjilProsemDoc = existingProsems.find(p => p.semester === 'Ganjil');
        if (ganjilProsemDoc) {
            const regeneratedGanjil = await geminiService.generatePROSEM(updatedProta, 'Ganjil', selectedTP.grade, weeksToUseGanjil);
            updatedGanjilProsem = await apiService.updatePROSEM(ganjilProsemDoc.id, {
                headers: regeneratedGanjil.headers,
                content: regeneratedGanjil.content
            });
        }

        const genapProsemDoc = existingProsems.find(p => p.semester === 'Genap');
        if (genapProsemDoc) {
            const regeneratedGenap = await geminiService.generatePROSEM(updatedProta, 'Genap', selectedTP.grade, weeksToUseGenap);
            updatedGenapProsem = await apiService.updatePROSEM(genapProsemDoc.id, {
                headers: regeneratedGenap.headers,
                content: regeneratedGenap.content
            });
        }

        if (prosemData) {
            setProsemData({
                ganjil: updatedGanjilProsem || prosemData.ganjil,
                genap: updatedGenapProsem || prosemData.genap
            });
        } else if (updatedGanjilProsem || updatedGenapProsem) {
            setProsemData({
                ganjil: updatedGanjilProsem,
                genap: updatedGenapProsem
            });
        }

        setProtas([updatedProta]);
        setIsEditingProtaJp(false);
        setTempProtaContent([]);

        let successMessage = "Alokasi Waktu (JP) pada PROTA berhasil diperbarui.";
        if (activeAtp) {
            successMessage += " Perubahan otomatis disinkronkan ke ATP.";
        }
        if (updatedGanjilProsem || updatedGenapProsem) {
            successMessage += " Distribusi mingguan PROSEM juga disesuaikan secara real-time.";
        }
        setTransientMessage(successMessage);
      } catch (error: any) {
        setProtaError(`Gagal memperbarui JP PROTA: ${error.message}`);
      } finally {
        setLoadingState({ isLoading: false, title: '', message: '' });
      }
    };

    if (hasGanjilMismatch || hasGenapMismatch) {
      let warningMessage = "Alokasi waktu (JP) yang Anda tentukan belum sesuai dengan target minggu efektif:\n\n";
      if (hasGanjilMismatch) {
          warningMessage += `• Semester Ganjil: Target ${targetGanjil} JP, teralokasi ${allocatedGanjil} JP (${allocatedGanjil > targetGanjil ? 'Kelebihan' : 'Kekurangan'} ${Math.abs(targetGanjil - allocatedGanjil)} JP)\n`;
      }
      if (hasGenapMismatch) {
          warningMessage += `• Semester Genap: Target ${targetGenap} JP, teralokasi ${allocatedGenap} JP (${allocatedGenap > targetGenap ? 'Kelebihan' : 'Kekurangan'} ${Math.abs(targetGenap - allocatedGenap)} JP)\n`;
      }
      warningMessage += "\nHal ini dapat menyebabkan beberapa TP di PROSEM tidak kebagian minggu pelaksanaan, atau ada sisa minggu kosong di akhir semester. Apakah Anda yakin tetap ingin menyimpannya?";

      showConfirm(
          "Alokasi JP Tidak Seimbang",
          warningMessage,
          () => {
              closeConfirm();
              saveAction();
          }
      );
    } else {
      saveAction();
    }
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
          console.log("App.tsx: updateTP completed, now deleting associated downstream data");
          
          // Automatically delete related ATP, PROTA, KKTP, and PROSEM to ensure data consistency
          try {
              await Promise.all([
                  apiService.deleteATPsByTPId(editingTP.id),
                  apiService.deletePROTAsByTPId(editingTP.id),
                  apiService.deleteKKTPsByTPId(editingTP.id),
                  apiService.deletePROSEMsByTPId(editingTP.id)
              ]);
          } catch (deleteErr) {
              console.warn("Gagal menghapus data lama otomatis:", deleteErr);
          }
          
          tpsCache.current[selectedSubject] = undefined; // Invalidate cache
          setTransientMessage("Tujuan Pembelajaran berhasil diperbarui. Data ATP, Prota, KKTP, dan Prosem lama otomatis dihapus agar tetap sinkron.");
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
            const updated = await apiService.updateATP(id, data);
            
            // Automatically delete related KKTP, PROTA, and PROSEM to keep them synchronized
            try {
                await Promise.allSettled([
                    apiService.deleteKKTPsByATPId(id),
                    apiService.deletePROTAsByTPId(selectedTP.id!),
                    apiService.deletePROSEMsByTPId(selectedTP.id!)
                ]);
            } catch (err) {
                console.warn("Gagal menghapus data lama otomatis:", err);
            }

            // Clear local states for downstream documents
            setProtas([]);
            setProsemData(null);
            setKktpData(null);

            setAtps(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
            setSelectedATP(updated);
            setTransientMessage("ATP berhasil diperbarui. Perangkat ajar terkait (Prota, Prosem, KKTP) otomatis dihapus agar Anda dapat membuat ulang secara presisi.");
            setView('view_atp_detail');
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
    
    // Determine grade level
    const isGrade9 = selectedTP.grade.includes('9') || selectedTP.grade.toUpperCase().includes('IX');
    
    // Default week arrays for fallback and sanitization
    const defaultGanjil78 = { 'Juli': [1, 2, 3, 4], 'Agustus': [1, 2, 3, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [1, 2, 3, 4] };
    const defaultGenap78 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [1, 2, 3, 4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 3, 4], 'Juni': [1, 2, 3, 4, 5] };
    const defaultGanjil9 = { 'Juli': [1, 2, 3], 'Agustus': [1, 2, 3, 4], 'September': [1, 2, 3], 'Oktober': [1, 2, 3], 'November': [1, 2, 3], 'Desember': [1] };
    const defaultGenap9 = { 'Januari': [1, 2, 3], 'Februari': [1, 2, 3], 'Maret': [1, 2, 3, 4], 'April': [1, 2, 3], 'Mei': [1, 2, 3], 'Juni': [1] };

    const sanitizeWeeksObj = (val: any, defaultVal: Record<string, number[]>): Record<string, number[]> => {
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

    // Get customWeeks based on grade level and semester from globalSettings
    let weeksToUse: Record<string, number[]> | undefined = undefined;
    
    let currentSettings = globalSettings;
    if (!currentSettings) {
        try {
            currentSettings = await getAdminSettings();
            if (currentSettings) {
                setGlobalSettings(currentSettings);
            }
        } catch (e) {
            console.error("Gagal memuat settings on-the-fly", e);
        }
    }

    if (currentSettings) {
        if (isGrade9) {
            const rawWeeksObj = semester === 'Ganjil' ? currentSettings.weeksGanjil9 : currentSettings.weeksGenap9;
            weeksToUse = sanitizeWeeksObj(rawWeeksObj, semester === 'Ganjil' ? defaultGanjil9 : defaultGenap9);
        } else {
            const rawWeeksObj = semester === 'Ganjil' ? currentSettings.weeksGanjil78 : currentSettings.weeksGenap78;
            weeksToUse = sanitizeWeeksObj(rawWeeksObj, semester === 'Ganjil' ? defaultGanjil78 : defaultGenap78);
        }
    } else {
        if (isGrade9) {
            weeksToUse = semester === 'Ganjil' ? defaultGanjil9 : defaultGenap9;
        } else {
            weeksToUse = semester === 'Ganjil' ? defaultGanjil78 : defaultGenap78;
        }
    }

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
                return await geminiService.generatePROSEM(prota, semesterToGen, selectedTP.grade, weeksToUse);
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
        @page Section1 {
          size: 841.9pt 595.3pt;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-page-orientation: landscape;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
        p, li, h2, h1, div { margin: 0pt; padding: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; }
        table { border-collapse: collapse; width: auto; mso-table-layout-alt: auto; }
        th, td { border: 1px solid black; padding: 4px; text-align: left; vertical-align: top; margin: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; font-size: 10pt; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin: 0; padding: 0;}
        .header-table { margin-bottom: 12.0pt; mso-margin-after-alt: 12.0pt; width: 100%; border: none; table-layout: fixed; }
        .header-table td {
          border: none;
          font-size: 12pt;
          padding: 1px 0;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
        }
        .no-wrap { white-space: nowrap; }
        .text-center { text-align: center; }
        .cp-container { border: 1px solid black; padding: 10px; margin-bottom: 15px; background-color: #f9f9f9; }
        .cp-title { font-size: 12pt; font-weight: bold; margin: 0 0 10px 0; }
        .signature-table { width: 736.97pt; border: none; text-align: left; table-layout: fixed; margin-left: 36.0pt; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td {
          border: none;
          text-align: left;
          vertical-align: top;
          padding: 1px 5px;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
          font-size: 11pt;
        }
        .signature-td-left { width: 566.9pt; }
        .signature-td-right { width: 170.07pt; }
      </style>
    `;

    const identityTable = `
      <table class="header-table">
        <colgroup>
          <col style="width: 150px;" />
          <col style="width: auto;" />
        </colgroup>
        <tr><td class="no-wrap" style="width: 150px; padding-left: 0; font-weight: bold;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td class="no-wrap" style="padding-left: 0; font-weight: bold;">Mata Pelajaran</td><td>: ${selectedATP.subject}</td></tr>
        <tr><td class="no-wrap" style="padding-left: 0; font-weight: bold;">Kelas</td><td>: ${selectedTP.grade} / Fase D</td></tr>
        <tr><td class="no-wrap" style="padding-left: 0; font-weight: bold;">Tahun Ajaran</td><td>: ${globalSettings?.tahunPelajaran || '2025/2026'}</td></tr>
      </table>
    `;

    const formatWordHtml = (text?: string) => {
      if (!text) return '-';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        return lines.map(line => {
          const clean = line.replace(/^[\s\-\*\•\+]+/, '').trim();
          return `• ${clean}`;
        }).join('<br/>');
      }
      return text.replace(/^[\s\-\*\•\+]+/, '').trim();
    };

    const atpRows = selectedATP.content.map(row => `
      <tr>
        <td class="text-center">${row.atpSequence}</td>
        <td class="text-center">${row.kodeTp || ''}</td>
        <td>${row.topikMateri}</td>
        <td>${row.tp}</td>
        <td class="text-center">${row.alokasiWaktu || ''}</td>
        <td class="text-center">${row.semester}</td>
        <td>${formatWordHtml(row.integrasiPancaCinta)}</td>
        <td>${formatWordHtml(row.aktivitasCinta)}</td>
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
      <p style="margin: 0pt 0pt 12.0pt 0pt; mso-margin-after-alt: 12.0pt; font-size: 1pt; line-height: 1pt;">&nbsp;</p>
      ${cpElementsHtml}
      <table style="width: 100%; table-layout: fixed;">
        <colgroup>
          <col style="width: 4%;" />
          <col style="width: 8%;" />
          <col style="width: 15%;" />
          <col style="width: 25%;" />
          <col style="width: 8%;" />
          <col style="width: 8%;" />
          <col style="width: 12%;" />
          <col style="width: 20%;" />
        </colgroup>
        <thead>
          <tr>
            <th class="text-center">No</th>
            <th class="text-center">Kode TP</th>
            <th>Topik/Materi</th>
            <th>Tujuan Pembelajaran (TP)</th>
            <th class="text-center">Alokasi Waktu (JP)</th>
            <th class="text-center">Semester</th>
            <th>Integrasi Panca Cinta</th>
            <th>Aktivitas Cinta dalam Pembelajaran</th>
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
        <table class="signature-table">
          <colgroup>
            <col style="width: 566.9pt;" />
            <col style="width: 170.07pt;" />
          </colgroup>
          <tbody>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">Mengetahui,</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">Kepala Madrasah,</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td signature-td-left" style="width: 566.9pt; height: 45px;">&nbsp;</td><td class="signature-td signature-td-right" style="width: 170.07pt; height: 45px;">&nbsp;</td></tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt; font-weight: bold; text-decoration: underline;">${globalSettings?.kepalaMadrasah || "Sulthon Sulaiman, M.Pd.I"}</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt; font-weight: bold; text-decoration: underline;">${selectedATP.creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">NIP. ${globalSettings?.nipKepalaMadrasah || '198106162005011003'}</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">NIP. -</td>
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
          <div class="Section1">
            ${mainContent}
            ${signatureBlock}
          </div>
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
        @page Section1 {
          size: 595.3pt 841.9pt;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
        p, li, h2, h1, div { margin: 0pt; padding: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; }
        table { border-collapse: collapse; width: auto; mso-table-layout-alt: auto; }
        th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; margin: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; font-size: 10pt; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; }
        .header-table { margin-bottom: 12.0pt; mso-margin-after-alt: 12.0pt; width: 100%; border: none; table-layout: fixed; }
        .header-table td {
          border: none;
          font-size: 12pt;
          padding: 1px 0;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
        }
        .no-wrap { white-space: nowrap; }
        .text-center { text-align: center; }
        .signature-table { width: 622.0pt; border: none; text-align: left; table-layout: fixed; margin-left: 36.0pt; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td {
          border: none;
          width: 311.0pt;
          text-align: left;
          vertical-align: top;
          padding: 1px 5px;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
          font-size: 12pt;
        }
      </style>
    `;

    const identityTable = `
      <table class="header-table">
        <colgroup>
          <col style="width: 150px;" />
          <col style="width: auto;" />
        </colgroup>
        <tr><td class="no-wrap" style="width: 150px; font-weight: bold;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Mata Pelajaran</td><td>: ${currentProta.subject}</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Kelas</td><td>: ${selectedTP.grade} / Fase D</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Tahun Ajaran</td><td>: ${globalSettings?.tahunPelajaran || '2025/2026'}</td></tr>
      </table>
    `;

    const formatWordHtml = (text?: string) => {
      if (!text) return '-';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        return lines.map(line => {
          const clean = line.replace(/^[\s\-\*\•\+]+/, '').trim();
          return `• ${clean}`;
        }).join('<br/>');
      }
      return text.replace(/^[\s\-\*\•\+]+/, '').trim();
    };

    const protaRows = currentProta.content.map(row => `
      <tr>
        <td class="text-center">${row.no}</td>
        <td class="text-center">${row.semester}</td>
        <td class="text-center">${row.kodeTp}</td>
        <td>${row.topikMateri}</td>
        <td>${row.tp}</td>
        <td>${formatWordHtml(row.integrasiPancaCinta)}</td>
        <td>${formatWordHtml(row.aktivitasCinta)}</td>
        <td class="text-center">${row.alokasiWaktu}</td>
      </tr>
    `).join('');

    const totalJp = currentProta.content.reduce((sum, row) => sum + (parseInt(row.alokasiWaktu) || 0), 0);
    
    const totalRow = `
        <tfoot>
            <tr>
                <td colspan="7" style="font-weight: bold; text-align: right; padding-right: 10px;">Total Jam Pertemuan (JP)</td>
                <td class="text-center" style="font-weight: bold;">${totalJp} JP</td>
            </tr>
        </tfoot>
    `;

    const mainContent = `
      <p class="title">PROGRAM TAHUNAN (PROTA)</p>
      <br>
      ${identityTable}
      <p style="margin: 0pt 0pt 12.0pt 0pt; mso-margin-after-alt: 12.0pt; font-size: 1pt; line-height: 1pt;">&nbsp;</p>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 5%;">No</th>
            <th class="text-center" style="width: 10%;">Semester</th>
            <th class="text-center" style="width: 10%;">Kode TP</th>
            <th style="width: 15%;">Topik/Materi Pokok</th>
            <th style="width: 25%;">Tujuan Pembelajaran (TP)</th>
            <th style="width: 15%;">Integrasi Panca Cinta</th>
            <th style="width: 20%;">Aktivitas Cinta dalam Pembelajaran</th>
            <th class="text-center" style="width: 10%;">Alokasi Waktu (JP)</th>
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
        <table class="signature-table">
          <tbody>
            <tr>
              <td class="signature-td">Mengetahui,</td>
              <td class="signature-td">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td">Kepala Madrasah,</td>
              <td class="signature-td">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td" style="height: 45px;">&nbsp;</td><td class="signature-td" style="height: 45px;">&nbsp;</td></tr>
            <tr>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${globalSettings?.kepalaMadrasah || "Sulthon Sulaiman, M.Pd.I"}</td>
              <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${currentProta.creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td">NIP. ${globalSettings?.nipKepalaMadrasah || '198106162005011003'}</td>
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
          <div class="Section1">
            ${mainContent}
            ${signatureBlock}
          </div>
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

  const handleExportRpeToWord = () => {
    if (!selectedTP || protas.length === 0) return;
    
    const currentProta = protas[0];
    const grade = selectedTP.grade;
    const subject = selectedTP.subject;
    const creatorName = currentProta.creatorName || selectedTP.creatorName || user?.displayName || "Guru Mata Pelajaran";
    const jamWeekly = currentProta.jamPertemuan || 2;

    const MONTH_MAX_WEEKS_LOCAL: Record<string, number> = {
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

    const CODE_DESCRIPTIONS_LOCAL: Record<string, string> = {
      'LS2': 'Libur Semester 2',
      'MTM': 'Masa Ta\'aruf Siswa Madrasah (MATSAMA)',
      'PHBN': 'Peringatan Hari Besar Nasional',
      'SAS': 'Sumatif Akhir Semester',
      'UP': 'Ujian Praktik / Penilaian Akhir',
      'LS1': 'Libur Semester 1',
      'LHR': 'Libur Hari Raya / Keagamaan'
    };

    const getMonthKeteranganDoc = (
      semester: 'Ganjil' | 'Genap',
      month: string,
      activeWeeks: number[]
    ): string => {
      const maxWeeks = MONTH_MAX_WEEKS_LOCAL[month] || 5;
      const inactiveWeeks = Array.from({ length: maxWeeks }, (_, i) => i + 1).filter(w => !activeWeeks.includes(w));
      
      const realInactiveWeeks = inactiveWeeks.filter(w => {
        const label = getWeekInactiveLabel(semester, grade, month, w);
        return !label || label.trim().toLowerCase() !== 'x';
      });

      if (realInactiveWeeks.length === 0) {
        return 'Semua pekan efektif';
      }
      
      const codeGroups: Record<string, number[]> = {};
      realInactiveWeeks.forEach(w => {
        const code = getWeekInactiveLabel(semester, grade, month, w) || 'N/E';
        if (!codeGroups[code]) {
          codeGroups[code] = [];
        }
        codeGroups[code].push(w);
      });
      
      const parts = Object.entries(codeGroups).map(([code, weeks]) => {
        const weekStr = weeks.map(w => `Pekan ${w}`).join(', ');
        const desc = CODE_DESCRIPTIONS_LOCAL[code] ? ` (${CODE_DESCRIPTIONS_LOCAL[code]})` : '';
        return `${weekStr}: ${code}${desc}`;
      });
      
      return parts.join('; ');
    };

    const buildSemesterTableHtml = (semester: 'Ganjil' | 'Genap') => {
      const months = semester === 'Ganjil'
        ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

      const weeksList = getSemesterWeeksList(semester, grade);
      
      let totalPekan = 0;
      let totalPekanEfektif = 0;
      let totalPekanTidakEfektif = 0;

      const rowsHtml = months.map((m, idx) => {
        const activeWeeks = weeksList[m] || [];
        const maxWeeks = MONTH_MAX_WEEKS_LOCAL[m] || 5;
        
        let xWeeksCount = 0;
        for (let w = 1; w <= maxWeeks; w++) {
          if (!activeWeeks.includes(w)) {
            const label = getWeekInactiveLabel(semester, grade, m, w);
            if (label && label.trim().toLowerCase() === 'x') {
              xWeeksCount++;
            }
          }
        }

        const actualMaxWeeks = maxWeeks - xWeeksCount;
        const efektif = activeWeeks.length;
        const tidakEfektif = Math.max(0, actualMaxWeeks - efektif);

        totalPekan += actualMaxWeeks;
        totalPekanEfektif += efektif;
        totalPekanTidakEfektif += tidakEfektif;
        const keterangan = getMonthKeteranganDoc(semester, m, activeWeeks);

        return `
          <tr>
            <td class="text-center" style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: bold;">${m}</td>
            <td class="text-center" style="text-align: center;">${actualMaxWeeks}</td>
            <td class="text-center" style="text-align: center;">${efektif}</td>
            <td class="text-center" style="text-align: center;">${tidakEfektif}</td>
            <td>${keterangan}</td>
          </tr>
        `;
      }).join('');

      const totalJp = totalPekanEfektif * jamWeekly;

      return `
        <p style="font-weight: bold; font-size: 11pt; margin-top: 10px; margin-bottom: 3px; mso-margin-after-alt: 0pt; mso-margin-top-alt: 10pt;">SEMESTER ${semester.toUpperCase()}</p>
        <table class="semester-table" style="border-collapse: collapse; margin-top: 2px; margin-bottom: 10px;">
          <thead>
            <tr>
              <th style="text-align: center; font-weight: bold; background-color: #f2f2f2; border: 1px solid black; padding: 4px 6px;">No</th>
              <th style="text-align: left; font-weight: bold; background-color: #f2f2f2; border: 1px solid black; padding: 4px 6px;">Nama Bulan</th>
              <th style="text-align: center; font-weight: bold; background-color: #f2f2f2; border: 1px solid black; padding: 4px 6px;">Jumlah Pekan</th>
              <th style="text-align: center; font-weight: bold; background-color: #f2f2f2; border: 1px solid black; padding: 4px 6px;">Pekan Efektif</th>
              <th style="text-align: center; font-weight: bold; background-color: #f2f2f2; border: 1px solid black; padding: 4px 6px;">Pekan Tidak Efektif</th>
              <th style="text-align: left; font-weight: bold; background-color: #f2f2f2; border: 1px solid black; padding: 4px 6px;">Keterangan / Alasan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td colspan="2" style="text-align: right; border: 1px solid black; padding: 4px 6px;">Jumlah Total</td>
              <td class="text-center" style="text-align: center; border: 1px solid black; padding: 4px 6px;">${totalPekan}</td>
              <td class="text-center" style="text-align: center; border: 1px solid black; padding: 4px 6px;">${totalPekanEfektif}</td>
              <td class="text-center" style="text-align: center; border: 1px solid black; padding: 4px 6px;">${totalPekanTidakEfektif}</td>
              <td style="font-size: 10pt; font-weight: normal; font-style: italic; border: 1px solid black; padding: 4px 6px;">Pekan Efektif = ${totalPekanEfektif} Minggu</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 2px; margin-bottom: 5px; font-weight: bold; mso-margin-after-alt: 0pt; mso-margin-top-alt: 2pt;">
          Total Alokasi Waktu: ${totalPekanEfektif} Pekan Efektif x ${jamWeekly} JP = ${totalJp} JP
        </p>
      `;
    };

    const styles = `
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.15; }
        p, li, h2, h1, div { margin: 0pt; padding: 0pt; margin-bottom: 0pt; mso-margin-after-alt: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; }
        table { border-collapse: collapse; margin-top: 3px; margin-bottom: 8px; }
        .semester-table { width: auto; mso-table-layout-alt: auto; }
        th, td {
          border: 1px solid black;
          padding: 4px 6px;
          text-align: left;
          vertical-align: top;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
        }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 12pt; mso-margin-after-alt: 12pt; }
        .header-table { margin-bottom: 12.0pt; mso-margin-after-alt: 12.0pt; border: none; table-layout: fixed; width: 100%; }
        .header-table td { border: none; font-size: 11pt; padding: 1px 0; }
        .no-wrap { white-space: nowrap; }
        .text-center { text-align: center; }
        .signature-table { width: 622.0pt; border: none; text-align: left; table-layout: fixed; margin-left: 36pt; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td { border: none; width: 311.0pt; text-align: left; vertical-align: top; padding: 1px 5px; }
      </style>
    `;

    const identityTable = `
      <table class="header-table" style="width: 100%; border: none;">
        <colgroup>
          <col style="width: 150px;" />
          <col style="width: auto;" />
        </colgroup>
        <tr><td class="no-wrap" style="width: 150px; font-weight: bold;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Mata Pelajaran</td><td>: ${subject}</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Kelas</td><td>: ${grade} / Fase D</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Tahun Pelajaran</td><td>: ${globalSettings?.tahunPelajaran || '2025/2026'}</td></tr>
      </table>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          <div class="Section1">
            <p class="title" style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 12pt; mso-margin-after-alt: 12pt;">RINCIAN PEKAN EFEKTIF (RPE)</p>
            ${identityTable}
            <p style="margin: 0pt 0pt 12.0pt 0pt; mso-margin-after-alt: 12.0pt; font-size: 1pt; line-height: 1pt;">&nbsp;</p>
            
            ${buildSemesterTableHtml('Ganjil')}
            <br>
            ${buildSemesterTableHtml('Genap')}

            <div class="signature-table-container">
              <br>
              <table class="signature-table">
                <colgroup>
                  <col style="width: 311.0pt;" />
                  <col style="width: 311.0pt;" />
                </colgroup>
                <tbody>
                  <tr>
                    <td class="signature-td">Mengetahui,</td>
                    <td class="signature-td">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td class="signature-td">Kepala Madrasah,</td>
                    <td class="signature-td">Guru Mata Pelajaran,</td>
                  </tr>
                  <tr><td class="signature-td" style="height: 45px;">&nbsp;</td><td class="signature-td" style="height: 45px;">&nbsp;</td></tr>
                  <tr>
                    <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${globalSettings?.kepalaMadrasah || "Sulthon Sulaiman, M.Pd.I"}</td>
                    <td class="signature-td" style="font-weight: bold; text-decoration: underline;">${creatorName}</td>
                  </tr>
                  <tr>
                    <td class="signature-td">NIP. ${globalSettings?.nipKepalaMadrasah || '198106162005011003'}</td>
                    <td class="signature-td">NIP. -</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `RPE_${subject.replace(/ /g, '_')}_Kelas_${grade}.doc`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setCopyNotification('File Word RPE berhasil diunduh!');
    setTimeout(() => setCopyNotification(''), 2000);
  };

  const handleExportKktpToWord = (semester: 'Ganjil' | 'Genap') => {
    const dataToExport = semester === 'Ganjil' ? kktpData?.ganjil : kktpData?.genap;
    if (!dataToExport || !selectedTP || !selectedATP) return;
    
    const formatWordHtml = (text?: string) => {
      if (!text) return '-';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        return lines.map(line => {
          const clean = line.replace(/^[\s\-\*\•\+]+/, '').trim();
          return `• ${clean}`;
        }).join('<br/>');
      }
      return text.replace(/^[\s\-\*\•\+]+/, '').trim();
    };

    const styles = `
      <style>
        @page Section1 {
          size: 841.9pt 595.3pt;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-page-orientation: landscape;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
        p, li, h2, h1, div { margin: 0pt; padding: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; }
        table { border-collapse: collapse; width: auto; mso-table-layout-alt: auto; }
        th, td { border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle; margin: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; font-size: 10pt; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 5px; }
        .header-table { margin-bottom: 12.0pt; mso-margin-after-alt: 12.0pt; width: 100%; border: none; table-layout: fixed; }
        .header-table td {
          border: none;
          font-size: 12pt;
          padding: 1px 0;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
        }
        .text-center { text-align: center; }
        .kriteria-cell { padding: 0; margin: 0; }
        .kriteria-table { width: 100%; height: 100%; border: none; }
        .kriteria-table td { border: none; border-bottom: 1px solid #dddddd; padding: 4px; font-size: 10pt; }
        .kriteria-table tr:last-child td { border-bottom: none; }
        .signature-table { width: 736.97pt; border: none; text-align: left; table-layout: fixed; margin-left: 36.0pt; }
        .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
        .signature-td {
          border: none;
          text-align: left;
          vertical-align: top;
          padding: 1px 5px;
          margin: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
          mso-margin-after-alt: 0pt;
          font-size: 11pt;
        }
        .signature-td-left { width: 566.9pt; }
        .signature-td-right { width: 170.07pt; }
      </style>
    `;

    const identityTable = `
      <table class="header-table">
        <colgroup>
          <col style="width: 150px;" />
          <col style="width: auto;" />
        </colgroup>
        <tr><td class="no-wrap" style="width: 150px; font-weight: bold;">Nama Madrasah</td><td>: MTsN 4 Jombang</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Mata Pelajaran</td><td>: ${dataToExport.subject}</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Kelas/Fase</td><td>: ${dataToExport.grade} / Fase D</td></tr>
        <tr><td class="no-wrap" style="font-weight: bold;">Semester</td><td>: ${dataToExport.semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}</td></tr>
      </table>
    `;

    const kktpRows = dataToExport.content.map(row => `
      <tr>
        <td class="text-center" rowspan="4" style="vertical-align: top; text-align: center;">${row.no}</td>
        <td rowspan="4" style="vertical-align: top;">${row.materiPokok}</td>
        <td rowspan="4" style="vertical-align: top;">${row.tp}</td>
        <td rowspan="4" style="vertical-align: top;">${formatWordHtml(row.integrasiPancaCinta)}</td>
        <td class="text-center" style="vertical-align: top; font-weight: bold; text-align: center; background-color: #f9f9f9;">Mahir</td>
        <td style="vertical-align: top;">${row.kriteria?.mahir || '-'}</td>
        <td rowspan="4" class="text-center" style="vertical-align: middle; font-size: 10pt; text-align: center; font-weight: bold; background-color: #f9f9f9;">
          Murid dianggap Tuntas jika minimal berada pada tahapan perkembangan: <br><b>Cakap</b>
        </td>
      </tr>
      <tr>
        <td class="text-center" style="vertical-align: top; font-weight: bold; text-align: center; background-color: #f9f9f9;">Cakap</td>
        <td style="vertical-align: top;">${row.kriteria?.cakap || '-'}</td>
      </tr>
      <tr>
        <td class="text-center" style="vertical-align: top; font-weight: bold; text-align: center; background-color: #f9f9f9;">Layak</td>
        <td style="vertical-align: top;">${row.kriteria?.layak || '-'}</td>
      </tr>
       <tr>
        <td class="text-center" style="vertical-align: top; font-weight: bold; text-align: center; background-color: #f9f9f9;">Baru Berkembang</td>
        <td style="vertical-align: top;">${row.kriteria?.baruBerkembang || '-'}</td>
      </tr>
    `).join('');


    const mainContent = `
      <p class="title">KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)</p>
      <br>
      ${identityTable}
      <p style="margin: 0pt 0pt 12.0pt 0pt; mso-margin-after-alt: 12.0pt; font-size: 1pt; line-height: 1pt;">&nbsp;</p>
      <table style="width: 100%; border-collapse: collapse;">
        <colgroup>
          <col style="width: 4%;" />
          <col style="width: 16%;" />
          <col style="width: 25%;" />
          <col style="width: 15%;" />
          <col style="width: 12%;" />
          <col style="width: 18%;" />
          <col style="width: 10%;" />
        </colgroup>
        <thead>
          <tr>
            <th class="text-center">No</th>
            <th>Materi Pokok</th>
            <th>Tujuan Pembelajaran</th>
            <th>Integrasi Panca Cinta</th>
            <th class="text-center">Tahapan Perkembangan</th>
            <th>Kriteria</th>
            <th class="text-center">Ketercapaian</th>
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
        <table class="signature-table">
          <colgroup>
            <col style="width: 566.9pt;" />
            <col style="width: 170.07pt;" />
          </colgroup>
          <tbody>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">Mengetahui,</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">Kepala Madrasah,</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td signature-td-left" style="width: 566.9pt; height: 45px;">&nbsp;</td><td class="signature-td signature-td-right" style="width: 170.07pt; height: 45px;">&nbsp;</td></tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt; font-weight: bold; text-decoration: underline;">${globalSettings?.kepalaMadrasah || "Sulthon Sulaiman, M.Pd.I"}</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt; font-weight: bold; text-decoration: underline;">${selectedATP.creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">NIP. ${globalSettings?.nipKepalaMadrasah || '198106162005011003'}</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">NIP. -</td>
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
          <div class="Section1">
            ${mainContent}
            ${signatureBlock}
          </div>
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

  const getEnrichedProsemData = (data: PROSEMData | null): PROSEMData | null => {
    if (!data) return null;
    
    const isGrade9 = data.grade.includes('9') || data.grade.toUpperCase().includes('IX');
    
    const defaultGanjil78 = { 'Juli': [1, 2, 3, 4], 'Agustus': [1, 2, 3, 4, 5], 'September': [1, 2, 3, 4], 'Oktober': [1, 2, 3, 4], 'November': [1, 2, 3, 4, 5], 'Desember': [1, 2, 3, 4] };
    const defaultGenap78 = { 'Januari': [1, 2, 3, 4], 'Februari': [1, 2, 3, 4], 'Maret': [1, 2, 3, 4, 5], 'April': [1, 2, 3, 4], 'Mei': [1, 2, 3, 4], 'Juni': [1, 2, 3, 4, 5] };
    const defaultGanjil9 = { 'Juli': [1, 2, 3], 'Agustus': [1, 2, 3, 4], 'September': [1, 2, 3], 'Oktober': [1, 2, 3], 'November': [1, 2, 3], 'Desember': [1] };
    const defaultGenap9 = { 'Januari': [1, 2, 3], 'Februari': [1, 2, 3], 'Maret': [1, 2, 3, 4], 'April': [1, 2, 3], 'Mei': [1, 2, 3], 'Juni': [1] };

    const getWeekNumbersFromSettings = (
        settings: typeof globalSettings,
        grade: string,
        semester: 'Ganjil' | 'Genap',
        month: string
    ): number[] => {
        const defaultVal = semester === 'Ganjil'
            ? (isGrade9 ? defaultGanjil9 : defaultGanjil78)
            : (isGrade9 ? defaultGenap9 : defaultGenap78);

        if (!settings) {
            return defaultVal[month as keyof typeof defaultVal] || [1, 2, 3, 4, 5];
        }

        let rawWeeksObj: any = null;
        if (isGrade9) {
            rawWeeksObj = semester === 'Ganjil' ? settings.weeksGanjil9 : settings.weeksGenap9;
        } else {
            rawWeeksObj = semester === 'Ganjil' ? settings.weeksGanjil78 : settings.weeksGenap78;
        }

        if (rawWeeksObj && rawWeeksObj[month]) {
            const val = rawWeeksObj[month];
            if (Array.isArray(val)) {
                return val.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5).sort((a, b) => a - b);
            } else if (typeof val === 'number') {
                return Array.from({ length: val }, (_, i) => i + 1);
            }
        }

        return defaultVal[month as keyof typeof defaultVal] || [1, 2, 3, 4, 5];
    };

    const enrichedHeaders = data.headers.map(header => {
        const weekNumbers = getWeekNumbersFromSettings(globalSettings, data.grade, data.semester, header.month);
        return {
            ...header,
            weeks: weekNumbers.length,
            weekNumbers: weekNumbers
        };
    }).filter(h => h.weeks > 0);

    return {
        ...data,
        headers: enrichedHeaders
    };
  };

  const handleExportProsemToWord = (semester: 'Ganjil' | 'Genap') => {
      const rawDataToExport = semester === 'Ganjil' ? prosemData?.ganjil : prosemData?.genap;
      if (!rawDataToExport || !selectedTP || protas.length === 0) return;
      const dataToExport = getEnrichedProsemData(rawDataToExport);
      if (!dataToExport) return;
      const creatorName = protas[0].creatorName;
  
      const styles = `
        <style>
          @page Section1 {
            size: 841.9pt 595.3pt;
            margin: 36.0pt 36.0pt 36.0pt 36.0pt;
            mso-header-margin: 36.0pt;
            mso-footer-margin: 36.0pt;
            mso-page-orientation: landscape;
          }
          div.Section1 { page: Section1; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; }
          p, li, h2, h1, div { margin: 0pt; padding: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; }
          table { border-collapse: collapse; width: auto; mso-table-layout-alt: auto; }
          th, td { border: 1px solid black; padding: 3px; text-align: left; vertical-align: middle; margin: 0pt; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; mso-margin-after-alt: 0pt; }
          th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
          .title { text-align: center; font-weight: bold; font-size: 14pt; }
          .header-table { margin-bottom: 12.0pt; mso-margin-after-alt: 12.0pt; width: 100%; border: none; table-layout: fixed; }
          .header-table td {
            border: none;
            font-size: 12pt;
            padding: 1px 0;
            margin: 0pt;
            mso-margin-top-alt: 0pt;
            mso-margin-bottom-alt: 0pt;
            mso-margin-after-alt: 0pt;
          }
          .text-center { text-align: center; }
          .rotate { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
          .signature-table { width: 736.97pt; border: none; text-align: left; table-layout: fixed; margin-left: 36.0pt; }
          .signature-table-container { page-break-inside: avoid; margin-top: 15px; }
          .signature-td {
            border: none;
            text-align: left;
            vertical-align: top;
            padding: 1px 5px;
            margin: 0pt;
            mso-margin-top-alt: 0pt;
            mso-margin-bottom-alt: 0pt;
            mso-margin-after-alt: 0pt;
          }
          .signature-td-left { width: 566.9pt; }
          .signature-td-right { width: 170.07pt; }
        </style>
      `;
  
      const identityTable = `
        <table class="header-table">
          <colgroup>
            <col style="width: 150px;" />
            <col style="width: auto;" />
          </colgroup>
          <tr><td class="no-wrap" style="width: 150px; font-weight: bold;">Madrasah</td><td>: MTsN 4 Jombang</td></tr>
          <tr><td class="no-wrap" style="font-weight: bold;">Mata Pelajaran</td><td>: ${dataToExport.subject}</td></tr>
          <tr><td class="no-wrap" style="font-weight: bold;">Kelas/Semester</td><td>: ${dataToExport.grade} / ${dataToExport.semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}</td></tr>
          <tr><td class="no-wrap" style="font-weight: bold;">Tahun Pelajaran</td><td>: ${globalSettings?.tahunPelajaran || '2025/2026'}</td></tr>
        </table>
      `;
  
      const monthHeaders = dataToExport.headers.map(h => `<th colspan="${h.weeks}" class="text-center">${h.month}</th>`).join('');
      const weekHeaders = dataToExport.headers.flatMap(h => Array.from({ length: h.weeks }, (_, i) => {
          const weekNum = h.weekNumbers ? h.weekNumbers[i] : (i + 1);
          return `<th class="text-center">${weekNum}</th>`;
      })).join('');
  
      const prosemRows = dataToExport.content.map(row => {
          const weekCells = dataToExport.headers.flatMap(h => {
              return Array.from({ length: h.weeks }, (_, weekIndex) => {
                  const cellVal = (row.bulan[h.month] && row.bulan[h.month][weekIndex]) || '';
                  return `<td class="text-center">${cellVal}</td>`;
              });
          }).join('');
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
        <p style="margin: 0pt 0pt 12.0pt 0pt; mso-margin-after-alt: 12.0pt; font-size: 1pt; line-height: 1pt;">&nbsp;</p>
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
        <table class="signature-table">
          <colgroup>
            <col style="width: 566.9pt;" />
            <col style="width: 170.07pt;" />
          </colgroup>
          <tbody>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">Mengetahui,</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">Jombang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">Kepala Madrasah,</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">Guru Mata Pelajaran,</td>
            </tr>
            <tr><td class="signature-td signature-td-left" style="width: 566.9pt; height: 45px;">&nbsp;</td><td class="signature-td signature-td-right" style="width: 170.07pt; height: 45px;">&nbsp;</td></tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt; font-weight: bold; text-decoration: underline;">${globalSettings?.kepalaMadrasah || "Sulthon Sulaiman, M.Pd.I"}</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt; font-weight: bold; text-decoration: underline;">${creatorName}</td>
            </tr>
            <tr>
              <td class="signature-td signature-td-left" style="width: 566.9pt;">NIP. ${globalSettings?.nipKepalaMadrasah || '198106162005011003'}</td>
              <td class="signature-td signature-td-right" style="width: 170.07pt;">NIP. -</td>
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
            <div class="Section1">
              ${mainContent}
              ${signatureBlock}
            </div>
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

  const handleNavigateFromMenu = async (destination: 'detail' | 'atp' | 'kktp' | 'prota' | 'rpe' | 'prosem') => {
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
    
    if (destination === 'rpe') {
        setView('view_rpe');
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
                const targetAtp = atps[0];
                setSelectedATP(targetAtp); // Assume first ATP
                handleCreateNewProta(targetAtp);
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
                if (atps.length > 0) {
                    setSelectedATP(atps[0]);
                    setActiveKktpSemester('Ganjil');
                    setView('view_atp_detail');
                } else {
                    setView('view_atp_list');
                }
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
      case 'admin_dashboard':
        return <AdminDashboard onBack={() => setView('select_subject')} showConfirm={showConfirm} refreshSettings={refreshSettings} />;

      case 'select_subject':
        return <SubjectSelector 
          onSelectSubject={handleSelectSubject} 
          isAdmin={isAdmin} 
          onViewChange={setView}
          subjects={globalSettings?.mataPelajaran || [
            "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam", 
            "Bahasa Arab", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", 
            "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", "Bahasa Inggris", 
            "Pend. Jasmani, Olahraga, dan Kesehatan", "Informatika", "Seni Budaya & Prakarya", 
            "Mabadi' Fiqh", "Aswaja", "Bahasa Jawa"
          ]}
        />;

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
                      {user && isApproved && (isAdmin || tp.userId === user.uid || (tp.creatorEmail && user.email && tp.creatorEmail.toLowerCase().trim() === user.email.toLowerCase().trim())) && (
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
        const normalizeSem = (s: string): 'Ganjil' | 'Genap' => {
          if (!s) return 'Ganjil';
          const lower = s.toLowerCase();
          if (lower.includes('genap') || lower.includes('even') || lower.includes('2') || lower.includes('dua')) return 'Genap';
          return 'Ganjil';
        };
        const normalizedTpGroups = (selectedTP.tpGroups || []).map(g => ({
          ...g,
          semester: normalizeSem(g.semester)
        }));
        const ganjilGroups = normalizedTpGroups.filter(g => g.semester === 'Ganjil');
        const genapGroups = normalizedTpGroups.filter(g => g.semester === 'Genap');
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
                    {user && isApproved && (isAdmin || selectedTP.userId === user.uid || (selectedTP.creatorEmail && user.email && selectedTP.creatorEmail.toLowerCase().trim() === user.email.toLowerCase().trim())) && (
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
                    )}
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
                        {user && isApproved && (
                            <>
                                <button onClick={() => handleEditATP(null, selectedATP)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
                                   <EditIcon className="w-5 h-5" /> Edit
                                </button>
                                <button onClick={() => handleDeleteATP(null, selectedATP)} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700">
                                   <TrashIcon className="w-5 h-5" /> Hapus
                                </button>
                            </>
                        )}
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
                                    <td>: ${globalSettings?.tahunPelajaran || '2025/2026'}</td>
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
                        <table className="min-w-full bg-white border border-slate-300 text-xs sm:text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2 border-b border-slate-300 w-10 text-center font-bold text-slate-700">No</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-20 text-center font-bold text-slate-700">Kode TP</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-1/5 font-bold text-slate-700">Topik/Materi</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-[30%] font-bold text-slate-700">Tujuan Pembelajaran (TP)</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-24 text-center font-bold text-slate-700">Alokasi Waktu (JP)</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-20 text-center font-bold text-slate-700">Semester</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-[15%] font-bold text-slate-700">Integrasi Panca Cinta</th>
                                    <th className="px-3 py-2 border-b border-slate-300 w-[20%] font-bold text-slate-700">Aktivitas Cinta dalam Pembelajaran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {selectedATP.content.map((row) => (
                                    <tr key={row.atpSequence} className="hover:bg-slate-50 text-xs sm:text-sm">
                                        <td className="px-3 py-2 align-top border-r text-center">{row.atpSequence}</td>
                                        <td className="px-3 py-2 align-top border-r text-center font-mono font-semibold text-slate-600">{row.kodeTp}</td>
                                        <td className="px-3 py-2 align-top border-r text-slate-800">{row.topikMateri}</td>
                                        <td className="px-3 py-2 align-top border-r text-slate-800">{row.tp}</td>
                                        <td className="px-3 py-2 align-top border-r text-center font-semibold text-slate-700">{row.alokasiWaktu}</td>
                                        <td className="px-3 py-2 align-top border-r text-center">{row.semester}</td>
                                        <td className="px-3 py-2 align-top border-r text-slate-600">{renderMultilineText(row.integrasiPancaCinta)}</td>
                                        <td className="px-3 py-2 align-top text-slate-600 leading-relaxed">{renderMultilineText(row.aktivitasCinta)}</td>
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
        
        const weeksGanjil = protaExists ? getSemesterTotalWeeks('Ganjil', selectedTP.grade) : 0;
        const weeksGenap = protaExists ? getSemesterTotalWeeks('Genap', selectedTP.grade) : 0;
        const jamWeekly = currentProta?.jamPertemuan || 2;
        const targetGanjil = weeksGanjil * jamWeekly;
        const targetGenap = weeksGenap * jamWeekly;

        const contentToUse = isEditingProtaJp ? tempProtaContent : (currentProta?.content || []);
        const allocatedGanjil = contentToUse.filter(r => r.semester === 'Ganjil').reduce((sum, r) => sum + parseJpValue(r.alokasiWaktu), 0);
        const allocatedGenap = contentToUse.filter(r => r.semester === 'Genap').reduce((sum, r) => sum + parseJpValue(r.alokasiWaktu), 0);

        const totalJp = protaExists 
          ? contentToUse.reduce((sum, row) => sum + (parseInt(row.alokasiWaktu) || 0), 0) 
          : 0;

        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
               <button onClick={() => { if(isEditingProtaJp) handleCancelEditProtaJp(); setView('tp_menu'); }} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold">
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
                    {isEditingProtaJp ? (
                      <>
                        <button onClick={handleSaveProtaJp} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700">
                          <SaveIcon className="w-5 h-5"/> Simpan JP
                        </button>
                        <button onClick={handleCancelEditProtaJp} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-500 text-white font-semibold rounded-md shadow-sm hover:bg-slate-600">
                          <CloseIcon className="w-5 h-5"/> Batal
                        </button>
                      </>
                    ) : (
                      <>
                        {user && isApproved && (
                          <button onClick={handleStartEditProtaJp} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
                            <EditIcon className="w-5 h-5"/> Edit JP
                          </button>
                        )}
                        <button onClick={handleExportProtaToWord} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                          <DownloadIcon className="w-5 h-5"/> Ekspor ke Word
                        </button>
                      </>
                    )}
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
                            onClick={() => {
                                if (atps.length > 0) {
                                    setSelectedATP(atps[0]);
                                    setActiveKktpSemester('Ganjil');
                                    setView('view_atp_detail');
                                } else {
                                    setView('view_atp_list');
                                }
                            }} 
                            className="mt-6 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700"
                        >
                            <FlowChartIcon className="w-5 h-5"/>
                            Pilih ATP untuk Membuat PROTA
                        </button>
                    )}
                </div>
            ) : (
                <>
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    {/* Analisis Distribusi JP & Minggu Efektif */}
                    <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-indigo-600" />
                            Analisis Distribusi JP & Minggu Efektif (Target vs Realisasi)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Semester Ganjil */}
                            <div className="bg-white p-3.5 border border-slate-200 rounded-md shadow-sm">
                                <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                                    <span className="font-semibold text-slate-700 text-sm">Semester Ganjil</span>
                                    <span className="text-xs text-slate-500 font-medium">{weeksGanjil} Minggu Efektif × {jamWeekly} JP</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div>
                                        <p className="text-slate-500">Target Alokasi:</p>
                                        <p className="font-bold text-slate-800 text-sm">{targetGanjil} JP</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Teralokasi:</p>
                                        <p className="font-bold text-slate-800 text-sm">{allocatedGanjil} JP</p>
                                    </div>
                                </div>
                                {allocatedGanjil === targetGanjil ? (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded font-medium">
                                        <span>🟢 Sempurna! Semua JP terdistribusi pas dengan minggu efektif.</span>
                                    </div>
                                ) : allocatedGanjil < targetGanjil ? (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded font-medium">
                                        <span>🟡 Kurang {targetGanjil - allocatedGanjil} JP. Akan ada sisa minggu kosong di akhir semester (kelebihan minggu).</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded font-medium">
                                        <span>🔴 Berlebih {allocatedGanjil - targetGanjil} JP! Beberapa TP tidak akan kebagian minggu pelaksanaan di PROSEM.</span>
                                    </div>
                                )}
                            </div>

                            {/* Semester Genap */}
                            <div className="bg-white p-3.5 border border-slate-200 rounded-md shadow-sm">
                                <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                                    <span className="font-semibold text-slate-700 text-sm">Semester Genap</span>
                                    <span className="text-xs text-slate-500 font-medium">{weeksGenap} Minggu Efektif × {jamWeekly} JP</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div>
                                        <p className="text-slate-500">Target Alokasi:</p>
                                        <p className="font-bold text-slate-800 text-sm">{targetGenap} JP</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Teralokasi:</p>
                                        <p className="font-bold text-slate-800 text-sm">{allocatedGenap} JP</p>
                                    </div>
                                </div>
                                {allocatedGenap === targetGenap ? (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded font-medium">
                                        <span>🟢 Sempurna! Semua JP terdistribusi pas dengan minggu efektif.</span>
                                    </div>
                                ) : allocatedGenap < targetGenap ? (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded font-medium">
                                        <span>🟡 Kurang {targetGenap - allocatedGenap} JP. Akan ada sisa minggu kosong di akhir semester (kelebihan minggu).</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded font-medium">
                                        <span>🔴 Berlebih {allocatedGenap - targetGenap} JP! Beberapa TP tidak akan kebagian minggu pelaksanaan di PROSEM.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {isEditingProtaJp && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-md">
                        💡 <strong>Mode Edit JP Aktif:</strong> Anda dapat mengubah alokasi waktu (JP) di setiap baris langsung dari tabel di bawah, lalu klik tombol <strong>"Simpan JP"</strong> di atas.
                      </div>
                    )}
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full bg-white border border-slate-300 text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2 border-b border-slate-300 w-10 text-center font-bold text-slate-700">No</th>
                                    <th className="px-3 py-2 border-b border-slate-300 text-center font-bold text-slate-700">Semester</th>
                                    <th className="px-3 py-2 border-b border-slate-300 text-center font-bold text-slate-700">Kode TP</th>
                                    <th className="px-3 py-2 border-b border-slate-300 font-bold text-slate-700">Topik / Materi Pokok</th>
                                    <th className="px-3 py-2 border-b border-slate-300 font-bold text-slate-700">Tujuan Pembelajaran (TP)</th>
                                    <th className="px-3 py-2 border-b border-slate-300 font-bold text-slate-700">Integrasi Panca Cinta</th>
                                    <th className="px-3 py-2 border-b border-slate-300 font-bold text-slate-700">Aktivitas Cinta dalam Pembelajaran</th>
                                    <th className="px-3 py-2 border-b border-slate-300 text-center w-32 font-bold text-slate-700">Alokasi Waktu (JP)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {(isEditingProtaJp ? tempProtaContent : currentProta!.content).map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 align-top border-r text-center">{row.no}</td>
                                        <td className="px-3 py-2 align-top border-r text-center">{row.semester}</td>
                                        <td className="px-3 py-2 align-top border-r text-center font-mono font-semibold text-slate-600">{row.kodeTp}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.topikMateri}</td>
                                        <td className="px-3 py-2 align-top border-r">{row.tp}</td>
                                        <td className="px-3 py-2 align-top border-r text-slate-600">{renderMultilineText(row.integrasiPancaCinta)}</td>
                                        <td className="px-3 py-2 align-top border-r text-slate-600">{renderMultilineText(row.aktivitasCinta)}</td>
                                        <td className="px-3 py-2 align-top text-center">
                                            {isEditingProtaJp ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <input 
                                                        type="text" 
                                                        value={row.alokasiWaktu} 
                                                        onChange={(e) => handleProtaJpChange(index, e.target.value)} 
                                                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-semibold"
                                                        placeholder="Contoh: 4 JP"
                                                    />
                                                </div>
                                            ) : (
                                                row.alokasiWaktu
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-slate-100 font-bold">
                                <tr>
                                    <td colSpan={7} className="px-3 py-2 text-right border-r">Total Jam Pertemuan (JP)</td>
                                    <td className="px-3 py-2 text-center">{totalJp} JP</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
              </>
            )}
          </div>
        );

      case 'view_rpe': {
        if (!selectedTP) return null;
        const jamWeekly = (protas && protas[0]?.jamPertemuan) || 2;
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <button 
                  onClick={() => setView('tp_menu')} 
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold transition"
                >
                  <BackIcon className="w-5 h-5" />
                  Kembali ke Menu
                </button>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    Rincian Pekan Efektif (RPE)
                </h1>
                <p className="text-slate-500">Mata Pelajaran: {selectedSubject} | Kelas: {selectedTP.grade}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleExportRpeToWord} 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 transition"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Ekspor ke Word
                </button>
              </div>
            </div>

            <RpeDetail
              globalSettings={globalSettings}
              grade={selectedTP.grade}
              subject={selectedTP.subject}
              jamWeekly={jamWeekly}
              getSemesterWeeksList={getSemesterWeeksList}
              getWeekInactiveLabel={getWeekInactiveLabel}
            />
          </div>
        );
      }
      
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
                        <thead className="bg-slate-100 text-slate-700 text-left font-bold border-b border-slate-300">
                            <tr>
                                <th className="px-3 py-2 border-r border-slate-300 text-center w-[5%] font-bold">No</th>
                                <th className="px-3 py-2 border-r border-slate-300 w-[15%] font-bold">Materi Pokok</th>
                                <th className="px-3 py-2 border-r border-slate-300 w-[20%] font-bold">Tujuan Pembelajaran</th>
                                <th className="px-3 py-2 border-r border-slate-300 w-[15%] font-bold">Integrasi Panca Cinta</th>
                                <th className="px-3 py-2 border-r border-slate-300 text-center w-[12%] font-bold">Tahapan Perkembangan</th>
                                <th className="px-3 py-2 border-r border-slate-300 w-[23%] font-bold">Kriteria</th>
                                <th className="px-3 py-2 text-center w-[10%] font-bold">Ketercapaian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.content.map((row) => (
                              <React.Fragment key={row.no}>
                                <tr className="hover:bg-slate-50 border-t border-slate-200">
                                    <td className="px-3 py-2 align-top border-r border-slate-300 text-center" rowSpan={4}>{row.no}</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300" rowSpan={4}>{row.materiPokok}</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300" rowSpan={4}>{row.tp}</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300" rowSpan={4}>{renderMultilineText(row.integrasiPancaCinta)}</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300 text-center font-medium bg-slate-50/50">Mahir</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300 leading-relaxed">{row.kriteria?.mahir || '-'}</td>
                                    <td className="px-3 py-2 align-top text-center text-xs text-slate-700 leading-relaxed font-semibold bg-teal-50/20" rowSpan={4}>
                                        Murid dianggap Tuntas jika minimal berada pada tahapan perkembangan: <span className="font-bold text-teal-700 block mt-1">Cakap</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-3 py-2 align-top border-r border-slate-300 text-center font-medium bg-slate-50/50">Cakap</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300 leading-relaxed">{row.kriteria?.cakap || '-'}</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-3 py-2 align-top border-r border-slate-300 text-center font-medium bg-slate-50/50">Layak</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300 leading-relaxed">{row.kriteria?.layak || '-'}</td>
                                </tr>
                                <tr className="hover:bg-slate-50 border-b border-slate-300">
                                    <td className="px-3 py-2 align-top border-r border-slate-300 text-center font-medium bg-slate-50/50">Baru Berkembang</td>
                                    <td className="px-3 py-2 align-top border-r border-slate-300 leading-relaxed">{row.kriteria?.baruBerkembang || '-'}</td>
                                </tr>
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
                                Array.from({ length: header.weeks }, (_, i) => {
                                    const weekNum = header.weekNumbers ? header.weekNumbers[i] : (i + 1);
                                    return <th key={`${header.month}-${i}`} className="px-2 py-1 border-b border-slate-300 w-8">{weekNum}</th>;
                                })
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
                    {/* No button here in header as it is relocated next to the export button */}
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
                                        <div className="flex gap-2">
                                            <button onClick={() => handleExportProsemToWord('Ganjil')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                                                <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                                            </button>
                                        </div>
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
                                ? <PROSEMTableContent data={getEnrichedProsemData(prosemData.ganjil)!} /> 
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
                                        <div className="flex gap-2">
                                            <button onClick={() => handleExportProsemToWord('Genap')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                                                <DownloadIcon className="w-5 h-5" /> Ekspor ke Word
                                            </button>
                                        </div>
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
                                ? <PROSEMTableContent data={getEnrichedProsemData(prosemData.genap)!} /> 
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
          getSemesterTotalWeeks={getSemesterTotalWeeks}
          grade={selectedTP!.grade}
          globalSettings={globalSettings}
          onSave={handleSaveATP}
          onCancel={() => setView(selectedATP ? 'view_atp_detail' : 'view_atp_list')}
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
        <Header userEmail={user.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => {}} globalSettings={globalSettings} isAdmin={isAdmin} />
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
      <Header userEmail={user?.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => setShowLoginModal(true)} globalSettings={globalSettings} isAdmin={isAdmin} />
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
      
       {isAtpJpModalOpen && (() => {
         const isGrade9 = selectedTP && (selectedTP.grade.includes('9') || selectedTP.grade.toUpperCase().includes('IX'));
         const jpNum = Number(atpJpInput) || 0;
         return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-bold mb-2 text-slate-800">Input Jam Pertemuan ATP</h3>
              <p className="text-sm text-slate-600 mb-4">
                  Masukkan jumlah Jam Pertemuan (JP) per minggu untuk mata pelajaran <span className="font-semibold">{selectedSubject}</span>. Data ini akan digunakan oleh AI untuk menyusun alokasi waktu per semester secara proporsional di Alur Tujuan Pembelajaran (ATP).
              </p>
              <form onSubmit={(e) => { e.preventDefault(); handleAtpGenerationSubmit(); }}>
                  <input
                      type="number"
                      value={atpJpInput}
                      onChange={(e) => setAtpJpInput(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="Contoh: 3"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                      min="1"
                      autoFocus
                  />
                  
                  {isGrade9 ? (
                    <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                      💡 <strong>Standar Kelas 9 (IX):</strong>
                      <p className="mt-1">
                        Minggu Efektif: <strong>32 - 34 minggu/tahun</strong>.
                      </p>
                      {jpNum > 0 && (
                        <p className="mt-0.5">
                          Estimasi Total: <strong>{32 * jpNum} - {34 * jpNum} JP</strong> per tahun.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-teal-700 bg-teal-50 p-3 rounded-md border border-teal-200">
                      💡 <strong>Standar Kelas 7 & 8 (VII/VIII):</strong>
                      <p className="mt-1">
                        Minggu Efektif: <strong>36 - 40 minggu/tahun</strong>.
                      </p>
                      {jpNum > 0 && (
                        <p className="mt-0.5">
                          Estimasi Total: <strong>{36 * jpNum} - {40 * jpNum} JP</strong> per tahun.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsAtpJpModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                      Batal
                      </button>
                      <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                        Hasilkan ATP
                      </button>
                  </div>
              </form>
            </div>
          </div>
         );
       })()}
      
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