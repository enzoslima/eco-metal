// =========================
// ECO DE METAL II - A CAÇADA
// game.js (PARTE 1/3)
// =========================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 420;
const H = 320;
canvas.width = W;
canvas.height = H;

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.95;
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============ TEXT RENDERER ============
const TextRenderer = {
  draw(text, x, y, opts = {}) {
    const { size = 12, color = '#fff', shadow = true, bold = false, align = 'left' } = opts;
    ctx.font = `${bold ? 'bold ' : ''}${size}px "Courier New", monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    if (shadow) {
      ctx.fillStyle = '#000';
      ctx.fillText(text, x + 1, y + 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  },

  drawBox(text, x, y, opts = {}) {
    const { size = 12, color = '#fff', bg = 'rgba(0,0,0,0.85)', padding = 6, border = null } = opts;
    ctx.font = `${size}px "Courier New", monospace`;
    const w = ctx.measureText(text).width + padding * 2;
    const h = size + padding * 2;
    ctx.fillStyle = bg;
    ctx.fillRect(x - padding, y - h / 2, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - padding, y - h / 2, w, h);
    }
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
};

// ============ AUDIO SYSTEM ============
const Audio = {
  ctx: null,
  init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} },
  unlock() { if (this.ctx?.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur, type = 'square', vol = 0.1) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  },
  footstep() { this.tone(50 + Math.random() * 25, 0.05, 'square', 0.025); },
  collect() { this.tone(523, 0.08, 'square', 0.07); setTimeout(() => this.tone(659, 0.08, 'square', 0.07), 70); setTimeout(() => this.tone(784, 0.1, 'square', 0.07), 140); },
  clueFound() { this.tone(330, 0.1, 'sine', 0.08); setTimeout(() => this.tone(440, 0.1, 'sine', 0.08), 100); setTimeout(() => this.tone(550, 0.15, 'sine', 0.1), 200); },
  alert() { this.tone(200, 0.12, 'sawtooth', 0.08); setTimeout(() => this.tone(300, 0.12, 'sawtooth', 0.08), 80); },
  chase() { for (let i = 0; i < 4; i++) setTimeout(() => this.tone(350 + i * 80, 0.1, 'sawtooth', 0.07), i * 60); },
  damage() { this.tone(70, 0.25, 'sawtooth', 0.12); },
  boarCharge() { this.tone(60, 0.4, 'sawtooth', 0.15); this.tone(80, 0.3, 'square', 0.1); },
  generator() { this.tone(100, 0.1, 'square', 0.04); this.tone(150, 0.08, 'sawtooth', 0.03); },
  generatorFixed() { this.tone(440, 0.15, 'square', 0.1); setTimeout(() => this.tone(550, 0.15, 'square', 0.1), 100); setTimeout(() => this.tone(660, 0.2, 'square', 0.12), 200); },
  carAppear() { this.tone(200, 0.2, 'square', 0.1); setTimeout(() => this.tone(300, 0.2, 'square', 0.1), 150); setTimeout(() => this.tone(400, 0.3, 'square', 0.12), 300); setTimeout(() => this.tone(500, 0.4, 'square', 0.15), 450); },
  decoy() { this.tone(400, 0.15, 'sine', 0.08); this.tone(500, 0.1, 'sine', 0.06); },
  childRescue() { this.tone(392, 0.12, 'square', 0.08); setTimeout(() => this.tone(494, 0.12, 'square', 0.08), 100); setTimeout(() => this.tone(587, 0.15, 'square', 0.1), 200); setTimeout(() => this.tone(784, 0.2, 'square', 0.12), 300); },
  carStart() { this.tone(80, 0.5, 'sawtooth', 0.12); this.tone(100, 0.4, 'square', 0.08); setTimeout(() => this.tone(120, 0.6, 'sawtooth', 0.15), 300); },
  heartbeat() { this.tone(50, 0.1, 'sine', 0.05); setTimeout(() => this.tone(40, 0.15, 'sine', 0.04), 100); }
};

// ============ PLAYER CONTROLLER ============
const PlayerCtrl = {
  vx: 0, vy: 0, walkCycle: 0, dir: 0, isMoving: false,
  maxSpeed: 2.0, sprintSpeed: 3.0, accel: 0.22, decel: 0.15,

  update(p, keys, carrying) {
    let ix = 0, iy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) ix--;
    if (keys['ArrowRight'] || keys['KeyD']) ix++;
    if (keys['ArrowUp'] || keys['KeyW']) iy--;
    if (keys['ArrowDown'] || keys['KeyS']) iy++;
    if (ix && iy) { ix *= 0.707; iy *= 0.707; }
    const sprint = (keys['ShiftLeft'] || keys['ShiftRight']) && p.stamina > 0 && !carrying;
    let spd = sprint ? this.sprintSpeed : this.maxSpeed;
    if (carrying) spd *= 0.7;
    if (sprint && (ix || iy)) p.stamina = Math.max(0, p.stamina - 0.35);
    else p.stamina = Math.min(p.maxStamina, p.stamina + 0.12);
    if (ix || iy) {
      this.vx += (ix * spd - this.vx) * this.accel;
      this.vy += (iy * spd - this.vy) * this.accel;
      this.isMoving = true;
      const ang = Math.atan2(this.vy, this.vx);
      if (ang > -Math.PI / 4 && ang <= Math.PI / 4) this.dir = 0;
      else if (ang > Math.PI / 4 && ang <= 3 * Math.PI / 4) this.dir = 1;
      else if (ang > -3 * Math.PI / 4 && ang <= -Math.PI / 4) this.dir = 3;
      else this.dir = 2;
    } else {
      this.vx *= (1 - this.decel);
      this.vy *= (1 - this.decel);
      if (Math.abs(this.vx) < 0.04) this.vx = 0;
      if (Math.abs(this.vy) < 0.04) this.vy = 0;
      this.isMoving = Math.abs(this.vx) > 0.08 || Math.abs(this.vy) > 0.08;
    }
    if (this.isMoving) {
      this.walkCycle += 0.12 * Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    } else {
      this.walkCycle *= 0.85;
    }
    p.x += this.vx;
    p.y += this.vy;
    return { sprint, moving: this.isMoving };
  },

  getAnim() {
    return {
      cycle: this.walkCycle,
      dir: this.dir,
      moving: this.isMoving,
      bob: Math.sin(this.walkCycle) * (this.isMoving ? 1.2 : 0),
      arm: Math.sin(this.walkCycle * 2) * (this.isMoving ? 6 : 0)
    };
  },

  reset() {
    this.vx = 0; this.vy = 0; this.walkCycle = 0; this.dir = 0; this.isMoving = false;
  }
};

// ============ GAME CONSTANTS ============
const STATE = { TITLE: 0, INTRO: 1, GAME: 2, CHASE: 3, PAUSE: 4, DEATH: 5, GENERATOR: 6, ENDING: 7 };
const MAP_W = 1800;
const MAP_H = 1200;

// ============ GAME VARIABLES ============
let gameState = STATE.TITLE;
let player, deer, boar, camera;
let keys = {};
let items, flashlight;
let trees = [], buildings = [], clues = [], generators = [];
let children = [];
let decoys = [];
let rain = [], fog = [];
let textTimer = 0, currentText = '';
let gameTimer = 0, introStep = 0, introTimer = 0;
let deathTimer = 0, endingTimer = 0;
let screenShake = 0, vhsGlitch = 0;
let lightningTimer = 0, lightningFlash = 0;
let flareActive = false, flareTimer = 0, flareX = 0, flareY = 0;
let titleSelect = 0, pauseSelect = 0;
let footstepTimer = 0, heartbeatTimer = 0;
let cluesFound = 0, totalClues = 5;
let childrenRescued = 0, totalChildren = 3;
let generatorsFixed = 0, totalGenerators = 3;
let activeGenerator = null;
let generatorProgress = 0;
let nearbyClue = null;
let nearbyChild = null;
let nearbyGenerator = null;
let childrenFollowing = [];
let escapeCar = { x: 0, y: 0, visible: false, ready: false };

// ============ POSICIONA CARRO FORA DO FERRO-VELHO ============
function placeEscapeCarOutsideJunkyard() {
  const workshop = buildings.find(b => b.type === 'workshop');
  let x = 1500, y = 260;
  if (workshop) {
    x = workshop.x + workshop.w + 110;
    y = workshop.y + workshop.h + 40;
  }
  escapeCar.x = Math.max(60, Math.min(MAP_W - 60, x));
  escapeCar.y = Math.max(60, Math.min(MAP_H - 60, y));
  trees = trees.filter(t => Math.hypot(t.x - escapeCar.x, t.y - escapeCar.y) > 75);
}

// ============ INITIALIZATION ============
function init() {
  player = {
    x: 200, y: 250,
    hiding: false, crouching: false,
    hp: 4, maxHp: 4,
    stamina: 100, maxStamina: 100,
    invincible: 0, noise: 0
  };
  deer = {
    x: 1200, y: 500, frame: 0, speed: 0.5,
    mode: 'patrol', eyeColor: '#ffcc00',
    stunTimer: 0, patrolTimer: 0, patrolDir: Math.random() * Math.PI * 2,
    alertLevel: 0, lastKnownX: 0, lastKnownY: 0,
    heatVision: false, callBoar: false
  };
  boar = {
    x: 1400, y: 900, frame: 0, speed: 0.4,
    mode: 'patrol', eyeColor: '#ffcc00',
    stunTimer: 0, patrolTimer: 0, patrolDir: Math.random() * Math.PI * 2,
    alertLevel: 0, charging: false, chargeDir: 0, chargeTimer: 0,
    respondingToCall: false
  };
  camera = { x: 0, y: 0 };
  items = { flares: 2, decoys: 0 };
  flashlight = { on: true, battery: 100 };
  cluesFound = 0;
  childrenRescued = 0;
  generatorsFixed = 0;
  decoys = [];
  childrenFollowing = [];
  activeGenerator = null;
  generatorProgress = 0;
  nearbyClue = null;
  nearbyChild = null;
  nearbyGenerator = null;
  escapeCar = { x: 0, y: 0, visible: false, ready: false };
  PlayerCtrl.reset();
  flareActive = false;
  screenShake = 0;
  gameTimer = 0;
  generateWorld();
}

function generateWorld() {
  trees = [];
  for (let i = 0; i < 250; i++) {
    const tx = Math.random() * MAP_W;
    const ty = Math.random() * MAP_H;
    if (tx < 280 && ty < 320) continue;
    if (tx > 1100 && tx < 1400 && ty > 150 && ty < 350) continue;
    if (tx > 750 && tx < 950 && ty > 850 && ty < 1050) continue;
    trees.push({ x: tx, y: ty, h: 35 + Math.random() * 45, type: Math.floor(Math.random() * 3), sway: Math.random() * Math.PI * 2 });
  }
  rain = [];
  for (let i = 0; i < 120; i++) {
    rain.push({ x: Math.random() * W, y: Math.random() * H, speed: 3.5 + Math.random() * 3.5, len: 5 + Math.random() * 8 });
  }
  fog = [];
  for (let i = 0; i < 45; i++) {
    fog.push({ x: Math.random() * MAP_W, y: Math.random() * MAP_H, r: 35 + Math.random() * 55, alpha: 0.03 + Math.random() * 0.06, dx: (Math.random() - 0.5) * 0.25 });
  }
  buildings = [
    { x: 100, y: 120, w: 70, h: 55, type: 'cabin', name: 'Cabana Abandonada', canHide: true },
    { x: 450, y: 550, w: 70, h: 55, type: 'cabin', name: 'Refúgio do Caçador', canHide: true },
    { x: 1150, y: 180, w: 160, h: 110, type: 'workshop', name: 'Ferro-Velho Principal' },
    { x: 1100, y: 380, w: 90, h: 70, type: 'shed', name: 'Galpão de Peças' },
    { x: 700, y: 700, w: 70, h: 55, type: 'cabin', name: 'Cabana das Crianças', canHide: true },
    { x: 820, y: 920, w: 110, h: 90, type: 'bunker', name: 'Laboratório Subterrâneo' },
    { x: 1500, y: 600, w: 90, h: 70, type: 'warehouse', name: 'Armazém', canHide: true }
  ];
  clues = [
    { x: 130, y: 150, type: 'backpack', name: 'Mochila de Miguel', found: false, text: 'Uma mochila com desenhos de um cervo de olhos vermelhos.' },
    { x: 480, y: 580, type: 'toy', name: 'Boneco de Sofia', found: false, text: 'Um boneco de pano sujo, escondido sob a cama.' },
    { x: 720, y: 720, type: 'diary', name: 'Diário de Ana', found: false, text: '"Dia 5: As máquinas nos observam. Encontramos uma porta no chão..."' },
    { x: 1180, y: 420, type: 'drawing', name: 'Mapa Infantil', found: false, text: 'Desenho mostrando uma escada para um lugar subterrâneo.' },
    { x: 1520, y: 620, type: 'photo', name: 'Foto de Família', found: false, text: 'Foto das três crianças sorrindo no acampamento.' }
  ];
  generators = [
    { x: 1140, y: 420, fixed: false, name: 'Gerador do Galpão', progress: 0 },
    { x: 1540, y: 640, fixed: false, name: 'Gerador do Armazém', progress: 0 },
    { x: 860, y: 960, fixed: false, name: 'Gerador do Laboratório', progress: 0 }
  ];
  children = [
    { x: 850, y: 980, rescued: false, name: 'Miguel', age: 8, color: '#4444aa', following: false },
    { x: 890, y: 1000, rescued: false, name: 'Sofia', age: 6, color: '#aa44aa', following: false },
    { x: 870, y: 1020, rescued: false, name: 'Ana', age: 10, color: '#44aa44', following: false }
  ];
  placeEscapeCarOutsideJunkyard();
}

// ============ CORREÇÃO: CHECK GENERATORS + SPAWN CAR ============
function checkGeneratorsAndSpawnCar() {
  const allFixed = generators.every(g => g.fixed);
  if (allFixed && !escapeCar.visible) {
    escapeCar.visible = true;
    escapeCar.ready = false;
    Audio.carAppear();
    vhsGlitch = 20;
    screenShake = 8;
    // ✅ CORREÇÃO: se crianças já foram resgatadas antes do carro aparecer
    if (childrenRescued >= totalChildren) {
      escapeCar.ready = true;
      showText('🚗 CARRO pronto! Crianças já resgatadas! Vá fugir! [E]');
    } else {
      showText('🚗 CARRO DE FUGA apareceu FORA do Ferro-Velho!');
    }
  }
}

// ============ INPUT ============
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  Audio.unlock();

  if (gameState === STATE.TITLE) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') titleSelect = Math.max(0, titleSelect - 1);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') titleSelect = Math.min(1, titleSelect + 1);
    if (e.code === 'Enter' || e.code === 'Space') {
      if (titleSelect === 0) { gameState = STATE.INTRO; introStep = 0; introTimer = 0; init(); }
      Audio.tone(280, 0.08, 'square', 0.06);
    }
  }

  if (gameState === STATE.INTRO) {
    if (e.code === 'Enter' || e.code === 'Space') {
      introStep++; introTimer = 0;
      if (introStep >= 5) gameState = STATE.GAME;
    }
    if (e.code === 'Escape') gameState = STATE.GAME;
  }

  if (gameState === STATE.PAUSE) {
    if (e.code === 'Escape') gameState = STATE.GAME;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') pauseSelect = Math.max(0, pauseSelect - 1);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') pauseSelect = Math.min(2, pauseSelect + 1);
    if (e.code === 'Enter' || e.code === 'Space') {
      if (pauseSelect === 0) gameState = STATE.GAME;
      else if (pauseSelect === 1) { init(); gameState = STATE.GAME; }
      else gameState = STATE.TITLE;
    }
  }

  if (gameState === STATE.GENERATOR) {
    if (e.code === 'Escape') {
      activeGenerator.progress = generatorProgress;
      gameState = STATE.GAME;
      activeGenerator = null;
    }
    if (e.code === 'KeyT') {
      generatorProgress += 8 + Math.random() * 4;
      player.noise += 8;
      Audio.generator();
      screenShake = 2;
      if (generatorProgress >= 100) {
        activeGenerator.fixed = true;
        activeGenerator.progress = 100;
        generatorsFixed++;
        Audio.generatorFixed();
        showText('✓ ' + activeGenerator.name + ' consertado! (' + generatorsFixed + '/' + totalGenerators + ')');
        activeGenerator = null;
        gameState = STATE.GAME;
        checkGeneratorsAndSpawnCar();
      }
    }
  }

  if (gameState === STATE.GAME || gameState === STATE.CHASE) {
    if (e.code === 'Escape') { gameState = STATE.PAUSE; pauseSelect = 0; }

    if (e.code === 'KeyR') {
      if (nearbyClue && !nearbyClue.found) {
        nearbyClue.found = true;
        cluesFound++;
        Audio.clueFound();
        showText('📋 ' + nearbyClue.name + ' encontrado! (' + cluesFound + '/' + totalClues + ')');
        nearbyClue = null;
      }
    }

    // ✅ CORREÇÃO: KeyG funciona nas duas ordens (carro antes ou depois)
    if (e.code === 'KeyG') {
      if (nearbyChild && !nearbyChild.rescued) {
        nearbyChild.rescued = true;
        nearbyChild.following = true;
        childrenFollowing.push(nearbyChild);
        childrenRescued++;
        Audio.childRescue();
        showText('🧒 ' + nearbyChild.name + ' resgatado! (' + childrenRescued + '/' + totalChildren + ')');

        if (childrenRescued >= totalChildren) {
          if (escapeCar.visible) {
            escapeCar.ready = true;
            showText('✓ Todas resgatadas! Vá para o CARRO! [E]');
          } else {
            showText('✓ Todas resgatadas! Agora conserte os 3 geradores!');
          }
        }
        nearbyChild = null;
      }
    }

    if (e.code === 'KeyT') {
      if (nearbyGenerator && !nearbyGenerator.fixed) {
        activeGenerator = nearbyGenerator;
        generatorProgress = nearbyGenerator.progress;
        gameState = STATE.GENERATOR;
        showText('🔧 Consertando ' + nearbyGenerator.name + '...');
      }
    }

    if (e.code === 'KeyE') { handleInteraction(); }

    if (e.code === 'KeyF' && items.flares > 0 && !flareActive) {
      items.flares--;
      flareActive = true;
      flareTimer = 450;
      flareX = player.x;
      flareY = player.y;
      Audio.tone(120, 0.35, 'sawtooth', 0.1);
      const deerDist = Math.hypot(deer.x - player.x, deer.y - player.y);
      const boarDist = Math.hypot(boar.x - player.x, boar.y - player.y);
      if (deerDist < 160) { deer.stunTimer = 300; deer.mode = 'stunned'; screenShake = 12; }
      if (boarDist < 160) { boar.stunTimer = 300; boar.mode = 'stunned'; boar.charging = false; screenShake = 12; }
    }

    if (e.code === 'KeyQ' && items.decoys > 0) {
      items.decoys--;
      decoys.push({ x: player.x, y: player.y, timer: 600, active: true });
      Audio.decoy();
      showText('📢 Isca sonora ativada!');
    }

    if (e.code === 'KeyL') {
      flashlight.on = !flashlight.on;
      Audio.tone(flashlight.on ? 260 : 160, 0.04, 'square', 0.035);
    }

    if (e.code === 'KeyC') {
      player.crouching = !player.crouching;
      PlayerCtrl.maxSpeed = player.crouching ? 1.0 : 2.0;
    }
  }

  if (gameState === STATE.DEATH || gameState === STATE.ENDING) {
    if (e.code === 'Enter' || e.code === 'Space') {
      if (gameState === STATE.ENDING && endingTimer > 550) {
        gameState = STATE.TITLE; titleSelect = 0;
      } else if (gameState === STATE.DEATH) {
        gameState = STATE.TITLE; titleSelect = 0;
      }
    }
  }
});

document.addEventListener('keyup', e => { keys[e.code] = false; });

function handleInteraction() {
  if (player.hiding) {
    player.hiding = false;
    showText('Você saiu do esconderijo');
    return;
  }
  for (const b of buildings) {
    if (!b.canHide) continue;
    const dist = Math.hypot(player.x - (b.x + b.w / 2), player.y - (b.y + b.h / 2));
    if (dist < 55) {
      player.hiding = true;
      player.x = b.x + b.w / 2;
      player.y = b.y + b.h / 2;
      PlayerCtrl.vx = 0;
      PlayerCtrl.vy = 0;
      showText('Escondido em ' + b.name);
      return;
    }
  }
  // ✅ CORREÇÃO: verifica ready antes de iniciar fuga
  if (escapeCar.visible && escapeCar.ready) {
    const dist = Math.hypot(player.x - escapeCar.x, player.y - escapeCar.y);
    if (dist < 55) {
      Audio.carStart();
      gameState = STATE.ENDING;
      endingTimer = 0;
      return;
    }
  }
  if (Math.hypot(player.x - 1200, player.y - 220) < 35 && items.decoys < 3) {
    items.decoys++;
    showText('📢 Isca sonora encontrada! [Q] para usar');
    Audio.collect();
  }
  if (Math.hypot(player.x - 1530, player.y - 580) < 35 && items.decoys < 3) {
    items.decoys++;
    showText('📢 Isca sonora encontrada! [Q] para usar');
    Audio.collect();
  }
}

function showText(txt) {
  currentText = txt;
  textTimer = 320;
}

function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

// ============ DRAW PLAYER ============
function drawPlayer(sx, sy) {
  if (player.hiding) return;
  const a = PlayerCtrl.getAnim();
  let x = Math.floor(sx);
  let y = Math.floor(sy + a.bob);
  if (player.crouching) y += 4;
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.4;
  ctx.beginPath();
  ctx.ellipse(x, y + (player.crouching ? 8 : 12), player.crouching ? 6 : 8, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.globalAlpha = player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0 ? 0.5 : 1;
  const scaleY = player.crouching ? 0.7 : 1;
  drawPixelRect(x - 4, y + 5 * scaleY, 3, 6 * scaleY, '#1a1a2a');
  drawPixelRect(x + 1, y + 5 * scaleY, 3, 6 * scaleY, '#1a1a2a');
  drawPixelRect(x - 4, y + 10 * scaleY, 3, 2, '#2a1a0a');
  drawPixelRect(x + 1, y + 10 * scaleY, 3, 2, '#2a1a0a');
  drawPixelRect(x - 5, y - 6 * scaleY, 10, 12 * scaleY, '#1a3055');
  drawPixelRect(x - 4, y - 5 * scaleY, 8, 10 * scaleY, '#2a4065');
  drawPixelRect(x - 1, y - 4 * scaleY, 2, 7 * scaleY, '#1a3055');
  drawPixelRect(x - 5, y + 4 * scaleY, 10, 2, '#3a2a1a');
  const armOff = a.arm * 0.12;
  drawPixelRect(x - 7, y - 3 * scaleY + armOff, 3, 7 * scaleY, '#2a4065');
  drawPixelRect(x - 7, y + 3 * scaleY + armOff, 3, 2, '#d4a574');
  drawPixelRect(x + 4, y - 3 * scaleY - armOff, 3, 7 * scaleY, '#2a4065');
  drawPixelRect(x + 4, y + 3 * scaleY - armOff, 3, 2, '#d4a574');
  if (childrenFollowing.length > 0) {
    for (let i = 0; i < Math.min(childrenFollowing.length, 3); i++) {
      drawPixelRect(x - 3 + i * 3, y - 10 * scaleY, 2, 2, childrenFollowing[i].color);
    }
  }
  if (flashlight.on) {
    drawPixelRect(x + 6, y + 2 * scaleY - armOff, 5, 3, '#555');
    drawPixelRect(x + 10, y + 2 * scaleY - armOff, 2, 3, '#888');
  }
  const headY = y - 12 * scaleY;
  drawPixelRect(x - 4, headY, 8, 7, '#d4a574');
  drawPixelRect(x - 4, headY - 2, 8, 3, '#2a1a0a');
  drawPixelRect(x - 5, headY, 2, 3, '#2a1a0a');
  drawPixelRect(x + 3, headY, 2, 3, '#2a1a0a');
  drawPixelRect(x - 2, headY + 3, 2, 2, '#1a0a00');
  drawPixelRect(x + 1, headY + 3, 2, 2, '#1a0a00');
  ctx.globalAlpha = 1;
}

// =========================
// CONTINUA NA PARTE 2/3
// =========================
// =========================
// ECO DE METAL II - A CAÇADA
// game.js (PARTE 2/3)
// =========================

// ============ DRAW CHILD ============
function drawChild(child, isFollowing = false) {
  let x, y;
  if (isFollowing) {
    const idx = childrenFollowing.indexOf(child);
    const followDist = 28 + idx * 20;
    const angle = Math.atan2(PlayerCtrl.vy || 0.01, PlayerCtrl.vx || 0.01) + Math.PI;
    x = Math.floor(player.x + Math.cos(angle + (idx - 1) * 0.4) * followDist - camera.x);
    y = Math.floor(player.y + Math.sin(angle + (idx - 1) * 0.4) * followDist - camera.y);
  } else {
    x = Math.floor(child.x - camera.x);
    y = Math.floor(child.y - camera.y);
  }
  if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
  const bob = Math.sin(gameTimer * 0.1 + (child.x || 0) * 0.1) * 1;
  if (!child.rescued && !isFollowing) {
    const pulse = 0.4 + Math.sin(gameTimer * 0.12) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#88ff88';
    ctx.beginPath();
    ctx.arc(x, y + bob, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8 + bob, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPixelRect(x - 3, y - 3 + bob, 6, 8, child.color);
  drawPixelRect(x - 3, y - 8 + bob, 6, 5, '#d4a574');
  const hairColor = child.name === 'Sofia' ? '#442200' : (child.name === 'Ana' ? '#1a0a00' : '#2a1a0a');
  drawPixelRect(x - 3, y - 9 + bob, 6, 2, hairColor);
  if (child.name === 'Sofia') {
    drawPixelRect(x - 4, y - 7 + bob, 2, 3, hairColor);
    drawPixelRect(x + 2, y - 7 + bob, 2, 3, hairColor);
  }
  if (!child.rescued && !isFollowing) {
    drawPixelRect(x - 2, y - 6 + bob, 1, 2, '#000');
    drawPixelRect(x + 1, y - 6 + bob, 1, 2, '#000');
    if (gameTimer % 60 < 30) {
      drawPixelRect(x - 2, y - 4 + bob, 1, 1, '#88aaff');
      drawPixelRect(x + 1, y - 4 + bob, 1, 1, '#88aaff');
    }
  } else {
    drawPixelRect(x - 2, y - 6 + bob, 1, 1, '#000');
    drawPixelRect(x + 1, y - 6 + bob, 1, 1, '#000');
  }
  if (!child.rescued && !isFollowing) {
    drawPixelRect(x - 6, y - 2 + bob, 3, 3, '#d4a574');
    drawPixelRect(x + 3, y - 2 + bob, 3, 3, '#d4a574');
  } else {
    drawPixelRect(x - 5, y - 1 + bob, 2, 4, '#d4a574');
    drawPixelRect(x + 3, y - 1 + bob, 2, 4, '#d4a574');
  }
  drawPixelRect(x - 2, y + 4 + bob, 2, 3, '#333');
  drawPixelRect(x + 1, y + 4 + bob, 2, 3, '#333');
  if (!child.rescued && !isFollowing) {
    const dist = Math.hypot(player.x - child.x, player.y - child.y);
    if (dist < 60) {
      const pulse = 0.8 + Math.sin(gameTimer * 0.18) * 0.2;
      ctx.globalAlpha = pulse;
      TextRenderer.drawBox('[G] RESGATAR ' + child.name.toUpperCase(), x - 60, y - 28, {
        size: 12, color: '#88ff88', bg: 'rgba(0,80,0,0.92)', padding: 7, border: '#44ff44'
      });
      ctx.globalAlpha = 1;
    }
  }
}

// ============ DRAW CLUE ============
function drawClue(c) {
  const x = Math.floor(c.x - camera.x);
  const y = Math.floor(c.y - camera.y);
  if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
  const bob = Math.sin(gameTimer * 0.07 + c.x * 0.1) * 2;
  const glow = 0.4 + Math.sin(gameTimer * 0.09) * 0.2;
  ctx.globalAlpha = glow;
  const glowColor = c.type === 'diary' ? '#8888ff' : (c.type === 'photo' ? '#ffff88' : '#ffaa44');
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(x, y + bob, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (c.type === 'backpack') {
    drawPixelRect(x - 5, y - 6 + bob, 10, 12, '#664422');
    drawPixelRect(x - 4, y - 5 + bob, 8, 10, '#775533');
    drawPixelRect(x - 3, y - 8 + bob, 6, 3, '#553311');
  } else if (c.type === 'toy') {
    drawPixelRect(x - 4, y - 7 + bob, 8, 10, '#ddaa88');
    drawPixelRect(x - 2, y - 4 + bob, 1, 1, '#333');
    drawPixelRect(x + 1, y - 4 + bob, 1, 1, '#333');
  } else if (c.type === 'diary') {
    drawPixelRect(x - 5, y - 4 + bob, 10, 8, '#442244');
    drawPixelRect(x - 3, y - 1 + bob, 6, 1, '#888');
    drawPixelRect(x - 3, y + 1 + bob, 4, 1, '#888');
  } else if (c.type === 'drawing') {
    drawPixelRect(x - 5, y - 4 + bob, 10, 8, '#eee');
    drawPixelRect(x - 2, y - 1 + bob, 4, 3, '#aaf');
  } else if (c.type === 'photo') {
    drawPixelRect(x - 5, y - 4 + bob, 10, 8, '#fff');
    drawPixelRect(x - 3, y - 2 + bob, 2, 3, '#a86');
    drawPixelRect(x, y - 2 + bob, 2, 3, '#a86');
    drawPixelRect(x + 2, y - 2 + bob, 2, 3, '#a86');
  }
  const dist = Math.hypot(player.x - c.x, player.y - c.y);
  if (dist < 55) {
    const pulse = 0.8 + Math.sin(gameTimer * 0.15) * 0.2;
    ctx.globalAlpha = pulse;
    TextRenderer.drawBox('[R] PEGAR ' + c.name.toUpperCase(), x - 55, y - 25, {
      size: 11, color: '#ffdd44', bg: 'rgba(80,60,0,0.92)', padding: 6, border: '#ffaa00'
    });
    ctx.globalAlpha = 1;
  }
}

// ============ DRAW GENERATOR ============
function drawGenerator(g) {
  const x = Math.floor(g.x - camera.x);
  const y = Math.floor(g.y - camera.y);
  if (x < -50 || x > W + 50 || y < -50 || y > H + 50) return;
  drawPixelRect(x - 14, y - 12, 28, 24, g.fixed ? '#2a4a2a' : '#4a3a2a');
  drawPixelRect(x - 12, y - 10, 24, 20, g.fixed ? '#3a5a3a' : '#5a4a3a');
  drawPixelRect(x - 10, y - 8, 8, 8, '#333');
  drawPixelRect(x + 2, y - 8, 8, 8, '#333');
  drawPixelRect(x - 8, y + 4, 16, 4, '#666');
  drawPixelRect(x + 12, y - 18, 4, 8, '#444');
  if (g.fixed && gameTimer % 30 < 15) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 12, y - 22 - (gameTimer % 30) * 0.3, 4, 3);
    ctx.globalAlpha = 1;
  }
  const lightCol = g.fixed ? '#44ff44' : (gameTimer % 40 < 20 ? '#ff4444' : '#aa2222');
  drawPixelRect(x - 4, y - 16, 8, 5, lightCol);
  if (!g.fixed) {
    const pulse = 0.25 + Math.sin(gameTimer * 0.1) * 0.12;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(x, y - 13, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const pulse = 0.15 + Math.sin(gameTimer * 0.08) * 0.08;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#44ff44';
    ctx.beginPath();
    ctx.arc(x, y - 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (!g.fixed) {
    const dist = Math.hypot(player.x - g.x, player.y - g.y);
    if (dist < 55) {
      const pulse = 0.8 + Math.sin(gameTimer * 0.18) * 0.2;
      ctx.globalAlpha = pulse;
      TextRenderer.drawBox('[T] CONSERTAR GERADOR', x - 70, y - 35, {
        size: 12, color: '#ffdd44', bg: 'rgba(80,60,0,0.92)', padding: 7, border: '#ffaa00'
      });
      if (g.progress > 0) {
        drawPixelRect(x - 35, y - 52, 70, 10, '#222');
        drawPixelRect(x - 34, y - 51, g.progress * 0.68, 8, '#44ff44');
        ctx.globalAlpha = 1;
        TextRenderer.draw(Math.floor(g.progress) + '%', x - 10, y - 47, { size: 9, color: '#fff' });
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ============ DRAW ESCAPE CAR ============
function drawEscapeCar() {
  if (!escapeCar.visible) return;
  const x = Math.floor(escapeCar.x - camera.x);
  const y = Math.floor(escapeCar.y - camera.y);
  if (x < -80 || x > W + 80 || y < -60 || y > H + 60) return;
  if (!escapeCar.ready) {
    const pulse = 0.3 + Math.sin(gameTimer * 0.1) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(x, y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const pulse = 0.4 + Math.sin(gameTimer * 0.15) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#44ff44';
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 28, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPixelRect(x - 30, y - 10, 60, 20, '#3a5a3a');
  drawPixelRect(x - 28, y - 8, 56, 16, '#4a6a4a');
  drawPixelRect(x + 8, y - 20, 22, 12, '#3a5a3a');
  drawPixelRect(x + 10, y - 18, 18, 9, '#2a4a3a');
  drawPixelRect(x + 12, y - 17, 14, 7, '#2a3a4a');
  drawPixelRect(x - 28, y - 14, 34, 4, '#2a4a2a');
  drawPixelRect(x - 22, y + 8, 12, 12, '#111');
  drawPixelRect(x + 12, y + 8, 12, 12, '#111');
  drawPixelRect(x - 21, y + 9, 10, 10, '#222');
  drawPixelRect(x + 13, y + 9, 10, 10, '#222');
  if (escapeCar.ready && gameTimer % 35 < 25) {
    drawPixelRect(x + 28, y - 4, 4, 6, '#ffff88');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffff88';
    ctx.beginPath();
    ctx.arc(x + 32, y - 1, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawPixelRect(x - 30, y - 2, 3, 4, '#aa2222');
  if (!escapeCar.ready && gameTimer % 50 < 35) {
    TextRenderer.draw('NOVO!', x - 15, y - 30, { size: 10, color: '#ffaa00', bold: true });
  }
  const dist = Math.hypot(player.x - escapeCar.x, player.y - escapeCar.y);
  if (dist < 60) {
    const pulse = 0.85 + Math.sin(gameTimer * 0.15) * 0.15;
    ctx.globalAlpha = pulse;
    if (escapeCar.ready) {
      TextRenderer.drawBox('[E] FUGIR! 🚗', x - 40, y - 40, {
        size: 14, color: '#88ff88', bg: 'rgba(0,100,0,0.95)', padding: 10, border: '#44ff44'
      });
    } else {
      const needed = totalChildren - childrenRescued;
      TextRenderer.drawBox('Resgate ' + needed + ' criança(s) primeiro!', x - 80, y - 38, {
        size: 11, color: '#ffaaaa', bg: 'rgba(100,30,0,0.9)', padding: 6
      });
    }
    ctx.globalAlpha = 1;
  }
}

// ============ DRAW DEER ============
function drawDeer(sx, sy) {
  let x = Math.floor(sx);
  let y = Math.floor(sy);
  const bob = Math.sin(deer.frame * 0.1) * 1.5;
  if (deer.stunTimer > 0) { x += (Math.random() - 0.5) * 5; y += (Math.random() - 0.5) * 3; }
  y += bob;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const legAnim = Math.sin(deer.frame * 0.12) * (deer.mode === 'chase' ? 4 : 2);
  drawPixelRect(x - 12, y + 3, 4, 18, '#4a3a2a');
  drawPixelRect(x + 8, y + 3, 4, 18, '#4a3a2a');
  drawPixelRect(x - 6, y + 5 + legAnim * 0.4, 3, 16, '#5a4a3a');
  drawPixelRect(x + 3, y + 5 - legAnim * 0.4, 3, 16, '#5a4a3a');
  drawPixelRect(x - 12, y - 4, 24, 12, '#5a3a1a');
  drawPixelRect(x - 10, y - 3, 20, 10, '#6a4a2a');
  if (deer.heatVision) {
    ctx.globalAlpha = 0.25 + Math.sin(gameTimer * 0.15) * 0.1;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(x, y - 10, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawPixelRect(x - 4, y - 10, 8, 7, '#5a3a1a');
  drawPixelRect(x - 8, y - 22, 16, 13, '#5a3a1a');
  drawPixelRect(x - 11, y - 18, 4, 5, '#4a2a0a');
  let eyeCol = deer.eyeColor;
  if (deer.stunTimer > 0) eyeCol = deer.stunTimer % 8 < 4 ? '#fff' : '#ff0';
  if (deer.heatVision) eyeCol = '#ff4400';
  drawPixelRect(x - 6, y - 20, 4, 4, '#1a1a1a');
  drawPixelRect(x + 2, y - 20, 4, 4, '#1a1a1a');
  drawPixelRect(x - 5, y - 19, 3, 3, eyeCol);
  drawPixelRect(x + 3, y - 19, 3, 3, eyeCol);
  const glowI = deer.mode === 'chase' ? 0.5 : 0.25;
  ctx.globalAlpha = glowI + Math.sin(gameTimer * 0.08) * 0.1;
  ctx.fillStyle = eyeCol;
  ctx.beginPath();
  ctx.arc(x - 3.5, y - 17.5, 5, 0, Math.PI * 2);
  ctx.arc(x + 4.5, y - 17.5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawPixelRect(x - 5, y - 27, 2, 6, '#555');
  drawPixelRect(x - 8, y - 30, 2, 5, '#666');
  drawPixelRect(x - 10, y - 32, 2, 3, '#777');
  drawPixelRect(x + 3, y - 27, 2, 6, '#555');
  drawPixelRect(x + 6, y - 30, 2, 5, '#666');
  drawPixelRect(x + 8, y - 32, 2, 3, '#777');
  if (gameTimer % 35 < 18 && deer.stunTimer <= 0) {
    drawPixelRect(x - 10, y - 33, 2, 2, deer.callBoar ? '#ff8800' : '#ff0000');
    drawPixelRect(x + 8, y - 33, 2, 2, deer.callBoar ? '#ff8800' : '#ff0000');
  }
  if (deer.mode === 'chase' && gameTimer % 5 < 2) {
    for (let i = 0; i < 3; i++) {
      drawPixelRect(x + (Math.random() - 0.5) * 22, y + Math.random() * 16, 1, 1, Math.random() > 0.5 ? '#ff4' : '#fa2');
    }
  }
  deer.frame++;
}

// ============ DRAW BOAR ============
function drawBoar(sx, sy) {
  let x = Math.floor(sx);
  let y = Math.floor(sy);
  const bob = Math.sin(boar.frame * 0.08) * 1;
  if (boar.stunTimer > 0) { x += (Math.random() - 0.5) * 6; y += (Math.random() - 0.5) * 4; }
  if (boar.charging) { x += (Math.random() - 0.5) * 3; }
  y += bob;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const legAnim = Math.sin(boar.frame * 0.1) * (boar.charging ? 5 : 2);
  drawPixelRect(x - 16, y + 2, 6, 14, '#3a2a1a');
  drawPixelRect(x + 10, y + 2, 6, 14, '#3a2a1a');
  drawPixelRect(x - 10, y + 4 + legAnim * 0.3, 5, 12, '#4a3a2a');
  drawPixelRect(x + 5, y + 4 - legAnim * 0.3, 5, 12, '#4a3a2a');
  drawPixelRect(x - 16, y + 15, 6, 3, '#222');
  drawPixelRect(x + 10, y + 15, 6, 3, '#222');
  drawPixelRect(x - 18, y - 8, 36, 18, '#3a2a1a');
  drawPixelRect(x - 16, y - 7, 32, 16, '#4a3a2a');
  drawPixelRect(x - 14, y - 6, 8, 6, '#5a4a3a');
  drawPixelRect(x + 6, y - 6, 8, 6, '#5a4a3a');
  drawPixelRect(x - 12, y - 16, 24, 12, '#3a2a1a');
  drawPixelRect(x - 16, y - 12, 6, 8, '#3a2a1a');
  drawPixelRect(x - 14, y - 8, 2, 2, '#222');
  const tuskGlow = boar.charging ? '#ffaa00' : '#888';
  drawPixelRect(x - 18, y - 8, 3, 8, tuskGlow);
  drawPixelRect(x - 16, y - 14, 3, 8, tuskGlow);
  if (boar.charging && gameTimer % 8 < 4) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x - 19, y - 10, 3, 2);
    ctx.globalAlpha = 1;
  }
  let eyeCol = boar.eyeColor;
  if (boar.stunTimer > 0) eyeCol = boar.stunTimer % 8 < 4 ? '#fff' : '#ff0';
  if (boar.charging) eyeCol = '#ff0000';
  drawPixelRect(x - 8, y - 14, 4, 4, '#1a1a1a');
  drawPixelRect(x + 4, y - 14, 4, 4, '#1a1a1a');
  drawPixelRect(x - 7, y - 13, 3, 3, eyeCol);
  drawPixelRect(x + 5, y - 13, 3, 3, eyeCol);
  const glowI = boar.mode === 'chase' || boar.charging ? 0.55 : 0.25;
  ctx.globalAlpha = glowI + Math.sin(gameTimer * 0.07) * 0.1;
  ctx.fillStyle = eyeCol;
  ctx.beginPath();
  ctx.arc(x - 5.5, y - 11.5, 5, 0, Math.PI * 2);
  ctx.arc(x + 6.5, y - 11.5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawPixelRect(x - 10, y - 18, 3, 3, '#4a3a2a');
  drawPixelRect(x + 7, y - 18, 3, 3, '#4a3a2a');
  if (boar.charging) {
    for (let i = 0; i < 4; i++) {
      drawPixelRect(x + (Math.random() - 0.5) * 30, y + Math.random() * 12 - 5, 1, 1, Math.random() > 0.5 ? '#ff4' : '#f80');
    }
  }
  boar.frame++;
}

// ============ DRAW ENVIRONMENT ============
function drawTree(tx, ty, h, type, sway) {
  const x = Math.floor(tx);
  const y = Math.floor(ty);
  const sw = Math.sin(gameTimer * 0.012 + sway) * 1.5;
  drawPixelRect(x - 2, y - h * 0.3, 5, h * 0.4, '#2a1a0a');
  if (type === 0) {
    for (let i = 0; i < 4; i++) {
      const w = 6 + (4 - i) * 4;
      const ly = y - h * 0.3 - i * (h * 0.17);
      const lsw = sw * (i + 1) * 0.3;
      drawPixelRect(x - w / 2 + lsw, ly - h * 0.15, w, h * 0.18, '#0a2a0a');
    }
  } else if (type === 1) {
    drawPixelRect(x - 7 + sw, y - h * 0.6, 7, 2, '#3a2a1a');
    drawPixelRect(x + 3 + sw, y - h * 0.5, 6, 2, '#3a2a1a');
  } else {
    drawPixelRect(x - 9 + sw * 0.5, y - h * 0.8, 18, h * 0.45, '#0a2a0a');
  }
}

function drawBuilding(b) {
  const x = Math.floor(b.x - camera.x);
  const y = Math.floor(b.y - camera.y);
  if (x < -150 || x > W + 150 || y < -150 || y > H + 150) return;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 6, y + b.h, b.w - 4, 6);
  if (b.type === 'cabin') {
    drawPixelRect(x, y, b.w, b.h, '#3a2a1a');
    drawPixelRect(x + 2, y + 2, b.w - 4, b.h - 4, '#4a3a2a');
    for (let i = 0; i < b.h; i += 6) drawPixelRect(x, y + i, b.w, 1, '#3a2a1a');
    for (let i = 0; i < 12; i++) {
      const rw = b.w + 10 - i * 0.9;
      drawPixelRect(x - 5 + i * 0.45, y - 12 + i, rw, 1, i % 2 === 0 ? '#2a1a0a' : '#3a2a1a');
    }
    drawPixelRect(x + b.w / 2 - 6, y + b.h - 22, 12, 22, '#1a0a00');
    drawPixelRect(x + 8, y + 10, 12, 10, '#0a1a2a');
  } else if (b.type === 'workshop') {
    drawPixelRect(x, y, b.w, b.h, '#3a3a3a');
    drawPixelRect(x + 2, y + 2, b.w - 4, b.h - 4, '#4a4a4a');
    for (let i = 0; i < b.h; i += 5) drawPixelRect(x, y + i, b.w, 1, '#333');
    drawPixelRect(x - 4, y - 8, b.w + 8, 10, '#2a2a2a');
    const signFlicker = Math.sin(gameTimer * 0.1) > -0.3 && Math.random() > 0.03;
    if (signFlicker) {
      TextRenderer.draw('FERRO-VELHO', x + 30, y - 12, { size: 12, color: '#ff8844', shadow: false });
      ctx.globalAlpha = 0.25;
      drawPixelRect(x + 22, y - 20, 100, 16, '#ff8844');
      ctx.globalAlpha = 1;
    }
    drawPixelRect(x + 50, y + b.h - 60, 60, 60, '#2a2a2a');
    if (escapeCar.visible) {
      const arrowPulse = 0.6 + Math.sin(gameTimer * 0.15) * 0.3;
      ctx.globalAlpha = arrowPulse;
      TextRenderer.draw('🚗 →', x + b.w + 10, y + 20, { size: 14, color: '#88ff88' });
      ctx.globalAlpha = 1;
    }
  } else if (b.type === 'shed' || b.type === 'warehouse') {
    drawPixelRect(x, y, b.w, b.h, '#3a3a3a');
    drawPixelRect(x + 2, y + 2, b.w - 4, b.h - 4, '#4a4a4a');
    drawPixelRect(x - 3, y - 6, b.w + 6, 8, '#2a2a2a');
    drawPixelRect(x + 12, y + b.h - 32, 28, 32, '#2a2a2a');
  } else if (b.type === 'bunker') {
    drawPixelRect(x, y, b.w, b.h, '#2a2a2a');
    drawPixelRect(x + 2, y + 2, b.w - 4, b.h - 4, '#3a3a3a');
    drawPixelRect(x + b.w / 2 - 18, y + b.h - 45, 36, 45, '#1a3a1a');
    TextRenderer.draw('LABORATÓRIO', x + 18, y - 10, { size: 10, color: '#88aa88' });
  }
  if (b.canHide) {
    const dist = Math.hypot(player.x - (b.x + b.w / 2), player.y - (b.y + b.h / 2));
    if (dist < 60 && !player.hiding) {
      ctx.globalAlpha = 0.75 + Math.sin(gameTimer * 0.08) * 0.2;
      TextRenderer.drawBox('[E] Esconder', x + 8, y - 18, { size: 10, color: '#afa', bg: 'rgba(0,50,0,0.88)', padding: 5 });
      ctx.globalAlpha = 1;
    }
  }
}

function drawDecoy(d) {
  const x = Math.floor(d.x - camera.x);
  const y = Math.floor(d.y - camera.y);
  if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
  drawPixelRect(x - 4, y - 4, 8, 8, '#333');
  drawPixelRect(x, y - 10, 1, 6, '#666');
  if (gameTimer % 15 < 8) drawPixelRect(x - 1, y - 12, 3, 2, '#ff8800');
  const wave = (gameTimer % 30) / 30;
  ctx.globalAlpha = 0.35 * (1 - wave);
  ctx.strokeStyle = '#ff8800';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 12 + wave * 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFlare() {
  if (!flareActive) return;
  const fx = flareX - camera.x;
  const fy = flareY - camera.y;
  ctx.globalAlpha = 0.4;
  drawPixelRect(fx - 10, fy + 6, 20, 5, '#331111');
  ctx.globalAlpha = 1;
  drawPixelRect(fx - 2, fy - 5, 5, 12, '#aa2222');
  drawPixelRect(fx - 1, fy - 4, 3, 10, '#cc3333');
  const time = gameTimer * 0.5;
  for (let i = 0; i < 12; i++) {
    const fw = 6 - (i * 0.45) + Math.sin(time * 1.5 + i) * 1;
    const yOff = -7 - i * 2;
    let col;
    if (i < 2) col = '#ffee88';
    else if (i < 5) col = '#ffaa44';
    else if (i < 9) col = '#ff6622';
    else col = '#aa2211';
    drawPixelRect(fx - fw / 2, fy + yOff, fw, 2, col);
  }
  for (let i = 0; i < 8; i++) {
    const spx = fx + Math.sin(time + i * 2) * 12;
    const spy = fy - 12 - Math.random() * 18;
    drawPixelRect(spx, spy, 1, 1, ['#ff4444', '#ffaa22', '#ffff44'][Math.floor(Math.random() * 3)]);
  }
  ctx.globalAlpha = 0.07 + Math.sin(gameTimer * 0.2) * 0.03;
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function drawRain() {
  ctx.strokeStyle = 'rgba(150, 170, 200, 0.3)';
  ctx.lineWidth = 1;
  for (const r of rain) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - 1.5, r.y + r.len);
    ctx.stroke();
  }
}

function drawFog() {
  for (const f of fog) {
    const fx = f.x - camera.x;
    const fy = f.y - camera.y;
    if (fx < -70 || fx > W + 70 || fy < -70 || fy > H + 70) continue;
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = '#5a6a7a';
    ctx.beginPath();
    ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDarkness() {
  const px = player.x - camera.x;
  const py = player.y - camera.y - 5;
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const oc = off.getContext('2d');
  let darkness = 0.86 - (lightningFlash > 0 ? lightningFlash * 0.02 : 0);
  oc.fillStyle = `rgba(5, 5, 15, ${darkness})`;
  oc.fillRect(0, 0, W, H);
  if (flashlight.on && !player.hiding && flashlight.battery > 0) {
    const flicker = flashlight.battery < 18 ? (Math.random() > 0.22 ? 1 : 0.35) : 1;
    const r = (60 + flashlight.battery * 0.28) * flicker;
    oc.globalCompositeOperation = 'destination-out';
    oc.fillStyle = 'rgba(0,0,0,1)';
    oc.beginPath();
    oc.arc(px, py, r * 0.75, 0, Math.PI * 2);
    oc.fill();
    oc.globalCompositeOperation = 'source-over';
    const grad = oc.createRadialGradient(px, py, 4, px, py, r);
    grad.addColorStop(0, 'rgba(5, 5, 15, 0)');
    grad.addColorStop(0.5, 'rgba(5, 5, 15, 0.15)');
    grad.addColorStop(1, `rgba(5, 5, 15, ${darkness})`);
    oc.fillStyle = grad;
    oc.beginPath();
    oc.arc(px, py, r, 0, Math.PI * 2);
    oc.fill();
  }
  const cutGlow = (ex, ey, er) => {
    oc.globalCompositeOperation = 'destination-out';
    oc.fillStyle = 'rgba(0,0,0,0.5)';
    oc.beginPath();
    oc.arc(ex, ey, er, 0, Math.PI * 2);
    oc.fill();
    oc.globalCompositeOperation = 'source-over';
  };
  if (deer.stunTimer <= 0) cutGlow(deer.x - camera.x, deer.y - camera.y - 17, deer.mode === 'chase' ? 30 : 15);
  if (boar.stunTimer <= 0) cutGlow(boar.x - camera.x, boar.y - camera.y - 11, boar.mode === 'chase' || boar.charging ? 32 : 16);
  if (flareActive) {
    const flx = flareX - camera.x;
    const fly = flareY - camera.y;
    oc.globalCompositeOperation = 'destination-out';
    oc.fillStyle = 'rgba(0,0,0,1)';
    oc.beginPath();
    oc.arc(flx, fly, 100 + Math.sin(gameTimer * 0.22) * 15, 0, Math.PI * 2);
    oc.fill();
    oc.globalCompositeOperation = 'source-over';
  }
  for (const d of decoys) {
    if (!d.active) continue;
    oc.globalCompositeOperation = 'destination-out';
    oc.fillStyle = 'rgba(0,0,0,0.4)';
    oc.beginPath();
    oc.arc(d.x - camera.x, d.y - camera.y, 25, 0, Math.PI * 2);
    oc.fill();
    oc.globalCompositeOperation = 'source-over';
  }
  if (escapeCar.visible) {
    const carX = escapeCar.x - camera.x;
    const carY = escapeCar.y - camera.y;
    oc.globalCompositeOperation = 'destination-out';
    oc.fillStyle = 'rgba(0,0,0,0.6)';
    oc.beginPath();
    oc.arc(carX, carY, 50, 0, Math.PI * 2);
    oc.fill();
    oc.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(off, 0, 0);
}

function drawVHS() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
  if (vhsGlitch > 0) {
    for (let i = 0; i < 2; i++) {
      const gy = Math.random() * H;
      const gh = 2 + Math.random() * 5;
      ctx.drawImage(canvas, 0, gy, W, gh, Math.random() * 12 - 6, gy, W, gh);
    }
    vhsGlitch--;
  }
  if (Math.random() < 0.01) vhsGlitch = Math.floor(Math.random() * 6) + 2;
  ctx.globalAlpha = 0.02;
  ctx.fillStyle = '#f00';
  ctx.fillRect(0, 0, 2, H);
  ctx.fillStyle = '#0ff';
  ctx.fillRect(W - 2, 0, 2, H);
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  if (gameState === STATE.GAME || gameState === STATE.CHASE) {
    if (gameTimer % 85 < 60) {
      ctx.fillStyle = '#c00';
      ctx.beginPath();
      ctx.arc(14, 16, 5, 0, Math.PI * 2);
      ctx.fill();
      TextRenderer.draw('REC', 24, 16, { size: 11, color: '#a00' });
    }
    const mins = Math.floor(gameTimer / 3600);
    const secs = Math.floor((gameTimer / 60) % 60);
    TextRenderer.draw(String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0'), W - 50, 16, { size: 11, color: '#777' });
  }
}

// ============ HUD ============
function drawHUD() {
  const hudY = H - 25;
  drawPixelRect(10, hudY - 10, 95, 32, 'rgba(0,0,0,0.7)');
  TextRenderer.draw('VIDA', 14, hudY - 3, { size: 10, color: '#a44' });
  for (let i = 0; i < player.maxHp; i++) {
    const col = i < player.hp ? '#c33' : '#333';
    drawPixelRect(14 + i * 14, hudY + 6, 12, 10, col);
    if (i < player.hp) drawPixelRect(15 + i * 14, hudY + 7, 10, 8, '#f44');
  }
  if (player.stamina < player.maxStamina) {
    drawPixelRect(68, hudY - 3, 35, 6, '#222');
    drawPixelRect(69, hudY - 2, (player.stamina / player.maxStamina) * 33, 4, player.stamina < 30 ? '#aa4' : '#4a4');
  }
  const itemY = H - 62;
  drawPixelRect(10, itemY - 8, 150, 32, 'rgba(0,0,0,0.7)');
  TextRenderer.draw('🔥 Sinalizadores [F]: ' + items.flares, 14, itemY, { size: 10, color: '#f84' });
  TextRenderer.draw('📢 Iscas [Q]: ' + items.decoys, 14, itemY + 13, { size: 10, color: '#8af' });
  const progY = H - 105;
  drawPixelRect(10, progY - 8, 160, 38, 'rgba(0,0,0,0.7)');
  const clueCol = cluesFound >= totalClues ? '#88ff88' : '#ffdd44';
  TextRenderer.draw('📋 Pistas [R]: ' + cluesFound + '/' + totalClues, 14, progY, { size: 10, color: clueCol });
  const genCol = generatorsFixed >= totalGenerators ? '#88ff88' : '#ffaa44';
  TextRenderer.draw('🔧 Geradores [T]: ' + generatorsFixed + '/' + totalGenerators, 14, progY + 13, { size: 10, color: genCol });
  const childCol = childrenRescued >= totalChildren ? '#88ff88' : '#88aaff';
  TextRenderer.draw('🧒 Crianças [G]: ' + childrenRescued + '/' + totalChildren, 14, progY + 26, { size: 10, color: childCol });
  if (escapeCar.visible) {
    drawPixelRect(W - 120, H - 45, 110, 22, 'rgba(0,80,0,0.8)');
    if (escapeCar.ready) {
      TextRenderer.draw('🚗 CARRO PRONTO!', W - 115, H - 33, { size: 10, color: '#88ff88', bold: true });
    } else {
      TextRenderer.draw('🚗 Resgate crianças', W - 115, H - 33, { size: 9, color: '#aaffaa' });
    }
  }
  const batPct = Math.floor(flashlight.battery);
  const batCol = batPct > 50 ? '#4a4' : (batPct > 25 ? '#aa4' : '#a44');
  drawPixelRect(10, progY - 28, 120, 16, 'rgba(0,0,0,0.7)');
  TextRenderer.draw('💡 Lanterna [L]: ' + batPct + '%', 14, progY - 19, { size: 10, color: batCol });
  if (player.crouching) {
    TextRenderer.draw('AGACHADO [C]', W - 95, H - 15, { size: 9, color: '#8a8' });
  }
  const maxAlert = Math.max(deer.alertLevel, boar.alertLevel);
  if (maxAlert > 0) {
    const alertCol = maxAlert > 70 ? '#f44' : (maxAlert > 35 ? '#fa4' : '#ff4');
    drawPixelRect(W / 2 - 65, 10, 130, 28, 'rgba(0,0,0,0.8)');
    TextRenderer.draw('⚠ ALERTA: ' + Math.floor(maxAlert) + '%', W / 2 - 55, 18, { size: 12, color: alertCol, bold: true });
    drawPixelRect(W / 2 - 52, 28, 104, 6, '#222');
    drawPixelRect(W / 2 - 52, 28, maxAlert * 1.04, 6, alertCol);
  }
  if ((deer.mode === 'chase' || boar.mode === 'chase' || boar.charging) && gameTimer % 35 < 22) {
    TextRenderer.draw('!! CAÇADA !!', W / 2 - 55, 52, { size: 15, color: '#f00', bold: true });
  }
  if (deer.heatVision && gameTimer % 25 < 15) {
    TextRenderer.draw('👁 VISÃO TÉRMICA', W / 2 - 65, 70, { size: 10, color: '#f40' });
  }
  if (textTimer > 0) {
    const alpha = Math.min(1, textTimer / 70);
    ctx.globalAlpha = alpha;
    TextRenderer.drawBox(currentText, W / 2 - currentText.length * 3.8, H / 2 + 95, {
      size: 13, color: '#fff', bg: 'rgba(0,0,0,0.92)', padding: 12
    });
    ctx.globalAlpha = 1;
  }
  if (gameTimer < 800) {
    ctx.globalAlpha = Math.max(0, 1 - gameTimer / 800);
    TextRenderer.draw('[R] Pistas | [G] Crianças | [T] Geradores | [E] Esconder', 25, 32, { size: 9, color: '#666' });
    ctx.globalAlpha = 1;
  }
}

// =========================
// CONTINUA NA PARTE 3/3
// =========================
// =========================
// ECO DE METAL II - A CAÇADA
// game.js (PARTE 3/3)
// =========================

// ============ AI ============
function updateDeer() {
  if (deer.stunTimer > 0) {
    deer.stunTimer--;
    deer.frame++;
    if (deer.stunTimer <= 0) {
      deer.mode = 'patrol';
      deer.eyeColor = '#ffcc00';
      deer.alertLevel = 30;
      deer.heatVision = false;
      deer.callBoar = false;
    }
    return;
  }

  const dx = player.x - deer.x;
  const dy = player.y - deer.y;
  const dist = Math.hypot(dx, dy);

  for (const d of decoys) {
    if (!d.active) continue;
    const ddist = Math.hypot(d.x - deer.x, d.y - deer.y);
    if (ddist < 180 && ddist < dist) {
      deer.x += ((d.x - deer.x) / ddist) * deer.speed * 0.7;
      deer.y += ((d.y - deer.y) / ddist) * deer.speed * 0.7;
      deer.mode = 'distracted';
      deer.frame++;
      return;
    }
  }

  if (flareActive) {
    const fdist = Math.hypot(flareX - deer.x, flareY - deer.y);
    if (fdist < 140) {
      deer.x += ((flareX - deer.x) / fdist) * deer.speed * 0.5;
      deer.y += ((flareY - deer.y) / fdist) * deer.speed * 0.5;
      deer.mode = 'distracted';
      deer.frame++;
      return;
    }
  }

  const canSee = !player.hiding;
  let detectRange = flashlight.on ? 190 : 120;
  let detectRate = flashlight.on ? 2.0 : 1.0;

  if (player.crouching) {
    detectRange *= 0.65;
    detectRate *= 0.6;
  }

  if (deer.alertLevel > 50) {
    deer.heatVision = true;
    detectRange *= 1.4;
  } else {
    deer.heatVision = false;
  }

  detectRate += player.noise * 0.1;

  if (canSee && dist < detectRange) {
    deer.alertLevel = Math.min(100, deer.alertLevel + detectRate);
    deer.lastKnownX = player.x;
    deer.lastKnownY = player.y;
  } else {
    deer.alertLevel = Math.max(0, deer.alertLevel - 0.3);
  }

  if (deer.alertLevel > 75 && !deer.callBoar) {
    deer.callBoar = true;
    boar.respondingToCall = true;
    boar.alertLevel = Math.min(100, boar.alertLevel + 50);
    Audio.alert();
    showText('⚠ O Cervo chamou o Javali!');
  }

  if (deer.alertLevel >= 100 && deer.mode !== 'chase') {
    deer.mode = 'chase';
    deer.eyeColor = '#ff0000';
    deer.speed = 1.25;
    vhsGlitch = 18;
    screenShake = 10;
    Audio.chase();
  }

  if (deer.mode === 'patrol') {
    deer.eyeColor = '#ffcc00';
    deer.speed = 0.45;
    deer.callBoar = false;
    deer.patrolTimer++;
    if (deer.patrolTimer > 200) {
      deer.patrolTimer = 0;
      deer.patrolDir = Math.random() * Math.PI * 2;
    }
    deer.x += Math.cos(deer.patrolDir) * deer.speed;
    deer.y += Math.sin(deer.patrolDir) * deer.speed;
    if (dist > 320) {
      deer.x += (dx / dist) * 0.1;
      deer.y += (dy / dist) * 0.1;
    }
    if (deer.alertLevel > 40) {
      deer.mode = 'alert';
      Audio.alert();
    }
  }

  if (deer.mode === 'alert') {
    deer.eyeColor = '#ffaa00';
    deer.speed = 0.65;
    const tdx = deer.lastKnownX - deer.x;
    const tdy = deer.lastKnownY - deer.y;
    const td = Math.hypot(tdx, tdy);
    if (td > 18) {
      deer.x += (tdx / td) * deer.speed;
      deer.y += (tdy / td) * deer.speed;
    }
    if (deer.alertLevel <= 30) deer.mode = 'patrol';
  }

  if (deer.mode === 'chase') {
    deer.eyeColor = '#ff0000';
    deer.speed = 1.3;
    if (dist > 12) {
      deer.x += (dx / dist) * deer.speed;
      deer.y += (dy / dist) * deer.speed;
    }
    if (dist < 20 && !player.hiding && player.invincible <= 0) {
      player.hp--;
      player.invincible = 110;
      screenShake = 28;
      vhsGlitch = 35;
      Audio.damage();
      if (player.hp <= 0) {
        gameState = STATE.DEATH;
        deathTimer = 0;
      } else {
        player.x -= (dx / dist) * 65;
        player.y -= (dy / dist) * 65;
        deer.mode = 'alert';
        deer.alertLevel = 60;
        showText('💔 O Cervo te atingiu! Vida: ' + player.hp);
      }
    }
    if (player.hiding) {
      deer.alertLevel -= 2;
      if (deer.alertLevel <= 0) {
        deer.mode = 'patrol';
        showText('O Cervo perdeu você de vista...');
      }
    }
    if (dist > 350) {
      deer.alertLevel -= 1.2;
      if (deer.alertLevel <= 0) deer.mode = 'patrol';
    }
  }

  if (deer.mode === 'distracted') {
    let still = false;
    for (const d of decoys) {
      if (d.active && Math.hypot(d.x - deer.x, d.y - deer.y) < 180) { still = true; break; }
    }
    if (!still && !flareActive) {
      deer.mode = 'alert';
      deer.alertLevel = 50;
    }
  }

  deer.x = Math.max(30, Math.min(MAP_W - 30, deer.x));
  deer.y = Math.max(30, Math.min(MAP_H - 30, deer.y));
  deer.frame++;
}

function updateBoar() {
  if (boar.stunTimer > 0) {
    boar.stunTimer--;
    boar.frame++;
    boar.charging = false;
    if (boar.stunTimer <= 0) {
      boar.mode = 'patrol';
      boar.eyeColor = '#ffcc00';
      boar.alertLevel = 25;
      boar.respondingToCall = false;
    }
    return;
  }

  const dx = player.x - boar.x;
  const dy = player.y - boar.y;
  const dist = Math.hypot(dx, dy);

  if (boar.respondingToCall && deer.mode !== 'patrol') {
    const ddx = deer.lastKnownX - boar.x;
    const ddy = deer.lastKnownY - boar.y;
    const dd = Math.hypot(ddx, ddy);
    if (dd > 50) {
      boar.x += (ddx / dd) * boar.speed * 1.2;
      boar.y += (ddy / dd) * boar.speed * 1.2;
    }
    if (dd < 150) {
      boar.respondingToCall = false;
      boar.alertLevel = Math.min(100, boar.alertLevel + 30);
    }
  }

  for (const d of decoys) {
    if (!d.active) continue;
    const ddist = Math.hypot(d.x - boar.x, d.y - boar.y);
    if (ddist < 200 && ddist < dist) {
      boar.x += ((d.x - boar.x) / ddist) * boar.speed * 0.6;
      boar.y += ((d.y - boar.y) / ddist) * boar.speed * 0.6;
      boar.mode = 'distracted';
      boar.charging = false;
      boar.frame++;
      return;
    }
  }

  if (flareActive) {
    const fdist = Math.hypot(flareX - boar.x, flareY - boar.y);
    if (fdist < 160) {
      boar.x += ((flareX - boar.x) / fdist) * boar.speed * 0.5;
      boar.y += ((flareY - boar.y) / fdist) * boar.speed * 0.5;
      boar.mode = 'distracted';
      boar.charging = false;
      boar.frame++;
      return;
    }
  }

  if (boar.charging) {
    boar.chargeTimer--;
    boar.x += Math.cos(boar.chargeDir) * 3.5;
    boar.y += Math.sin(boar.chargeDir) * 3.5;
    if (dist < 25 && !player.hiding && player.invincible <= 0) {
      player.hp -= 2;
      player.invincible = 150;
      screenShake = 35;
      vhsGlitch = 45;
      Audio.boarCharge();
      if (player.hp <= 0) {
        gameState = STATE.DEATH;
        deathTimer = 0;
      } else {
        player.x -= Math.cos(boar.chargeDir) * 80;
        player.y -= Math.sin(boar.chargeDir) * 80;
        boar.charging = false;
        boar.mode = 'patrol';
        boar.alertLevel = 40;
        showText('💥 O Javali te atingiu! Vida: ' + player.hp);
      }
    }
    if (boar.chargeTimer <= 0) {
      boar.charging = false;
      boar.mode = 'alert';
      boar.alertLevel = 50;
    }
    for (const t of trees) {
      if (Math.hypot(boar.x - t.x, boar.y - t.y) < 15) {
        boar.charging = false;
        boar.stunTimer = 80;
        boar.mode = 'stunned';
        screenShake = 12;
        showText('💫 O Javali bateu em uma árvore!');
        break;
      }
    }
    boar.frame++;
    return;
  }

  const canSee = !player.hiding;
  let detectRange = 130;
  let detectRate = 0.8;
  if (player.crouching) {
    detectRange *= 0.6;
    detectRate *= 0.5;
  }
  detectRate += player.noise * 0.2;
  if (canSee && dist < detectRange) {
    boar.alertLevel = Math.min(100, boar.alertLevel + detectRate);
  } else {
    boar.alertLevel = Math.max(0, boar.alertLevel - 0.25);
  }

  if (boar.alertLevel >= 100 && boar.mode !== 'chase') {
    boar.mode = 'chase';
    boar.eyeColor = '#ff0000';
    boar.speed = 1.0;
    vhsGlitch = 15;
    Audio.alert();
  }

  if (boar.mode === 'patrol') {
    boar.eyeColor = '#ffcc00';
    boar.speed = 0.35;
    boar.patrolTimer++;
    if (boar.patrolTimer > 250) {
      boar.patrolTimer = 0;
      boar.patrolDir = Math.random() * Math.PI * 2;
    }
    boar.x += Math.cos(boar.patrolDir) * boar.speed;
    boar.y += Math.sin(boar.patrolDir) * boar.speed;
    if (boar.alertLevel > 35) boar.mode = 'alert';
  }

  if (boar.mode === 'alert') {
    boar.eyeColor = '#ffaa00';
    boar.speed = 0.55;
    if (dist < 200 && dist > 60) {
      boar.x += (dx / dist) * boar.speed;
      boar.y += (dy / dist) * boar.speed;
    }
    if (boar.alertLevel <= 25) boar.mode = 'patrol';
  }

  if (boar.mode === 'chase') {
    boar.eyeColor = '#ff0000';
    boar.speed = 1.1;
    if (dist < 120 && dist > 40 && !boar.charging && canSee) {
      boar.charging = true;
      boar.chargeDir = Math.atan2(dy, dx);
      boar.chargeTimer = 60;
      Audio.boarCharge();
      showText('🐗 O Javali está investindo!');
    }
    if (dist > 15 && !boar.charging) {
      boar.x += (dx / dist) * boar.speed;
      boar.y += (dy / dist) * boar.speed;
    }
    if (player.hiding) {
      boar.alertLevel -= 1.5;
      if (boar.alertLevel <= 0) boar.mode = 'patrol';
    }
    if (dist > 380) {
      boar.alertLevel -= 1;
      if (boar.alertLevel <= 0) boar.mode = 'patrol';
    }
  }

  if (boar.mode === 'distracted') {
    let still = false;
    for (const d of decoys) {
      if (d.active && Math.hypot(d.x - boar.x, d.y - boar.y) < 200) { still = true; break; }
    }
    if (!still && !flareActive) {
      boar.mode = 'alert';
      boar.alertLevel = 40;
    }
  }

  boar.x = Math.max(40, Math.min(MAP_W - 40, boar.x));
  boar.y = Math.max(40, Math.min(MAP_H - 40, boar.y));
  boar.frame++;
}

// ============ UPDATE ============
function updateGame() {
  gameTimer++;
  player.noise = Math.max(0, player.noise - 0.5);

  nearbyClue = null;
  for (const c of clues) {
    if (c.found) continue;
    if (Math.hypot(player.x - c.x, player.y - c.y) < 50) { nearbyClue = c; break; }
  }

  nearbyChild = null;
  for (const child of children) {
    if (child.rescued) continue;
    if (Math.hypot(player.x - child.x, player.y - child.y) < 55) { nearbyChild = child; break; }
  }

  nearbyGenerator = null;
  for (const g of generators) {
    if (g.fixed) continue;
    if (Math.hypot(player.x - g.x, player.y - g.y) < 50) { nearbyGenerator = g; break; }
  }

  if (!player.hiding) {
    const moveResult = PlayerCtrl.update(player, keys, childrenFollowing.length > 0);
    if (moveResult.moving) {
      footstepTimer++;
      const interval = moveResult.sprint ? 9 : (player.crouching ? 25 : 16);
      if (footstepTimer > interval) {
        footstepTimer = 0;
        Audio.footstep();
        player.noise += moveResult.sprint ? 8 : (player.crouching ? 1 : 3);
      }
    }

    player.x = Math.max(12, Math.min(MAP_W - 12, player.x));
    player.y = Math.max(12, Math.min(MAP_H - 12, player.y));

    for (const t of trees) {
      const td = Math.hypot(player.x - t.x, player.y - t.y);
      if (td < 8) {
        player.x += (player.x - t.x) / td * 3;
        player.y += (player.y - t.y) / td * 3;
        PlayerCtrl.vx *= 0.5;
        PlayerCtrl.vy *= 0.5;
      }
    }

    for (const b of buildings) {
      if (player.x > b.x && player.x < b.x + b.w && player.y > b.y && player.y < b.y + b.h) {
        const doorX = b.x + b.w / 2;
        const doorY = b.y + b.h;
        if (!(Math.abs(player.x - doorX) < 14 && Math.abs(player.y - doorY) < 16)) {
          player.x += (player.x - (b.x + b.w / 2)) * 0.15;
          player.y += (player.y - (b.y + b.h / 2)) * 0.15;
          PlayerCtrl.vx *= 0.3;
          PlayerCtrl.vy *= 0.3;
        }
      }
    }

    for (let i = 0; i < childrenFollowing.length; i++) {
      const child = childrenFollowing[i];
      const followDist = 30 + i * 22;
      const angle = Math.atan2(PlayerCtrl.vy || 0.01, PlayerCtrl.vx || 0.01) + Math.PI;
      const targetX = player.x + Math.cos(angle + (i - 1) * 0.4) * followDist;
      const targetY = player.y + Math.sin(angle + (i - 1) * 0.4) * followDist;
      child.x += (targetX - child.x) * 0.08;
      child.y += (targetY - child.y) * 0.08;
    }
  }

  if (player.invincible > 0) player.invincible--;

  if (flashlight.on) {
    flashlight.battery -= 0.011;
    if (flashlight.battery <= 0) {
      flashlight.battery = 0;
      flashlight.on = false;
      showText('💡 Bateria esgotada!');
    }
  } else {
    flashlight.battery = Math.min(100, flashlight.battery + 0.003);
  }

  if (flareActive) {
    flareTimer--;
    if (flareTimer <= 0) flareActive = false;
  }

  for (const d of decoys) {
    if (d.active) { d.timer--; if (d.timer <= 0) d.active = false; }
  }

  camera.x += (player.x - W / 2 - camera.x) * 0.075;
  camera.y += (player.y - H / 2 - camera.y) * 0.075;
  camera.x = Math.max(0, Math.min(MAP_W - W, camera.x));
  camera.y = Math.max(0, Math.min(MAP_H - H, camera.y));

  if (screenShake > 0) {
    camera.x += (Math.random() - 0.5) * screenShake;
    camera.y += (Math.random() - 0.5) * screenShake;
    screenShake *= 0.86;
    if (screenShake < 0.4) screenShake = 0;
  }

  for (const r of rain) {
    r.y += r.speed;
    r.x -= 0.7;
    if (r.y > H) { r.y = -r.len; r.x = Math.random() * W; }
    if (r.x < 0) r.x = W;
  }

  for (const f of fog) {
    f.x += f.dx;
    if (f.x < -70) f.x = MAP_W + 70;
    if (f.x > MAP_W + 70) f.x = -70;
  }

  lightningTimer++;
  if (lightningTimer > 700 + Math.random() * 1000) {
    lightningFlash = 22;
    lightningTimer = 0;
  }
  if (lightningFlash > 0) lightningFlash -= 0.8;
  if (textTimer > 0) textTimer--;

  const minDist = Math.min(
    Math.hypot(player.x - deer.x, player.y - deer.y),
    Math.hypot(player.x - boar.x, player.y - boar.y)
  );
  const hbInterval = Math.max(18, 75 - (220 - Math.min(220, minDist)) * 0.3);
  heartbeatTimer++;
  if (heartbeatTimer > hbInterval && minDist < 220) {
    heartbeatTimer = 0;
    Audio.heartbeat();
  }

  updateDeer();
  updateBoar();

  if (deer.mode === 'chase' || boar.mode === 'chase' || boar.charging) {
    if (gameState === STATE.GAME) gameState = STATE.CHASE;
  } else {
    if (gameState === STATE.CHASE) gameState = STATE.GAME;
  }
}

// ============ RENDER ============
function renderGame() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#030308');
  skyGrad.addColorStop(1, '#080812');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 43 + gameTimer * 0.007) % W;
    const sy = (i * 31) % (H * 0.35);
    ctx.globalAlpha = 0.3 + Math.sin(gameTimer * 0.035 + i) * 0.2;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#080c08';
  ctx.fillRect(0, -camera.y, W, MAP_H);

  const entities = [];
  for (const t of trees) entities.push({ type: 'tree', y: t.y, data: t });
  for (const b of buildings) entities.push({ type: 'building', y: b.y + b.h, data: b });
  for (const c of clues) { if (!c.found) entities.push({ type: 'clue', y: c.y, data: c }); }
  for (const g of generators) entities.push({ type: 'generator', y: g.y, data: g });
  for (const d of decoys) { if (d.active) entities.push({ type: 'decoy', y: d.y, data: d }); }
  for (const child of children) {
    if (!child.rescued) entities.push({ type: 'child', y: child.y + 5, data: child, following: false });
  }
  for (const child of childrenFollowing) {
    entities.push({ type: 'childFollowing', y: child.y + 5, data: child, following: true });
  }
  if (escapeCar.visible) entities.push({ type: 'car', y: escapeCar.y + 18, data: escapeCar });
  if (!player.hiding) entities.push({ type: 'player', y: player.y + 12, data: player });
  entities.push({ type: 'deer', y: deer.y + 22, data: deer });
  entities.push({ type: 'boar', y: boar.y + 18, data: boar });
  entities.sort((a, b) => a.y - b.y);

  drawFog();

  for (const e of entities) {
    const sx = e.data.x - camera.x;
    const sy = e.data.y - camera.y;
    if (sx < -100 || sx > W + 100 || sy < -120 || sy > H + 60) {
      if (e.type !== 'deer' && e.type !== 'boar' && e.type !== 'player') continue;
    }
    switch (e.type) {
      case 'tree': drawTree(sx, sy, e.data.h, e.data.type, e.data.sway); break;
      case 'building': drawBuilding(e.data); break;
      case 'clue': drawClue(e.data); break;
      case 'generator': drawGenerator(e.data); break;
      case 'decoy': drawDecoy(e.data); break;
      case 'child': drawChild(e.data, false); break;
      case 'childFollowing': drawChild(e.data, true); break;
      case 'car': drawEscapeCar(); break;
      case 'player': drawPlayer(sx, sy); break;
      case 'deer': drawDeer(sx, sy); break;
      case 'boar': drawBoar(sx, sy); break;
    }
  }

  if (player.hiding) {
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    drawPixelRect(px - 3, py - 1, 2, 2, '#fff');
    drawPixelRect(px + 1, py - 1, 2, 2, '#fff');
    TextRenderer.drawBox('[E] Sair', px - 18, py - 15, { size: 10, color: '#afa', bg: 'rgba(0,40,0,0.88)', padding: 4 });
  }

  drawFlare();
  drawDarkness();
  drawRain();

  if (lightningFlash > 12) {
    ctx.globalAlpha = (lightningFlash - 12) / 10 * 0.35;
    ctx.fillStyle = '#ccf';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (player.hp <= 1) {
    const pulse = Math.sin(gameTimer * 0.065) * 0.5 + 0.5;
    ctx.globalAlpha = 0.06 + pulse * 0.05;
    ctx.fillStyle = '#f00';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  drawHUD();
  drawVHS();
}

// ============ SCREENS ============
function renderTitle() {
  ctx.fillStyle = '#020305';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 35; i++) {
    const tx = i * 13 + Math.sin(gameTimer * 0.005 + i * 0.5) * 3;
    const ty = 105 + Math.sin(i * 1.8) * 28;
    const th = 50 + Math.sin(i * 2.5) * 18;
    ctx.fillStyle = '#040804';
    ctx.fillRect(tx, ty, 4, th);
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = '#030703';
      ctx.fillRect(tx - (13 - j * 4) / 2 + 2, ty - j * 15, 13 - j * 4, 13);
    }
  }
  const eyePulse = 0.55 + Math.sin(gameTimer * 0.05) * 0.35;
  ctx.globalAlpha = eyePulse;
  drawPixelRect(180 + Math.sin(gameTimer * 0.015) * 5, 100 + Math.cos(gameTimer * 0.01) * 3, 4, 4, '#ff0000');
  drawPixelRect(194 + Math.sin(gameTimer * 0.015) * 5, 100 + Math.cos(gameTimer * 0.01) * 3, 4, 4, '#ff0000');
  ctx.globalAlpha = eyePulse * 0.9;
  drawPixelRect(280 + Math.sin(gameTimer * 0.012) * 4, 115 + Math.cos(gameTimer * 0.008) * 4, 5, 5, '#ff4400');
  drawPixelRect(298 + Math.sin(gameTimer * 0.012) * 4, 115 + Math.cos(gameTimer * 0.008) * 4, 5, 5, '#ff4400');
  ctx.globalAlpha = 1;
  TextRenderer.draw('ECO DE METAL II', W / 2 - 105, 50, { size: 22, color: '#667766' });
  TextRenderer.draw('A CAÇADA', W / 2 - 55, 75, { size: 16, color: '#aa3333', bold: true });
  const menuItems = ['🎮 INICIAR JOGO', '📋 CRÉDITOS'];
  for (let i = 0; i < menuItems.length; i++) {
    const selected = i === titleSelect;
    const y = 170 + i * 32;
    if (selected) {
      drawPixelRect(W / 2 - 85, y - 14, 170, 28, 'rgba(100, 40, 40, 0.4)');
      TextRenderer.draw('> ' + menuItems[i] + ' <', W / 2 - 75, y, { size: 14, color: '#fff', bold: true });
    } else {
      TextRenderer.draw(menuItems[i], W / 2 - 55, y, { size: 13, color: '#555' });
    }
  }
  TextRenderer.draw('[R] Pistas | [G] Crianças | [T] Geradores', W / 2 - 125, H - 50, { size: 9, color: '#555' });
  TextRenderer.draw('Conserte TODOS os geradores para liberar o CARRO de fuga!', W / 2 - 165, H - 35, { size: 9, color: '#886644' });
  TextRenderer.draw('Setas: Navegar | ENTER: Selecionar', W / 2 - 100, H - 18, { size: 10, color: '#444' });
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
  gameTimer++;
}

function renderIntro() {
  ctx.fillStyle = '#020204';
  ctx.fillRect(0, 0, W, H);
  const texts = [
    ['Três meses após a fuga...', 'Elias recebe notícias perturbadoras.', 'Três crianças desapareceram na floresta.'],
    ['O Cervo evoluiu. Usa visão térmica.', 'O Javali foi ativado para a caça.', 'Juntos, são implacáveis.'],
    ['Pressione [R] para coletar PISTAS.', 'Pressione [G] para RESGATAR crianças.', 'Pressione [T] para CONSERTAR geradores.'],
    ['Conserte TODOS os 3 geradores...', '...para liberar o CARRO DE FUGA!', 'Ele aparecerá FORA do Ferro-Velho.'],
    ['Encontre as crianças. Salve-as.', 'Escape da floresta para sempre.', '[ENTER para começar]']
  ];
  if (introStep < texts.length) {
    introTimer++;
    const step = texts[introStep];
    for (let i = 0; i < step.length; i++) {
      const lineDelay = i * 28;
      const chars = Math.min(step[i].length, Math.floor((introTimer - lineDelay) / 2.2));
      if (chars > 0) {
        const isTitle = i === 0;
        TextRenderer.draw(step[i].substring(0, chars), 50, 95 + i * 32, {
          size: isTitle ? 14 : 12,
          color: isTitle ? '#aa6633' : '#888'
        });
      }
    }
    if (introTimer > 90 && gameTimer % 65 < 45) {
      TextRenderer.draw('[ENTER] Continuar | [ESC] Pular', W / 2 - 100, H - 30, { size: 10, color: '#444' });
    }
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
  gameTimer++;
}

function renderPause() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(0, 0, W, H);
  drawPixelRect(W / 2 - 85, H / 2 - 75, 170, 150, '#0a0a0a');
  drawPixelRect(W / 2 - 83, H / 2 - 73, 166, 146, '#151515');
  TextRenderer.draw('⏸ PAUSADO', W / 2 - 50, H / 2 - 52, { size: 16, color: '#a63', bold: true });
  const itemsMenu = ['▶ Continuar', '🔄 Reiniciar', '🏠 Menu Principal'];
  for (let i = 0; i < itemsMenu.length; i++) {
    const sel = i === pauseSelect;
    TextRenderer.draw((sel ? '> ' : '  ') + itemsMenu[i], W / 2 - 65, H / 2 - 12 + i * 30, {
      size: 13, color: sel ? '#fff' : '#666'
    });
  }
  gameTimer++;
}

function renderGenerator() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(0, 0, W, H);
  drawPixelRect(W / 2 - 130, H / 2 - 90, 260, 180, '#1a1a1a');
  drawPixelRect(W / 2 - 128, H / 2 - 88, 256, 176, '#252525');
  TextRenderer.draw('🔧 CONSERTANDO GERADOR', W / 2 - 100, H / 2 - 65, { size: 15, color: '#fa4', bold: true });
  const pulseT = 0.75 + Math.sin(gameTimer * 0.22) * 0.25;
  ctx.globalAlpha = pulseT;
  drawPixelRect(W / 2 - 30, H / 2 - 40, 60, 50, '#335533');
  drawPixelRect(W / 2 - 28, H / 2 - 38, 56, 46, '#446644');
  TextRenderer.draw('T', W / 2 - 12, H / 2 - 12, { size: 36, color: '#88ff88', bold: true });
  ctx.globalAlpha = 1;
  TextRenderer.draw('Pressione [T] repetidamente!', W / 2 - 95, H / 2 + 22, { size: 12, color: '#aaa' });
  TextRenderer.draw('⚠ CUIDADO: Faz muito barulho!', W / 2 - 95, H / 2 + 40, { size: 11, color: '#f66' });
  drawPixelRect(W / 2 - 100, H / 2 + 58, 200, 24, '#222');
  drawPixelRect(W / 2 - 98, H / 2 + 60, generatorProgress * 1.96, 20, generatorProgress < 50 ? '#aaaa44' : '#44ff44');
  TextRenderer.draw(Math.floor(generatorProgress) + '%', W / 2 - 15, H / 2 + 70, { size: 14, color: '#fff', bold: true });
  TextRenderer.draw('[ESC] Cancelar', W / 2 - 42, H / 2 + 95, { size: 10, color: '#666' });
  if (gameTimer % 8 < 4) {
    for (let i = 0; i < 4; i++) {
      drawPixelRect(W / 2 - 30 + Math.random() * 60, H / 2 - 40 + Math.random() * 50, 2, 2, Math.random() > 0.5 ? '#ff4' : '#fa2');
    }
  }
  gameTimer++;
}

function renderDeath() {
  deathTimer++;
  const r = Math.min(20, deathTimer / 7);
  ctx.fillStyle = `rgb(${r}, 0, 0)`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgb(${Math.floor(Math.random() * 40)}, 0, 0)`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  ctx.globalAlpha = 1;
  if (deathTimer > 30 && deathTimer < 200) {
    const scale = 1 + (deathTimer - 30) / 35;
    const eyeY = H / 2 - 35 - (deathTimer - 30) * 0.12;
    const eyeGlow = Math.min(1, (deathTimer - 30) / 40);
    ctx.globalAlpha = eyeGlow;
    const es1 = 3 * scale;
    drawPixelRect(W / 2 - 50 - 10 * scale / 2 - es1, eyeY, es1, es1, '#f00');
    drawPixelRect(W / 2 - 50 + 10 * scale / 2, eyeY, es1, es1, '#f00');
    const es2 = 4 * scale;
    drawPixelRect(W / 2 + 30 - 14 * scale / 2 - es2, eyeY + 10, es2, es2, '#f40');
    drawPixelRect(W / 2 + 30 + 14 * scale / 2, eyeY + 10, es2, es2, '#f40');
    ctx.globalAlpha = 1;
  }
  if (deathTimer > 110) TextRenderer.draw('💀 A CAÇADA TERMINOU', W / 2 - 115, H / 2 + 20, { size: 20, color: '#c00', bold: true });
  if (deathTimer > 180) TextRenderer.draw('As crianças permanecem perdidas na floresta...', W / 2 - 145, H / 2 + 55, { size: 12, color: '#533' });
  if (deathTimer > 280 && gameTimer % 55 < 38) TextRenderer.draw('[ENTER] Tentar novamente', W / 2 - 95, H / 2 + 95, { size: 12, color: '#555' });
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
  gameTimer++;
}

function renderEnding() {
  endingTimer++;
  const brightness = Math.min(38, endingTimer / 4);
  ctx.fillStyle = `rgb(${brightness}, ${brightness + 14}, ${brightness + 30})`;
  ctx.fillRect(0, 0, W, H);
  if (endingTimer > 35) {
    ctx.globalAlpha = Math.min(0.4, (endingTimer - 35) / 70);
    for (let i = 0; i < 15; i++) {
      const ly = H - 55 - i * 15;
      const lw = 30 - i * 2;
      ctx.fillStyle = '#888';
      ctx.fillRect(W / 2 - lw / 2, ly, lw, 5);
    }
    ctx.globalAlpha = 1;
  }
  if (endingTimer > 60) {
    ctx.globalAlpha = Math.min(0.55, (endingTimer - 60) / 60);
    const grad = ctx.createRadialGradient(W / 2, H / 2 + 55, 15, W / 2, H / 2, 160);
    grad.addColorStop(0, '#ffff88');
    grad.addColorStop(1, 'rgba(255,255,136,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (endingTimer > 120) {
    ctx.globalAlpha = Math.min(0.7, (endingTimer - 120) / 50);
    for (let i = 0; i < 3; i++) {
      const cx = W / 2 - 25 + i * 18;
      drawPixelRect(cx, H / 2 + 25, 10, 14, children[i].color);
      drawPixelRect(cx + 2, H / 2 + 18, 6, 7, '#d4a574');
    }
    ctx.globalAlpha = 1;
  }
  if (endingTimer > 220 && endingTimer < 650) {
    const fadeIn = Math.min(1, (endingTimer - 220) / 50);
    const fadeOut = endingTimer > 550 ? 1 - (endingTimer - 550) / 100 : 1;
    ctx.globalAlpha = fadeIn * fadeOut * 0.5;
    drawPixelRect(W / 2 - 38, 48, 4, 3, '#f00');
    drawPixelRect(W / 2 - 25, 48, 4, 3, '#f00');
    drawPixelRect(W / 2 + 18, 54, 5, 4, '#f40');
    drawPixelRect(W / 2 + 35, 54, 5, 4, '#f40');
    ctx.globalAlpha = 1;
  }
  if (endingTimer > 130) TextRenderer.draw('🎉 AS CRIANÇAS ESTÃO SALVAS!', W / 2 - 140, H / 2 - 55, { size: 18, color: '#aaddaa', bold: true });
  if (endingTimer > 220) TextRenderer.draw('Miguel, Sofia e Ana estão a salvo.', W / 2 - 120, H / 2 - 22, { size: 13, color: '#688' });
  if (endingTimer > 300) {
    TextRenderer.draw('O motor do caminhão ruge...', W / 2 - 100, H / 2 + 5, { size: 12, color: '#565' });
    TextRenderer.draw('...enquanto deixam a floresta para sempre.', W / 2 - 145, H / 2 + 25, { size: 12, color: '#565' });
  }
  if (endingTimer > 400) {
    TextRenderer.draw('No retrovisor, olhos vermelhos observam...', W / 2 - 145, H / 2 + 55, { size: 11, color: '#545' });
    TextRenderer.draw('Mas não fazem nenhum movimento.', W / 2 - 115, H / 2 + 75, { size: 11, color: '#545' });
  }
  if (endingTimer > 500) TextRenderer.draw('A floresta agora pertence às máquinas.', W / 2 - 135, H / 2 + 105, { size: 13, color: '#a55', bold: true });
  if (endingTimer > 600 && gameTimer % 65 < 48) TextRenderer.draw('[ENTER] Menu Principal', W / 2 - 85, H / 2 + 140, { size: 13, color: '#494' });
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
  gameTimer++;
}

// ============ MAIN LOOP ============
function gameLoop() {
  switch (gameState) {
    case STATE.TITLE: renderTitle(); break;
    case STATE.INTRO: renderIntro(); break;
    case STATE.GAME:
    case STATE.CHASE:
      updateGame();
      renderGame();
      break;
    case STATE.PAUSE: renderPause(); break;
    case STATE.GENERATOR: renderGenerator(); break;
    case STATE.DEATH: renderDeath(); break;
    case STATE.ENDING: renderEnding(); break;
  }
  requestAnimationFrame(gameLoop);
}

Audio.init();
gameLoop();