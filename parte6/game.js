// ============================================================
//  ECO DE METAL: O ACERTO DE CONTAS FINAL
//  PARTE 1 de 2
// ============================================================
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const W = 420, H = 320;
canvas.width = W; canvas.height = H;

function resize(){
  const s = Math.min(innerWidth/W, innerHeight/H)*0.95;
  canvas.style.width  = W*s+'px';
  canvas.style.height = H*s+'px';
}
resize();
window.addEventListener('resize', resize);

// ─── TEXT ─────────────────────────────────────────────────────
const T = {
  draw(t,x,y,o={}){
    const{size=12,color='#fff',shadow=true,bold=false}=o;
    ctx.font=`${bold?'bold ':''}${size}px "Courier New",monospace`;
    ctx.textBaseline='middle'; ctx.textAlign='left';
    if(shadow){ctx.fillStyle='rgba(0,0,0,.9)';ctx.fillText(t,x+1,y+1);}
    ctx.fillStyle=color; ctx.fillText(t,x,y);
  },
  box(t,x,y,o={}){
    const{size=12,color='#fff',bg='rgba(0,0,0,.9)',padding=6,border=null}=o;
    ctx.font=`${size}px "Courier New",monospace`;
    const w=ctx.measureText(t).width+padding*2, h=size+padding*2;
    ctx.fillStyle=bg; ctx.fillRect(x-padding,y-h/2,w,h);
    if(border){ctx.strokeStyle=border;ctx.lineWidth=2;ctx.strokeRect(x-padding,y-h/2,w,h);}
    ctx.fillStyle=color; ctx.textBaseline='middle'; ctx.fillText(t,x,y);
  },
  mid(t,y,o={}){
    const{size=12}=o;
    ctx.font=`${size}px "Courier New",monospace`;
    this.draw(t,W/2-ctx.measureText(t).width/2,y,o);
  }
};

// ─── AUDIO ────────────────────────────────────────────────────
const A = {
  c:null,
  init(){try{this.c=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}},
  unlock(){if(this.c&&this.c.state==='suspended')this.c.resume();},
  tone(f,d,tp,v){
    tp=tp||'square'; v=v||0.08;
    if(!this.c)return;
    try{
      const o=this.c.createOscillator(),g=this.c.createGain();
      o.type=tp; o.frequency.value=f; g.gain.value=v;
      g.gain.exponentialRampToValueAtTime(0.001,this.c.currentTime+d);
      o.connect(g); g.connect(this.c.destination);
      o.start(); o.stop(this.c.currentTime+d);
    }catch(e){}
  },
  step(){this.tone(55+Math.random()*20,0.04,'square',0.018);},
  shoot(){
    this.tone(80,0.05,'sawtooth',0.18);
    this.tone(440,0.08,'square',0.14);
    setTimeout(()=>this.tone(880,0.06,'sawtooth',0.1),60);
  },
  instakill(){
    this.tone(100,0.15,'sawtooth',0.16);
    this.tone(50,0.2,'square',0.14);
    setTimeout(()=>this.tone(30,0.25,'sawtooth',0.1),100);
  },
  bossDmg(){
    this.tone(200,0.1,'sawtooth',0.12);
    this.tone(150,0.15,'square',0.1);
    setTimeout(()=>this.tone(100,0.2,'sawtooth',0.08),80);
  },
  collect(){
    this.tone(523,0.07,'square',0.06);
    setTimeout(()=>this.tone(659,0.07,'square',0.06),60);
    setTimeout(()=>this.tone(784,0.09,'square',0.06),120);
  },
  alert(){this.tone(220,0.1,'sawtooth',0.07);setTimeout(()=>this.tone(330,0.1,'sawtooth',0.07),70);},
  chase(){for(let i=0;i<4;i++)setTimeout(()=>this.tone(300+i*70,0.09,'sawtooth',0.06),i*55);},
  dmg(){this.tone(80,0.2,'sawtooth',0.1);},
  hack(){
    this.tone(440,0.1,'square',0.07);
    setTimeout(()=>this.tone(550,0.1,'square',0.07),90);
    setTimeout(()=>this.tone(660,0.12,'square',0.08),180);
  },
  heal(){
    this.tone(300,0.12,'sine',0.08);
    setTimeout(()=>this.tone(400,0.12,'sine',0.08),100);
    setTimeout(()=>this.tone(500,0.15,'sine',0.1),200);
  },
  boom(){
    this.tone(50,0.6,'sawtooth',0.18);
    this.tone(30,0.8,'square',0.15);
    setTimeout(()=>this.tone(40,0.5,'sawtooth',0.12),200);
  },
  victory(){[262,330,392,523,659].forEach((n,i)=>setTimeout(()=>this.tone(n,0.2,'square',0.08),i*150));},
  walkie(){this.tone(800,0.04,'square',0.03);},
  hb(){this.tone(50,0.08,'sine',0.04);setTimeout(()=>this.tone(40,0.12,'sine',0.03),90);},
  static_(){
    if(!this.c)return;
    try{
      const b=this.c.createBuffer(1,this.c.sampleRate*0.1,this.c.sampleRate);
      const d=b.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      const s=this.c.createBufferSource(),g=this.c.createGain();
      g.gain.value=0.04; s.buffer=b; s.connect(g); g.connect(this.c.destination); s.start();
    }catch(e){}
  }
};

// ─── PHYSICS ──────────────────────────────────────────────────
const PC = {
  vx:0,vy:0,wk:0,dir:0,mv:false,spd:1.8,
  update(p,k){
    let ix=0,iy=0;
    if(k['ArrowLeft']||k['KeyA'])ix--;
    if(k['ArrowRight']||k['KeyD'])ix++;
    if(k['ArrowUp']||k['KeyW'])iy--;
    if(k['ArrowDown']||k['KeyS'])iy++;
    if(ix&&iy){ix*=0.707;iy*=0.707;}
    const spr=(k['ShiftLeft']||k['ShiftRight'])&&p.stamina>0;
    let sp=this.spd*(spr?1.65:1);
    if(p.crouching)sp*=0.55;
    if(spr&&(ix||iy))p.stamina=Math.max(0,p.stamina-0.35);
    else p.stamina=Math.min(p.maxStamina,p.stamina+0.1);
    if(ix||iy){
      this.vx+=(ix*sp-this.vx)*0.2; this.vy+=(iy*sp-this.vy)*0.2;
      this.mv=true;
      const a=Math.atan2(this.vy,this.vx);
      if(a>-Math.PI/4&&a<=Math.PI/4)this.dir=0;
      else if(a>Math.PI/4&&a<=3*Math.PI/4)this.dir=1;
      else if(a>-3*Math.PI/4&&a<=-Math.PI/4)this.dir=3;
      else this.dir=2;
    }else{
      this.vx*=0.86; this.vy*=0.86;
      if(Math.abs(this.vx)<0.04)this.vx=0;
      if(Math.abs(this.vy)<0.04)this.vy=0;
      this.mv=Math.abs(this.vx)>0.08||Math.abs(this.vy)>0.08;
    }
    if(this.mv)this.wk+=0.12*Math.sqrt(this.vx*this.vx+this.vy*this.vy);
    else this.wk*=0.85;
    p.x+=this.vx; p.y+=this.vy;
    return{spr,mv:this.mv};
  },
  anim(){return{bob:Math.sin(this.wk)*(this.mv?1.2:0),arm:Math.sin(this.wk*2)*(this.mv?5:0)};},
  reset(){this.vx=0;this.vy=0;this.wk=0;this.dir=0;this.mv=false;}
};

// ─── STATES ───────────────────────────────────────────────────
const ST={TITLE:0,INTRO:1,GAME:2,PAUSE:3,DEATH:4,DIALOGUE:5,ENDING:6};
const MW=1600,MH=1000;

// ─── GLOBALS ──────────────────────────────────────────────────
let gs=ST.TITLE;
let gt=0,shake=0,glitch=0,lFlash=0,lTmr=0;
let txtTmr=0,curTxt='',dlgQ=[],curDlg=null;
let titleSel=0,pauseSel=0,deathTmr=0,endTmr=0;
let keys={},cam={x:0,y:0},particles=[],lightningBolts=[];
let gameInitialized=false;

// Valores padrão para evitar crash antes do init()
let player={x:400,y:500,hp:5,maxHp:5,stamina:100,maxStamina:100,inv:0,noise:0,hiding:false,crouching:false};
let eliasNPC={x:430,y:510};
let team={
  moraes:{x:370,y:530,role:'gun'},
  enzo:{x:355,y:490,role:'hack',hackTarget:null},
  rafael:{x:445,y:490,role:'hack',hackTarget:null},
  murilo:{x:345,y:520,role:'distract',distracting:false,distTmr:0},
  zahara:{x:420,y:545,role:'heal'},
  bia:{x:460,y:530,role:'stamina'},
  taylline:{x:450,y:488,role:'radar'}
};
let enemies=[];
let generators=[];
let waveTimer=0,waveNum=0,maxWaves=5;
let bossPhase=0;
let bossDeer=null,bossBoar=null,bossDefeated=false;
let genFixed=0;
let bomb={active:false,planted:false,x:0,y:0};
let countdownTimer=600;
let shootCD=0,healCD=0,staminaCD=0;
let tayllineWarning='',tayllineWarnTmr=0;

// ─── CHAR DEFS ────────────────────────────────────────────────
// BIA: pele CLARA (#d4a574) conforme solicitado
const CDEFS={
  jose:    {skin:'#c49a64',shirt:'#aa4400',pants:'#1a1a2a',hair:'#1a0a00',label:'JOSE',    lc:'#ff8844'},
  elias:   {skin:'#d4a574',shirt:'#1a3055',pants:'#1a1a2a',hair:'#2a1a0a',label:'ELIAS',   lc:'#4488ff'},
  moraes:  {skin:'#d4a574',shirt:'#cc2222',pants:'#111111',hair:'#2a1a0a',label:'MORAES',  lc:'#ff4444'},
  enzo:    {skin:'#d4a574',shirt:'#2244aa',pants:'#eeeedd',hair:'#3a3a1a',label:'ENZO',    lc:'#4488ff'},
  rafael:  {skin:'#d4a574',shirt:'#eeeeee',pants:'#226622',hair:'#2a1a0a',label:'RAFAEL',  lc:'#88ff88'},
  murilo:  {skin:'#8b5e3c',shirt:'#225522',pants:'#224488',hair:'#1a0a00',label:'MURILO',  lc:'#44aa44'},
  zahara:  {skin:'#d4a574',shirt:'#ddcc00',pants:'#111111',hair:'#442200',label:'ZAHARA',  lc:'#ffdd00'},
  bia:     {skin:'#d4a574',shirt:'#111111',pants:'#111111',hair:'#2a1a0a',label:'BIA',     lc:'#aaaaaa'},
  taylline:{skin:'#4a2a1a',shirt:'#ffffff',pants:'#ffffff',hair:'#1a0a00',label:'TAYLLINE',lc:'#ff88cc'}
};

// ─── DRAW HELPERS ─────────────────────────────────────────────
function dr(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),w,h);}

function drawChar(sx,sy,o){
  o=o||{};
  const skin      = o.skin      ||'#d4a574';
  const shirt     = o.shirt     ||'#333';
  const pants     = o.pants     ||'#222';
  const hair      = o.hair      ||'#2a1a0a';
  const bob       = o.bob       ||0;
  const armSwing  = o.armSwing  ||0;
  const label     = o.label     ||'';
  const lc        = o.lc        ||'#fff';
  const alpha     = o.alpha!==undefined?o.alpha:1;
  const crouching = o.crouching ||false;
  const hasGun    = o.hasGun    ||false;
  const hasLaptop = o.hasLaptop ||false;
  const hasMedkit = o.hasMedkit ||false;

  if(alpha<=0)return;
  const x=Math.floor(sx), y=Math.floor(sy+bob);
  const sc=crouching?0.7:1;

  ctx.globalAlpha=alpha*0.35;
  ctx.beginPath();ctx.ellipse(x,y+13,8,3,0,0,Math.PI*2);ctx.fillStyle='#000';ctx.fill();
  ctx.globalAlpha=alpha;

  const arm=armSwing*0.12;

  // legs
  dr(x-4,y+5*sc,4,7*sc,pants); dr(x+1,y+5*sc,4,7*sc,pants);
  dr(x-4,y+11*sc,4,2,'#2a1a0a'); dr(x+1,y+11*sc,4,2,'#2a1a0a');
  // body
  dr(x-6,y-7*sc,12,13*sc,shirt);
  dr(x-2,y-6*sc,4,2*sc,'rgba(0,0,0,.2)');
  dr(x-6,y+5*sc,12,2,'#3a2a1a');
  // left arm
  ctx.save();ctx.translate(x-6,y-4*sc);ctx.rotate(-arm);
  dr(0,0,3,8*sc,shirt);dr(0,8*sc,3,2,skin);ctx.restore();
  // right arm
  ctx.save();ctx.translate(x+3,y-4*sc);ctx.rotate(arm);
  dr(0,0,3,8*sc,shirt);dr(0,8*sc,3,2,skin);
  if(hasGun){
    dr(2,5*sc,8,4,'#1a2a3a');dr(9,6*sc,3,2,'#44aaff');dr(3,4*sc,6,2,'#2a4a5a');
    ctx.globalAlpha=alpha*(0.3+Math.sin(gt*0.2)*0.2);
    ctx.fillStyle='#44ffff';ctx.fillRect(9,Math.floor(6*sc),3,2);
    ctx.globalAlpha=alpha;
  }
  if(hasLaptop){dr(2,6*sc,5,4,'#222');dr(3,7*sc,3,2,'#00ff44');}
  if(hasMedkit){dr(2,6*sc,5,5,'#cc2222');dr(4,7*sc+1,1,3,'#fff');dr(3,8*sc,3,1,'#fff');}
  ctx.restore();
  // head
  const hY=y-14*sc;
  dr(x-4,hY,8,9,skin);
  dr(x-4,hY-3,8,4,hair); dr(x-6,hY,2,4,hair); dr(x+4,hY,2,4,hair);
  dr(x-3,hY+4,2,2,'#1a0a00'); dr(x+1,hY+4,2,2,'#1a0a00');
  dr(x-1,hY+7,3,1,'#c49a64');
  if(label){ctx.globalAlpha=alpha*0.5;T.draw(label,x-Math.floor(label.length*3.5),y-22*sc,{size:7,color:lc});ctx.globalAlpha=alpha;}
  ctx.globalAlpha=1;
}

// ─── PARTICLES ────────────────────────────────────────────────
function spawnP(x,y,c,n,spd){
  spd=spd||2.5;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=0.5+Math.random()*spd;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:35+Math.random()*25,ml:60,color:c,sz:2+Math.random()*3});
  }
}

function spawnLightning(x1,y1,x2,y2){
  lightningBolts.push({x1,y1,x2,y2,life:18,ml:18});
  for(let i=0;i<6;i++){
    const t=i/6,t2=(i+1)/6;
    const mx=(x1+(x2-x1)*t)+(Math.random()-0.5)*30;
    const my=(y1+(y2-y1)*t)+(Math.random()-0.5)*30;
    lightningBolts.push({x1:mx,y1:my,x2:x1+(x2-x1)*t2,y2:y1+(y2-y1)*t2,life:14,ml:14});
  }
}

// ─── INIT ─────────────────────────────────────────────────────
function init(){
  gameInitialized=true;
  player={x:400,y:500,hp:5,maxHp:5,stamina:100,maxStamina:100,inv:0,noise:0,hiding:false,crouching:false};
  eliasNPC={x:430,y:510};
  team={
    moraes:{x:370,y:530,role:'gun'},
    enzo:{x:355,y:490,role:'hack',hackTarget:null},
    rafael:{x:445,y:490,role:'hack',hackTarget:null},
    murilo:{x:345,y:520,role:'distract',distracting:false,distTmr:0},
    zahara:{x:420,y:545,role:'heal'},
    bia:{x:460,y:530,role:'stamina'},
    taylline:{x:450,y:488,role:'radar'}
  };
  generators=[
    {x:300,y:300,fixed:false,prog:0,name:'Gerador Alpha',hacking:false},
    {x:800,y:200,fixed:false,prog:0,name:'Gerador Beta', hacking:false},
    {x:1200,y:380,fixed:false,prog:0,name:'Gerador Gamma',hacking:false}
  ];
  enemies=[];waveTimer=300;waveNum=0;
  bossPhase=0;genFixed=0;
  bossDeer=null;bossBoar=null;bossDefeated=false;
  bomb={active:false,planted:false,x:0,y:0};
  countdownTimer=600;
  shootCD=0;healCD=0;staminaCD=0;
  tayllineWarning='';tayllineWarnTmr=0;
  lightningBolts=[];
  cam={x:0,y:0};shake=0;glitch=0;gt=0;
  particles=[];PC.reset();
  dlgQ=[];curDlg=null;
  startDlg(introDlg());
}

// ─── DIALOGUES ────────────────────────────────────────────────
function introDlg(){return[
  {sp:'Jose',     txt:'Elias... o Cientista esta no bunker abaixo deste laboratorio!',  cl:'#ff8844'},
  {sp:'Elias',    txt:'Precisamos ativar os geradores para abrir o acesso ao bunker.',   cl:'#4488ff'},
  {sp:'Moraes',   txt:'A Lanca-Choque da INSTAKILL nos Lobos e dano nos Bosses!',       cl:'#ff4444'},
  {sp:'Enzo',     txt:'Rafael e eu vamos hackear os geradores. Nos protejam!',           cl:'#4488ff'},
  {sp:'Murilo',   txt:'Eu distraio as maquinas pelos corredores do laboratorio.',        cl:'#44aa44'},
  {sp:'Zahara',   txt:'Kits medicos prontos. Pressione [1] para recuperar vida.',        cl:'#ffdd00'},
  {sp:'Bia',      txt:'Inaladores carregados. Pressione [2] para estamina.',             cl:'#aaaaaa'},
  {sp:'Taylline', txt:'Rastreando inimigos pelos sensores do laboratorio.',              cl:'#ff88cc'},
  {sp:'SISTEMA',  txt:'[3] INSTAKILL Lobos / Dano Bosses | [4] Distrai | [1] Cura | [2] Stamina',cl:'#00ffff'}
];}
function bossDlg(){return[
  {sp:'Taylline',txt:'ALERTA! Cervo e Javali entraram no laboratorio!',         cl:'#ff88cc'},
  {sp:'Moraes',  txt:'Use [3] repetido para desgastar os Bosses! HP deles e limitado!', cl:'#ff4444'},
  {sp:'Murilo',  txt:'Eu atraio o Javali para a camara de contencao!',          cl:'#44aa44'},
  {sp:'Jose',    txt:'FOGO! Moraes, [3] nos Bosses causa dano! Vamos desgastar!',cl:'#ff8844'}
];}
function bunkerDlg(){return[
  {sp:'Elias',   txt:'O nucleo caiu! A bomba esta ativa! Vamos ao bunker!',           cl:'#4488ff'},
  {sp:'Jose',    txt:'Centro do laboratorio — vamos plantar a bomba no gerador!',     cl:'#ff8844'},
  {sp:'Taylline',txt:'Drones de defesa nos corredores B e C!',                        cl:'#ff88cc'},
  {sp:'SISTEMA', txt:'Va ao centro do laboratorio e pressione [E] para plantar!',     cl:'#00ffff'}
];}
function cntDlg(){return[
  {sp:'SISTEMA',txt:'CONTAGEM: 10 SEGUNDOS! EVACUEM AGORA!',cl:'#ff0000'},
  {sp:'Jose',   txt:'CORRAM PARA A SAIDA DO LABORATORIO!',  cl:'#ff8844'}
];}

function startDlg(lines){
  dlgQ=lines.slice(); advDlg();
  if(gs!==ST.GAME)gs=ST.DIALOGUE;
}
function advDlg(){
  if(dlgQ.length){curDlg=dlgQ.shift();A.walkie();}
  else{curDlg=null;if(gs===ST.DIALOGUE)gs=ST.GAME;}
}
function showTxt(t){curTxt=t;txtTmr=300;}

// ─── INPUT ────────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
  keys[e.code]=true; A.unlock();

  if(gs===ST.TITLE){
    if(e.code==='ArrowUp'||e.code==='KeyW')titleSel=Math.max(0,titleSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS')titleSel=Math.min(1,titleSel+1);
    if(e.code==='Enter'||e.code==='Space'){
      if(titleSel===0)gs=ST.INTRO;
      A.tone(280,0.08,'square',0.05);
    }
  }

  if(gs===ST.INTRO){
    if(e.code==='Enter'||e.code==='Space'||e.code==='Escape') init();
  }

  if(gs===ST.DIALOGUE){
    if(e.code==='Enter'||e.code==='Space'||e.code==='KeyE') advDlg();
  }

  if(gs===ST.PAUSE){
    if(e.code==='Escape')gs=ST.GAME;
    if(e.code==='ArrowUp'||e.code==='KeyW')pauseSel=Math.max(0,pauseSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS')pauseSel=Math.min(2,pauseSel+1);
    if(e.code==='Enter'||e.code==='Space'){
      if(pauseSel===0)gs=ST.GAME;
      else if(pauseSel===1)init();
      else gs=ST.TITLE;
    }
  }

  if(gs===ST.GAME){
    if(e.code==='Escape'){gs=ST.PAUSE;pauseSel=0;}
    if(e.code==='KeyE')doInteract();
    if(e.code==='KeyC')player.crouching=!player.crouching;

    // [1] Zahara cura
    if(e.code==='Digit1'||e.code==='Numpad1'){
      if(healCD<=0&&player.hp<player.maxHp){
        player.hp=Math.min(player.maxHp,player.hp+2);
        healCD=480;A.heal();
        showTxt('Zahara curou voce! (+2 HP)');
        spawnP(player.x-cam.x,player.y-cam.y,'#44ff44',6);
      }else if(player.hp>=player.maxHp){
        showTxt('Vida ja esta cheia!');
      }else{
        showTxt('Zahara recarregando: '+Math.ceil(healCD/60)+'s');
      }
    }

    // [2] Bia estamina
    if(e.code==='Digit2'||e.code==='Numpad2'){
      if(staminaCD<=0){
        player.stamina=Math.min(player.maxStamina,player.stamina+60);
        staminaCD=360;A.collect();
        showTxt('Bia restaurou estamina!');
        spawnP(player.x-cam.x,player.y-cam.y,'#44aaff',6);
      }else{
        showTxt('Bia recarregando: '+Math.ceil(staminaCD/60)+'s');
      }
    }

    // [3] Moraes — INSTAKILL Lobos / DANO nos Bosses
    if(e.code==='Digit3'||e.code==='Numpad3'){
      if(shootCD<=0){
        shootCD=90;
        A.shoot();
        const mx=player.x-cam.x, my=player.y-cam.y;
        let killedWolves=0;
        let hitBoss=false;

        // ── INSTAKILL apenas nos Lobos normais ──
        for(const en of enemies){
          if(en.dead)continue;
          const d=Math.hypot(en.x-player.x,en.y-player.y);
          if(d<280){
            spawnLightning(mx,my,en.x-cam.x,en.y-cam.y);
            en.hp=0; en.dead=true;
            A.instakill();
            shake=8; glitch=12;
            spawnP(en.x-cam.x,en.y-cam.y,'#44ffff',15,3);
            spawnP(en.x-cam.x,en.y-cam.y,'#ffff44',8,2);
            killedWolves++;
          }
        }

        // ── DANO (-2) no Cervo Boss ──
        if(bossDeer&&!bossDeer.dead){
          const d=Math.hypot(bossDeer.x-player.x,bossDeer.y-player.y);
          if(d<280){
            spawnLightning(mx,my,bossDeer.x-cam.x,bossDeer.y-cam.y);
            bossDeer.hp=Math.max(0,bossDeer.hp-2);
            bossDeer.stun=60;
            A.bossDmg();
            shake=12; glitch=18;
            spawnP(bossDeer.x-cam.x,bossDeer.y-cam.y,'#44ffff',18,2.5);
            spawnP(bossDeer.x-cam.x,bossDeer.y-cam.y,'#ff4444',10,1.5);
            hitBoss=true;
            if(bossDeer.hp<=0){
              bossDeer.dead=true;
              showTxt('CERVO DESTRUIDO! Moraes acertou '+4+' vezes!');
              spawnP(bossDeer.x-cam.x,bossDeer.y-cam.y,'#ff4400',25,3);
              A.instakill();
              checkBossDefeat();
            }else{
              showTxt('Cervo atingido! HP: '+bossDeer.hp+'/8 — Atire mais vezes!');
            }
          }
        }

        // ── DANO (-2) no Javali Boss ──
        if(bossBoar&&!bossBoar.dead){
          const d=Math.hypot(bossBoar.x-player.x,bossBoar.y-player.y);
          if(d<280){
            spawnLightning(mx,my,bossBoar.x-cam.x,bossBoar.y-cam.y);
            bossBoar.hp=Math.max(0,bossBoar.hp-2);
            bossBoar.stun=60;
            bossBoar.charging=false;
            A.bossDmg();
            shake=12; glitch=18;
            spawnP(bossBoar.x-cam.x,bossBoar.y-cam.y,'#44ffff',18,2.5);
            spawnP(bossBoar.x-cam.x,bossBoar.y-cam.y,'#ff8800',10,1.5);
            hitBoss=true;
            if(bossBoar.hp<=0){
              bossBoar.dead=true;
              showTxt('JAVALI DESTRUIDO! Moraes acertou '+5+' vezes!');
              spawnP(bossBoar.x-cam.x,bossBoar.y-cam.y,'#ff8800',25,3);
              A.instakill();
              checkBossDefeat();
            }else{
              showTxt('Javali atingido! HP: '+bossBoar.hp+'/10 — Continue atirando!');
            }
          }
        }

        // Feedback geral
        if(killedWolves===0&&!hitBoss){
          showTxt('Lancou! (nenhum alvo no alcance de 280px)');
        }else if(killedWolves===1&&!hitBoss){
          showTxt('INSTAKILL! Lobo destruido!');
        }else if(killedWolves>1&&!hitBoss){
          showTxt('CHAIN KILL! '+killedWolves+' Lobos eliminados!');
        }else if(killedWolves>0&&hitBoss){
          showTxt('CHAIN! '+killedWolves+' Lobo(s) + Boss atingido!');
        }

      }else{
        showTxt('Lanca-Choque recarregando: '+Math.ceil(shootCD/60)+'s');
      }
    }

    // [4] Murilo distrai
    if(e.code==='Digit4'||e.code==='Numpad4'){
      if(!team.murilo.distracting){
        team.murilo.distracting=true; team.murilo.distTmr=300;
        A.tone(350,0.08,'sine',0.06);
        showTxt('Murilo esta distraindo pelo corredor!');
        const allE=enemies.filter(en=>!en.dead);
        if(bossDeer&&!bossDeer.dead)allE.push(bossDeer);
        if(bossBoar&&!bossBoar.dead)allE.push(bossBoar);
        for(const en of allE){
          en.lkX=team.murilo.x+(Math.random()-0.5)*120;
          en.lkY=team.murilo.y+(Math.random()-0.5)*80;
          en.mode='alert'; en.alert=Math.min(70,(en.alert||0)+30);
        }
      }else{
        showTxt('Murilo distraindo: '+Math.ceil(team.murilo.distTmr/60)+'s');
      }
    }
  }

  if(gs===ST.DEATH&&e.code==='Enter'){gs=ST.TITLE;titleSel=0;}
  if(gs===ST.ENDING&&endTmr>700&&e.code==='Enter'){gs=ST.TITLE;titleSel=0;}
});

document.addEventListener('keyup',function(e){keys[e.code]=false;});

// ─── INTERACT ─────────────────────────────────────────────────
function doInteract(){
  for(const g of generators){
    if(g.fixed)continue;
    if(Math.hypot(player.x-g.x,player.y-g.y)<65){
      if(!g.hacking){
        g.hacking=true;
        team.enzo.hackTarget=g;
        team.rafael.hackTarget=g;
        showTxt('Enzo e Rafael hackeando '+g.name+'!');
        A.hack();
      }
      return;
    }
  }
  if(bomb.active&&!bomb.planted&&bossPhase===2){
    if(Math.hypot(player.x-800,player.y-500)<90){
      bomb.planted=true; bomb.x=800; bomb.y=500;
      countdownTimer=600;
      showTxt('BOMBA PLANTADA! FUJAM!');
      startDlg(cntDlg()); A.boom(); shake=20;
    }else{
      showTxt('Va ao centro do laboratorio para plantar!');
    }
  }
}

function checkBossDefeat(){
  const dd=!bossDeer||bossDeer.dead;
  const bd=!bossBoar||bossBoar.dead;
  if(dd&&bd&&!bossDefeated){
    bossDefeated=true; bossPhase=2; bomb.active=true;
    showTxt('MAQUINAS DESTRUIDAS! Pegue o Nucleo!');
    startDlg(bunkerDlg()); A.victory();
  }
}

function spawnWave(){
  waveNum++;
  const count=2+waveNum;
  showTxt('ONDA '+waveNum+'/'+maxWaves+' — '+count+' Lobos!');
  A.alert();
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2, dist=300+Math.random()*200;
    enemies.push({
      x:player.x+Math.cos(angle)*dist,
      y:player.y+Math.sin(angle)*dist,
      type:'wolf',frame:0,speed:0.5+waveNum*0.04,
      mode:'chase',eyeColor:'#ff4400',
      stun:0,alert:100,hp:1,dead:false,
      lkX:player.x,lkY:player.y
    });
  }
}

// ─── ENEMY AI ─────────────────────────────────────────────────
function updateEnemy(e){
  if(e.dead)return;
  if(e.stun>0){e.stun--;e.frame++;if(e.stun<=0)e.mode='chase';return;}
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);
  if(team.murilo.distracting){
    const mdx=team.murilo.x-e.x,mdy=team.murilo.y-e.y,md=Math.hypot(mdx,mdy);
    if(md<300){e.x+=(mdx/md)*e.speed*0.7;e.y+=(mdy/md)*e.speed*0.7;e.frame++;return;}
  }
  if(e.mode==='alert'){
    const tdx=(e.lkX||player.x)-e.x,tdy=(e.lkY||player.y)-e.y,td=Math.hypot(tdx,tdy);
    if(td>20){e.x+=(tdx/td)*e.speed*0.7;e.y+=(tdy/td)*e.speed*0.7;}
    else e.mode='chase';
  }
  if(e.mode==='chase'){
    if(dist>12){e.x+=(dx/dist)*e.speed;e.y+=(dy/dist)*e.speed;}
    if(dist<22&&player.inv<=0&&!player.hiding){
      player.hp--;player.inv=90;shake=20;A.dmg();
      if(player.hp<=0){gs=ST.DEATH;deathTmr=0;}
      else showTxt('Lobo atacou! Vida: '+player.hp);
      player.x-=(dx/dist)*40; player.y-=(dy/dist)*40;
    }
  }
  e.x=Math.max(20,Math.min(MW-20,e.x));
  e.y=Math.max(20,Math.min(MH-20,e.y));
  e.frame++;
}

function updateBoss(b){
  if(!b||b.dead)return;
  if(b.stun>0){b.stun--;b.frame++;if(b.stun<=0)b.mode='chase';return;}
  const dx=player.x-b.x,dy=player.y-b.y,dist=Math.hypot(dx,dy);
  if(team.murilo.distracting){
    const mdx=team.murilo.x-b.x,mdy=team.murilo.y-b.y,md=Math.hypot(mdx,mdy);
    if(md<380){b.x+=(mdx/md)*b.speed*0.6;b.y+=(mdy/md)*b.speed*0.6;b.frame++;return;}
  }
  if(b.mode==='alert'){
    const tdx=(b.lkX||player.x)-b.x,tdy=(b.lkY||player.y)-b.y,td=Math.hypot(tdx,tdy);
    if(td>18){b.x+=(tdx/td)*b.speed*0.7;b.y+=(tdy/td)*b.speed*0.7;}
    else b.mode='chase';
  }
  if(b.mode==='chase'){
    if(dist>15){b.x+=(dx/dist)*b.speed;b.y+=(dy/dist)*b.speed;}
    const dmg=b.type==='boar'?2:1;
    if(dist<25&&player.inv<=0&&!player.hiding){
      player.hp-=dmg; player.inv=110; shake=30; glitch=30; A.dmg();
      if(player.hp<=0){gs=ST.DEATH;deathTmr=0;}
      else{
        showTxt((b.type==='deer'?'CERVO':'JAVALI')+' atacou! Vida: '+player.hp);
        player.x-=(dx/dist)*60; player.y-=(dy/dist)*60;
      }
    }
  }
  b.x=Math.max(30,Math.min(MW-30,b.x));
  b.y=Math.max(30,Math.min(MH-30,b.y));
  b.frame++;
}

// ─── TEAM AI ──────────────────────────────────────────────────
const TOFF={
  moraes:{x:-42,y:32},enzo:{x:-55,y:-12},rafael:{x:52,y:-12},
  murilo:{x:-38,y:48},zahara:{x:38,y:44},bia:{x:56,y:28},taylline:{x:48,y:-28}
};

function updateTeam(){
  for(const key in team){
    const m=team[key],off=TOFF[key]||{x:0,y:0};
    if((key==='enzo'||key==='rafael')&&m.hackTarget&&!m.hackTarget.fixed){
      const tx=m.hackTarget.x+(key==='enzo'?-22:22),ty=m.hackTarget.y+18;
      m.x+=(tx-m.x)*0.04; m.y+=(ty-m.y)*0.04;
      m.hackTarget.prog+=0.09;
      if(m.hackTarget.prog>=100){
        m.hackTarget.fixed=true; m.hackTarget.hacking=false; genFixed++;
        A.collect();
        showTxt(m.hackTarget.name+' CONSERTADO! ('+genFixed+'/3)');
        spawnP(m.hackTarget.x-cam.x,m.hackTarget.y-cam.y,'#00ffff',14);
        m.hackTarget=null;
        if(genFixed>=3&&bossPhase===0){
          bossPhase=1;
          showTxt('GERADORES ATIVOS! BOSSES ENTRANDO!');
          // Bosses com HP real: Cervo=8, Javali=10
          bossDeer={x:80,y:180,type:'deer',frame:0,speed:0.55,mode:'chase',eyeColor:'#ff0000',stun:0,hp:8,dead:false,heat:true,lkX:0,lkY:0};
          bossBoar={x:MW-80,y:MH-180,type:'boar',frame:0,speed:0.45,mode:'chase',eyeColor:'#ff0000',stun:0,hp:10,dead:false,charging:false,chargeDir:0,chargeTmr:0,lkX:0,lkY:0};
          startDlg(bossDlg()); A.chase(); shake=15; glitch=20;
        }
      }
      continue;
    }
    if(key==='murilo'&&m.distracting){
      m.distTmr--;
      m.x+=Math.cos(gt*0.06)*2.5; m.y+=Math.sin(gt*0.08)*1.8;
      m.x=Math.max(50,Math.min(MW-50,m.x)); m.y=Math.max(50,Math.min(MH-50,m.y));
      if(m.distTmr<=0){m.distracting=false;showTxt('Murilo voltou ao grupo.');}
      continue;
    }
    m.x+=(player.x+off.x-m.x)*0.05;
    m.y+=(player.y+off.y-m.y)*0.05;
  }

  const ea=Math.atan2(PC.vy||0.01,PC.vx||0.01)+Math.PI;
  eliasNPC.x+=(player.x+Math.cos(ea)*30-eliasNPC.x)*0.06;
  eliasNPC.y+=(player.y+Math.sin(ea)*30-eliasNPC.y)*0.06;

  if(shootCD>0)shootCD--;
  if(healCD>0)healCD--;
  if(staminaCD>0)staminaCD--;

  if(gt%90===0){
    const allE=enemies.filter(e=>!e.dead);
    if(bossDeer&&!bossDeer.dead)allE.push(bossDeer);
    if(bossBoar&&!bossBoar.dead)allE.push(bossBoar);
    let cl=null,cd=Infinity;
    for(const e of allE){
      const d=Math.hypot(e.x-player.x,e.y-player.y);
      if(d<cd){cd=d;cl=e;}
    }
    if(cl&&cd<320){
      const dir=cl.x<player.x-30?'ESQUERDA':(cl.x>player.x+30?'DIREITA':'FRENTE');
      const tp=cl.type==='deer'?'CERVO':(cl.type==='boar'?'JAVALI':'LOBO');
      tayllineWarning=tp+' a '+dir+'! ('+Math.floor(cd)+'m)';
      tayllineWarnTmr=130; A.static_();
    }
  }
  if(tayllineWarnTmr>0)tayllineWarnTmr--;
}

// ─── MAIN UPDATE ──────────────────────────────────────────────
function updateGame(){
  gt++;
  player.noise=Math.max(0,player.noise-0.5);

  if(!player.hiding){
    const mr=PC.update(player,keys);
    if(mr.mv){
      const si=mr.spr?9:16;
      if(gt%si===0){A.step();player.noise+=mr.spr?6:2;}
    }
    player.x=Math.max(20,Math.min(MW-20,player.x));
    player.y=Math.max(20,Math.min(MH-20,player.y));
  }
  if(player.inv>0)player.inv--;

  if(bossPhase===0){
    waveTimer--;
    if(waveTimer<=0&&waveNum<maxWaves){spawnWave();waveTimer=420+waveNum*60;}
  }

  enemies=enemies.filter(e=>!e.dead||e.stun>0);
  for(const e of enemies)updateEnemy(e);

  if(bossPhase>=1){
    updateBoss(bossDeer); updateBoss(bossBoar);
    if(bossBoar&&!bossBoar.dead&&!bossBoar.charging&&bossBoar.mode==='chase'){
      const d=Math.hypot(bossBoar.x-player.x,bossBoar.y-player.y);
      if(d<160&&d>40&&gt%180<5){
        bossBoar.charging=true;
        bossBoar.chargeDir=Math.atan2(player.y-bossBoar.y,player.x-bossBoar.x);
        bossBoar.chargeTmr=52;
        A.tone(60,0.35,'sawtooth',0.12);
        showTxt('JAVALI INVESTINDO!');
      }
    }
    if(bossBoar&&bossBoar.charging){
      bossBoar.chargeTmr--;
      bossBoar.x+=Math.cos(bossBoar.chargeDir)*4;
      bossBoar.y+=Math.sin(bossBoar.chargeDir)*4;
      if(bossBoar.chargeTmr<=0)bossBoar.charging=false;
    }
  }

  if(bomb.planted){
    countdownTimer--;
    if(countdownTimer<=0){gs=ST.ENDING;endTmr=0;A.boom();shake=50;glitch=60;}
  }

  updateTeam();

  cam.x+=(player.x-W/2-cam.x)*0.08;
  cam.y+=(player.y-H/2-cam.y)*0.08;
  cam.x=Math.max(0,Math.min(MW-W,cam.x));
  cam.y=Math.max(0,Math.min(MH-H,cam.y));

  if(shake>0){
    cam.x+=(Math.random()-0.5)*shake; cam.y+=(Math.random()-0.5)*shake;
    shake*=0.85; if(shake<0.4)shake=0;
  }

  const allE2=enemies.filter(e=>!e.dead);
  if(bossDeer&&!bossDeer.dead)allE2.push(bossDeer);
  if(bossBoar&&!bossBoar.dead)allE2.push(bossBoar);
  const minD=allE2.length?Math.min(...allE2.map(e=>Math.hypot(e.x-player.x,e.y-player.y))):999;
  if(minD<170){
    const hi=Math.max(15,65-(170-Math.min(170,minD))*0.35);
    if(gt%Math.floor(hi)===0)A.hb();
  }

  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.life--;}
  particles=particles.filter(p=>p.life>0);
  for(const b of lightningBolts)b.life--;
  lightningBolts=lightningBolts.filter(b=>b.life>0);

  if(txtTmr>0)txtTmr--;
  lTmr++;
  if(lTmr>700+Math.random()*1000){lFlash=20;lTmr=0;}
  if(lFlash>0)lFlash-=0.8;
}

// ============================================================
//  ECO DE METAL: O ACERTO DE CONTAS FINAL
//  PARTE 2 de 2
// ============================================================

// ─── LAB FLOOR ────────────────────────────────────────────────
function drawLabFloor(){
  const TILE=40;
  const sc=Math.floor(cam.x/TILE),ec=Math.ceil((cam.x+W)/TILE)+1;
  const sr=Math.floor(cam.y/TILE),er=Math.ceil((cam.y+H)/TILE)+1;
  for(let r=sr;r<=er;r++){
    for(let c=sc;c<=ec;c++){
      const wx=Math.floor(c*TILE-cam.x),wy=Math.floor(r*TILE-cam.y);
      ctx.fillStyle=(r+c)%2===0?'#0a0e14':'#0c1018';
      ctx.fillRect(wx,wy,TILE,TILE);
      ctx.strokeStyle='rgba(0,255,200,.04)';ctx.lineWidth=1;
      ctx.strokeRect(wx,wy,TILE,TILE);
      if(r%5===0&&c%7===0){
        ctx.fillStyle='#080c0c';ctx.fillRect(wx+14,wy+14,12,12);
        ctx.strokeStyle='rgba(0,180,150,.15)';
        for(let gi=0;gi<3;gi++){
          ctx.beginPath();ctx.moveTo(wx+15,wy+16+gi*3);ctx.lineTo(wx+25,wy+16+gi*3);ctx.stroke();
        }
      }
    }
  }
}

function drawLabWalls(){
  const TILE=40;
  const sc=Math.floor(cam.x/TILE),ec=Math.ceil((cam.x+W)/TILE)+1;
  const sr=Math.floor(cam.y/TILE),er=Math.ceil((cam.y+H)/TILE)+1;
  for(let c=sc;c<=ec;c++){
    for(let r=0;r<2;r++){
      const wx=Math.floor(c*TILE-cam.x),wy=Math.floor(r*TILE-cam.y);
      if(wy>H+TILE||wy<-TILE)continue;
      ctx.fillStyle='#0d1a1a';ctx.fillRect(wx,wy,TILE,TILE);
      ctx.fillStyle='#0f2020';ctx.fillRect(wx+2,wy+2,TILE-4,TILE-4);
      ctx.fillStyle='#1a2a2a';
      ctx.fillRect(wx+3,wy+3,3,3);ctx.fillRect(wx+TILE-6,wy+3,3,3);
      ctx.fillRect(wx+3,wy+TILE-6,3,3);ctx.fillRect(wx+TILE-6,wy+TILE-6,3,3);
      if(r===1){ctx.fillStyle='#0a2222';ctx.fillRect(wx,wy+TILE-6,TILE,6);}
    }
  }
  for(let r=sr;r<=er;r++){
    for(let c=0;c<2;c++){
      const wx=Math.floor(c*TILE-cam.x),wy=Math.floor(r*TILE-cam.y);
      if(wx>W+TILE||wx<-TILE)continue;
      ctx.fillStyle='#0d1a1a';ctx.fillRect(wx,wy,TILE,TILE);
      ctx.fillStyle='#0f2020';ctx.fillRect(wx+2,wy+2,TILE-4,TILE-4);
      if(c===1){ctx.fillStyle='#0a2222';ctx.fillRect(wx+TILE-6,wy,6,TILE);}
    }
  }
}

function drawGlowLines(){
  ctx.strokeStyle='rgba(0,255,200,'+(0.025+Math.sin(gt*0.03)*0.015)+')';
  ctx.lineWidth=1;
  for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
}

function drawLabEquipment(){
  const equip=[
    {x:150,y:150,t:'console'},{x:500,y:150,t:'server'},
    {x:900,y:150,t:'console'},{x:1300,y:150,t:'server'},
    {x:150,y:700,t:'monitor'},{x:600,y:700,t:'console'},
    {x:1000,y:700,t:'server'},{x:1400,y:700,t:'monitor'},
    {x:680,y:430,t:'bigcore'},{x:820,y:430,t:'bigcore'},
    {x:680,y:570,t:'bigcore'},{x:820,y:570,t:'bigcore'}
  ];
  for(const eq of equip){
    const ex=Math.floor(eq.x-cam.x),ey=Math.floor(eq.y-cam.y);
    if(ex<-80||ex>W+80||ey<-80||ey>H+80)continue;
    if(eq.t==='console')drawConsole(ex,ey);
    else if(eq.t==='server')drawServer(ex,ey);
    else if(eq.t==='monitor')drawMonitor(ex,ey);
    else if(eq.t==='bigcore')drawBigcore(ex,ey);
  }
  drawPipes();
}

function drawConsole(x,y){
  dr(x-20,y-8,40,20,'#061216');dr(x-18,y-6,36,16,'#0a1c1c');
  for(let i=0;i<3;i++){
    const on=gt%120<60&&i===1;
    ctx.fillStyle=on?'#003322':'#020808';ctx.fillRect(x-16+i*13,y-4,11,10);
    if(on){ctx.fillStyle='rgba(0,255,150,.5)';ctx.fillRect(x-15+i*13,y-3,9,2);ctx.fillRect(x-15+i*13,y,6,2);}
  }
  for(let i=0;i<4;i++){ctx.fillStyle=i===0?'#ff2200':(i===1?'#00aa44':'#003355');ctx.fillRect(x-16+i*9,y+8,6,4);}
}

function drawServer(x,y){
  dr(x-16,y-30,32,60,'#060e10');dr(x-14,y-28,28,56,'#0a1618');
  for(let i=0;i<6;i++){
    ctx.fillStyle=i%3===0?'#001a10':'#030a0a';ctx.fillRect(x-12,y-26+i*9,24,7);
    if(gt%60<30&&i%2===0){ctx.fillStyle='#00ff44';ctx.fillRect(x+10,y-25+i*9,3,3);}
  }
}

function drawMonitor(x,y){
  dr(x-18,y-20,36,28,'#050d0d');dr(x-16,y-18,32,24,'#0a1818');
  const on=gt%90<70;
  ctx.fillStyle=on?'#002a1e':'#030808';ctx.fillRect(x-14,y-16,28,20);
  if(on){
    ctx.fillStyle='rgba(0,255,180,.35)';
    for(let i=0;i<4;i++)ctx.fillRect(x-12,y-14+i*4,16+Math.sin(gt*0.05+i)*5,2);
    ctx.fillStyle='rgba(0,255,180,.08)';ctx.fillRect(x-14,y-16+(gt*2)%20,28,1);
  }
  ctx.fillStyle='#040c0c';ctx.fillRect(x-3,y+8,6,8);ctx.fillRect(x-8,y+14,16,4);
}

function drawBigcore(x,y){
  ctx.fillStyle='#060e14';ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#0a2030';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#0a1a22';ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fill();
  const pulse=16+Math.sin(gt*0.06)*8;
  ctx.strokeStyle='rgba(0,200,255,'+(0.1+Math.sin(gt*0.06)*0.08)+')';
  ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,pulse,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(0,180,220,'+(0.15+Math.sin(gt*0.08)*0.1)+')';
  ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();
}

function drawPipes(){
  [{wy:80},{wy:680},{wy:400}].forEach(p=>{
    const py=Math.floor(p.wy-cam.y);
    if(py<-20||py>H+20)return;
    ctx.fillStyle='#0a2222';ctx.fillRect(0,py,W,8);
    for(let px=0;px<W;px+=80){ctx.fillStyle='#0d2828';ctx.fillRect(px-4,py-2,8,12);}
  });
  [100,700,1200].forEach(vx=>{
    const px=Math.floor(vx-cam.x);
    if(px<-20||px>W+20)return;
    ctx.fillStyle='#0a2222';ctx.fillRect(px,0,8,H);
  });
}

function drawCenterBunker(){
  const cx=Math.floor(800-cam.x),cy=Math.floor(500-cam.y);
  if(cx<-200||cx>W+200||cy<-200||cy>H+200)return;
  ctx.strokeStyle='rgba(0,200,255,.12)';ctx.lineWidth=2;
  ctx.strokeRect(cx-120,cy-100,240,200);
  ctx.fillStyle='#080e14';ctx.fillRect(cx-50,cy-40,100,80);
  ctx.strokeStyle='rgba(0,180,220,.2)';ctx.lineWidth=2;ctx.strokeRect(cx-50,cy-40,100,80);
  ctx.fillStyle='rgba(0,150,200,'+(0.08+Math.sin(gt*0.06)*0.05)+')';
  ctx.fillRect(cx-48,cy-38,96,76);
  if(bossPhase>=2){
    ctx.strokeStyle='rgba(0,255,200,'+(0.3+Math.sin(gt*0.1)*0.2)+')';
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,30,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(0,200,150,'+(0.12+Math.sin(gt*0.08)*0.08)+')';
    ctx.beginPath();ctx.arc(cx,cy,25,0,Math.PI*2);ctx.fill();
    if(Math.hypot(player.x-800,player.y-500)<120){
      T.box('PLANTAR AQUI [E]',cx-42,cy,{size:9,color:'#00ffcc',bg:'rgba(0,20,20,.9)',padding:5,border:'#00ccaa'});
    }
  }
}

// ─── DRAW GENERATOR ───────────────────────────────────────────
function drawGen(g){
  const x=Math.floor(g.x-cam.x),y=Math.floor(g.y-cam.y);
  if(x<-70||x>W+70||y<-70||y>H+70)return;
  ctx.fillStyle=g.fixed?'#082a18':'#0a1a22';ctx.fillRect(x-20,y-18,40,36);
  ctx.strokeStyle=g.fixed?'rgba(0,255,120,.4)':'rgba(0,160,200,.3)';
  ctx.lineWidth=2;ctx.strokeRect(x-20,y-18,40,36);
  ctx.fillStyle=g.fixed?'#0d3a22':'#0d2030';ctx.fillRect(x-16,y-14,32,28);
  const lc=g.fixed?'#00ff88':(gt%40<20?'#ff4444':'#882222');
  ctx.fillStyle=lc;ctx.fillRect(x-6,y-22,12,6);
  ctx.globalAlpha=g.fixed?0.3:0.15;ctx.fillStyle=lc;
  ctx.beginPath();ctx.arc(x,y-19,10,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#0a1a1a';ctx.fillRect(x+16,y-22,5,10);
  if(g.hacking&&!g.fixed){
    ctx.fillStyle='#001a22';ctx.fillRect(x-28,y-36,56,10);
    ctx.fillStyle='#00aaff';ctx.fillRect(x-27,y-35,g.prog*0.54,8);
    T.draw(Math.floor(g.prog)+'%',x-8,y-31,{size:8,color:'#00ffff'});
    ctx.globalAlpha=0.3+Math.sin(gt*0.15)*0.2;ctx.fillStyle='#00aaff';
    ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  if(!g.fixed&&Math.hypot(player.x-g.x,player.y-g.y)<70){
    ctx.globalAlpha=0.85+Math.sin(gt*0.18)*0.15;
    T.box(g.hacking?'Hackeando...':'[E] Hackear',x-38,y-45,{
      size:10,color:'#00ffcc',bg:'rgba(0,30,30,.92)',padding:5,border:'#008866'
    });
    ctx.globalAlpha=1;
  }
}

// ─── DRAW BOMB ────────────────────────────────────────────────
function drawBomb(){
  if(!bomb.active)return;
  if(!bomb.planted){
    const bx=Math.floor(player.x-cam.x+18);
    const by=Math.floor(player.y-cam.y-18+Math.sin(gt*0.15)*3);
    ctx.globalAlpha=0.6+Math.sin(gt*0.2)*0.3;
    ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(bx,by,11,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    dr(bx-4,by-4,9,9,'#aa3300');dr(bx-2,by-2,5,5,'#ff6600');
    T.draw('BOMBA',bx-12,by-16,{size:8,color:'#ff6600'});
    if(bossPhase===2&&Math.hypot(player.x-800,player.y-500)<100){
      ctx.globalAlpha=0.85+Math.sin(gt*0.18)*0.15;
      T.box('[E] PLANTAR BOMBA!',bx-58,by-32,{size:12,color:'#ff4400',bg:'rgba(80,0,0,.92)',padding:8,border:'#ff0000'});
      ctx.globalAlpha=1;
    }
  }else{
    const bx=Math.floor(bomb.x-cam.x),by=Math.floor(bomb.y-cam.y);
    const secs=Math.ceil(countdownTimer/60);
    ctx.globalAlpha=0.4+Math.sin(gt*0.4)*0.4;
    ctx.fillStyle='#ff0000';ctx.beginPath();ctx.arc(bx,by,28+Math.sin(gt*0.5)*6,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    dr(bx-12,by-12,24,24,'#aa0000');dr(bx-7,by-7,14,14,'#ff4400');
    T.mid(secs+'s',by-40,{size:18,color:secs<=3?'#ff0000':'#ffaa00',bold:true});
  }
}

// ─── DRAW LIGHTNING ───────────────────────────────────────────
function drawLightning(){
  for(const b of lightningBolts){
    const a=b.life/b.ml;
    ctx.globalAlpha=a*0.9;
    ctx.strokeStyle='rgba(100,255,255,'+a+')';ctx.lineWidth=2;
    ctx.shadowBlur=8;ctx.shadowColor='#00ffff';
    ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.stroke();
    ctx.lineWidth=1;ctx.strokeStyle='rgba(200,255,255,'+(a*0.6)+')';
    ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.stroke();
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
}

// ─── DRAW ENEMIES ─────────────────────────────────────────────
function drawWolf(e,sx,sy){
  if(e.dead)return;
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(e.frame*0.15));
  if(e.stun>0)x+=Math.random()*4-2;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+12,10,3,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(e.frame*0.18)*(e.mode==='chase'?3:1);
  dr(x-8,y+2,3,10,'#3a3a4a');dr(x+5,y+2,3,10,'#3a3a4a');
  dr(x-5,y+3+lg,2,8,'#4a4a5a');dr(x+3,y+3-lg,2,8,'#4a4a5a');
  dr(x-8,y-4,16,8,'#3a3a4a');dr(x-6,y-3,12,6,'#4a4a5a');
  dr(x-4,y-8,8,6,'#3a3a4a');
  const ec=e.stun>0?(e.stun%8<4?'#fff':'#ff0'):'#ff4400';
  dr(x-3,y-7,2,2,ec);dr(x+1,y-7,2,2,ec);
  if(e.mode==='chase'){ctx.globalAlpha=0.4;ctx.fillStyle=ec;ctx.beginPath();ctx.arc(x,y-6,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  dr(x-6,y-1,2,3,'#555');dr(x+4,y-1,2,3,'#555');
  e.frame++;
}

// Cervo Boss com barra de HP real
function drawBossDeer(b,sx,sy){
  if(!b||b.dead)return;
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(b.frame*0.1)*1.5);
  if(b.stun>0)x+=Math.random()*5-2.5;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(x,y+22,16,5,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(b.frame*0.12)*4;
  dr(x-14,y+3,5,20,'#4a3a2a');dr(x+9,y+3,5,20,'#4a3a2a');
  dr(x-7,y+5+lg*0.4,4,18,'#5a4a3a');dr(x+3,y+5-lg*0.4,4,18,'#5a4a3a');
  dr(x-14,y-5,28,14,'#5a3a1a');dr(x-12,y-4,24,12,'#6a4a2a');
  if(b.heat){
    ctx.globalAlpha=0.2+Math.sin(gt*0.15)*0.1;ctx.fillStyle='#ff4400';
    ctx.beginPath();ctx.arc(x,y-10,100,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  dr(x-5,y-12,10,8,'#5a3a1a');dr(x-10,y-26,20,16,'#5a3a1a');dr(x-14,y-20,5,6,'#4a2a0a');
  const ec=b.stun>0?(b.stun%8<4?'#fff':'#ff0'):b.eyeColor;
  dr(x-7,y-23,5,5,'#111');dr(x+2,y-23,5,5,'#111');
  dr(x-6,y-22,4,4,ec);dr(x+3,y-22,4,4,ec);
  ctx.globalAlpha=0.55+Math.sin(gt*0.08)*0.1;ctx.fillStyle=ec;
  ctx.beginPath();ctx.arc(x-4,y-20,6,0,Math.PI*2);ctx.arc(x+5,y-20,6,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  dr(x-6,y-30,2,7,'#555');dr(x-9,y-34,2,6,'#666');dr(x-12,y-36,2,4,'#777');
  dr(x+4,y-30,2,7,'#555');dr(x+7,y-34,2,6,'#666');dr(x+10,y-36,2,4,'#777');
  if(gt%35<18&&b.stun<=0){dr(x-12,y-37,2,2,'#f00');dr(x+10,y-37,2,2,'#f00');}
  if(b.mode==='chase'&&gt%5<2)
    for(let i=0;i<4;i++)dr(x+(Math.random()-0.5)*24,y+Math.random()*18,1,1,'#ff4');

  // ── Barra de HP do Cervo (acima do sprite) ──
  const hpMax=8,hpCur=Math.max(0,b.hp);
  dr(x-22,y-46,44,6,'#1a0808');
  dr(x-21,y-45,Math.floor((hpCur/hpMax)*42),4,'#ff4444');
  T.draw('CERVO '+hpCur+'/'+hpMax,x-22,y-52,{size:7,color:'#ff4444'});

  b.frame++;
}

// Javali Boss com barra de HP real
function drawBossBoar(b,sx,sy){
  if(!b||b.dead)return;
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(b.frame*0.08));
  if(b.stun>0)x+=Math.random()*6-3;
  if(b.charging)x+=Math.random()*3-1.5;
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(x,y+20,22,6,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(b.frame*0.1)*(b.charging?6:2);
  dr(x-18,y+2,7,16,'#3a2a1a');dr(x+11,y+2,7,16,'#3a2a1a');
  dr(x-12,y+4+lg*0.3,6,14,'#4a3a2a');dr(x+6,y+4-lg*0.3,6,14,'#4a3a2a');
  dr(x-18,y+17,7,3,'#222');dr(x+11,y+17,7,3,'#222');
  dr(x-20,y-9,40,20,'#3a2a1a');dr(x-18,y-8,36,18,'#4a3a2a');
  dr(x-16,y-7,10,7,'#5a4a3a');dr(x+6,y-7,10,7,'#5a4a3a');
  dr(x-14,y-18,28,14,'#3a2a1a');dr(x-18,y-14,7,9,'#3a2a1a');dr(x-16,y-9,3,3,'#222');
  const tk=b.charging?'#ffaa00':'#888';
  dr(x-20,y-9,3,9,tk);dr(x-18,y-16,3,9,tk);
  const ec=b.stun>0?(b.stun%8<4?'#fff':'#ff0'):(b.charging?'#f00':b.eyeColor);
  dr(x-10,y-16,5,5,'#111');dr(x+5,y-16,5,5,'#111');
  dr(x-9,y-15,4,4,ec);dr(x+6,y-15,4,4,ec);
  ctx.globalAlpha=0.55+Math.sin(gt*0.07)*0.1;ctx.fillStyle=ec;
  ctx.beginPath();ctx.arc(x-7,y-13,6,0,Math.PI*2);ctx.arc(x+8,y-13,6,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  dr(x-12,y-20,4,4,'#4a3a2a');dr(x+8,y-20,4,4,'#4a3a2a');
  if(b.charging)for(let i=0;i<5;i++)dr(x+(Math.random()-0.5)*35,y+Math.random()*14-6,1,1,'#ff4');

  // ── Barra de HP do Javali (acima do sprite) ──
  const hpMax=10,hpCur=Math.max(0,b.hp);
  dr(x-25,y-28,50,6,'#1a0a00');
  dr(x-24,y-27,Math.floor((hpCur/hpMax)*48),4,'#ff8800');
  T.draw('JAVALI '+hpCur+'/'+hpMax,x-25,y-34,{size:7,color:'#ff8800'});

  b.frame++;
}

// ─── DARKNESS ─────────────────────────────────────────────────
function drawDark(){
  const px=player.x-cam.x,py=player.y-cam.y-5;
  const off=document.createElement('canvas');off.width=W;off.height=H;
  const oc=off.getContext('2d');
  const dk=0.74-(lFlash>0?lFlash*0.025:0);
  oc.fillStyle='rgba(0,2,8,'+dk+')';oc.fillRect(0,0,W,H);
  oc.globalCompositeOperation='destination-out';
  oc.fillStyle='rgba(0,0,0,1)';oc.beginPath();oc.arc(px,py,80*0.75,0,Math.PI*2);oc.fill();
  oc.globalCompositeOperation='source-over';
  const gr=oc.createRadialGradient(px,py,4,px,py,80);
  gr.addColorStop(0,'rgba(0,2,8,0)');gr.addColorStop(0.5,'rgba(0,2,8,.12)');gr.addColorStop(1,'rgba(0,2,8,'+dk+')');
  oc.fillStyle=gr;oc.beginPath();oc.arc(px,py,80,0,Math.PI*2);oc.fill();
  function cut(ex,ey,er){
    oc.globalCompositeOperation='destination-out';oc.fillStyle='rgba(0,0,0,.4)';
    oc.beginPath();oc.arc(ex,ey,er,0,Math.PI*2);oc.fill();oc.globalCompositeOperation='source-over';
  }
  cut(eliasNPC.x-cam.x,eliasNPC.y-cam.y,26);
  for(const k in team)cut(team[k].x-cam.x,team[k].y-cam.y,16);
  for(const e of enemies)if(!e.dead&&e.stun<=0)cut(e.x-cam.x,e.y-cam.y-6,e.mode==='chase'?18:8);
  if(bossDeer&&!bossDeer.dead&&bossDeer.stun<=0)cut(bossDeer.x-cam.x,bossDeer.y-cam.y-20,30);
  if(bossBoar&&!bossBoar.dead&&bossBoar.stun<=0)cut(bossBoar.x-cam.x,bossBoar.y-cam.y-13,26);
  if(bomb.planted)cut(bomb.x-cam.x,bomb.y-cam.y,55);
  ctx.drawImage(off,0,0);
}

// ─── VHS ──────────────────────────────────────────────────────
function drawVHS(){
  ctx.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  if(glitch>0){
    for(let i=0;i<2;i++){const gy=Math.random()*H,gh=2+Math.random()*5;ctx.drawImage(canvas,0,gy,W,gh,Math.random()*12-6,gy,W,gh);}
    glitch--;
  }
  if(Math.random()<0.006)glitch=Math.floor(Math.random()*5)+2;
  ctx.globalAlpha=0.02;
  ctx.fillStyle='#00ffcc';ctx.fillRect(0,0,2,H);ctx.fillRect(W-2,0,2,H);
  ctx.fillStyle='#0088ff';ctx.fillRect(0,0,W,2);ctx.fillRect(0,H-2,W,2);
  ctx.globalAlpha=1;
  const vg=ctx.createRadialGradient(W/2,H/2,W*0.25,W/2,H/2,W*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,2,8,.5)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  if(gt%85<60){
    ctx.fillStyle='#00ccaa';ctx.beginPath();ctx.arc(14,16,5,0,Math.PI*2);ctx.fill();
    T.draw('REC',24,16,{size:11,color:'#009988'});
  }
  const m=Math.floor(gt/3600),s=Math.floor((gt/60)%60);
  T.draw(String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'),W-50,16,{size:11,color:'#446666'});
}

// ─── HUD ──────────────────────────────────────────────────────
function drawHUD(){
  // HP
  dr(10,H-35,100,32,'rgba(0,10,15,.85)');
  T.draw('VIDA',14,H-27,{size:10,color:'#00ccaa'});
  for(let i=0;i<player.maxHp;i++){
    const c=i<player.hp?'#00cc88':'#0a1a14';
    dr(14+i*14,H-19,12,10,c);
    if(i<player.hp){ctx.fillStyle='#00ffaa';ctx.fillRect(15+i*14,H-18,10,8);}
  }
  if(player.stamina<player.maxStamina){
    dr(75,H-27,35,6,'#050f0a');
    dr(76,H-26,(player.stamina/player.maxStamina)*33,4,player.stamina<25?'#aaff44':'#00ff88');
  }

  // Abilities row
  const abY=H-66;
  dr(10,abY-8,215,32,'rgba(0,10,15,.85)');
  const f1=healCD>0?Math.ceil(healCD/60)+'s':'OK';
  const f2=staminaCD>0?Math.ceil(staminaCD/60)+'s':'OK';
  const f3=shootCD>0?Math.ceil(shootCD/60)+'s':'OK';
  const f4=team.murilo.distracting?Math.ceil(team.murilo.distTmr/60)+'s':'OK';
  T.draw('[1]Cura:'+f1+' [2]Stam:'+f2+' [3]:'+f3+' [4]Dist:'+f4,14,abY,{size:8,color:'#88bbaa'});
  T.draw('Zahara     Bia    INSTAKILL  Murilo',14,abY+14,{size:7,color:'#446655'});

  // Progress
  const prY=H-106;
  dr(10,prY-8,182,32,'rgba(0,10,15,.85)');
  T.draw('Geradores: '+genFixed+'/3',14,prY,{size:10,color:genFixed>=3?'#00ff88':'#00aacc'});
  const phases=['Defender Hackers','BOSS FIGHT!','Plantar Bomba','FUGA!!!'];
  const phaseCol=bossPhase>=3?'#ff0000':(bossPhase>=1?'#ff8844':'#00ccff');
  T.draw(phases[Math.min(bossPhase,3)],14,prY+14,{size:10,color:phaseCol});

  // ── Boss HP bars no HUD (topo centro) ──
  if(bossDeer&&!bossDeer.dead){
    const hpCur=Math.max(0,bossDeer.hp);
    dr(W/2-90,8,100,22,'rgba(0,10,15,.9)');
    T.draw('CERVO HP:'+hpCur+'/8',W/2-86,15,{size:9,color:'#ff4444'});
    dr(W/2-86,22,88,4,'#1a0808');
    dr(W/2-85,23,Math.floor((hpCur/8)*86),2,'#ff4444');
  }
  if(bossBoar&&!bossBoar.dead){
    const hpCur=Math.max(0,bossBoar.hp);
    dr(W/2+14,8,105,22,'rgba(0,10,15,.9)');
    T.draw('JAVALI HP:'+hpCur+'/10',W/2+18,15,{size:9,color:'#ff8800'});
    dr(W/2+18,22,90,4,'#1a0a00');
    dr(W/2+19,23,Math.floor((hpCur/10)*88),2,'#ff8800');
  }

  // Wave
  if(bossPhase===0&&waveNum>0){
    dr(W-96,H-28,86,20,'rgba(0,10,15,.85)');
    T.draw('Onda '+waveNum+'/'+maxWaves,W-90,H-18,{size:9,color:'#00aacc'});
  }

  // Combat warning
  const allE=enemies.filter(e=>!e.dead);
  if(bossDeer&&!bossDeer.dead)allE.push(bossDeer);
  if(bossBoar&&!bossBoar.dead)allE.push(bossBoar);
  if(allE.some(e=>e.mode==='chase')&&gt%35<22)
    T.draw('!! COMBATE !!',W/2-55,48,{size:15,color:'#00ffcc',bold:true});

  // Taylline warning
  if(tayllineWarnTmr>0){
    ctx.globalAlpha=Math.min(1,tayllineWarnTmr/30);
    T.box(tayllineWarning,W/2-tayllineWarning.length*3.5,H/2-58,{
      size:11,color:'#ff88cc',bg:'rgba(20,0,30,.92)',padding:8,border:'#ff44aa'
    });
    ctx.globalAlpha=1;
  }

  // Countdown
  if(bomb.planted){
    const secs=Math.ceil(countdownTimer/60);
    const col=secs<=3?'#ff0000':(secs<=5?'#ff8800':'#ffdd00');
    T.mid('EVACUACAO: '+secs+'s',32,{size:16,color:col,bold:true});
    if(secs<=3&&gt%10<5){ctx.globalAlpha=0.18;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  }

  // Text popup
  if(txtTmr>0){
    ctx.globalAlpha=Math.min(1,txtTmr/70);
    T.box(curTxt,W/2-curTxt.length*3.8,H/2+90,{size:12,color:'#fff',bg:'rgba(0,8,12,.92)',padding:10});
    ctx.globalAlpha=1;
  }

  // Controls hint
  if(gt<700){
    ctx.globalAlpha=Math.max(0,1-gt/700);
    T.draw('[WASD] Mover | [1]Cura [2]Stam [3]INSTAKILL/DANO [4]Distrai | [E] Interagir',10,30,{size:8,color:'#336655'});
    ctx.globalAlpha=1;
  }
}

// ─── RENDER GAME ──────────────────────────────────────────────
function renderGame(){
  ctx.fillStyle='#070c10';ctx.fillRect(0,0,W,H);
  drawLabFloor();
  drawGlowLines();
  drawLabWalls();
  drawLabEquipment();
  drawCenterBunker();
  for(const g of generators)drawGen(g);
  drawBomb();

  const ents=[];
  for(const k in team)ents.push({t:'team',y:team[k].y,key:k,d:team[k]});
  ents.push({t:'elias',y:eliasNPC.y,d:eliasNPC});
  if(!player.hiding)ents.push({t:'jose',y:player.y,d:player});
  for(const e of enemies)if(!e.dead)ents.push({t:'wolf',y:e.y,d:e});
  if(bossDeer&&!bossDeer.dead)ents.push({t:'bossDeer',y:bossDeer.y,d:bossDeer});
  if(bossBoar&&!bossBoar.dead)ents.push({t:'bossBoar',y:bossBoar.y,d:bossBoar});
  ents.sort((a,b)=>a.y-b.y);

  for(const e of ents){
    const sx=e.d.x-cam.x,sy=e.d.y-cam.y;
    if(sx<-90||sx>W+90||sy<-120||sy>H+80){
      if(!['jose','elias','bossDeer','bossBoar','wolf'].includes(e.t))continue;
    }
    if(e.t==='jose'){
      const a=PC.anim();
      let al=1;if(player.inv>0&&Math.floor(player.inv/5)%2===0)al=0.5;
      drawChar(sx,sy,Object.assign({},CDEFS.jose,{bob:a.bob,armSwing:a.arm,alpha:al,crouching:player.crouching}));
    }else if(e.t==='elias'){
      const bob=Math.sin(gt*0.08+1)*(PC.mv?0.9:0);
      const arm=Math.sin(gt*0.16+1)*(PC.mv?3.5:0);
      drawChar(sx,sy,Object.assign({},CDEFS.elias,{bob,armSwing:arm}));
    }else if(e.t==='team'){
      const def=CDEFS[e.key]||CDEFS.moraes;
      const bob=Math.sin(gt*0.07+e.d.x*0.01)*(PC.mv?0.7:0);
      const arm=Math.sin(gt*0.14+e.d.x*0.01)*(PC.mv?2.8:0);
      let al=1;
      if((e.key==='enzo'||e.key==='rafael')&&e.d.hackTarget&&!e.d.hackTarget.fixed&&Math.floor(gt/8)%2===0)al=0.7;
      if(e.key==='murilo'&&team.murilo.distracting&&Math.floor(gt/6)%2===0)al=0.7;
      drawChar(sx,sy,Object.assign({},def,{
        bob,armSwing:arm,alpha:al,
        hasGun:e.key==='moraes',
        hasLaptop:e.key==='enzo'||e.key==='rafael',
        hasMedkit:e.key==='zahara'
      }));
      const icons={moraes:'[3]',enzo:'HACK',rafael:'HACK',murilo:'[4]',zahara:'[1]',bia:'[2]',taylline:'RADAR'};
      T.draw(icons[e.key]||'',sx-8,sy-26,{size:7,color:'#00ffcc'});
    }else if(e.t==='wolf'){
      drawWolf(e.d,sx,sy);
    }else if(e.t==='bossDeer'){
      drawBossDeer(e.d,sx,sy);
    }else if(e.t==='bossBoar'){
      drawBossBoar(e.d,sx,sy);
    }
  }

  for(const p of particles){
    ctx.globalAlpha=p.life/p.ml;
    ctx.fillStyle=p.color;
    ctx.fillRect(Math.floor(p.x),Math.floor(p.y),Math.ceil(p.sz),Math.ceil(p.sz));
  }
  ctx.globalAlpha=1;

  drawLightning();
  drawDark();

  if(lFlash>12){ctx.globalAlpha=(lFlash-12)/10*0.3;ctx.fillStyle='#00ffcc';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(player.hp<=1){const p=Math.sin(gt*0.065)*0.5+0.5;ctx.globalAlpha=0.07+p*0.06;ctx.fillStyle='#f00';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}

  drawHUD();
  drawVHS();
}

// ─── SCREENS ──────────────────────────────────────────────────
function renderTitle(){
  ctx.fillStyle='#030608';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(0,200,180,.03)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const ep=0.45+Math.sin(gt*0.05)*0.35;
  ctx.globalAlpha=ep;
  const eyes=[
    {x:45,y:135,c:'#ff8844'},{x:83,y:135,c:'#ff8844'},
    {x:115,y:140,c:'#ff4444'},{x:150,y:138,c:'#4488ff'},
    {x:182,y:140,c:'#88ff88'},{x:212,y:138,c:'#44aa44'},
    {x:244,y:140,c:'#ffdd00'},{x:274,y:138,c:'#aaaaaa'},
    {x:304,y:135,c:'#ff88cc'}
  ];
  for(const ed of eyes){dr(ed.x,ed.y,3,3,ed.c);dr(ed.x+8,ed.y,3,3,ed.c);}
  ctx.globalAlpha=1;
  T.mid('ECO DE METAL',44,{size:22,color:'#00ccaa',bold:true});
  T.mid('O ACERTO DE CONTAS FINAL',72,{size:13,color:'#008888'});
  T.mid('Laboratorio Secreto — Bunker Final',92,{size:9,color:'#005566'});
  const menu=['INICIAR MISSAO','SAIR'];
  for(let i=0;i<menu.length;i++){
    const sel=i===titleSel,my=172+i*32;
    if(sel){ctx.fillStyle='rgba(0,150,120,.25)';ctx.fillRect(W/2-100,my-14,200,28);T.mid('> '+menu[i]+' <',my,{size:14,color:'#00ffcc',bold:true});}
    else T.mid(menu[i],my,{size:13,color:'#006655'});
  }
  T.mid('[3] Lobos=INSTAKILL | Bosses=-2HP por tiro',H-48,{size:9,color:'#006655'});
  T.mid('Setas: Navegar | ENTER: Selecionar',H-22,{size:9,color:'#004444'});
  ctx.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gt++;
}

function renderIntro(){
  ctx.fillStyle='#030608';ctx.fillRect(0,0,W,H);
  const lines=[
    'ECO DE METAL: ACERTO DE CONTAS',
    '',
    'Jose (irmao de Elias) lidera o ataque.',
    'Laboratorio secreto sob a CAEA.',
    '',
    'FASE 1: Proteja os hackers (3 geradores)',
    'FASE 2: Bosses com HP real!',
    '  Cervo: 8 HP | Javali: 10 HP',
    '  [3] da -2 HP por tiro nos Bosses!',
    '  [3] da INSTAKILL nos Lobos!',
    'FASE 3: Plante a bomba no laboratorio.',
    'FASE 4: FUGA em 10 segundos!',
    '',
    'Pressione ENTER para comecar'
  ];
  for(let i=0;i<lines.length;i++){
    const col=lines[i].startsWith('FASE')?'#00aacc':
              lines[i].startsWith('[3]')||lines[i].startsWith('  [3]')?'#00ffcc':
              lines[i].startsWith('ECO')?'#00ccaa':
              lines[i].startsWith('Pressione')?'#44cc88':
              lines[i].startsWith('  Cervo')||lines[i].startsWith('  [3]')?'#ff8844':'#558877';
    T.draw(lines[i],30,18+i*19,{size:10,color:col});
  }
  ctx.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gt++;
}

function renderDialogueBg(){
  ctx.fillStyle='#030608';ctx.fillRect(0,0,W,H);
  drawGlowLines();
}

function renderDialogue(){
  if(gameInitialized&&generators.length>0) renderGame();
  else renderDialogueBg();
  if(!curDlg)return;
  const boxH=74,boxY=H-boxH-10;
  dr(10,boxY,W-20,boxH,'rgba(0,8,12,.96)');
  ctx.strokeStyle='#00ccaa';ctx.lineWidth=2;ctx.strokeRect(10,boxY,W-20,boxH);
  T.draw(curDlg.sp+':',22,boxY+16,{size:11,color:curDlg.cl||'#00ffcc',bold:true});
  const words=curDlg.txt.split(' ');
  let line='',ly=boxY+35;
  ctx.font='10px "Courier New",monospace';
  for(const w of words){
    const test=line+w+' ';
    if(ctx.measureText(test).width>W-50&&line!==''){
      T.draw(line.trim(),22,ly,{size:10,color:'#aaccbb',shadow:false});
      line=w+' ';ly+=16;
    }else line=test;
  }
  if(line)T.draw(line.trim(),22,ly,{size:10,color:'#aaccbb',shadow:false});
  if(gt%50<35)T.draw('[ENTER] Continuar',W-110,boxY+boxH-12,{size:9,color:'#336655'});
}

function renderPause(){
  ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(0,0,W,H);
  dr(W/2-92,H/2-84,184,168,'#030810');dr(W/2-90,H/2-82,180,164,'#050c14');
  ctx.strokeStyle='#00ccaa';ctx.lineWidth=2;ctx.strokeRect(W/2-90,H/2-82,180,164);
  T.mid('PAUSADO',H/2-58,{size:16,color:'#00ffcc',bold:true});
  const pi=['Continuar','Reiniciar','Menu'];
  for(let i=0;i<pi.length;i++){
    const s=i===pauseSel;
    if(s){ctx.fillStyle='rgba(0,150,120,.2)';ctx.fillRect(W/2-75,H/2-28+i*34,150,26);}
    T.mid((s?'> ':' ')+pi[i]+(s?' <':''),H/2-16+i*34,{size:13,color:s?'#00ffcc':'#336655'});
  }
  gt++;
}

function renderDeath(){
  deathTmr++;
  ctx.fillStyle='rgb(0,'+Math.min(8,Math.floor(deathTmr/20))+','+Math.min(12,Math.floor(deathTmr/15))+')';
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=0.06;
  for(let i=0;i<350;i++){
    ctx.fillStyle='rgb(0,'+Math.floor(Math.random()*20)+','+Math.floor(Math.random()*30)+')';
    ctx.fillRect(Math.random()*W,Math.random()*H,2,2);
  }
  ctx.globalAlpha=1;
  if(deathTmr>30&&deathTmr<200){
    const sc=1+(deathTmr-30)/35,ey=H/2-35-(deathTmr-30)*0.12,gl=Math.min(1,(deathTmr-30)/40);
    ctx.globalAlpha=gl;const es=3*sc;
    dr(W/2-55-10*sc/2-es,ey,es,es,'#f00');dr(W/2-55+10*sc/2,ey,es,es,'#f00');
    dr(W/2+25-14*sc/2-es,ey+12,es,es,'#f80');dr(W/2+25+14*sc/2,ey+12,es,es,'#f80');
    ctx.globalAlpha=1;
  }
  if(deathTmr>110)T.mid('MISSAO FRACASSADA',H/2+20,{size:20,color:'#00ccaa',bold:true});
  if(deathTmr>180)T.mid('O Cientista prevaleceu...',H/2+55,{size:12,color:'#005566'});
  if(deathTmr>280&&gt%55<38)T.mid('[ENTER] Tentar novamente',H/2+95,{size:12,color:'#334444'});
  ctx.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  if(Math.random()<0.12){const gy=Math.random()*H;ctx.drawImage(canvas,0,gy,W,7,Math.random()*15-7,gy,W,7);}
  gt++;
}

function renderEnding(){
  endTmr++;
  const t=Math.min(1,endTmr/400);
  if(endTmr<120){
    const b=endTmr/120;
    ctx.fillStyle='rgb('+Math.floor(200*b)+','+Math.floor(150*b)+','+Math.floor(60*b)+')';
    ctx.fillRect(0,0,W,H);
    if(endTmr<70){
      ctx.globalAlpha=1-endTmr/70;
      for(let i=0;i<20;i++){
        ctx.strokeStyle='rgba(0,255,200,.5)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.lineTo(Math.random()*W,Math.random()*H);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
  }else{
    const r=Math.floor(10+t*180),g=Math.floor(5+t*140),b=Math.floor(t*80);
    ctx.fillStyle='rgb('+r+','+g+','+b+')';ctx.fillRect(0,0,W,H);
  }
  if(endTmr>140){
    ctx.globalAlpha=Math.min(0.88,(endTmr-140)/80);
    ctx.fillStyle='#2a4a2a';ctx.fillRect(0,H*0.56,W,H*0.44);
    // 9 personagens — BIA agora com pele clara (#d4a574) via CDEFS corrigido
    const chars=[
      CDEFS.jose,CDEFS.elias,CDEFS.moraes,CDEFS.enzo,
      CDEFS.rafael,CDEFS.murilo,CDEFS.zahara,
      CDEFS.bia,      // pele clara
      CDEFS.taylline
    ];
    for(let i=0;i<chars.length;i++){
      const cx=W/2-112+i*28,cy=H*0.5;
      const bob=Math.sin(endTmr*0.1+i)*(endTmr<400?0.9:0);
      const arm=Math.sin(endTmr*0.15+i)*(endTmr<400?2.5:0);
      drawChar(cx,cy,Object.assign({},chars[i],{
        bob,armSwing:arm,alpha:ctx.globalAlpha,
        hasGun:i===2,hasLaptop:i===3||i===4,hasMedkit:i===6
      }));
    }
    ctx.globalAlpha=1;
  }
  if(endTmr>190)T.mid('O LABORATORIO IMPLODIU.',H*0.14,{size:14,color:'#00ccaa',bold:true});
  if(endTmr>290){
    T.mid('A rede do Cientista foi destruida.',H*0.21,{size:11,color:'#008877'});
    T.mid('O bunker colapsou sobre si mesmo.',H*0.28,{size:11,color:'#008877'});
  }
  if(endTmr>400){
    T.mid('Jose e Elias se abracam ao ar livre.',H*0.65,{size:12,color:'#aabbcc'});
    T.mid('"A paz voltou. O eco do metal silenciou."',H*0.73,{size:11,color:'#ccee88'});
  }
  if(endTmr>560){
    T.mid('A paz voltou para sempre.',H*0.82,{size:12,color:'#889988'});
    T.mid('F  I  M',H*0.9,{size:22,color:'#00ccaa'});
  }
  if(endTmr>700&&gt%65<48)T.mid('[ENTER] Menu Principal',H-10,{size:11,color:'#006655'});
  dr(0,0,W,18,'#000');dr(0,H-18,W,18,'#000');
  ctx.fillStyle='rgba(0,0,0,.06)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  gt++;
}

// ─── MAIN LOOP ────────────────────────────────────────────────
function loop(){
  switch(gs){
    case ST.TITLE:    renderTitle();    break;
    case ST.INTRO:    renderIntro();    break;
    case ST.DIALOGUE: renderDialogue(); break;
    case ST.PAUSE:    renderPause();    break;
    case ST.DEATH:    renderDeath();    break;
    case ST.ENDING:   renderEnding();   break;
    case ST.GAME:     updateGame(); renderGame(); break;
  }
  requestAnimationFrame(loop);
}

A.init();
loop();