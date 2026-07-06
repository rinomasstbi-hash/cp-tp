const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf-8');

code = code.replace(
    /const error = await response\.json\(\);\s*throw new Error\(error\.error \|\| 'Failed to generate TPs'\);/g,
    `let errorMsg = 'Failed to generate TPs';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
            } catch (e) {
                errorMsg = \`Server error: \${response.status} \${response.statusText}\`;
            }
            throw new Error(errorMsg);`
);

code = code.replace(
    /const error = await response\.json\(\);\s*throw new Error\(error\.error \|\| 'Failed to generate ATP'\);/g,
    `let errorMsg = 'Failed to generate ATP';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
            } catch (e) {
                errorMsg = \`Server error: \${response.status} \${response.statusText}\`;
            }
            throw new Error(errorMsg);`
);

code = code.replace(
    /const error = await response\.json\(\);\s*throw new Error\(error\.error \|\| 'Failed to generate PROTA'\);/g,
    `let errorMsg = 'Failed to generate PROTA';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
            } catch (e) {
                errorMsg = \`Server error: \${response.status} \${response.statusText}\`;
            }
            throw new Error(errorMsg);`
);

code = code.replace(
    /const error = await response\.json\(\);\s*throw new Error\(error\.error \|\| 'Failed to generate KKTP'\);/g,
    `let errorMsg = 'Failed to generate KKTP';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
            } catch (e) {
                errorMsg = \`Server error: \${response.status} \${response.statusText}\`;
            }
            throw new Error(errorMsg);`
);

fs.writeFileSync('services/geminiService.ts', code);
