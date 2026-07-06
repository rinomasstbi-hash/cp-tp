const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

// Imports
code = code.replace(
    `import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, auth } from './services/authService';`,
    `import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, auth } from './services/authService';\nimport { AdminSettings as GlobalSettings, getAdminSettings } from './services/dbService';`
);

// State
code = code.replace(
    `const [showLoginModal, setShowLoginModal] = useState(false);`,
    `const [showLoginModal, setShowLoginModal] = useState(false);\n  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);`
);

// Effect
code = code.replace(
    `useEffect(() => {
    let isMounted = true;`,
    `useEffect(() => {
    let isMounted = true;
    getAdminSettings().then(res => {
        if (res && isMounted) setGlobalSettings(res);
    });`
);

// Replace hardcoded values with state values, fallback to the old ones if not loaded
// Tahun Pelajaran in UI header
code = code.replace(
    `Tahun Pelajaran 2025/2026`,
    `Tahun Pelajaran {globalSettings?.tahunPelajaran || '2025/2026'}`
);

// Tahun Ajaran in Word exports
code = code.replace(
    /Tahun Ajaran<\/td><td>: 2025\/2026<\/td>/g,
    `Tahun Ajaran</td><td>: \${globalSettings?.tahunPelajaran || '2025/2026'}</td>`
);
code = code.replace(
    /Tahun Pelajaran<\/td><td>: 2025\/2026<\/td>/g,
    `Tahun Pelajaran</td><td>: \${globalSettings?.tahunPelajaran || '2025/2026'}</td>`
);
code = code.replace(
    /<td>: 2025\/2026<\/td>/g,
    `<td>: \${globalSettings?.tahunPelajaran || '2025/2026'}</td>`
);

// NIP
code = code.replace(
    /NIP\. 197610062007101008/g,
    `NIP. \${globalSettings?.nipKepalaMadrasah || '197610062007101008'}`
);
code = code.replace(
    /NIP\. 198106162005011003/g,
    `NIP. \${globalSettings?.nipKepalaMadrasah || '198106162005011003'}`
);

// Kepala Madrasah Name
code = code.replace(
    /Dr\. Aziz Ja'far, S\.Th\.I\., M\.Pd\.I/g,
    `\${globalSettings?.kepalaMadrasah || "Dr. Aziz Ja'far, S.Th.I., M.Pd.I"}`
);
code = code.replace(
    /Sulthon Sulaiman, M\.Pd\.I/g,
    `\${globalSettings?.kepalaMadrasah || "Sulthon Sulaiman, M.Pd.I"}`
);

// Pass subjects to SubjectSelector
code = code.replace(
    `<SubjectSelector onSelectSubject={(subject) => {`,
    `<SubjectSelector 
          subjects={globalSettings?.mataPelajaran || [
            "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam", 
            "Bahasa Arab", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", 
            "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", "Bahasa Inggris", 
            "Pend. Jasmani, Olahraga, dan Kesehatan", "Informatika", "Seni Budaya & Prakarya", 
            "Mabadi' Fiqh", "Aswaja", "Bahasa Jawa"
          ]}
          onSelectSubject={(subject) => {`
);

code = code.replace(
    `<SubjectSelector isAdmin={isAdmin} onViewChange={(v) => setView(v as View | 'admin_dashboard')} onSelectSubject={(subject) => {`,
    `<SubjectSelector 
          isAdmin={isAdmin} 
          onViewChange={(v) => setView(v as View | 'admin_dashboard')} 
          subjects={globalSettings?.mataPelajaran || [
            "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam", 
            "Bahasa Arab", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", 
            "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", "Bahasa Inggris", 
            "Pend. Jasmani, Olahraga, dan Kesehatan", "Informatika", "Seni Budaya & Prakarya", 
            "Mabadi' Fiqh", "Aswaja", "Bahasa Jawa"
          ]}
          onSelectSubject={(subject) => {`
);


fs.writeFileSync('App.tsx', code);
