const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `<button
                onClick={() => onViewChange(currentView === 'manage_access' ? 'select_subject' : 'manage_access')}
                className="hidden sm:block text-sm font-medium text-teal-400 hover:text-teal-300 transition"
              >
                {currentView === 'manage_access' ? 'Kembali ke Aplikasi' : 'Kelola Akses'}
              </button>`,
    `<button
                onClick={() => onViewChange(currentView === 'view_admin_settings' ? 'select_subject' : 'view_admin_settings')}
                className="hidden sm:block text-sm font-medium text-amber-400 hover:text-amber-300 transition mr-2"
              >
                {currentView === 'view_admin_settings' ? 'Kembali' : 'Pengaturan API'}
              </button>
              <button
                onClick={() => onViewChange(currentView === 'manage_access' ? 'select_subject' : 'manage_access')}
                className="hidden sm:block text-sm font-medium text-teal-400 hover:text-teal-300 transition"
              >
                {currentView === 'manage_access' ? 'Kembali' : 'Kelola Akses'}
              </button>`
);

code = code.replace(
    "case 'manage_access':",
    "case 'view_admin_settings':\n        return <AdminSettings />;\n      case 'manage_access':"
);

fs.writeFileSync('App.tsx', code);
