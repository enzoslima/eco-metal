
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 420, H = 320;
canvas.width = W; canvas.height = H;

function resizeCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.95;
  canvas.style.width = (W * s) + 'px';
  canvas.style.height = (H * s) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const TR = {
  draw(text, x, y, opts = {}) {
    const { size = 12, color = '#fff', shadow = true, bold = false } = opts;
    ctx.font = `${bold ? 'bold ' : ''}${size}px "Courier New", monospace`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(text, x + 1, y + 1); }
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  },
  box(text, x, y, opts = {}) {
    const { size = 12, color = '#fff', bg = 'rgba(0,0,0,0.88)', padding = 6, border = null } = opts;
    ctx.font = `${size}px "Courier New", monospace`;
    const w = ctx.measureText(text).width + padding * 2;
    const h = size + padding * 2;
    ctx.fillStyle = bg; ctx.fillRect(x - padding, y - h / 2, w, h);
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.strokeRect(x - padding, y - h / 2, w, h); }
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
};

const SFX = {
  c: null,
  init() { try { this.c = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} },
  unlock() { if (this.c?.state === 'suspended') this.c.resume(); },
  tone(freq, dur, type = 'square', vol = 0.08) {
    if (!this.c) return;
    try {
      const o = this.c.createOscillator(), g = this.c.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, this.c.currentTime + dur);
      o.connect(g); g.connect(this.c.destination);
      o.start(); o.stop(this.c.currentTime + dur);
    } catch(e) {}
  },
  step()   { this.tone(55 + Math.random()*20, 0.05, 'square', 0.018); },
  alert()  { this.tone(440, 0.1, 'sawtooth', 0.07); setTimeout(() => this.tone(550, 0.1, 'sawtooth', 0.07), 80); },
  dmg()    { this.tone(80, 0.28, 'sawtooth', 0.12); },
  hack()   { this.tone(800 + Math.random()*200, 0.04, 'square', 0.03); },
  hackOK() { [400,600,800,1000].forEach((f,i) => setTimeout(() => this.tone(f,0.12,'square',0.08), i*90)); },
  wolf()   { this.tone(70, 0.45, 'sawtooth', 0.09); },
  crow()   { this.tone(650, 0.12, 'square', 0.05); setTimeout(() => this.tone(800,0.08,'square',0.04), 80); },
  emp()    { this.tone(60, 0.8, 'sawtooth', 0.18); setTimeout(() => this.tone(40, 1.2, 'sine', 0.14), 400); },
  boss()   { this.tone(140, 0.3, 'sawtooth', 0.12); },
  beat()   { this.tone(50, 0.1, 'sine', 0.05); setTimeout(() => this.tone(40,0.15,'sine',0.04), 110); },
  win()    { [440,550,660,880].forEach((f,i) => setTimeout(() => this.tone(f,0.2,'square',0.09), i*110)); },
  car()    { this.tone(80,0.5,'sawtooth',0.12); setTimeout(() => this.tone(120,0.6,'sawtooth',0.14), 300); },
  fix()    { this.tone(320,0.08,'square',0.04); setTimeout(() => this.tone(400,0.08,'square',0.04), 70); }
};

const PC = {
  vx:0, vy:0, wc:0, dir:0, moving:false,
  maxSpd: 1.8, sprintSpd: 2.8, acc: 0.2, dec: 0.15,
  update(p, keys, slow=false) {
    let ix=0, iy=0;
    if (keys['ArrowLeft']||keys['KeyA']) ix--;
    if (keys['ArrowRight']||keys['KeyD']) ix++;
    if (keys['ArrowUp']||keys['KeyW']) iy--;
    if (keys['ArrowDown']||keys['KeyS']) iy++;
    if (ix&&iy){ix*=0.707;iy*=0.707;}
    const sprint = (keys['ShiftLeft']||keys['ShiftRight']) && p.stamina>0 && !slow;
    let spd = sprint ? this.sprintSpd : this.maxSpd;
    if (slow) spd *= 0.55;
    if (sprint&&(ix||iy)) p.stamina=Math.max(0,p.stamina-0.38);
    else p.stamina=Math.min(p.maxSt,p.stamina+0.1);
    if (ix||iy) {
      this.vx+=(ix*spd-this.vx)*this.acc; this.vy+=(iy*spd-this.vy)*this.acc;
      this.moving=true;
      const a=Math.atan2(this.vy,this.vx);
      if(a>-Math.PI/4&&a<=Math.PI/4) this.dir=0;
      else if(a>Math.PI/4&&a<=3*Math.PI/4) this.dir=1;
      else if(a>-3*Math.PI/4&&a<=-Math.PI/4) this.dir=3;
      else this.dir=2;
    } else {
      this.vx*=(1-this.dec); this.vy*=(1-this.dec);
      if(Math.abs(this.vx)<0.04)this.vx=0;
      if(Math.abs(this.vy)<0.04)this.vy=0;
      this.moving=Math.abs(this.vx)>0.08||Math.abs(this.vy)>0.08;
    }
    if(this.moving)this.wc+=0.12*Math.hypot(this.vx,this.vy);
    else this.wc*=0.85;
    p.x+=this.vx; p.y+=this.vy;
    return { sprint, moving: this.moving };
  },
  reset(){this.vx=0;this.vy=0;this.wc=0;this.dir=0;this.moving=false;}
};

const ST = { TITLE:0, INTRO:1, GAME:2, BOSS:3, PAUSE:4, DEATH:5, END:6, EPI:7 };
const PH = { MAYA:0, ESCORT:1, HACK:2, TOWER:3, BOSS:4, EMP:5 };
const MW = 1800, MH = 1200;

let gs=ST.TITLE, gp=PH.MAYA;
let player,maya,cam,keys={};
let flashlight,items;
let buildings=[],streets=[],lights=[];
let crows=[],wolves=[],boar={},deer={};
let reps=[];
let car={};
let rain=[],fog=[];
let txtTimer=0,txtMsg='';
let gTimer=0,iStep=0,iTimer=0;
let dTimer=0,eTimer=0,epTimer=0;
let shake=0,glitch=0,ltTimer=0,ltFlash=0;
let tSel=0,pSel=0;
let stepT=0,beatT=0;
let alarm=0;
let mHacking=false,mHackTgt=null,mHackProg=0;
let empOn=false,empR=0,empT=0;
let bossHP=3,bossStun=0;
let nearRep=null,nearCar=false,nearTower=false;
let repsFixed=0;

function px(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),w,h);}
function txt(t,x,y,o={}){TR.draw(t,x,y,o);}
function box(t,x,y,o={}){TR.box(t,x,y,o);}
function show(t){txtMsg=t;txtTimer=310;}

function init() {
  player={x:150,y:180,hp:4,maxHp:4,stamina:100,maxSt:100,hiding:false,crouching:false,inv:0,noise:0};
  maya={x:130,y:170,found:false,following:false,hacking:false,hp:3,frame:0,inv:0};
  cam={x:0,y:0};
  flashlight={on:true,bat:100};
  items={flares:3,emps:1};
  alarm=0; mHacking=false; mHackTgt=null; mHackProg=0;
  empOn=false; empR=0; empT=0;
  bossHP=3; bossStun=0; repsFixed=0;
  gp=PH.MAYA; shake=0; gTimer=0;
  PC.reset();
  genWorld();
}

function genWorld() {
  rain=[];
  for(let i=0;i<110;i++) rain.push({x:Math.random()*W,y:Math.random()*H,spd:3.2+Math.random()*3,len:5+Math.random()*7});
  fog=[];
  for(let i=0;i<35;i++) fog.push({x:Math.random()*MW,y:Math.random()*MH,r:40+Math.random()*65,a:0.03+Math.random()*0.05,dx:(Math.random()-0.5)*0.22});
  streets=[];
  for(let y=200;y<MH-100;y+=220) streets.push({x:0,y,w:MW,h:40});
  for(let x=200;x<MW-100;x+=220) streets.push({x,y:0,w:40,h:MH});
  buildings=[
    {x:60,y:50,w:160,h:110,type:'hospital',name:'Hospital Municipal',c1:'#3a3a5a',c2:'#2a2a4a'},
    {x:860,y:390,w:130,h:100,type:'garage',name:'Garagem de Elias',c1:'#4a3a2a',c2:'#3a2a1a'},
    {x:1480,y:80,w:110,h:90,type:'tower_base',name:'Torre de Transmissão',c1:'#2a2a2a',c2:'#1a1a1a'},
    {x:360,y:70,w:95,h:75,type:'house',name:'Supermercado',c1:'#2a3a2a',c2:'#1a2a1a'},
    {x:500,y:260,w:85,h:65,type:'house',name:'Farmácia',c1:'#3a2a3a',c2:'#2a1a2a'},
    {x:700,y:70,w:105,h:85,type:'house',name:'Escola',c1:'#3a2a2a',c2:'#2a1a1a'},
    {x:350,y:480,w:90,h:70,type:'house',name:'Residência A',c1:'#2a3a3a',c2:'#1a2a2a'},
    {x:550,y:490,w:85,h:65,type:'house',name:'Residência B',c1:'#3a3a2a',c2:'#2a2a1a'},
    {x:1100,y:250,w:105,h:85,type:'house',name:'Oficina',c1:'#2a2a3a',c2:'#1a1a2a'},
    {x:1300,y:410,w:95,h:75,type:'house',name:'Armazém',c1:'#3a2a2a',c2:'#2a1a1a'},
    {x:800,y:600,w:100,h:82,type:'house',name:'Igreja',c1:'#3a3a4a',c2:'#2a2a3a'},
    {x:90,y:400,w:85,h:65,type:'house',name:'Casa 1',c1:'#3a2a2a',c2:'#2a1a1a'},
    {x:90,y:600,w:85,h:65,type:'house',name:'Casa 2',c1:'#2a2a3a',c2:'#1a1a2a'},
    {x:700,y:800,w:105,h:82,type:'house',name:'Fábrica',c1:'#2a3a2a',c2:'#1a2a1a'},
    {x:1380,y:700,w:95,h:75,type:'house',name:'Posto',c1:'#2a2a2a',c2:'#1a1a1a'}
  ];
  reps=[
    {x:460,y:340,hacked:false,prog:0,name:'Repetidor Norte'},
    {x:1060,y:560,hacked:false,prog:0,name:'Repetidor Central'},
    {x:1360,y:300,hacked:false,prog:0,name:'Repetidor Leste'}
  ];
  car={x:970,y:455,tires:[true,true,true,true],inf:0,active:false};
  lights=[];
  for(let i=0;i<40;i++) lights.push({x:80+Math.random()*(MW-160),y:80+Math.random()*(MH-160),on:Math.random()>0.3,fl:Math.random()*Math.PI*2,r:40+Math.random()*30});
  crows=[];
  [{x:420,y:310},{x:820,y:210},{x:1210,y:420},{x:610,y:690},{x:1420,y:320},{x:1010,y:610}].forEach(p=>{
    crows.push({x:p.x,y:p.y,ang:Math.random()*Math.PI*2,rad:65+Math.random()*45,cx:p.x,cy:p.y,spd:0.011+Math.random()*0.007,alerting:false,aTimer:0,off:false,offT:0,frame:0,sAng:Math.random()*Math.PI*2});
  });
  wolves=[];
  [{x:700,y:360},{x:1110,y:210},{x:1310,y:610},{x:510,y:620}].forEach(p=>{
    wolves.push({x:p.x,y:p.y,mode:'patrol',pDir:Math.random()*Math.PI*2,pT:0,spd:0.75,alert:0,stun:0,frame:0,off:false,offT:0,eye:'#ffcc00'});
  });
  boar={x:1300,y:520,mode:'patrol',pDir:Math.random()*Math.PI*2,pT:0,spd:0.6,alert:0,charging:false,chargeDir:0,chargeT:0,stun:0,frame:0,off:false,offT:0,eye:'#ffcc00'};
  deer={x:1540,y:130,hp:3,mode:'idle',charging:false,chargeDir:0,chargeT:0,stun:0,frame:0,eye:'#ff0000',gearExp:false,gearT:0,atkCD:0};
}

document.addEventListener('keydown',e=>{
  keys[e.code]=true;
  SFX.unlock();

  if(gs===ST.TITLE){
    if(e.code==='ArrowUp'||e.code==='KeyW') tSel=Math.max(0,tSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS') tSel=Math.min(1,tSel+1);
    if(e.code==='Enter'||e.code==='Space'){
      if(tSel===0){gs=ST.INTRO;iStep=0;iTimer=0;init();}
      SFX.tone(300,0.08,'square',0.06);
    }
  }
  if(gs===ST.INTRO){
    if(e.code==='Enter'||e.code==='Space'){iStep++;iTimer=0;if(iStep>=6)gs=ST.GAME;}
    if(e.code==='Escape') gs=ST.GAME;
  }
  if(gs===ST.PAUSE){
    if(e.code==='Escape') gs=ST.GAME;
    if(e.code==='ArrowUp'||e.code==='KeyW') pSel=Math.max(0,pSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS') pSel=Math.min(2,pSel+1);
    if(e.code==='Enter'||e.code==='Space'){
      if(pSel===0) gs=ST.GAME;
      else if(pSel===1){init();gs=ST.GAME;}
      else gs=ST.TITLE;
    }
  }
  if(gs===ST.GAME||gs===ST.BOSS){
    if(e.code==='Escape'){gs=ST.PAUSE;pSel=0;}
    if(e.code==='KeyE') interact();
    if(e.code==='KeyM'){
      if(maya.found&&maya.following&&!mHacking&&gp===PH.HACK){
        const r=closestRep();
        if(r&&!r.hacked&&Math.hypot(player.x-r.x,player.y-r.y)<160){
          mHacking=true;mHackTgt=r;mHackProg=0;maya.hacking=true;
          show('🔵 Maya hackeando '+r.name+'... Proteja-a!');SFX.hack();
        } else show('Leve Maya perto de um Repetidor!');
      }
    }
    if(e.code==='KeyF'&&items.flares>0){
      items.flares--;
      crows.forEach(c=>{if(Math.hypot(c.x-player.x,c.y-player.y)<170){c.off=true;c.offT=280;}});
      wolves.forEach(w=>{if(Math.hypot(w.x-player.x,w.y-player.y)<160){w.stun=260;w.mode='patrol';}});
      if(Math.hypot(boar.x-player.x,boar.y-player.y)<165){boar.stun=280;boar.charging=false;boar.mode='patrol';}
      if(Math.hypot(deer.x-player.x,deer.y-player.y)<150&&gs===ST.BOSS){deer.stun=200;deer.charging=false;}
      SFX.tone(130,0.4,'sawtooth',0.1);
      show('🔥 Sinalizador! Inimigos atordoados!');
      shake=14;glitch=20;
    }
    if(e.code==='KeyQ'&&items.emps>0){
      items.emps--;
      empOn=true;empT=55;empR=0;
      SFX.emp();shake=28;glitch=40;
      crows.forEach(c=>{c.off=true;c.offT=500;});
      wolves.forEach(w=>{w.off=true;w.offT=500;w.mode='patrol';});
      boar.off=true;boar.offT=500;boar.mode='patrol';
      if(gs===ST.BOSS){deer.stun=350;deer.gearExp=true;deer.gearT=350;}
      alarm=0;
      show('⚡ EMP! Todos inimigos desativados!');
    }
    if(e.code==='KeyL'){flashlight.on=!flashlight.on;SFX.tone(flashlight.on?260:160,0.04,'square',0.03);}
    if(e.code==='KeyC'){player.crouching=!player.crouching;PC.maxSpd=player.crouching?1.0:1.8;}
  }
  if(gs===ST.DEATH||gs===ST.END||gs===ST.EPI){
    if(e.code==='Enter'||e.code==='Space'){
      if(gs===ST.END&&eTimer>480){gs=ST.EPI;epTimer=0;}
      else if(gs===ST.EPI&&epTimer>750){gs=ST.TITLE;tSel=0;}
      else if(gs===ST.DEATH){gs=ST.TITLE;tSel=0;}
    }
  }
});
document.addEventListener('keyup',e=>{keys[e.code]=false;});

function interact(){
  if(player.hiding){player.hiding=false;show('Saiu do esconderijo.');return;}
  if(!maya.found&&gp===PH.MAYA){
    const h=buildings.find(b=>b.type==='hospital');
    if(h&&Math.hypot(player.x-(h.x+h.w/2),player.y-(h.y+h.h/2))<80){
      maya.found=true;maya.following=true;maya.x=player.x+22;maya.y=player.y;
      gp=PH.ESCORT;SFX.win();show('🧒 Maya encontrada! Leve-a à garagem!');shake=10;return;
    }
  }
  if(gp===PH.ESCORT&&maya.found){
    const g=buildings.find(b=>b.type==='garage');
    if(g&&Math.hypot(player.x-(g.x+g.w/2),player.y-(g.y+g.h/2))<75){
      car.active=true;gp=PH.HACK;SFX.car();show('🚗 Garagem segura! Use [M] nos Repetidores!');shake=8;return;
    }
  }
  if(nearCar&&car.active){
    const bi=car.tires.findIndex(t=>!t);
    if(bi>=0){car.tires[bi]=true;SFX.fix();show('🔧 Pneu reparado! ('+car.tires.filter(t=>t).length+'/4)');return;}
    if(car.inf>0){car.inf=Math.max(0,car.inf-35);SFX.hack();show('💻 Infecção reduzida! ('+Math.floor(car.inf)+'%)');return;}
  }
  if(gp===PH.EMP&&nearTower){
    SFX.emp();show('⚡ Ativando EMP... SACRIFÍCIO FINAL!');shake=22;glitch=50;
    setTimeout(()=>{gs=ST.END;eTimer=0;},1800);return;
  }
  if(gs===ST.BOSS&&deer.mode==='dead'&&nearTower){
    SFX.emp();show('⚡ Ativando EMP!');shake=22;
    setTimeout(()=>{gs=ST.END;eTimer=0;},1800);return;
  }
  for(const b of buildings){
    if(b.type==='tower_base'||b.type==='hospital'||b.type==='garage') continue;
    if(Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2))<60){
      player.hiding=true;player.x=b.x+b.w/2;player.y=b.y+b.h/2;
      PC.vx=0;PC.vy=0;show('Escondido em '+b.name);return;
    }
  }
}

function closestRep(){
  let best=null,bd=Infinity;
  reps.forEach(r=>{if(r.hacked)return;const d=Math.hypot(player.x-r.x,player.y-r.y);if(d<bd){bd=d;best=r;}});
  return best;
}


// ============ DRAW FUNCTIONS ============

function drawPlayer(sx,sy){
  if(player.hiding)return;
  const bob=Math.sin(PC.wc)*(PC.moving?1.2:0);
  let x=Math.floor(sx),y=Math.floor(sy+bob);
  if(player.crouching)y+=4;
  if(player.inv>0&&Math.floor(player.inv/5)%2===0)ctx.globalAlpha=0.5;
  const sc=player.crouching?0.72:1;
  ctx.globalAlpha=(ctx.globalAlpha||1)*0.35;
  ctx.beginPath();ctx.ellipse(x,y+12,8,3,0,0,Math.PI*2);ctx.fillStyle='#000';ctx.fill();
  ctx.globalAlpha=player.inv>0&&Math.floor(player.inv/5)%2===0?0.5:1;
  px(x-4,y+5*sc,3,6*sc,'#1a1a2a');px(x+1,y+5*sc,3,6*sc,'#1a1a2a');
  px(x-4,y+10*sc,3,2,'#2a1a0a');px(x+1,y+10*sc,3,2,'#2a1a0a');
  px(x-5,y-6*sc,10,12*sc,'#1a3055');px(x-4,y-5*sc,8,10*sc,'#2a4065');
  const ao=Math.sin(PC.wc*2)*(PC.moving?6:0)*0.12;
  px(x-7,y-3*sc+ao,3,7*sc,'#2a4065');px(x-7,y+3*sc+ao,3,2,'#d4a574');
  px(x+4,y-3*sc-ao,3,7*sc,'#2a4065');px(x+4,y+3*sc-ao,3,2,'#d4a574');
  px(x+6,y+1*sc-ao,8,3,'#888');px(x+13,y-1*sc-ao,3,5,'#666');
  if(flashlight.on){px(x-10,y+1*sc+ao,6,3,'#555');px(x-14,y+1*sc+ao,3,3,'#aaa');}
  const hy=y-12*sc;
  px(x-4,hy,8,7,'#d4a574');px(x-4,hy-2,8,3,'#2a1a0a');
  px(x-5,hy,2,3,'#2a1a0a');px(x+3,hy,2,3,'#2a1a0a');
  px(x-2,hy+3,2,2,'#1a0a00');px(x+1,hy+3,2,2,'#1a0a00');
  ctx.globalAlpha=1;
}

function drawMaya(sx,sy){
  if(!maya.found)return;
  const x=Math.floor(sx),y=Math.floor(sy);
  if(x<-30||x>W+30||y<-30||y>H+30)return;
  const bob=Math.sin(gTimer*0.1)*1;
  if(maya.hacking){
    ctx.globalAlpha=0.4+Math.sin(gTimer*0.2)*0.25;
    ctx.fillStyle='#0088ff';ctx.beginPath();ctx.arc(x,y+bob,22,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath();ctx.ellipse(x,y+8+bob,5,2,0,0,Math.PI*2);ctx.fill();
  px(x-3,y-3+bob,6,8,'#aa4488');px(x-3,y-8+bob,6,5,'#d4a574');
  px(x-3,y-10+bob,6,3,'#110022');px(x-4,y-8+bob,2,4,'#110022');px(x+2,y-8+bob,2,4,'#110022');
  px(x-2,y-6+bob,1,2,'#000');px(x+1,y-6+bob,1,2,'#000');
  if(maya.hacking){
    px(x+4,y-4+bob,10,8,'#003366');px(x+5,y-3+bob,8,6,'#004488');
    if(gTimer%10<5){px(x+6,y-2+bob,2,1,'#00ffff');px(x+9,y-1+bob,3,1,'#0088ff');}
    px(x-22,y-22+bob,44,7,'#001122');
    px(x-21,y-21+bob,(mHackProg/100)*42,5,'#00aaff');
    txt(Math.floor(mHackProg)+'%',x-6,y-28+bob,{size:8,color:'#00ffff'});
  } else {
    px(x-6,y-2+bob,3,3,'#d4a574');px(x+3,y-2+bob,3,3,'#d4a574');
  }
  px(x-2,y+4+bob,2,4,'#662266');px(x+1,y+4+bob,2,4,'#662266');
  if(!maya.found&&gp===PH.MAYA){
    const d=Math.hypot(player.x-maya.x,player.y-maya.y);
    if(d<80){
      ctx.globalAlpha=0.85+Math.sin(gTimer*0.18)*0.15;
      box('[E] ENCONTRAR MAYA',x-65,y-28,{size:11,color:'#88ffff',bg:'rgba(0,40,80,0.92)',padding:6,border:'#0088ff'});
      ctx.globalAlpha=1;
    }
  }
}

function drawCrow(c){
  const x=Math.floor(c.x-cam.x),y=Math.floor(c.y-cam.y);
  if(c.off){ctx.globalAlpha=0.3;px(x-5,y-3,10,6,'#333');ctx.globalAlpha=1;return;}
  const wing=Math.sin(gTimer*0.22+c.ang*3)*4;
  px(x-8,y-2+wing,6,3,'#1a1a2a');px(x+2,y-2-wing,6,3,'#1a1a2a');
  px(x-3,y-3,6,5,'#252530');
  const ec=c.alerting?'#ff0000':'#ffcc00';
  px(x-2,y-2,2,2,ec);px(x+1,y-2,2,2,ec);
  ctx.globalAlpha=c.alerting?0.22:0.09;
  ctx.fillStyle=c.alerting?'#ff4400':'#ffff00';
  ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,120,c.sAng-0.45,c.sAng+0.45);ctx.closePath();ctx.fill();
  ctx.globalAlpha=1;
  if(c.alerting){
    ctx.globalAlpha=0.8+Math.sin(gTimer*0.2)*0.2;
    txt('!',x-3,y-14,{size:13,color:'#ff4400',bold:true});
    ctx.globalAlpha=1;
  }
}

function drawWolf(w){
  const x=Math.floor(w.x-cam.x),y=Math.floor(w.y-cam.y);
  if(w.off||w.stun>0){ctx.globalAlpha=0.3;px(x-12,y-4,24,10,'#333');ctx.globalAlpha=1;return;}
  const bob=Math.sin(w.frame*0.1)*1;
  const leg=Math.sin(w.frame*0.14)*(w.mode==='chase'?4:2);
  ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(x,y+12+bob,14,4,0,0,Math.PI*2);ctx.fill();
  px(x-10,y+2+bob,4,10,'#2a2a3a');px(x+6,y+2+bob,4,10,'#2a2a3a');
  px(x-5,y+3+leg*0.3+bob,3,9,'#3a3a4a');px(x+2,y+3-leg*0.3+bob,3,9,'#3a3a4a');
  px(x-14,y-5+bob,28,14,'#2a2a3a');px(x-12,y-4+bob,24,12,'#3a3a4a');
  px(x-10,y-3+bob,6,5,'#4a4a5a');px(x+4,y-3+bob,6,5,'#4a4a5a');
  px(x-8,y-14+bob,16,10,'#2a2a3a');px(x-12,y-8+bob,3,4,'#1a1a2a');
  px(x-6,y-12+bob,4,4,'#1a1a1a');px(x+2,y-12+bob,4,4,'#1a1a1a');
  px(x-5,y-11+bob,3,3,w.eye);px(x+3,y-11+bob,3,3,w.eye);
  ctx.globalAlpha=(w.mode==='chase'?0.5:0.22)+Math.sin(gTimer*0.07)*0.08;
  ctx.fillStyle=w.eye;
  ctx.beginPath();ctx.arc(x-3,y-9+bob,5,0,Math.PI*2);ctx.arc(x+5,y-9+bob,5,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  px(x-6,y-18+bob,3,4,'#3a3a4a');px(x+3,y-18+bob,3,4,'#3a3a4a');
}

function drawBoarSprite(sx,sy){
  const x=Math.floor(sx),y=Math.floor(sy);
  if(x<-60||x>W+60||y<-60||y>H+60)return;
  if(boar.off||boar.stun>0){ctx.globalAlpha=0.3;px(x-18,y-8,36,18,'#333');ctx.globalAlpha=1;return;}
  const bob=Math.sin(boar.frame*0.08)*1;
  const leg=Math.sin(boar.frame*0.1)*(boar.charging?5:2);
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(x,y+18+bob,20,6,0,0,Math.PI*2);ctx.fill();
  px(x-16,y+2+bob,6,14,'#3a2a1a');px(x+10,y+2+bob,6,14,'#3a2a1a');
  px(x-10,y+4+leg*0.3+bob,5,12,'#4a3a2a');px(x+5,y+4-leg*0.3+bob,5,12,'#4a3a2a');
  px(x-18,y-8+bob,36,18,'#3a2a1a');px(x-16,y-7+bob,32,16,'#4a3a2a');
  px(x-12,y-16+bob,24,12,'#3a2a1a');px(x-16,y-12+bob,6,8,'#3a2a1a');
  const tg=boar.charging?'#ffaa00':'#888';
  px(x-18,y-8+bob,3,8,tg);px(x-16,y-14+bob,3,8,tg);
  px(x-7,y-13+bob,3,3,boar.eye);px(x+4,y-13+bob,3,3,boar.eye);
  ctx.globalAlpha=(boar.mode==='chase'||boar.charging?0.5:0.22)+Math.sin(gTimer*0.07)*0.1;
  ctx.fillStyle=boar.eye;
  ctx.beginPath();ctx.arc(x-5,y-11+bob,5,0,Math.PI*2);ctx.arc(x+6,y-11+bob,5,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  boar.frame++;
}

function drawDeerBoss(sx,sy){
  if(deer.mode==='dead')return;
  const x=Math.floor(sx),y=Math.floor(sy);
  if(x<-80||x>W+80||y<-80||y>H+80)return;
  if(deer.stun>0)ctx.globalAlpha=0.6;
  const bob=Math.sin(deer.frame*0.1)*1.5;
  const leg=Math.sin(deer.frame*0.12)*(deer.mode==='chase'?4:2);
  const aurAlpha=0.3+Math.sin(gTimer*0.12)*0.15;
  ctx.globalAlpha=(deer.stun>0?0.6:1)*aurAlpha;
  ctx.fillStyle='#ffaa00';
  ctx.beginPath();ctx.arc(x,y-10,70+(3-bossHP)*15,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=deer.stun>0?0.6:1;
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(x,y+22+bob,17,5,0,0,Math.PI*2);ctx.fill();
  px(x-12,y+3+bob,4,18,'#6a5a2a');px(x+8,y+3+bob,4,18,'#6a5a2a');
  px(x-6,y+5+leg*0.4+bob,3,16,'#7a6a3a');px(x+3,y+5-leg*0.4+bob,3,16,'#7a6a3a');
  px(x-12,y-4+bob,24,12,'#8a7a3a');px(x-10,y-3+bob,20,10,'#9a8a4a');
  px(x-9,y-2+bob,6,5,'#ccaa22');px(x+3,y-2+bob,6,5,'#ccaa22');
  px(x-4,y-10+bob,8,7,'#8a7a3a');px(x-8,y-22+bob,16,13,'#8a7a3a');
  px(x-6,y-20+bob,4,4,'#1a0a0a');px(x+2,y-20+bob,4,4,'#1a0a0a');
  const eyeCol=deer.stun>0?'#ff0':'#ff0000';
  px(x-5,y-19+bob,3,3,eyeCol);px(x+3,y-19+bob,3,3,eyeCol);
  ctx.globalAlpha=(deer.stun>0?0.22:0.55)+Math.sin(gTimer*0.1)*0.15;
  ctx.fillStyle='#ff0000';
  ctx.beginPath();ctx.arc(x-3,y-17+bob,6,0,Math.PI*2);ctx.arc(x+5,y-17+bob,6,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=deer.stun>0?0.6:1;
  px(x-5,y-28+bob,2,7,'#ccaa22');px(x-8,y-32+bob,2,6,'#ddbb33');px(x-10,y-35+bob,2,4,'#eebb22');
  px(x+3,y-28+bob,2,7,'#ccaa22');px(x+6,y-32+bob,2,6,'#ddbb33');px(x+8,y-35+bob,2,4,'#eebb22');
  if(deer.gearExp){
    const gAlpha=0.7+Math.sin(gTimer*0.25)*0.3;
    ctx.globalAlpha=gAlpha;
    px(x-6,y-5+bob,12,12,'#aaaaaa');px(x-4,y-3+bob,8,8,'#888888');px(x-2,y-1+bob,4,4,'#ff4400');
    ctx.globalAlpha=1;
    txt('⚙ [E]',x-14,y-20+bob,{size:10,color:'#ff4400',bold:true});
    if(Math.hypot(player.x-deer.x,player.y-deer.y)<55&&keys['KeyE']){
      bossHP--;deer.gearExp=false;deer.gearT=0;deer.stun=0;
      SFX.boss();shake=20;glitch=30;
      if(bossHP<=0){
        deer.mode='dead';gp=PH.EMP;
        show('🦌 Cervo-01 destruído! Vá à Torre [E]!');
        SFX.win();shake=28;
      } else {
        show('⚙ Engrenagem atingida! Restam: '+bossHP);
      }
    }
  }
  const bw=160,bx2=W/2-80;
  px(bx2,H-32,bw,12,'#1a0000');
  px(bx2+1,H-31,(bossHP/3)*(bw-2),10,'#cc2200');
  txt('CERVO-01: '+bossHP+'/3',bx2+30,H-25,{size:9,color:'#ff4444'});
  ctx.globalAlpha=1;
  deer.frame++;
}

function drawCar(){
  const x=Math.floor(car.x-cam.x),y=Math.floor(car.y-cam.y);
  if(x<-80||x>W+80||y<-60||y>H+60)return;
  ctx.globalAlpha=car.inf>50?0.35+Math.sin(gTimer*0.2)*0.18:0.12;
  ctx.fillStyle=car.inf>70?'#0044ff':'#004400';
  ctx.beginPath();ctx.arc(x,y,52,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(x,y+18,28,6,0,0,Math.PI*2);ctx.fill();
  px(x-30,y-10,60,20,'#3a3a2a');px(x-28,y-8,56,16,'#4a4a3a');
  px(x+8,y-20,22,12,'#3a3a2a');px(x+10,y-18,18,9,'#2a3a4a');px(x+12,y-17,14,7,'#2a3a4a');
  px(x-28,y-14,34,4,'#2a2a1a');
  car.tires.forEach((ok,i)=>{
    const tx=i<2?x-22:x+12,ty=i%2===0?y+6:y+10;
    px(tx,ty,12,12,ok?'#111':'#aa0000');
    px(tx+1,ty+1,10,10,ok?'#222':'#880000');
  });
  if(car.active&&gTimer%38<26){
    px(x+28,y-4,4,6,'#ffff88');
    ctx.globalAlpha=0.3;ctx.fillStyle='#ffff88';
    ctx.beginPath();ctx.arc(x+32,y-1,18,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  px(x-30,y-2,3,4,'#aa2222');
  if(nearCar&&car.active){
    const broken=car.tires.filter(t=>!t).length;
    ctx.globalAlpha=0.8+Math.sin(gTimer*0.15)*0.18;
    if(broken>0){
      box('[E] Reparar pneu ('+broken+' furado)',x-80,y-48,{size:10,color:'#ffdd44',bg:'rgba(60,40,0,0.92)',padding:6,border:'#ffaa00'});
    } else if(car.inf>0){
      box('[E] Limpar infecção',x-60,y-48,{size:10,color:'#88aaff',bg:'rgba(0,20,60,0.92)',padding:6,border:'#0044ff'});
    }
    ctx.globalAlpha=1;
  }
}

function drawBuilding(b){
  const x=Math.floor(b.x-cam.x),y=Math.floor(b.y-cam.y);
  if(x<-180||x>W+180||y<-180||y>H+100)return;
  ctx.fillStyle='rgba(0,0,0,0.28)';ctx.fillRect(x+5,y+b.h,b.w-4,7);
  px(x,y,b.w,b.h,b.c1);px(x+2,y+2,b.w-4,b.h-4,b.c2);
  for(let wi=0;wi<Math.floor(b.w/18);wi++){
    for(let wj=0;wj<Math.floor(b.h/18);wj++){
      const wx=x+6+wi*16,wy=y+6+wj*14;
      const lit=Math.sin(wx*0.3+wy*0.2+gTimer*0.001)>0.6;
      ctx.fillStyle=lit?'#1a1a2a':'#0a0a14';ctx.fillRect(wx,wy,8,8);
    }
  }
  if(b.type==='hospital'){
    px(x+b.w/2-3,y+8,6,16,'#cc2222');px(x+b.w/2-8,y+12,16,6,'#cc2222');
    txt('HOSPITAL',x+6,y-10,{size:9,color:'#aa4444'});
    if(!maya.found&&gp===PH.MAYA){
      const d=Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2));
      if(d<90){
        ctx.globalAlpha=0.85+Math.sin(gTimer*0.18)*0.15;
        box('[E] Encontrar Maya',x+6,y-22,{size:10,color:'#88ffff',bg:'rgba(0,30,60,0.92)',padding:6,border:'#0088ff'});
        ctx.globalAlpha=1;
      }
    }
  } else if(b.type==='garage'){
    txt('GARAGEM',x+5,y-10,{size:9,color:'#aa8844'});
    if(gp===PH.ESCORT&&maya.found){
      const d=Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2));
      if(d<85){
        ctx.globalAlpha=0.85;
        box('[E] Levar Maya aqui!',x-10,y-22,{size:10,color:'#ffdd44',bg:'rgba(60,40,0,0.92)',padding:6,border:'#ffaa00'});
        ctx.globalAlpha=1;
      }
    }
  } else if(b.type==='tower_base'){
    txt('TORRE',x+10,y-10,{size:9,color:'#4444aa'});
  } else {
    const d=Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2));
    if(d<62&&!player.hiding){
      ctx.globalAlpha=0.72+Math.sin(gTimer*0.08)*0.2;
      box('[E] Esconder',x+6,y-18,{size:9,color:'#afa',bg:'rgba(0,40,0,0.88)',padding:4});
      ctx.globalAlpha=1;
    }
  }
}

function drawRepeater(r){
  const x=Math.floor(r.x-cam.x),y=Math.floor(r.y-cam.y);
  if(x<-50||x>W+50||y<-50||y>H+50)return;
  px(x-3,y-30,6,30,'#3a3a4a');px(x-16,y-35,32,8,'#2a2a3a');px(x-14,y-38,28,5,'#3a3a4a');
  const col=r.hacked?'#00ff88':(gTimer%35<18?'#ff4444':'#aa2222');
  px(x-5,y-42,10,6,col);
  ctx.globalAlpha=0.3+Math.sin(gTimer*0.12)*0.15;
  ctx.fillStyle=r.hacked?'#00ff88':'#ff4444';
  ctx.beginPath();ctx.arc(x,y-39,12,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  if(r.prog>0&&!r.hacked){
    px(x-30,y-55,60,8,'#111');
    px(x-29,y-54,(r.prog/100)*58,6,'#0088ff');
    txt(Math.floor(r.prog)+'%',x-8,y-50,{size:8,color:'#00ffff'});
  }
  if(!r.hacked){
    const d=Math.hypot(player.x-r.x,player.y-r.y);
    if(d<160&&gp===PH.HACK){
      ctx.globalAlpha=0.82+Math.sin(gTimer*0.18)*0.18;
      box('[M] Maya hackear: '+r.name,x-80,y-62,{size:10,color:'#00ffff',bg:'rgba(0,20,50,0.92)',padding:6,border:'#0088ff'});
      ctx.globalAlpha=1;
    }
  }
}

function drawTower(){
  const x=Math.floor(1540-cam.x),y=Math.floor(130-cam.y);
  if(x<-100||x>W+100||y<-200||y>H+50)return;
  px(x-3,y-110,6,110,'#2a2a3a');
  px(x-30,y-105,60,6,'#2a2a3a');px(x-22,y-80,44,5,'#2a2a3a');
  px(x-15,y-55,30,4,'#2a2a3a');px(x-8,y-30,16,3,'#2a2a3a');
  const ac=gp>=PH.BOSS?'#0044ff':'#ff4400';
  if(gTimer%22<11){
    px(x-2,y-125,4,15,ac);
    ctx.globalAlpha=0.4+Math.sin(gTimer*0.15)*0.2;
    ctx.fillStyle=ac;ctx.beginPath();ctx.arc(x,y-122,18,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  const d=Math.hypot(player.x-1540,player.y-130);
  if(d<100){
    ctx.globalAlpha=0.85+Math.sin(gTimer*0.15)*0.15;
    if(gp===PH.EMP||deer.mode==='dead'){
      box('[E] ATIVAR EMP — SACRIFÍCIO FINAL',x-115,y-138,{size:10,color:'#88ffff',bg:'rgba(0,20,60,0.95)',padding:7,border:'#0088ff'});
    } else if(gp===PH.TOWER){
      box('Chegue à Torre!',x-55,y-138,{size:10,color:'#ffdd44',bg:'rgba(60,40,0,0.92)',padding:6});
    }
    ctx.globalAlpha=1;
  }
}

function drawEMP(){
  if(!empOn)return;
  const cx=player.x-cam.x,cy=player.y-cam.y;
  ctx.globalAlpha=Math.max(0,0.5-empR/300);
  ctx.strokeStyle='#0088ff';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(cx,cy,empR,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=Math.max(0,0.25-empR/600);
  ctx.strokeStyle='#00ffff';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(cx,cy,empR*0.7,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=1;
}

function drawDarkness(){
  const ppx=player.x-cam.x,ppy=player.y-cam.y-5;
  const off=document.createElement('canvas');off.width=W;off.height=H;
  const oc=off.getContext('2d');
  const dark=0.88-(ltFlash>0?ltFlash*0.018:0);
  oc.fillStyle=`rgba(2,4,15,${dark})`;oc.fillRect(0,0,W,H);
  if(flashlight.on&&!player.hiding&&flashlight.bat>0){
    const fl=flashlight.bat<18?(Math.random()>0.22?1:0.38):1;
    const r=(58+flashlight.bat*0.26)*fl;
    oc.globalCompositeOperation='destination-out';
    oc.fillStyle='rgba(0,0,0,1)';
    oc.beginPath();oc.arc(ppx,ppy,r*0.74,0,Math.PI*2);oc.fill();
    oc.globalCompositeOperation='source-over';
    const gr=oc.createRadialGradient(ppx,ppy,4,ppx,ppy,r);
    gr.addColorStop(0,'rgba(2,4,15,0)');
    gr.addColorStop(0.55,'rgba(2,4,15,0.12)');
    gr.addColorStop(1,`rgba(2,4,15,${dark})`);
    oc.fillStyle=gr;oc.beginPath();oc.arc(ppx,ppy,r,0,Math.PI*2);oc.fill();
  }
  lights.forEach(sl=>{
    if(!sl.on)return;
    const sx=sl.x-cam.x,sy=sl.y-cam.y;
    if(Math.sin(gTimer*0.09+sl.fl)<=-0.88)return;
    oc.globalCompositeOperation='destination-out';
    oc.fillStyle='rgba(0,0,0,0.35)';
    oc.beginPath();oc.arc(sx,sy-28,sl.r,0,Math.PI*2);oc.fill();
    oc.globalCompositeOperation='source-over';
  });
  const cut=(ex,ey,er)=>{
    oc.globalCompositeOperation='destination-out';
    oc.fillStyle='rgba(0,0,0,0.45)';
    oc.beginPath();oc.arc(ex,ey,er,0,Math.PI*2);oc.fill();
    oc.globalCompositeOperation='source-over';
  };
  wolves.forEach(w=>{if(!w.off&&w.stun<=0)cut(w.x-cam.x,w.y-cam.y-10,w.mode==='chase'?22:12);});
  if(!boar.off&&boar.stun<=0)cut(boar.x-cam.x,boar.y-cam.y-10,boar.mode==='chase'?28:14);
  if(gs===ST.BOSS&&deer.mode!=='dead')cut(deer.x-cam.x,deer.y-cam.y-18,38);
  if(empOn){
    oc.globalCompositeOperation='destination-out';
    oc.fillStyle='rgba(0,0,0,0.8)';
    oc.beginPath();oc.arc(ppx,ppy,empR*0.85,0,Math.PI*2);oc.fill();
    oc.globalCompositeOperation='source-over';
  }
  if(car.active)cut(car.x-cam.x,car.y-cam.y,40);
  ctx.drawImage(off,0,0);
}

function drawVHS(){
  ctx.fillStyle='rgba(0,0,0,0.09)';
  for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  if(glitch>0){
    for(let i=0;i<2;i++){
      const gy=Math.random()*H,gh=2+Math.random()*5;
      ctx.drawImage(canvas,0,gy,W,gh,Math.random()*10-5,gy,W,gh);
    }
    glitch--;
  }
  if(Math.random()<0.012)glitch=Math.floor(Math.random()*7)+2;
  ctx.globalAlpha=0.025;
  ctx.fillStyle='#00f';ctx.fillRect(0,0,2,H);
  ctx.fillStyle='#0ff';ctx.fillRect(W-2,0,2,H);
  ctx.globalAlpha=1;
  const vg=ctx.createRadialGradient(W/2,H/2,W*0.18,W/2,H/2,W*0.74);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.52)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  if((gs===ST.GAME||gs===ST.BOSS)&&gTimer%82<55){
    ctx.fillStyle='#0044cc';ctx.beginPath();ctx.arc(14,16,5,0,Math.PI*2);ctx.fill();
    txt('REC',24,16,{size:11,color:'#0033aa'});
  }
  const mins=Math.floor(gTimer/3600),secs=Math.floor((gTimer/60)%60);
  txt(String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0'),W-48,16,{size:11,color:'#556'});
}

function drawHUD(){
  const hy=H-25;
  px(10,hy-10,95,32,'rgba(0,0,8,0.75)');
  txt('VIDA',14,hy-3,{size:10,color:'#4466aa'});
  for(let i=0;i<player.maxHp;i++){
    px(14+i*14,hy+6,12,10,i<player.hp?'#2244aa':'#222');
    if(i<player.hp)px(15+i*14,hy+7,10,8,'#4488ff');
  }
  if(player.stamina<player.maxSt){
    px(68,hy-3,35,6,'#222');
    px(69,hy-2,(player.stamina/player.maxSt)*33,4,player.stamina<30?'#aa4':'#44a');
  }
  const iy=H-64;
  px(10,iy-8,160,34,'rgba(0,0,8,0.75)');
  txt('🔥 Sinalizadores [F]: '+items.flares,14,iy,{size:10,color:'#f84'});
  txt('⚡ EMP [Q]: '+items.emps,14,iy+14,{size:10,color:'#4488ff'});
  const py2=H-108;
  px(10,py2-8,170,44,'rgba(0,0,8,0.75)');
  const phTxt=['🏥 Encontre Maya no Hospital','🚗 Leve Maya à Garagem','📡 Hackeie 3 Repetidores [M]','🗼 Vá à Torre!','🦌 Destrua Cervo-01!','⚡ Ative EMP na Torre [E]'];
  const phCol=['#88aaff','#ffdd44','#00ffff','#ff8844','#ff4444','#00ffff'];
  txt(phTxt[gp]||'',14,py2,{size:9,color:phCol[gp]||'#fff'});
  if(gp===PH.HACK||gp>=PH.TOWER){
    const rf=reps.filter(r=>r.hacked).length;
    txt('📡 Repetidores: '+rf+'/3',14,py2+13,{size:9,color:rf>=3?'#88ff88':'#00aaff'});
  }
  const bc=flashlight.bat>50?'#44aaff':flashlight.bat>25?'#aa44ff':'#aa2244';
  txt('💡 [L]: '+Math.floor(flashlight.bat)+'%',14,py2+26,{size:9,color:bc});
  if(gp===PH.MAYA||gp===PH.ESCORT||gp===PH.TOWER){
    let tx=130,ty=160;
    if(gp===PH.ESCORT){tx=920;ty=480;}
    if(gp===PH.TOWER){tx=1540;ty=130;}
    const ang=Math.atan2(ty-player.y,tx-player.x);
    ctx.globalAlpha=0.75+Math.sin(gTimer*0.14)*0.22;
    ctx.save();ctx.translate(W-28,60);ctx.rotate(ang);
    ctx.fillStyle=gp===PH.TOWER?'#ff8844':'#00aaff';
    ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-7);ctx.lineTo(-4,0);ctx.lineTo(-8,7);ctx.closePath();ctx.fill();
    ctx.restore();ctx.globalAlpha=1;
    txt(Math.floor(Math.hypot(tx-player.x,ty-player.y))+'m',W-42,76,{size:8,color:'#88aaff'});
  }
  if(car.active&&car.inf>60&&gTimer%50<32)txt('⚠ CARRO INFECTADO!',W/2-72,H-14,{size:11,color:'#0055ff',bold:true});
  if(alarm>0){
    const ac=alarm>70?'#f44':alarm>35?'#fa4':'#ff4';
    px(W/2-68,10,136,28,'rgba(0,0,8,0.88)');
    txt('⚠ ALERTA: '+Math.floor(alarm)+'%',W/2-58,18,{size:12,color:ac,bold:true});
    px(W/2-54,28,108,6,'#222');px(W/2-54,28,alarm*1.08,6,ac);
  }
  if(player.crouching)txt('AGACHADO [C]',W-100,H-14,{size:9,color:'#8a8'});
  if(mHacking&&gTimer%30<20)txt('🔵 PROTEJA MAYA!',W/2-68,52,{size:14,color:'#00ffff',bold:true});
  if(gs===ST.BOSS&&deer.mode!=='dead'&&gTimer%38<24)txt('!! CERVO-01 ATIVO !!',W/2-80,52,{size:13,color:'#f00',bold:true});
  if(txtTimer>0){
    ctx.globalAlpha=Math.min(1,txtTimer/65);
    box(txtMsg,W/2-txtMsg.length*3.6,H/2+98,{size:13,color:'#fff',bg:'rgba(0,0,0,0.94)',padding:12});
    ctx.globalAlpha=1;
  }
  if(gTimer<700){
    ctx.globalAlpha=Math.max(0,1-gTimer/700);
    txt('[E] Interagir | [M] Hackear | [F] Sinalizador | [Q] EMP | [C] Agachar',12,32,{size:8,color:'#334'});
    ctx.globalAlpha=1;
  }
}

// ============ AI ============
function aiCrows(){
  crows.forEach(c=>{
    if(c.off){c.offT--;if(c.offT<=0){c.off=false;c.alerting=false;}return;}
    c.ang+=c.spd;c.x=c.cx+Math.cos(c.ang)*c.rad;c.y=c.cy+Math.sin(c.ang)*c.rad;
    c.sAng+=0.018;if(c.aTimer>0){c.aTimer--;if(c.aTimer<=0)c.alerting=false;}
    if(player.hiding)return;
    const dx=player.x-c.x,dy=player.y-c.y,dist=Math.hypot(dx,dy);
    const angP=Math.atan2(dy,dx),diff=Math.abs(((angP-c.sAng)+Math.PI*3)%(Math.PI*2)-Math.PI);
    if(dist<140&&diff<0.5&&!c.alerting){
      c.alerting=true;c.aTimer=200;alarm=Math.min(100,alarm+28);
      SFX.crow();show('🐦 Corvo-Vigia detectou você!');
      boar.alert=Math.min(100,boar.alert+45);if(boar.mode==='patrol')boar.mode='alert';
    }
    if(c.alerting&&dist<200)wolves.forEach(w=>{if(!w.off&&w.stun<=0){w.alert=Math.min(100,w.alert+15);if(w.mode==='patrol')w.mode='alert';}});
    c.frame++;
  });
}

function aiWolves(){
  wolves.forEach(w=>{
    if(w.off){w.offT--;if(w.offT<=0)w.off=false;return;}
    if(w.stun>0){w.stun--;w.frame++;return;}
    const dxP=player.x-w.x,dyP=player.y-w.y,distP=Math.hypot(dxP,dyP);
    const dxC=car.x-w.x,dyC=car.y-w.y,distC=Math.hypot(dxC,dyC);
    if(!player.hiding&&distP<150)w.alert=Math.min(100,w.alert+1.2);
    else w.alert=Math.max(0,w.alert-0.25);
    if(w.alert>=100&&w.mode!=='chase'){w.mode='chase';w.eye='#ff0000';w.spd=1.4;SFX.wolf();shake=8;glitch=12;}
    if(w.mode==='patrol'){w.eye='#ffcc00';w.spd=0.6;w.pT++;if(w.pT>220){w.pT=0;w.pDir=Math.random()*Math.PI*2;}w.x+=Math.cos(w.pDir)*w.spd;w.y+=Math.sin(w.pDir)*w.spd;if(w.alert>35)w.mode='alert';}
    if(w.mode==='alert'){
      w.eye='#ffaa00';w.spd=0.85;
      if(car.active&&distC<250){
        if(distC>20){w.x+=(dxC/distC)*w.spd;w.y+=(dyC/distC)*w.spd;}
        if(distC<30&&gTimer%90===0){const ti=car.tires.findIndex(t=>t);if(ti>=0){car.tires[ti]=false;show('🐺 Lobo furou pneu! [E] no carro!');SFX.wolf();shake=10;}}
      } else {if(distP>12){w.x+=(dxP/distP)*w.spd;w.y+=(dyP/distP)*w.spd;}}
      if(w.alert<=25){w.mode='patrol';}
    }
    if(w.mode==='chase'){
      w.eye='#ff0000';w.spd=1.4;
      if(distP>12){w.x+=(dxP/distP)*w.spd;w.y+=(dyP/distP)*w.spd;}
      if(distP<22&&!player.hiding&&player.inv<=0){
        player.hp--;player.inv=120;shake=25;glitch=30;SFX.dmg();
        if(player.hp<=0){gs=ST.DEATH;dTimer=0;}
        else{player.x-=(dxP/distP)*55;player.y-=(dyP/distP)*55;w.mode='alert';w.alert=60;show('🐺 Lobo atacou! Vida: '+player.hp);}
      }
      if(player.hiding){w.alert-=1.8;if(w.alert<=0)w.mode='patrol';}
      if(distP>320){w.alert-=1;if(w.alert<=0)w.mode='patrol';}
    }
    w.x=Math.max(20,Math.min(MW-20,w.x));w.y=Math.max(20,Math.min(MH-20,w.y));w.frame++;
  });
}

function aiBoar(){
  if(boar.off){boar.offT--;if(boar.offT<=0)boar.off=false;return;}
  if(boar.stun>0){boar.stun--;boar.charging=false;boar.frame++;return;}
  const dx=player.x-boar.x,dy=player.y-boar.y,dist=Math.hypot(dx,dy);
  if(boar.charging){
    boar.chargeT--;boar.x+=Math.cos(boar.chargeDir)*3.8;boar.y+=Math.sin(boar.chargeDir)*3.8;
    if(dist<28&&!player.hiding&&player.inv<=0){
      player.hp-=2;player.inv=150;shake=35;glitch=45;SFX.dmg();
      if(player.hp<=0){gs=ST.DEATH;dTimer=0;}
      else{player.x-=Math.cos(boar.chargeDir)*75;player.y-=Math.sin(boar.chargeDir)*75;boar.charging=false;boar.mode='patrol';boar.alert=35;show('💥 Javali atacou! Vida: '+player.hp);}
    }
    if(boar.chargeT<=0){boar.charging=false;boar.mode='alert';boar.alert=55;}
    boar.frame++;return;
  }
  if(!player.hiding&&dist<145)boar.alert=Math.min(100,boar.alert+0.9);
  else boar.alert=Math.max(0,boar.alert-0.28);
  if(boar.alert>=100&&boar.mode!=='chase'){boar.mode='chase';boar.eye='#ff0000';boar.spd=1.1;SFX.alert();glitch=14;}
  if(boar.mode==='patrol'){boar.eye='#ffcc00';boar.spd=0.38;boar.pT++;if(boar.pT>240){boar.pT=0;boar.pDir=Math.random()*Math.PI*2;}boar.x+=Math.cos(boar.pDir)*boar.spd;boar.y+=Math.sin(boar.pDir)*boar.spd;if(boar.alert>38)boar.mode='alert';}
  if(boar.mode==='alert'){boar.eye='#ffaa00';boar.spd=0.6;if(dist>12){boar.x+=(dx/dist)*boar.spd;boar.y+=(dy/dist)*boar.spd;}if(boar.alert<=28)boar.mode='patrol';}
  if(boar.mode==='chase'){
    boar.eye='#ff0000';boar.spd=1.15;
    if(dist<130&&dist>45&&!boar.charging){boar.charging=true;boar.chargeDir=Math.atan2(dy,dx);boar.chargeT=65;SFX.boss();show('🐗 Javali investindo!');}
    if(dist>15&&!boar.charging){boar.x+=(dx/dist)*boar.spd;boar.y+=(dy/dist)*boar.spd;}
    if(player.hiding){boar.alert-=1.6;if(boar.alert<=0)boar.mode='patrol';}
    if(dist>360){boar.alert-=1.1;if(boar.alert<=0)boar.mode='patrol';}
  }
  boar.x=Math.max(30,Math.min(MW-30,boar.x));boar.y=Math.max(30,Math.min(MH-30,boar.y));boar.frame++;
}

function aiBoss(){
  if(gp<PH.BOSS||deer.mode==='dead')return;
  if(deer.stun>0){deer.stun--;deer.frame++;return;}
  if(deer.gearT>0)deer.gearT--;if(deer.gearT<=0)deer.gearExp=false;
  if(deer.atkCD>0)deer.atkCD--;
  const dx=player.x-deer.x,dy=player.y-deer.y,dist=Math.hypot(dx,dy);
  deer.mode=dist>20?'chase':'idle';
  if(deer.mode==='chase'){const spd=1.5+(3-bossHP)*0.35;deer.x+=(dx/dist)*spd;deer.y+=(dy/dist)*spd;}
  if(dist<140&&dist>50&&!deer.charging&&deer.atkCD<=0){
    deer.charging=true;deer.chargeDir=Math.atan2(dy,dx);deer.chargeT=55;deer.atkCD=180;
    SFX.boss();shake=14;glitch=18;show('🦌 Cervo investindo!');
  }
  if(deer.charging){
    deer.chargeT--;deer.x+=Math.cos(deer.chargeDir)*4.5;deer.y+=Math.sin(deer.chargeDir)*4.5;
    if(dist<30&&player.inv<=0){
      player.hp-=2;player.inv=150;shake=38;glitch=50;SFX.dmg();
      if(player.hp<=0){gs=ST.DEATH;dTimer=0;}
      else{player.x-=Math.cos(deer.chargeDir)*80;player.y-=Math.sin(deer.chargeDir)*80;show('💔 Cervo atingiu! Vida: '+player.hp);}
    }
    if(deer.chargeT<=0){deer.charging=false;deer.stun=90;deer.gearExp=true;deer.gearT=90;show('⚙ Atordoado! Ataque a engrenagem! [E]');shake=12;}
  }
  deer.x=Math.max(60,Math.min(MW-60,deer.x));deer.y=Math.max(60,Math.min(MH-60,deer.y));deer.frame++;
}

// ============ UPDATE ============
function update(){
  gTimer++;alarm=Math.max(0,alarm-0.08);player.noise=Math.max(0,player.noise-0.5);
  if(!player.hiding){
    const mv=PC.update(player,keys,mHacking);
    if(mv.moving){stepT++;const iv=mv.sprint?9:player.crouching?24:15;if(stepT>iv){stepT=0;SFX.step();player.noise+=mv.sprint?8:player.crouching?1:3;}}
    player.x=Math.max(12,Math.min(MW-12,player.x));player.y=Math.max(12,Math.min(MH-12,player.y));
    buildings.forEach(b=>{
      if(player.x>b.x&&player.x<b.x+b.w&&player.y>b.y&&player.y<b.y+b.h){
        const doorX=b.x+b.w/2,doorY=b.y+b.h;
        if(!(Math.abs(player.x-doorX)<14&&Math.abs(player.y-doorY)<18)){player.x+=(player.x-(b.x+b.w/2))*0.14;player.y+=(player.y-(b.y+b.h/2))*0.14;PC.vx*=0.3;PC.vy*=0.3;}
      }
    });
  }
  if(maya.found&&maya.following&&!mHacking){
    const ang=Math.atan2(PC.vy||0.01,PC.vx||0.01)+Math.PI;
    maya.x+=(player.x+Math.cos(ang)*28-maya.x)*0.07;
    maya.y+=(player.y+Math.sin(ang)*28-maya.y)*0.07;
  }
  if(mHacking&&mHackTgt){
    mHackProg+=0.55;mHackTgt.prog=mHackProg;SFX.hack();player.noise+=2;
    if(mHackProg>=100){
      mHackTgt.hacked=true;mHackTgt.prog=100;repsFixed++;
      mHacking=false;maya.hacking=false;mHackTgt=null;mHackProg=0;
      SFX.hackOK();glitch=22;shake=12;show('✅ Repetidor hackeado! ('+repsFixed+'/3)');
      if(repsFixed>=3){gp=PH.TOWER;show('📡 Todos hackeados! Vá à Torre!');SFX.win();}
    }
  }
  nearTower=Math.hypot(player.x-1540,player.y-130)<90;
  if(nearTower&&gp===PH.TOWER){gp=PH.BOSS;deer.x=1540;deer.y=200;deer.mode='chase';gs=ST.BOSS;show('🦌 CERVO-01 EMERGINDO!');SFX.boss();shake=22;glitch=35;}
  nearCar=Math.hypot(player.x-car.x,player.y-car.y)<70;
  if(nearCar&&car.active)car.inf=Math.max(0,car.inf-0.12);
  if(car.active&&gTimer%180===0){car.inf=Math.min(100,car.inf+4);if(car.inf>=100)show('⚠ Carro infectado! [E] para limpar!');}
  if(player.inv>0)player.inv--;
  if(flashlight.on){flashlight.bat-=0.012;if(flashlight.bat<=0){flashlight.bat=0;flashlight.on=false;show('💡 Bateria esgotada!');}}
  else flashlight.bat=Math.min(100,flashlight.bat+0.004);
  if(empOn){empR+=4.5;empT--;if(empT<=0||empR>300)empOn=false;}
  rain.forEach(r=>{r.y+=r.spd;r.x-=0.6;if(r.y>H){r.y=-r.len;r.x=Math.random()*W;}if(r.x<0)r.x=W;});
  fog.forEach(f=>{f.x+=f.dx;if(f.x<-80)f.x=MW+80;if(f.x>MW+80)f.x=-80;});
  ltTimer++;if(ltTimer>650+Math.random()*900){ltFlash=20;ltTimer=0;}if(ltFlash>0)ltFlash-=0.75;
  if(txtTimer>0)txtTimer--;
  const minD=Math.min(...wolves.map(w=>Math.hypot(player.x-w.x,player.y-w.y)),Math.hypot(player.x-boar.x,player.y-boar.y),gp>=PH.BOSS?Math.hypot(player.x-deer.x,player.y-deer.y):9999);
  beatT++;const bi=Math.max(16,72-(210-Math.min(210,minD))*0.3);if(beatT>bi&&minD<210){beatT=0;SFX.beat();}
  cam.x+=(player.x-W/2-cam.x)*0.075;cam.y+=(player.y-H/2-cam.y)*0.075;
  cam.x=Math.max(0,Math.min(MW-W,cam.x));cam.y=Math.max(0,Math.min(MH-H,cam.y));
  if(shake>0){cam.x+=(Math.random()-0.5)*shake;cam.y+=(Math.random()-0.5)*shake;shake*=0.84;if(shake<0.4)shake=0;}
  aiCrows();aiWolves();aiBoar();if(gs===ST.BOSS)aiBoss();
}

// ============ RENDER GAME ============
function renderGame(){
  ctx.fillStyle='#02020f';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';
  for(let i=0;i<25;i++){const sx=(i*51+gTimer*0.006)%W,sy=(i*37)%(H*0.3);ctx.globalAlpha=0.2+Math.sin(gTimer*0.04+i)*0.12;ctx.fillRect(Math.floor(sx),Math.floor(sy),1,1);}
  ctx.globalAlpha=1;
  ctx.fillStyle='#0a0a10';ctx.fillRect(0,0,W,H);
  streets.forEach(s=>{
    const sx=Math.floor(s.x-cam.x),sy=Math.floor(s.y-cam.y);
    if(sx>W+s.w||sx+s.w<0||sy>H+s.h||sy+s.h<0)return;
    ctx.fillStyle='#111118';ctx.fillRect(sx,sy,s.w,s.h);
    if(s.h<s.w){for(let mx=sx;mx<sx+s.w;mx+=55){ctx.fillStyle='#1a1a22';ctx.fillRect(mx,sy+s.h/2-2,28,4);}}
  });
  lights.forEach(sl=>{
    const slx=Math.floor(sl.x-cam.x),sly=Math.floor(sl.y-cam.y);
    if(slx<-30||slx>W+30||sly<-60||sly>H+20)return;
    px(slx-1,sly-30,3,30,'#3a3a4a');px(slx-4,sly-32,8,4,'#4a4a5a');
    if(sl.on){ctx.globalAlpha=Math.sin(gTimer*0.09+sl.fl)>-0.88?0.7:0.15;ctx.fillStyle='#ffffaa';ctx.beginPath();ctx.arc(slx,sly-28,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  });
  fog.forEach(f=>{
    const fx=f.x-cam.x,fy=f.y-cam.y;
    if(fx<-80||fx>W+80||fy<-80||fy>H+80)return;
    ctx.globalAlpha=f.a;ctx.fillStyle='#3a4455';ctx.beginPath();ctx.arc(fx,fy,f.r,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  const ents=[];
  buildings.forEach(b=>ents.push({t:'building',y:b.y+b.h,d:b}));
  reps.forEach(r=>ents.push({t:'rep',y:r.y+20,d:r}));
  ents.push({t:'tower',y:150});
  ents.push({t:'car',y:car.y+22});
  crows.forEach(c=>ents.push({t:'crow',y:c.y,d:c}));
  wolves.forEach(w=>ents.push({t:'wolf',y:w.y+12,d:w}));
  ents.push({t:'boar',y:boar.y+18});
  if(maya.found)ents.push({t:'maya',y:maya.y+10});
  if(!player.hiding)ents.push({t:'player',y:player.y+12});
  if(gs===ST.BOSS||gp>=PH.EMP)ents.push({t:'deer',y:deer.y+22});
  ents.sort((a,b)=>a.y-b.y);
  ents.forEach(e=>{
    switch(e.t){
      case 'building':drawBuilding(e.d);break;
      case 'rep':drawRepeater(e.d);break;
      case 'tower':drawTower();break;
      case 'car':drawCar();break;
      case 'crow':{const cx=e.d.x-cam.x,cy=e.d.y-cam.y;if(cx>-50&&cx<W+50&&cy>-50&&cy<H+50)drawCrow(e.d);break;}
      case 'wolf':{const wx=e.d.x-cam.x,wy=e.d.y-cam.y;if(wx>-50&&wx<W+50&&wy>-50&&wy<H+50)drawWolf(e.d);break;}
      case 'boar':drawBoarSprite(boar.x-cam.x,boar.y-cam.y);break;
      case 'maya':drawMaya(maya.x-cam.x,maya.y-cam.y);break;
      case 'player':drawPlayer(player.x-cam.x,player.y-cam.y);break;
      case 'deer':drawDeerBoss(deer.x-cam.x,deer.y-cam.y);break;
    }
  });
  if(player.hiding){const ppx=player.x-cam.x,ppy=player.y-cam.y;px(ppx-3,ppy-1,2,2,'#fff');px(ppx+1,ppy-1,2,2,'#fff');box('[E] Sair',ppx-18,ppy-15,{size:10,color:'#afa',bg:'rgba(0,40,0,0.9)',padding:4});}
  drawEMP();drawDarkness();
  ctx.strokeStyle='rgba(140,160,200,0.28)';ctx.lineWidth=1;
  rain.forEach(r=>{ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-1.4,r.y+r.len);ctx.stroke();});
  if(ltFlash>10){ctx.globalAlpha=(ltFlash-10)/10*0.3;ctx.fillStyle='#aacf';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(player.hp<=1){ctx.globalAlpha=0.06+Math.sin(gTimer*0.065)*0.04;ctx.fillStyle='#f00';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  drawHUD();drawVHS();
}

// ============ SCREENS ============
function renderTitle(){
  ctx.fillStyle='#020208';ctx.fillRect(0,0,W,H);
  for(let i=0;i<18;i++){const bx=i*25+Math.sin(i*1.5)*5,bh=55+Math.sin(i*2.3)*30;ctx.fillStyle='#05050f';ctx.fillRect(bx,H-bh,22,bh);}
  const ep=0.5+Math.sin(gTimer*0.05)*0.4;ctx.globalAlpha=ep;
  px(155+Math.sin(gTimer*0.014)*4,95,5,4,'#ff0000');px(172+Math.sin(gTimer*0.014)*4,95,5,4,'#ff0000');
  px(265+Math.sin(gTimer*0.011)*3,108,6,5,'#ff4400');px(285+Math.sin(gTimer*0.011)*3,108,6,5,'#ff4400');
  ctx.globalAlpha=1;
  txt('ECO DE METAL III',W/2-112,44,{size:22,color:'#334466'});
  txt('A ASCENSÃO DA REDE',W/2-102,68,{size:16,color:'#0044cc',bold:true});
  txt('Capítulo 3',W/2-38,86,{size:11,color:'#334'});
  ['🎮 INICIAR CAPÍTULO 3','📋 CRÉDITOS'].forEach((item,i)=>{
    const sel=i===tSel,my=160+i*34;
    if(sel){px(W/2-90,my-14,180,28,'rgba(0,30,80,0.5)');txt('> '+item+' <',W/2-80,my,{size:13,color:'#88aaff',bold:true});}
    else txt(item,W/2-60,my,{size:12,color:'#334'});
  });
  txt('[E] Interagir | [M] Hackear | [F] Sinalizador | [Q] EMP',W/2-148,H-50,{size:8,color:'#334'});
  txt('Destrua a Torre. Salve a cidade.',W/2-110,H-35,{size:9,color:'#446'});
  txt('Setas: Navegar | ENTER: Selecionar',W/2-100,H-18,{size:10,color:'#334'});
  ctx.fillStyle='rgba(0,0,0,0.1)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gTimer++;
}

function renderIntro(){
  ctx.fillStyle='#020206';ctx.fillRect(0,0,W,H);
  const texts=[
    ['Após o resgate...','Elias é tratado como herói.','Mas a estática não parou.'],
    ['Maya começa a desenhar diagramas.','Eles queriam nos usar como antenas.','A consciência coletiva se espalhou.'],
    ['Um apagão total atinge a cidade.','Cervo e Javali chegaram.','Corvos-Vigias varrem as ruas.'],
    ['OBJETIVO: Encontre Maya no hospital.','Leve-a à garagem segura.','Hackeie os 3 Repetidores [M].'],
    ['Suba a Torre de Transmissão.','Destrua o Cervo-01.','Ative o EMP. Qualquer custo.'],
    ['A cidade depende de você.','Maya depende de você.','Pressione ENTER para começar.']
  ];
  if(iStep<texts.length){
    iTimer++;
    texts[iStep].forEach((line,i)=>{
      const delay=i*26,chars=Math.min(line.length,Math.floor((iTimer-delay)/2.0));
      if(chars>0)txt(line.substring(0,chars),50,90+i*32,{size:i===0?14:12,color:i===0?'#4488ff':'#778899'});
    });
    if(iTimer>85&&gTimer%60<42)txt('[ENTER] Continuar | [ESC] Pular',W/2-100,H-28,{size:10,color:'#334'});
  }
  ctx.fillStyle='rgba(0,0,0,0.08)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gTimer++;
}

function renderPause(){
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(0,0,W,H);
  px(W/2-88,H/2-78,176,156,'#08080f');px(W/2-86,H/2-76,172,152,'#10101a');
  txt('⏸ PAUSADO',W/2-52,H/2-55,{size:16,color:'#4488ff',bold:true});
  ['▶ Continuar','🔄 Reiniciar','🏠 Menu'].forEach((item,i)=>{const sel=i===pSel;txt((sel?'> ':'  ')+item,W/2-68,H/2-12+i*30,{size:13,color:sel?'#88aaff':'#446'});});
  gTimer++;
}

function renderDeath(){
  dTimer++;const r=Math.min(18,dTimer/8);
  ctx.fillStyle=`rgb(${r},0,${Math.floor(r*1.5)})`;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=0.07;for(let i=0;i<350;i++){ctx.fillStyle=`rgb(0,0,${Math.floor(Math.random()*40)})`;ctx.fillRect(Math.random()*W,Math.random()*H,2,2);}ctx.globalAlpha=1;
  if(dTimer>28&&dTimer<180){
    const sc=1+(dTimer-28)/35,ey=H/2-32-(dTimer-28)*0.1;ctx.globalAlpha=Math.min(1,(dTimer-28)/40);
    px(W/2-50-12*sc,ey,4*sc,4*sc,'#0000ff');px(W/2-50+12*sc,ey,4*sc,4*sc,'#0000ff');
    px(W/2+28-14*sc,ey+10,5*sc,5*sc,'#0044ff');px(W/2+28+14*sc,ey+10,5*sc,5*sc,'#0044ff');ctx.globalAlpha=1;
  }
  if(dTimer>100)txt('SINAL PERDIDO',W/2-82,H/2+15,{size:20,color:'#0044cc',bold:true});
  if(dTimer>170)txt('A rede continua crescendo...',W/2-110,H/2+50,{size:12,color:'#224'});
  if(dTimer>270&&gTimer%55<38)txt('[ENTER] Tentar novamente',W/2-92,H/2+90,{size:12,color:'#446'});
  ctx.fillStyle='rgba(0,0,0,0.16)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gTimer++;
}

function renderEnd(){
  eTimer++;const br=Math.min(22,eTimer/6);
  ctx.fillStyle=`rgb(0,${br},${br*2})`;ctx.fillRect(0,0,W,H);
  if(eTimer>30){ctx.globalAlpha=Math.min(0.45,(eTimer-30)/65);ctx.fillStyle='#0044ff';ctx.beginPath();ctx.arc(W/2,H/2-30,(eTimer-30)*1.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  if(eTimer>70){ctx.globalAlpha=Math.min(0.65,(eTimer-70)/55);const g=ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,200);g.addColorStop(0,'#0088ff');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(eTimer>120)txt('PULSO EMP ATIVADO.',W/2-95,H/2-55,{size:18,color:'#88bbff',bold:true});
  if(eTimer>200)txt('Elias se fundiu à rede.',W/2-100,H/2-22,{size:13,color:'#5577aa'});
  if(eTimer>280){txt('Todas as máquinas desligaram.',W/2-120,H/2+5,{size:12,color:'#446'});txt('A cidade está em silêncio.',W/2-100,H/2+22,{size:12,color:'#446'});}
  if(eTimer>370)txt('Maya e as crianças estão salvas.',W/2-130,H/2+52,{size:13,color:'#5588aa',bold:true});
  if(eTimer>450)txt('ECO DE METAL III — FIM',W/2-110,H/2+90,{size:14,color:'#88aaff',bold:true});
  if(eTimer>520&&gTimer%65<48)txt('[ENTER] Epílogo',W/2-60,H/2+120,{size:12,color:'#446'});
  ctx.fillStyle='rgba(0,0,0,0.06)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gTimer++;
}

function renderEpi(){
  epTimer++;const br=Math.min(55,epTimer/5);
  ctx.fillStyle=`rgb(${br},${Math.floor(br*0.8)},${Math.floor(br*0.5)})`;ctx.fillRect(0,0,W,H);
  if(epTimer>40){ctx.globalAlpha=Math.min(0.85,(epTimer-40)/80);const s=ctx.createRadialGradient(W/2,60,8,W/2,60,120);s.addColorStop(0,'#ffdd88');s.addColorStop(1,'rgba(255,180,80,0)');ctx.fillStyle=s;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(epTimer>100){ctx.globalAlpha=Math.min(0.9,(epTimer-100)/80);px(0,H-60,W,60,'#1a3a1a');for(let i=0;i<18;i++){const fx=20+i*22,fy=H-35+Math.sin(i*1.7)*8;px(fx,fy,3,12,'#1a2a0a');px(fx-2,fy-5,7,7,['#ff6688','#ffaa44','#44aaff','#ffff44'][i%4]);}ctx.globalAlpha=1;}
  if(epTimer>150){ctx.globalAlpha=Math.min(0.8,(epTimer-150)/80);const dx2=W/2-60,dy2=H-80;px(dx2-14,dy2,28,14,'#5a4a2a');px(dx2-10,dy2-12,20,13,'#6a5a3a');px(dx2-4,dy2-20,8,8,'#6a5a3a');px(dx2-4,dy2-32,2,12,'#4a3a2a');px(dx2+2,dy2-32,2,12,'#4a3a2a');px(dx2-9,dy2-38,5,5,'#ff6688');ctx.globalAlpha=1;}
  if(epTimer>200){ctx.globalAlpha=Math.min(0.9,(epTimer-200)/80);const mx=W/2+20,my=H-70;px(mx-5,my-14,10,18,'#4466aa');px(mx-4,my-22,8,8,'#d4a574');px(mx-4,my-24,8,3,'#220a44');ctx.globalAlpha=1;}
  if(epTimer>260)txt('Anos depois...',W/2-55,38,{size:14,color:'#aa8855',bold:true});
  if(epTimer>320)txt('Maya se tornou engenheira.',W/2-110,62,{size:11,color:'#887755'});
  if(epTimer>380)txt('Ela voltou à floresta de Blackwood.',W/2-138,82,{size:11,color:'#887755'});
  if(epTimer>450)txt('Colocou uma flor de metal no chifre.',W/2-142,102,{size:11,color:'#887755'});
  if(epTimer>520)txt('Ligou um rádio antigo.',W/2-85,122,{size:11,color:'#887755'});
  if(epTimer>590)txt('Só havia silêncio.',W/2-70,148,{size:13,color:'#aa9966',bold:true});
  if(epTimer>650)txt('Elias conseguiu.',W/2-65,170,{size:13,color:'#aabb88',bold:true});
  if(epTimer>720)txt('FIM',W/2-20,H/2+55,{size:28,color:'#cc9955',bold:true});
  if(epTimer>800&&gTimer%65<48)txt('[ENTER] Menu Principal',W/2-82,H-20,{size:12,color:'#665533'});
  ctx.fillStyle='rgba(0,0,0,0.05)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gTimer++;
}

// ============ LOOP ============
function loop(){
  switch(gs){
    case ST.TITLE:renderTitle();break;
    case ST.INTRO:renderIntro();break;
    case ST.GAME:case ST.BOSS:update();renderGame();break;
    case ST.PAUSE:renderPause();break;
    case ST.DEATH:renderDeath();break;
    case ST.END:renderEnd();break;
    case ST.EPI:renderEpi();break;
  }
  requestAnimationFrame(loop);
}

SFX.init();
loop();