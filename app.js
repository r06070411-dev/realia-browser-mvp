(() => {
  'use strict';

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const canvas = $('world');
  const ctx = canvas.getContext('2d', { alpha:true });
  const mini = $('minimap');
  const mctx = mini.getContext('2d');

  const btnEntrance = $('btnEntrance');
  const btnWorld = $('btnWorld');
  const btnReset = $('btnReset');
  const btnEnterArea = $('btnEnterArea');
  const btnTalk = $('btnTalk');

  const toast = $('toast');
  const areaNameEl = $('areaName');
  const hintText = $('hintText');

  const chatLog = $('chatLog');
  const chatInput = $('chatInput');
  const chatSend = $('chatSend');
  const npcNameEl = $('npcName');
  const distanceText = $('distanceText');

  const areaModal = $('areaModal');
  const modalBack = $('modalBack');
  const modalClose = $('modalClose');
  const modalTitle = $('modalTitle');
  const modalSub = $('modalSub');
  const sceneTheme = $('sceneTheme');
  const sceneNpc = $('sceneNpc');
  const sceneTodo = $('sceneTodo');
  const modalEnter = $('modalEnter');
  const modalTalk = $('modalTalk');
  const sceneName = $('sceneName');
  const sceneThumb = $('sceneThumb');

  const joy = $('joy');
  const joyKnob = $('joyKnob');

  // ===== Helpers =====
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const dist = (ax,ay,bx,by)=>Math.hypot(ax-bx, ay-by);

  function toastMsg(text, ms=1800){
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastMsg._t);
    toastMsg._t = setTimeout(()=>toast.classList.remove('show'), ms);
  }
  function addMsg(who, text, kind){
    const el = document.createElement('div');
    el.className = 'msg ' + (kind||'');
    el.innerHTML = `<div class="who"></div><div class="txt"></div>`;
    el.querySelector('.who').textContent = who;
    el.querySelector('.txt').textContent = text;
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // ===== World =====
  const WORLD = { w: 2600, h: 1600 };
  const player = { x: 980, y: 820, r: 18, vx:0, vy:0, speed: 270 };
  const camera = { x:0, y:0 };
  const keys = new Set();

  const AREAS = [
    { id:'cyber', name:'World (Cyber Roppongi (A))', sub:'近未来・六本木（イメージ） / ネオン / 霧 / ホログラム広告',
      theme:'夜 / ネオン / 霧', npc:'AIコンシェルジュ（ファッション）', todo:'相談 → 店舗提案（将来）',
      gate:{ x: 980, y: 720 }, style:'night' },
    { id:'green', name:'World (Green Avenue)', sub:'近未来の並木道 / 昼 / 透明サイネージ',
      theme:'昼 / 緑 / 未来街路灯', npc:'AI案内（飲食）', todo:'検索 → 混雑案内（将来）',
      gate:{ x: 1720, y: 980 }, style:'day' },
    { id:'tower', name:'World (Tower District)', sub:'高層ビル街 / サイバータワー / 反射ガラス',
      theme:'夕方 / 高層 / ネオンエッジ', npc:'AI相談（リフォーム）', todo:'ヒアリング → 加盟店候補（将来）',
      gate:{ x: 620, y: 1120 }, style:'dusk' }
  ];

  const npcs = [
    { id:'npc-fashion', name:'Fashion AI', x: 1060, y: 650, r:16, kind:'fashion' },
    { id:'npc-food', name:'Food AI', x: 1780, y: 1020, r:16, kind:'food' },
    { id:'npc-reform', name:'Reform AI', x: 690, y: 1180, r:16, kind:'reform' },
  ];

  // Procedural city blocks (simple collision)
  const buildings = [];
  (function seed(){
    const rng = mulberry32(1337);
    for(let i=0;i<220;i++){
      const w = 60 + (rng()*160|0);
      const h = 60 + (rng()*220|0);
      const x = (rng()*(WORLD.w-w))|0;
      const y = (rng()*(WORLD.h-h))|0;
      // keep main avenue open
      const avX = WORLD.w*0.46, avW = WORLD.w*0.08;
      if (x < avX+avW && x+w > avX) continue;
      buildings.push({x,y,w,h,t:rng()});
    }
  })();

  const particles = [];
  (function initParticles(){
    const rng = mulberry32(2026);
    for(let i=0;i<220;i++){
      particles.push({ x:rng()*WORLD.w, y:rng()*WORLD.h, z:rng(), s:0.6+rng()*1.8, a:0.18+rng()*0.45 });
    }
  })();

  let nearGate = null;
  let nearNpc = null;
  let currentArea = null;

  // ===== Resize =====
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio||1);
    canvas.width = Math.floor(rect.width*dpr);
    canvas.height = Math.floor((rect.width*9/16)*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ===== Input =====
  window.addEventListener('keydown', (e)=>{
    keys.add(e.key.toLowerCase());
    if ((e.key==='Enter' || e.key.toLowerCase()==='e') && nearGate) openAreaModal(nearGate);
    if (e.key==='Escape') closeModal();
  });
  window.addEventListener('keyup', (e)=>keys.delete(e.key.toLowerCase()));

  // Mobile joystick
  const joystick = { active:false, id:null, cx:0, cy:0, dx:0, dy:0, max:46 };
  const setKnob = ()=>joyKnob.style.transform = `translate3d(${joystick.dx}px,${joystick.dy}px,0)`;

  function tStart(e){
    for(const t of e.changedTouches){
      const r = joy.getBoundingClientRect();
      if (t.clientX>=r.left && t.clientX<=r.right && t.clientY>=r.top && t.clientY<=r.bottom){
        joystick.active=true; joystick.id=t.identifier;
        joystick.cx=(r.left+r.right)/2; joystick.cy=(r.top+r.bottom)/2;
        joystick.dx=0; joystick.dy=0; setKnob();
        e.preventDefault(); return;
      }
    }
  }
  function tMove(e){
    if(!joystick.active) return;
    for(const t of e.changedTouches){
      if(t.identifier===joystick.id){
        const dx=t.clientX-joystick.cx, dy=t.clientY-joystick.cy;
        const d=Math.hypot(dx,dy);
        const s=d>joystick.max ? joystick.max/d : 1;
        joystick.dx=dx*s; joystick.dy=dy*s; setKnob();
        e.preventDefault(); return;
      }
    }
  }
  function tEnd(e){
    if(!joystick.active) return;
    for(const t of e.changedTouches){
      if(t.identifier===joystick.id){
        joystick.active=false; joystick.id=null;
        joystick.dx=0; joystick.dy=0; setKnob();
        e.preventDefault(); return;
      }
    }
  }
  joy.addEventListener('touchstart', tStart, {passive:false});
  joy.addEventListener('touchmove', tMove, {passive:false});
  joy.addEventListener('touchend', tEnd, {passive:false});
  joy.addEventListener('touchcancel', tEnd, {passive:false});

  canvas.addEventListener('pointerdown', ()=>{
    if (nearNpc) startTalk(nearNpc);
    else if (nearGate) openAreaModal(nearGate);
  });

  // ===== Buttons =====
  btnEntrance.addEventListener('click', ()=>{
    player.x=980; player.y=820;
    toastMsg('入口へ戻りました');
  });
  btnWorld.addEventListener('click', ()=>toastMsg('ワールド表示'));
  btnReset.addEventListener('click', resetAll);
  btnEnterArea.addEventListener('click', ()=>nearGate && openAreaModal(nearGate));
  btnTalk.addEventListener('click', ()=>nearNpc && startTalk(nearNpc));

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendChat(); });

  // ===== Modal =====
  modalBack.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  modalEnter.addEventListener('click', ()=>{ if(currentArea){ enterArea(currentArea); closeModal(); }});
  modalTalk.addEventListener('click', ()=>{ if(currentArea){ startTalk(nearestNpcToGate(currentArea)); closeModal(); }});

  function openAreaModal(area){
    currentArea = area;
    areaNameEl.textContent = area.name;
    modalTitle.textContent = area.name;
    modalSub.textContent = area.sub;
    sceneTheme.textContent = area.theme;
    sceneNpc.textContent = area.npc;
    sceneTodo.textContent = area.todo;
    sceneName.textContent = area.name.replace('World (','').replace(')','');
    sceneThumb.style.filter = area.style==='night' ? 'saturate(1.12) contrast(1.06)'
      : area.style==='day' ? 'brightness(1.06) saturate(1.0)' : 'saturate(1.08) contrast(1.04)';
    areaModal.classList.remove('hidden');
    toastMsg('エリア情報を表示しました');
  }
  function closeModal(){ areaModal.classList.add('hidden'); }

  // ===== Chat / Dummy AI =====
  function sendChat(){
    const text = (chatInput.value||'').trim();
    if(!text) return;
    addMsg('あなた', text, 'user');
    chatInput.value='';
    const npc = nearNpc || (currentArea ? nearestNpcToGate(currentArea) : null);
    const who = npc ? npc.name : 'AI';
    setTimeout(()=>addMsg(who, dummyReply(text, npc?.kind||'general'), 'ai'), 220);
  }
  function dummyReply(text, kind){
    const t = text.toLowerCase();
    if(kind==='reform'){
      if(t.includes('100')||t.includes('万円')) return '概算なら延床面積・外壁材・足場の有無で変わります。100万円前後のプランもあります。市区町村と延床面積を教えてください。';
      return 'リフォーム相談ですね。場所・予算・希望時期・困りごとを教えてください。加盟店候補を提示します（将来）。';
    }
    if(kind==='fashion'){
      if(t.includes('おすすめ')||t.includes('サイズ')) return '好み（色/シルエット/予算）を教えてください。似合う候補を3つ提案します。';
      return 'ファッションの相談ですね。用途（普段/仕事/デート）と予算感を教えてください。';
    }
    if(kind==='food'){
      if(t.includes('予約')||t.includes('空いて')) return '混雑状況を確認します（ダミー）。駅からの距離・予算・ジャンル・人数を教えてください。';
      return '飲食の相談ですね。エリアとジャンル、予算、人数を教えてください。';
    }
    return '了解です。条件（場所・予算・目的）をもう少し教えてください。';
  }

  function startTalk(npc){
    nearNpc = npc;
    npcNameEl.textContent = npc.name;
    addMsg(npc.name, 'こんにちは。何をお探しですか？（ダミー）', 'ai');
    toastMsg('AIに話しかけました：'+npc.name);
  }
  function nearestNpcToGate(area){
    if (area.npcObj) return area.npcObj;
    let best=null, bd=1e9;
    for(const n of npcs){
      const d = dist(n.x,n.y, area.gate.x, area.gate.y);
      if(d<bd){bd=d; best=n;}
    }
    area.npcObj = best;
    return best;
  }
  function enterArea(area){
    // "Enter" = teleport near gate + vibe message (demo)
    player.x = area.gate.x + 40;
    player.y = area.gate.y + 10;
    toastMsg('エリアに入りました：'+area.name);
    addMsg('System', 'エリアに入りました：'+area.name+' / '+area.sub, 'ai');
    startTalk(nearestNpcToGate(area));
  }

  function resetAll(){
    player.x=980; player.y=820; player.vx=0; player.vy=0;
    nearGate=null; nearNpc=null; currentArea=null;
    areaNameEl.textContent='World (Select)';
    hintText.textContent='ゲートに近づくと入れます（ネオン/霧）';
    npcNameEl.textContent='未選択（近づいて話す）';
    distanceText.textContent='--';
    btnEnterArea.disabled=true; btnTalk.disabled=true;
    addMsg('System','起動しました。ゲート（青い円）に近づくと入場できます。', 'ai');
    toastMsg('リセットしました');
  }

  // ===== Ambience selection =====
  function regionStyle(){
    let best=AREAS[0], bd=1e9;
    for(const a of AREAS){
      const d = dist(player.x, player.y, a.gate.x, a.gate.y);
      if(d<bd){bd=d; best=a;}
    }
    return best.style;
  }

  // ===== Loop =====
  let last = performance.now();
  resetAll();
  requestAnimationFrame(loop);

  function loop(now){
    const dt = clamp((now-last)/1000, 0, 0.05);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt){
    let ix=0, iy=0;
    if(keys.has('w')||keys.has('arrowup')) iy -= 1;
    if(keys.has('s')||keys.has('arrowdown')) iy += 1;
    if(keys.has('a')||keys.has('arrowleft')) ix -= 1;
    if(keys.has('d')||keys.has('arrowright')) ix += 1;

    if(joystick.active){ ix += joystick.dx/joystick.max; iy += joystick.dy/joystick.max; }

    const mag = Math.hypot(ix,iy);
    if(mag>1e-6){ ix/=mag; iy/=mag; }

    player.vx = ix*player.speed;
    player.vy = iy*player.speed;

    player.x = clamp(player.x + player.vx*dt, player.r, WORLD.w-player.r);
    player.y = clamp(player.y + player.vy*dt, player.r, WORLD.h-player.r);

    // simple collision with buildings (push out)
    for(const b of buildings){
      if(circleRectHit(player.x,player.y,player.r,b.x,b.y,b.w,b.h)){
        const px = clamp(player.x,b.x,b.x+b.w);
        const py = clamp(player.y,b.y,b.y+b.h);
        const dx = player.x-px, dy = player.y-py;
        const d = Math.hypot(dx,dy)||1;
        const push = (player.r - d) + 0.6;
        player.x += (dx/d)*push;
        player.y += (dy/d)*push;
        player.x = clamp(player.x, player.r, WORLD.w-player.r);
        player.y = clamp(player.y, player.r, WORLD.h-player.r);
      }
    }

    // camera follow (view = 960x540 logical)
    const viewW=960, viewH=540;
    camera.x = clamp(player.x - viewW/2, 0, WORLD.w-viewW);
    camera.y = clamp(player.y - viewH/2, 0, WORLD.h-viewH);

    // near gate
    nearGate = null;
    for(const a of AREAS){
      if(dist(player.x,player.y,a.gate.x,a.gate.y)<92){ nearGate=a; break; }
    }
    // near npc
    nearNpc = null;
    let best=null, bd=1e9;
    for(const n of npcs){
      const d = dist(player.x,player.y,n.x,n.y);
      if(d<bd){bd=d; best=n;}
    }
    if(best && bd<96) nearNpc=best;

    btnEnterArea.disabled = !nearGate;
    btnTalk.disabled = !nearNpc;

    if(nearNpc) distanceText.textContent = Math.round(dist(player.x,player.y,nearNpc.x,nearNpc.y))+'m';
    else distanceText.textContent='--';

    if(nearGate){
      hintText.textContent='ゲート付近：入場できます（タップ/Enter/E）';
      areaNameEl.textContent=nearGate.name;
    }else{
      hintText.textContent='ゲートに近づくと入れます（ネオン/霧）';
      if(!currentArea) areaNameEl.textContent='World (Select)';
    }
  }

  function render(){
    const w=960, h=540;
    ctx.clearRect(0,0,w,h);
    const style = regionStyle();

    drawSky(style,w,h);
    drawSkyline(style,w,h,0.18);
    drawSkyline(style,w,h,0.32);
    drawGrid(style,w,h);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    for(const b of buildings) drawBuilding(style,b);
    for(const a of AREAS) drawGate(a.gate.x,a.gate.y, a===nearGate);
    for(const n of npcs) drawNpc(n, n===nearNpc);
    drawPlayer();
    drawParticles(style,w,h);
    ctx.restore();

    drawVignette(style,w,h);
    drawMinimap();
  }

  function drawSky(style,w,h){
    const g = ctx.createLinearGradient(0,0,0,h);
    if(style==='night'){
      g.addColorStop(0,'#070a16'); g.addColorStop(0.55,'#08102a'); g.addColorStop(1,'#050815');
    }else if(style==='day'){
      g.addColorStop(0,'#0a1431'); g.addColorStop(0.5,'#0a1733'); g.addColorStop(1,'#070b16');
    }else{
      g.addColorStop(0,'#081026'); g.addColorStop(0.55,'#0a1230'); g.addColorStop(1,'#070b16');
    }
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

    // Stars
    ctx.save();
    ctx.globalAlpha = style==='day' ? 0.08 : 0.16;
    for(let i=0;i<60;i++){
      const x = (hash(77+i*3)%1000)/1000*w;
      const y = (hash(77+i*7)%1000)/1000*(h*0.55);
      const r = 0.6 + ((hash(77+i*11)%1000)/1000)*1.4;
      ctx.fillStyle = (i%7===0) ? 'rgba(176,108,255,.9)' : 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Haze
    ctx.save();
    ctx.globalAlpha = style==='night' ? 0.22 : 0.18;
    let hg = ctx.createRadialGradient(w*0.35,h*0.2,10,w*0.35,h*0.2,h*0.8);
    hg.addColorStop(0,'rgba(90,167,255,.22)'); hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.fillRect(0,0,w,h);

    ctx.globalAlpha = style==='night' ? 0.18 : 0.14;
    hg = ctx.createRadialGradient(w*0.72,h*0.2,10,w*0.72,h*0.2,h*0.9);
    hg.addColorStop(0,'rgba(176,108,255,.18)'); hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.fillRect(0,0,w,h);
    ctx.restore();
  }

  function drawSkyline(style,w,h,depth){
    const baseY = h*(0.48+depth*0.22);
    const step = 24+depth*22;
    ctx.save();
    ctx.globalAlpha = 0.38 - depth*0.18;
    for(let x=-40; x<w+60; x+=step){
      const hh = 40 + (hash((x/step)|0)%1000)/1000*(140+depth*140);
      const bw = step*(0.7+((hash(x|0)%1000)/1000)*0.9);
      const y = baseY - hh;
      const neon = style==='night' ? 'rgba(90,167,255,.22)' : style==='day' ? 'rgba(255,255,255,.10)' : 'rgba(176,108,255,.18)';
      ctx.fillStyle='rgba(10,14,26,.55)';
      ctx.fillRect(x,y,bw,hh);

      ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
      for(let wy=y+8; wy<baseY-6; wy+=10){
        ctx.beginPath(); ctx.moveTo(x+6,wy); ctx.lineTo(x+bw-8,wy); ctx.stroke();
      }
      ctx.strokeStyle=neon; ctx.lineWidth=2;
      ctx.strokeRect(x+1,y+1,bw-2,hh-2);
    }
    ctx.restore();
  }

  function drawGrid(style,w,h){
    ctx.save();
    ctx.globalAlpha=0.10;
    ctx.strokeStyle = style==='night' ? 'rgba(90,167,255,.18)' : 'rgba(255,255,255,.10)';
    ctx.lineWidth=1;
    const horizon = h*0.56;
    for(let i=0;i<22;i++){
      const t=i/22; const y=lerp(horizon,h,t*t);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }
    for(let i=0;i<26;i++){
      const t=(i-13)/13;
      const x=w/2 + t*w*0.55;
      ctx.beginPath(); ctx.moveTo(x,horizon); ctx.lineTo(w/2+t*w*0.85,h); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuilding(style,b){
    ctx.fillStyle='rgba(10,14,26,.78)';
    ctx.fillRect(b.x,b.y,b.w,b.h);

    const g = ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);
    g.addColorStop(0,'rgba(255,255,255,.05)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(b.x,b.y,b.w,b.h);

    ctx.globalAlpha=0.55;
    for(let y=b.y+10; y<b.y+b.h-8; y+=14){
      for(let x=b.x+10; x<b.x+b.w-10; x+=18){
        const on = ((x*13 + y*7 + (b.t*999|0)) % 5) === 0;
        if(!on) continue;
        ctx.fillStyle = style==='night' ? 'rgba(90,167,255,.65)' : style==='day' ? 'rgba(255,255,255,.30)' : 'rgba(176,108,255,.45)';
        ctx.fillRect(x,y,4,2);
      }
    }
    ctx.globalAlpha=1;

    ctx.strokeStyle = style==='night' ? 'rgba(90,167,255,.18)' : style==='day' ? 'rgba(255,255,255,.12)' : 'rgba(176,108,255,.14)';
    ctx.lineWidth=2; ctx.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);
  }

  function drawGate(x,y,active){
    const r=28;
    ctx.save();
    let g = ctx.createRadialGradient(x,y,2,x,y,90);
    g.addColorStop(0,'rgba(90,167,255,.35)');
    g.addColorStop(0.6,'rgba(90,167,255,.12)');
    g.addColorStop(1,'rgba(90,167,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,90,0,Math.PI*2); ctx.fill();

    ctx.globalAlpha = active?1:0.85;
    ctx.lineWidth = active?5:3;
    ctx.strokeStyle = active?'rgba(90,167,255,.95)':'rgba(90,167,255,.70)';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();

    const t=performance.now()/1000;
    const pr=r*0.55 + Math.sin(t*2.6)*2.5;
    ctx.globalAlpha=0.55; ctx.lineWidth=2; ctx.strokeStyle='rgba(176,108,255,.65)';
    ctx.beginPath(); ctx.arc(x,y,pr,0,Math.PI*2); ctx.stroke();

    ctx.globalAlpha=0.9; ctx.fillStyle='rgba(255,255,255,.78)';
    ctx.font='12px system-ui'; ctx.fillText('GATE', x-16, y-40);
    ctx.restore();
  }

  function drawNpc(n,active){
    ctx.save();
    let g = ctx.createRadialGradient(n.x,n.y,2,n.x,n.y,70);
    g.addColorStop(0,'rgba(176,108,255,.32)');
    g.addColorStop(0.7,'rgba(176,108,255,.10)');
    g.addColorStop(1,'rgba(176,108,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(n.x,n.y,70,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = active?'rgba(176,108,255,.95)':'rgba(176,108,255,.78)';
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();

    ctx.fillStyle='rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.arc(n.x-5,n.y-3,2.2,0,Math.PI*2); ctx.arc(n.x+5,n.y-3,2.2,0,Math.PI*2); ctx.fill();

    ctx.fillStyle='rgba(255,255,255,.78)';
    ctx.font='12px system-ui'; ctx.fillText(n.name, n.x-28, n.y-26);
    ctx.restore();
  }

  function drawPlayer(){
    ctx.save();
    const x=player.x, y=player.y;
    let g = ctx.createRadialGradient(x,y,2,x,y,70);
    g.addColorStop(0,'rgba(90,167,255,.35)');
    g.addColorStop(0.75,'rgba(90,167,255,.10)');
    g.addColorStop(1,'rgba(90,167,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,70,0,Math.PI*2); ctx.fill();

    ctx.fillStyle='rgba(90,167,255,.95)';
    ctx.beginPath(); ctx.arc(x,y,player.r,0,Math.PI*2); ctx.fill();

    const ang = Math.atan2(player.vy||0.001, player.vx||1);
    ctx.fillStyle='rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(x+Math.cos(ang)*10, y+Math.sin(ang)*10, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawParticles(style,w,h){
    const left=camera.x, top=camera.y, right=camera.x+w, bottom=camera.y+h;
    const t=performance.now()/1000;
    ctx.save();
    for(const p of particles){
      p.y -= (0.8+p.z*1.8)*(style==='day'?0.35:0.55);
      p.x += Math.sin(t*0.7 + p.y*0.002)*0.18;
      if(p.y<0) p.y+=WORLD.h;
      if(p.x<0) p.x+=WORLD.w;
      if(p.x>WORLD.w) p.x-=WORLD.w;
      if(p.x<left-20||p.x>right+20||p.y<top-20||p.y>bottom+20) continue;
      const alpha=(style==='day'?0.06:0.11)*p.a;
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette(style,w,h){
    ctx.save();
    let g = ctx.createRadialGradient(w*0.5,h*0.55,h*0.20,w*0.5,h*0.55,h*0.78);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1, style==='day'?'rgba(0,0,0,.32)':'rgba(0,0,0,.45)');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

    ctx.globalAlpha = style==='night'?0.20:0.14;
    g = ctx.createLinearGradient(0,h*0.2,0,h);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(1,'rgba(255,255,255,.12)');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.restore();
  }

  function drawMinimap(){
    const w=mini.width, h=mini.height;
    mctx.clearRect(0,0,w,h);
    mctx.fillStyle='rgba(0,0,0,.22)'; mctx.fillRect(0,0,w,h);

    const sx=w/WORLD.w, sy=h/WORLD.h;
    mctx.fillStyle='rgba(255,255,255,.06)';
    for(const b of buildings) mctx.fillRect(b.x*sx, b.y*sy, Math.max(1,b.w*sx*0.12), Math.max(1,b.h*sy*0.12));

    for(const a of AREAS){
      mctx.fillStyle='rgba(71,209,140,.92)';
      mctx.beginPath(); mctx.arc(a.gate.x*sx, a.gate.y*sy, 3.2, 0, Math.PI*2); mctx.fill();
    }
    for(const n of npcs){
      mctx.fillStyle='rgba(176,108,255,.92)';
      mctx.beginPath(); mctx.arc(n.x*sx, n.y*sy, 3.0, 0, Math.PI*2); mctx.fill();
    }
    mctx.fillStyle='rgba(90,167,255,.95)';
    mctx.beginPath(); mctx.arc(player.x*sx, player.y*sy, 3.2, 0, Math.PI*2); mctx.fill();

    mctx.strokeStyle='rgba(255,255,255,.18)'; mctx.lineWidth=1;
    mctx.strokeRect(camera.x*sx, camera.y*sy, 960*sx, 540*sy);
  }

  // ===== Collision =====
  function circleRectHit(cx,cy,cr, rx,ry,rw,rh){
    const px = clamp(cx, rx, rx+rw);
    const py = clamp(cy, ry, ry+rh);
    return dist(cx,cy,px,py) < cr;
  }

  // ===== RNG =====
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(n){
    n = (n<<13) ^ n;
    return (n * (n*n*15731 + 789221) + 1376312589) >>> 0;
  }
})();