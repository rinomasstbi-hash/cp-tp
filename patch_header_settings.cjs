const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

// Update Header props
code = code.replace(
    `const Header: React.FC<{ userEmail?: string | null; currentView: string; onViewChange: (v: string) => void; onLogin: () => void; globalSettings?: GlobalSettings | null }> = ({ userEmail, currentView, onViewChange, onLogin, globalSettings }) => {`,
    `const Header: React.FC<{ userEmail?: string | null; currentView: string; onViewChange: (v: string) => void; onLogin: () => void; globalSettings?: GlobalSettings | null; isAdmin?: boolean }> = ({ userEmail, currentView, onViewChange, onLogin, globalSettings, isAdmin }) => {`
);

// Add the gear button
code = code.replace(
    `{userEmail ? (
                <div className="flex items-center gap-3">`,
    `{userEmail ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <button
                      onClick={() => onViewChange(currentView === 'admin_dashboard' ? 'select_subject' : 'admin_dashboard')}
                      className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition"
                      title="Pengaturan Admin"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  )}`
);

// Update Header invocations
code = code.replace(
    `<Header userEmail={user.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => {}} globalSettings={globalSettings} />`,
    `<Header userEmail={user.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => {}} globalSettings={globalSettings} isAdmin={isAdmin} />`
);
code = code.replace(
    `<Header userEmail={user?.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => setShowLoginModal(true)} globalSettings={globalSettings} />`,
    `<Header userEmail={user?.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => setShowLoginModal(true)} globalSettings={globalSettings} isAdmin={isAdmin} />`
);

fs.writeFileSync('App.tsx', code);
