const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `import ManageAccess from './components/ManageAccess';
import { AdminSettings } from './components/AdminSettings';`,
    `import AdminDashboard from './components/AdminDashboard';`
);

code = code.replace(
    `const [view, setView] = useState<View | 'manage_access'>('select_subject');`,
    `const [view, setView] = useState<View | 'admin_dashboard'>('select_subject');`
);

code = code.replace(
    `      case 'view_admin_settings':
        return <AdminSettings />;
      case 'manage_access':
        return <ManageAccess />;`,
    `      case 'admin_dashboard':
        return <AdminDashboard onBack={() => setView('select_subject')} />;`
);

// We need to also clean up Header's buttons and add a single "Admin Dashboard" button
let headerSearch = `<div className="flex items-center space-x-2 md:space-x-4">
            <span className="text-white text-xs border border-red-500 p-1">DEBUG: {userEmail}</span>
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
            </>)}`;

let headerReplace = `<div className="flex items-center space-x-2 md:space-x-4">
            {userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (
              <button
                onClick={() => onViewChange(currentView === 'admin_dashboard' ? 'select_subject' : 'admin_dashboard')}
                className="text-xs md:text-sm font-bold bg-amber-500 text-white px-3 py-1.5 rounded shadow hover:bg-amber-600 transition flex items-center space-x-1"
              >
                <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>{currentView === 'admin_dashboard' ? 'Kembali' : 'Admin Panel'}</span>
              </button>
            )}`;

code = code.replace(headerSearch, headerReplace);

// Let's also patch all the other occurrences of view casts.
code = code.replace(
    /v as View \| 'manage_access'/g,
    `v as View | 'admin_dashboard'`
);

fs.writeFileSync('App.tsx', code);
