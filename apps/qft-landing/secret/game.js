(() => {
    
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  window.onresize = resize; resize();

  const $score = document.getElementById('score');
  const $lives = document.getElementById('lives');
  const $wave  = document.getElementById('wave');

  // Game states
  let gameState = "start"; // "start","playing","gameover"
  let paused = false;

  // Input
  const keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false, Space:false };
  const actions = { thrust:false, shoot:false, shield:false, pause:false };


  window.addEventListener("load", () => {
  const overlay = document.getElementById("fadeOverlay");
  // Kick off fade after a short delay
  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 200); // small delay so it feels intentional
});
// --- Joystick Class ---
class VirtualJoystick {
  constructor(centerX, centerY, maxRadius) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.maxRadius = maxRadius;
    this.active = false;
    this.dx = 0;
    this.dy = 0;
    this.thrust = 0;
    this.angle = 0;
    this.activePointerId = null;
  }
  start(x, y) {
    this.active = true;
    this.update(x, y);
  }
  update(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.min(Math.hypot(dx, dy), this.maxRadius);
    this.angle = Math.atan2(dy, dx);
    this.thrust = dist / this.maxRadius;
    this.dx = dx; this.dy = dy;
  }
  end() {
    this.active = false;
    this.thrust = 0;
    this.activePointerId = null;
  }
}

// --- Setup ---
const joystick = new VirtualJoystick(60, window.innerHeight - 60, 60);
const joystickEl = document.getElementById('joystick');
const stickEl = document.getElementById('stick');



joystickEl.addEventListener('pointerdown', e => {
  if (e.cancelable) e.preventDefault();
  joystick.start(e.clientX, e.clientY);
  joystick.activePointerId = e.pointerId;
}, { passive: false });

joystickEl.addEventListener('pointermove', e => {
  if (e.pointerId !== joystick.activePointerId) return;
  joystick.update(e.clientX, e.clientY);
  const dx = Math.cos(joystick.angle) * joystick.thrust * joystick.maxRadius;
  const dy = Math.sin(joystick.angle) * joystick.thrust * joystick.maxRadius;
  stickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}, { passive: false });

joystickEl.addEventListener('pointerup', e => {
  if (e.pointerId !== joystick.activePointerId) return;
  joystick.end();
  joystick.activePointerId = null;
  stickEl.style.transform = 'translate(-50%, -50%)';
}, { passive: false });
// --- Fire Button ---


const fireBtn = document.querySelector('#firePad .btn.big');
let firePointerId = null;

fireBtn.addEventListener('pointerdown', e => {
  if (e.cancelable) e.preventDefault();
  firePointerId = e.pointerId;
  shoot(); // your existing bullet firing logic
}, { passive: false });

fireBtn.addEventListener('pointerup', e => {
  if (firePointerId !== null && e.pointerId !== firePointerId) return;
  firePointerId = null;
});

fireBtn.addEventListener('pointercancel', e => {
  if (firePointerId !== null && e.pointerId !== firePointerId) return;
  firePointerId = null;
}, { passive: false });

const pauseBtn = document.querySelector('#pause .btn');

pauseBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  e.stopPropagation(); // prevent bubbling into joystick/tap-anywhere
  paused = !paused;
  console.log("Pause toggled:", paused);
  
}, { passive: false });

// --- Touch Controls Visibility ---

const touchControls = document.getElementById("touchControls");

// Default: show controls if touch is supported
if (navigator.maxTouchPoints > 0) {
    // Tap anywhere to continue
document.addEventListener("touchstart", () => {
  if (gameState === "start") {
    restart();
    gameState = "playing";
  } else if (gameState === "gameover") {
    restart();
    gameState = "playing";
  }
}, { passive: false });

  touchControls.classList.remove("hidden");
} else {
  touchControls.classList.add("hidden");
}

// Hide controls permanently once a keyboard is used
window.addEventListener("keydown", () => {
  touchControls.classList.add("hidden");
});


  window.addEventListener('keydown', e => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === "Space") { keys.Space = true; e.preventDefault(); }
    if (gameState === "start" && e.code === "Space") { restart(); gameState="playing"; }
    if (gameState === "gameover" && e.code === "Space") { restart(); gameState="playing"; }
    if (e.code === "KeyP") paused = !paused;
  });
  window.addEventListener('keyup', e => { if (e.code in keys) keys[e.code] = false; });



/*document.querySelectorAll('.btn').forEach(el => {
  if (el.id === "firePad") return; // skip fire button
  const a = el.dataset.a;
  el.onpointerdown = e => { e.preventDefault(); setAction(a,true); };
  el.onpointerup   = e => { e.preventDefault(); setAction(a,false); };
  el.onpointerleave= el.onpointercancel = e => setAction(a,false);
});*/

function wrap(v, max) {
  if (v < 0) return v + max;
  if (v >= max) return v - max;
  return v;
}
    // Game state
  const state = {
    score:0, lives:3, wave:1,
    ship: {
      thrustPower: 0.15,
      visible: true,
      x: canvas.width/2,
      y: canvas.height/2,
      angle: -Math.PI/2,
      vx: 0, vy: 0,
      size: 16,
      thrust: 0.14,
      drag: 0.995,
      cooldown: 0,
      inv: 0,
      shield: false,
      invincible: false,
      prismTimer: 0
    },
    bullets: [],
    enemies: [],
    particles: [],
    pickups: [],
    nextPickupTimer: Math.floor(Math.random() * 600 + 600),
    nextExtraLifeScore: 1000
  };
state.waveTransition = 0; // countdown before next wave
state.respawnDelay = 0;   // countdown before ship respawn
  // Background stars
  const stars = Array.from({length:100},()=>({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height,
    speed:0.2+Math.random()*0.5,
    size:Math.random()<0.1?2:1
  }));

  // Vibration helper (throttled) — only used when `navigator.vibrate` exists
  let _lastVibrate = 0;
  function tryVibrate(pattern, minInterval = 120) {
    if (!('vibrate' in navigator)) return;
    const now = Date.now();
    if (now - _lastVibrate < minInterval) return;
    try {
      navigator.vibrate(pattern);
      _lastVibrate = now;
    } catch (e) {
      // Ignore vibration errors (some browsers may throw on invalid patterns)
    }
  }

  function resetShip(){ state.ship.visible = true; state.ship.x=canvas.width/2; state.ship.y=canvas.height/2; state.ship.vx=0; state.ship.updatevy=0; state.ship.angle=-Math.PI/2; state.ship.inv=120; }
function spawnWave(n = 6 + state.wave) {
  state.enemies = [];
  for (let i = 0; i < n; i++) {
    state.enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() * 3 - 2) * 2.0,
      vy: (Math.random() * 3 - 2) * 2.0,
      size: 16 + Math.random() * 12,
      hp: 1,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.05, // slow spin
      trailCooldown: Math.floor(rand(4,12))
    });
  }
}
  function rand(a,b){ return Math.random()*(b-a)+a; }
  function wrap(v,max){ return v<0?v+max:v>=max?v-max:v; }
  function normalizeAngleDiff(diff) {
    // Normalize angle difference to [-π, π] for shortest rotation path
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }
    function shoot(){
    if(state.ship.cooldown>0)return;
    const s=state.ship.size;
    const noseX=state.ship.x+Math.cos(state.ship.angle)*s*2;
    const noseY=state.ship.y+Math.sin(state.ship.angle)*s*2;
 state.bullets.push({
  x: state.ship.x,
  y: state.ship.y,
  vx: Math.cos(state.ship.angle) * 8,
  vy: Math.sin(state.ship.angle) * 8,
  life: 120,
  size: 6, // bigger than before (default was ~2–4)
  angle: state.ship.angle // track direction for trail
});
 // add a small cooldown tracker for bullet trail to reduce particles
 state.bullets[state.bullets.length-1].trailCooldown = 0;

 
    state.ship.cooldown=45; // Only one bullet at a time (increased from 5)
  }
  function updateHUD(){
  $score.textContent = state.score;
  $lives.textContent = state.lives;
  $wave.textContent = state.wave;
}
  function addParticles(x, y, n = 8, color = 'rgba(180,220,255,0.8)', size = 3, lifeRange = [20, 40], shape = 'square', rotation) {
    const min = lifeRange[0], max = lifeRange[1];
    for (let i = 0; i < n; i++) {
      const life = Math.max(1, Math.floor(rand(min, max)));
      const p = {
        x, y,
        vx: rand(-2, 2),
        vy: rand(-2, 2),
        life: life,
        maxLife: life,
        initialSize: size,
        size: size,
        color: color,
        shape: shape
      };
      if (typeof rotation === 'number') p.rotation = rotation + rand(-0.2, 0.2);
      state.particles.push(p);
    }
    if (state.particles.length > 200) state.particles.splice(0, state.particles.length - 200); // cap
  }

  // Safe single-particle push (enforces cap) to be used for per-frame trails
  function pushParticle(p) {
    state.particles.push(p);
    if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
  }

function spawnExplosion(x, y, type = "enemy") {
  // Bigger, heavier explosion layers for more spectacle
  const isEnemy = type === 'enemy';
  const isShip = type === 'ship';

  // Layer 1: intense sparks (fast, short)
  const sparks = isEnemy ? 48 : (isShip ? 36 : 18);
  for (let i = 0; i < sparks; i++) {
    const life = Math.round(rand(20, 46));
    let color;
    if (isEnemy) color = 'rgba(255,220,140,0.98)';
    else if (isShip) color = 'rgba(180,220,255,0.98)'; // ship blue
    else color = 'rgba(255,160,160,0.98)';
    
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * (isEnemy ? 8 : (isShip ? 7 : 5)),
      vy: (Math.random() - 0.5) * (isEnemy ? 8 : (isShip ? 7 : 5)),
      life: life,
      maxLife: life,
      initialSize: rand(1, 4),
      size: rand(1, 4),
      shape: 'square'
    });
    state.particles[state.particles.length - 1].color = color;
  }

  // Layer 2: heavier debris (slower, medium lifetime)
  const debris = isEnemy ? 160 : (isShip ? 240 : 40);
  for (let i = 0; i < debris; i++) {
    const life = Math.round(rand(48, 110));
    let color;
    if (isEnemy) color = 'rgba(255,180,120,0.92)';
    else if (isShip) color = 'rgba(120,200,255,0.88)'; // ship blue
    else color = 'rgba(255,140,140,0.9)';
    
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * (isEnemy ? 3.2 : (isShip ? 3 : 2.2)),
      vy: (Math.random() - 0.5) * (isEnemy ? 3.2 : (isShip ? 3 : 2.2)),
      life: life,
      maxLife: life,
      initialSize: rand(3, 8),
      size: rand(3, 8),
      shape: 'square'
    });
    state.particles[state.particles.length - 1].color = color;
  }

  // Layer 3: larger glow pulse
  const glowLife = isEnemy ? 120 : (isShip ? 240 : 40);
  let glowColor;
  if (isEnemy) glowColor = 'rgba(255,210,140,0.45)';
  else if (isShip) glowColor = 'rgba(180,220,255,0.45)'; // ship blue glow
  else glowColor = 'rgba(255,180,180,0.45)';
  
  state.particles.push({
    x, y,
    vx: 0, vy: 0,
    life: glowLife,
    maxLife: glowLife,
    initialSize: isEnemy ? 32 : (isShip ? 40 : 20),
    size: isEnemy ? 32 : (isShip ? 80 : 40),
    color: glowColor,
    shape: 'circle',
    pulse: true,
    pulseMax: isShip ? 480 : (isEnemy ? 360 : 160)
  });
  // vibrate for explosions (short, throttled)
  tryVibrate(isShip ? [60,30,40] : 40, 120);
}

function spawnShipSpawnEffect(x, y) {
  // Spectacular spawn-in effect with ring burst and spiral shimmer
  
  // Ring burst: circular spread of particles
  const ringParticles = 32;
  for (let i = 0; i < ringParticles; i++) {
    const angle = (i / ringParticles) * Math.PI * 2;
    const speed = 5;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 50,
      maxLife: 50,
      initialSize: 3,
      size: 3,
      color: 'rgba(180,220,255,0.95)',
      shape: 'square',
      rotation: angle
    });
  }
  
  // Spiral shimmer: particles spiraling inward with fade
  const spiralParticles = 24;
  for (let i = 0; i < spiralParticles; i++) {
    const angle = (i / spiralParticles) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 60 + Math.random() * 40;
    state.particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * 2,
      vy: -Math.sin(angle) * 2,
      life: 80,
      maxLife: 80,
      initialSize: 2,
      size: 2,
      color: 'rgba(100,180,255,0.6)',
      shape: 'square',
      rotation: angle
    });
  }
  
  // Central bright glow burst
  state.particles.push({
    x, y,
    vx: 0, vy: 0,
    life: 60,
    maxLife: 60,
    initialSize: 50,
    size: 50,
    color: 'rgba(200,230,255,0.35)',
    shape: 'circle',
    pulse: true,
    pulseMax: 220
  });
  // vibrate on ship spawn (longer stronger pattern)
  tryVibrate([80,30,80], 200);
}

// Particle updates are handled in the main update() loop (with dt).
// The old `updateParticles()` helper was removed to avoid double-decrementing life.

function update(dt){
  if (paused || gameState !== "playing") return;
  // Pickup spawn timer
  state.nextPickupTimer -= dt;
  if (state.nextPickupTimer <= 0) {
    const px = Math.random() * canvas.width;
    const py = Math.random() * canvas.height;
    // choose type: shield is common, invincibility (prism) is rarer
    const type = Math.random() < 0.22 ? 'inv' : 'shield';
    // timer-based pickup spawns (smaller chance during gameplay)
    state.pickups.push({ x: px, y: py, vx: rand(-0.2,0.2), vy: rand(-0.2,0.2), size: 28, type });
    state.nextPickupTimer = Math.floor(rand(600, 1200));
  }
  
  // --- Wave transition countdown ---
  if (state.waveTransition > 0) {
    state.waveTransition -= dt;
    if (state.waveTransition <= 0) {
      spawnWave();
      // Teleport ship to center
      state.ship.x = canvas.width / 2;
      state.ship.y = canvas.height / 2;
      state.ship.vx = 0;
      state.ship.vy = 0;
      spawnShipSpawnEffect(state.ship.x, state.ship.y);
      state.ship.inv = 120; // invulnerability frames
      // Random chance to spawn a pickup for this wave (not guaranteed)
      // 40% chance for shield, additional 15% chance for invincibility
      const r = Math.random();
      if (r < 0.40) {
        // spawn shield pickup somewhere near center
        const px = Math.random() * canvas.width;
        const py = Math.random() * canvas.height;
        state.pickups.push({ x: px, y: py, vx: rand(-0.2,0.2), vy: rand(-0.2,0.2), size: 32, type: 'shield' });
      } else if (r < 0.55) {
        const px = Math.random() * canvas.width;
        const py = Math.random() * canvas.height;
        state.pickups.push({ x: px, y: py, vx: rand(-0.2,0.2), vy: rand(-0.2,0.2), size: 32, type: 'inv' });
      }
    };
  }

  // --- Ship respawn countdown ---
  if (state.respawnDelay > 0) {
    state.respawnDelay -= dt;
    if (state.respawnDelay <= 0) {
      state.ship.x = canvas.width / 2;
      state.ship.y = canvas.height / 2;
      state.ship.vx = 0;
      state.ship.vy = 0;
      state.ship.angle = -Math.PI / 2;
      spawnShipSpawnEffect(state.ship.x, state.ship.y);
      state.ship.inv = 120; // invulnerability frames
      // do not auto-grant shield on respawn; pickups are used instead
      state.ship.thrustPower = 0.05;
      state.ship.visible = true;
    }
  } else {
    // --- Ship update ---
    const ship = state.ship;

// --- Ship controls ---
// --- Joystick controls ---
if (joystick.active) {
    // Direct mapping: ship angle always equals joystick angle
    ship.angle = joystick.angle;

    // Threshold to prevent drift near center
    const threshold = 0.1;

    if (joystick.thrust > threshold) {
      // Apply thrust based on joystick displacement
      const thrustMultiplier = ship.invincible ? 1.5 : 1.0;
      ship.vx += Math.cos(ship.angle) * joystick.thrust * ship.thrustPower * thrustMultiplier * dt;
      ship.vy += Math.sin(ship.angle) * joystick.thrust * ship.thrustPower * thrustMultiplier * dt;

      // Particle trail when thrusting
      state.particles.push({
        x: ship.x - Math.cos(ship.angle) * ship.size,
        y: ship.y - Math.sin(ship.angle) * ship.size,
        startSize: ship.size,
        size: ship.size,
        maxLife: 120,
        life: 120,
        color: "rgba(120,200,255,0.4)",
        shape: "square",
        rotation: ship.angle,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4
      });
    }

    // Cap speed (increase while invincible)
    const maxSpeed = ship.invincible ? 7.5 : 5;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > maxSpeed) {
      ship.vx = (ship.vx / speed) * maxSpeed;
      ship.vy = (ship.vy / speed) * maxSpeed;
    }
}  else {
  // --- Keyboard logic ---
  if (keys.Space || actions.shoot) shoot();
  if (keys.ArrowLeft) ship.angle -= 0.06 * dt;
  if (keys.ArrowRight) ship.angle += 0.06 * dt;

  if (keys.ArrowUp || actions.thrust) {
    const thrustMultiplierKB = ship.invincible ? 2.0 : 1.0;
    ship.vx += Math.cos(ship.angle) * ship.thrustPower * thrustMultiplierKB * dt;
    ship.vy += Math.sin(ship.angle) * ship.thrustPower * thrustMultiplierKB * dt;

    // Particle trail when thrusting
    state.particles.push({
      x: ship.x - Math.cos(ship.angle) * ship.size,
      y: ship.y - Math.sin(ship.angle) * ship.size,
      startSize: ship.size,
      size: ship.size,
      maxLife: 60,
      life: 40,
      color: "rgba(120,200,255,0.4)",
      shape: "square",
      rotation: ship.angle,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4
    });
  }

  
}


    ship.vx *= ship.drag;
    ship.vy *= ship.drag;
// Screen wrapping (always active)
ship.x = wrap(ship.x, canvas.width);
ship.y = wrap(ship.y, canvas.height);

    if (ship.cooldown > 0) ship.cooldown -= dt;
    if (ship.inv > 0) ship.inv -= dt;
    // Prism/invincibility timer (counts down while active)
    if (ship.prismTimer > 0) {
      ship.prismTimer -= dt;
      if (ship.prismTimer <= 0) {
        ship.prismTimer = 0;
        ship.invincible = false;
      }
    }
    // --- Physics integration ---
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
  };

  // --- Bullets update ---
  state.bullets.forEach(b => {
    // Homing: find nearest enemy or pickup within range and steer towards it
    // Reduce homing intensity on smaller screens — compute a screen scale [0..1]
    const screenScale = Math.min(1, window.innerWidth / 800); // 800px+ uses full homing
    const homingRange = 10 + Math.round(screenScale * 160); // 120..280 depending on width
    let target = null;
    let minDist = homingRange * homingRange; // squared distance
    // Prefer enemies but allow pickups to be targeted as well
    for (const e of state.enemies) {
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDist) {
        minDist = distSq;
        target = e;
      }
    }
    // Also consider pickups as potential targets (so bullets home to power-ups)
    for (const p of state.pickups) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const distSq = dx * dx + dy * dy;
      // Slightly bias pickups so they are attractive but enemies still win if closer
      const bias = 1.0;
      if (distSq * bias < minDist) {
        minDist = distSq * bias;
        target = p;
      }
    }
    
    // If target found, smoothly steer towards it
    if (target) {
      const dx = target.x - b.x;
      const dy = target.y - b.y;
      const targetAngle = Math.atan2(dy, dx);
      const angleDiff = normalizeAngleDiff(targetAngle - b.angle);
      // Tracking factor scales with screen size: less intense on small screens
      const maxTracking = 0.15; // desktop/smaller screens cap
      const minTracking = 0.05; // minimum subtle homing
      const trackingFactor = Math.max(minTracking, maxTracking * screenScale);
      b.angle += angleDiff * trackingFactor;
    }
    
    // Maintain constant bullet speed
    const bulletSpeed = 8;
    b.vx = Math.cos(b.angle) * bulletSpeed;
    b.vy = Math.sin(b.angle) * bulletSpeed;
    
    b.x = wrap(b.x + b.vx * dt, canvas.width);
    b.y = wrap(b.y + b.vy * dt, canvas.height);
    b.life -= dt;
    // Bullet trail: throttle using trailCooldown
    b.trailCooldown -= 1;
    if (b.trailCooldown <= 0) {
      b.trailCooldown = 4; // trail every ~4 frames
      pushParticle({
        x: b.x - Math.cos(b.angle) * b.size,
        y: b.y - Math.sin(b.angle) * b.size,
        startSize: b.size * 0.6,
        size: b.size * 0.6,
        maxLife: 60,
        life: 60,
        color: 'rgba(255,255,180,0.35)',
        shape: 'square',
        rotation: b.angle,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2
      });
    }
  });
  // --- Bullet vs Pickup collisions ---
  for (let pi = state.pickups.length - 1; pi >= 0; pi--) {
    const p = state.pickups[pi];
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      if (dx*dx + dy*dy < (p.size/2 + (b.size||2))**2) {
        // Pickup collected by bullet: grant effect based on pickup type
        state.bullets.splice(bi, 1);
        state.pickups.splice(pi, 1);
        if (p.type === 'shield') {
          state.ship.shield = true;
          spawnExplosion(p.x, p.y, 'ship');
        } else if (p.type === 'inv') {
          // give 10s of prismatic invincibility (~600 frames)
          state.ship.prismTimer = 600;
          state.ship.invincible = true;
          spawnExplosion(p.x, p.y, 'ship');
          addParticles(p.x, p.y, 32, 'rgba(255,230,200,0.9)', 4, [30,70], 'square');
        }
        break;
      }
    }
  }
  state.bullets = state.bullets.filter(b => b.life > 0);

  // --- Enemies update ---
  if (state.waveTransition <= 0) {
    state.enemies.forEach(e => {
      e.x = wrap(e.x + e.vx * dt, canvas.width);
      e.y = wrap(e.y + e.vy * dt, canvas.height);
      e.rotation += e.rotationSpeed * dt;
      // Enemy trail: throttle using trailCooldown to reduce particle churn
      e.trailCooldown -= 1;
      if (!e.trailCooldown || e.trailCooldown <= 0) {
        e.trailCooldown = Math.floor(rand(6, 14));
        pushParticle({
          x: e.x,
          y: e.y,
          startSize: e.size,
          size: e.size,
          maxLife: 60,
          life: 60,
          color: 'rgba(255,150,150,0.28)',
          shape: 'square',
          rotation: e.rotation,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4
        });
      }
    });
  }

  // --- Pickups update ---
  for (let pi = state.pickups.length - 1; pi >= 0; pi--) {
    const p = state.pickups[pi];
    p.x = wrap(p.x + (p.vx || 0) * dt, canvas.width);
    p.y = wrap(p.y + (p.vy || 0) * dt, canvas.height);
  }

  // --- Collisions ---
  if (state.waveTransition <= 0 && state.respawnDelay <= 0) {
    // Bullet vs Enemy
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      for (let j = state.bullets.length - 1; j >= 0; j--) {
        const b = state.bullets[j];
        if (
          b.x > e.x - e.size/2 &&
          b.x < e.x + e.size/2 &&
          b.y > e.y - e.size/2 &&
          b.y < e.y + e.size/2
        ) {
          state.bullets.splice(j, 1);
          state.score += 10;
          // Check extra life milestone
          if (state.score >= state.nextExtraLifeScore) {
            state.lives += 1;
            state.nextExtraLifeScore += 1000;
            // show a celebratory spawn at ship
            spawnExplosion(state.ship.x, state.ship.y, 'ship');
          }
          // Enemy explosion burst
          spawnExplosion(e.x, e.y, "enemy");
          state.enemies.splice(i, 1);
          break;
        }
      }
    }
    // Enemy vs Ship
    state.enemies.forEach((e, ei) => {
      const dist = Math.hypot(state.ship.x - e.x, state.ship.y - e.y);
      if (dist < state.ship.size + e.size && state.ship.inv <= 0) {
        // If ship is prism-invincible, destroy enemy on contact
        if (state.ship.invincible) {
          spawnExplosion(e.x, e.y, 'enemy');
          state.enemies.splice(ei, 1);
          return;
        }
        if (state.ship.shield) {
          // Consume shield: enemy explodes, ship survives
          state.ship.shield = false;
          spawnExplosion(e.x, e.y, 'enemy');
          state.enemies.splice(ei, 1);
        } else {
          state.lives--;
          // Ship explosion burst
          spawnExplosion(state.ship.x, state.ship.y, "ship");
          state.ship.visible = false;
          state.respawnDelay = 90; // delay before respawn
          if (state.lives <= 0) gameState = "gameover";
        }
      }
    });
  }

  // --- Particle update (always runs) ---
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || 0) * dt;
    p.life -= dt;
    p.maxLife = p.maxLife || Math.max(p.life, 1);
    const base = p.initialSize || p.startSize || p.size || 2;
    if (p.pulse) {
      const progress = 1 - (p.life / p.maxLife);
      // Use an ease-out curve for smoother pulse (more natural feel)
      const eased = Math.sin(progress * Math.PI * 0.5); // easeOutSine
      // Allow per-particle pulseMax; fall back to a size-based default
      const pulseMax = p.pulseMax !== undefined ? p.pulseMax : Math.max(60, (p.size || base) * 4);
      p.size = (p.startSize || base) + eased * pulseMax;
      // fade pulse alpha handled in draw
    } else {
      p.size = base * Math.max(p.life / p.maxLife, 0);
    }
    p.rotation = (p.rotation || 0) + 0.05 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // --- Next wave check ---
  if (state.enemies.length === 0 && state.waveTransition <= 0) {
    state.wave++;
    state.waveTransition = 120; // 2s delay before next wave
  }

  // keep HUD in sync each frame
  updateHUD();

}
    function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);

    // Background stars (optimized drift)
    stars.forEach(s=>{
      s.y+=s.speed;
      if(s.y>canvas.height){ s.y=0; s.x=Math.random()*canvas.width; }
      ctx.fillStyle='rgba(200,220,255,0.8)';
      ctx.fillRect(s.x,s.y,s.size,s.size);
    });

    // Start screen
    if(gameState==="start"){
      ctx.fillStyle="#cfe8ff";
      ctx.font="700 32px Orbitron, system-ui";
      ctx.textAlign="center";
      ctx.fillText("🚀 QFT Space Defender 🚀", canvas.width/2, canvas.height/2-40);
      ctx.font="20px system-ui";
      // Show context-aware prompt: tap on touch devices, space on keyboard
      const startPrompt = (typeof touchControls !== 'undefined' && !touchControls.classList.contains('hidden')) || navigator.maxTouchPoints > 0
        ? 'Tap to Start'
        : 'Press SPACE to Start';
      ctx.fillText(startPrompt, canvas.width/2, canvas.height/2+20);
      return;
    }

    // Game over screen
    if(gameState==="gameover"){
      ctx.fillStyle="rgba(10,15,20,0.85)";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#ffb3b3";
      ctx.font="700 28px system-ui";
      ctx.textAlign="center";
      ctx.fillText("💀 Game Over 💀", canvas.width/2, canvas.height/2-40);
      ctx.fillStyle="#cfe8ff";
      ctx.font="20px system-ui";
      ctx.fillText(`Final Score: ${state.score}`, canvas.width/2, canvas.height/2);
      const restartPrompt = (typeof touchControls !== 'undefined' && !touchControls.classList.contains('hidden')) || navigator.maxTouchPoints > 0
        ? 'Tap to Restart'
        : 'Press SPACE to Restart';
      ctx.fillText(restartPrompt, canvas.width/2, canvas.height/2+40);
      return;
    }
    
    if(state.waveTransition > 0){
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Wave " + state.wave, canvas.width/2, canvas.height/2);
}

if(state.respawnDelay > 0){
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Respawning...", canvas.width/2, canvas.height/2 + 40);
}


// --- Wave transition text ---
if(state.waveTransition > 0){
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Wave " + state.wave, canvas.width/2, canvas.height/2);
}

// --- Respawn delay indicator ---
if(state.respawnDelay > 0){
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Respawning...", canvas.width/2, canvas.height/2 + 40);
}
    // Ship (triangle vector)
if (state.ship.visible && state.respawnDelay <= 0) {
    const ship=state.ship;
ctx.save();
ctx.translate(ship.x, ship.y);
ctx.rotate(ship.angle);
ctx.shadowColor = 'rgba(180,220,255,0.9)';
ctx.shadowBlur = 20;
const s = ship.size;
ctx.beginPath();
ctx.moveTo(s * 1.4, 0);          // nose
ctx.lineTo(-s, -s * 0.6);        // upper rear
ctx.lineTo(-s * 0.6, 0);         // inward point at bottom center
ctx.lineTo(-s, s * 0.6);         // lower rear
ctx.closePath();
ctx.lineWidth = 2;
// Prismatic stroke if prism active
const hue = (performance.now() / 30) % 360;
const strokeColor = ship.prismTimer > 0 ? `hsla(${hue},100%,70%,0.95)` : (ship.inv > 0 ? 'rgba(255,240,180,0.9)' : 'rgba(180,220,255,0.9)');
ctx.strokeStyle = strokeColor;
ctx.fillStyle = ship.prismTimer > 0 ? `hsla(${(hue + 200) % 360},80%,40%,0.18)` : 'rgba(60,120,180,0.25)';
ctx.shadowColor = strokeColor;
ctx.stroke();
ctx.fill();
ctx.restore();
};
// Draw shield halo over ship if active (feint circle)
if (state.ship.visible && state.ship.shield && state.respawnDelay <= 0) {
  const s = state.ship;
  ctx.save();
  // subtler pulse: lower amplitude, thinner line, smaller blur
  const pulse = Math.sin(performance.now() / 300) * 0.8; // subtle oscillation
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.size * 1.6 + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100,240,160,0.14)';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(100,240,160,0.09)';
  ctx.stroke();
  ctx.restore();
}
    // Bullets
state.bullets.forEach(b => {
  ctx.save();
  ctx.translate(b.x, b.y);

  // Glow settings
  ctx.shadowColor = "yellow";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "rgba(255,255,100,1)";
  ctx.beginPath();
  ctx.arc(0, 0, b.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
});

// Enemies (rotating red squares with glow)
state.enemies.forEach(e => {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rotation);
  ctx.shadowColor = 'rgba(255, 138, 29, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255, 138, 29, 0.35)';
  ctx.strokeStyle = 'rgba(255, 206, 29, 0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-e.size/2, -e.size/2, e.size, e.size);
  ctx.fillRect(-e.size/2, -e.size/2, e.size, e.size);
  ctx.restore();
});

// Draw pickups (shield circle with 🛡️, inv triangle with ✨)
state.pickups.forEach(p => {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Match ship/enemy styling: stroke + soft fill + glow
  if (p.type === 'shield') {
    // soft glow + stroked pickup (no pulse particle)
    ctx.shadowColor = 'rgba(100,240,160,0.9)';
    ctx.shadowBlur = 42;
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60,200,120,0.12)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(100,240,160,0.9)';
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (p.type === 'inv') {
    // Prismatic invincibility pickup: stroke cycles hues
    const hueP = (performance.now() / 40) % 360;
    // soft prismatic glow + stroked triangle (no pulse particle)
    ctx.shadowColor = `hsla(${hueP},80%,60%,0.9)`;
    ctx.shadowBlur = 42;
    ctx.beginPath();
    ctx.moveTo(0, -p.size/2);
    ctx.lineTo(p.size/2, p.size/2);
    ctx.lineTo(-p.size/2, p.size/2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(240,220,120,0.10)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `hsla(${hueP},90%,60%,0.95)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
});


// Particles (rotating square outlines, more transparent)
// Particles (supports multiple shapes)
state.particles.forEach(p => {
  ctx.save();
  ctx.translate(p.x, p.y);

  // Rotation only applies to squares
  if (p.shape === "square") {
    ctx.rotate(p.rotation || 0);
  }

  // Transparency fade
  ctx.globalAlpha = Math.max((p.life || 0) / (p.maxLife || 1), 0);

  ctx.lineWidth = 1.5;

  if (p.shape === "square") {
    ctx.strokeStyle = p.color;
    ctx.strokeRect(-p.size/2, -p.size/2, p.size, p.size);
  } else if (p.shape === "circle") {
    ctx.strokeStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.shape === "filledCircle") {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
});

ctx.globalAlpha = 1;
    }

    function restart(){
    state.score=0; state.lives=3; state.wave=1;
    $score.textContent=0; $lives.textContent=3; $wave.textContent=1;
    state.bullets=[]; state.enemies=[]; state.particles=[];
    resetShip(); spawnWave(); paused=false;
  }
    joystickEl.addEventListener('pointerdown', () => console.log('Joystick pressed'));
fireBtn.addEventListener('pointerdown', () => console.log('Fire pressed'));
  // Main loop with delta time
  let last=performance.now();
  function loop(now){
    const dt=(now-last)/16.67; // normalize to ~60fps
    last=now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();