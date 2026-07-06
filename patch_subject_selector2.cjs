const fs = require('fs');
let code = fs.readFileSync('components/SubjectSelector.tsx', 'utf-8');

code = code.replace(
    `import { MATA_PELAJARAN } from './constants';`,
    ``
);

code = code.replace(
    `interface SubjectSelectorProps {`,
    `interface SubjectSelectorProps {\n  subjects: string[];`
);

code = code.replace(
    `const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelectSubject, isAdmin, onViewChange }) => {`,
    `const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelectSubject, isAdmin, onViewChange, subjects = [] }) => {`
);

code = code.replace(
    `const filteredSubjects = MATA_PELAJARAN.filter(subject =>`,
    `const filteredSubjects = subjects.filter(subject =>`
);

fs.writeFileSync('components/SubjectSelector.tsx', code);
