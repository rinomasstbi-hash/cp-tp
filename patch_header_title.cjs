const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `<span className="block text-base sm:text-xl font-extrabold text-white tracking-wide uppercase">
                Asisten Guru (AGRU)
              </span>`,
    `<span className="block text-base sm:text-xl font-extrabold text-white tracking-wide uppercase">
                {globalSettings?.namaAplikasi || 'Asisten Guru (AGRU)'}
              </span>`
);

fs.writeFileSync('App.tsx', code);
