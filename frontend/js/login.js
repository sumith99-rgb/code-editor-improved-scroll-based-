/* ============================================
   NEXCODE — LOGIN PAGE ENGINE
   Custom cursor, background sphere, tab switching,
   localStorage auth, and form validation
   ============================================ */
(function () {
    'use strict';
    const mouse = { x: innerWidth / 2, y: innerHeight / 2, on: false };
    let W = innerWidth, H = innerHeight;
    addEventListener('resize', () => { W = innerWidth; H = innerHeight; });

    /* ========== CURSOR ========== */
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    const tc = document.getElementById('cursorTrail');
    const tctx = tc.getContext('2d');
    let dx = W / 2, dy = H / 2, rx = W / 2, ry = H / 2;
    const trail = [], TL = 20;
    function rTrail() { tc.width = W; tc.height = H; }
    rTrail(); addEventListener('resize', rTrail);
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; });
    document.addEventListener('mouseleave', () => { mouse.on = false; });
    document.addEventListener('mouseover', e => { if (e.target.closest('a,button,input,.tab,.auth-btn')) { dot.classList.add('h'); ring.classList.add('h'); } });
    document.addEventListener('mouseout', e => { if (e.target.closest('a,button,input,.tab,.auth-btn')) { dot.classList.remove('h'); ring.classList.remove('h'); } });

    function aCursor() {
        dx += (mouse.x - dx) * .25; dy += (mouse.y - dy) * .25;
        rx += (mouse.x - rx) * .12; ry += (mouse.y - ry) * .12;
        dot.style.left = dx + 'px'; dot.style.top = dy + 'px';
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        trail.unshift({ x: dx, y: dy }); if (trail.length > TL) trail.pop();
        tctx.clearRect(0, 0, W, H);
        if (mouse.on && trail.length > 2) {
            tctx.beginPath(); tctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length - 1; i++) {
                tctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x + trail[i + 1].x) / 2, (trail[i].y + trail[i + 1].y) / 2);
            }
            const g = tctx.createLinearGradient(trail[0].x, trail[0].y, trail[TL - 1]?.x || 0, trail[TL - 1]?.y || 0);
            g.addColorStop(0, 'rgba(0,240,255,.4)'); g.addColorStop(.5, 'rgba(177,74,255,.2)'); g.addColorStop(1, 'rgba(255,45,149,0)');
            tctx.strokeStyle = g; tctx.lineWidth = 2; tctx.lineCap = 'round'; tctx.stroke();
        }
        requestAnimationFrame(aCursor);
    }
    aCursor();

    /* ========== BACKGROUND: STARS + SPHERE ========== */
    const bg = document.getElementById('bgCanvas');
    const c = bg.getContext('2d');
    function rBg() { bg.width = W; bg.height = H; }
    rBg(); addEventListener('resize', rBg);

    const SC = ['0,240,255', '177,74,255', '255,45,149', '57,255,20', '200,200,255'];
    let stars = [];
    class Star {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W; this.y = Math.random() * H;
            this.z = Math.random() * 1.3 + .2; this.r = this.z * 1;
            this.ba = Math.random() * .25 + .08; this.a = this.ba;
            this.vx = (Math.random() - .5) * .1; this.vy = (Math.random() - .5) * .1;
            this.col = SC[Math.random() * SC.length | 0];
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (mouse.on) {
                const ddx = this.x - mouse.x, ddy = this.y - mouse.y, d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 100) { const f = (100 - d) / 100; this.x += (ddx / d) * f * .4; this.y += (ddy / d) * f * .4; this.a = Math.min(1, this.ba + f * .3); }
                else { this.a += (this.ba - this.a) * .04; }
            }
            if (this.x < -20) this.x = W + 20; if (this.x > W + 20) this.x = -20;
            if (this.y < -20) this.y = H + 20; if (this.y > H + 20) this.y = -20;
        }
        draw() { c.beginPath(); c.arc(this.x, this.y, this.r, 0, Math.PI * 2); c.fillStyle = `rgba(${this.col},${this.a})`; c.fill(); }
    }
    function initStars() { const n = Math.min(80, Math.floor(W * H / 16000)); stars = []; for (let i = 0; i < n; i++) stars.push(new Star()); }
    initStars(); addEventListener('resize', initStars);

    // 3D Sphere (smaller, background accent)
    const SP = 250, sverts = [];
    function gR() { return Math.min(W, H) * .4; }
    function genSphere() {
        sverts.length = 0; const R = gR(), ga = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < SP; i++) {
            const y = 1 - (i / (SP - 1)) * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
            sverts.push({ bx: Math.cos(th) * rr * R, by: y * R, bz: Math.sin(th) * rr * R, x: 0, y: 0, z: 0, sx: 0, sy: 0, sz: 0 });
        }
    }
    genSphere(); addEventListener('resize', genSphere);
    let aRY = 0, aRX = 0, sRY = 0, sRX = 0;

    function projSphere() {
        const cx = W / 2, cy = H / 2, fov = 700, R = gR();
        if (mouse.on) { sRY += ((mouse.x / W - .5) * .8 - sRY) * .02; sRX += ((mouse.y / H - .5) * .5 - sRX) * .02; }
        else { sRY *= .98; sRX *= .98; }
        aRY += .0015; aRX += .0006;
        const cY = Math.cos(aRY + sRY), sY = Math.sin(aRY + sRY), cX = Math.cos(aRX + sRX), sX = Math.sin(aRX + sRX);
        for (const v of sverts) {
            let x = v.bx * cY - v.bz * sY, z = v.bx * sY + v.bz * cY, y = v.by;
            const y2 = y * cX - z * sX, z2 = y * sX + z * cX; y = y2; z = z2;
            v.x = x; v.y = y; v.z = z;
            const sc = fov / (fov + z + R * 1.2); v.sx = cx + x * sc; v.sy = cy + y * sc; v.sz = sc;
        }
    }
    function drawSphere() {
        const R = gR(), CN = R * .18, CNSQ = CN * CN;
        c.lineWidth = .5;
        for (let i = 0; i < sverts.length; i++) {
            const a = sverts[i];
            for (let j = i + 1; j < sverts.length; j++) {
                const b = sverts[j], ddx = a.x - b.x, ddy = a.y - b.y, ddz = a.z - b.z, dq = ddx * ddx + ddy * ddy + ddz * ddz;
                if (dq < CNSQ) {
                    const d = Math.sqrt(dq), al = (1 - d / CN) * .12 * ((a.sz + b.sz) / 2), az = (a.z + b.z) / 2, t = (az + R) / (2 * R);
                    c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(b.sx, b.sy);
                    c.strokeStyle = `rgba(${(t * 177) | 0},${(240 - t * 166) | 0},${(255 - t * 106) | 0},${al})`; c.stroke();
                }
            }
        }
        for (const v of sverts) {
            const t = (v.z + R) / (2 * R), al = (.15 + t * .5), r = 1 + v.sz * 1.5;
            c.beginPath(); c.arc(v.sx, v.sy, r, 0, Math.PI * 2);
            c.fillStyle = `rgba(${(t * 177) | 0},${(240 - t * 166) | 0},${(255 - t * 106) | 0},${al})`; c.fill();
        }
        if (mouse.on) {
            c.lineWidth = .5;
            for (const v of sverts) {
                const ddx = v.sx - mouse.x, ddy = v.sy - mouse.y, d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 120) { c.beginPath(); c.moveTo(mouse.x, mouse.y); c.lineTo(v.sx, v.sy); c.strokeStyle = `rgba(177,74,255,${(1 - d / 120) * .2})`; c.stroke(); }
            }
        }
    }
    function animate() { c.clearRect(0, 0, W, H); for (const s of stars) { s.update(); s.draw(); } projSphere(); drawSphere(); requestAnimationFrame(animate); }
    animate();

    /* ========== 3D CARD TILT ========== */
    const authCard = document.getElementById('authCard');
    if (authCard) {
        document.addEventListener('mousemove', e => {
            const rect = authCard.getBoundingClientRect();
            const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            const ddx = (e.clientX - cx) / (rect.width / 2);
            const ddy = (e.clientY - cy) / (rect.height / 2);
            authCard.style.transform = `perspective(1200px) rotateX(${ddy * -4}deg) rotateY(${ddx * 4}deg)`;
        });
    }

    /* ========== TAB SWITCHING ========== */
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const termTitle = document.getElementById('termTitle');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active'); tabSignup.classList.remove('active');
        loginForm.classList.remove('hidden'); signupForm.classList.add('hidden');
        termTitle.textContent = 'access_terminal — login';
        clearMessages();
    });
    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active'); tabLogin.classList.remove('active');
        signupForm.classList.remove('hidden'); loginForm.classList.add('hidden');
        termTitle.textContent = 'access_terminal — signup';
        clearMessages();
    });

    function clearMessages() {
        document.querySelectorAll('.auth-message').forEach(m => { m.textContent = ''; m.className = 'auth-message'; });
    }

    /* ========== BUTTON RIPPLE ========== */
    document.querySelectorAll('.auth-btn').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const r = btn.getBoundingClientRect();
            btn.style.setProperty('--rx', ((e.clientX - r.left) / r.width * 100) + '%');
            btn.style.setProperty('--ry', ((e.clientY - r.top) / r.height * 100) + '%');
        });
    });

    /* ========== AUTH LOGIC (localStorage) ========== */
    // Redirect if already logged in
    if (localStorage.getItem('nexcode_user')) {
        window.location.href = 'editor.html';
    }

    function showMsg(id, text, type) {
        const el = document.getElementById(id);
        el.textContent = '> ' + text;
        el.className = 'auth-message ' + type;
    }

    // --- SIGNUP ---
    signupForm.addEventListener('submit', async e => {
        e.preventDefault();
        const user = document.getElementById('signupUser').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const pass = document.getElementById('signupPass').value;
        const confirm = document.getElementById('signupConfirm').value;

        if (!user || !email || !pass || !confirm) {
            return showMsg('signupMsg', 'All fields are required.', 'error');
        }
        if (pass.length < 6) {
            return showMsg('signupMsg', 'Password must be at least 6 characters.', 'error');
        }
        if (pass !== confirm) {
            return showMsg('signupMsg', 'Passwords do not match.', 'error');
        }

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, email, password: pass })
            });
            const data = await res.json();

            if (data.error) {
                return showMsg('signupMsg', data.error, 'error');
            }

            // Success
            showMsg('signupMsg', 'Account created! Switching to login...', 'success');
            
            // Auto-switch to login after 1.5s
            setTimeout(() => {
                tabLogin.click();
                document.getElementById('loginUser').value = user;
                document.getElementById('loginPass').value = pass;
                document.getElementById('loginPass').focus();
            }, 1000);
            
        } catch (err) {
            console.error(err);
            showMsg('signupMsg', 'Network error. Backend offline.', 'error');
        }
    });

    // --- LOGIN ---
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;

        if (!user || !pass) {
            return showMsg('loginMsg', 'Enter username and password.', 'error');
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();

            if (data.error) {
                return showMsg('loginMsg', data.error, 'error');
            }

            // Success — save session
            showMsg('loginMsg', 'Authentication successful. Redirecting...', 'success');
            localStorage.setItem('nexcode_user', JSON.stringify({ username: data.username, email: data.email }));

            // Animate out, then redirect
            const btn = document.getElementById('loginBtn');
            btn.classList.add('loading');

            setTimeout(() => {
                authCard.style.transition = 'transform .6s, opacity .6s';
                authCard.style.transform = 'perspective(1200px) translateZ(200px) scale(1.1)';
                authCard.style.opacity = '0';
                setTimeout(() => { window.location.href = 'editor.html'; }, 600);
            }, 1000);
            
        } catch (err) {
            console.error(err);
            showMsg('loginMsg', 'Network error. Backend offline.', 'error');
        }
    });

})();
