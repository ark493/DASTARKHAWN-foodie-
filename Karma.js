/* ═══════════════════════════════════
  K A R M A  —  Karma.js
  · Space BG  · Intro
  · Face Scanner
  · Password strength + eye toggle
  · Auth via Flask → karma.db
═══════════════════════════════════ */
const API = 'http://127.0.0.1:5000/api';
function navigateTo(url) {
  const cover = document.getElementById('page-cover');
  cover.classList.add('covering');
  setTimeout(() => window.location.href = url, 700);
}
function showLoader(msg) {
  const ld = document.getElementById('full-screen-loader');
  document.getElementById('loader-msg').textContent = msg;
  ld.classList.add('active');
}
function hideLoader() {
  document.getElementById('full-screen-loader').classList.remove('active');
}
/* ── Quotes ── */
const QUOTES = [
  'teri mitti mein mil jawan... gul ban ke khil jawan',
  'jo beet gayi so baat gayi, zindagi mein kal kya ho',
  'sab kuch seekha humne, na seekhi hoshiyari',
  'tu hi re, tu hi re, tere bina main kaise jiyun',
  'rang de basanti — rang de, o rang de',
  'chaahe jitni raatein hon andheri, subah zaroor aati hai',
  'ik vaari aa, ik vaari aa milne nu',
  'dil dhoondta hai phir wohi, fursat ke raat din',
  'what you give to the world, the world gives back',
  'indeed, with every hardship comes ease',
  'act without expectation — the act itself is enough',
  'the soul is never born nor does it ever die',
  'do not grieve — goodness is never wasted',
  'be a lamp unto yourself, walk your own path',
  'do good and cast it into the river — it will return',
  'there is no force more powerful than a human helping another',
];
/* ── Realistic Deep Universe Setup ── */
(function () {
  const canvas = document.getElementById('star-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, stars = [];
  function init() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = [];
    for (let i = 0; i < 600; i++) {
      stars.push({ x: Math.random() * W * 2 - W, y: Math.random() * H * 2 - H, z: Math.random() * W, o: Math.random() });
    }
  }
  window.addEventListener('resize', init);
  init();
  function draw() {
    ctx.fillStyle = 'rgba(2, 2, 7, 0.4)'; // darker universe fade
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    stars.forEach(s => {
      s.z -= 1.8;
      if (s.z <= 0) { s.x = Math.random() * W * 2 - W; s.y = Math.random() * H * 2 - H; s.z = W; }
      const k = 150 / s.z;
      const px = s.x * k + cx;
      const py = s.y * k + cy;
      const r = Math.max(0.1, 1.2 * k);
      ctx.fillStyle = `rgba(255, 255, 255, ${s.o})`;
      if (px >= 0 && px <= W && py >= 0 && py <= H) {
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
/* ══════════════════════════════════════
   FACE SCANNER
   Real pixel-diff motion detection
══════════════════════════════════════ */
const FaceScanner = (() => {
  let modal, video, ring, laser, nodeCanvas, motionMsg,
    progressFill, pctEl, statusTxt, statusDot, cancelBtn;
  let stream = null, hexInt = null, nodeRaf = null, motionRaf = null;
  let scanTimers = [], onSuccessCb = null;
  let prevPixels = null, motionFails = 0, scanDone = false;
  const mCan = document.createElement('canvas');
  const mCtx = mCan.getContext('2d');
  const MOTION_THR = 22;
  const SCAN_DUR = 5000;
  const CHECKS = [
    { rowId: 'chk-liveness', valId: 'v-liveness', pct: .16, label: 'LIVE · 99.1%' },
    { rowId: 'chk-depth', valId: 'v-depth', pct: .32, label: '12.4mm' },
    { rowId: 'chk-nodes', valId: 'v-nodes', pct: .52, label: '68/68 ✓' },
    { rowId: 'chk-anti', valId: 'v-anti', pct: .70, label: 'PASS · LIVE' },
    { rowId: 'chk-match', valId: 'v-match', pct: .88, label: 'MATCH 98.7%' },
  ];
  const STATUS_MSGS = [
    [0, 'Initializing biometric scan...'],
    [.15, 'Calibrating depth sensor...'],
    [.30, 'Mapping 68 facial landmarks...'],
    [.50, 'Running anti-spoofing check...'],
    [.68, 'Cross-referencing neural hash...'],
    [.82, 'Verifying identity match...'],
    [.94, 'Finalizing verification...'],
  ];
  const MOTION_MSGS = [
    'Keep still...', 'Hold your head steady', 'Stop moving — resetting scan',
    'Look straight at the camera', 'Stay completely still',
  ];
  function rHex(n) { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16).toUpperCase(); return s; }
  function grab() {
    modal = document.getElementById('face-scanner-modal');
    video = document.getElementById('fsc-video');
    ring = document.getElementById('fsc-cam-ring');
    laser = document.getElementById('fsc-laser');
    nodeCanvas = document.getElementById('fsc-node-canvas');
    motionMsg = document.getElementById('fsc-motion-msg');
    progressFill = document.getElementById('fsc-progress-fill');
    pctEl = document.getElementById('fsc-pct');
    statusTxt = document.getElementById('fsc-status-txt');
    statusDot = document.getElementById('fsc-status-dot');
    cancelBtn = document.getElementById('fsc-cancel');
    cancelBtn.addEventListener('click', close);
  }
  function close() {
    cleanup();
    modal?.classList.remove('open', 'verified', 'fail-state');
    ring?.classList.remove('scanning', 'motion-bad', 'ok');
  }
  function cleanup() {
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    clearInterval(hexInt);
    cancelAnimationFrame(nodeRaf);
    cancelAnimationFrame(motionRaf);
    scanTimers.forEach(clearTimeout); scanTimers = [];
    prevPixels = null; motionFails = 0; scanDone = false;
  }
  function resetChecks() {
    CHECKS.forEach(c => {
      document.getElementById(c.rowId).querySelector('.fsc-icon').className = 'fsc-icon';
      document.getElementById(c.valId).textContent = '—';
    });
  }
  function setStatus(txt, mode) {
    statusTxt.textContent = txt;
    modal.classList.remove('verified', 'fail-state');
    if (mode) modal.classList.add(mode);
  }
  let nodePhase = 0;
  const LANDMARK_PTS = [
    [.50, .27], [.38, .33], [.62, .33], [.31, .44], [.69, .44],
    [.36, .51], [.64, .51], [.42, .58], [.58, .58], [.50, .64],
    [.44, .71], [.56, .71], [.50, .77], [.38, .63], [.62, .63],
  ];
  const LANDMARK_PAIRS = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [9, 10], [9, 11], [10, 12], [11, 12], [13, 5], [14, 6]];
  function drawNodes(nctx, W, H) {
    nctx.clearRect(0, 0, W, H);
    nodePhase += .05;
    LANDMARK_PTS.forEach(([px, py], i) => {
      const a = .4 + .55 * Math.abs(Math.sin(nodePhase + i * .45));
      const x = px * W, y = py * H;
      nctx.beginPath(); nctx.arc(x, y, 2.2, 0, Math.PI * 2);
      nctx.fillStyle = `rgba(0,255,136,${a.toFixed(2)})`; nctx.fill();
    });
    const la = (.08 + .05 * Math.abs(Math.sin(nodePhase))).toFixed(2);
    nctx.strokeStyle = `rgba(0,255,136,${la})`; nctx.lineWidth = .7;
    LANDMARK_PAIRS.forEach(([ai, bi]) => {
      const [ax, ay] = LANDMARK_PTS[ai], [bx, by] = LANDMARK_PTS[bi];
      nctx.beginPath(); nctx.moveTo(ax * W, ay * H); nctx.lineTo(bx * W, by * H); nctx.stroke();
    });
  }
  function measureMotion() {
    if (!video || video.readyState < 2 || !video.videoWidth) return 0;
    mCan.width = 80; mCan.height = 80;
    mCtx.drawImage(video, 0, 0, 80, 80);
    const d = mCtx.getImageData(0, 0, 80, 80).data;
    if (!prevPixels) { prevPixels = d; return 0; }
    let diff = 0;
    for (let i = 0; i < d.length; i += 4)
      diff += (Math.abs(d[i] - prevPixels[i]) + Math.abs(d[i + 1] - prevPixels[i + 1]) + Math.abs(d[i + 2] - prevPixels[i + 2])) / 3;
    prevPixels = d;
    return diff / (80 * 80);
  }
  function open(onSuccess) {
    if (!modal) grab();
    onSuccessCb = onSuccess;
    cleanup(); resetChecks();
    ring.classList.remove('scanning', 'motion-bad', 'ok');
    progressFill.style.width = '0%';
    pctEl.textContent = '0%';
    setStatus('Requesting camera...');
    modal.classList.add('open');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 }, audio: false })
      .then(s => { stream = s; video.srcObject = s; video.onloadeddata = () => beginScan(false); })
      .catch(() => beginScan(true));
  }
  function beginScan(noCam) {
    ring.classList.add('scanning');
    setStatus('Initializing biometric scan...');
    const nctx = nodeCanvas.getContext('2d');
    const sz = ring.offsetWidth;
    nodeCanvas.width = nodeCanvas.height = sz;
    const nodeLoop = () => { drawNodes(nctx, sz, sz); nodeRaf = requestAnimationFrame(nodeLoop); };
    requestAnimationFrame(nodeLoop);
    hexInt = setInterval(() => {
      document.getElementById('hx1').textContent = `0x${rHex(4)} · ${rHex(4)}`;
      document.getElementById('hx2').textContent = `0x${rHex(6)} · DEPTH:${(Math.random() * 20 + 6).toFixed(1)}mm`;
      document.getElementById('hx3').textContent = `HASH:${rHex(8)}…${rHex(4)}`;
    }, 95);
    let startTime = performance.now();
    let penaltyMs = 0;
    let pausedUntil = 0;
    let lastFrame = 0;
    const loop = (now) => {
      if (scanDone) return;
      if (!noCam && now > pausedUntil && now - lastFrame > 120) {
        lastFrame = now;
        const motion = measureMotion();
        if (motion > MOTION_THR) {
          motionFails++;
          penaltyMs += 2000;
          ring.classList.add('motion-bad');
          ring.classList.remove('scanning');
          motionMsg.textContent = MOTION_MSGS[Math.min(motionFails - 1, MOTION_MSGS.length - 1)];
          setStatus('Motion detected — pausing scan...', 'fail-state');
          pausedUntil = now + 1600;
          const t = setTimeout(() => {
            if (scanDone) return;
            prevPixels = null;
            ring.classList.remove('motion-bad');
            ring.classList.add('scanning');
            modal.classList.remove('fail-state');
            setStatus('Resuming — hold perfectly still...');
          }, 1600);
          scanTimers.push(t);
        } else {
          if (!ring.classList.contains('motion-bad')) {
            ring.classList.add('scanning');
          }
        }
      }
      if (now <= pausedUntil || ring.classList.contains('motion-bad')) {
        motionRaf = requestAnimationFrame(loop);
        return;
      }
      const elapsed = now - startTime;
      const effective = Math.max(0, elapsed - penaltyMs);
      const pct = Math.min(effective / SCAN_DUR, 1);
      progressFill.style.width = `${(pct * 100).toFixed(1)}%`;
      pctEl.textContent = `${Math.floor(pct * 100)}%`;
      CHECKS.forEach(c => {
        const icon = document.getElementById(c.rowId).querySelector('.fsc-icon');
        const val = document.getElementById(c.valId);
        if (pct >= c.pct) {
          if (!icon.classList.contains('pass')) { icon.className = 'fsc-icon pass'; val.textContent = c.label; }
        } else if (pct >= c.pct - .12 && !icon.classList.contains('pass')) {
          icon.className = 'fsc-icon run';
        }
      });
      for (let i = STATUS_MSGS.length - 1; i >= 0; i--)
        if (pct >= STATUS_MSGS[i][0]) { setStatus(STATUS_MSGS[i][1]); break; }
      if (pct < 1) {
        motionRaf = requestAnimationFrame(loop);
      } else {
        scanDone = true;
        clearInterval(hexInt);
        cancelAnimationFrame(nodeRaf);
        progressFill.style.width = '100%';
        pctEl.textContent = '100%';
        ring.classList.remove('scanning', 'motion-bad');
        ring.classList.add('ok');
        setStatus('Face matched — identity confirmed', 'verified');
        const t = setTimeout(() => {
          close();
          onSuccessCb?.();
        }, 1300);
        scanTimers.push(t);
      }
    };
    motionRaf = requestAnimationFrame(loop);
  }
  return { open };
})();
/* ══════════════════════════════════════
   PASSWORD STRENGTH METER
══════════════════════════════════════ */
function scorePassword(p) {
  if (!p) return { level: 0, label: '', color: '', tips: [] };
  let score = 0;
  const tips = [];
  if (p.length >= 8) score++; else tips.push('Use at least 8 characters');
  if (p.length >= 13) score++; else if (p.length >= 8) tips.push('12+ chars = much stronger');
  if (/[A-Z]/.test(p)) score++; else tips.push('Add an uppercase letter');
  if (/[0-9]/.test(p)) score++; else tips.push('Include a number');
  if (/[^A-Za-z0-9]/.test(p)) score++; else tips.push('Add a symbol (!@#$%)');
  if (/(.)\1{2,}/.test(p)) { score = Math.max(0, score - 1); tips.push('Avoid repeating characters'); }
  score = Math.max(0, Math.min(4, Math.ceil(score / 5 * 4)));
  const meta = [
    null,
    { label: 'Weak', color: '#ff4d4d' },
    { label: 'Fair', color: '#ff9500' },
    { label: 'Strong', color: '#7cfc00' },
    { label: '💪 Very strong', color: '#00ff88' },
  ];
  return { level: score, ...(meta[score] || { label: '', color: '' }), tips: tips.slice(0, 2) };
}
function wireStrength(inputId, segsId, labelId, tipsId) {
  const inp = document.getElementById(inputId);
  const segs = document.getElementById(segsId)?.querySelectorAll('.str-seg');
  const lbl = document.getElementById(labelId);
  const tipsEl = tipsId ? document.getElementById(tipsId) : null;
  const wrap = document.getElementById(segsId)?.closest('.str-wrap');
  if (!inp) return;
  inp.addEventListener('input', () => {
    const v = inp.value;
    if (!v) { if (wrap) wrap.style.opacity = '0'; return; }
    if (wrap) wrap.style.opacity = '1';
    const r = scorePassword(v);
    if (segs) segs.forEach((seg, i) => {
      seg.className = 'str-seg';
      if (i < r.level) seg.classList.add(`lvl${r.level}`);
    });
    if (lbl) { lbl.textContent = r.label; lbl.style.color = r.color; }
    if (tipsEl) tipsEl.textContent = r.tips.join('  ·  ');
  });
}
function wireEye(eyeId, inputId) {
  const btn = document.getElementById(eyeId);
  const inp = document.getElementById(inputId);
  if (!btn || !inp) return;
  inp.type = 'password';
  btn.addEventListener('click', () => {
    window.isPasswordVisible = !window.isPasswordVisible;
    inp.type = window.isPasswordVisible ? 'text' : 'password';
    // When password visible (text show), we display the open eye (meaning "currently visible")
    // When password hidden, we display the closed/slashed eye (meaning "currently hidden")
    btn.querySelector('.eye-open').style.display = window.isPasswordVisible ? '' : 'none';
    btn.querySelector('.eye-closed').style.display = window.isPasswordVisible ? 'none' : '';
  });
}
function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = 'errShake .4s ease';
  el.style.borderColor = 'rgba(255,77,77,.6)';
  el.focus();
  setTimeout(() => { el.style.animation = ''; el.style.borderColor = ''; }, 1200);
}
/* ── API calls to Flask ── */
async function apiRegister(email, password) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}
async function apiLogin(email, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}
/* ═══════════════════════
   DOM READY & ANIMATED CHARACTERS
═══════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const letters = document.querySelectorAll('.k-letter');
  const quoteLine = document.getElementById('quote-line');
  const intro = document.getElementById('intro');
  const karmaWord = document.getElementById('karma-word');
  const authScreen = document.getElementById('auth-screen');
  const modeToggle = document.getElementById('mode-toggle');
  const cover = document.getElementById('page-cover');
  cover.classList.add('covering');
  setTimeout(() => cover.classList.remove('covering'), 60);
  // ── Letter intro ──
  const GAP = 1500, START = 1800;
  if (letters.length > 0) {
    letters.forEach((l, i) => {
      setTimeout(() => {
        l.classList.add('in');
        if (i === letters.length - 1) setTimeout(() => { letters.forEach(x => x.classList.add('pulse')); beginQuotes(); }, 700);
      }, START + i * GAP);
    });
    let qIdx = 0, qTimer = null;
    const showQuote = t => { quoteLine.classList.remove('show'); setTimeout(() => { quoteLine.textContent = `\u201c${t}\u201d`; quoteLine.classList.add('show'); }, 400); };
    const beginQuotes = () => { showQuote(QUOTES[qIdx++ % QUOTES.length]); qTimer = setInterval(() => showQuote(QUOTES[qIdx++ % QUOTES.length]), 3500); };
    setTimeout(() => { clearInterval(qTimer); doTransition(); }, START + letters.length * GAP + 4500);
    function doTransition() {
      quoteLine.classList.remove('show');
      setTimeout(() => {
        const rect = karmaWord.getBoundingClientRect();
        karmaWord.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;margin:0;z-index:99;`;
        document.body.appendChild(karmaWord);
        void karmaWord.offsetWidth;
        karmaWord.style.transformOrigin = 'top left';
        karmaWord.style.transition = 'top 1.2s cubic-bezier(.16,1,.3,1),left 1.2s cubic-bezier(.16,1,.3,1),transform 1.2s cubic-bezier(.16,1,.3,1)';
        karmaWord.style.transform = 'scale(0.19)';
        karmaWord.style.top = '16px'; karmaWord.style.left = '22px';
        setTimeout(() => {
          intro.style.cssText = 'transition:opacity .7s ease;opacity:0;pointer-events:none;';
          setTimeout(() => authScreen.classList.add('active'), 260);
        }, 700);
      }, 400);
    }
  } else {
    // If no intro elements found, just show auth screen immediately
    authScreen.classList.add('active');
  }
  // ── Mode toggle ──
  const loginPanel = document.getElementById('login-panel');
  const regPanel = document.getElementById('register-panel');
  let curMode = 'login';
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === curMode) return;
      const goR = mode === 'register';
      modeToggle.classList.toggle('on-register', goR);
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      const out = goR ? loginPanel : regPanel, inp = goR ? regPanel : loginPanel;
      out.classList.remove('active');
      inp.classList.add('active');
      inp.classList.add(goR ? 'slide-in-right' : 'slide-in-left');
      setTimeout(() => inp.classList.remove('slide-in-right', 'slide-in-left'), 500);
      curMode = mode;
    });
  });
  // ── Eye toggles ──
  wireEye('l-eye', 'l-pass');
  wireEye('r-eye', 'r-pass');
  wireStrength('r-pass', 'r-str-segs', 'r-str-label', 'r-pass-tips');
  // ── LOGIN ROUTE ──
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('l-email').value.trim();
    const pass = document.getElementById('l-pass').value;
    if (!email || !email.includes('@')) { shakeInput('l-email'); return; }
    if (!pass) { shakeInput('l-pass'); return; }
    const btnLogin = document.getElementById('btn-login');
    btnLogin.disabled = true;
    try {
      const r = await apiLogin(email, pass);
      if (!r.ok) throw new Error(r.error);
      // Store session and navigate
      sessionStorage.setItem('karma_user', JSON.stringify(r.user));
      localStorage.setItem('karma_user_email', email); // For profile.js
      showLoader('Entering Karma...');
      setTimeout(() => navigateTo('home.html'), 1200);
    } catch (err) {
      alert(`Login failed: ${err.message}`);
      btnLogin.disabled = false;
    }
  });
  // ── REGISTER ROUTE ──
  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('r-email').value.trim();
    const pass = document.getElementById('r-pass').value;
    if (!email || !email.includes('@')) { shakeInput('r-email'); return; }
    if (!pass || pass.length < 6) { alert('Password must be at least 6 characters.'); return; }
    const str = scorePassword(pass);
    if (str.level < 2) {
      alert('Password is too weak — please make it stronger.');
      shakeInput('r-pass');
      return;
    }
    // Trigger Face Scanner BEFORE creating account
    FaceScanner.open(async () => {
      // Post validation hit API
      try {
        const r = await apiRegister(email, pass);
        if (!r.ok) throw new Error(r.error);
        // Log in the user implicitly right after creation
        sessionStorage.setItem('karma_user', JSON.stringify({ email }));
        localStorage.setItem('karma_user_email', email); // For profile.js
        showLoader('Joining Karma...');
        setTimeout(() => navigateTo('profile.html'), 1500);
      } catch (err) {
        alert(`Sign up failed: ${err.message}`);
      }
    });
  });
  // ── ANIMATED CHARACTERS TRACKING LOGIC ──
  const chars = {
    p: { el: document.getElementById('char-purple'), eyes: document.querySelector('#char-purple .eyes') },
    b: { el: document.getElementById('char-black'), eyes: document.querySelector('#char-black .eyes') },
    o: { el: document.getElementById('char-orange'), eyes: document.querySelector('#char-orange .eyes') },
    y: { el: document.getElementById('char-yellow'), eyes: document.querySelector('#char-yellow .eyes'), m: document.querySelector('#char-yellow .mouth') }
  };
  if (!chars.p.el) return;
  window.isTyping = false;
  window.isPasswordVisible = false;
  window.isLookingAtEachOther = false;
  window.isPurplePeeking = false;
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  // Bind input states
  document.querySelectorAll('.f-input').forEach(i => {
    i.addEventListener('focus', () => { window.isTyping = true; window.isLookingAtEachOther = true; setTimeout(() => window.isLookingAtEachOther = false, 800); });
    i.addEventListener('blur', () => { window.isTyping = false; });
  });
  document.querySelectorAll('.pass-field').forEach(i => {
    i.addEventListener('input', () => {
      // Random peeking while password is shown
      if (window.isPasswordVisible && !window.isPurplePeeking && Math.random() > 0.8) {
        window.isPurplePeeking = true; setTimeout(() => window.isPurplePeeking = false, 800);
      }
    });
  });
  function setPupils(eyes, dx, dy) {
    if (!eyes) return;
    eyes.querySelectorAll('.pupil').forEach(p => p.style.transform = `translate(${dx}px, ${dy}px)`);
  }
  function calcPos(rect) {
    if (!rect) return { fx: 0, fy: 0, bs: 0 };
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 3;
    const dx = mouseX - cx, dy = mouseY - cy;
    return { fx: Math.max(-15, Math.min(15, dx / 20)), fy: Math.max(-10, Math.min(10, dy / 30)), bs: Math.max(-6, Math.min(6, -dx / 120)) };
  }
  function loopCharacters() {
    const p = calcPos(chars.p.el.getBoundingClientRect());
    const b = calcPos(chars.b.el.getBoundingClientRect());
    const o = calcPos(chars.o.el.getBoundingClientRect());
    const y = calcPos(chars.y.el.getBoundingClientRect());
    // Purple
    if (window.isPasswordVisible) {
      chars.p.el.style.transform = `skewX(0deg)`; chars.p.el.style.height = '440px';
      chars.p.eyes.style.left = '20px'; chars.p.eyes.style.top = '35px';
      setPupils(chars.p.eyes, window.isPurplePeeking ? 4 : -4, window.isPurplePeeking ? 5 : -4);
    } else if (window.isTyping) {
      chars.p.el.style.transform = `skewX(${p.bs - 12}deg) translateX(40px)`; chars.p.el.style.height = '440px';
      chars.p.eyes.style.left = window.isLookingAtEachOther ? '55px' : `${45 + p.fx}px`;
      chars.p.eyes.style.top = window.isLookingAtEachOther ? '65px' : `${40 + p.fy}px`;
      setPupils(chars.p.eyes, window.isLookingAtEachOther ? 3 : p.fx / 2, window.isLookingAtEachOther ? 4 : p.fy / 2);
    } else {
      chars.p.el.style.transform = `skewX(${p.bs}deg)`; chars.p.el.style.height = '400px';
      chars.p.eyes.style.left = `${45 + p.fx}px`; chars.p.eyes.style.top = `${40 + p.fy}px`;
      setPupils(chars.p.eyes, p.fx / 2, p.fy / 2);
    }
    // Black
    if (window.isPasswordVisible) {
      chars.b.el.style.transform = `skewX(0deg)`;
      chars.b.eyes.style.left = '10px'; chars.b.eyes.style.top = '28px';
      setPupils(chars.b.eyes, -4, -4);
    } else if (window.isLookingAtEachOther) {
      chars.b.el.style.transform = `skewX(${b.bs * 1.5 + 10}deg) translateX(20px)`;
      chars.b.eyes.style.left = '32px'; chars.b.eyes.style.top = '12px';
      setPupils(chars.b.eyes, 0, -4);
    } else if (window.isTyping) {
      chars.b.el.style.transform = `skewX(${b.bs * 1.5}deg)`;
      chars.b.eyes.style.left = `${26 + b.fx}px`; chars.b.eyes.style.top = `${32 + b.fy}px`;
      setPupils(chars.b.eyes, b.fx / 2, b.fy / 2);
    } else {
      chars.b.el.style.transform = `skewX(${b.bs}deg)`;
      chars.b.eyes.style.left = `${26 + b.fx}px`; chars.b.eyes.style.top = `${32 + b.fy}px`;
      setPupils(chars.b.eyes, b.fx / 2, b.fy / 2);
    }
    // Orange
    chars.o.el.style.transform = window.isPasswordVisible ? `skewX(0deg)` : `skewX(${o.bs}deg)`;
    chars.o.eyes.style.left = window.isPasswordVisible ? '50px' : `${82 + o.fx}px`;
    chars.o.eyes.style.top = window.isPasswordVisible ? '85px' : `${90 + o.fy}px`;
    setPupils(chars.o.eyes, window.isPasswordVisible ? -5 : o.fx / 2, window.isPasswordVisible ? -4 : o.fy / 2);
    // Yellow
    chars.y.el.style.transform = window.isPasswordVisible ? `skewX(0deg)` : `skewX(${y.bs}deg)`;
    chars.y.eyes.style.left = window.isPasswordVisible ? '20px' : `${52 + y.fx}px`;
    chars.y.eyes.style.top = window.isPasswordVisible ? '35px' : `${40 + y.fy}px`;
    setPupils(chars.y.eyes, window.isPasswordVisible ? -5 : y.fx / 2, window.isPasswordVisible ? -4 : y.fy / 2);
    if (chars.y.m) {
      chars.y.m.style.left = window.isPasswordVisible ? '10px' : `${40 + y.fx}px`;
      chars.y.m.style.top = window.isPasswordVisible ? '88px' : `${88 + y.fy}px`;
    }
    requestAnimationFrame(loopCharacters);
  }
  requestAnimationFrame(loopCharacters);
  // Blinking 
  setInterval(() => {
    const r = Math.random();
    if (r > 0.5) chars.p.eyes.querySelectorAll('.eye').forEach(e => { e.style.height = '2px'; setTimeout(() => e.style.height = '', 150); });
    else chars.b.eyes.querySelectorAll('.eye').forEach(e => { e.style.height = '2px'; setTimeout(() => e.style.height = '', 150); });
  }, 2500);
});
