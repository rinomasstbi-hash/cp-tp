const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `            {userEmail ? (
                <button
                   onClick={() => signOut(auth).then(() => window.location.reload())}`,
    `            {userEmail ? (
                <div className="flex items-center gap-3">
                  <span className="hidden md:block text-slate-300 text-xs">{userEmail}</span>
                  <button
                   onClick={() => signOut(auth).then(() => window.location.reload())}`
);

code = code.replace(
    `                >
                   Logout
                </button>
            ) : (`,
    `                >
                   Logout
                </button>
                </div>
            ) : (`
);

fs.writeFileSync('App.tsx', code);
