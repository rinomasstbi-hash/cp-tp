const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `<div className="flex items-center space-x-2 md:space-x-4">
            {userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (<>`,
    `<div className="flex items-center space-x-2 md:space-x-4">
            <span className="text-white text-xs border border-red-500 p-1">DEBUG: {userEmail}</span>
            {userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (<>`
);

fs.writeFileSync('App.tsx', code);
