// ============================================================
//  CAEA: PROTOCOLO DE SOBRECARGA
// ============================================================
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const W = 420, H = 320;
canvas.width = W; canvas.height = H;

function resize() {
  const s = Math.min(innerWidth/W, innerHeight/H) * 0.95;
  canvas.style.width  = W*s + 'px';
  canvas.style.height = H*s + 'px';
}
resize(); addEventListener('resize', resize);

/* ───── TEXT ───── */
const T = {
  draw(t, x, y, o = {}) {
    const { size=12, color='#fff', shadow=true, bold=false } = o;
    ctx.font = `${bold?'bold ':''}${size}px "Courier New",monospace`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (shadow) { ctx.fillStyle='rgba(0,0,0,.9)'; ctx.fillText(t,x+1,y+1); }
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  },
  box(t, x, y, o = {}) {
    const { size=12, color='#fff', bg='rgba(0,0,0,.9)', padding=6, border=null } = o;
    ctx.font = `${size}px "Courier New",monospace`;
    const w = ctx.measureText(t).width + padding*2, h = size + padding*2;
    ctx.fillStyle = bg; ctx.fillRect(x-padding, y-h/2, w, h);
    if (border) { ctx.strokeStyle=border; ctx.lineWidth=2; ctx.strokeRect(x-padding,y-h/2,w,h); }
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  },
  mid(t, y, o = {}) {
    const { size=12 } = o;
    ctx.font = `${size}px "Courier New",monospace`;
    this.draw(t, W/2 - ctx.measureText(t).width/2, y, o);
  }
};

/* ───── AUDIO ───── */
const A = {
  c: null,
  init() { try { this.c = new(AudioContext||webkitAudioContext)(); } catch(e){} },
  u()    { if (this.c?.state==='suspended') this.c.resume(); },
  t(f,d,tp='square',v=.08) {
    if (!this.c) return;
    try {
      const o=this.c.createOscillator(), g=this.c.createGain();
      o.type=tp; o.frequency.value=f; g.gain.value=v;
      g.gain.exponentialRampToValueAtTime(.001, this.c.currentTime+d);
      o.connect(g); g.connect(this.c.destination); o.start(); o.stop(this.c.currentTime+d);
    } catch(e){}
  },
  step()    { this.t(55+Math.random()*20,.04,'square',.018); },
  collect() { this.t(523,.07,'square',.06); setTimeout(()=>this.t(659,.07,'square',.06),60); setTimeout(()=>this.t(784,.09,'square',.06),120); },
  alert()   { this.t(220,.1,'sawtooth',.07); setTimeout(()=>this.t(330,.1,'sawtooth',.07),70); },
  chase()   { for(let i=0;i<4;i++) setTimeout(()=>this.t(300+i*70,.09,'sawtooth',.06),i*55); },
  dmg()     { this.t(80,.2,'sawtooth',.1); },
  hack()    { this.t(440,.1,'square',.07); setTimeout(()=>this.t(550,.1,'square',.07),90); setTimeout(()=>this.t(660,.12,'square',.08),180); },
  door()    { this.t(200,.3,'sine',.07); setTimeout(()=>this.t(260,.2,'sine',.07),200); },
  rescue()  { this.t(392,.1,'square',.07); setTimeout(()=>this.t(494,.1,'square',.07),90); setTimeout(()=>this.t(587,.12,'square',.08),180); setTimeout(()=>this.t(784,.2,'square',.1),270); },
  genFixed(){ this.t(440,.12,'square',.08); setTimeout(()=>this.t(550,.12,'square',.08),90); setTimeout(()=>this.t(660,.15,'square',.1),180); },
  walkie()  { this.t(800,.04,'square',.03); },
  hb()      { this.t(50,.08,'sine',.04); setTimeout(()=>this.t(40,.12,'sine',.03),90); },
  static_() {
    if (!this.c) return;
    try {
      const b=this.c.createBuffer(1,this.c.sampleRate*.1,this.c.sampleRate);
      const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const s=this.c.createBufferSource(), g=this.c.createGain();
      g.gain.value=.04; s.buffer=b; s.connect(g); g.connect(this.c.destination); s.start();
    } catch(e){}
  }
};

/* ───── PHYSICS ───── */
const PC = {
  vx:0, vy:0, wk:0, dir:0, mv:false,
  spd:1.8, accel:.2, decel:.14,
  update(p, k) {
    let ix=0, iy=0;
    if(k['ArrowLeft']||k['KeyA']) ix--;
    if(k['ArrowRight']||k['KeyD']) ix++;
    if(k['ArrowUp']||k['KeyW'])   iy--;
    if(k['ArrowDown']||k['KeyS']) iy++;
    if(ix&&iy){ix*=.707;iy*=.707;}
    const spr=(k['ShiftLeft']||k['ShiftRight'])&&p.stamina>0;
    let sp=this.spd*(spr?1.65:1); if(p.crouching) sp*=.55;
    if(spr&&(ix||iy)) p.stamina=Math.max(0,p.stamina-.38);
    else               p.stamina=Math.min(100,p.stamina+.12);
    if(ix||iy){
      this.vx+=(ix*sp-this.vx)*this.accel; this.vy+=(iy*sp-this.vy)*this.accel;
      this.mv=true;
      const a=Math.atan2(this.vy,this.vx);
      if(a>-Math.PI/4&&a<=Math.PI/4)      this.dir=0;
      else if(a>Math.PI/4&&a<=3*Math.PI/4) this.dir=1;
      else if(a>-3*Math.PI/4&&a<=-Math.PI/4) this.dir=3;
      else this.dir=2;
    } else {
      this.vx*=(1-this.decel); this.vy*=(1-this.decel);
      if(Math.abs(this.vx)<.04) this.vx=0; if(Math.abs(this.vy)<.04) this.vy=0;
      this.mv=Math.abs(this.vx)>.08||Math.abs(this.vy)>.08;
    }
    if(this.mv) this.wk+=.12*Math.sqrt(this.vx*this.vx+this.vy*this.vy);
    else         this.wk*=.85;
    p.x+=this.vx; p.y+=this.vy;
    return {spr, mv:this.mv};
  },
  anim(){ return {bob:Math.sin(this.wk)*(this.mv?1.2:0), arm:Math.sin(this.wk*2)*(this.mv?5:0)}; },
  reset(){ this.vx=0;this.vy=0;this.wk=0;this.dir=0;this.mv=false; }
};

/* ───── STATES ───── */
const ST = {TITLE:0,INTRO:1,GAME:2,PAUSE:3,DEATH:4,WIN:5,PUZZLE:6,DIALOGUE:7,FINAL:8};

/* ───── MAP ───── */
// 40px tiles, 50 cols x 35 rows = 2000x1400
const TILE = 40;
const COLS = 50, ROWS = 35;
const MW = COLS*TILE, MH = ROWS*TILE;

// Tile types
const TL = {
  FLOOR:0, WALL:1, DESK:2, LOCKER:3, TABLE:4,
  BOOKSHELF:5, COMPUTER:6, BENCH:7, DOOR_OPEN:8,
  DOOR_CLOSED:9, GEN:10, WINDOW:11
};

/* ───── GLOBALS ───── */
let gs=ST.TITLE, gt=0, shake=0, glitch=0, lFlash=0, lTmr=0;
let txtTmr=0, curTxt='';
let dlgQ=[], curDlg=null;
let titleSel=0, pauseSel=0;
let deathTmr=0, finalTmr=0;
let pzActive=null, pzProg=0, pzKey='';
let keys={};
let cam={x:0,y:0};
let particles=[];
let flicker=0;

let player, partner;
let enemies=[], generators=[], prisoners=[], items=[];
let sparks=[];

let genFixed=0;
let friendsRescued=0;
let passwordParts=[];
let finalSequence=false;

let partnerAction='follow';
let partnerBubble='', partnerBubbleTmr=0;
let partnerBusy=false, partnerBusyTmr=0;

/* ───────────────────────────────────────────────────────────
   TILE MAP  (50 cols × 35 rows)
   Legend:
   0 = floor   1 = wall    2 = desk    3 = locker
   4 = table   5 = bookshelf  6 = computer  7 = bench
   8 = window  9 = door
─────────────────────────────────────────────────────────── */
let tileMap = [];

function buildTileMap() {
  // Fill everything with floor first
  tileMap = [];
  for (let r=0;r<ROWS;r++) {
    tileMap.push([]);
    for (let c=0;c<COLS;c++) tileMap[r].push(TL.FLOOR);
  }

  // ── outer boundary ──
  for (let c=0;c<COLS;c++) { tileMap[0][c]=TL.WALL; tileMap[ROWS-1][c]=TL.WALL; }
  for (let r=0;r<ROWS;r++) { tileMap[r][0]=TL.WALL; tileMap[r][COLS-1]=TL.WALL; }

  // ── CORRIDOR (rows 15-17, full width) ──
  // just floor – kept open

  // ── ROOM 1: Saguão / Lobby  (rows 1-14, cols 1-9) ──
  wallRect(1,1,9,14);
  // windows left wall
  for (let r=3;r<12;r+=3) tileMap[r][1]=TL.WINDOW;
  // lockers
  for (let r=2;r<6;r++) tileMap[r][8]=TL.LOCKER;
  // benches
  tileMap[10][3]=TL.BENCH; tileMap[10][5]=TL.BENCH; tileMap[10][7]=TL.BENCH;
  // door to corridor
  tileMap[14][4]=TL.DOOR_OPEN; tileMap[14][6]=TL.DOOR_OPEN;

  // ── ROOM 2: Refeitório  (rows 1-14, cols 11-24) ──
  wallRect(1,11,24,14);
  // windows top
  for (let c=13;c<23;c+=3) tileMap[1][c]=TL.WINDOW;
  // dining tables (4 rows of 3 tables)
  for (let row=0;row<2;row++)
    for (let col=0;col<3;col++) {
      const tr=3+row*5, tc=13+col*4;
      tileMap[tr][tc]=TL.TABLE; tileMap[tr][tc+1]=TL.TABLE;
      tileMap[tr+1][tc]=TL.BENCH; tileMap[tr+1][tc+1]=TL.BENCH;
      tileMap[tr+2][tc]=TL.BENCH; tileMap[tr+2][tc+1]=TL.BENCH;
    }
  // door
  tileMap[14][15]=TL.DOOR_OPEN; tileMap[14][17]=TL.DOOR_OPEN; tileMap[14][19]=TL.DOOR_OPEN;

  // ── ROOM 3: Biblioteca  (rows 1-14, cols 26-38) ──
  wallRect(1,26,38,14);
  for (let c=28;c<37;c+=3) tileMap[1][c]=TL.WINDOW;
  // bookshelves
  for (let row=0;row<4;row++)
    for (let c=28;c<38;c++) tileMap[3+row*3][c]=TL.BOOKSHELF;
  // reading desks
  for (let c=28;c<37;c+=3) tileMap[13][c]=TL.DESK;
  tileMap[14][30]=TL.DOOR_OPEN; tileMap[14][33]=TL.DOOR_OPEN;

  // ── ROOM 4: Sala de TI  (rows 1-14, cols 40-48) ──
  wallRect(1,40,48,14);
  for (let c=42;c<48;c+=2) tileMap[1][c]=TL.WINDOW;
  // computers in rows
  for (let row=0;row<3;row++)
    for (let c=41;c<48;c+=2) {
      tileMap[3+row*4][c]=TL.DESK;
      tileMap[3+row*4][c+1]=TL.COMPUTER;
    }
  tileMap[14][43]=TL.DOOR_OPEN; tileMap[14][46]=TL.DOOR_OPEN;

  // ── CORRIDOR ── rows 15-17 fully open (already floor)

  // ── ROOM 5: Laboratório  (rows 18-30, cols 1-16) ──
  wallRect(18,1,16,30);
  for (let c=3;c<15;c+=3) tileMap[18][c]=TL.WINDOW;
  // lab benches with desks
  for (let row=0;row<3;row++)
    for (let c=3;c<15;c+=6) {
      tileMap[20+row*4][c]=TL.DESK; tileMap[20+row*4][c+1]=TL.DESK;
      tileMap[20+row*4][c+2]=TL.DESK; tileMap[20+row*4][c+3]=TL.DESK;
    }
  // gas canisters (just desks for now)
  tileMap[17][5]=TL.DOOR_OPEN; tileMap[17][10]=TL.DOOR_OPEN;

  // ── ROOM 6: Quadra de Esportes  (rows 18-33, cols 18-38) ──
  wallRect(18,18,38,33);
  for (let c=20;c<37;c+=4) tileMap[18][c]=TL.WINDOW;
  // court lines (just floor, decorations drawn in render)
  // bleachers
  for (let c=19;c<37;c++) tileMap[32][c]=TL.BENCH;
  for (let c=19;c<37;c++) tileMap[33][c]=TL.BENCH;
  tileMap[17][22]=TL.DOOR_OPEN; tileMap[17][28]=TL.DOOR_OPEN; tileMap[17][34]=TL.DOOR_OPEN;

  // ── ROOM 7: Sala de Aula Geral  (rows 18-30, cols 40-48) ──
  wallRect(18,40,48,30);
  for (let c=41;c<48;c+=2) tileMap[18][c]=TL.WINDOW;
  for (let row=0;row<4;row++)
    for (let c=41;c<48;c+=2) tileMap[20+row*3][c]=TL.DESK;
  tileMap[17][43]=TL.DOOR_OPEN; tileMap[17][46]=TL.DOOR_OPEN;

  // ── EXIT  (rows 15-17, cols 1-9) ──
  // special floor, marked programmatically
}

function wallRect(r1,c1,c2,r2){
  for(let r=r1;r<=r2;r++){
    for(let c=c1;c<=c2;c++){
      if(r===r1||r===r2||c===c1||c===c2) tileMap[r][c]=TL.WALL;
    }
  }
}

/* ───── ROOM DEFS ───── */
const ROOMS = [
  {id:'lobby',     name:'Saguão',              r1:1,c1:1, r2:14,c2:9,  color:'#1a1a2a'},
  {id:'refectory', name:'Refeitório',           r1:1,c1:11,r2:14,c2:24, color:'#1a1200'},
  {id:'library',   name:'Biblioteca',           r1:1,c1:26,r2:14,c2:38, color:'#12001a'},
  {id:'it',        name:'Sala de TI',           r1:1,c1:40,r2:14,c2:48, color:'#000a1a'},
  {id:'corridor',  name:'Corredor Principal',   r1:15,c1:1,r2:17,c2:48, color:'#111118'},
  {id:'lab',       name:'Laboratório',          r1:18,c1:1, r2:30,c2:16,color:'#001a10'},
  {id:'gym',       name:'Quadra de Esportes',   r1:18,c1:18,r2:33,c2:38,color:'#0a1a00'},
  {id:'classroom', name:'Sala de Aula',         r1:18,c1:40,r2:30,c2:48,color:'#100a00'},
  {id:'exit',      name:'Saída Principal',      r1:15,c1:1, r2:17,c2:9, color:'#001a00'},
];

function getRoomAt(wx,wy){
  const c=Math.floor(wx/TILE), r=Math.floor(wy/TILE);
  for(const rm of ROOMS){
    if(r>=rm.r1&&r<=rm.r2&&c>=rm.c1&&c<=rm.c2) return rm;
  }
  return null;
}

/* ───── INIT ───── */
function init(){
  player = {x:160,y:640,hp:4,maxHp:4,stamina:100,inv:0,noise:0,hiding:false,crouching:false};
  partner = {x:200,y:640};

  partnerAction='follow'; partnerBubble=''; partnerBusy=false;
  genFixed=0; friendsRescued=0; passwordParts=[];
  finalSequence=false;
  enemies=[]; generators=[]; prisoners=[]; items=[]; sparks=[]; particles=[];
  cam={x:0,y:0}; shake=0; glitch=0; gt=0; pzActive=null; pzProg=0;
  PC.reset();

  buildTileMap();
  placeObjects();

  startDlg([
    {sp:'SISTEMA',  txt:'PROTOCOLO DE SOBRECARGA INICIADO. SAÍDA BLOQUEADA.', cl:'#ff4444'},
    {sp:'Enzo',     txt:'Murilo! As portas trancaram — nossos amigos estão presos!', cl:'#4488ff'},
    {sp:'Murilo',   txt:'Ouço barulho de metal no refeitório. Moraes está lá!', cl:'#44aa44'},
    {sp:'SISTEMA',  txt:'[E] Interagir | [H] Murilo ajuda | [R] Coletar | [C] Agachar', cl:'#aaffaa'},
  ]);
}

function placeObjects(){
  // Generators (world coords = col*TILE+half, row*TILE+half)
  generators = [
    {x:5*TILE+20, y:16*TILE+20, fixed:false, prog:0, name:'Gerador A — Corredor'},
    {x:20*TILE+20,y:10*TILE+20, fixed:false, prog:0, name:'Gerador B — Refeitório'},
    {x:27*TILE+20,y:26*TILE+20, fixed:false, prog:0, name:'Gerador C — Quadra'},
    {x:44*TILE+20,y:10*TILE+20, fixed:false, prog:0, name:'Gerador D — Sala de TI'},
  ];

  // Prisoners
  prisoners = [
    {x:17*TILE+20,y: 8*TILE+20, rescued:false, follow:false,
     name:'Moraes',   shirt:'#cc2222', pants:'#111111', skin:'#d4a574',
     hair:'#2a1a0a',  puzzle:'camera',   hint:'Refeitório — Javali patrulha!'},
    {x:27*TILE+20,y:25*TILE+20, rescued:false, follow:false,
     name:'Rafa',     shirt:'#eeeeee', pants:'#226622', skin:'#d4a574',
     hair:'#2a1a0a',  puzzle:'climb',    hint:'Quadra — alto da tabela!'},
    {x: 9*TILE+20,y:24*TILE+20, rescued:false, follow:false,
     name:'Zahara',   shirt:'#ddcc00', pants:'#111111', skin:'#d4a574',
     hair:'#442200',  puzzle:'chemicals', hint:'Laboratório — gás vazando!'},
    {x:34*TILE+20,y: 7*TILE+20, rescued:false, follow:false,
     name:'Taylline', shirt:'#ffffff', pants:'#ffffff', skin:'#4a2a1a',
     hair:'#1a0a00',  puzzle:'stealth',  hint:'Biblioteca — Cervo vigia!'},
    {x:44*TILE+20,y: 7*TILE+20, rescued:false, follow:false,
     name:'Bia',      shirt:'#111111', pants:'#111111', skin:'#d4a574',
     hair:'#0a0000',  puzzle:'circuit',  hint:'Sala de TI — cabos elétricos!'},
  ];

  // Enemies
  enemies = [
    {x:18*TILE+20,y: 6*TILE+20, type:'boar', frame:0, speed:.42, mode:'patrol',
     eyeColor:'#ffcc00', stun:0, alert:0, pDir:0, pTmr:0, lkX:0, lkY:0,
     charging:false, chargeDir:0, chargeTmr:0},
    {x:32*TILE+20,y: 8*TILE+20, type:'deer', frame:0, speed:.38, mode:'patrol',
     eyeColor:'#ffcc00', stun:0, alert:0, pDir:1, pTmr:0, lkX:0, lkY:0, heat:false},
    {x:25*TILE+20,y:24*TILE+20, type:'wolf', frame:0, speed:.48, mode:'patrol',
     eyeColor:'#44aaff', stun:0, alert:0, pDir:.5,pTmr:0},
    {x:30*TILE+20,y:26*TILE+20, type:'wolf', frame:0, speed:.48, mode:'patrol',
     eyeColor:'#44aaff', stun:0, alert:0, pDir:2, pTmr:0},
  ];

  // Collectibles
  items = [
    {x: 4*TILE+20,y:16*TILE+20, type:'battery', name:'Pilha',       col:false},
    {x:13*TILE+20,y:12*TILE+20, type:'flare',   name:'Sinalizador', col:false},
    {x:42*TILE+20,y:16*TILE+20, type:'battery', name:'Pilha',       col:false},
    {x: 7*TILE+20,y:22*TILE+20, type:'flare',   name:'Sinalizador', col:false},
  ];

  // Electric sparks in IT room
  for(let i=0;i<6;i++){
    sparks.push({
      x: (41+Math.random()*6)*TILE, y: (4+Math.random()*9)*TILE,
      active:true, timer:Math.random()*60, interval:20+Math.random()*40
    });
  }
}

/* ───── DIALOGUE ───── */
function startDlg(lines){ dlgQ=[...lines]; advDlg(); if(gs!==ST.PUZZLE) gs=ST.DIALOGUE; }
function advDlg(){ if(dlgQ.length){ curDlg=dlgQ.shift(); A.walkie(); } else { curDlg=null; if(gs===ST.DIALOGUE) gs=ST.GAME; } }
function showTxt(t){ curTxt=t; txtTmr=320; }
function partnerSay(t){ partnerBubble=t; partnerBubbleTmr=180; }

/* ───── INPUT ───── */
document.addEventListener('keydown', e=>{
  keys[e.code]=true; A.u();

  if(gs===ST.TITLE){
    if(e.code==='ArrowUp'||e.code==='KeyW')   titleSel=Math.max(0,titleSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS') titleSel=Math.min(1,titleSel+1);
    if(e.code==='Enter'||e.code==='Space'){ if(titleSel===0){gs=ST.INTRO;} A.t(280,.08,'square',.05); }
  }
  if(gs===ST.INTRO){
    if(e.code==='Enter'||e.code==='Space'||e.code==='Escape'){gs=ST.GAME;init();}
  }
  if(gs===ST.DIALOGUE){
    if(e.code==='Enter'||e.code==='Space'||e.code==='KeyE') advDlg();
  }
  if(gs===ST.PAUSE){
    if(e.code==='Escape') gs=ST.GAME;
    if(e.code==='ArrowUp'||e.code==='KeyW')   pauseSel=Math.max(0,pauseSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS') pauseSel=Math.min(2,pauseSel+1);
    if(e.code==='Enter'||e.code==='Space'){
      if(pauseSel===0) gs=ST.GAME;
      else if(pauseSel===1){ init(); gs=ST.GAME; }
      else gs=ST.TITLE;
    }
  }
  if(gs===ST.PUZZLE){
    if(e.code==='Escape'){ if(pzActive) pzActive.prog=pzProg; pzActive=null; gs=ST.GAME; }
    if(e.code==='KeyE'||e.code==='Space'){
      pzProg+=7+Math.random()*5; player.noise+=4; A.hack(); shake=1;
      if(pzProg>=100) completePuzzle();
    }
    if(pzKey==='chemicals'){
      if(e.code==='ArrowLeft'||e.code==='ArrowRight'){ pzProg+=18; if(pzProg>=100) completePuzzle(); }
    }
  }
  if(gs===ST.GAME){
    if(e.code==='Escape'){ gs=ST.PAUSE; pauseSel=0; }
    if(e.code==='KeyR') doCollect();
    if(e.code==='KeyE') doInteract();
    if(e.code==='KeyH') doPartnerHelp();
    if(e.code==='KeyC'){ player.crouching=!player.crouching; showTxt(player.crouching?'Agachado':'Em pé'); }
    if(e.code==='Space') doHide();
  }
  if(gs===ST.DEATH&&e.code==='Enter'){ gs=ST.TITLE; titleSel=0; }
  if(gs===ST.FINAL&&finalTmr>600&&e.code==='Enter'){ gs=ST.TITLE; titleSel=0; }
});
document.addEventListener('keyup', e=>{ keys[e.code]=false; });

/* ───── ACTIONS ───── */
function doCollect(){
  for(const it of items){
    if(it.col) continue;
    if(Math.hypot(player.x-it.x,player.y-it.y)<40){
      it.col=true; A.collect();
      showTxt((it.type==='battery'?'🔋':'🔥')+' '+it.name+' coletado!');
      spawnPart(it.x-cam.x,it.y-cam.y,'#ffdd44',5);
      return;
    }
  }
}

function doHide(){
  if(player.hiding){ player.hiding=false; return; }
  player.hiding=true; PC.vx=0; PC.vy=0; showTxt('Escondido!');
}

function doInteract(){
  if(player.hiding){ player.hiding=false; showTxt('Você saiu do esconderijo'); return; }

  // Generators
  for(const g of generators){
    if(g.fixed) continue;
    if(Math.hypot(player.x-g.x,player.y-g.y)<50){
      pzActive=g; pzProg=g.prog; pzKey='generator'; gs=ST.PUZZLE;
      showTxt('🔧 '+g.name+' — pressione [E]!'); return;
    }
  }

  // Prisoners
  for(const p of prisoners){
    if(p.rescued) continue;
    if(Math.hypot(player.x-p.x,player.y-p.y)<55){
      startRescuePuzzle(p); return;
    }
  }

  // Final exit
  if(genFixed>=4&&friendsRescued>=5){
    const ex=4*TILE, ey=16*TILE;
    if(Math.hypot(player.x-ex,player.y-ey)<70){
      gs=ST.FINAL; finalTmr=0; A.genFixed(); return;
    }
  }
}

function doPartnerHelp(){
  if(partnerBusy){ showTxt('⏳ Murilo está ocupado...'); return; }

  // Find nearest enemy
  let ne=null, nd=200;
  for(const e of enemies){ const d=Math.hypot(e.x-player.x,e.y-player.y); if(d<nd){nd=d;ne=e;} }

  if(ne&&nd<190){
    partnerBusy=true; partnerBusyTmr=280; partnerAction='distract';
    partnerSay('HEY! Por aqui!'); A.t(350,.08,'sine',.06);
    ne.lkX=partner.x+(Math.random()-.5)*120; ne.lkY=partner.y+(Math.random()-.5)*80;
    ne.mode='alert'; ne.alert=Math.min(75,ne.alert+30);
    showTxt('🏃 Murilo distraiu o inimigo!'); return;
  }

  // Hack nearest generator
  for(const g of generators){
    if(g.fixed) continue;
    if(Math.hypot(player.x-g.x,player.y-g.y)<65){
      partnerBusy=true; partnerBusyTmr=200; partnerAction='hack';
      g.prog+=28; A.hack(); partnerSay('Consertando!');
      if(g.prog>=100){ g.fixed=true; genFixed++; A.genFixed(); showTxt('✓ Enzo consertou '+g.name+'!'); }
      else showTxt('🔧 Enzo trabalhando: '+Math.floor(g.prog)+'%');
      return;
    }
  }

  showTxt('❌ Nada para Murilo fazer aqui.');
}

function startRescuePuzzle(p){
  const dlgs = {
    camera:[
      {sp:'Moraes',   txt:'Enzo! Hackeie o painel das câmeras! O Javali vai me pegar!', cl:'#cc2222'},
      {sp:'Murilo',   txt:'Eu atraio o Javali! Me chamar com [H] primeiro!',            cl:'#44aa44'},
    ],
    climb:[
      {sp:'Rafa',     txt:'Estou em cima da tabela! Murilo, você consegue subir?',       cl:'#888888'},
      {sp:'Murilo',   txt:'Vou escalar! Mas precisa ser silencioso...',                  cl:'#44aa44'},
    ],
    chemicals:[
      {sp:'Zahara',   txt:'O gás está por todo lado! Misturem os químicos! ← e →!',     cl:'#ddcc00'},
      {sp:'Enzo',     txt:'Entendido! Deixa comigo!',                                    cl:'#4488ff'},
    ],
    stealth:[
      {sp:'Taylline', txt:'Shh... o Cervo está aqui. Enzo, desative os sensores.',       cl:'#eeeeee'},
      {sp:'Enzo',     txt:'Furtividade total. [E] para hackear cada sensor.',             cl:'#4488ff'},
    ],
    circuit:[
      {sp:'Bia',      txt:'Desliguem o disjuntor! Os cabos estão vivos!',                cl:'#888888'},
      {sp:'Enzo',     txt:'Vou lá! [E] rapidamente antes do tempo acabar!',              cl:'#4488ff'},
    ],
  };
  const lines = dlgs[p.puzzle]||[];
  startDlg([
    ...lines,
    {sp:'PUZZLE', txt:'[E] para resolver o puzzle e resgatar '+p.name+'!', cl:'#aaffaa',
     _prisoner:p}
  ]);
}

function completePuzzle(){
  if(!pzActive) return;

  if(pzActive.fixed!==undefined){                // generator
    pzActive.fixed=true; pzActive.prog=100; genFixed++;
    A.genFixed(); showTxt('✓ '+pzActive.name+' consertado! ('+genFixed+'/4)');
    spawnPart(pzActive.x-cam.x,pzActive.y-cam.y,'#44ff44',8);
    if(genFixed===4) showTxt('⚡ TODOS OS GERADORES ATIVOS!');
  } else {                                       // prisoner
    const p=pzActive;
    p.rescued=true; p.follow=true; friendsRescued++;
    passwordParts.push(p.name.substring(0,2).toUpperCase());
    A.rescue(); showTxt('🧍 '+p.name+' resgatado! ('+friendsRescued+'/5)');
    spawnPart(p.x-cam.x,p.y-cam.y,'#ff88cc',10);
    startDlg([{sp:p.name,txt:'Obrigado! Minha parte da senha: '+passwordParts[passwordParts.length-1],cl:'#ffdd88'}]);
    if(friendsRescued===5){
      startDlg([
        {sp:'Bia',    txt:'Senha completa! '+passwordParts.join('-')+' — digitando!', cl:'#888888'},
        {sp:'SISTEMA',txt:'SOBRECARGA DETECTADA. BLOQUEIO TOTAL EM BREVE.',           cl:'#ff4444'},
        {sp:'Moraes', txt:'As máquinas estão vindo! VÃO PARA A SAÍDA AGORA!',         cl:'#cc2222'},
      ]);
    }
  }
  pzActive=null; gs=ST.GAME;
}

/* ───── PARTICLES ───── */
function spawnPart(x,y,c,n){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=.5+Math.random()*2;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:40+Math.random()*25,ml:65,color:c,sz:2+Math.random()*3});
  }
}

/* ═══════════════════════════════════════════════════════════
   DRAWING  — one unified character renderer
═══════════════════════════════════════════════════════════ */
function dr(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.floor(x),Math.floor(y),w,h); }

/*
 * drawCharacter — renders a full-sized character sprite
 * sx, sy     : screen position (camera-relative)
 * skin, shirt, pants, hair  : colour strings
 * bob, armSwing : animation offsets
 * label      : string shown above head
 * labelColor : colour of label
 * alpha      : transparency (default 1)
 * crouching  : boolean
 */
function drawCharacter(sx,sy,{skin='#d4a574',shirt='#333',pants='#222',hair='#2a1a0a',
                               bob=0,armSwing=0,label='',labelColor='#fff',alpha=1,crouching=false}={}){
  if(alpha<=0) return;
  const x=Math.floor(sx), y=Math.floor(sy+bob);
  const sc=crouching?.7:1;
  ctx.globalAlpha=alpha;

  // shadow
  ctx.globalAlpha=alpha*.35;
  ctx.beginPath(); ctx.ellipse(x,y+13,8,3,0,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
  ctx.globalAlpha=alpha;

  const arm=armSwing*.12;

  // ── legs ──
  dr(x-4, y+5*sc, 4, 7*sc, pants);
  dr(x+1,  y+5*sc, 4, 7*sc, pants);
  dr(x-4, y+11*sc, 4, 2,   '#2a1a0a');   // shoes L
  dr(x+1,  y+11*sc, 4, 2,   '#2a1a0a');  // shoes R

  // ── body ──
  dr(x-6, y-7*sc, 12, 13*sc, shirt);
  // collar / detail
  dr(x-2, y-6*sc, 4, 2*sc, '#00000033');
  // belt
  dr(x-6, y+5*sc, 12, 2, '#3a2a1a');

  // ── left arm ──
  ctx.save(); ctx.translate(x-6, y-4*sc);
  ctx.rotate(-arm);
  dr(0,0, 3, 8*sc, shirt);
  dr(0, 8*sc, 3, 2, skin);           // hand
  ctx.restore();

  // ── right arm ──
  ctx.save(); ctx.translate(x+3, y-4*sc);
  ctx.rotate(arm);
  dr(0,0, 3, 8*sc, shirt);
  dr(0, 8*sc, 3, 2, skin);
  ctx.restore();

  // ── head ──
  const hY = y-14*sc;
  dr(x-4, hY,    8, 9, skin);
  dr(x-4, hY-3,  8, 4, hair);       // hair top
  dr(x-6, hY,    2, 4, hair);       // hair side L
  dr(x+4, hY,    2, 4, hair);       // hair side R
  // eyes
  dr(x-3, hY+4,  2, 2, '#1a0a00');
  dr(x+1, hY+4,  2, 2, '#1a0a00');
  // mouth
  dr(x-1, hY+7,  3, 1, '#c49a64');

  // ── label ──
  if(label){
    ctx.globalAlpha=alpha*.55;
    T.draw(label, x-Math.floor(label.length*3.5), y-22*sc, {size:7,color:labelColor});
    ctx.globalAlpha=alpha;
  }

  ctx.globalAlpha=1;
}

/* ── convenience wrappers ── */
function drawPlayer(sx,sy){
  if(player.hiding) return;
  const a=PC.anim();
  let al=1; if(player.inv>0&&Math.floor(player.inv/5)%2===0) al=.5;
  drawCharacter(sx,sy,{
    skin:'#d4a574',shirt:'#2244aa',pants:'#eeeedd',hair:'#3a3a1a',
    bob:a.bob, armSwing:a.arm, label:'ENZO', labelColor:'#4488ff',
    alpha:al, crouching:player.crouching
  });
  // scanner in right hand
  const a2=PC.anim();
  dr(sx+5,sy-2+a2.bob,-6,3,'#4488ff');
}

function drawPartnerSprite(){
  const px=partner.x-cam.x, py=partner.y-cam.y;
  if(px<-30||px>W+30||py<-30||py>H+30) return;
  const bob=Math.sin(gt*.08+1)*(PC.mv?1:0);
  const arm=Math.sin(gt*.16+1)*(PC.mv?5:0);
  let al=1; if(partnerBusy&&partnerAction==='hack'&&Math.floor(gt/6)%2===0) al=.7;

  drawCharacter(px,py,{
    skin:'#8b5e3c',shirt:'#225522',pants:'#224488',hair:'#1a0a00',
    bob, armSwing:arm, label:'MURILO', labelColor:'#44aa44', alpha:al
  });

  // flashlight in right hand
  dr(px+5,py-2+bob, 5,3,'#444'); dr(px+9,py-2+bob, 2,3,'#888');

  if(partnerBusy){T.draw(partnerAction==='hack'?'💻':'🏃',px-5,py-26,{size:10,color:'#fff'});}
  if(partnerBubbleTmr>0){
    ctx.globalAlpha=Math.min(1,partnerBubbleTmr/30);
    T.box(partnerBubble,px-28,py-38,{size:9,color:'#fff',bg:'rgba(0,30,60,.9)',padding:4,border:'#44aa44'});
    ctx.globalAlpha=1;
  }
}

function drawPrisonerSprite(p){
  const x=p.x-cam.x, y=p.y-cam.y;
  if(x<-40||x>W+40||y<-40||y>H+40) return;

  // rescue glow
  const pulse=.28+Math.sin(gt*.1)*.18;
  ctx.globalAlpha=pulse;
  ctx.fillStyle='#ffaa44';
  ctx.beginPath(); ctx.arc(x,y,22,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  drawCharacter(x,y,{
    skin:p.skin||'#d4a574', shirt:p.shirt, pants:p.pants, hair:p.hair||'#2a1a0a',
    label:p.name, labelColor:'#ffdd44'
  });

  const dist=Math.hypot(player.x-p.x,player.y-p.y);
  if(dist<60){
    ctx.globalAlpha=.85+Math.sin(gt*.18)*.15;
    T.box('[E] Resgatar '+p.name, x-48, y-32,{size:11,color:'#ffdd44',bg:'rgba(60,40,0,.92)',padding:6,border:'#aa8800'});
    ctx.globalAlpha=1;
  }
}

function drawRescuedFriend(p, idx){
  // smooth follow
  const angle=Math.atan2(PC.vy||.01,PC.vx||.01)+Math.PI;
  const dist=38+idx*20;
  const tx=player.x+Math.cos(angle+(idx-2)*.35)*dist;
  const ty=player.y+Math.sin(angle+(idx-2)*.35)*dist;
  p.x+=(tx-p.x)*.07; p.y+=(ty-p.y)*.07;

  const x=p.x-cam.x, y=p.y-cam.y;
  if(x<-40||x>W+40) return;
  const bob=Math.sin(gt*.12+idx)*(PC.mv?.8:0);
  const arm=Math.sin(gt*.18+idx)*(PC.mv?4:0);

  drawCharacter(x,y,{
    skin:p.skin||'#d4a574', shirt:p.shirt, pants:p.pants, hair:p.hair||'#2a1a0a',
    bob, armSwing:arm, label:p.name, labelColor:'#aaaaaa'
  });
}

/* ═══════════════════════════════════════════════════════════
   TILE-BASED SCHOOL RENDERING
═══════════════════════════════════════════════════════════ */
// Palette
const FLOOR_COLS = {
  lobby:'#1e1e2e',    refectory:'#1e1a0a', library:'#1a0e1e',
  it:'#0a0e1e',       corridor:'#18181e',  lab:'#0a1a14',
  gym:'#0e1a08',      classroom:'#1a1208', exit:'#081a08', default:'#141418'
};
const TILE_LINE = 'rgba(255,255,255,.04)';

function getTileColor(tile, rm){
  const fc = rm ? (FLOOR_COLS[rm.id]||FLOOR_COLS.default) : FLOOR_COLS.default;
  switch(tile){
    case TL.FLOOR:      return fc;
    case TL.WALL:       return '#2a2a3a';
    case TL.DESK:       return '#4a3a1a';
    case TL.LOCKER:     return '#2a3a4a';
    case TL.TABLE:      return '#3a2a0a';
    case TL.BOOKSHELF:  return '#5a2a0a';
    case TL.COMPUTER:   return '#1a1a3a';
    case TL.BENCH:      return '#2a1a0a';
    case TL.DOOR_OPEN:  return '#0a2a0a';
    case TL.DOOR_CLOSED:return '#2a0a0a';
    case TL.WINDOW:     return '#0a2a3a';
    default:            return fc;
  }
}

function renderTiles(){
  const startC=Math.max(0,Math.floor(cam.x/TILE)-1);
  const endC  =Math.min(COLS-1,Math.ceil((cam.x+W)/TILE)+1);
  const startR=Math.max(0,Math.floor(cam.y/TILE)-1);
  const endR  =Math.min(ROWS-1,Math.ceil((cam.y+H)/TILE)+1);

  for(let r=startR;r<=endR;r++){
    for(let c=startC;c<=endC;c++){
      const tile=tileMap[r][c];
      const wx=c*TILE-cam.x, wy=r*TILE-cam.y;
      const rm=getRoomAt(c*TILE+1,r*TILE+1);
      const col=getTileColor(tile,rm);

      // base colour
      ctx.fillStyle=col; ctx.fillRect(Math.floor(wx),Math.floor(wy),TILE,TILE);

      // tile details
      switch(tile){
        case TL.FLOOR:
          // subtle grid
          ctx.strokeStyle=TILE_LINE; ctx.lineWidth=1;
          ctx.strokeRect(Math.floor(wx),Math.floor(wy),TILE,TILE);
          break;

        case TL.WALL:
          // brick pattern
          ctx.fillStyle='rgba(0,0,0,.25)';
          for(let i=0;i<4;i++) ctx.fillRect(Math.floor(wx)+i*10,Math.floor(wy),1,TILE);
          for(let i=0;i<4;i++) ctx.fillRect(Math.floor(wx),Math.floor(wy)+i*10,TILE,1);
          // highlight
          ctx.fillStyle='rgba(255,255,255,.06)';
          ctx.fillRect(Math.floor(wx),Math.floor(wy),TILE,2);
          ctx.fillRect(Math.floor(wx),Math.floor(wy),2,TILE);
          break;

        case TL.DESK:
          ctx.fillStyle='#6a4a1a'; ctx.fillRect(Math.floor(wx)+4,Math.floor(wy)+4,TILE-8,TILE-8);
          ctx.fillStyle='#8a6a2a'; ctx.fillRect(Math.floor(wx)+6,Math.floor(wy)+6,TILE-12,6);
          break;

        case TL.LOCKER:
          ctx.fillStyle='#3a4a5a'; ctx.fillRect(Math.floor(wx)+3,Math.floor(wy)+2,TILE-6,TILE-4);
          ctx.fillStyle='#5a6a7a'; ctx.fillRect(Math.floor(wx)+4,Math.floor(wy)+3,TILE-8,TILE-6);
          // handle
          ctx.fillStyle='#aaa'; ctx.fillRect(Math.floor(wx)+TILE/2-2,Math.floor(wy)+TILE/2-2,4,4);
          // vent lines
          for(let i=0;i<5;i++){ ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(Math.floor(wx)+5,Math.floor(wy)+6+i*5,TILE-10,1); }
          break;

        case TL.TABLE:
          ctx.fillStyle='#5a3a0a'; ctx.fillRect(Math.floor(wx)+2,Math.floor(wy)+4,TILE-4,TILE-8);
          ctx.fillStyle='rgba(255,255,255,.07)'; ctx.fillRect(Math.floor(wx)+3,Math.floor(wy)+5,TILE-6,3);
          break;

        case TL.BOOKSHELF:
          // shelf back
          ctx.fillStyle='#3a1a0a'; ctx.fillRect(Math.floor(wx)+1,Math.floor(wy)+1,TILE-2,TILE-2);
          // books
          const BCOLS=['#aa2222','#2222aa','#22aa22','#aaaa22','#aa22aa','#22aaaa','#aa6622'];
          for(let i=0;i<7;i++){
            ctx.fillStyle=BCOLS[i%BCOLS.length];
            ctx.fillRect(Math.floor(wx)+2+i*5,Math.floor(wy)+4,4,TILE-8);
          }
          // shelf line
          ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(Math.floor(wx)+1,Math.floor(wy)+TILE/2,TILE-2,2);
          break;

        case TL.COMPUTER:
          // monitor
          ctx.fillStyle='#111'; ctx.fillRect(Math.floor(wx)+4,Math.floor(wy)+4,TILE-8,TILE-14);
          ctx.fillStyle=gt%60<30?'#0a3a0a':'#0a1a0a';
          ctx.fillRect(Math.floor(wx)+6,Math.floor(wy)+6,TILE-12,TILE-18);
          // screen flicker text
          if(gt%60<30){
            ctx.fillStyle='#00ff44'; ctx.fillRect(Math.floor(wx)+8,Math.floor(wy)+10,TILE-16,2);
            ctx.fillRect(Math.floor(wx)+8,Math.floor(wy)+14,TILE-20,2);
          }
          // stand
          ctx.fillStyle='#333'; ctx.fillRect(Math.floor(wx)+TILE/2-3,Math.floor(wy)+TILE-10,6,6);
          break;

        case TL.BENCH:
          ctx.fillStyle='#4a2a0a'; ctx.fillRect(Math.floor(wx)+3,Math.floor(wy)+10,TILE-6,12);
          ctx.fillStyle='#6a3a0a'; ctx.fillRect(Math.floor(wx)+4,Math.floor(wy)+11,TILE-8,4);
          // legs
          ctx.fillStyle='#2a1a0a';
          ctx.fillRect(Math.floor(wx)+5,Math.floor(wy)+22,4,8);
          ctx.fillRect(Math.floor(wx)+TILE-9,Math.floor(wy)+22,4,8);
          break;

        case TL.WINDOW:
          // frame
          ctx.fillStyle='#2a2a1a'; ctx.fillRect(Math.floor(wx)+1,Math.floor(wy)+1,TILE-2,TILE-2);
          // glass
          ctx.fillStyle='#0a2a3a'; ctx.fillRect(Math.floor(wx)+4,Math.floor(wy)+4,TILE-8,TILE-8);
          // glare
          ctx.fillStyle='rgba(200,220,255,.12)'; ctx.fillRect(Math.floor(wx)+5,Math.floor(wy)+5,(TILE-10)/2,(TILE-10)/2);
          // cross bar
          ctx.fillStyle='#2a2a1a';
          ctx.fillRect(Math.floor(wx)+1,Math.floor(wy)+TILE/2-1,TILE-2,2);
          ctx.fillRect(Math.floor(wx)+TILE/2-1,Math.floor(wy)+1,2,TILE-2);
          break;

        case TL.DOOR_OPEN:
          ctx.fillStyle='rgba(0,80,0,.35)'; ctx.fillRect(Math.floor(wx),Math.floor(wy),TILE,TILE);
          ctx.strokeStyle='#226622'; ctx.lineWidth=2;
          ctx.strokeRect(Math.floor(wx)+2,Math.floor(wy)+2,TILE-4,TILE-4);
          break;
      }
    }
  }
}

/* ── special room overlays ── */
function renderRoomOverlays(){
  // Gym — court markings
  const gym=ROOMS.find(r=>r.id==='gym');
  if(gym){
    const gx=gym.c1*TILE-cam.x, gy=gym.r1*TILE-cam.y;
    const gw=(gym.c2-gym.c1)*TILE, gh=(gym.r2-gym.r1)*TILE;
    ctx.strokeStyle='rgba(255,255,200,.12)'; ctx.lineWidth=2;
    // centre circle
    ctx.beginPath(); ctx.arc(gx+gw/2,gy+gh/2,60,0,Math.PI*2); ctx.stroke();
    // centre line
    ctx.beginPath(); ctx.moveTo(gx+gw/2,gy+20); ctx.lineTo(gx+gw/2,gy+gh-20); ctx.stroke();
    // three-point arcs
    ctx.beginPath(); ctx.arc(gx+40,gy+gh/2,70,-Math.PI/2,Math.PI/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(gx+gw-40,gy+gh/2,70,Math.PI/2,3*Math.PI/2); ctx.stroke();
    // basketball hoops
    ctx.strokeStyle='rgba(255,150,50,.5)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(gx+25,gy+gh/2,15,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(gx+gw-25,gy+gh/2,15,0,Math.PI*2); ctx.stroke();
    // hoop poles
    ctx.fillStyle='#3a2a1a'; ctx.fillRect(gx+20,gy+20,6,gh-40);
    ctx.fillRect(gx+gw-26,gy+20,6,gh-40);
    // backboards
    ctx.fillStyle='#2a2a3a'; ctx.fillRect(gx+14,gy+gh/2-30,18,25); ctx.fillRect(gx+gw-32,gy+gh/2-30,18,25);
  }

  // Lab — gas effect
  const lab=ROOMS.find(r=>r.id==='lab');
  if(lab){
    const lx=lab.c1*TILE-cam.x, ly=lab.r1*TILE-cam.y;
    const lw=(lab.c2-lab.c1)*TILE, lh=(lab.r2-lab.r1)*TILE;
    ctx.globalAlpha=.07+Math.sin(gt*.04)*.03;
    ctx.fillStyle='#44ffaa';
    ctx.fillRect(lx,ly+lh-60,lw,60);
    ctx.globalAlpha=1;
    // flask decorations on desks
    const labDesks=[
      [3,20],[4,21],[3,24],[4,25],[3,28],[4,29]
    ];
    for(const [tc,tr] of labDesks){
      const fx=(tc+lab.c1)*TILE-cam.x+8, fy=(tr+lab.r1)*TILE-cam.y+4;
      if(fx<-20||fx>W+20||fy<-20||fy>H+20) continue;
      ['#44ff44','#4444ff','#ff4444'].forEach((c,i)=>{
        ctx.strokeStyle=c; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(fx+i*12,fy,5,0,Math.PI*2); ctx.stroke();
      });
    }
  }

  // IT — electric sparks
  for(const sp of sparks){
    const spx=sp.x-cam.x, spy=sp.y-cam.y;
    if(spx<-20||spx>W+20||spy<-20||spy>H+20) continue;
    if(sp.active&&gt%10<5){
      ctx.strokeStyle='#44aaff'; ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        ctx.globalAlpha=.5+Math.random()*.4;
        ctx.beginPath();
        ctx.moveTo(spx,spy);
        ctx.lineTo(spx+(Math.random()-.5)*20,spy+(Math.random()-.5)*20);
        ctx.stroke();
      }
      ctx.globalAlpha=.5;ctx.fillStyle='#44aaff';
      ctx.beginPath();ctx.arc(spx,spy,4,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
    }
  }

  // Lobby exit — glow if ready
  {
    const ex=ROOMS.find(r=>r.id==='exit');
    if(ex){
      const exX=ex.c1*TILE-cam.x, exY=ex.r1*TILE-cam.y;
      const exW=(ex.c2-ex.c1)*TILE, exH=(ex.r2-ex.r1)*TILE;
      if(genFixed>=4&&friendsRescued>=5){
        const p=.3+Math.sin(gt*.15)*.25;
        ctx.globalAlpha=p; ctx.fillStyle='#44ff44';
        ctx.fillRect(exX,exY,exW,exH); ctx.globalAlpha=1;
        T.mid('SAÍDA DESBLOQUEADA! [E]',exY+exH/2,{size:10,color:'#44ff44'});
      } else {
        ctx.globalAlpha=.12; ctx.fillStyle='#ff4444';
        ctx.fillRect(exX,exY,exW,exH); ctx.globalAlpha=1;
        T.draw('🔒 BLOQUEADA',exX+8,exY+exH/2,{size:8,color:'#ff6666'});
      }
    }
  }

  // Room name plates
  for(const rm of ROOMS){
    if(rm.id==='exit') continue;
    const nx=rm.c1*TILE-cam.x+6, ny=rm.r1*TILE-cam.y+12;
    if(nx<-60||nx>W||ny<0||ny>H) continue;
    ctx.globalAlpha=.3;
    T.draw(rm.name,nx,ny,{size:8,color:'#8899aa'});
    ctx.globalAlpha=1;
  }
}

/* ── generator draw ── */
function drawGenerator(g){
  const x=Math.floor(g.x-cam.x), y=Math.floor(g.y-cam.y);
  if(x<-50||x>W+50||y<-50||y>H+50) return;

  dr(x-14,y-12,28,24, g.fixed?'#2a4a2a':'#4a3a2a');
  dr(x-12,y-10,24,20, g.fixed?'#3a5a3a':'#5a4a3a');
  dr(x-10,y-8,8,8,'#333'); dr(x+2,y-8,8,8,'#333');
  dr(x-8,y+4,16,4,'#666');
  dr(x+12,y-18,4,8,'#444');

  if(g.fixed&&gt%30<15){
    ctx.globalAlpha=.4; ctx.fillStyle='#aaa';
    ctx.fillRect(x+12,y-22-(gt%30)*.3,4,3); ctx.globalAlpha=1;
  }
  const lc=g.fixed?'#44ff44':(gt%40<20?'#ff4444':'#aa2222');
  dr(x-4,y-16,8,5,lc);

  if(!g.fixed){
    ctx.globalAlpha=.22+Math.sin(gt*.1)*.1; ctx.fillStyle='#ff4444';
    ctx.beginPath(); ctx.arc(x,y-13,15,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  }

  const dist=Math.hypot(player.x-g.x,player.y-g.y);
  if(dist<55&&!g.fixed){
    ctx.globalAlpha=.8+Math.sin(gt*.18)*.2;
    T.box('[E] Consertar',x-35,y-35,{size:10,color:'#ffdd44',bg:'rgba(60,40,0,.92)',padding:5,border:'#aa8800'});
    if(g.prog>0){ dr(x-20,y-50,40,6,'#222'); dr(x-19,y-49,g.prog*.38,4,'#44aaff'); }
    ctx.globalAlpha=1;
  }
}

/* ── item draw ── */
function drawItem(it){
  const x=Math.floor(it.x-cam.x), y=Math.floor(it.y-cam.y);
  if(x<-30||x>W+30||y<-30||y>H+30) return;
  const bob=Math.sin(gt*.08+it.x*.1)*2;
  const gc=it.type==='battery'?'#44ff44':'#ff4444';
  ctx.globalAlpha=.3+Math.sin(gt*.09)*.18;
  ctx.fillStyle=gc; ctx.beginPath(); ctx.arc(x,y+bob,10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(it.type==='battery'){
    dr(x-4,y-5+bob,8,10,'#333'); dr(x-3,y-4+bob,6,8,'#444');
    dr(x-1,y-6+bob,2,2,'#888'); dr(x-1,y-2+bob,2,1,'#4f4'); dr(x,y-3+bob,1,3,'#4f4');
  } else {
    dr(x-2,y-5+bob,4,10,'#a22'); dr(x-1,y-4+bob,2,8,'#c33'); dr(x-1,y-7+bob,2,3,'#f64');
  }
  if(Math.hypot(player.x-it.x,player.y-it.y)<45){
    ctx.globalAlpha=.85;
    T.box('[R] '+it.name,x-20,y-22,{size:10,color:'#ffd',bg:'rgba(60,50,0,.9)',padding:4,border:'#a80'});
    ctx.globalAlpha=1;
  }
}

/* ═══════════════════════════════════════════════════════════
   ENEMY SPRITES (unchanged from original)
═══════════════════════════════════════════════════════════ */
function drawDeer(e,sx,sy){
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(e.frame*.1)*1.5);
  if(e.stun>0)x+=(Math.random()-.5)*5;
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(x,y+22,14,4,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(e.frame*.12)*(e.mode==='chase'?4:2);
  dr(x-12,y+3,4,18,'#4a3a2a');dr(x+8,y+3,4,18,'#4a3a2a');
  dr(x-6,y+5+lg*.4,3,16,'#5a4a3a');dr(x+3,y+5-lg*.4,3,16,'#5a4a3a');
  dr(x-12,y-4,24,12,'#5a3a1a');dr(x-10,y-3,20,10,'#6a4a2a');
  if(e.heat){ctx.globalAlpha=.2+Math.sin(gt*.15)*.08;ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(x,y-10,85,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  dr(x-4,y-10,8,7,'#5a3a1a');dr(x-8,y-22,16,13,'#5a3a1a');dr(x-11,y-18,4,5,'#4a2a0a');
  let ec=e.eyeColor;if(e.stun>0)ec=e.stun%8<4?'#fff':'#ff0';if(e.heat)ec='#ff4400';
  dr(x-6,y-20,4,4,'#111');dr(x+2,y-20,4,4,'#111');dr(x-5,y-19,3,3,ec);dr(x+3,y-19,3,3,ec);
  const gi=e.mode==='chase'?.5:.25;
  ctx.globalAlpha=gi+Math.sin(gt*.08)*.1;ctx.fillStyle=ec;
  ctx.beginPath();ctx.arc(x-3.5,y-17.5,5,0,Math.PI*2);ctx.arc(x+4.5,y-17.5,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  dr(x-5,y-27,2,6,'#555');dr(x-8,y-30,2,5,'#666');dr(x-10,y-32,2,3,'#777');
  dr(x+3,y-27,2,6,'#555');dr(x+6,y-30,2,5,'#666');dr(x+8,y-32,2,3,'#777');
  if(gt%35<18&&e.stun<=0){dr(x-10,y-33,2,2,'#f00');dr(x+8,y-33,2,2,'#f00');}
  if(e.mode==='chase'&&gt%5<2)for(let i=0;i<3;i++)dr(x+(Math.random()-.5)*22,y+Math.random()*16,1,1,Math.random()>.5?'#ff4':'#fa2');
  e.frame++;
}
function drawBoar(e,sx,sy){
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(e.frame*.08));
  if(e.stun>0)x+=(Math.random()-.5)*5;if(e.charging)x+=(Math.random()-.5)*3;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(x,y+18,20,5,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(e.frame*.1)*(e.charging?5:2);
  dr(x-16,y+2,6,14,'#3a2a1a');dr(x+10,y+2,6,14,'#3a2a1a');
  dr(x-10,y+4+lg*.3,5,12,'#4a3a2a');dr(x+5,y+4-lg*.3,5,12,'#4a3a2a');
  dr(x-16,y+15,6,3,'#222');dr(x+10,y+15,6,3,'#222');
  dr(x-18,y-8,36,18,'#3a2a1a');dr(x-16,y-7,32,16,'#4a3a2a');
  dr(x-14,y-6,8,6,'#5a4a3a');dr(x+6,y-6,8,6,'#5a4a3a');
  dr(x-12,y-16,24,12,'#3a2a1a');dr(x-16,y-12,6,8,'#3a2a1a');dr(x-14,y-8,2,2,'#222');
  const tk=e.charging?'#ffaa00':'#888';dr(x-18,y-8,3,8,tk);dr(x-16,y-14,3,8,tk);
  let ec=e.eyeColor;if(e.stun>0)ec=e.stun%8<4?'#fff':'#ff0';if(e.charging)ec='#f00';
  dr(x-8,y-14,4,4,'#111');dr(x+4,y-14,4,4,'#111');dr(x-7,y-13,3,3,ec);dr(x+5,y-13,3,3,ec);
  const gi=e.mode==='chase'||e.charging?.55:.25;
  ctx.globalAlpha=gi+Math.sin(gt*.07)*.1;ctx.fillStyle=ec;
  ctx.beginPath();ctx.arc(x-5.5,y-11.5,5,0,Math.PI*2);ctx.arc(x+6.5,y-11.5,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  dr(x-10,y-18,3,3,'#4a3a2a');dr(x+7,y-18,3,3,'#4a3a2a');
  if(e.charging)for(let i=0;i<4;i++)dr(x+(Math.random()-.5)*30,y+Math.random()*12-5,1,1,Math.random()>.5?'#ff4':'#f80');
  e.frame++;
}
function drawWolf(e,sx,sy){
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(e.frame*.15));
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+12,10,3,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(e.frame*.18)*(e.mode==='chase'?3:1);
  dr(x-8,y+2,3,10,'#3a3a4a');dr(x+5,y+2,3,10,'#3a3a4a');
  dr(x-5,y+3+lg,2,8,'#4a4a5a');dr(x+3,y+3-lg,2,8,'#4a4a5a');
  dr(x-8,y-4,16,8,'#3a3a4a');dr(x-6,y-3,12,6,'#4a4a5a');
  dr(x-4,y-8,8,6,'#3a3a4a');dr(x-6,y-6,3,4,'#3a3a4a');
  const ec=e.mode==='chase'?'#ff4400':e.eyeColor;
  dr(x-3,y-7,2,2,ec);dr(x+1,y-7,2,2,ec);
  if(e.mode==='chase'){ctx.globalAlpha=.4;ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(x-2,y-6,4,0,Math.PI*2);ctx.arc(x+2,y-6,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  dr(x-6,y-1,2,3,'#555');dr(x+4,y-1,2,3,'#555');
  e.frame++;
}

/* ═══════════════════════════════════════════════════════════
   DARKNESS / VHS / HUD
═══════════════════════════════════════════════════════════ */
function drawDark(){
  const px=player.x-cam.x, py=player.y-cam.y-5;
  const off=document.createElement('canvas'); off.width=W; off.height=H;
  const oc=off.getContext('2d');
  let dk=.82-(lFlash>0?lFlash*.025:0);
  oc.fillStyle=`rgba(5,0,20,${dk})`; oc.fillRect(0,0,W,H);

  oc.globalCompositeOperation='destination-out';
  oc.fillStyle='rgba(0,0,0,1)'; oc.beginPath(); oc.arc(px,py,68*.75,0,Math.PI*2); oc.fill();
  oc.globalCompositeOperation='source-over';
  const gr=oc.createRadialGradient(px,py,4,px,py,68);
  gr.addColorStop(0,'rgba(5,0,20,0)'); gr.addColorStop(.5,'rgba(5,0,20,.15)'); gr.addColorStop(1,`rgba(5,0,20,${dk})`);
  oc.fillStyle=gr; oc.beginPath(); oc.arc(px,py,68,0,Math.PI*2); oc.fill();

  // partner light
  const ppx=partner.x-cam.x, ppy=partner.y-cam.y;
  oc.globalCompositeOperation='destination-out'; oc.fillStyle='rgba(0,0,0,.4)';
  oc.beginPath(); oc.arc(ppx,ppy,32,0,Math.PI*2); oc.fill(); oc.globalCompositeOperation='source-over';

  for(const e of enemies){
    if(e.stun>0) continue;
    const ey=e.type==='deer'?17:e.type==='boar'?11:6, er=e.mode==='chase'?28:12;
    oc.globalCompositeOperation='destination-out'; oc.fillStyle='rgba(0,0,0,.5)';
    oc.beginPath(); oc.arc(e.x-cam.x,e.y-cam.y-ey,er,0,Math.PI*2); oc.fill();
    oc.globalCompositeOperation='source-over';
  }

  if(genFixed>=4&&friendsRescued>=5){
    oc.globalCompositeOperation='destination-out'; oc.fillStyle='rgba(0,0,0,.7)';
    oc.beginPath(); oc.arc(5*TILE-cam.x,16*TILE-cam.y,55,0,Math.PI*2); oc.fill();
    oc.globalCompositeOperation='source-over';
  }
  ctx.drawImage(off,0,0);
}

function drawVHS(){
  ctx.fillStyle='rgba(0,0,0,.1)'; for(let i=0;i<H;i+=3) ctx.fillRect(0,i,W,1);
  if(glitch>0){ for(let i=0;i<2;i++){const gy=Math.random()*H,gh=2+Math.random()*5;ctx.drawImage(canvas,0,gy,W,gh,Math.random()*12-6,gy,W,gh);}glitch--; }
  if(Math.random()<.008) glitch=Math.floor(Math.random()*6)+2;
  ctx.globalAlpha=.022;ctx.fillStyle='#8800ff';ctx.fillRect(0,0,2,H);
  ctx.fillStyle='#ff4400';ctx.fillRect(W-2,0,2,H);ctx.globalAlpha=1;
  const vg=ctx.createRadialGradient(W/2,H/2,W*.2,W/2,H/2,W*.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(10,0,20,.55)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

  // emergency light flicker
  flicker=(flicker+.05)%(Math.PI*2);
  const el=Math.abs(Math.sin(flicker*3))*.08;
  ctx.globalAlpha=el;ctx.fillStyle='#8800ff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;

  if(gt%85<60){ctx.fillStyle='#8800ff';ctx.beginPath();ctx.arc(14,16,5,0,Math.PI*2);ctx.fill();T.draw('REC',24,16,{size:11,color:'#6600cc'});}
  const m=Math.floor(gt/3600),s=Math.floor((gt/60)%60);
  T.draw(String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'),W-50,16,{size:11,color:'#666'});
}

function drawHUD(){
  const hy=H-25;
  dr(10,hy-10,95,32,'rgba(0,0,0,.78)');
  T.draw('VIDA',14,hy-3,{size:10,color:'#a44'});
  for(let i=0;i<player.maxHp;i++){const c=i<player.hp?'#c33':'#333';dr(14+i*14,hy+6,12,10,c);if(i<player.hp)dr(15+i*14,hy+7,10,8,'#f44');}
  if(player.stamina<100){dr(68,hy-3,35,6,'#222');dr(69,hy-2,(player.stamina/100)*33,4,player.stamina<25?'#aa4':'#4a4');}

  const py2=H-65;
  dr(10,py2-8,175,30,'rgba(0,0,0,.78)');
  T.draw('⚡ Geradores: '+genFixed+'/4',14,py2,{size:10,color:genFixed>=4?'#44ff44':'#ffaa44'});
  T.draw('👥 Amigos: '+friendsRescued+'/5',14,py2+13,{size:10,color:friendsRescued>=5?'#44ff44':'#88aaff'});

  const py3=H-100;
  dr(10,py3-8,178,20,'rgba(0,0,0,.78)');
  const pSt=partnerBusy?'('+partnerAction+')':'[H] pedir ajuda';
  T.draw('👤 Murilo: '+pSt,14,py3,{size:9,color:'#44aa44'});

  const maxA=Math.max(...enemies.map(e=>e.alert));
  if(maxA>0){
    const ac=maxA>70?'#f44':(maxA>35?'#fa4':'#ff4');
    dr(W/2-65,10,130,28,'rgba(0,0,0,.85)');
    T.draw('⚠ ALERTA: '+Math.floor(maxA)+'%',W/2-55,18,{size:12,color:ac,bold:true});
    dr(W/2-52,28,104,6,'#222');dr(W/2-52,28,maxA*1.04,6,ac);
  }
  if(enemies.some(e=>e.mode==='chase'||e.charging)&&gt%35<22)
    T.draw('!! CAÇADA !!',W/2-55,52,{size:15,color:'#f00',bold:true});
  if(player.crouching)T.draw('🦆 AGACHADO [C]',W-108,H-15,{size:9,color:'#8a8'});

  if(genFixed>=4&&friendsRescued>=5){
    const p=.7+Math.sin(gt*.15)*.3; ctx.globalAlpha=p;
    dr(W/2-92,H-22,184,18,'rgba(0,80,0,.9)');
    T.draw('✓ VÁ PARA A SAÍDA PRINCIPAL! [E]',W/2-88,H-13,{size:10,color:'#44ff44',bold:true});
    ctx.globalAlpha=1;
  }

  if(passwordParts.length>0){
    dr(W-135,10,125,18,'rgba(0,0,0,.78)');
    T.draw('🔑 '+passwordParts.join('-'),W-130,19,{size:9,color:'#88aaff'});
  }

  if(txtTmr>0){
    ctx.globalAlpha=Math.min(1,txtTmr/70);
    T.box(curTxt,W/2-curTxt.length*3.8,H/2+90,{size:13,color:'#fff',bg:'rgba(0,0,0,.92)',padding:12});
    ctx.globalAlpha=1;
  }

  if(gt<700){
    ctx.globalAlpha=Math.max(0,1-gt/700);
    T.draw('[WASD] Mover | [E] Interagir | [H] Murilo Ajuda | [R] Coletar | [C] Agachar',12,32,{size:8,color:'#555'});
    ctx.globalAlpha=1;
  }

  // current room
  const rm=getRoomAt(player.x,player.y);
  dr(W/2-55,H-20,110,16,'rgba(0,0,0,.7)');
  T.draw('📍 '+(rm?rm.name:'Corredor'),W/2-50,H-12,{size:9,color:'#8899aa'});
}

/* ═══════════════════════════════════════════════════════════
   AI
═══════════════════════════════════════════════════════════ */
function updateEnemy(e){
  if(e.stun>0){ e.stun--; e.frame++;
    if(e.stun<=0){ e.mode='patrol'; e.eyeColor=e.type==='wolf'?'#44aaff':'#ffcc00'; e.alert=20; }
    return;
  }
  const dx=player.x-e.x, dy=player.y-e.y, dist=Math.hypot(dx,dy);
  const see=!player.hiding;
  let rng=100+(e.type==='deer'?60:e.type==='boar'?30:20);
  let rate=.8+(e.type==='deer'?.6:0);
  if(player.crouching){rng*=.6;rate*=.55;}
  if(e.type==='deer'&&e.alert>50){e.heat=true;rng*=1.4;}else if(e.type==='deer')e.heat=false;
  rate+=player.noise*.08;
  if(partnerBusy&&partnerAction==='distract'){rate*=.25;rng*=.5;}

  if(see&&dist<rng){e.alert=Math.min(100,e.alert+rate);e.lkX=player.x;e.lkY=player.y;}
  else e.alert=Math.max(0,e.alert-.35);

  if(e.alert>=100&&e.mode!=='chase'){
    e.mode='chase';e.eyeColor='#ff0000';e.speed*=1.28;glitch=18;shake=10;A.chase();
  }

  if(e.mode==='patrol'){
    e.eyeColor=e.type==='wolf'?'#44aaff':'#ffcc00';
    e.pTmr++;if(e.pTmr>200){e.pTmr=0;e.pDir=Math.random()*Math.PI*2;}
    e.x+=Math.cos(e.pDir)*e.speed;e.y+=Math.sin(e.pDir)*e.speed;
    if(e.alert>38){e.mode='alert';A.alert();}
  }
  if(e.mode==='alert'){
    e.eyeColor='#ffaa00';
    const tdx=e.lkX-e.x,tdy=e.lkY-e.y,td=Math.hypot(tdx,tdy);
    if(td>18){e.x+=(tdx/td)*e.speed;e.y+=(tdy/td)*e.speed;}
    if(e.alert<=28)e.mode='patrol';
  }
  if(e.mode==='chase'){
    e.eyeColor='#ff0000';
    if(dist>12){e.x+=(dx/dist)*e.speed;e.y+=(dy/dist)*e.speed;}
    if(e.type==='boar'&&dist<100&&dist>35&&!e.charging){
      e.charging=true;e.chargeDir=Math.atan2(dy,dx);e.chargeTmr=55;
      A.t(60,.35,'sawtooth',.12);showTxt('🐗 Javali investindo!');
    }
    if(e.charging){
      e.chargeTmr--;e.x+=Math.cos(e.chargeDir)*3.5;e.y+=Math.sin(e.chargeDir)*3.5;
      if(e.chargeTmr<=0){e.charging=false;e.mode='alert';e.alert=40;}
    }
    if(dist<22&&!player.hiding&&player.inv<=0){
      player.hp-=(e.type==='boar'?2:1);player.inv=110;shake=28;glitch=35;A.dmg();
      if(player.hp<=0){gs=ST.DEATH;deathTmr=0;}
      else{player.x-=(dx/dist)*60;player.y-=(dy/dist)*60;e.mode='alert';e.alert=55;
        showTxt('💔 '+(e.type==='deer'?'Cervo':'Javali')+' te atingiu! Vida:'+player.hp);}
    }
    if(player.hiding){e.alert-=2;if(e.alert<=0){e.mode='patrol';showTxt('Inimigo te perdeu...');}}
    if(dist>340){e.alert-=1.2;if(e.alert<=0)e.mode='patrol';}
  }
  // clamp inside map
  e.x=Math.max(TILE,Math.min(MW-TILE,e.x)); e.y=Math.max(TILE,Math.min(MH-TILE,e.y));
  e.frame++;
}

function updatePartner(){
  const angle=Math.atan2(PC.vy||.01,PC.vx||.01)+Math.PI;
  const tx=player.x+Math.cos(angle)*40, ty=player.y+Math.sin(angle)*40;
  partner.x+=(tx-partner.x)*.065; partner.y+=(ty-partner.y)*.065;
  if(partnerBusy){partnerBusyTmr--;if(partnerBusyTmr<=0){partnerBusy=false;partnerAction='follow';}}
  if(partnerBubbleTmr>0) partnerBubbleTmr--;
  const cl=Math.min(...enemies.map(e=>Math.hypot(e.x-player.x,e.y-player.y)));
  if(cl<130&&!partnerBusy&&gt%150===0){partnerSay('Cuidado!');A.static_();}
  if(!partnerBusy&&gt%360===0){
    const ch=enemies.find(e=>e.mode==='chase');
    if(ch&&Math.hypot(ch.x-player.x,ch.y-player.y)<210){
      partnerBusy=true;partnerBusyTmr=220;partnerAction='distract';partnerSay('Distrai! Vai!');
      ch.lkX=partner.x+(Math.random()-.5)*130;ch.lkY=partner.y+(Math.random()-.5)*100;
      ch.alert=Math.max(50,ch.alert-25);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   WALL COLLISION
═══════════════════════════════════════════════════════════ */
function solidTile(t){ return t===TL.WALL||t===TL.LOCKER||t===TL.BOOKSHELF; }

function pushOutOfWalls(obj){
  const r=10; // radius
  const checks=[
    [obj.x-r,obj.y],[obj.x+r,obj.y],
    [obj.x,obj.y-r],[obj.x,obj.y+r],
  ];
  for(const [cx,cy] of checks){
    const tc=Math.floor(cx/TILE), tr=Math.floor(cy/TILE);
    if(tr<0||tr>=ROWS||tc<0||tc>=COLS) continue;
    if(solidTile(tileMap[tr][tc])){
      const tileX=tc*TILE, tileY=tr*TILE;
      const overlapX=Math.min(obj.x+r-tileX,tileX+TILE-obj.x+r)/2;
      const overlapY=Math.min(obj.y+r-tileY,tileY+TILE-obj.y+r)/2;
      if(overlapX<overlapY) obj.x+=obj.x<tileX+TILE/2?-overlapX:overlapX;
      else obj.y+=obj.y<tileY+TILE/2?-overlapY:overlapY;
      PC.vx*=.3;PC.vy*=.3;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN UPDATE
═══════════════════════════════════════════════════════════ */
function updateGame(){
  gt++; player.noise=Math.max(0,player.noise-.6);

  const minD=Math.min(...enemies.map(e=>Math.hypot(player.x-e.x,player.y-e.y)));
  if(minD<165){const hi=Math.max(15,65-(165-Math.min(165,minD))*.35);if(gt%Math.floor(hi)===0)A.hb();}
  if(minD<185&&gt%50<8) A.static_();

  if(!player.hiding){
    const mr=PC.update(player,keys);
    if(mr.mv){const si=mr.spr?9:(player.crouching?26:16);if(gt%si===0){A.step();player.noise+=mr.spr?8:(player.crouching?1:3);}}
    pushOutOfWalls(player);
    player.x=Math.max(TILE,Math.min(MW-TILE,player.x));
    player.y=Math.max(TILE,Math.min(MH-TILE,player.y));
  }
  if(player.inv>0) player.inv--;

  for(const e of enemies) updateEnemy(e);
  updatePartner();

  // sparks damage
  for(const sp of sparks){
    sp.timer--;if(sp.timer<=0){sp.active=!sp.active;sp.timer=sp.interval;}
    if(sp.active&&!player.hiding&&player.inv<=0){
      if(Math.hypot(player.x-sp.x,player.y-sp.y)<22){
        player.hp--;player.inv=90;shake=18;A.dmg();showTxt('⚡ Cabo elétrico! Vida:'+player.hp);
        if(player.hp<=0){gs=ST.DEATH;deathTmr=0;}
      }
    }
  }

  // camera
  cam.x+=(player.x-W/2-cam.x)*.08; cam.y+=(player.y-H/2-cam.y)*.08;
  cam.x=Math.max(0,Math.min(MW-W,cam.x)); cam.y=Math.max(0,Math.min(MH-H,cam.y));
  if(shake>0){cam.x+=(Math.random()-.5)*shake;cam.y+=(Math.random()-.5)*shake;shake*=.85;if(shake<.4)shake=0;}

  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.life--;}
  particles=particles.filter(p=>p.life>0);

  lTmr++;if(lTmr>700+Math.random()*1000){lFlash=20;lTmr=0;}if(lFlash>0)lFlash-=.8;
  if(txtTmr>0) txtTmr--;
}

/* ═══════════════════════════════════════════════════════════
   RENDER GAME
═══════════════════════════════════════════════════════════ */
function renderGame(){
  ctx.fillStyle='#080810'; ctx.fillRect(0,0,W,H);

  renderTiles();
  renderRoomOverlays();

  // collectibles
  for(const it of items) if(!it.col) drawItem(it);
  // generators
  for(const g of generators) drawGenerator(g);

  // sort entities by Y
  const ents=[];
  for(const p of prisoners){ if(!p.rescued) ents.push({t:'prisoner',y:p.y,d:p}); }
  for(const p of prisoners){ if(p.rescued&&p.follow) ents.push({t:'friend',y:p.y,d:p}); }
  ents.push({t:'partner',y:partner.y,d:partner});
  if(!player.hiding) ents.push({t:'player',y:player.y,d:player});
  for(const e of enemies) ents.push({t:e.type,y:e.y,d:e});
  ents.sort((a,b)=>a.y-b.y);

  let friendIdx=0;
  for(const e of ents){
    const sx=e.d.x-cam.x, sy=e.d.y-cam.y;
    if(sx<-80||sx>W+80||sy<-120||sy>H+70){if(!['deer','boar','wolf','player','partner'].includes(e.t)) continue;}
    switch(e.t){
      case 'prisoner': drawPrisonerSprite(e.d); break;
      case 'friend':   drawRescuedFriend(e.d, friendIdx++); break;
      case 'partner':  drawPartnerSprite(); break;
      case 'player':   drawPlayer(sx,sy); break;
      case 'deer':     drawDeer(e.d,sx,sy); break;
      case 'boar':     drawBoar(e.d,sx,sy); break;
      case 'wolf':     drawWolf(e.d,sx,sy); break;
    }
  }

  // particles
  for(const p of particles){ctx.globalAlpha=p.life/p.ml;ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),Math.ceil(p.sz),Math.ceil(p.sz));}ctx.globalAlpha=1;

  if(player.hiding){
    const px=player.x-cam.x,py=player.y-cam.y;
    dr(px-3,py-1,2,2,'#fff');dr(px+1,py-1,2,2,'#fff');
    T.box('[Espaço] Sair',px-22,py-15,{size:10,color:'#afa',bg:'rgba(0,40,0,.88)',padding:4});
  }

  drawDark();

  if(lFlash>12){ctx.globalAlpha=(lFlash-12)/10*.35;ctx.fillStyle='#bbaaff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(player.hp<=1){const p=Math.sin(gt*.065)*.5+.5;ctx.globalAlpha=.07+p*.06;ctx.fillStyle='#f00';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}

  drawHUD(); drawVHS();
}

/* ═══════════════════════════════════════════════════════════
   SCREENS
═══════════════════════════════════════════════════════════ */
function renderTitle(){
  ctx.fillStyle='#050010'; ctx.fillRect(0,0,W,H);
  // school silhouette
  ctx.fillStyle='#090018';
  ctx.fillRect(20,H-100,W-40,100);
  ctx.fillRect(50,H-140,90,44); ctx.fillRect(190,H-130,110,34); ctx.fillRect(340,H-155,80,56);
  for(let i=0;i<6;i++){
    const wx=50+i*60, wy=H-125;
    ctx.fillStyle=gt%80<40?'rgba(180,0,255,.18)':'rgba(80,0,140,.1)';
    ctx.fillRect(wx,wy,20,28);
  }

  T.mid('C  A  E  A',55,{size:36,color:'#aa00ff',bold:true});
  T.mid('PROTOCOLO DE SOBRECARGA',84,{size:13,color:'#7744aa'});
  T.mid('Eco de Metal — Episódio Escolar',104,{size:9,color:'#443366'});

  const ep=.5+Math.sin(gt*.05)*.35;
  ctx.globalAlpha=ep;
  dr(190+Math.sin(gt*.015)*5,148,4,4,'#f00'); dr(205+Math.sin(gt*.015)*5,148,4,4,'#f00');
  ctx.globalAlpha=ep*.8;
  dr(282+Math.sin(gt*.012)*4,162,5,5,'#f40'); dr(300+Math.sin(gt*.012)*4,162,5,5,'#f40');
  ctx.globalAlpha=1;

  const menu=['🎮 JOGAR','❌ SAIR'];
  for(let i=0;i<menu.length;i++){
    const sel=i===titleSel, my=188+i*32;
    if(sel){ dr(W/2-90,my-14,180,28,'rgba(100,0,200,.35)'); T.mid('> '+menu[i]+' <',my,{size:14,color:'#cc44ff',bold:true}); }
    else T.mid(menu[i],my,{size:13,color:'#553377'});
  }
  T.mid('⚡ 4 Geradores | 👥 5 Amigos | 🚪 Fuja!',H-45,{size:9,color:'#442255'});
  T.mid('[E] Interagir | [H] Murilo Ajuda | [C] Agachar',H-30,{size:9,color:'#442255'});
  T.mid('Setas: Navegar | ENTER: Selecionar',H-14,{size:9,color:'#442255'});
  ctx.fillStyle='rgba(0,0,0,.1)'; for(let i=0;i<H;i+=3) ctx.fillRect(0,i,W,1);
  gt++;
}

function renderIntro(){
  ctx.fillStyle='#030308'; ctx.fillRect(0,0,W,H);
  const lines=[
    '╔══════════════════════════════════════╗',
    '║   CAEA: PROTOCOLO DE SOBRECARGA      ║',
    '╚══════════════════════════════════════╝',
    '','A escola CAEA foi infectada pela Rede.',
    'Portas blindadas. Amigos presos.','',
    '⚡ Ative 4 geradores → abre a saída',
    '👥 Resgate 5 amigos → obtém a senha',
    '🚪 Vá para a Saída Principal → fuja!','',
    '🦌 Cervo vigia a Biblioteca',
    '🐗 Javali patrulha o Refeitório',
    '🐺 Lobos cercam a Quadra',
    '⚡ Cabos elétricos na Sala de TI','',
    '[ENTER ou ESC para começar]'
  ];
  for(let i=0;i<lines.length;i++){
    const col=lines[i].startsWith('⚡')||lines[i].startsWith('👥')||lines[i].startsWith('🚪')?'#aa88ff':
              lines[i].startsWith('🦌')||lines[i].startsWith('🐗')||lines[i].startsWith('🐺')?'#ff8888':
              lines[i].startsWith('╔')||lines[i].startsWith('╚')||lines[i].startsWith('║')?'#aa00ff':
              lines[i].startsWith('[')? '#44aa44':'#887799';
    T.draw(lines[i],30,28+i*18,{size:10,color:col});
  }
  ctx.fillStyle='rgba(0,0,0,.08)'; for(let i=0;i<H;i+=3) ctx.fillRect(0,i,W,1);
  gt++;
}

function renderDialogue(){
  renderGame();
  if(!curDlg) return;
  // check action trigger
  if(curDlg._prisoner){ pzActive=curDlg._prisoner; pzProg=0; pzKey=curDlg._prisoner.puzzle; gs=ST.PUZZLE; advDlg(); return; }
  const boxH=74, boxY=H-boxH-10;
  dr(10,boxY,W-20,boxH,'rgba(10,0,25,.95)');
  ctx.strokeStyle='#8800ff'; ctx.lineWidth=2; ctx.strokeRect(10,boxY,W-20,boxH);
  T.draw(curDlg.sp+':',22,boxY+16,{size:11,color:curDlg.cl||'#fff',bold:true});
  const words=curDlg.txt.split(' ');let line='',ly=boxY+35;ctx.font='10px "Courier New",monospace';
  for(const w of words){const test=line+w+' ';if(ctx.measureText(test).width>W-50&&line!==''){T.draw(line.trim(),22,ly,{size:10,color:'#ccc',shadow:false});line=w+' ';ly+=16;}else line=test;}
  if(line)T.draw(line.trim(),22,ly,{size:10,color:'#ccc',shadow:false});
  if(gt%50<35)T.draw('[ENTER] Continuar',W-110,boxY+boxH-12,{size:9,color:'#445566'});
}

function renderPuzzle(){
  ctx.fillStyle='rgba(0,0,0,.87)'; ctx.fillRect(0,0,W,H);
  dr(W/2-132,H/2-96,264,192,'#080010'); dr(W/2-130,H/2-94,260,188,'#100018');
  const pzNames={generator:'Consertar Gerador',camera:'Hackear Câmeras',climb:'Escalar',chemicals:'Neutralizar Gás',stealth:'Desativar Sensores',circuit:'Desligar Disjuntor'};
  T.mid('🔧 '+(pzNames[pzKey]||'Puzzle').toUpperCase(),H/2-70,{size:13,color:'#aa44ff',bold:true});
  if(pzKey==='chemicals') T.mid('← → para misturar os químicos!',H/2-50,{size:10,color:'#44ffaa'});
  else T.mid('Pressione [E] repetidamente!',H/2-50,{size:10,color:'#8899aa'});
  const pulse=.75+Math.sin(gt*.22)*.25; ctx.globalAlpha=pulse;
  dr(W/2-32,H/2-38,64,52,'#1a0028'); dr(W/2-30,H/2-36,60,48,'#220033');
  T.mid(pzKey==='chemicals'?'←→':'E',H/2-11,{size:32,color:'#cc44ff',bold:true});
  ctx.globalAlpha=1;
  T.mid('⚠ Faz barulho! Atrai inimigos...',H/2+24,{size:10,color:'#aa6644'});
  dr(W/2-100,H/2+44,200,24,'#111');
  const pc2=pzProg<40?'#aa4444':(pzProg<70?'#aa8844':'#8844ff');
  dr(W/2-98,H/2+46,pzProg*1.96,20,pc2);
  T.mid(Math.floor(pzProg)+'%',H/2+56,{size:14,color:'#fff',bold:true});
  T.mid('[ESC] Cancelar',H/2+80,{size:10,color:'#445566'});
  if(gt%8<4)for(let i=0;i<4;i++)dr(W/2-30+Math.random()*64,H/2-38+Math.random()*52,2,2,Math.random()>.5?'#cc44ff':'#8844ff');
  gt++;
}

function renderPause(){
  ctx.fillStyle='rgba(0,0,0,.85)'; ctx.fillRect(0,0,W,H);
  dr(W/2-92,H/2-84,184,168,'#050010'); dr(W/2-90,H/2-82,180,164,'#0a0018');
  T.mid('⏸ PAUSADO',H/2-58,{size:16,color:'#aa44ff',bold:true});
  ['▶ Continuar','🔄 Reiniciar','🏠 Menu'].forEach((it,i)=>{
    const s=i===pauseSel;
    T.mid((s?'> ':' ')+it+(s?' <':''),H/2-16+i*34,{size:13,color:s?'#cc44ff':'#443355'});
  });
  gt++;
}

function renderDeath(){
  deathTmr++;
  const r=Math.min(18,deathTmr/8); ctx.fillStyle=`rgb(${r},0,${r*2})`; ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.07;for(let i=0;i<350;i++){ctx.fillStyle=`rgba(${Math.random()*30},0,${Math.random()*60},1)`;ctx.fillRect(Math.random()*W,Math.random()*H,2,2);}ctx.globalAlpha=1;
  if(deathTmr>30&&deathTmr<200){
    const sc=1+(deathTmr-30)/35,ey=H/2-35-(deathTmr-30)*.12,gl=Math.min(1,(deathTmr-30)/40);
    ctx.globalAlpha=gl;const es=3*sc;
    dr(W/2-50-10*sc/2-es,ey,es,es,'#f00');dr(W/2-50+10*sc/2,ey,es,es,'#f00');
    dr(W/2+30-14*sc/2-es,ey+12,es,es,'#aa00ff');dr(W/2+30+14*sc/2,ey+12,es,es,'#aa00ff');
    ctx.globalAlpha=1;
  }
  if(deathTmr>110) T.mid('💀 SISTEMA VENCEU',H/2+20,{size:20,color:'#8800ff',bold:true});
  if(deathTmr>180) T.mid('A escola permanece bloqueada...',H/2+55,{size:12,color:'#443366'});
  if(deathTmr>280&&gt%55<38) T.mid('[ENTER] Tentar novamente',H/2+95,{size:12,color:'#444'});
  ctx.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  if(Math.random()<.12){const gy=Math.random()*H;ctx.drawImage(canvas,0,gy,W,7,Math.random()*15-7,gy,W,7);}
  gt++;
}

function renderFinal(){
  finalTmr++;
  const t=Math.min(1,finalTmr/350);
  ctx.fillStyle=`rgb(${Math.floor(t*80)},${Math.floor(5+t*120)},${Math.floor(t*40)})`; ctx.fillRect(0,0,W,H);

  if(finalTmr>60){
    ctx.globalAlpha=Math.min(.85,(finalTmr-60)/80);
    // draw the 7-person group using our character renderer
    const group=[
      {shirt:'#2244aa',pants:'#eeeedd',skin:'#d4a574',hair:'#3a3a1a'},  // Enzo
      {shirt:'#225522',pants:'#224488',skin:'#8b5e3c',hair:'#1a0a00'},  // Murilo
      {shirt:'#cc2222',pants:'#111111',skin:'#d4a574',hair:'#2a1a0a'},  // Moraes
      {shirt:'#eeeeee',pants:'#226622',skin:'#d4a574',hair:'#2a1a0a'},  // Rafa
      {shirt:'#ddcc00',pants:'#111111',skin:'#d4a574',hair:'#442200'},  // Zahara
      {shirt:'#ffffff',pants:'#ffffff',skin:'#4a2a1a',hair:'#1a0a00'},  // Taylline
      {shirt:'#111111',pants:'#111111',skin:'#d4a574',hair:'#0a0000'},  // Bia
    ];
    for(let i=0;i<group.length;i++){
      const c=group[i];
      const cx=W/2-90+i*28;
      const cy=H*.52;
      const bob=Math.sin(finalTmr*.15+i)*(finalTmr<300?1.2:0);
      const arm=Math.sin(finalTmr*.2+i)*(finalTmr<300?4:0);
      drawCharacter(cx,cy,{...c,bob,armSwing:arm,alpha:ctx.globalAlpha});
    }
    ctx.globalAlpha=1;
  }

  // EMP sparks
  if(finalTmr>100&&finalTmr<260){
    for(let i=0;i<5;i++){
      ctx.strokeStyle='#8844ff';ctx.lineWidth=2;ctx.globalAlpha=.38;
      ctx.beginPath();ctx.moveTo(Math.random()*W,Math.random()*H);ctx.lineTo(Math.random()*W,Math.random()*H);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  if(finalTmr>100) T.mid('SOBRECARGA COMPLETA!',H*.14,{size:15,color:'#88ff88',bold:true});
  if(finalTmr>200){ T.mid('Bia digitou a senha.',H*.25,{size:12,color:'#aaccaa'}); T.mid('As portas explodem para fora.',H*.32,{size:11,color:'#889988'}); }
  if(finalTmr>300){ T.mid('Os sete escapam juntos.',H*.68,{size:13,color:'#aabbcc'}); T.mid('As máquinas param, uma a uma.',H*.75,{size:11,color:'#778888'}); }
  if(finalTmr>400) T.mid('"A escola é nossa de volta." — Todos',H*.82,{size:11,color:'#8899aa'});
  if(finalTmr>480){ T.mid('F  I  M',H*.9,{size:22,color:'#667788'}); T.mid('[ENTER] Menu',H-20,{size:11,color:'#445566'}); }

  dr(0,0,W,20,'#000'); dr(0,H-20,W,20,'#000');
  ctx.fillStyle='rgba(0,0,0,.06)'; for(let i=0;i<H;i+=3) ctx.fillRect(0,i,W,1);
  gt++;
}

/* ═══════════════════════════════════════════════════════════
   MAIN LOOP
═══════════════════════════════════════════════════════════ */
function loop(){
  switch(gs){
    case ST.TITLE:    renderTitle();    break;
    case ST.INTRO:    renderIntro();    break;
    case ST.DIALOGUE: renderDialogue(); break;
    case ST.PUZZLE:   renderPuzzle();   break;
    case ST.PAUSE:    renderPause();    break;
    case ST.DEATH:    renderDeath();    break;
    case ST.FINAL:
    case ST.WIN:      renderFinal();    break;
    case ST.GAME:     updateGame(); renderGame(); break;
  }
  requestAnimationFrame(loop);
}

A.init(); loop();