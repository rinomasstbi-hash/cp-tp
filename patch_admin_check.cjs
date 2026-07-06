const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    "const [isSubjectDashboardLoading, setIsSubjectDashboardLoading] = useState(false);",
    "const [isSubjectDashboardLoading, setIsSubjectDashboardLoading] = useState(false);\n  const isAdmin = user?.email?.toLowerCase().trim() === 'rinomasstbi@gmail.com';"
);

code = code.replace(
    "{userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (<>",
    "{userEmail?.toLowerCase().trim() === 'rinomasstbi@gmail.com' && (<>"
);

code = code.replace(
    `<SubjectSelector onSelectSubject={handleSelectSubject} isAdmin={user?.email?.toLowerCase() === 'rinomasstbi@gmail.com'} onViewChange={setView} />`,
    `<SubjectSelector onSelectSubject={handleSelectSubject} isAdmin={isAdmin} onViewChange={setView} />`
);

fs.writeFileSync('App.tsx', code);
