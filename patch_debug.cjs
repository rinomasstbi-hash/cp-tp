const fs = require('fs');
let code = fs.readFileSync('components/SubjectSelector.tsx', 'utf-8');

code = code.replace(
    `<h2 className="text-2xl font-bold text-amber-800 mb-2">Dashboard Admin</h2>`,
    `<h2 className="text-2xl font-bold text-amber-800 mb-2">Dashboard Admin</h2>`
);

code = code.replace(
    `Silakan pilih mata pelajaran untuk melihat atau membuat Tujuan Pembelajaran (TP).`,
    `Silakan pilih mata pelajaran untuk melihat atau membuat Tujuan Pembelajaran (TP).`
);

fs.writeFileSync('components/SubjectSelector.tsx', code);
