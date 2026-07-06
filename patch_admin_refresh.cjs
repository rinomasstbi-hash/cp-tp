const fs = require('fs');

// 1. Update App.tsx to have refreshSettings
let codeApp = fs.readFileSync('App.tsx', 'utf-8');
if (!codeApp.includes('const refreshSettings = ')) {
  codeApp = codeApp.replace(
      `const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);`,
      `const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);\n  const refreshSettings = () => {\n    getAdminSettings().then(res => {\n      if (res) setGlobalSettings(res);\n    });\n  };`
  );
  codeApp = codeApp.replace(
      `<AdminDashboard onBack={() => setView('select_subject')} showConfirm={showConfirm} />`,
      `<AdminDashboard onBack={() => setView('select_subject')} showConfirm={showConfirm} refreshSettings={refreshSettings} />`
  );
  fs.writeFileSync('App.tsx', codeApp);
}

// 2. Update AdminDashboard
let codeDashboard = fs.readFileSync('components/AdminDashboard.tsx', 'utf-8');
if (!codeDashboard.includes('refreshSettings: () => void;')) {
  codeDashboard = codeDashboard.replace(
      `  showConfirm: (t: string, m: string, cb: () => void) => void;\n}`,
      `  showConfirm: (t: string, m: string, cb: () => void) => void;\n  refreshSettings: () => void;\n}`
  );
  codeDashboard = codeDashboard.replace(
      `const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, showConfirm }) => {`,
      `const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, showConfirm, refreshSettings }) => {`
  );
  codeDashboard = codeDashboard.replace(
      `<AdminSettings />`,
      `<AdminSettings onSave={refreshSettings} />`
  );
  fs.writeFileSync('components/AdminDashboard.tsx', codeDashboard);
}

// 3. Update AdminSettings
let codeSettings = fs.readFileSync('components/AdminSettings.tsx', 'utf-8');
if (!codeSettings.includes('interface AdminSettingsProps')) {
  codeSettings = codeSettings.replace(
      `export const AdminSettings: React.FC = () => {`,
      `interface AdminSettingsProps {\n  onSave?: () => void;\n}\n\nexport const AdminSettings: React.FC<AdminSettingsProps> = ({ onSave }) => {`
  );
  codeSettings = codeSettings.replace(
      `await saveAdminSettings(settings);\n            setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });`,
      `await saveAdminSettings(settings);\n            setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });\n            if (onSave) onSave();`
  );
  fs.writeFileSync('components/AdminSettings.tsx', codeSettings);
}
