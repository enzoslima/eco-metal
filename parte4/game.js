// ============================================================
//  SINAL PERDIDO — O MISTÉRIO DA ANTENA DE BLACKWOOD
//  Eco de Metal — Spin-Off  (parceiro ativo)
// ============================================================

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const W = 420, H = 320;
canvas.width = W; canvas.height = H;

function resizeCanvas(){
  const s = Math.min(innerWidth/W, innerHeight/H)*0.95;
  canvas.style.width  = W*s+'px';
  canvas.style.height = H*s+'px';
}
resizeCanvas(); addEventListener('resize', resizeCanvas);

/* ───── tiny text helper ───── */
const T={
  draw(t,x,y,o={}){
    const{size=12,color='#fff',shadow=true,bold=false}=o;
    ctx.font=`${bold?'bold ':''}${size}px "Courier New",monospace`;
    ctx.textBaseline='middle'; ctx.textAlign='left';
    if(shadow){ctx.fillStyle='#000';ctx.fillText(t,x+1,y+1);}
    ctx.fillStyle=color; ctx.fillText(t,x,y);
  },
  box(t,x,y,o={}){
    const{size=12,color='#fff',bg='rgba(0,0,0,.88)',padding=6,border=null}=o;
    ctx.font=`${size}px "Courier New",monospace`;
    const w=ctx.measureText(t).width+padding*2, h=size+padding*2;
    ctx.fillStyle=bg; ctx.fillRect(x-padding,y-h/2,w,h);
    if(border){ctx.strokeStyle=border;ctx.lineWidth=2;ctx.strokeRect(x-padding,y-h/2,w,h);}
    ctx.fillStyle=color; ctx.textBaseline='middle'; ctx.fillText(t,x,y);
  },
  center(t,y,o={}){const{size=12}=o;ctx.font=`${size}px "Courier New",monospace`;
    this.draw(t,W/2-ctx.measureText(t).width/2,y,o);}
};

/* ───── audio ───── */
const A={
  c:null,
  init(){try{this.c=new(AudioContext||webkitAudioContext)()}catch(e){}},
  u(){if(this.c?.state==='suspended')this.c.resume()},
  t(f,d,tp='square',v=.08){if(!this.c)return;try{const o=this.c.createOscillator(),g=this.c.createGain();o.type=tp;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(.001,this.c.currentTime+d);o.connect(g);g.connect(this.c.destination);o.start();o.stop(this.c.currentTime+d)}catch(e){}},
  step(){this.t(55+Math.random()*20,.04,'square',.02)},
  collect(){this.t(523,.07,'square',.06);setTimeout(()=>this.t(659,.07,'square',.06),60);setTimeout(()=>this.t(784,.09,'square',.06),120)},
  alert(){this.t(200,.1,'sawtooth',.07);setTimeout(()=>this.t(300,.1,'sawtooth',.07),70)},
  chase(){for(let i=0;i<4;i++)setTimeout(()=>this.t(300+i*70,.09,'sawtooth',.06),i*55)},
  dmg(){this.t(70,.2,'sawtooth',.1)},
  hack(){this.t(440,.1,'square',.07);setTimeout(()=>this.t(550,.1,'square',.07),90);setTimeout(()=>this.t(660,.12,'square',.08),180)},
  door(){this.t(200,.25,'sine',.06);setTimeout(()=>this.t(250,.2,'sine',.06),180)},
  partnerAct(){this.t(350,.08,'sine',.06);setTimeout(()=>this.t(420,.08,'sine',.06),80)},
  walkie(){this.t(800,.04,'square',.03);this.t(600,.04,'square',.02)},
  hb(){this.t(50,.08,'sine',.04);setTimeout(()=>this.t(40,.12,'sine',.03),90)},
  static(){if(!this.c)return;try{const b=this.c.createBuffer(1,this.c.sampleRate*.12,this.c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=this.c.createBufferSource(),g=this.c.createGain();g.gain.value=.05;s.buffer=b;s.connect(g);g.connect(this.c.destination);s.start()}catch(e){}},
};

/* ───── player physics ───── */
const PC={
  vx:0,vy:0,wk:0,dir:0,mv:false,
  spd:2,accel:.22,decel:.16,
  update(p,k,slow){
    let ix=0,iy=0;
    if(k['ArrowLeft']||k['KeyA'])ix--;if(k['ArrowRight']||k['KeyD'])ix++;
    if(k['ArrowUp']||k['KeyW'])iy--;if(k['ArrowDown']||k['KeyS'])iy++;
    if(ix&&iy){ix*=.707;iy*=.707}
    const spr=(k['ShiftLeft']||k['ShiftRight'])&&p.stamina>0&&!slow;
    let sp=this.spd*(spr?1.7:1);if(slow)sp*=.7;if(p.crouching)sp*=.55;
    if(spr&&(ix||iy))p.stamina=Math.max(0,p.stamina-.35);
    else p.stamina=Math.min(p.maxStamina,p.stamina+.12);
    if(ix||iy){this.vx+=(ix*sp-this.vx)*this.accel;this.vy+=(iy*sp-this.vy)*this.accel;this.mv=true;
      const a=Math.atan2(this.vy,this.vx);
      if(a>-Math.PI/4&&a<=Math.PI/4)this.dir=0;
      else if(a>Math.PI/4&&a<=3*Math.PI/4)this.dir=1;
      else if(a>-3*Math.PI/4&&a<=-Math.PI/4)this.dir=3;
      else this.dir=2;
    }else{this.vx*=(1-this.decel);this.vy*=(1-this.decel);
      if(Math.abs(this.vx)<.04)this.vx=0;if(Math.abs(this.vy)<.04)this.vy=0;
      this.mv=Math.abs(this.vx)>.08||Math.abs(this.vy)>.08;}
    if(this.mv)this.wk+=.12*Math.sqrt(this.vx*this.vx+this.vy*this.vy);
    else this.wk*=.85;
    p.x+=this.vx;p.y+=this.vy;
    return{spr,mv:this.mv};
  },
  anim(){return{bob:Math.sin(this.wk)*(this.mv?1.2:0),arm:Math.sin(this.wk*2)*(this.mv?5:0)}},
  reset(){this.vx=0;this.vy=0;this.wk=0;this.dir=0;this.mv=false;}
};

/* ───── states ───── */
const S={TITLE:0,SEL:1,INTRO:2,GAME:3,PAUSE:4,DEATH:5,PUZZLE:6,DIAL:7,END:8};
const MW=1600,MH=1000;

/* ───── globals ───── */
let gs=S.TITLE, chosen='enzo', tSel=0, cSel=0, iStep=0, iTmr=0, pSel=0;
let gt=0, dTmr=0, eTmr=0, shake=0, glitch=0, lTmr=0, lFlash=0;
let walkieWarn=0, hackCD=0;
let player,partner,cam;
let keys={};
let items={},fl={};
let buildings=[],obstacles=[],collectibles=[],enemies=[],birds=[],wolves=[],doors=[],puzzles=[];
let rain=[],fog=[],particles=[];
let txtTmr=0,curTxt='';
let dlgQ=[],curDlg=null;
let actPz=null,pzProg=0;
let nearClue=null,nearDoor=null,nearPz=null;

/* ───── partner state ───── */
let partnerAction='idle'; // idle, following, hacking, distracting
let partnerActionTimer=0;
let partnerBubble='';
let partnerBubbleTimer=0;

/* ───── FINAL MISSION STATE (BOMBA + GERADOR) ───── */
let bombSpawned=false;
let generator=null; // {x,y,armed,blown,timer}

/* ───── init ───── */
function init(){
  player={x:200,y:300,hiding:false,crouching:false,hp:4,maxHp:4,stamina:100,maxStamina:100,inv:0,noise:0};

  // Partner follows you
  partner={
    x:230,y:310,
    frame:0,
    active:true,
    // Skills
    canHack: chosen==='murilo',   // If you're Murilo, Enzo (partner) hacks
    canDistract: chosen==='enzo', // If you're Enzo, Murilo (partner) distracts
    name: chosen==='enzo' ? 'Murilo' : 'Enzo',
    skinColor: chosen==='enzo' ? '#8b5e3c' : '#d4a574',
    shirtColor: chosen==='enzo' ? '#225522' : '#2244aa',
    pantsColor: chosen==='enzo' ? '#224488' : '#eeeedd',
    cooldown: 0,
    busy: false,
    busyTimer: 0,
    targetX: 230, targetY: 310
  };

  partnerAction='following';
  partnerActionTimer=0;
  partnerBubble='';
  partnerBubbleTimer=0;

  cam={x:0,y:0};

  // ✅ inventário com bomba
  items={batteries:2,parts:0,flares:1,bomb:false};

  fl={on:true,battery:100,range:chosen==='enzo'?75:55,dynamo:chosen==='murilo'?80:100};

  enemies=[
    {x:900,y:350,type:'deer',frame:0,speed:.5,mode:'patrol',eyeColor:'#ffcc00',
     stun:0,alert:0,pDir:0,pTmr:0,lkX:0,lkY:0,callBoar:false,heat:false},
    {x:1200,y:600,type:'boar',frame:0,speed:.4,mode:'patrol',eyeColor:'#ffcc00',
     stun:0,alert:0,pDir:1,pTmr:0,charging:false,cDir:0,cTmr:0,responding:false}
  ];
  birds=[
    {x:300,y:70,vx:.7,sa:0,spot:false,alrt:false},
    {x:800,y:80,vx:-.5,sa:1,spot:false,alrt:false},
  ];
  wolves=[
    {x:500,y:500,frame:0,speed:.55,mode:'patrol',eyeColor:'#44aaff',alert:0,pDir:0,pTmr:0}
  ];

  buildings=[
    {x:60,y:80,w:100,h:90,type:'garage',name:'Garagem do Enzo',hide:true},
    {x:300,y:60,w:80,h:70,type:'house',name:'Casa Abandonada',hide:true},
    {x:550,y:50,w:120,h:100,type:'school',name:'Escola Municipal',hide:true},
    {x:850,y:80,w:100,h:90,type:'church',name:'Igreja',hide:true},
    {x:1100,y:60,w:140,h:110,type:'factory',name:'Fábrica Antiga',hide:false},
    {x:1350,y:80,w:100,h:90,type:'house',name:'Casa da Maya',hide:true},
    {x:650,y:750,w:120,h:100,type:'lab',name:'Laboratório',hide:false,locked:true}
  ];

  obstacles=[];
  for(let i=0;i<18;i++){
    obstacles.push({x:80+i*85+Math.random()*30,y:280+Math.random()*180,
      w:14+Math.random()*18,h:8+Math.random()*10,type:Math.random()>.5?'car':'debris'});
  }

  collectibles=[
    {x:120,y:140,type:'part',name:'Capacitor',col:false},
    {x:350,y:120,type:'battery',name:'Pilha AA',col:false},
    {x:600,y:130,type:'part',name:'Antena',col:false},
    {x:880,y:150,type:'battery',name:'Pilha 9V',col:false},
    {x:1130,y:120,type:'part',name:'Circuito',col:false},
    {x:1380,y:140,type:'part',name:'Amplificador',col:false},
    {x:700,y:800,type:'flare',name:'Sinalizador',col:false},

    // 💣 Bomba EMP (inativa até concluir "Montar EMP")
    {x:610,y:175,type:'bomb',name:'Bomba EMP',col:false,active:false}
  ];

  doors=[
    {x:570,y:90,locked:true,hp:0,name:'Escola',unlocked:false},
    {x:700,y:750,locked:true,hp:0,name:'Laboratório',unlocked:false}
  ];

  puzzles=[
    {x:110,y:130,type:'radio',name:'Consertar Rádio',prog:0,done:false},
    {x:580,y:100,type:'panel',name:'Hackear Painel',prog:0,done:false},
    {x:1130,y:110,type:'emp',name:'Montar EMP',prog:0,done:false}
  ];

  // ✅ final mission reset
  bombSpawned=false;
  generator={
    x:650+60,
    y:750+55,
    armed:false,
    blown:false,
    timer:0
  };

  rain=[];for(let i=0;i<120;i++)rain.push({x:Math.random()*W,y:Math.random()*H,sp:3+Math.random()*4,ln:5+Math.random()*7});
  fog=[];for(let i=0;i<35;i++)fog.push({x:Math.random()*MW,y:Math.random()*MH,r:30+Math.random()*50,a:.03+Math.random()*.05,dx:(Math.random()-.5)*.2});
  particles=[];

  PC.reset();shake=0;glitch=0;gt=0;hackCD=0;walkieWarn=0;
  dlgQ=[];curDlg=null;actPz=null;pzProg=0;

  startDlg(openingDlg());
}

/* ───── dialogue data ───── */
function openingDlg(){
  const me=chosen==='enzo'?'Enzo':'Murilo';
  const p=partner.name;
  return[
    {sp:'📻 RÁDIO',txt:'...socorro... floresta... Blackwood... elas voltaram...',cl:'#ff4444'},
    {sp:p,txt:'Você ouviu isso?! O sinal veio da floresta!',cl:'#88aaff'},
    {sp:me,txt:'Blackwood... Precisamos investigar.',cl:'#ffdd88'},
    {sp:p,txt:p+(chosen==='enzo'?' vai distrair os inimigos por você!':' vai hackear os sistemas pra gente!'),cl:'#88aaff'},
    {sp:'SISTEMA',txt:'[R] coletar | [E] interagir | [H] '+partner.name+' ajuda | [F] lanterna',cl:'#aaffaa'}
  ];
}

function startDlg(lines){dlgQ=[...lines];advDlg();if(gs!==S.PUZZLE)gs=S.DIAL;}
function advDlg(){if(dlgQ.length){curDlg=dlgQ.shift();A.walkie();}else{curDlg=null;if(gs===S.DIAL)gs=S.GAME;}}
function showTxt(t){curTxt=t;txtTmr=300;}

function partnerSay(txt){partnerBubble=txt;partnerBubbleTimer=180;}

/* ───── FINAL MISSION HELPERS ───── */
function spawnBombNearSchool(){
  if(bombSpawned) return;
  const b=collectibles.find(c=>c.type==='bomb');
  if(!b) return;
  b.active=true;
  b.col=false;
  bombSpawned=true;
  showTxt('💣 Uma BOMBA EMP foi deixada perto da ESCOLA!');
  A.collect();
}
function allPuzzlesDone(){
  return puzzles.every(p=>p.done);
}

/* ───── input ───── */
document.addEventListener('keydown',e=>{
  keys[e.code]=true; A.u();

  if(gs===S.TITLE){
    if(e.code==='ArrowUp'||e.code==='KeyW')tSel=Math.max(0,tSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS')tSel=Math.min(1,tSel+1);
    if(e.code==='Enter'||e.code==='Space'){if(tSel===0){gs=S.SEL;cSel=0;}A.t(280,.08,'square',.05);}
  }

  if(gs===S.SEL){
    if(e.code==='ArrowLeft'||e.code==='KeyA')cSel=0;
    if(e.code==='ArrowRight'||e.code==='KeyD')cSel=1;
    if(e.code==='Enter'||e.code==='Space'){
      chosen=cSel===0?'enzo':'murilo';
      gs=S.INTRO;iStep=0;iTmr=0;init();A.t(440,.1,'square',.07);
    }
    if(e.code==='Escape')gs=S.TITLE;
  }

  if(gs===S.INTRO){
    if(e.code==='Enter'||e.code==='Space'){iStep++;iTmr=0;if(iStep>=5)gs=S.GAME;}
    if(e.code==='Escape')gs=S.GAME;
  }

  if(gs===S.DIAL){if(e.code==='Enter'||e.code==='Space'||e.code==='KeyE')advDlg();}

  if(gs===S.PAUSE){
    if(e.code==='Escape')gs=S.GAME;
    if(e.code==='ArrowUp'||e.code==='KeyW')pSel=Math.max(0,pSel-1);
    if(e.code==='ArrowDown'||e.code==='KeyS')pSel=Math.min(2,pSel+1);
    if(e.code==='Enter'||e.code==='Space'){
      if(pSel===0)gs=S.GAME;else if(pSel===1){init();gs=S.GAME;}else gs=S.TITLE;
    }
  }

  if(gs===S.PUZZLE){
    if(e.code==='Escape'){actPz.prog=pzProg;actPz=null;gs=S.GAME;}
    if(e.code==='KeyE'||e.code==='Space'){
      pzProg+=8+Math.random()*4;player.noise+=5;A.hack();shake=1;
      if(pzProg>=100){
        actPz.done=true;
        actPz.prog=100;
        A.collect();
        showTxt('✓ '+actPz.name+' concluído!');

        // ✅ concluiu EMP => spawna bomba
        if(actPz.type==='emp') spawnBombNearSchool();

        actPz=null;
        gs=S.GAME;
      }
    }
  }

  if(gs===S.GAME){
    if(e.code==='Escape'){gs=S.PAUSE;pSel=0;}

    // [R] Coletar
    if(e.code==='KeyR') doCollect();

    // [E] Interagir (esconder, portas, puzzles, gerador)
    if(e.code==='KeyE') doInteract();

    // [H] PEDIR AJUDA DO PARCEIRO
    if(e.code==='KeyH') doPartnerHelp();

    // [F] Lanterna
    if(e.code==='KeyF'){
      if(chosen==='murilo'){fl.dynamo=Math.min(100,fl.dynamo+20);player.noise+=10;A.t(200,.08,'square',.03);showTxt('🔦 Dínamo: '+Math.floor(fl.dynamo)+'%');}
      else{fl.on=!fl.on;A.t(fl.on?260:160,.04,'square',.03);}
    }

    // [C] Agachar
    if(e.code==='KeyC'){player.crouching=!player.crouching;}

    // [Space] Esconder rápido
    if(e.code==='Space') doHide();
  }

  if(gs===S.DEATH&&e.code==='Enter'){gs=S.TITLE;tSel=0;}
  if(gs===S.END&&eTmr>600&&e.code==='Enter'){gs=S.TITLE;tSel=0;}
});
document.addEventListener('keyup',e=>{keys[e.code]=false;});

/* ───── PARTNER HELP (H key) ───── */
function doPartnerHelp(){
  if(partner.busy){
    showTxt('⏳ '+partner.name+' está ocupado...');
    return;
  }

  if(partner.canDistract){
    // MURILO distrai inimigos
    partner.busy=true;
    partner.busyTimer=300;
    partnerAction='distracting';
    partnerSay('Ei! Aqui!');
    A.partnerAct();

    // Atrai todos os inimigos próximos para a posição do parceiro
    for(const e of enemies){
      const d=Math.hypot(e.x-partner.x,e.y-partner.y);
      if(d<300){
        e.lkX=partner.x+(Math.random()-.5)*100;
        e.lkY=partner.y+(Math.random()-.5)*80;
        e.mode='alert';
        e.alert=Math.min(80,e.alert+35);
      }
    }
    for(const w of wolves){
      const d=Math.hypot(w.x-partner.x,w.y-partner.y);
      if(d<250){w.alert=Math.min(80,w.alert+30);w.mode='alert';}
    }
    showTxt('🏃 '+partner.name+' distraiu os inimigos!');

  } else if(partner.canHack){
    // ENZO hackeia inimigo ou porta/puzzle próximo

    // Primeiro: tenta hackear inimigo perto do JOGADOR
    for(const e of enemies){
      const d=Math.hypot(e.x-player.x,e.y-player.y);
      if(d<150 && e.stun<=0){
        partner.busy=true;
        partner.busyTimer=200;
        partnerAction='hacking';
        e.stun=250;
        e.mode='stunned';
        A.hack();
        partnerSay('Hackeando!');
        showTxt('💻 '+partner.name+' hackeou o inimigo!');
        glitch=15;
        spawnPart(e.x-cam.x,e.y-cam.y,'#44ffff',8);
        return;
      }
    }

    // Segundo: tenta hackear porta perto do JOGADOR
    for(const d of doors){
      if(d.unlocked) continue;
      const dist=Math.hypot(player.x-d.x,player.y-d.y);
      if(dist<60){
        partner.busy=true;
        partner.busyTimer=150;
        partnerAction='hacking';
        d.hp+=35;
        A.hack();
        partnerSay('Abrindo...');
        if(d.hp>=100){
          d.unlocked=true;
          A.door();
          showTxt('✓ '+partner.name+' abriu: '+d.name+'!');
          spawnPart(d.x-cam.x,d.y-cam.y,'#44ffaa',8);
        } else {
          showTxt('🔓 '+partner.name+' hackeando: '+Math.floor(d.hp)+'%');
        }
        return;
      }
    }

    // Terceiro: tenta resolver puzzle perto do JOGADOR
    for(const p of puzzles){
      if(p.done) continue;
      const dist=Math.hypot(player.x-p.x,player.y-p.y);
      if(dist<60){
        partner.busy=true;
        partner.busyTimer=180;
        partnerAction='hacking';
        p.prog+=25;
        A.hack();
        partnerSay('Consertando...');
        if(p.prog>=100){
          p.done=true;
          A.collect();
          showTxt('✓ '+partner.name+' completou: '+p.name+'!');

          // ✅ concluiu EMP via parceiro => spawna bomba
          if(p.type==='emp') spawnBombNearSchool();

        } else {
          showTxt('🔧 '+partner.name+' trabalhando: '+Math.floor(p.prog)+'%');
        }
        return;
      }
    }

    showTxt('❌ Nada para '+partner.name+' hackear aqui.');
  }
}

/* ───── interactions ───── */
function doCollect(){
  for(const c of collectibles){
    if(c.active === false) continue;
    if(c.col)continue;

    if(Math.hypot(player.x-c.x,player.y-c.y)<45){
      c.col=true;

      if(c.type==='battery'){
        items.batteries++;
        fl.battery=Math.min(100,fl.battery+35);
        showTxt('🔋 '+c.name+'!');
      }
      else if(c.type==='flare'){
        items.flares=(items.flares||0)+1;
        showTxt('🔥 Sinalizador!');
      }
      else if(c.type==='bomb'){
        items.bomb=true;
        showTxt('💣 Bomba EMP coletada! Leve ao LABORATÓRIO.');
      }
      else{
        items.parts++;
        showTxt('⚙️ '+c.name+'! ('+items.parts+' peças)');
      }

      A.collect();
      spawnPart(c.x-cam.x,c.y-cam.y,'#ffdd44',6);
      return;
    }
  }
}

function doInteract(){
  if(player.hiding){player.hiding=false;showTxt('Saiu do esconderijo');return;}

  // ✅ Interagir com o GERADOR (dentro do laboratório)
  if(generator && !generator.blown){
    const lk=doors.find(d=>d.name==='Laboratório');
    const lab=buildings.find(b=>b.type==='lab');
    const labOpen=lk && lk.unlocked;

    if(labOpen && lab){
      const inside =
        player.x>lab.x && player.x<lab.x+lab.w &&
        player.y>lab.y && player.y<lab.y+lab.h;

      if(inside){
        const dist=Math.hypot(player.x-generator.x, player.y-generator.y);
        if(dist<45){
          if(generator.armed){
            showTxt('⏳ Já está armado!');
            return;
          }
          if(!items.bomb){
            showTxt('❌ Você precisa da Bomba EMP.');
            return;
          }

          items.bomb=false;
          generator.armed=true;
          generator.timer=180; // ~3s
          player.noise+=25;
          A.alert();
          showTxt('💣 Bomba plantada! CORRE!');
          shake=8;
          return;
        }
      }
    }
  }

  // Esconder
  for(const b of buildings){
    if(!b.hide)continue;
    if(Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2))<60){
      player.hiding=true;player.x=b.x+b.w/2;player.y=b.y+b.h/2;
      PC.vx=0;PC.vy=0;showTxt('Escondido em '+b.name);return;
    }
  }

  // Portas (se o jogador é Enzo, ele hackeia; se Murilo, pede ajuda)
  for(const d of doors){
    if(d.unlocked)continue;
    if(Math.hypot(player.x-d.x,player.y-d.y)<50){
      if(chosen==='enzo'){
        d.hp+=30;A.hack();showTxt('🔓 Hackeando: '+Math.floor(d.hp)+'%');
        if(d.hp>=100){d.unlocked=true;A.door();showTxt('✓ '+d.name+' aberta!');}
      } else {
        showTxt('🔒 Pressione [H] para '+partner.name+' hackear!');
      }
      return;
    }
  }

  // Puzzles
  for(const p of puzzles){
    if(p.done)continue;
    if(Math.hypot(player.x-p.x,player.y-p.y)<50){
      if(chosen==='enzo'){
        actPz=p;pzProg=p.prog;gs=S.PUZZLE;showTxt('🔧 '+p.name+' — [E] repetidamente!');
      } else {
        showTxt('🔧 Pressione [H] para '+partner.name+' resolver!');
      }
      return;
    }
  }
}

function doHide(){
  if(player.hiding){player.hiding=false;return;}
  for(const b of buildings){
    if(!b.hide)continue;
    if(Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2))<60){
      player.hiding=true;player.x=b.x+b.w/2;player.y=b.y+b.h/2;
      PC.vx=0;PC.vy=0;showTxt('Escondido!');return;
    }
  }
}

/* ───── particles ───── */
function spawnPart(x,y,c,n){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=.5+Math.random()*2;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:40+Math.random()*30,ml:70,color:c,sz:2+Math.random()*3});
  }
}

/* ───── DRAW HELPERS ───── */
function dr(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),w,h);}

/* ───── DRAW CHARACTER (works for player AND partner) ───── */
function drawChar(sx,sy,skinCol,shirtCol,pantsCol,isEnzo,bobVal,armVal,alpha=1){
  let x=Math.floor(sx),y=Math.floor(sy+bobVal);

  if(alpha<1)ctx.globalAlpha=alpha;

  // Shadow
  ctx.globalAlpha=(ctx.globalAlpha||1)*.35;
  ctx.beginPath();ctx.ellipse(x,y+12,7,3,0,0,Math.PI*2);ctx.fillStyle='#000';ctx.fill();
  ctx.globalAlpha=alpha;

  // Legs
  dr(x-4,y+5,3,6,pantsCol);dr(x+1,y+5,3,6,pantsCol);
  dr(x-4,y+10,3,2,'#2a1a0a');dr(x+1,y+10,3,2,'#2a1a0a');

  // Body
  dr(x-5,y-6,10,12,shirtCol);
  const lighter=isEnzo?'#3355bb':'#336633';
  dr(x-4,y-5,8,10,lighter);
  dr(x-5,y+4,10,2,'#3a2a1a');

  // Arms
  const arm=armVal*.12;
  dr(x-7,y-3+arm,3,7,shirtCol);dr(x-7,y+3+arm,3,2,skinCol);
  dr(x+4,y-3-arm,3,7,shirtCol);dr(x+4,y+3-arm,3,2,skinCol);

  // Tool
  if(isEnzo){
    dr(x-8,y-1+arm,4,3,'#4488ff');dr(x-9,y-2+arm,2,1,'#88ccff');
  }else{
    dr(x+6,y+2-arm,5,3,'#444');dr(x+10,y+2-arm,2,3,'#888');
  }

  // Head
  const hY=y-12;
  dr(x-4,hY,8,7,skinCol);
  const hair=isEnzo?'#3a3a1a':'#1a0a00';
  dr(x-4,hY-2,8,3,hair);dr(x-5,hY,2,3,hair);dr(x+3,hY,2,3,hair);
  dr(x-2,hY+3,2,2,'#1a0a00');dr(x+1,hY+3,2,2,'#1a0a00');

  ctx.globalAlpha=1;
}

/* ───── DRAW PARTNER (follows player) ───── */
function drawPartner(){
  const px=partner.x-cam.x;
  const py=partner.y-cam.y;

  if(px<-30||px>W+30||py<-30||py>H+30)return;

  const bob=Math.sin(gt*.08+1)*(PC.mv?1:0);
  const arm=Math.sin(gt*.16+1)*(PC.mv?4:0);
  const isEnzo=partner.name==='Enzo';

  // Busy indicator
  let alpha=1;
  if(partner.busy&&partnerAction==='hacking'&&Math.floor(gt/6)%2===0)alpha=.7;

  drawChar(px,py,partner.skinColor,partner.shirtColor,partner.pantsColor,isEnzo,bob,arm,alpha);

  // Action indicator above head
  if(partner.busy){
    const icon=partnerAction==='hacking'?'💻':'🏃';
    T.draw(icon,px-5,py-22,{size:10,color:'#fff'});
  }

  // Speech bubble
  if(partnerBubbleTimer>0){
    const bAlpha=Math.min(1,partnerBubbleTimer/30);
    ctx.globalAlpha=bAlpha;
    T.box(partnerBubble,px-30,py-35,{size:9,color:'#fff',bg:'rgba(0,30,80,.9)',padding:4,border:'#4466aa'});
    ctx.globalAlpha=1;
  }

  // Name tag
  if(!partner.busy){
    ctx.globalAlpha=.5;
    T.draw(partner.name,px-12,py-20,{size:7,color:partner.name==='Enzo'?'#4488ff':'#44aa44'});
    ctx.globalAlpha=1;
  }
}

/* ───── DRAW PLAYER ───── */
function drawPlayer(sx,sy){
  if(player.hiding)return;
  const a=PC.anim();
  let x=sx,y=sy;if(player.crouching)y+=5;

  let alpha=1;
  if(player.inv>0&&Math.floor(player.inv/5)%2===0)alpha=.5;

  const isEnzo=chosen==='enzo';
  const skin=isEnzo?'#d4a574':'#8b5e3c';
  const shirt=isEnzo?'#2244aa':'#225522';
  const pants=isEnzo?'#eeeedd':'#224488';

  drawChar(x,y,skin,shirt,pants,isEnzo,a.bob,a.arm,alpha);

  // "Você" label
  ctx.globalAlpha=.4;
  T.draw('VOCÊ',Math.floor(x)-8,Math.floor(y)-22,{size:7,color:'#fff'});
  ctx.globalAlpha=1;
}

/* ───── DRAW DEER / BOAR / WOLF / BIRD ───── */
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
  dr(x-6,y-20,4,4,'#111');dr(x+2,y-20,4,4,'#111');
  dr(x-5,y-19,3,3,ec);dr(x+3,y-19,3,3,ec);
  const gi=e.mode==='chase'?.5:.25;
  ctx.globalAlpha=gi+Math.sin(gt*.08)*.1;ctx.fillStyle=ec;ctx.beginPath();
  ctx.arc(x-3.5,y-17.5,5,0,Math.PI*2);ctx.arc(x+4.5,y-17.5,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  dr(x-5,y-27,2,6,'#555');dr(x-8,y-30,2,5,'#666');dr(x-10,y-32,2,3,'#777');
  dr(x+3,y-27,2,6,'#555');dr(x+6,y-30,2,5,'#666');dr(x+8,y-32,2,3,'#777');
  if(gt%35<18&&e.stun<=0){dr(x-10,y-33,2,2,e.callBoar?'#f80':'#f00');dr(x+8,y-33,2,2,e.callBoar?'#f80':'#f00');}
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
  const tk=e.charging?'#ffaa00':'#888';
  dr(x-18,y-8,3,8,tk);dr(x-16,y-14,3,8,tk);
  let ec=e.eyeColor;if(e.stun>0)ec=e.stun%8<4?'#fff':'#ff0';if(e.charging)ec='#f00';
  dr(x-8,y-14,4,4,'#111');dr(x+4,y-14,4,4,'#111');
  dr(x-7,y-13,3,3,ec);dr(x+5,y-13,3,3,ec);
  const gi=e.mode==='chase'||e.charging?.55:.25;
  ctx.globalAlpha=gi+Math.sin(gt*.07)*.1;ctx.fillStyle=ec;ctx.beginPath();
  ctx.arc(x-5.5,y-11.5,5,0,Math.PI*2);ctx.arc(x+6.5,y-11.5,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  dr(x-10,y-18,3,3,'#4a3a2a');dr(x+7,y-18,3,3,'#4a3a2a');
  if(e.charging)for(let i=0;i<4;i++)dr(x+(Math.random()-.5)*30,y+Math.random()*12-5,1,1,Math.random()>.5?'#ff4':'#f80');
  e.frame++;
}

function drawWolf(w,sx,sy){
  let x=Math.floor(sx),y=Math.floor(sy+Math.sin(w.frame*.15));
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+12,10,3,0,0,Math.PI*2);ctx.fill();
  const lg=Math.sin(w.frame*.18)*(w.mode==='chase'?3:1);
  dr(x-8,y+2,3,10,'#3a3a4a');dr(x+5,y+2,3,10,'#3a3a4a');
  dr(x-5,y+3+lg,2,8,'#4a4a5a');dr(x+3,y+3-lg,2,8,'#4a4a5a');
  dr(x-8,y-4,16,8,'#3a3a4a');dr(x-6,y-3,12,6,'#4a4a5a');
  dr(x-4,y-8,8,6,'#3a3a4a');dr(x-6,y-6,3,4,'#3a3a4a');
  const wec=w.mode==='chase'?'#ff4400':w.eyeColor;
  dr(x-3,y-7,2,2,wec);dr(x+1,y-7,2,2,wec);
  if(w.mode==='chase'){ctx.globalAlpha=.4;ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(x-2,y-6,4,0,Math.PI*2);ctx.arc(x+2,y-6,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  dr(x-6,y-1,2,3,'#555');dr(x+4,y-1,2,3,'#555');
  w.frame++;
}

function drawBird(b){
  const bx=b.x-cam.x,by=b.y-cam.y;
  if(bx<-30||bx>W+30)return;
  const wing=Math.sin(gt*.2)*2;
  dr(bx-4,by-2,8,4,'#2a2a3a');dr(bx-3,by-1,6,2,'#3a3a4a');
  dr(bx-8,by-2+wing,4,2,'#2a2a3a');dr(bx+4,by-2-wing,4,2,'#2a2a3a');
  dr(bx+2,by-2,2,2,b.spot?'#f00':'#44aaff');dr(bx+5,by-1,3,1,'#888');
  if(b.spot||b.alrt){
    ctx.globalAlpha=.2;ctx.strokeStyle=b.spot?'#f00':'#ff4';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(b.sa)*70,by+Math.sin(b.sa)*.3*70);ctx.stroke();ctx.globalAlpha=1;
  }
}

/* ───── DRAW ENVIRONMENT ───── */
function drawBuilding(b){
  const x=Math.floor(b.x-cam.x),y=Math.floor(b.y-cam.y);
  if(x<-180||x>W+180||y<-180||y>H+180)return;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x+6,y+b.h,b.w-4,6);

  if(b.type==='garage'){
    dr(x,y,b.w,b.h,'#3a3a4a');dr(x+2,y+2,b.w-4,b.h-4,'#4a4a5a');
    dr(x,y-5,b.w,7,'#2a2a3a');
    dr(x+10,y+b.h-55,70,55,'#2a2a3a');
    for(let i=0;i<55;i+=8)dr(x+10,y+b.h-55+i,70,1,'#1a1a2a');
    T.draw('GARAGEM',x+15,y-12,{size:8,color:'#888'});
  }else if(b.type==='school'){
    dr(x,y,b.w,b.h,'#2a3a3a');dr(x+2,y+2,b.w-4,b.h-4,'#3a4a4a');
    for(let i=0;i<b.h;i+=5)dr(x,y+i,b.w,1,'#222');
    dr(x-4,y-8,b.w+8,10,'#1a2a2a');
    T.draw('ESCOLA',x+35,y-14,{size:10,color:'#8aaabb'});
    for(let i=0;i<3;i++){dr(x+10+i*35,y+12,20,14,'#0a1a2a');dr(x+11+i*35,y+13,18,12,'#1a2a3a');}
  }else if(b.type==='lab'){
    dr(x,y,b.w,b.h,'#1a1a2a');dr(x+2,y+2,b.w-4,b.h-4,'#2a2a3a');
    dr(x+b.w/2-20,y+b.h-50,40,50,'#1a1a1a');
    const lk=doors.find(d=>d.name==='Laboratório');
    if(lk&&!lk.unlocked){if(gt%40<20){dr(x+b.w/2-10,y+b.h-35,20,20,'#a22');T.draw('!',x+b.w/2-3,y+b.h-26,{size:12,color:'#fff',bold:true});}}
    else T.draw('ABERTO',x+b.w/2-18,y+b.h-25,{size:9,color:'#4f4'});
    T.draw('LAB',x+b.w/2-10,y-10,{size:10,color:'#556688'});
  }else{
    dr(x,y,b.w,b.h,'#3a2a2a');dr(x+2,y+2,b.w-4,b.h-4,'#4a3a3a');
    for(let i=0;i<b.h;i+=6)dr(x,y+i,b.w,1,'#3a2a2a');
    for(let i=0;i<10;i++)dr(x-4+i*.45,y-10+i,b.w+8-i*.9,1,i%2===0?'#2a1a1a':'#3a2a2a');
    dr(x+b.w/2-6,y+b.h-20,12,20,'#1a0a0a');
    dr(x+8,y+10,10,8,'#0a1a3a');
    T.draw(b.name,x+5,y-16,{size:7,color:'#555'});
  }

  if(b.hide&&!player.hiding){
    const dist=Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h/2));
    if(dist<65){const p=.8+Math.sin(gt*.1)*.2;ctx.globalAlpha=p;
      T.box('[Espaço] Esconder',x+5,y-22,{size:9,color:'#afa',bg:'rgba(0,50,0,.88)',padding:4});ctx.globalAlpha=1;}
  }
}

function drawObstacle(o){
  const x=Math.floor(o.x-cam.x),y=Math.floor(o.y-cam.y);
  if(x<-50||x>W+50||y<-30||y>H+30)return;
  if(o.type==='car'){dr(x,y,o.w,o.h,'#2a2a3a');dr(x+1,y+1,o.w-2,o.h-2,'#3a3a4a');
    dr(x+o.w*.6,y-o.h*.4,o.w*.3,o.h*.6,'#2a2a3a');dr(x+1,y+o.h-3,3,3,'#111');dr(x+o.w-4,y+o.h-3,3,3,'#111');
  }else{dr(x,y,o.w,o.h,'#3a3a2a');dr(x+2,y+2,o.w-4,o.h-4,'#4a4a3a');}
}

function drawCollectible(c){
  if(c.active === false) return;

  const cx=Math.floor(c.x-cam.x),cy=Math.floor(c.y-cam.y);
  if(cx<-30||cx>W+30||cy<-30||cy>H+30)return;
  const bob=Math.sin(gt*.08+c.x*.1)*2,glow=.35+Math.sin(gt*.09)*.2;
  ctx.globalAlpha=glow;

  const gc=
    c.type==='battery' ? '#44ff44' :
    (c.type==='flare' ? '#ff4444' :
    (c.type==='bomb' ? '#ff66aa' : '#ffaa44'));

  ctx.fillStyle=gc;ctx.beginPath();ctx.arc(cx,cy+bob,12,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  if(c.type==='battery'){
    dr(cx-4,cy-5+bob,8,10,'#333');dr(cx-3,cy-4+bob,6,8,'#444');dr(cx-1,cy-6+bob,2,2,'#888');dr(cx-1,cy-2+bob,2,1,'#4f4');dr(cx,cy-3+bob,1,3,'#4f4');
  }
  else if(c.type==='flare'){
    dr(cx-2,cy-5+bob,4,10,'#a22');dr(cx-1,cy-4+bob,2,8,'#c33');dr(cx-1,cy-7+bob,2,3,'#f64');
  }
  else if(c.type==='bomb'){
    dr(cx-5,cy-4+bob,10,8,'#222');
    dr(cx-4,cy-3+bob,8,6,'#333');
    dr(cx-1,cy-7+bob,2,3,'#c33');
    if(gt%20<10) dr(cx-2,cy-9+bob,4,2,'#ff4');
  }
  else{
    dr(cx-4,cy-4+bob,8,8,'#555');dr(cx-3,cy-3+bob,6,6,'#777');dr(cx-2,cy-2+bob,4,4,'#aaa');
    dr(cx-6,cy-1+bob,2,2,'#666');dr(cx+4,cy-1+bob,2,2,'#666');dr(cx-1,cy-6+bob,2,2,'#666');dr(cx-1,cy+4+bob,2,2,'#666');
  }

  const dist=Math.hypot(player.x-c.x,player.y-c.y);
  if(dist<50){const p=.8+Math.sin(gt*.15)*.2;ctx.globalAlpha=p;
    T.box('[R] '+c.name,cx-25,cy-25,{size:10,color:'#ffd',bg:'rgba(60,50,0,.9)',padding:5,border:'#a80'});ctx.globalAlpha=1;}
}

function drawPuzzle(pz){
  if(pz.done)return;
  const px=Math.floor(pz.x-cam.x),py=Math.floor(pz.y-cam.y);
  if(px<-40||px>W+40||py<-40||py>H+40)return;
  const bob=Math.sin(gt*.1+pz.x*.05);
  ctx.globalAlpha=.3+Math.sin(gt*.08)*.15;ctx.fillStyle='#4488ff';ctx.beginPath();ctx.arc(px,py+bob,14,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  if(pz.type==='radio'){dr(px-8,py-6+bob,16,12,'#333');dr(px-6,py-4+bob,12,8,'#444');dr(px-4,py-2+bob,5,5,'#556');
    dr(px+1,py-6+bob,1,4,'#888');if(gt%25<12)dr(px-2,py-7+bob,3,1,'#f44');}
  else if(pz.type==='panel'){dr(px-8,py-8+bob,16,16,'#2a2a3a');dr(px-6,py-6+bob,12,12,'#3a3a4a');
    for(let i=0;i<3;i++)dr(px-4+i*4,py-4+bob,2,2,i===1?'#4f4':'#f44');dr(px-5,py+2+bob,10,3,'#555');}
  else{dr(px-10,py-8+bob,20,16,'#223');dr(px-8,py-6+bob,16,12,'#334');dr(px-3,py-3+bob,6,6,'#445');
    dr(px-2,py-2+bob,4,4,'#44aaff');if(gt%15<8)dr(px-4,py-4+bob,8,8,'#44aaff');}

  if(pz.prog>0&&pz.prog<100){dr(px-20,py+15,40,6,'#222');dr(px-19,py+16,pz.prog*.38,4,'#44aaff');}

  const dist=Math.hypot(player.x-pz.x,player.y-pz.y);
  if(dist<55){const p=.8+Math.sin(gt*.18)*.2;ctx.globalAlpha=p;
    const isMyJob=(chosen==='enzo');
    const txt=isMyJob?'[E] '+pz.name:'[H] '+partner.name+' resolve!';
    const col=isMyJob?'#88aaff':'#ffaa88';
    T.box(txt,px-50,py-28,{size:10,color:col,bg:'rgba(0,20,60,.92)',padding:5,border:'#46a'});ctx.globalAlpha=1;}
}

function drawDoor(d){
  if(d.unlocked)return;
  const dx=Math.floor(d.x-cam.x),dy=Math.floor(d.y-cam.y);
  if(dx<-40||dx>W+40||dy<-40||dy>H+40)return;
  const col=d.hp>0?'#44aaff':'#a22';
  if(gt%40<22){ctx.globalAlpha=.4;ctx.fillStyle=col;ctx.beginPath();ctx.arc(dx,dy,12,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  dr(dx-6,dy-8,12,16,'#2a2a3a');dr(dx-4,dy-6,8,12,'#1a1a2a');dr(dx+2,dy-2,2,3,'#888');
  if(d.hp>0){dr(dx-15,dy+12,30,6,'#222');dr(dx-14,dy+13,d.hp*.28,4,'#44aaff');}
  const dist=Math.hypot(player.x-d.x,player.y-d.y);
  if(dist<55){const p=.8+Math.sin(gt*.18)*.2;ctx.globalAlpha=p;
    const isMyJob=(chosen==='enzo');
    const txt=isMyJob?'[E] Hackear porta':'[H] '+partner.name+' hackeia!';
    T.box(txt,dx-50,dy-25,{size:10,color:'#88aaff',bg:'rgba(0,20,60,.92)',padding:5,border:'#46a'});ctx.globalAlpha=1;}
}

/* ───── GERADOR (DRAW) ───── */
function drawGenerator(){
  if(!generator || generator.blown) return;

  const lk=doors.find(d=>d.name==='Laboratório');
  if(!lk || !lk.unlocked) return;

  const lab=buildings.find(b=>b.type==='lab');
  if(!lab) return;

  const inside =
    player.x>lab.x && player.x<lab.x+lab.w &&
    player.y>lab.y && player.y<lab.y+lab.h;
  if(!inside) return;

  const gx=Math.floor(generator.x-cam.x);
  const gy=Math.floor(generator.y-cam.y);

  dr(gx-12,gy-10,24,20,'#151515');
  dr(gx-10,gy-8,20,16,'#242424');
  dr(gx-8,gy-3,16,6,'#334');
  if(gt%30<15) dr(gx-2,gy-7,4,3,'#4f4');

  const dist=Math.hypot(player.x-generator.x, player.y-generator.y);
  if(dist<55){
    const msg = generator.armed
      ? '⏳ ARMADO: '+Math.ceil(generator.timer/60)+'s'
      : (items.bomb ? '[E] Plantar bomba no gerador' : 'Precisa da BOMBA EMP');
    const col = generator.armed ? '#ff88aa' : '#fff';
    const bg  = generator.armed ? 'rgba(20,0,10,.92)' : 'rgba(0,0,0,.9)';
    const br  = generator.armed ? '#aa4466' : '#6677aa';
    T.box(msg, gx-88, gy-28, {size:10, color:col, bg:bg, padding:5, border:br});
  }

  if(generator.armed && gt%10<6){
    dr(gx+9,gy-10,3,3,'#f44');
  }
}

/* ───── DARKNESS ───── */
function drawDark(){
  const px=player.x-cam.x,py=player.y-cam.y-5;
  const off=document.createElement('canvas');off.width=W;off.height=H;const oc=off.getContext('2d');
  let dk=.88-(lFlash>0?lFlash*.025:0);
  oc.fillStyle=`rgba(5,5,20,${dk})`;oc.fillRect(0,0,W,H);

  if(fl.on&&!player.hiding){
    const bat=chosen==='enzo'?fl.battery:fl.dynamo;
    const flk=bat<15?(Math.random()>.2?1:.3):1;
    const r=(fl.range+bat*.25)*flk;
    oc.globalCompositeOperation='destination-out';oc.fillStyle='rgba(0,0,0,1)';
    oc.beginPath();oc.arc(px,py,r*.75,0,Math.PI*2);oc.fill();
    oc.globalCompositeOperation='source-over';
    const gr=oc.createRadialGradient(px,py,4,px,py,r);
    gr.addColorStop(0,'rgba(5,5,20,0)');gr.addColorStop(.5,'rgba(5,5,20,.15)');gr.addColorStop(1,`rgba(5,5,20,${dk})`);
    oc.fillStyle=gr;oc.beginPath();oc.arc(px,py,r,0,Math.PI*2);oc.fill();
  }

  // Partner light
  const ppx=partner.x-cam.x,ppy=partner.y-cam.y;
  oc.globalCompositeOperation='destination-out';oc.fillStyle='rgba(0,0,0,.4)';
  oc.beginPath();oc.arc(ppx,ppy,35,0,Math.PI*2);oc.fill();oc.globalCompositeOperation='source-over';

  const cut=(ex,ey,er)=>{oc.globalCompositeOperation='destination-out';oc.fillStyle='rgba(0,0,0,.5)';
    oc.beginPath();oc.arc(ex,ey,er,0,Math.PI*2);oc.fill();oc.globalCompositeOperation='source-over';};

  for(const e of enemies){if(e.stun<=0){const ey=e.type==='deer'?17:11;
    cut(e.x-cam.x,e.y-cam.y-ey,e.mode==='chase'?30:14);}}
  for(const w of wolves){if(w.mode!=='stunned')cut(w.x-cam.x,w.y-cam.y-6,w.mode==='chase'?22:10);}

  ctx.drawImage(off,0,0);
}

/* ───── VHS ───── */
function drawVHS(){
  ctx.fillStyle='rgba(0,0,0,.1)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);
  if(glitch>0){for(let i=0;i<2;i++){const gy=Math.random()*H,gh=2+Math.random()*5;
    ctx.drawImage(canvas,0,gy,W,gh,Math.random()*12-6,gy,W,gh);}glitch--;}
  if(Math.random()<.008)glitch=Math.floor(Math.random()*6)+2;
  ctx.globalAlpha=.025;ctx.fillStyle='#04f';ctx.fillRect(0,0,2,H);ctx.fillStyle='#f40';ctx.fillRect(W-2,0,2,H);ctx.globalAlpha=1;
  const vg=ctx.createRadialGradient(W/2,H/2,W*.2,W/2,H/2,W*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,8,.55)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  if(gs===S.GAME&&gt%85<60){ctx.fillStyle='#04f';ctx.beginPath();ctx.arc(14,16,5,0,Math.PI*2);ctx.fill();T.draw('REC',24,16,{size:11,color:'#03c'});}
  const m=Math.floor(gt/3600),s=Math.floor((gt/60)%60);
  T.draw(String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'),W-50,16,{size:11,color:'#666'});
  if(walkieWarn>0&&gt%15<8){ctx.globalAlpha=.2;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
}

/* ───── HUD ───── */
function drawHUD(){
  const hy=H-25;
  dr(10,hy-10,95,32,'rgba(0,0,0,.72)');T.draw('VIDA',14,hy-3,{size:10,color:'#a44'});
  for(let i=0;i<player.maxHp;i++){const c=i<player.hp?'#c33':'#333';dr(14+i*14,hy+6,12,10,c);if(i<player.hp)dr(15+i*14,hy+7,10,8,'#f44');}
  if(player.stamina<player.maxStamina){dr(68,hy-3,35,6,'#222');dr(69,hy-2,(player.stamina/player.maxStamina)*33,4,player.stamina<25?'#aa4':'#4a4');}

  const iy=H-65;
  dr(10,iy-8,160,33,'rgba(0,0,0,.72)');
  const bat=chosen==='enzo'?fl.battery:fl.dynamo;
  const bl=bat>50?'#4a4':(bat>25?'#aa4':'#a44');
  T.draw((chosen==='enzo'?'💡 Lanterna':'🔦 Dínamo')+' [F]: '+Math.floor(bat)+'%',14,iy,{size:10,color:bl});
  T.draw('⚙️ Peças: '+items.parts+' | 🔥 Flares: '+(items.flares||0),14,iy+13,{size:10,color:'#fd4'});

  // Partner status
  const py2=H-102;
  dr(10,py2-8,175,22,'rgba(0,0,0,.72)');
  const pCol=partner.name==='Enzo'?'#4488ff':'#44aa44';
  const pSkill=partner.canHack?'💻 Hack':'🏃 Distração';
  const pStatus=partner.busy?'(ocupado...)':'[H] chamar';
  T.draw('👤 '+partner.name+': '+pSkill+' '+pStatus,14,py2,{size:9,color:pCol});

  // Partner cooldown bar
  if(partner.busy){
    dr(10,py2+8,80,5,'#222');
    dr(11,py2+9,(1-partner.busyTimer/300)*78,3,pCol);
  }

  const maxA=Math.max(...enemies.map(e=>e.alert),...wolves.map(w=>w.alert));
  if(maxA>0){const ac=maxA>70?'#f44':(maxA>35?'#fa4':'#ff4');
    dr(W/2-65,10,130,28,'rgba(0,0,0,.8)');T.draw('⚠ ALERTA: '+Math.floor(maxA)+'%',W/2-55,18,{size:12,color:ac,bold:true});
    dr(W/2-52,28,104,6,'#222');dr(W/2-52,28,maxA*1.04,6,ac);}

  const chasing=enemies.some(e=>e.mode==='chase'||e.charging)||wolves.some(w=>w.mode==='chase');
  if(chasing&&gt%35<22)T.draw('!! CAÇADA !!',W/2-55,52,{size:15,color:'#f00',bold:true});
  if(walkieWarn>0)T.draw('📻 ESTÁTICA! Inimigo próximo!',W/2-95,70,{size:9,color:'#f80',bold:true});

  if(player.crouching)T.draw('🦆 AGACHADO [C]',W-100,H-15,{size:9,color:'#8a8'});

  // ✅ objetivo (missão final)
  let obj='';
  if(generator && generator.blown){
    obj='Objetivo: concluído';
  } else if(items.bomb){
    obj='Objetivo: levar a BOMBA ao LAB';
  } else if(bombSpawned && !items.bomb){
    obj='Objetivo: pegar a BOMBA na ESCOLA';
  } else if(!allPuzzlesDone()){
    obj='Objetivo: concluir os sistemas';
  }
  if(obj){
    dr(W-210, H-40, 200, 28, 'rgba(0,0,0,.72)');
    T.draw(obj, W-204, H-26, {size:9, color:'#ccd'});
  }

  if(txtTmr>0){ctx.globalAlpha=Math.min(1,txtTmr/70);
    T.box(curTxt,W/2-curTxt.length*3.8,H/2+95,{size:13,color:'#fff',bg:'rgba(0,0,0,.92)',padding:12});ctx.globalAlpha=1;}

  if(gt<700){ctx.globalAlpha=Math.max(0,1-gt/700);
    T.draw('[WASD] Mover | [R] Coletar | [E] Interagir | [H] '+partner.name+' Ajuda | [F] Lanterna',12,32,{size:8,color:'#555'});
    ctx.globalAlpha=1;}
}

/* ───── AI: DEER ───── */
function updateDeer(e){
  if(e.stun>0){e.stun--;e.frame++;if(e.stun<=0){e.mode='patrol';e.eyeColor='#ffcc00';e.alert=25;e.callBoar=false;e.heat=false;}return;}
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);
  const see=!player.hiding;
  let rng=fl.on?180:110,rate=fl.on?1.8:.9;
  if(player.crouching){rng*=.6;rate*=.55;}
  if(e.alert>50){e.heat=true;rng*=1.4;}else e.heat=false;
  rate+=player.noise*.08;

  // Partner distracting reduces player detection
  if(partnerAction==='distracting'&&partner.busy){rate*=.3;rng*=.6;}

  if(see&&dist<rng){e.alert=Math.min(100,e.alert+rate);e.lkX=player.x;e.lkY=player.y;}
  else e.alert=Math.max(0,e.alert-.35);

  if(e.alert>70&&!e.callBoar){e.callBoar=true;
    const boar=enemies.find(en=>en.type==='boar');
    if(boar){boar.responding=true;boar.alert=Math.min(100,boar.alert+45);}
    A.alert();showTxt('⚠ O Cervo chamou o Javali!');}

  if(e.alert>=100&&e.mode!=='chase'){e.mode='chase';e.eyeColor='#ff0000';e.speed=1.3;glitch=18;shake=10;A.chase();}

  if(e.mode==='patrol'){e.eyeColor='#ffcc00';e.speed=.45;e.callBoar=false;e.pTmr++;
    if(e.pTmr>200){e.pTmr=0;e.pDir=Math.random()*Math.PI*2;}
    e.x+=Math.cos(e.pDir)*e.speed;e.y+=Math.sin(e.pDir)*e.speed;
    if(dist>320){e.x+=(dx/dist)*.1;e.y+=(dy/dist)*.1;}
    if(e.alert>38){e.mode='alert';A.alert();}}

  if(e.mode==='alert'){e.eyeColor='#ffaa00';e.speed=.65;
    const tdx=e.lkX-e.x,tdy=e.lkY-e.y,td=Math.hypot(tdx,tdy);
    if(td>18){e.x+=(tdx/td)*e.speed;e.y+=(tdy/td)*e.speed;}
    if(e.alert<=28)e.mode='patrol';}

  if(e.mode==='chase'){e.eyeColor='#ff0000';e.speed=1.35;
    if(dist>12){e.x+=(dx/dist)*e.speed;e.y+=(dy/dist)*e.speed;}
    if(dist<22&&!player.hiding&&player.inv<=0){
      player.hp--;player.inv=110;shake=28;glitch=35;A.dmg();
      if(player.hp<=0){gs=S.DEATH;dTmr=0;}
      else{player.x-=(dx/dist)*60;player.y-=(dy/dist)*60;e.mode='alert';e.alert=55;showTxt('💔 O Cervo te atingiu! Vida: '+player.hp);}}
    if(player.hiding){e.alert-=2;if(e.alert<=0){e.mode='patrol';showTxt('O Cervo te perdeu...');}}
    if(dist>340){e.alert-=1.2;if(e.alert<=0)e.mode='patrol';}}

  e.x=Math.max(30,Math.min(MW-30,e.x));e.y=Math.max(30,Math.min(MH-30,e.y));e.frame++;
}

/* ───── AI: BOAR ───── */
function updateBoar(e){
  if(e.stun>0){e.stun--;e.frame++;e.charging=false;if(e.stun<=0){e.mode='patrol';e.eyeColor='#ffcc00';e.alert=20;e.responding=false;}return;}
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);

  if(e.responding){const deer=enemies.find(en=>en.type==='deer');
    if(deer){const ddx=deer.lkX-e.x,ddy=deer.lkY-e.y,dd=Math.hypot(ddx,ddy);
      if(dd>50){e.x+=(ddx/dd)*e.speed*1.2;e.y+=(ddy/dd)*e.speed*1.2;}
      if(dd<140){e.responding=false;e.alert=Math.min(100,e.alert+25);}}}

  if(e.charging){e.cTmr--;e.x+=Math.cos(e.cDir)*3.5;e.y+=Math.sin(e.cDir)*3.5;
    if(dist<28&&!player.hiding&&player.inv<=0){player.hp-=2;player.inv=150;shake=35;glitch=45;A.dmg();
      if(player.hp<=0){gs=S.DEATH;dTmr=0;}
      else{player.x-=Math.cos(e.cDir)*75;player.y-=Math.sin(e.cDir)*75;e.charging=false;e.mode='patrol';e.alert=35;showTxt('💥 Javali! Vida: '+player.hp);}}
    if(e.cTmr<=0){e.charging=false;e.mode='alert';e.alert=45;}e.frame++;return;}

  const see=!player.hiding;let rng=120,rate=.75;
  if(player.crouching){rng*=.55;rate*=.5;}rate+=player.noise*.18;
  if(partnerAction==='distracting'&&partner.busy){rate*=.3;rng*=.6;}

  if(see&&dist<rng)e.alert=Math.min(100,e.alert+rate);else e.alert=Math.max(0,e.alert-.25);
  if(e.alert>=100&&e.mode!=='chase'){e.mode='chase';e.eyeColor='#ff0000';e.speed=1.1;glitch=15;A.alert();}

  if(e.mode==='patrol'){e.eyeColor='#ffcc00';e.speed=.38;e.pTmr++;if(e.pTmr>260){e.pTmr=0;e.pDir=Math.random()*Math.PI*2;}
    e.x+=Math.cos(e.pDir)*e.speed;e.y+=Math.sin(e.pDir)*e.speed;if(e.alert>32)e.mode='alert';}

  if(e.mode==='alert'){e.eyeColor='#ffaa00';e.speed=.55;
    if(dist<190&&dist>55){e.x+=(dx/dist)*e.speed;e.y+=(dy/dist)*e.speed;}if(e.alert<=22)e.mode='patrol';}

  if(e.mode==='chase'){e.eyeColor='#ff0000';e.speed=1.1;
    if(dist<110&&dist>38&&!e.charging&&see){e.charging=true;e.cDir=Math.atan2(dy,dx);e.cTmr=58;
      A.t(60,.35,'sawtooth',.12);showTxt('🐗 Javali investindo!');}
    if(dist>15&&!e.charging){e.x+=(dx/dist)*e.speed;e.y+=(dy/dist)*e.speed;}
    if(player.hiding){e.alert-=1.5;if(e.alert<=0)e.mode='patrol';}
    if(dist>370){e.alert-=1;if(e.alert<=0)e.mode='patrol';}}

  e.x=Math.max(40,Math.min(MW-40,e.x));e.y=Math.max(40,Math.min(MH-40,e.y));e.frame++;
}

/* ───── AI: WOLF ───── */
function updateWolf(w){
  if(w.mode==='stunned'){w.alert=Math.max(0,w.alert-1);if(w.alert<=0)w.mode='patrol';w.frame++;return;}
  const dx=player.x-w.x,dy=player.y-w.y,dist=Math.hypot(dx,dy);
  const see=!player.hiding;
  let rate=.9+player.noise*.15;
  if(player.crouching)rate*=.5;
  if(partnerAction==='distracting'&&partner.busy)rate*=.3;

  if(see&&dist<150)w.alert=Math.min(100,w.alert+rate);else w.alert=Math.max(0,w.alert-.3);
  if(w.alert>=100&&w.mode!=='chase'){w.mode='chase';w.eyeColor='#ff4400';A.alert();}

  if(w.mode==='patrol'){w.eyeColor='#44aaff';w.pTmr=(w.pTmr||0)+1;if(w.pTmr>180){w.pTmr=0;w.pDir=Math.random()*Math.PI*2;}
    w.x+=Math.cos(w.pDir)*.4;w.y+=Math.sin(w.pDir)*.4;if(w.alert>35)w.mode='alert';}
  if(w.mode==='alert'){w.eyeColor='#ffaa44';if(dist>10){w.x+=(dx/dist)*.65;w.y+=(dy/dist)*.65;}if(w.alert<=25)w.mode='patrol';}
  if(w.mode==='chase'){w.eyeColor='#ff4400';if(dist>10){w.x+=(dx/dist)*1;w.y+=(dy/dist)*1;}
    if(dist<20&&!player.hiding&&player.inv<=0){player.hp--;player.inv=90;shake=20;A.dmg();
      if(player.hp<=0){gs=S.DEATH;dTmr=0;}else{player.x-=(dx/dist)*50;player.y-=(dy/dist)*50;w.mode='patrol';w.alert=30;showTxt('🐺 Lobo atacou! Vida: '+player.hp);}}
    if(player.hiding||dist>300){w.alert-=1.2;if(w.alert<=0)w.mode='patrol';}}

  w.x=Math.max(30,Math.min(MW-30,w.x));w.y=Math.max(30,Math.min(MH-30,w.y));w.frame++;
}

/* ───── AI: BIRD ───── */
function updateBird(b){
  b.x+=b.vx;if(b.x<50||b.x>MW-50)b.vx*=-1;b.sa+=.015;
  const dist=Math.hypot(player.x-b.x,player.y-b.y);
  if(!player.hiding&&dist<80){
    const atp=Math.atan2(player.y-b.y,player.x-b.x);
    const diff=Math.abs(((atp-b.sa)+Math.PI*2)%(Math.PI*2));
    if(diff<.5||diff>Math.PI*2-.5){b.spot=true;b.alrt=true;walkieWarn=120;
      const boar=enemies.find(e=>e.type==='boar');if(boar&&boar.mode!=='chase'){boar.alert=Math.min(100,boar.alert+3);boar.lkX=player.x;boar.lkY=player.y;}
    }
  }else{b.spot=false;if(b.alrt&&Math.random()<.01)b.alrt=false;}
}

/* ───── UPDATE PARTNER ───── */
function updatePartner(){
  // Follow player smoothly
  const followDist=40;
  const angle=Math.atan2(PC.vy||.01,PC.vx||.01)+Math.PI;
  const tx=player.x+Math.cos(angle)*followDist;
  const ty=player.y+Math.sin(angle)*followDist;

  partner.x+=(tx-partner.x)*.06;
  partner.y+=(ty-partner.y)*.06;

  // Busy timer
  if(partner.busy){
    partner.busyTimer--;
    if(partner.busyTimer<=0){
      partner.busy=false;
      partnerAction='following';
    }
  }

  // Bubble timer
  if(partnerBubbleTimer>0)partnerBubbleTimer--;

  // Partner cooldown
  if(partner.cooldown>0)partner.cooldown--;

  // Partner auto-warnings
  const closestEnemy=Math.min(
    ...enemies.map(e=>Math.hypot(e.x-partner.x,e.y-partner.y)),
    ...wolves.map(w=>Math.hypot(w.x-partner.x,w.y-partner.y))
  );

  if(closestEnemy<100&&!partner.busy&&gt%120===0){
    partnerSay('Cuidado! Perto!');
    walkieWarn=60;
  }

  // Auto-distract if enemy chasing player (Murilo partner)
  if(partner.canDistract&&!partner.busy){
    const anyChasing=enemies.some(e=>e.mode==='chase')||wolves.some(w=>w.mode==='chase');
    if(anyChasing&&gt%300===0){
      partnerSay('Vou distrair!');
      partner.busy=true;
      partner.busyTimer=200;
      partnerAction='distracting';
      A.partnerAct();
      for(const e of enemies){
        if(e.mode==='chase'){
          e.lkX=partner.x+(Math.random()-.5)*150;
          e.lkY=partner.y+(Math.random()-.5)*100;
          e.alert=Math.max(50,e.alert-20);
        }
      }
    }
  }
}

/* ───── MAIN UPDATE ───── */
function updateGame(){
  gt++;
  player.noise=Math.max(0,player.noise-.6);
  if(hackCD>0)hackCD--;
  if(walkieWarn>0)walkieWarn--;

  // Walkie static
  const minD=Math.min(...enemies.map(e=>Math.hypot(player.x-e.x,player.y-e.y)),...wolves.map(w=>Math.hypot(player.x-w.x,player.y-w.y)));
  if(minD<180&&gt%45<8)A.static();
  if(minD<160){const hi=Math.max(15,65-(160-Math.min(160,minD))*.35);if(gt%Math.floor(hi)===0)A.hb();}

  // Flashlight
  if(chosen==='enzo'){if(fl.on){fl.battery-=.012;if(fl.battery<=0){fl.battery=0;fl.on=false;showTxt('💡 Bateria esgotada!');}}
    else fl.battery=Math.min(100,fl.battery+.003);}
  else{if(fl.dynamo>0){fl.dynamo-=.015;fl.on=true;}else fl.on=false;}

  // Player movement
  if(!player.hiding){
    const mr=PC.update(player,keys,false);
    if(mr.mv){const si=mr.spr?9:(player.crouching?26:16);if(gt%si===0){A.step();player.noise+=mr.spr?8:(player.crouching?1:3);}}
    player.x=Math.max(10,Math.min(MW-10,player.x));player.y=Math.max(10,Math.min(MH-10,player.y));
    for(const o of obstacles){if(player.x>o.x-6&&player.x<o.x+o.w+6&&player.y>o.y-6&&player.y<o.y+o.h+6){
      player.x+=(player.x-(o.x+o.w/2))*.2;player.y+=(player.y-(o.y+o.h/2))*.2;PC.vx*=.4;PC.vy*=.4;}}

    for(const b of buildings){
      if(player.x>b.x&&player.x<b.x+b.w&&player.y>b.y&&player.y<b.y+b.h){

        // ✅ libera entrar no laboratório se a porta estiver aberta
        if(b.type==='lab'){
          const lk=doors.find(d=>d.name==='Laboratório');
          if(lk && lk.unlocked){
            continue;
          }
        }

        const doorX=b.x+b.w/2,doorY=b.y+b.h;
        if(!(Math.abs(player.x-doorX)<14&&Math.abs(player.y-doorY)<16)){
          player.x+=(player.x-(b.x+b.w/2))*.15;
          player.y+=(player.y-(b.y+b.h/2))*.15;
          PC.vx*=.3;PC.vy*=.3;
        }
      }
    }
  }
  if(player.inv>0)player.inv--;

  // AI
  for(const e of enemies){if(e.type==='deer')updateDeer(e);else updateBoar(e);}
  for(const b of birds)updateBird(b);
  for(const w of wolves)updateWolf(w);
  updatePartner();

  // ✅ gerador armado => explode => vitória
  if(generator && generator.armed){
    generator.timer--;
    if(generator.timer % 30 === 0) A.t(180,.05,'square',.05);

    if(generator.timer <= 0){
      generator.armed=false;
      generator.blown=true;

      enemies=[];
      wolves=[];
      birds=[];

      glitch=25;
      shake=25;
      A.dmg();
      A.collect();
      showTxt('✅ GERADOR DESTRUÍDO! Máquinas desativadas!');
      gs=S.END;
      eTmr=0;
    }
  }

  // Camera
  cam.x+=(player.x-W/2-cam.x)*.08;cam.y+=(player.y-H/2-cam.y)*.08;
  cam.x=Math.max(0,Math.min(MW-W,cam.x));cam.y=Math.max(0,Math.min(MH-H,cam.y));
  if(shake>0){cam.x+=(Math.random()-.5)*shake;cam.y+=(Math.random()-.5)*shake;shake*=.85;if(shake<.4)shake=0;}

  // Rain/Fog/Particles
  for(const r of rain){r.y+=r.sp;r.x-=.7;if(r.y>H){r.y=-r.ln;r.x=Math.random()*W;}if(r.x<0)r.x=W;}
  for(const f of fog){f.x+=f.dx;if(f.x<-70)f.x=MW+70;if(f.x>MW+70)f.x=-70;}
  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.life--;}
  particles=particles.filter(p=>p.life>0);

  lTmr++;if(lTmr>600+Math.random()*900){lFlash=20;lTmr=0;}if(lFlash>0)lFlash-=.8;
  if(txtTmr>0)txtTmr--;
}

/* ───── RENDER GAME ───── */
function renderGame(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#050512');sky.addColorStop(1,'#10101e');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';for(let i=0;i<20;i++){const sx=(i*43+gt*.004)%W,sy=(i*31)%(H*.3);ctx.globalAlpha=.2+Math.sin(gt*.03+i)*.15;ctx.fillRect(Math.floor(sx),Math.floor(sy),1,1);}ctx.globalAlpha=1;
  ctx.fillStyle='#0c0c14';ctx.fillRect(0,-cam.y,W,MH);
  ctx.fillStyle='#161620';for(let y=260;y<MH;y+=40)for(let x=0;x<MW;x+=60)ctx.fillRect(Math.floor(x-cam.x),Math.floor(y-cam.y),30,3);

  // Fog
  for(const f of fog){const fx=f.x-cam.x,fy=f.y-cam.y;if(fx<-70||fx>W+70||fy<-70||fy>H+70)continue;ctx.globalAlpha=f.a;ctx.fillStyle='#3a4a6a';ctx.beginPath();ctx.arc(fx,fy,f.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;

  const ents=[];
  for(const b of buildings)ents.push({t:'bld',y:b.y+b.h,d:b});
  for(const o of obstacles)ents.push({t:'obs',y:o.y+o.h,d:o});

  // ✅ não desenhar coletáveis inativos
  for(const c of collectibles){
    if(!c.col && c.active !== false) ents.push({t:'col',y:c.y,d:c});
  }

  for(const p of puzzles)ents.push({t:'pz',y:p.y,d:p});
  for(const d of doors){if(!d.unlocked)ents.push({t:'door',y:d.y,d:d});}

  ents.push({t:'partner',y:partner.y+12,d:partner});
  if(!player.hiding)ents.push({t:'player',y:player.y+12,d:player});
  for(const e of enemies)ents.push({t:e.type,y:e.y+22,d:e});
  for(const w of wolves)ents.push({t:'wolf',y:w.y+12,d:w});

  ents.sort((a,b)=>a.y-b.y);

  for(const e of ents){
    const sx=e.d.x-cam.x,sy=e.d.y-cam.y;
    if(sx<-120||sx>W+120||sy<-150||sy>H+70){if(!['deer','boar','wolf','player','partner'].includes(e.t))continue;}
    switch(e.t){
      case 'bld':drawBuilding(e.d);break;
      case 'obs':drawObstacle(e.d);break;
      case 'col':drawCollectible(e.d);break;
      case 'pz':drawPuzzle(e.d);break;
      case 'door':drawDoor(e.d);break;
      case 'partner':drawPartner();break;
      case 'player':drawPlayer(sx,sy);break;
      case 'deer':drawDeer(e.d,sx,sy);break;
      case 'boar':drawBoar(e.d,sx,sy);break;
      case 'wolf':drawWolf(e.d,sx,sy);break;
    }
  }

  for(const b of birds)drawBird(b);

  if(player.hiding){const px=player.x-cam.x,py=player.y-cam.y;dr(px-3,py-1,2,2,'#fff');dr(px+1,py-1,2,2,'#fff');
    T.box('[Espaço] Sair',px-22,py-15,{size:10,color:'#afa',bg:'rgba(0,40,0,.88)',padding:4});}

  // Particles
  for(const p of particles){ctx.globalAlpha=p.life/p.ml;ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),Math.ceil(p.sz),Math.ceil(p.sz));}ctx.globalAlpha=1;

  // ✅ desenha gerador antes da escuridão (pra lanterna afetar)
  drawGenerator();

  drawDark();

  // Rain
  ctx.strokeStyle='rgba(150,170,220,.3)';ctx.lineWidth=1;for(const r of rain){ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-1.5,r.y+r.ln);ctx.stroke();}

  if(lFlash>12){ctx.globalAlpha=(lFlash-12)/10*.35;ctx.fillStyle='#abf';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(player.hp<=1){const p=Math.sin(gt*.065)*.5+.5;ctx.globalAlpha=.07+p*.06;ctx.fillStyle='#f00';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}

  drawHUD();drawVHS();
}

/* ───── SCREENS ───── */
function renderTitle(){
  ctx.fillStyle='#040610';ctx.fillRect(0,0,W,H);
  const bh=[60,80,50,90,65,70,55,85,60,75];ctx.fillStyle='#060810';
  for(let i=0;i<bh.length;i++){const bw=30+i*5,bx=i*42;ctx.fillRect(bx,H-bh[i],bw,bh[i]);
    for(let wy=H-bh[i]+5;wy<H-5;wy+=12)for(let wx=bx+4;wx<bx+bw-4;wx+=8){ctx.fillStyle=Math.random()>.5?'#0a0a20':'#050508';ctx.fillRect(wx,wy,4,6);}ctx.fillStyle='#060810';}
  const ep=.5+Math.sin(gt*.05)*.35;
  ctx.globalAlpha=ep;dr(180+Math.sin(gt*.015)*5,140+Math.cos(gt*.01)*3,4,4,'#f00');dr(195+Math.sin(gt*.015)*5,140+Math.cos(gt*.01)*3,4,4,'#f00');
  ctx.globalAlpha=ep*.8;dr(290+Math.sin(gt*.012)*4,155+Math.cos(gt*.008)*4,5,5,'#f40');dr(310+Math.sin(gt*.012)*4,155+Math.cos(gt*.008)*4,5,5,'#f40');
  ctx.globalAlpha=ep*.7;dr(240+Math.sin(gt*.018)*3,165,3,3,'#44aaff');dr(250+Math.sin(gt*.018)*3,165,3,3,'#44aaff');ctx.globalAlpha=1;

  T.center('📻 SINAL PERDIDO',48,{size:20,color:'#4488ff',bold:true});
  T.center('O MISTÉRIO DA ANTENA DE BLACKWOOD',70,{size:11,color:'#8899bb'});
  T.center('Eco de Metal — Spin Off',90,{size:9,color:'#445566'});

  const menu=['🎮 INICIAR JOGO','❌ SAIR'];
  for(let i=0;i<menu.length;i++){const sel=i===tSel,my=168+i*32;
    if(sel){dr(W/2-90,my-14,180,28,'rgba(0,40,100,.45)');T.center('> '+menu[i]+' <',my,{size:14,color:'#88aaff',bold:true});}
    else T.center(menu[i],my,{size:13,color:'#445566'});}

  T.center('Escolha entre ENZO (hacker) ou MURILO (atleta)',H-50,{size:9,color:'#556677'});
  T.center('O parceiro te acompanha e ajuda automaticamente!',H-35,{size:9,color:'#445566'});
  T.center('Setas: Navegar | ENTER: Selecionar',H-18,{size:10,color:'#445566'});
  ctx.fillStyle='rgba(0,0,0,.1)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);gt++;
}

function renderCharSelect(){
  ctx.fillStyle='#030510';ctx.fillRect(0,0,W,H);
  T.center('ESCOLHA SEU PERSONAGEM',28,{size:16,color:'#4488ff',bold:true});
  T.center('O outro será seu PARCEIRO e ajudará você!',48,{size:10,color:'#6677aa'});

  // ENZO
  const ex=W/4,ey=H/2-20,es=cSel===0;
  if(es){ctx.strokeStyle='#4488ff';ctx.lineWidth=2;ctx.strokeRect(ex-55,ey-85,110,170);dr(ex-54,ey-84,108,168,'rgba(0,40,100,.3)');}
  drawChar(ex,ey+20,'#d4a574','#2244aa','#eeeedd',true,0,0,1);
  T.center('ENZO',ey-65,{size:14,color:es?'#88aaff':'#446688',bold:true});
  T.center('🔧 MECÂNICO / HACKER',ey-50,{size:9,color:es?'#6699cc':'#334455'});
  T.draw('• Hackeia portas e painéis',ex-50,ey+55,{size:8,color:'#557'});
  T.draw('• Lanterna forte (pilha)',ex-50,ey+67,{size:8,color:'#557'});
  T.draw('• Resolve puzzles',ex-50,ey+79,{size:8,color:'#557'});
  T.draw('Parceiro: MURILO (distrai)',ex-50,ey+95,{size:8,color:'#4a4',bold:true});

  // MURILO
  const mx=3*W/4,my=H/2-20,ms=cSel===1;
  if(ms){ctx.strokeStyle='#44aa44';ctx.lineWidth=2;ctx.strokeRect(mx-55,my-85,110,170);dr(mx-54,my-84,108,168,'rgba(0,60,0,.3)');}
  drawChar(mx,my+20,'#8b5e3c','#225522','#224488',false,0,0,1);
  T.center('MURILO',my-65,{size:14,color:ms?'#88cc88':'#446644',bold:true});
  T.center('🏃 ATLÉTICO / FURTIVO',my-50,{size:9,color:ms?'#66aa66':'#334433'});
  T.draw('• Corre mais rápido',mx-50,my+55,{size:8,color:'#557'});
  T.draw('• Lanterna dínamo (∞)',mx-50,my+67,{size:8,color:'#557'});
  T.draw('• Distrai inimigos [H]',mx-50,my+79,{size:8,color:'#557'});
  T.draw('Parceiro: ENZO (hackeia)',mx-50,my+95,{size:8,color:'#48f',bold:true});

  T.center('← → Escolher | ENTER: Confirmar | ESC: Voltar',H-18,{size:10,color:'#445566'});
  ctx.fillStyle='rgba(0,0,0,.1)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);gt++;
}

function renderIntro(){
  ctx.fillStyle='#030408';ctx.fillRect(0,0,W,H);
  const pName=chosen==='enzo'?'Murilo':'Enzo';
  const pSkill=chosen==='enzo'?'distrair inimigos':'hackear sistemas';
  const texts=[
    ['Cidade de Blackwood. Tempestade.','Um apagão misterioso atinge a cidade.','Os rádios captam um sinal estranho...'],
    ['Enzo e Murilo: melhores amigos.','Entusiastas de rádio amador.','Eles captam um pedido de socorro.'],
    [pName+' vai junto com você!','Ele pode '+pSkill+'!','Pressione [H] para pedir ajuda dele.'],
    ['As máquinas saíram da floresta.','Cervo, Javali, Lobos e Pássaros.','Elas querem capturar Maya.'],
    ['Dois garotos contra uma cidade escura.','Trabalhem juntos para sobreviver!','[ENTER para começar]']
  ];
  if(iStep<texts.length){iTmr++;const step=texts[iStep];
    for(let i=0;i<step.length;i++){const delay=i*28,chars=Math.min(step[i].length,Math.floor((iTmr-delay)/2.2));
      if(chars>0)T.draw(step[i].substring(0,chars),50,95+i*32,{size:i===0?13:11,color:i===0?'#8899ff':'#6677aa'});}
    if(iTmr>90&&gt%65<45)T.draw('[ENTER] Continuar | [ESC] Pular',W/2-100,H-30,{size:10,color:'#334455'});}
  ctx.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);gt++;
}

function renderDialogue(){
  renderGame();
  if(!curDlg)return;
  const boxH=70,boxY=H-boxH-10;
  dr(10,boxY,W-20,boxH,'rgba(5,5,25,.92)');ctx.strokeStyle='#4466aa';ctx.lineWidth=2;ctx.strokeRect(10,boxY,W-20,boxH);
  T.draw(curDlg.sp+':',22,boxY+16,{size:11,color:curDlg.cl||'#fff',bold:true});
  const words=curDlg.txt.split(' ');let line='',ly=boxY+35;ctx.font='10px "Courier New",monospace';
  for(const w of words){const test=line+w+' ';if(ctx.measureText(test).width>W-50&&line!==''){T.draw(line.trim(),22,ly,{size:10,color:'#ccc',shadow:false});line=w+' ';ly+=16;}else line=test;}
  if(line)T.draw(line.trim(),22,ly,{size:10,color:'#ccc',shadow:false});
  if(gt%50<35)T.draw('[ENTER] Continuar',W-110,boxY+boxH-12,{size:9,color:'#445566'});
}

function renderPuzzle(){
  ctx.fillStyle='rgba(0,0,0,.84)';ctx.fillRect(0,0,W,H);
  dr(W/2-130,H/2-90,260,180,'#0a0a1a');dr(W/2-128,H/2-88,256,176,'#12121e');
  const pn=actPz?actPz.name:'Puzzle';T.center('🔧 '+pn.toUpperCase(),H/2-65,{size:14,color:'#4488ff',bold:true});
  const pulse=.75+Math.sin(gt*.22)*.25;ctx.globalAlpha=pulse;
  dr(W/2-30,H/2-40,60,50,'#0a2244');dr(W/2-28,H/2-38,56,46,'#0d2a55');
  T.center('E',H/2-12,{size:36,color:'#88aaff',bold:true});ctx.globalAlpha=1;
  T.center('Pressione [E] repetidamente!',H/2+22,{size:12,color:'#8899aa'});
  T.center('⚠ Pode atrair inimigos...',H/2+40,{size:11,color:'#aa6644'});
  dr(W/2-100,H/2+58,200,24,'#111');
  dr(W/2-98,H/2+60,pzProg*1.96,20,pzProg<40?'#a44':pzProg<70?'#aa4':'#44aaff');
  T.center(Math.floor(pzProg)+'%',H/2+70,{size:14,color:'#fff',bold:true});
  T.center('[ESC] Cancelar',H/2+95,{size:10,color:'#445566'});
  if(gt%8<4)for(let i=0;i<4;i++)dr(W/2-30+Math.random()*60,H/2-40+Math.random()*50,2,2,Math.random()>.5?'#44aaff':'#88ccff');
  gt++;
}

function renderPause(){
  ctx.fillStyle='rgba(0,0,0,.82)';ctx.fillRect(0,0,W,H);
  dr(W/2-90,H/2-80,180,160,'#050510');dr(W/2-88,H/2-78,176,156,'#0a0a18');
  T.center('⏸ PAUSADO',H/2-55,{size:16,color:'#4488ff',bold:true});
  const pi=['▶ Continuar','🔄 Reiniciar','🏠 Menu'];
  for(let i=0;i<pi.length;i++){const s=i===pSel;T.center((s?'> ':'  ')+pi[i]+(s?' <':''),H/2-15+i*32,{size:13,color:s?'#88aaff':'#444455'});}
  gt++;
}

function renderDeath(){
  dTmr++;const r=Math.min(18,dTmr/8);ctx.fillStyle=`rgb(${r},0,${r*2})`;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.07;for(let i=0;i<350;i++){ctx.fillStyle=`rgba(${Math.random()*30},0,${Math.random()*60},1)`;ctx.fillRect(Math.random()*W,Math.random()*H,2,2);}ctx.globalAlpha=1;
  if(dTmr>30&&dTmr<200){const sc=1+(dTmr-30)/35,ey=H/2-35-(dTmr-30)*.12,gl=Math.min(1,(dTmr-30)/40);ctx.globalAlpha=gl;
    const es=3*sc;dr(W/2-50-10*sc/2-es,ey,es,es,'#f00');dr(W/2-50+10*sc/2,ey,es,es,'#f00');
    dr(W/2+30-14*sc/2-es,ey+12,es,es,'#44aaff');dr(W/2+30+14*sc/2,ey+12,es,es,'#44aaff');ctx.globalAlpha=1;}
  if(dTmr>110)T.center('💀 SINAL PERDIDO',H/2+20,{size:20,color:'#4444cc',bold:true});
  if(dTmr>180)T.center('A rede de máquinas os encontrou...',H/2+55,{size:12,color:'#335'});
  if(dTmr>280&&gt%55<38)T.center('[ENTER] Tentar novamente',H/2+95,{size:12,color:'#444'});
  ctx.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);gt++;
}

function renderEnd(){
  eTmr++;
  const t=Math.min(1,eTmr/400);
  ctx.fillStyle=`rgb(${Math.floor(10+t*180)},${Math.floor(5+t*100)},${Math.floor(20+t*60)})`;ctx.fillRect(0,0,W,H);
  if(eTmr>80){ctx.globalAlpha=Math.min(.8,(eTmr-80)/80);
    ctx.fillStyle='#2a4a2a';ctx.fillRect(0,H*.55,W,H*.45);
    for(let i=0;i<20;i++){ctx.fillStyle=['#ff6688','#ffaacc','#ff88aa','#ffddee'][i%4];ctx.beginPath();ctx.arc(50+i*17,H*.58+Math.sin(i*1.5)*15,3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#2a6a2a';ctx.fillRect(49+i*17,H*.58+Math.sin(i*1.5)*15,2,8);}
    const dx=W/2-60,dy=H*.5;ctx.fillStyle='#5a3a1a';ctx.fillRect(dx,dy,60,20);ctx.fillStyle='#4a2a0a';ctx.fillRect(dx+10,dy-15,15,20);
    const bx=W/2+30,by=H*.52;ctx.fillStyle='#4a3a2a';ctx.fillRect(bx,by,45,18);
    ctx.globalAlpha=1;}

  if(eTmr>140)T.center('O SILÊNCIO VOLTOU',H*.12,{size:16,color:'#cc8844',bold:true});
  if(eTmr>220){T.center('Enzo e Murilo estão a salvo.',H*.25,{size:12,color:'#8899aa'});
    T.center('A cidade se recuperou.',H*.32,{size:11,color:'#667788'});}
  if(eTmr>320)T.center('"O sinal era um pedido de paz." — Maya',H*.76,{size:11,color:'#778899'});
  if(eTmr>420){T.center('SÓ HÁ SILÊNCIO.',H*.85,{size:14,color:'#aabbcc',bold:true});
    T.center('FIM',H*.92,{size:18,color:'#667788'});}
  if(eTmr>620&&gt%65<48)T.center('[ENTER] Menu',H-25,{size:11,color:'#445566'});
  dr(0,0,W,20,'#000');dr(0,H-20,W,20,'#000');
  ctx.fillStyle='rgba(0,0,0,.06)';for(let i=0;i<H;i+=3)ctx.fillRect(0,i,W,1);gt++;
}

/* ───── MAIN LOOP ───── */
function loop(){
  switch(gs){
    case S.TITLE:renderTitle();break;
    case S.SEL:renderCharSelect();break;
    case S.INTRO:renderIntro();break;
    case S.DIAL:renderDialogue();break;
    case S.PUZZLE:renderPuzzle();break;
    case S.PAUSE:renderPause();break;
    case S.DEATH:renderDeath();break;
    case S.END:renderEnd();break;
    case S.GAME:updateGame();renderGame();break;
  }
  requestAnimationFrame(loop);
}

A.init();loop();