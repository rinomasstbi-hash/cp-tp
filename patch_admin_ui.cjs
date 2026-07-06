const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `<SubjectSelector onSelectSubject={handleSelectSubject} />`,
    `<SubjectSelector onSelectSubject={handleSelectSubject} isAdmin={user?.email?.toLowerCase() === 'rinomasstbi@gmail.com'} onViewChange={setView} />`
);

fs.writeFileSync('App.tsx', code);
