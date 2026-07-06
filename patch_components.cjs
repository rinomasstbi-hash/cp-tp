const fs = require('fs');

// Patch ManageAccess
let maCode = fs.readFileSync('components/ManageAccess.tsx', 'utf-8');
maCode = maCode.replace(
    `<div className="max-w-5xl mx-auto p-6 space-y-8 mt-8">`,
    `<div className="max-w-7xl mx-auto space-y-8">`
);
fs.writeFileSync('components/ManageAccess.tsx', maCode);

// Patch AdminSettings
let asCode = fs.readFileSync('components/AdminSettings.tsx', 'utf-8');
asCode = asCode.replace(
    `<div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">`,
    `<div className="max-w-7xl mx-auto">`
);
asCode = asCode.replace(
    `<h1 className="text-3xl font-bold text-slate-800 mb-6">Pengaturan Admin</h1>`,
    ``
);
fs.writeFileSync('components/AdminSettings.tsx', asCode);
