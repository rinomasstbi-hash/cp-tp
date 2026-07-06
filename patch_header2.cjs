const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `                  Sign out
                </button>
            ) : (`,
    `                  Sign out
                </button>
                </div>
            ) : (`
);

fs.writeFileSync('App.tsx', code);
