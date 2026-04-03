/* ============================================
   NEXCODE — EDITOR ENGINE
   Language switching, code editing features,
   live preview, output, and session handling
   ============================================ */
(function () {
    'use strict';

    /* ========== SESSION CHECK ========== */
    const session = JSON.parse(localStorage.getItem('nexcode_user') || 'null');
    if (!session) { window.location.href = 'login.html'; return; }

    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    if (userName) userName.textContent = session.username;
    if (userAvatar) userAvatar.textContent = session.username[0].toUpperCase();

    /* ========== DOM REFS ========== */
    const codeInput = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const cursorPos = document.getElementById('cursorPos');
    const charCount = document.getElementById('charCount');
    const langIndicator = document.getElementById('langIndicator');
    const fileName = document.getElementById('fileName');
    const fileExt = document.getElementById('fileExt');
    const langBtn = document.getElementById('langBtn');
    const langDot = document.getElementById('langDot');
    const langNameEl = document.getElementById('langName');
    const langSelector = document.getElementById('langSelector');
    const langDropdown = document.getElementById('langDropdown');
    const runBtn = document.getElementById('runBtn');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const wrapBtn = document.getElementById('wrapBtn');
    const clearOutput = document.getElementById('clearOutput');
    const logoutBtn = document.getElementById('logoutBtn');
    const consoleOutput = document.getElementById('consoleOutput');
    const previewFrame = document.getElementById('previewFrame');
    const outputStatus = document.getElementById('outputStatus');
    const outputTime = document.getElementById('outputTime');
    const tabConsole = document.getElementById('tabConsole');
    const tabPreview = document.getElementById('tabPreview');
    const viewConsole = document.getElementById('viewConsole');
    const viewPreview = document.getElementById('viewPreview');
    const editorContainer = document.getElementById('editorContainer');
    
    // Dashboard DOM
    const dashBtn = document.getElementById('dashBtn');
    const dashboardModal = document.getElementById('dashboardModal');
    const closeDashBtn = document.getElementById('closeDashBtn');
    const codesGrid = document.getElementById('codesGrid');

    // Rename DOM
    const renameModal = document.getElementById('renameModal');
    const closeRenameBtn = document.getElementById('closeRenameBtn');
    const renameInput = document.getElementById('renameInput');
    const cancelRenameBtn = document.getElementById('cancelRenameBtn');
    const confirmRenameBtn = document.getElementById('confirmRenameBtn');

    let currentLang = 'javascript';
    let currentExt = '.js';
    let currentColor = '#f7df1e';
    let wordWrap = false;

    /* ========== BOILERPLATE CODE ========== */
    const boilerplate = {
        htmlcssjs: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: #e8eaed;
        }
        h1 { color: #00f0ff; }
    </style>
</head>
<body>
    <h1>Hello, NexCode!</h1>
    <script>
        console.log("Hello from NexCode!");
    </script>
</body>
</html>`,
        css: `/* NexCode CSS Editor */
body {
    margin: 0;
    font-family: 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    color: #e8eaed;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

h1 {
    font-size: 3rem;
    color: #00f0ff;
    text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
}`,
        javascript: `// NexCode JavaScript Editor
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 10; i++) {
    console.log(\`fibonacci(\${i}) = \${fibonacci(i)}\`);
}`,
        java: `// NexCode Java Editor
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from NexCode!");
        
        for (int i = 1; i <= 5; i++) {
            System.out.println("Count: " + i);
        }
    }
}`,
        c: `// NexCode C Editor
#include <stdio.h>

int main() {
    printf("Hello from NexCode!\\n");
    
    for (int i = 1; i <= 5; i++) {
        printf("Count: %d\\n", i);
    }
    
    return 0;
}`,
        haskell: `-- NexCode Haskell Editor
main :: IO ()
main = do
    putStrLn "Hello from NexCode!"
    mapM_ (\\i -> putStrLn $ "Count: " ++ show i) [1..5]`
    };

    /* ========== LANGUAGE SWITCHING ========== */
    langBtn.addEventListener('click', () => { langSelector.classList.toggle('open'); });
    document.addEventListener('click', e => { if (!langSelector.contains(e.target)) langSelector.classList.remove('open'); });

    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const lang = opt.dataset.lang;
            const ext = opt.dataset.ext;
            const color = opt.dataset.color;
            const name = opt.textContent.trim();

            document.querySelector('.lang-option.active')?.classList.remove('active');
            opt.classList.add('active');

            currentLang = lang;
            currentExt = ext;
            currentColor = color;
            langNameEl.textContent = name;
            langDot.style.background = color;
            langIndicator.textContent = name;
            fileExt.textContent = ext;
            langSelector.classList.remove('open');

            // Load boilerplate if editor is empty or has default code
            codeInput.value = boilerplate[lang] || '';
            updateLines();
            updateCursorInfo();

            // Show preview tab for HTML/CSS, console for others
            if (lang === 'htmlcssjs' || lang === 'css') {
                tabPreview.style.display = '';
            } else {
                tabPreview.style.display = 'none';
                switchOutputTab('console');
            }
        });
    });

    /* ========== LINE NUMBERS ========== */
    function updateLines() {
        const lines = codeInput.value.split('\n').length;
        const curLine = codeInput.value.substring(0, codeInput.selectionStart).split('\n').length;
        let html = '';
        for (let i = 1; i <= Math.max(lines, 20); i++) {
            html += `<span${i === curLine ? ' class="active"' : ''}>${i}</span>`;
        }
        lineNumbers.innerHTML = html;
    }

    function syncScroll() {
        lineNumbers.scrollTop = codeInput.scrollTop;
    }

    codeInput.addEventListener('input', () => { updateLines(); updateCursorInfo(); });
    codeInput.addEventListener('scroll', syncScroll);
    codeInput.addEventListener('click', () => { updateLines(); updateCursorInfo(); });
    codeInput.addEventListener('keyup', () => { updateLines(); updateCursorInfo(); });

    /* ========== CURSOR INFO ========== */
    function updateCursorInfo() {
        const val = codeInput.value;
        const pos = codeInput.selectionStart;
        const before = val.substring(0, pos);
        const line = before.split('\n').length;
        const col = pos - before.lastIndexOf('\n');
        cursorPos.textContent = `Ln ${line}, Col ${col}`;
        charCount.textContent = `${val.length} chars`;

        // Update active line highlight position
        const lineH = parseFloat(getComputedStyle(codeInput).lineHeight);
        const padTop = parseFloat(getComputedStyle(codeInput).paddingTop);
        const scrollT = codeInput.scrollTop;
        const top = padTop + (line - 1) * lineH - scrollT;
        editorContainer.style.setProperty('--active-line-top', top + 'px');
    }

    /* ========== KEYBOARD FEATURES ========== */
    const BRACKETS = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'", '`': '`' };

    codeInput.addEventListener('keydown', e => {
        const val = codeInput.value;
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;

        // Tab key — insert 4 spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                // Outdent: remove leading 4 spaces from current line
                const lineStart = val.lastIndexOf('\n', start - 1) + 1;
                const lineText = val.substring(lineStart, start);
                const spaces = lineText.match(/^ {1,4}/);
                if (spaces) {
                    codeInput.value = val.substring(0, lineStart) + val.substring(lineStart + spaces[0].length);
                    codeInput.selectionStart = codeInput.selectionEnd = start - spaces[0].length;
                }
            } else {
                insertText('    ');
            }
            updateLines();
            return;
        }

        // Enter — auto-indent
        if (e.key === 'Enter') {
            e.preventDefault();
            const before = val.substring(0, start);
            const after = val.substring(end);
            const currentLine = before.split('\n').pop();
            const indent = currentLine.match(/^\s*/)[0];
            const lastChar = before.trim().slice(-1);
            const nextChar = after[0];

            let newIndent = '\n' + indent;
            // Extra indent after { [ (
            if (lastChar === '{' || lastChar === '[' || lastChar === '(') {
                newIndent += '    ';
                if (nextChar === '}' || nextChar === ']' || nextChar === ')') {
                    // Add closing bracket on new line
                    insertText(newIndent + '\n' + indent);
                    codeInput.selectionStart = codeInput.selectionEnd = start + newIndent.length;
                    updateLines();
                    return;
                }
            }
            insertText(newIndent);
            updateLines();
            return;
        }

        // Auto-close brackets
        if (BRACKETS[e.key]) {
            e.preventDefault();
            const selected = val.substring(start, end);
            if (selected) {
                // Wrap selection
                insertText(e.key + selected + BRACKETS[e.key]);
                codeInput.selectionStart = start + 1;
                codeInput.selectionEnd = end + 1;
            } else {
                insertText(e.key + BRACKETS[e.key]);
                codeInput.selectionStart = codeInput.selectionEnd = start + 1;
            }
            updateLines();
            return;
        }

        // Skip closing bracket if next char matches
        if (')]}"\'`'.includes(e.key) && val[start] === e.key) {
            e.preventDefault();
            codeInput.selectionStart = codeInput.selectionEnd = start + 1;
            return;
        }

        // Backspace — delete matching bracket pair
        if (e.key === 'Backspace' && start === end && start > 0) {
            const ch = val[start - 1];
            const next = val[start];
            if (BRACKETS[ch] && BRACKETS[ch] === next) {
                e.preventDefault();
                codeInput.value = val.substring(0, start - 1) + val.substring(start + 1);
                codeInput.selectionStart = codeInput.selectionEnd = start - 1;
                updateLines();
                return;
            }
        }

        // Ctrl+Enter — Run code
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            runCode();
            return;
        }

        // Ctrl+S — Save
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveCode();
            return;
        }
    });

    function insertText(text) {
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        const val = codeInput.value;
        codeInput.value = val.substring(0, start) + text + val.substring(end);
        codeInput.selectionStart = codeInput.selectionEnd = start + text.length;
        codeInput.dispatchEvent(new Event('input'));
    }

    /* ========== OUTPUT TABS ========== */
    function switchOutputTab(target) {
        tabConsole.classList.toggle('active', target === 'console');
        tabPreview.classList.toggle('active', target === 'preview');
        viewConsole.classList.toggle('active', target === 'console');
        viewPreview.classList.toggle('active', target === 'preview');
    }
    tabConsole.addEventListener('click', () => switchOutputTab('console'));
    tabPreview.addEventListener('click', () => switchOutputTab('preview'));

    /* ========== CONSOLE OUTPUT ========== */
    function logToConsole(text, type = '') {
        const line = document.createElement('p');
        line.className = 'console-line' + (type ? ' ' + type : '');
        line.innerHTML = `<span class="line-prompt">></span> ${escapeHtml(text)}`;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    function clearConsole() {
        consoleOutput.innerHTML = '';
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function setStatus(text, dot = 'green') {
        outputStatus.innerHTML = `<span class="status-dot ${dot}"></span> ${text}`;
    }

    /* ========== RUN CODE ========== */
    function runCode() {
        const code = codeInput.value;
        if (!code.trim()) { logToConsole('No code to execute.', 'error'); return; }

        clearConsole();
        const start = performance.now();
        runBtn.classList.add('running');
        setStatus('Running...', 'yellow');

        if (currentLang === 'htmlcssjs') {
            runHtmlCssJs(code, start);
        } else if (currentLang === 'css') {
            runCssPreview(code, start);
        } else if (currentLang === 'javascript') {
            runJavaScript(code, start);
        } else {
            // Java, C, Haskell — need backend (Phase 4)
            runBackendLang(code, start);
        }
    }

    function finishRun(start, success = true) {
        const elapsed = ((performance.now() - start) / 1000).toFixed(3);
        outputTime.textContent = `${elapsed}s`;
        runBtn.classList.remove('running');
        if (success) {
            logToConsole(`Execution completed in ${elapsed}s`, 'success');
            setStatus('Completed', 'green');
        } else {
            setStatus('Error', 'red');
        }
    }

    /* --- HTML/CSS/JS in iframe --- */
    function runHtmlCssJs(code, start) {
        switchOutputTab('preview');
        previewFrame.srcdoc = code;
        logToConsole('HTML/CSS/JS rendered in preview.');
        finishRun(start);
    }

    /* --- CSS in iframe --- */
    function runCssPreview(code, start) {
        switchOutputTab('preview');
        const html = `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>CSS Preview</h1><p>Your styles are applied to this demo page.</p><div class="box" style="width:100px;height:100px;margin:20px auto;border:2px solid #ccc;"></div></body></html>`;
        previewFrame.srcdoc = html;
        logToConsole('CSS applied to preview.');
        finishRun(start);
    }

    /* --- JavaScript — use backend Node.js for proper execution --- */
    function runJavaScript(code, start) {
        switchOutputTab('console');
        logToConsole('[JAVASCRIPT] Executing via Node.js...');
        runViaBackend('javascript', code, start);
    }

    /* --- Backend execution for all compiled/interpreted langs --- */
    function runBackendLang(code, start) {
        switchOutputTab('console');
        logToConsole(`[${currentLang.toUpperCase()}] Sending to execution server...`);
        runViaBackend(currentLang, code, start);
    }

    function runViaBackend(lang, code, start) {
        fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lang, code })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                data.error.split('\n').forEach(line => { if (line.trim()) logToConsole(line, 'error'); });
                if (data.output) data.output.split('\n').forEach(line => { if (line.trim()) logToConsole(line); });
                finishRun(start, false);
            } else {
                if (data.output) {
                    data.output.split('\n').forEach(line => { if (line !== '') logToConsole(line); });
                } else {
                    logToConsole('(no output)');
                }
                if (data.stderr) {
                    data.stderr.split('\n').forEach(line => { if (line.trim()) logToConsole(line, 'error'); });
                }
                finishRun(start);
            }
        })
        .catch(() => {
            logToConsole('Cannot connect to backend server.', 'error');
            logToConsole('Make sure the server is running: node server.js', 'error');
            finishRun(start, false);
        });
    }

    /* ========== SAVE / LOAD CODE ========== */

    // Reusable Custom Rename Prompt
    function askForRename(defaultName, onConfirm) {
        renameModal.classList.add('open');
        renameInput.value = defaultName === 'untitled' ? '' : defaultName;
        renameInput.focus();

        const cleanup = () => {
            renameModal.classList.remove('open');
            confirmRenameBtn.removeEventListener('click', confirmEvt);
            cancelRenameBtn.removeEventListener('click', cancelEvt);
            closeRenameBtn.removeEventListener('click', cancelEvt);
            renameInput.removeEventListener('keydown', keyEvt);
        };

        const confirmEvt = () => {
            let val = renameInput.value.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '');
            if (!val) val = 'untitled';
            cleanup();
            onConfirm(val);
        };

        const cancelEvt = () => {
            cleanup();
            onConfirm(null);
        };

        const keyEvt = (e) => {
            if (e.key === 'Enter') confirmEvt();
            if (e.key === 'Escape') cancelEvt();
        };

        confirmRenameBtn.addEventListener('click', confirmEvt);
        cancelRenameBtn.addEventListener('click', cancelEvt);
        closeRenameBtn.addEventListener('click', cancelEvt);
        renameInput.addEventListener('keydown', keyEvt);
    }

    function saveCode() {
        let currentFile = fileName.textContent;
        // Output custom modal if filename is default "untitled"
        if (currentFile === 'untitled') {
            askForRename(currentFile, (chosen) => {
                if (chosen === null) {
                    logToConsole('Save cancelled.', 'error');
                    return;
                }
                fileName.textContent = chosen;
                executeSave(chosen);
            });
        } else {
            executeSave(currentFile);
        }
    }

    function executeSave(currentFile) {
        const exactFileName = currentFile + (currentFile.endsWith(currentExt) ? '' : currentExt);

        // Save to localStorage as instant backup
        const key = `nexcode_saved_${session.username}_${currentLang}`;
        localStorage.setItem(key, codeInput.value);

        // Also save to backend
        fetch('/api/save-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: session.username,
                lang: currentLang,
                code: codeInput.value,
                fileName: exactFileName
            })
        })
        .then(r => r.json())
        .then(data => {
            logToConsole(data.message || 'Code saved.', 'success');
        })
        .catch(() => {
            logToConsole('Saved locally (server offline).', 'success');
        });

        // Flash save button
        saveBtn.style.borderColor = 'rgba(0,240,255,.5)';
        saveBtn.style.boxShadow = '0 0 10px rgba(0,240,255,.2)';
        setTimeout(() => { saveBtn.style.borderColor = ''; saveBtn.style.boxShadow = ''; }, 800);
    }

    // Load backup or boilerplate on init
    function loadSavedCode() {
        const key = `nexcode_saved_${session.username}_${currentLang}`;
        codeInput.value = localStorage.getItem(key) || boilerplate[currentLang] || '';
        updateLines();
        updateCursorInfo();
    }

    /* ========== BUTTON EVENTS ========== */
    runBtn.addEventListener('click', runCode);
    saveBtn.addEventListener('click', saveCode);
    clearBtn.addEventListener('click', () => { codeInput.value = ''; updateLines(); updateCursorInfo(); });
    clearOutput.addEventListener('click', () => { clearConsole(); setStatus('Ready', 'green'); outputTime.textContent = ''; });
    wrapBtn.addEventListener('click', () => {
        wordWrap = !wordWrap;
        codeInput.classList.toggle('wrap', wordWrap);
        wrapBtn.style.color = wordWrap ? 'var(--neon-cyan)' : '';
    });
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('nexcode_user');
        window.location.href = 'login.html';
    });
    fileName.parentElement.addEventListener('click', () => {
        const currentFile = fileName.textContent;
        askForRename(currentFile, (chosen) => {
            if (chosen !== null) {
                fileName.textContent = chosen;
            }
        });
    });

    /* ========== RESIZE HANDLE ========== */
    const resizeHandle = document.getElementById('resizeHandle');
    const panelEditor = document.getElementById('panelEditor');
    const panelOutput = document.getElementById('panelOutput');
    let isResizing = false;

    resizeHandle.addEventListener('mousedown', e => {
        isResizing = true;
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;
        const workspace = document.getElementById('workspace');
        const rect = workspace.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(25, Math.min(75, pct));
        panelEditor.style.flex = `0 0 ${clamped}%`;
        panelOutput.style.flex = `0 0 ${100 - clamped}%`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    /* ========== DASHBOARD LOGIC ========== */
    if (dashBtn) {
        dashBtn.addEventListener('click', openDashboard);
    }
    if (closeDashBtn) {
        closeDashBtn.addEventListener('click', () => {
            dashboardModal.classList.remove('open');
        });
    }

    // Close modal on outside click
    window.addEventListener('click', e => {
        if (e.target === dashboardModal) dashboardModal.classList.remove('open');
    });

    async function openDashboard() {
        dashboardModal.classList.add('open');
        codesGrid.innerHTML = '<div class="loading-codes">Fetching your snippets...</div>';

        try {
            const res = await fetch(`/api/list-codes?username=${session.username}`);
            const data = await res.json();
            
            if (!data.success) {
                codesGrid.innerHTML = `<div class="loading-codes" style="color:var(--neon-red)">Error: ${data.error}</div>`;
                return;
            }

            if (data.codes.length === 0) {
                codesGrid.innerHTML = '<div class="loading-codes">You have not saved any code yet.</div>';
                return;
            }

            codesGrid.innerHTML = '';
            
            data.codes.forEach(entry => {
                const card = document.createElement('div');
                card.className = 'code-card';
                card.innerHTML = `
                    <div class="cc-header">
                        <span class="cc-lang">${entry.lang.toUpperCase()}</span>
                        <span class="cc-date">${new Date(entry.savedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <h3 class="cc-title">${entry.fileName}</h3>
                    <div class="cc-preview">${entry.code.substring(0, 40).replace(/</g, '&lt;')}${entry.code.length > 40 ? '...' : ''}</div>
                `;
                card.addEventListener('click', () => loadCodeFromDashboard(entry));
                codesGrid.appendChild(card);
            });

        } catch (err) {
            codesGrid.innerHTML = '<div class="loading-codes" style="color:var(--neon-red)">Network error loading codes.</div>';
        }
    }

    function loadCodeFromDashboard(entry) {
        // Find matching lang option to get extension and color
        const langDropdown = document.getElementById('langDropdown');
        const options = Array.from(langDropdown.querySelectorAll('.lang-option'));
        const targetOpt = options.find(o => o.dataset.lang === entry.lang);

        if (targetOpt) {
            // Simulate click to change state visually
            targetOpt.click();
        } else {
            // Fallback if option not found
            currentLang = entry.lang;
            langNameEl.textContent = entry.lang;
        }

        // Set content
        codeInput.value = entry.code;
        fileName.textContent = entry.fileName.replace(entry.lang === 'htmlcssjs' ? '.html' : currentExt, '');
        
        // Update UI
        updateLines();
        updateCursorInfo();
        checkWrap();
        
        // Close modal
        dashboardModal.classList.remove('open');
        appendConsole(`Loaded ${entry.fileName} (${entry.lang})`, 'success');
    }

    /* ========== INIT ========== */
    // Set initial language to JavaScript (already active in HTML)
    langDot.style.background = currentColor;
    loadSavedCode();
    updateLines();
    updateCursorInfo();

    // Hide preview tab initially (JS doesn't need it)
    tabPreview.style.display = 'none';

})();
