/* ============================================
   NEXCODE V6 — CINEMATIC 3D SCROLL ENGINE
   ============================================ */
(function () {
    'use strict';
    const mouse = { x: innerWidth / 2, y: innerHeight / 2, on: false };
    let W = innerWidth, H = innerHeight, scrollY = 0;
    addEventListener('resize', () => { W = innerWidth; H = innerHeight; });

    /* ========== CURSOR ========== */
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    const tc = document.getElementById('cursorTrail');
    const tctx = tc.getContext('2d');
    let dx = W/2, dy = H/2, rx = W/2, ry = H/2;
    const trail = [], TL = 22;
    function rTrail() { tc.width = W; tc.height = H; }
    rTrail(); addEventListener('resize', rTrail);
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; });
    document.addEventListener('mouseleave', () => { mouse.on = false; });
    document.addEventListener('mouseover', e => { if (e.target.closest('a,button,.f3d-card,.lang-3d,.cta-btn')) { dot.classList.add('h'); ring.classList.add('h'); } });
    document.addEventListener('mouseout', e => { if (e.target.closest('a,button,.f3d-card,.lang-3d,.cta-btn')) { dot.classList.remove('h'); ring.classList.remove('h'); } });

    function aCursor() {
        dx += (mouse.x - dx) * .25; dy += (mouse.y - dy) * .25;
        rx += (mouse.x - rx) * .12; ry += (mouse.y - ry) * .12;
        dot.style.left = dx+'px'; dot.style.top = dy+'px';
        ring.style.left = rx+'px'; ring.style.top = ry+'px';
        trail.unshift({x:dx,y:dy}); if (trail.length > TL) trail.pop();
        tctx.clearRect(0,0,W,H);
        if (mouse.on && trail.length > 2) {
            tctx.beginPath(); tctx.moveTo(trail[0].x, trail[0].y);
            for (let i=1; i<trail.length-1; i++) {
                tctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x+trail[i+1].x)/2, (trail[i].y+trail[i+1].y)/2);
            }
            const g = tctx.createLinearGradient(trail[0].x,trail[0].y,trail[TL-1]?.x||0,trail[TL-1]?.y||0);
            g.addColorStop(0,'rgba(0,240,255,.45)'); g.addColorStop(.5,'rgba(177,74,255,.2)'); g.addColorStop(1,'rgba(255,45,149,0)');
            tctx.strokeStyle=g; tctx.lineWidth=2.5; tctx.lineCap='round'; tctx.stroke();
        }
        requestAnimationFrame(aCursor);
    }
    aCursor();

    /* ========== PRELOADER ========== */
    const preloader = document.getElementById('preloader');
    const bootBar = document.getElementById('bootBar');
    const bootTerm = document.getElementById('bootTerminal');
    const msgs = ['> loading particle engine...','> initializing 3D sphere mesh...','> compiling shader pipeline...','> mounting language runtimes...','> connecting execution bridge...','> calibrating neural interface...','> rendering holographic UI...','> system ready.'];
    let bi = 0;
    function boot() {
        if (bi >= msgs.length) { bootBar.style.width='100%'; setTimeout(() => { preloader.classList.add('done'); startTyping(); },400); return; }
        const p = document.createElement('p'); p.textContent = msgs[bi];
        bootTerm.appendChild(p); bootTerm.scrollTop = bootTerm.scrollHeight;
        bootBar.style.width = ((bi+1)/msgs.length*100)+'%'; bi++;
        setTimeout(boot, 160+Math.random()*180);
    }
    setTimeout(boot, 500);
    function startTyping() {
        const el = document.querySelector('.typing-text'); if (!el) return;
        const t = 'initializing nexcode kernel...'; let i=0;
        (function tp() { if (i<=t.length) { el.textContent=t.slice(0,i); i++; setTimeout(tp,50+Math.random()*30); } })();
    }

    /* ========== BACKGROUND: STARS + 3D SPHERE ========== */
    const bg = document.getElementById('bgCanvas');
    const c = bg.getContext('2d');
    function rBg() { bg.width=W; bg.height=H; } rBg(); addEventListener('resize', rBg);

    const SC = ['0,240,255','177,74,255','255,45,149','57,255,20','200,200,255'];
    let stars = [];
    class Star {
        constructor() { this.reset(); }
        reset() { this.x=Math.random()*W; this.y=Math.random()*H; this.z=Math.random()*1.3+.2; this.r=this.z*1.1; this.ba=Math.random()*.3+.1; this.a=this.ba; this.vx=(Math.random()-.5)*.12; this.vy=(Math.random()-.5)*.12; this.col=SC[Math.random()*SC.length|0]; }
        update() { this.x+=this.vx; this.y+=this.vy;
            // Warp speed effect based on scroll
            this.x += (this.x - W/2) * warpFactor * .003;
            this.y += (this.y - H/2) * warpFactor * .003;
            if(this.x<-20)this.x=W+20;if(this.x>W+20)this.x=-20;if(this.y<-20)this.y=H+20;if(this.y>H+20)this.y=-20;
            if (mouse.on) { const ddx=this.x-mouse.x,ddy=this.y-mouse.y,d=Math.sqrt(ddx*ddx+ddy*ddy); if(d<100){const f=(100-d)/100;this.x+=(ddx/d)*f*.5;this.y+=(ddy/d)*f*.5;this.a=Math.min(1,this.ba+f*.4);}else{this.a+=(this.ba-this.a)*.04;} }
        }
        draw() { c.beginPath(); c.arc(this.x,this.y,this.r*(1+warpFactor*.3),0,Math.PI*2); c.fillStyle=`rgba(${this.col},${this.a})`; c.fill(); }
    }
    function initStars() { const n=Math.min(100,Math.floor(W*H/14000)); stars=[]; for(let i=0;i<n;i++) stars.push(new Star()); }
    initStars(); addEventListener('resize', initStars);

    // 3D Sphere
    const SP = 400, sverts = [];
    function gR() { return Math.max(W,H)*.48; }
    function genSphere() { sverts.length=0; const R=gR(),ga=Math.PI*(3-Math.sqrt(5));
        for(let i=0;i<SP;i++){const y=1-(i/(SP-1))*2,rr=Math.sqrt(1-y*y),th=ga*i;
        sverts.push({bx:Math.cos(th)*rr*R,by:y*R,bz:Math.sin(th)*rr*R,x:0,y:0,z:0,sx:0,sy:0,sz:0});}}
    genSphere(); addEventListener('resize',genSphere);
    let aRY=0,aRX=0,sRY=0,sRX=0;
    let sphereOp=1, sphereOY=0, warpFactor=0;

    function projSphere() {
        const cx=W/2,cy=H/2+sphereOY,fov=800,R=gR();
        if(mouse.on){sRY+=((mouse.x/W-.5)*1-sRY)*.03;sRX+=((mouse.y/H-.5)*.6-sRX)*.03;}else{sRY*=.98;sRX*=.98;}
        aRY+=.002; aRX+=.0008;
        const cY=Math.cos(aRY+sRY),sY=Math.sin(aRY+sRY),cX=Math.cos(aRX+sRX),sX=Math.sin(aRX+sRX);
        for(const v of sverts){
            let x=v.bx*cY-v.bz*sY,z=v.bx*sY+v.bz*cY,y=v.by;
            const y2=y*cX-z*sX,z2=y*sX+z*cX; y=y2;z=z2;
            if(mouse.on){const sdx=(cx+x)-mouse.x,sdy=(cy+y)-mouse.y,sd=Math.sqrt(sdx*sdx+sdy*sdy);if(sd<200){const p=(200-sd)/200*45,l=Math.sqrt(x*x+y*y+z*z)||1;x+=(x/l)*p;y+=(y/l)*p;z+=(z/l)*p;}}
            v.x=x;v.y=y;v.z=z;const sc=fov/(fov+z+R*1.2);v.sx=cx+x*sc;v.sy=cy+y*sc;v.sz=sc;
        }
    }
    function drawSphere() {
        const R=gR(),CN=R*.2,CNSQ=CN*CN,op=sphereOp;
        c.lineWidth=.6;
        for(let i=0;i<sverts.length;i++){const a=sverts[i];for(let j=i+1;j<sverts.length;j++){const b=sverts[j];const ddx=a.x-b.x,ddy=a.y-b.y,ddz=a.z-b.z,dq=ddx*ddx+ddy*ddy+ddz*ddz;
            if(dq<CNSQ){const d=Math.sqrt(dq),al=(1-d/CN)*.2*((a.sz+b.sz)/2)*op,az=(a.z+b.z)/2,t=(az+R)/(2*R);
            c.beginPath();c.moveTo(a.sx,a.sy);c.lineTo(b.sx,b.sy);c.strokeStyle=`rgba(${(t*177)|0},${(240-t*166)|0},${(255-t*106)|0},${al})`;c.stroke();}}}
        for(const v of sverts){const t=(v.z+R)/(2*R),al=(.2+t*.7)*op,r=1.2+v.sz*2,cr=(t*177)|0,cg=(240-t*166)|0,cb=(255-t*106)|0;
            c.beginPath();c.arc(v.sx,v.sy,r,0,Math.PI*2);c.fillStyle=`rgba(${cr},${cg},${cb},${al})`;c.fill();
            if(t>.6){c.beginPath();c.arc(v.sx,v.sy,r*3,0,Math.PI*2);c.fillStyle=`rgba(${cr},${cg},${cb},${al*.12})`;c.fill();}}
        if(mouse.on){c.lineWidth=.7;for(const v of sverts){const ddx=v.sx-mouse.x,ddy=v.sy-mouse.y,d=Math.sqrt(ddx*ddx+ddy*ddy);if(d<160){c.beginPath();c.moveTo(mouse.x,mouse.y);c.lineTo(v.sx,v.sy);c.strokeStyle=`rgba(177,74,255,${(1-d/160)*.3*op})`;c.stroke();}}}
    }
    function animate() { c.clearRect(0,0,W,H); for(const s of stars){s.update();s.draw();} projSphere(); drawSphere(); requestAnimationFrame(animate); }
    animate();

    /* ========== SCROLL-DRIVEN ANIMATIONS ========== */
    const heroCard = document.getElementById('heroCard');
    const heroLayer = document.getElementById('heroLayer');
    const featTrack = document.getElementById('featuresTrack');
    const sFeat = document.getElementById('s-features');
    const sLangs = document.getElementById('s-langs');
    const langCarousel = document.getElementById('langCarousel');
    const demoWrapper = document.getElementById('demoWrapper');
    const sDemo = document.getElementById('s-demo');
    const ctaSection = document.getElementById('s-cta');
    const scrollProgress = document.getElementById('scrollProgress');

    addEventListener('scroll', () => {
        scrollY = pageYOffset;
        const docH = document.documentElement.scrollHeight - H;
        scrollProgress.style.width = (docH > 0 ? scrollY/docH*100 : 0)+'%';

        /* --- HERO: zoom-through --- */
        const heroH = document.getElementById('s-hero').offsetHeight;
        const heroFrac = Math.min(Math.max(scrollY / (heroH - H), 0), 1);
        // Card zooms toward and past the camera, then fades
        const scale = 1 + heroFrac * 3;
        const rotX = heroFrac * 15;
        const opacity = 1 - heroFrac * 1.5;
        if (heroCard) {
            heroCard.style.transform = `perspective(1200px) scale(${scale}) rotateX(${rotX}deg) translateZ(${heroFrac * 300}px)`;
            heroCard.style.opacity = Math.max(0, opacity);
        }
        // Sphere parallax
        sphereOp = Math.max(0, 1 - heroFrac * .5);
        sphereOY = -heroFrac * 150;
        // Warp speed: stars streak as you scroll
        warpFactor = heroFrac;

        /* --- FEATURES: horizontal scroll --- */
        if (sFeat && featTrack) {
            const fRect = sFeat.getBoundingClientRect();
            const fTop = sFeat.offsetTop;
            const fH = sFeat.offsetHeight;
            const fScrollIn = Math.max(0, scrollY - fTop);
            const fFrac = Math.min(fScrollIn / (fH - H), 1);
            const totalSlideWidth = featTrack.scrollWidth - W;
            featTrack.style.transform = `translateX(${-fFrac * totalSlideWidth}px)`;

            // Each card gets 3D rotation based on its position
            const cards = featTrack.querySelectorAll('.f3d-card');
            cards.forEach((card, i) => {
                const cardCenter = (i + 1) / (cards.length + 1);
                const dist = fFrac - cardCenter;
                const rotY = dist * -40;
                const rotX2 = Math.abs(dist) * 10;
                const tz = (1 - Math.abs(dist) * 2) * 40;
                const o = Math.max(0, 1 - Math.abs(dist) * 2.5);
                card.style.transform = `perspective(800px) rotateY(${rotY}deg) rotateX(${rotX2}deg) translateZ(${Math.max(0, tz)}px)`;
                card.style.opacity = Math.max(0.15, o);
            });
        }

        /* --- LANGUAGES: 3D carousel rotate --- */
        if (sLangs && langCarousel) {
            const lTop = sLangs.offsetTop;
            const lH = sLangs.offsetHeight;
            const lScrollIn = Math.max(0, scrollY - lTop);
            const lFrac = Math.min(lScrollIn / (lH - H), 1);
            const angle = lFrac * 360;
            const cards = langCarousel.querySelectorAll('.lang-3d');
            const count = cards.length;
            const radius = 280;
            cards.forEach((card, i) => {
                const cardAngle = (360 / count) * i + angle;
                const rad = cardAngle * Math.PI / 180;
                const x = Math.sin(rad) * radius;
                const z = Math.cos(rad) * radius - radius;
                const rotY = -cardAngle;
                const o = (Math.cos(rad) + 1) / 2;
                card.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg)`;
                card.style.opacity = 0.3 + o * 0.7;
                card.style.zIndex = Math.round(o * 10);
                // Glow border when facing front
                if (o > 0.8) {
                    card.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                    card.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.1)';
                } else {
                    card.style.borderColor = 'rgba(0, 240, 255, 0.05)';
                    card.style.boxShadow = 'none';
                }
            });
        }

        /* --- DEMO: fly in from depth --- */
        if (sDemo && demoWrapper) {
            const dTop = sDemo.offsetTop;
            const dH = sDemo.offsetHeight;
            const dScrollIn = Math.max(0, scrollY - dTop);
            const dFrac = Math.min(dScrollIn / (dH - H), 1);
            const demoWin = demoWrapper.querySelector('.demo-window');
            const demoTitle = demoWrapper.querySelector('.section-title');
            if (demoWin) {
                const tz = (1 - dFrac) * -600;
                const rX = (1 - dFrac) * 25;
                const o = dFrac;
                demoWin.style.transform = `perspective(1000px) translateZ(${tz}px) rotateX(${rX}deg)`;
                demoWin.style.opacity = Math.min(1, o * 2);
            }
            if (demoTitle) {
                demoTitle.style.opacity = Math.min(1, dFrac * 3);
                demoTitle.style.transform = `translateY(${(1-Math.min(1,dFrac*2)) * 60}px)`;
            }
        }

        /* --- CTA: scale up from small --- */
        if (ctaSection) {
            const cRect = ctaSection.getBoundingClientRect();
            const cFrac = Math.max(0, Math.min(1, 1 - cRect.top / H));
            const ctaInner = ctaSection.querySelector('.cta-3d');
            if (ctaInner) {
                const s = 0.6 + cFrac * 0.4;
                const rY = (1 - cFrac) * -20;
                ctaInner.style.transform = `perspective(800px) scale(${s}) rotateY(${rY}deg)`;
                ctaInner.style.opacity = Math.min(1, cFrac * 2);
            }
        }
    });

    /* Mouse tilt on hero card (only when visible) */
    document.addEventListener('mousemove', e => {
        if (!heroCard || heroCard.style.opacity <= 0) return;
        // Only apply subtle mouse influence — scroll transform is dominant
    });

    /* ========== CTA RIPPLE ========== */
    const ctaBtn = document.getElementById('ctaBtn');
    if (ctaBtn) {
        ctaBtn.addEventListener('mousemove', e => {
            const r = ctaBtn.getBoundingClientRect();
            ctaBtn.style.setProperty('--rx', ((e.clientX-r.left)/r.width*100)+'%');
            ctaBtn.style.setProperty('--ry', ((e.clientY-r.top)/r.height*100)+'%');
        });
    }

    /* ========== COUNTER ========== */
    const cObs = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) {
            const el = entry.target; const tgt = parseInt(el.dataset.target);
            if (isNaN(tgt) || el.dataset.counted) return; el.dataset.counted='1';
            let cur=0; const step = () => { if(cur<tgt){cur++;el.textContent=cur;setTimeout(step,100);} }; step();
        }});
    }, { threshold: .5 });
    document.querySelectorAll('.stat-num[data-target]').forEach(el => cObs.observe(el));

    // Auto-Login Remembrance Check
    const session = localStorage.getItem('nexcode_user');
    if (session) {
        if (ctaBtn) {
            ctaBtn.href = 'editor.html';
            const ctaText = ctaBtn.querySelector('.cta-text');
            if (ctaText) ctaText.textContent = 'Open Workspace';
        }
    }

})();
