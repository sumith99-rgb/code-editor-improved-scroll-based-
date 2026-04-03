/* ============================================
   NEXCODE — Express Backend Server
   Serves frontend, handles auth, code saving,
   and code execution for all languages
   ============================================ */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const PORT = 4000;

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CODES_FILE = path.join(DATA_DIR, 'codes.json');
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ HELPER FUNCTIONS ============
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function cleanTemp() {
    // Clean temp files older than 5 minutes
    try {
        const files = fs.readdirSync(TEMP_DIR);
        const now = Date.now();
        for (const file of files) {
            const fp = path.join(TEMP_DIR, file);
            const stat = fs.statSync(fp);
            if (now - stat.mtimeMs > 5 * 60 * 1000) {
                fs.unlinkSync(fp);
            }
        }
    } catch { /* ignore cleanup errors */ }
}

// Clean temp every 2 minutes
setInterval(cleanTemp, 2 * 60 * 1000);

// ============ AUTH ENDPOINTS ============

// POST /api/signup
app.post('/api/signup', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const users = readJSON(USERS_FILE);

    if (users[username]) {
        return res.status(409).json({ error: 'Username already taken.' });
    }

    users[username] = {
        email,
        password: Buffer.from(password).toString('base64'),
        created: Date.now()
    };

    writeJSON(USERS_FILE, users);

    console.log(`[AUTH] New user registered: ${username}`);
    res.json({ success: true, message: 'Account created successfully.' });
});

// POST /api/login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = readJSON(USERS_FILE);
    const user = users[username];

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    if (Buffer.from(user.password, 'base64').toString() !== password) {
        return res.status(401).json({ error: 'Invalid password.' });
    }

    console.log(`[AUTH] User logged in: ${username}`);
    res.json({ success: true, username, email: user.email });
});

// ============ CODE SAVE/LOAD ENDPOINTS ============

// POST /api/save-code
app.post('/api/save-code', (req, res) => {
    const { username, lang, code, fileName } = req.body;

    if (!username || !lang || code === undefined || !fileName) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    const codes = readJSON(CODES_FILE);
    // Key is now unique to the username + language + filename
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, ''); // sanitize
    const key = `${username}_${lang}_${safeName}`;

    codes[key] = {
        code,
        lang,
        fileName: safeName,
        savedAt: Date.now()
    };

    writeJSON(CODES_FILE, codes);

    console.log(`[SAVE] Code saved for ${username} (${lang}: ${safeName})`);
    res.json({ success: true, message: 'Code saved.' });
});

// GET /api/get-code?username=xxx&lang=yyy&fileName=zzz
app.get('/api/get-code', (req, res) => {
    const { username, lang, fileName } = req.query;

    if (!username || !lang || !fileName) {
        return res.status(400).json({ error: 'Missing username, lang, or fileName.' });
    }

    const codes = readJSON(CODES_FILE);
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const key = `${username}_${lang}_${safeName}`;
    const entry = codes[key];

    if (!entry) {
        return res.json({ found: false });
    }

    res.json({ found: true, ...entry });
});

// GET /api/list-codes?username=xxx
app.get('/api/list-codes', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Missing username.' });
    }

    const codes = readJSON(CODES_FILE);
    const userCodes = [];

    // Search codes.json for keys matching starting with username_
    for (const key in codes) {
        if (key.startsWith(`${username}_`)) {
            userCodes.push(codes[key]);
        }
    }

    // Sort by savedAt descending (newest first)
    userCodes.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    res.json({ success: true, codes: userCodes });
});

// ============ CODE EXECUTION ENDPOINT ============

// POST /api/run
app.post('/api/run', (req, res) => {
    const { lang, code } = req.body;

    if (!lang || !code) {
        return res.status(400).json({ error: 'Language and code are required.' });
    }

    console.log(`[EXEC] Running ${lang} code (${code.length} chars)`);

    switch (lang) {
        case 'javascript':
            runJavaScript(code, res);
            break;
        case 'java':
            runJava(code, res);
            break;
        case 'c':
            runC(code, res);
            break;
        case 'haskell':
            runHaskell(code, res);
            break;
        default:
            res.status(400).json({ error: `Unsupported language: ${lang}` });
    }
});

// ============ EXECUTION LOGIC ============

const TIMEOUT = 20000; // 20 second timeout

// --- JavaScript (Node.js) ---
function runJavaScript(code, res) {
    const fileName = `nex_${Date.now()}.js`;
    const filePath = path.join(TEMP_DIR, fileName);

    fs.writeFileSync(filePath, code, 'utf8');

    exec(`node "${filePath}"`, { timeout: TIMEOUT, cwd: TEMP_DIR }, (error, stdout, stderr) => {
        cleanup(filePath);
        if (error) {
            if (error.killed) {
                return res.json({ error: 'Execution timed out (10s limit).' });
            }
            return res.json({ error: stderr || error.message, output: stdout || '' });
        }
        res.json({ output: stdout, stderr: stderr || '' });
    });
}

// --- Java ---
function runJava(code, res) {
    // Extract class name from code
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Main';
    const fileName = `${className}.java`;
    const filePath = path.join(TEMP_DIR, fileName);

    fs.writeFileSync(filePath, code, 'utf8');

    // Compile first, then run
    exec(`javac "${filePath}"`, { timeout: TIMEOUT, cwd: TEMP_DIR }, (compileErr, _, compileStderr) => {
        if (compileErr) {
            cleanup(filePath);
            return res.json({
                error: `Compilation Error:\n${compileStderr || compileErr.message}`
            });
        }

        // Run the compiled class
        exec(`java -cp "${TEMP_DIR}" ${className}`, { timeout: TIMEOUT, cwd: TEMP_DIR }, (runErr, stdout, stderr) => {
            // Cleanup .java and .class files
            cleanup(filePath);
            cleanup(path.join(TEMP_DIR, `${className}.class`));

            if (runErr) {
                if (runErr.killed) {
                    return res.json({ error: 'Execution timed out (10s limit).' });
                }
                return res.json({ error: stderr || runErr.message, output: stdout || '' });
            }
            res.json({ output: stdout, stderr: stderr || '' });
        });
    });
}

// --- C ---
function runC(code, res) {
    const fileName = `nex_${Date.now()}.c`;
    const filePath = path.join(TEMP_DIR, fileName);
    const isWindows = os.platform() === 'win32';
    const outName = isWindows ? filePath.replace('.c', '.exe') : filePath.replace('.c', '');

    fs.writeFileSync(filePath, code, 'utf8');

    // Compile with gcc
    exec(`gcc "${filePath}" -o "${outName}"`, { timeout: TIMEOUT, cwd: TEMP_DIR }, (compileErr, _, compileStderr) => {
        if (compileErr) {
            cleanup(filePath);
            return res.json({
                error: `Compilation Error:\n${compileStderr || compileErr.message}`
            });
        }

        // Run the compiled binary
        const runCmd = isWindows ? `"${outName}"` : `"${outName}"`;
        exec(runCmd, { timeout: TIMEOUT, cwd: TEMP_DIR }, (runErr, stdout, stderr) => {
            cleanup(filePath);
            cleanup(outName);

            if (runErr) {
                if (runErr.killed) {
                    return res.json({ error: 'Execution timed out (10s limit).' });
                }
                return res.json({ error: stderr || runErr.message, output: stdout || '' });
            }
            res.json({ output: stdout, stderr: stderr || '' });
        });
    });
}

// --- Haskell ---
function runHaskell(code, res) {
    const fileName = `nex_${Date.now()}.hs`;
    const filePath = path.join(TEMP_DIR, fileName);

    fs.writeFileSync(filePath, code, 'utf8');

    exec(`runhaskell "${filePath}"`, { timeout: TIMEOUT, cwd: TEMP_DIR }, (error, stdout, stderr) => {
        cleanup(filePath);
        if (error) {
            if (error.killed) {
                return res.json({ error: 'Execution timed out (10s limit).' });
            }
            return res.json({ error: stderr || error.message, output: stdout || '' });
        }
        res.json({ output: stdout, stderr: stderr || '' });
    });
}

function cleanup(filePath) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// ============ CATCH-ALL: Serve frontend ============
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║         NEXCODE SERVER v1.0          ║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log(`  ║  Frontend:  http://localhost:${PORT}     ║`);
    console.log(`  ║  API:       http://localhost:${PORT}/api ║`);
    console.log('  ║  Status:    ONLINE                   ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
});
