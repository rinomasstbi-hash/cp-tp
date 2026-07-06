const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

// Update Header props
code = code.replace(
    `const Header: React.FC<{ userEmail?: string | null; currentView: string; onViewChange: (v: string) => void; onLogin: () => void }> = ({ userEmail, currentView, onViewChange, onLogin }) => {`,
    `const Header: React.FC<{ userEmail?: string | null; currentView: string; onViewChange: (v: string) => void; onLogin: () => void; globalSettings?: GlobalSettings | null }> = ({ userEmail, currentView, onViewChange, onLogin, globalSettings }) => {`
);

// Update Header invocations
code = code.replace(
    `<Header userEmail={user.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => {}} />`,
    `<Header userEmail={user.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => {}} globalSettings={globalSettings} />`
);

code = code.replace(
    `<Header userEmail={user?.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => setShowLoginModal(true)} />`,
    `<Header userEmail={user?.email} currentView={view} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onLogin={() => setShowLoginModal(true)} globalSettings={globalSettings} />`
);

fs.writeFileSync('App.tsx', code);
