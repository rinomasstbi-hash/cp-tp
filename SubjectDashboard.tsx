import React from 'react';
import { TPData } from '../types';
import { PlusIcon, BackIcon, BookOpenIcon } from './icons';

interface SubjectDashboardProps {
  subjectName: string;
  tps: TPData[];
  onCreateNew: () => void;
  onSelectTP: (tp: TPData) => void;
  onBack: () => void;
  isLoading: boolean;
}

const SubjectDashboard: React.FC<SubjectDashboardProps> = ({ subjectName, tps, onCreateNew, onSelectTP, onBack, isLoading }) => {
    
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-sky-400 to-blue-500',
    'from-emerald-500 to-green-600',
    'from-amber-500 to-yellow-600',
    'from-rose-400 to-red-500',
    'from-pink-500 to-fuchsia-500',
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
            <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold">
                <BackIcon className="w-5 h-5" />
                Ganti Mata Pelajaran
            </button>
            <h1 className="text-3xl font-bold text-slate-800">Dasbor Mata Pelajaran</h1>
            <p className="text-slate-500">Anda telah memilih: <span className="font-semibold">{subjectName}</span></p>
            </div>
        </div>
        
        {isLoading ? (
            <div className="text-center py-20">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-slate-600">Memeriksa data yang ada...</p>
            </div>
        ) : (
             <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Existing TP Cards */}
                    {tps.map((tp, index) => (
                        <button
                            key={tp.id}
                            onClick={() => onSelectTP(tp)}
                            className={`group relative flex justify-start items-center text-left p-6 h-40 rounded-2xl shadow-lg text-white overflow-hidden transition-transform duration-300 transform hover:scale-105 bg-gradient-to-br ${gradients[index % gradients.length]}`}
                        >
                            <div className="absolute -right-5 -bottom-5 opacity-20 transition-transform duration-500 ease-in-out group-hover:rotate-6 group-hover:scale-125">
                                <BookOpenIcon className="h-28 w-28 text-white" />
                            </div>
                            <div className="relative z-10 flex w-full items-center gap-5">
                                <div className="flex-shrink-0 w-20 h-20 flex justify-center items-center bg-white/20 rounded-lg backdrop-blur-sm">
                                    <span className="text-5xl font-black text-white">{tp.grade}</span>
                                </div>
                                <div className="flex-grow">
                                    <h3 className="text-xl font-bold tracking-wide">Dibuat oleh:</h3>
                                    <p className="text-lg font-medium">{tp.creatorName}</p>
                                    <p className="text-xs opacity-90 mt-2">
                                        Pada: {new Date(tp.createdAt).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}

                    {/* Create New Card - Moved to the end */}
                    <button
                        onClick={onCreateNew}
                        className="group flex flex-col justify-center items-center p-6 h-40 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-teal-500 hover:text-teal-600 transition-all duration-300"
                    >
                        <PlusIcon className="h-12 w-12 mb-2" />
                        <h3 className="text-xl font-semibold">Buat TP Baru</h3>
                        <p className="text-base">Mulai dari awal dengan AI</p>
                    </button>
                </div>

                {!isLoading && tps.length === 0 && (
                    <div className="mt-8 text-center p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-3xl mx-auto">
                        <p className="text-blue-800 text-base">
                            Belum ada data TP untuk mata pelajaran ini. Silakan mulai dengan membuat TP baru.
                        </p>
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default SubjectDashboard;