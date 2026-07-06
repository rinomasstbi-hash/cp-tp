const fs = require('fs');
let code = fs.readFileSync('components/SubjectSelector.tsx', 'utf-8');

code = code.replace(
    `<div className="flex flex-col sm:flex-row justify-center gap-4">
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
            </div>`,
    `<div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => onViewChange('admin_dashboard')}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Buka Dashboard Admin</span>
              </button>
            </div>`
);

fs.writeFileSync('components/SubjectSelector.tsx', code);
