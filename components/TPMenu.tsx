import React from 'react';
import { TPData, ATPData, PROTAData, KKTPData, PROSEMData } from '../types';
import { BackIcon, BookOpenIcon, FlowChartIcon, ChecklistIcon, SparklesIcon, CalendarIcon, ListIcon } from './icons';

interface TPMenuProps {
  tp: TPData;
  atps: ATPData[];
  protas: PROTAData[];
  kktpData: { ganjil: KKTPData | null; genap: KKTPData | null } | null;
  prosemData: { ganjil: PROSEMData | null; genap: PROSEMData | null } | null;
  onNavigate: (destination: 'detail' | 'atp' | 'kktp' | 'prota' | 'prosem') => void;
  onBack: () => void;
  isLoading: boolean;
}

const TPMenu: React.FC<TPMenuProps> = ({ tp, atps, protas, kktpData, prosemData, onNavigate, onBack, isLoading }) => {

  const atpExists = atps.length > 0;
  const kktpExists = !!(kktpData?.ganjil || kktpData?.genap);
  const protaExists = protas.length > 0;
  const prosemExists = !!(prosemData?.ganjil || prosemData?.genap);

  const CheckmarkIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );

  const LockIcon = () => (
    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
  
  const workflowSteps: {
    title: string;
    description: string;
    // FIX: The `icon` and `backgroundIcon` types are specified to accept a `className` prop,
    // which is necessary for `React.cloneElement` to be type-safe.
    icon: React.ReactElement<{ className?: string }>;
    backgroundIcon: React.ReactElement<{ className?: string }>;
    status: 'completed' | 'next' | 'locked';
    action: () => void;
    actionLabel: string;
  }[] = [
    {
      title: "Tujuan Pembelajaran (TP)",
      description: "Fondasi utama yang berisi rincian semua tujuan pembelajaran yang telah dibuat.",
      icon: <BookOpenIcon className="h-8 w-8 text-white"/>,
      backgroundIcon: <BookOpenIcon className="h-28 w-28 text-white"/>,
      status: 'completed',
      action: () => onNavigate('detail'),
      actionLabel: 'Lihat Detail TP',
    },
    {
      title: "Alur Tujuan Pembelajaran (ATP)",
      description: "Menyusun semua TP ke dalam urutan pembelajaran yang paling logis dan efektif.",
      icon: <FlowChartIcon className="h-8 w-8 text-white"/>,
      backgroundIcon: <FlowChartIcon className="h-28 w-28 text-white"/>,
      status: atpExists ? 'completed' : 'next',
      action: () => onNavigate('atp'),
      actionLabel: atpExists ? 'Lihat/Kelola ATP' : 'Buat ATP dengan AI',
    },
    {
      title: "Kriteria Ketercapaian (KKTP)",
      description: "Menentukan kriteria dan rubrik penilaian untuk setiap tujuan pembelajaran.",
      icon: <ChecklistIcon className="h-8 w-8 text-white"/>,
      backgroundIcon: <ChecklistIcon className="h-28 w-28 text-white"/>,
      status: !atpExists ? 'locked' : (kktpExists ? 'completed' : 'next'),
      action: () => onNavigate('kktp'),
      actionLabel: kktpExists ? 'Lihat/Kelola KKTP' : 'Buat KKTP dengan AI',
    },
    {
      title: "Program Tahunan (PROTA)",
      description: "Mengalokasikan total jam pertemuan (JP) untuk setiap TP dalam satu tahun ajaran.",
      icon: <CalendarIcon className="h-8 w-8 text-white"/>,
      backgroundIcon: <CalendarIcon className="h-28 w-28 text-white"/>,
      status: !atpExists ? 'locked' : (protaExists ? 'completed' : 'next'),
      action: () => onNavigate('prota'),
      actionLabel: protaExists ? 'Lihat/Kelola PROTA' : 'Buat PROTA dengan AI',
    },
    {
      title: "Program Semester (PROSEM)",
      description: "Mendistribusikan alokasi waktu PROTA ke dalam jadwal per minggu setiap bulan.",
      icon: <ListIcon className="h-8 w-8 text-white"/>,
      backgroundIcon: <ListIcon className="h-28 w-28 text-white"/>,
      status: !protaExists ? 'locked' : (prosemExists ? 'completed' : 'next'),
      action: () => onNavigate('prosem'),
      actionLabel: prosemExists ? 'Lihat/Kelola PROSEM' : 'Buat PROSEM dengan AI',
    }
  ];

  const getStatusIndicator = (status: 'completed' | 'next' | 'locked') => {
    switch (status) {
      case 'completed':
        return <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-md" title="Selesai"><CheckmarkIcon /></div>;
      case 'next':
        return <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center shadow-lg animate-pulse" title="Langkah Berikutnya"><SparklesIcon className="w-6 h-6 text-white" /></div>;
      case 'locked':
        return <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center" title="Terkunci"><LockIcon /></div>;
      default:
        return null;
    }
  };

  const gradients = [
    'from-sky-500 to-cyan-500',     // For TP
    'from-teal-500 to-emerald-500',  // For ATP
    'from-indigo-500 to-violet-500', // For KKTP
    'from-rose-500 to-pink-500',     // For PROTA
    'from-orange-500 to-amber-500',  // For PROSEM
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold">
            <BackIcon className="w-5 h-5" />
            Kembali ke Dasbor Mapel
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Alur Pembuatan Perangkat Ajar</h1>
          <p className="text-slate-500 mt-1">
            Mapel: <span className="font-semibold">{tp.subject}</span> | 
            Kelas: <span className="font-semibold">{tp.grade}</span> |
            Dibuat oleh: <span className="font-semibold">{tp.creatorName}</span>
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Memeriksa status perangkat ajar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflowSteps.map((step, index) => {
            const isLocked = step.status === 'locked';
            return (
              <div 
                key={index} 
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 h-40 overflow-hidden 
                  ${isLocked 
                    ? 'bg-slate-100 cursor-not-allowed' 
                    : `bg-gradient-to-br ${gradients[index]} text-white hover:shadow-xl transform hover:-translate-y-1`
                  }`
                }
              >
                {/* Decorative Background Icon */}
                {!isLocked && (
                    <div className="absolute -right-5 -bottom-5 opacity-20 transition-transform duration-500 ease-in-out group-hover:rotate-6 group-hover:scale-125">
                        {step.backgroundIcon}
                    </div>
                )}
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                    {/* Top section: Main Icon + Title + Status */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className={`flex-shrink-0 p-3 rounded-lg inline-block ${
                                isLocked ? 'bg-slate-200' : 'bg-white/20'
                            }`}>
                                {React.cloneElement(step.icon, { className: `h-8 w-8 ${isLocked ? 'text-slate-400' : 'text-white'}` })}
                            </div>
                            <h3 className={`text-xl font-bold ${isLocked ? 'text-slate-800' : 'text-white'}`}>{step.title}</h3>
                        </div>
                        {getStatusIndicator(step.status)}
                    </div>
                    
                    {/* Bottom section: Button */}
                    <div className="self-start">
                      <button
                        onClick={step.action}
                        disabled={isLocked}
                        className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-sm
                          ${isLocked 
                            ? 'bg-slate-200 text-slate-500' 
                            : step.status === 'completed' 
                              ? 'bg-white/20 text-white hover:bg-white/30'
                              : 'bg-white text-teal-600 hover:bg-slate-100 transform hover:scale-105'}
                        `}
                      >
                        {step.actionLabel}
                      </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TPMenu;