const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

const targetStr = `{userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (
              <button
                onClick={() => onViewChange(currentView === 'admin_dashboard' ? 'select_subject' : 'admin_dashboard')}
                className="text-xs md:text-sm font-bold bg-amber-500 text-white px-3 py-1.5 rounded shadow hover:bg-amber-600 transition flex items-center space-x-1"
              >
                <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>{currentView === 'admin_dashboard' ? 'Kembali' : 'Admin Panel'}</span>
              </button>
            )}`;

code = code.replace(targetStr, "");

fs.writeFileSync('App.tsx', code);
