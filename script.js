 /**
 * DASTARKHWAN INTERACTION SYSTEM
 * Features: Balloon Pop Background, Translation, Karma Garden (8 flowers), Modal Hub
 */

/* ================= BALLOON ENGINE ================= */
const canvas = document.getElementById('balloonCanvas');
const ctx = canvas?.getContext('2d');
let balloons = [];
let particles = [];
const colors = [
    { base: "#ff2e63", light: "#ff6b8f" },
    { base: "#00d2ff", light: "#80eaff" },
    { base: "#ffd700", light: "#fff080" },
    { base: "#9d50bb", light: "#c089d8" },
    { base: "#43e97b", light: "#a6f7c1" }
];

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 12;
        this.speedY = (Math.random() - 0.5) * 12;
        this.gravity = 0.2; this.opacity = 1;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY;
        this.speedY += this.gravity; this.opacity -= 0.025;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Balloon {
    constructor(first = true) {
        this.init(first);
    }
    init(first) {
        this.r = Math.random() * 15 + 25;
        this.x = Math.random() * canvas.width;
        this.y = first ? Math.random() * canvas.height : canvas.height + 100;
        this.colorSet = colors[Math.floor(Math.random() * colors.length)];
        this.speed = Math.random() * 1 + 0.5;
        this.angle = Math.random() * Math.PI * 2;
    }
    update() {
        this.y -= this.speed;
        this.angle += 0.02;
        this.x += Math.sin(this.angle) * 0.5;
        if (this.y < -100) this.init(false);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.moveTo(0, this.r);
        ctx.lineTo(Math.sin(this.angle * 2) * 10, this.r + 40);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r, this.r * 1.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.colorSet.base;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-this.r*0.3, -this.r*0.4, this.r*0.2, this.r*0.3, Math.PI/4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();
        ctx.restore();
    }
    pop() {
        for (let i = 0; i < 15; i++) {
            particles.push(new Particle(this.x, this.y, this.colorSet.base));
        }
        this.init(false);
    }
}

function initBalloons() {
    if(!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    balloons = Array.from({ length: 25 }, () => new Balloon(true));
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    balloons.forEach(b => { b.update(); b.draw(); });
    particles = particles.filter(p => p.opacity > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
}

window.addEventListener('mousemove', (e) => {
    balloons.forEach(b => {
        const dist = Math.hypot(e.clientX - b.x, e.clientY - b.y);
        if (dist < b.r + 10) b.pop();
    });
});

/* ================= MODAL FUNCTIONS ================= */
function openHubModal() {
    document.getElementById('hubModal').classList.add('active');
}

function closeHubModal() {
    document.getElementById('hubModal').classList.remove('active');
}

function navigateToMemories() {
    window.location.href = 'memories.html';
}

function navigateToCrazy() {
    window.location.href = 'crazy.html';
}

// Close modal when clicking outside
document.getElementById('hubModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeHubModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeHubModal();
    }
});

/* ================= TRANSLATION SYSTEM ================= */
const translations = {
    en: {
        logo: "DASTARKHWAN",
        tagline: "ONE NATION. ONE PLATE.",
        namaste: "NAMASTE",
        salam: "SALAM",
        halle: "AMEN",
        hungry: "I am Hungry",
        hotel: "REGISTER HOTEL",
        memory: "MEMORIES & CRAZY HUB",
        karma: "Karma Score",
        ticker: "Dastarkhwan Mission is Active! ❤️ Serving Swad across India."
    },
    hi: {
        logo: "दस्तरख़्वान",
        tagline: "एक राष्ट्र। एक थाली।",
        namaste: "नमस्ते",
        salam: "सलाम",
        halle: "आमीन",
        hungry: "मुझे भूख लगी है",
        hotel: "होटल रजिस्टर",
        memory: "यादें और पागल हब",
        karma: "कर्म स्कोर",
        ticker: "दस्तरख़्वान मिशन सक्रिय है! ❤️ सेवा जारी है।"
    },
    or: {
        logo: "ଦସ୍ତରଖାନ",
        tagline: "ଗୋଟିଏ ଦେଶ । ଗୋଟିଏ ଥାଳି ।",
        namaste: "ନମସ୍କାର",
        salam: "ସଲାମ",
        halle: "ଆମେନ୍",
        hungry: "ମୋତେ ଭୋକ ଲାଗୁଛି",
        hotel: "ହୋଟେଲ ପଞ୍ଜିକରଣ",
        memory: "ସ୍ମୃତି ଏବଂ ପାଗଳ ହବ",
        karma: "କର୍ମ ସ୍କୋର",
        ticker: "ଦସ୍ତରଖାନ ମିଶନ ଚାଲୁଅଛି! ❤️"
    }
};

function setLang(lang) {
    const t = translations[lang] || translations.en;
    document.getElementById('t-logo').textContent = t.logo;
    document.getElementById('t-tagline').textContent = t.tagline;
    document.getElementById('t-namaste').textContent = t.namaste;
    document.getElementById('t-salam').textContent = t.salam;
    document.getElementById('t-halle').textContent = t.halle;
    document.getElementById('t-hungry').textContent = t.hungry;
    document.getElementById('t-hotel').textContent = t.hotel;
    document.getElementById('t-memory').textContent = t.memory;
    document.getElementById('t-karma').textContent = t.karma;
    document.getElementById('liveTickerText').textContent = t.ticker;
    document.getElementById('langDrop').classList.remove('show');
}

/* ================= PAGE NAVIGATION ================= */
function handleHungryClick() {
    document.getElementById('loading-overlay').style.display = 'flex';
    setTimeout(() => { window.location.href = "hun1.html"; }, 2500);
}

function handleHotelClick() {
    document.getElementById('hotel-loader').style.display = 'flex';
    setTimeout(() => { window.location.href = "register.html"; }, 2800);
}

window.addEventListener('load', () => {
    initBalloons();
    animate();
    setLang('en');
});

window.addEventListener('resize', initBalloons);

/* ================= KARMA GARDEN – 8 FLOWERS, FULL BUGFIX ================= */
const karmaBtn = document.getElementById('karmaButton');
if (karmaBtn) {
    const smallPlants = [
        {
            id: 'tulipSmall',
            stem: document.querySelector('#tulipSmall .stem'),
            flower: document.querySelector('#tulipSmall .flower-group'),
            leaves: document.querySelectorAll('#tulipSmall .leaf'),
            stemLength: 38,
            swayAmount: 2.2,
            swayDuration: 2.0
        },
        {
            id: 'roseSmall',
            stem: document.querySelector('#roseSmall .stem'),
            flower: document.querySelector('#roseSmall .flower-group'),
            leaves: document.querySelectorAll('#roseSmall .leaf'),
            stemLength: 38,
            swayAmount: 1.6,
            swayDuration: 2.4
        },
        {
            id: 'daisySmall',
            stem: document.querySelector('#daisySmall .stem'),
            flower: document.querySelector('#daisySmall .flower-group'),
            leaves: document.querySelectorAll('#daisySmall .leaf'),
            stemLength: 40,
            swayAmount: 2.8,
            swayDuration: 1.8
        },
        {
            id: 'poppySmall',
            stem: document.querySelector('#poppySmall .stem'),
            flower: document.querySelector('#poppySmall .flower-group'),
            leaves: document.querySelectorAll('#poppySmall .leaf'),
            stemLength: 39,
            swayAmount: 2.5,
            swayDuration: 2.2
        },
        {
            id: 'sunflowerSmall',
            stem: document.querySelector('#sunflowerSmall .stem'),
            flower: document.querySelector('#sunflowerSmall .flower-group'),
            leaves: document.querySelectorAll('#sunflowerSmall .leaf'),
            stemLength: 38,
            swayAmount: 2.0,
            swayDuration: 2.3
        },
        {
            id: 'bluebellSmall',
            stem: document.querySelector('#bluebellSmall .stem'),
            flower: document.querySelector('#bluebellSmall .flower-group'),
            leaves: document.querySelectorAll('#bluebellSmall .leaf'),
            stemLength: 36,
            swayAmount: 1.9,
            swayDuration: 2.1
        },
        {
            id: 'cherrySmall',
            stem: document.querySelector('#cherrySmall .stem'),
            flower: document.querySelector('#cherrySmall .flower-group'),
            leaves: document.querySelectorAll('#cherrySmall .leaf'),
            stemLength: 38,
            swayAmount: 2.3,
            swayDuration: 2.0
        },
        {
            id: 'lilySmall',
            stem: document.querySelector('#lilySmall .stem'),
            flower: document.querySelector('#lilySmall .flower-group'),
            leaves: document.querySelectorAll('#lilySmall .leaf'),
            stemLength: 39,
            swayAmount: 2.1,
            swayDuration: 2.2
        }
    ];

    let growthTimeline, swayTimeline;
    let isHoveredKarma = false;

    // Set initial state
    smallPlants.forEach(p => {
        if (p.stem) gsap.set(p.stem, { strokeDashoffset: p.stemLength });
        if (p.flower) gsap.set(p.flower, { scale: 0, transformOrigin: 'center bottom' });
        if (p.leaves && p.leaves.length) {
            p.leaves.forEach(leaf => gsap.set(leaf, { scale: 0, transformOrigin: 'center' }));
        }
    });

    function growKarmaGarden() {
        if (growthTimeline) growthTimeline.kill();
        growthTimeline = gsap.timeline({ onComplete: startKarmaSway });

        smallPlants.forEach((plant, i) => {
            if (!plant.stem || !plant.flower || !plant.leaves.length) return;
            const delay = i * 0.1;

            // Stem growth
            growthTimeline.to(plant.stem, {
                strokeDashoffset: 0,
                duration: 1.0,
                ease: 'power2.out'
            }, delay);

            // All leaves grow
            plant.leaves.forEach((leaf, leafIdx) => {
                growthTimeline.to(leaf, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'back.out(2)',
                    transformOrigin: 'center'
                }, delay + 0.3 + (leafIdx * 0.05));
            });

            // Flower blooms
            growthTimeline.to(plant.flower, {
                scale: 1,
                duration: 0.5,
                ease: 'back.out(2.5)',
                transformOrigin: 'center bottom'
            }, delay + 0.8);
        });
    }

    function startKarmaSway() {
        if (!isHoveredKarma) return;
        if (swayTimeline) swayTimeline.kill();
        swayTimeline = gsap.timeline({ repeat: -1, yoyo: true });

        smallPlants.forEach((plant, i) => {
            if (!plant.flower || !plant.leaves.length) return;
            const offset = i * 0.15;

            // Flower head sway
            swayTimeline.to(plant.flower, {
                rotation: plant.swayAmount,
                duration: plant.swayDuration,
                ease: 'sine.inOut',
                transformOrigin: 'center bottom'
            }, offset);

            // Whole plant sway
            const svg = plant.flower.closest('svg');
            if (svg) {
                swayTimeline.to(svg, {
                    x: plant.swayAmount * 0.3,
                    duration: plant.swayDuration,
                    ease: 'sine.inOut'
                }, offset);
            }

            // Leaves flutter
            plant.leaves.forEach((leaf, leafIdx) => {
                swayTimeline.to(leaf, {
                    rotation: plant.swayAmount * (1 + leafIdx * 0.2),
                    duration: plant.swayDuration * 0.8,
                    ease: 'sine.inOut',
                    transformOrigin: 'center'
                }, offset + 0.1 + (leafIdx * 0.05));
            });
        });
    }

    function reverseKarmaGarden() {
        isHoveredKarma = false;
        if (swayTimeline) swayTimeline.kill();
        if (growthTimeline) growthTimeline.kill();

        const reverseTimeline = gsap.timeline({
            onComplete: () => {
                smallPlants.forEach(p => {
                    if (p.flower) gsap.set(p.flower, { rotation: 0, scale: 0 });
                    const svg = p.flower?.closest('svg');
                    if (svg) gsap.set(svg, { x: 0 });
                    if (p.leaves) {
                        p.leaves.forEach(leaf => {
                            gsap.set(leaf, { rotation: 0, scale: 0 });
                        });
                    }
                    if (p.stem) gsap.set(p.stem, { strokeDashoffset: p.stemLength });
                });
            }
        });

        // Step 1: Flowers shrink
        smallPlants.forEach(plant => {
            if (plant.flower) {
                reverseTimeline.to(plant.flower, {
                    scale: 0,
                    duration: 0.4,
                    ease: 'back.in(2)',
                    transformOrigin: 'center bottom'
                }, 0);
            }
        });

        // Step 2: Leaves shrink
        smallPlants.forEach(plant => {
            if (plant.leaves && plant.leaves.length) {
                plant.leaves.forEach(leaf => {
                    reverseTimeline.to(leaf, {
                        scale: 0,
                        duration: 0.35,
                        ease: 'back.in(1.8)'
                    }, 0.1);
                });
            }
        });

        // Step 3: Stems retract (inside timeline, staggered)
        smallPlants.forEach((plant, index) => {
            if (plant.stem) {
                reverseTimeline.to(plant.stem, {
                    strokeDashoffset: plant.stemLength,
                    duration: 0.9,
                    ease: 'power2.in'
                }, 0.5 + index * 0.05);
            }
        });
    }

    karmaBtn.addEventListener('mouseenter', () => {
        isHoveredKarma = true;
        growKarmaGarden();
    });

    karmaBtn.addEventListener('mouseleave', () => {
        reverseKarmaGarden();
    });
}