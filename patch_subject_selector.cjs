const fs = require('fs');
let code = fs.readFileSync('components/SubjectSelector.tsx', 'utf-8');

code = code.replace(
    `interface SubjectSelectorProps {
  onSelectSubject: (subject: string) => void;
}`,
    `interface SubjectSelectorProps {
  onSelectSubject: (subject: string) => void;
  isAdmin?: boolean;
  onViewChange?: (view: any) => void;
}`
);

code = code.replace(
    `const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelectSubject }) => {`,
    `const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelectSubject, isAdmin, onViewChange }) => {`
);

code = code.replace(
    `      <div className="text-center my-8 w-full max-w-7xl">`,
    `      <div className="text-center my-8 w-full max-w-7xl">
        {isAdmin && onViewChange && (
          <div className="mb-8 p-6 bg-amber-50 rounded-xl border border-amber-200 text-center max-w-2xl mx-auto shadow-sm">
            <h2 className="text-2xl font-bold text-amber-800 mb-2">Dashboard Admin</h2>
            <p className="text-amber-700 mb-4">Selamat datang, Admin! Anda dapat mengelola akses pengguna dan pengaturan API di bawah ini.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => onViewChange('manage_access')}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-md font-semibold transition"
              >
                Kelola Akses Users
              </button>
              <button 
                onClick={() => onViewChange('view_admin_settings')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md font-semibold transition"
              >
                Pengaturan API Key
              </button>
            </div>
          </div>
        )}`
);

fs.writeFileSync('components/SubjectSelector.tsx', code);
