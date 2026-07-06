const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    "{currentView === 'view_admin_settings' ? 'Kembali' : 'Pengaturan API'}",
    "{currentView === 'view_admin_settings' ? 'Kembali' : 'Admin: Setting API'}"
);

code = code.replace(
    "{currentView === 'manage_access' ? 'Kembali' : 'Kelola Akses'}",
    "{currentView === 'manage_access' ? 'Kembali' : 'Admin: Users'}"
);

fs.writeFileSync('App.tsx', code);
