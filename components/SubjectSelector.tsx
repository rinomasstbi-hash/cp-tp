

import React, { useState } from 'react';
import { MATA_PELAJARAN } from './constants';
import { 
  BookOpenIcon, 
  MosqueIcon,
  LanguageIcon,
  AtomIcon,
  CalculatorIcon,
  GlobeIcon,
  CodeIcon,
  PaletteIcon,
  DumbbellIcon,
  PancasilaIcon,
  JavaneseIcon,
  SearchIcon,
} from './icons';

interface SubjectSelectorProps {
  onSelectSubject: (subject: string) => void;
}

const getSubjectIcon = (subject: string) => {
  const className = "h-24 w-24 text-white";
  
  if (subject.includes("Qur'an") || subject.includes("Akidah") || subject.includes("Fikih") || subject.includes("Islam") || subject.includes("Aswaja") || subject.includes("Arab")) {
    return <MosqueIcon className={className} />;
  }
  if (subject.includes("Indonesia") || subject.includes("Inggris")) {
    return <LanguageIcon className={className} />;
  }
  if (subject.includes("Jawa")) {
      return <JavaneseIcon className={className} />;
  }
  if (subject.includes("Alam")) {
    return <AtomIcon className={className} />;
  }
  if (subject.includes("Matematika")) {
    return <CalculatorIcon className={className} />;
  }
  if (subject.includes("Sosial")) {
    return <GlobeIcon className={className} />;
  }
  if (subject.includes("Informatika")) {
    return <CodeIcon className={className} />;
  }
  if (subject.includes("Seni") || subject.includes("Prakarya")) {
    return <PaletteIcon className={className} />;
  }
  if (subject.includes("Jasmani")) {
    return <DumbbellIcon className={className} />;
  }
  if (subject.includes("Pancasila")) {
    return <PancasilaIcon className={className} />;
  }

  return <BookOpenIcon className={className} />; // Fallback
};


const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelectSubject }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSubjects = MATA_PELAJARAN.filter(subject =>
    subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const gradients = [
    'from-violet-500 to-purple-600',
    'from-orange-400 to-amber-500',
    'from-pink-500 to-fuchsia-500',
    'from-sky-400 to-blue-500',
    'from-amber-500 to-yellow-600',
    'from-emerald-500 to-green-600',
    'from-rose-400 to-red-500',
    'from-teal-400 to-cyan-500',
  ];

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="text-center my-8 w-full max-w-7xl">
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Silakan pilih mata pelajaran untuk melihat atau membuat Tujuan Pembelajaran (TP).
        </p>
        <div className="mt-6 max-w-lg mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari mata pelajaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-full shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>
        </div>
      </div>
      <main className="w-full max-w-7xl">
        {filteredSubjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredSubjects.map((subject, index) => (
              <button
                key={subject}
                onClick={() => onSelectSubject(subject)}
                className={`group relative flex flex-col justify-start p-6 h-36 rounded-2xl shadow-lg text-white overflow-hidden transition-transform duration-300 transform hover:scale-105 bg-gradient-to-br ${gradients[index % gradients.length]}`}
              >
                <div className="absolute -right-5 -bottom-5 opacity-20 transition-transform duration-500 ease-in-out group-hover:rotate-6 group-hover:scale-125">
                  {getSubjectIcon(subject)}
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold tracking-wide">{subject}</h3>
                  <div className="w-10 h-1 bg-white/50 mt-2 rounded-full"></div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-slate-700">Tidak Ditemukan</h3>
            <p className="text-slate-500 mt-2">
              Tidak ada mata pelajaran yang cocok dengan pencarian Anda.
            </p>
          </div>
        )}
      </main>
      <footer className="text-center mt-12 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} MTsN 4 Jombang. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SubjectSelector;