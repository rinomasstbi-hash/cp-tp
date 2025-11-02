
import React from 'react';
import { MATA_PELAJARAN } from '../constants';
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
} from './icons';

interface SubjectSelectorProps {
  onSelectSubject: (subject: string) => void;
}

const getSubjectIcon = (subject: string) => {
  const className = "h-6 w-6 text-teal-600 group-hover:text-teal-500 transition-colors duration-300";
  
  // Religious subjects (including Bahasa Arab) get MosqueIcon
  if (subject.includes("Qur'an") || subject.includes("Akidah") || subject.includes("Fikih") || subject.includes("Islam") || subject.includes("Aswaja") || subject.includes("Arab")) {
    return <MosqueIcon className={className} />;
  }

  // Languages
  if (subject.includes("Indonesia") || subject.includes("Inggris")) {
    return <LanguageIcon className={className} />;
  }
  if (subject.includes("Jawa")) {
      return <JavaneseIcon className={className} />;
  }
  
  // Other subjects
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
  return (
    <div className="flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="text-center my-8">
        <p className="text-lg text-slate-600 max-w-2xl">
          Silakan pilih mata pelajaran untuk melihat atau membuat Tujuan Pembelajaran (TP).
        </p>
      </div>
      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MATA_PELAJARAN.map((subject) => (
            <button
              key={subject}
              onClick={() => onSelectSubject(subject)}
              className="group flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-xl hover:bg-teal-500 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="p-3 bg-teal-100 rounded-full group-hover:bg-white transition-colors duration-300">
                {getSubjectIcon(subject)}
              </div>
              <span className="ml-4 text-lg font-semibold text-slate-700 group-hover:text-white transition-colors duration-300">{subject}</span>
            </button>
          ))}
        </div>
      </main>
      <footer className="text-center mt-12 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} MTsN 4 Jombang. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SubjectSelector;