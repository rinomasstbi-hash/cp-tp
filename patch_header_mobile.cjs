const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `<div className="flex items-center space-x-4">
            {userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (<>
              <button
                onClick={() => onViewChange(currentView === 'view_admin_settings' ? 'select_subject' : 'view_admin_settings')}
                className="text-sm font-medium text-amber-400 hover:text-amber-300 transition mr-2"
              >
                {currentView === 'view_admin_settings' ? 'Kembali' : 'Admin: Setting API'}
              </button>
              <button
                onClick={() => onViewChange(currentView === 'manage_access' ? 'select_subject' : 'manage_access')}
                className="text-sm font-medium text-teal-400 hover:text-teal-300 transition"
              >
                {currentView === 'manage_access' ? 'Kembali' : 'Admin: Users'}
              </button>
            </>)}`,
    `<div className="flex items-center space-x-2 md:space-x-4">
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
            </>)}`
);

fs.writeFileSync('App.tsx', code);
