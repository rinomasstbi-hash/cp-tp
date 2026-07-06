const fs = require('fs');
let codeApp = fs.readFileSync('App.tsx', 'utf-8');
codeApp = codeApp.replace(
    `<AdminDashboard onBack={() => setView('select_subject')} />`,
    `<AdminDashboard onBack={() => setView('select_subject')} showConfirm={showConfirm} />`
);
fs.writeFileSync('App.tsx', codeApp);

let codeAdminDashboard = fs.readFileSync('components/AdminDashboard.tsx', 'utf-8');
codeAdminDashboard = codeAdminDashboard.replace(
    `interface AdminDashboardProps {
  onBack: () => void;
}`,
    `interface AdminDashboardProps {
  onBack: () => void;
  showConfirm: (t: string, m: string, cb: () => void) => void;
}`
);
codeAdminDashboard = codeAdminDashboard.replace(
    `const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {`,
    `const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, showConfirm }) => {`
);
codeAdminDashboard = codeAdminDashboard.replace(
    `<ManageAccess />`,
    `<ManageAccess showConfirm={showConfirm} />`
);
fs.writeFileSync('components/AdminDashboard.tsx', codeAdminDashboard);

