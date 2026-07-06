const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    "{userEmail === 'rinomasstbi@gmail.com' && (\n              <button",
    "{userEmail === 'rinomasstbi@gmail.com' && (<>\n              <button"
);

code = code.replace(
    "                {currentView === 'manage_access' ? 'Kembali' : 'Kelola Akses'}\n              </button>\n            )}",
    "                {currentView === 'manage_access' ? 'Kembali' : 'Kelola Akses'}\n              </button>\n            </>)}"
);

fs.writeFileSync('App.tsx', code);
