/* =========================================
   REALIA Browser Open World / Complete Demo
   - Vanilla JS
   - Mobile joystick + minimap
   - Gate enter when near
   - Multi areas with separate gates
   - Near-future neon mood (fog/particles)
   ========================================= */

(() => {
  "use strict";

  // ---------- DOM ----------
  const worldCanvas = document.getElementById("worldCanvas");
  const ctx = worldCanvas.getContext("2d");

  const minimapCanvas = document.getElementById("minimapCanvas");
  const mctx = minimapCanvas.getContext("2d");

  const pillArea = document.getElementById("pillArea");
  const pillHint = document.getElementById("pillHint");

  const enterBtn = document.getElementById("enterBtn");
  const btnEntrance = document.getElementById("btnEntrance");
  const btnWorld = document.getElementById("btnWorld");
  const btnReset = document.getElementById("btnReset");
  const btnTalk = document.getElementById("btnTalk");

  const chatLog = document.getElementById("chatLog");
  const chatText = document.getElementById("chatText");
  const chatSend = document.getElementById("chatSend");

  const statusArea = document.getElementById("statusArea");
  const statusNpc = document.getElementById("statusNpc");
  const statusEnter = document.getElementById("statusEnter");

  const areaModal = document.getElementById("areaModal");
  const areaTitle = document.getElementById("areaTitle");
  const areaDesc = document.getElementById("areaDesc");
  const areaBadge = document.getElementById("areaBadge");
  const areaAiName = document.getElementById("areaAiName");
  const areaAiLine = document.getElementById("areaAiLine");
  const areaClose = document.getElementById("areaClose");
  const areaBack = document.getElementById("areaBack");
  const areaTalk = document.getElementById("areaTalk");

  // Joystick
  const joystickEl = document.getElementById("joystick");
  const knobEl = document.getElementById("joyKnob");

  // ---------- World settings ----------
  const W = worldCanvas.width;
  const H = worldCanvas.height;

  const world = {
    // Open world "city blocks" map size larger than canvas (camera follows player)
    mapW: 2200,
    mapH: 1400,
    cameraX: 0,
    cameraY: 0,
    zoom: 1,
  };

  // Player
  const player = {
    x: world.mapW * 0.52,
    y: world.mapH * 0.62,
    r: 10,
    speed: 220, // px/sec
    vx: 0,
    vy: 0,
  };

  // Areas (each has its own gate and "scene")
  const AREAS = [
    {
      id: "fashion",
      name: "Fashion District",
      badge: "NEON FASHION",
      desc: "ファッション・アパレルの街。AIがショップ案内と接客をします。",
      gate: { x: world.mapW * 0.35, y: world.mapH * 0.40, r: 26 },
      ai:   { x: world.mapW * 0.35 + 120, y: world.mapH * 0.40 + 40, r: 16, label: "AI店員" },
      color: { a: "#63d4ff", b: "#b06cff" }
    },
    {
      id: "reform",
      name: "Reform Street",
      badge: "SMART REFORM",
      desc: "リフォーム・建築の街。見積もり相談や提案をAIが行います。",
      gate: { x: world.mapW * 0.62, y: world.mapH * 0.33, r: 26 },
      ai:   { x: world.mapW * 0.62 + 120, y: world.mapH * 0.33 + 40, r: 16, label: "AIコンシェルジュ" },
      color: { a: "#35ffb5", b: "#63d4ff" }
    },
    {
      id: "food",
      name: "Food Street",
      badge: "FOOD & CITY",
      desc: "飲食・予約・混雑案内。AIが店探しを手伝います。",
      gate: { x: world.mapW * 0.50, y: world.mapH * 0.76, r: 26 },
      ai:   { x: world.mapW * 0.50 + 120, y: world.mapH * 0.76 - 70, r: 16, label: "AI案内" },
      color: { a: "#b06cff", b: "#35ffb5" }
    },
  ];

  // Decorative city objects (buildings, signs, trees)
  const buildings = [];
  const signs = [];
  const particles = [];

  // Input state
  const keys = new Set();
  const input = {
    joyActive: false,
    joyX: 0,
    joyY: 0,
    joyMax: 44,
  };

  // Game state
  let currentArea = "World (Select)";
  let nearGate = null;
  let nearAi = null;
  let inModal = false;

  // ---------- Helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  function addMsg(role, text){
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;
    const roleEl = document.createElement("div");
    roleEl.className = "role";
    roleEl.textContent = role === "user" ? "You" : role === "ai" ? "AI" : "System";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    wrap.appendChild(roleEl);
    wrap.appendChild(bubble);
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function dummyAIReply(userText){
    const t = userText.trim();
    if (!t) return "ご用件を入力してください。";

    // Simple demo routing
    if (t.includes("100") || t.includes("万円") || t.includes("予算")) {
      return "予算感を確認しました。場所（都道府県/市区町村）と希望内容（外壁/屋根/両方、面積）を教えてください。条件に合う加盟店候補を絞り込みます。";
    }
    if (t.includes("外壁") || t.includes("塗装")) {
      return "外壁塗装ですね。耐久重視ならシリコン/フッ素、コスパ重視ならシリコンが定番です。築年数と現状（ひび割れ・チョーキング）を教えてください。";
    }
    if (t.includes("予約") || t.includes("混雑")) {
      return "予約と混雑案内ですね。希望日時と人数、エリア（Food Street内）を教えてください。空き候補を提案します。";
    }
    if (t.includes("リフォーム") || t.includes("見積")) {
      return "リフォームの相談ですね。予算・工期・希望イメージ（キッチン/浴室/外装など）を教えてください。概算と進め方を案内します。";
    }
    return "承知しました。目的（買い物/相談/予約）と、希望条件（場所・予算・期限）を教えてください。最短で候補を提案します。";
  }

  // ---------- Build world decorations ----------
  function initWorld(){
    buildings.length = 0;
    signs.length = 0;
    particles.length = 0;

    // Buildings blocks
    const cols = 14, rows = 9;
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        const x = (c + 0.3) * (world.mapW / cols);
        const y = (r + 0.25) * (world.mapH / rows);

        // leave "roads" by skipping some
        if ((c % 3 === 1) || (r % 3 === 1)) continue;

        const bw = 120 + Math.random()*140;
        const bh = 80 + Math.random()*170;
        buildings.push({
          x, y,
          w: bw,
          h: bh,
          hue: 200 + Math.random()*90,
          glow: Math.random()*0.9 + 0.1
        });

        // Neon signs
        if (Math.random() < 0.45){
          signs.push({
            x: x + bw*0.3,
            y: y + bh*0.35,
            w: 48 + Math.random()*64,
            h: 14 + Math.random()*16,
            c1: ["#63d4ff","#b06cff","#35ffb5"][Math.floor(Math.random()*3)],
            c2: ["#b06cff","#35ffb5","#63d4ff"][Math.floor(Math.random()*3)]
          });
        }
      }
    }

    // Particles (fog/neon dust)
    for (let i=0;i<140;i++){
      particles.push({
        x: Math.random()*world.mapW,
        y: Math.random()*world.mapH,
        r: 0.8 + Math.random()*2.4,
        vx: -8 + Math.random()*16,
        vy: -6 + Math.random()*12,
        a: 0.08 + Math.random()*0.18,
        tint: Math.random()<0.5 ? "a" : "b"
      });
    }

    // Reset player and camera
    player.x = world.mapW * 0.52;
    player.y = world.mapH * 0.62;
    world.cameraX = clamp(player.x - W/2, 0, world.mapW - W);
    world.cameraY = clamp(player.y - H/2, 0, world.mapH - H);

    updateUIState();
  }

  // ---------- Input ----------
  window.addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }, { passive:false });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  // Joystick touch handling
  function setKnob(dx, dy){
    const len = Math.hypot(dx, dy);
    const max = input.joyMax;
    const k = len > max ? (max / len) : 1;
    const nx = dx * k;
    const ny = dy * k;
    knobEl.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    input.joyX = nx / max;
    input.joyY = ny / max;
  }

  function resetKnob(){
    knobEl.style.transform = "translate(-50%, -50%)";
    input.joyX = 0;
    input.joyY = 0;
  }

  let joyPointerId = null;
  let joyCenter = {x:0,y:0};

  function onJoyStart(ev){
    const t = ev.changedTouches ? ev.changedTouches[0] : ev;
    joyPointerId = t.identifier ?? "mouse";
    const rect = joystickEl.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width/2;
    joyCenter.y = rect.top + rect.height/2;
    input.joyActive = true;
    const dx = t.clientX - joyCenter.x;
    const dy = t.clientY - joyCenter.y;
    setKnob(dx, dy);
    ev.preventDefault?.();
  }
  function onJoyMove(ev){
    if (!input.joyActive) return;
    const touches = ev.changedTouches ? Array.from(ev.changedTouches) : [ev];
    const t = touches.find(tt => (tt.identifier ?? "mouse") === joyPointerId);
    if (!t) return;
    const dx = t.clientX - joyCenter.x;
    const dy = t.clientY - joyCenter.y;
    setKnob(dx, dy);
    ev.preventDefault?.();
  }
  function onJoyEnd(ev){
    if (!input.joyActive) return;
    input.joyActive = false;
    joyPointerId = null;
    resetKnob();
    ev.preventDefault?.();
  }

  joystickEl.addEventListener("touchstart", onJoyStart, { passive:false });
  joystickEl.addEventListener("touchmove", onJoyMove, { passive:false });
  joystickEl.addEventListener("touchend", onJoyEnd, { passive:false });
  joystickEl.addEventListener("touchcancel", onJoyEnd, { passive:false });

  // Desktop mouse (optional)
  joystickEl.addEventListener("mousedown", onJoyStart);
  window.addEventListener("mousemove", onJoyMove);
  window.addEventListener("mouseup", onJoyEnd);

  // ---------- Buttons ----------
  btnEntrance.addEventListener("click", () => {
    // Move player near center entrance
    player.x = world.mapW * 0.52;
    player.y = world.mapH * 0.62;
    addMsg("system", "入口に戻りました。ゲート（緑）へ近づいてください。");
  });
  btnWorld.addEventListener("click", () => {
    closeAreaModal();
    addMsg("system", "ワールド表示です。");
  });
  btnReset.addEventListener("click", () => {
    initWorld();
    addMsg("system", "リセットしました。");
  });
  btnTalk.addEventListener("click", () => {
    if (!nearAi){
      addMsg("system", "AIに近づくと話せます（紫のポイント付近）。");
      return;
    }
    addMsg("ai", `こんにちは。${nearAi.label}です。ご用件をどうぞ。`);
  });

  enterBtn.addEventListener("click", () => {
    if (!nearGate) return;
    openAreaModal(nearGate.area);
  });

  // Chat send
  function sendChat(){
    const t = chatText.value.trim();
    if (!t) return;
    chatText.value = "";
    addMsg("user", t);
    const r = dummyAIReply(t);
    setTimeout(() => addMsg("ai", r), 220);
  }
  chatSend.addEventListener("click", sendChat);
  chatText.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });

  // Modal actions
  areaClose.addEventListener("click", closeAreaModal);
  areaBack.addEventListener("click", closeAreaModal);
  areaTalk.addEventListener("click", () => {
    addMsg("ai", `【${currentArea}】いらっしゃいませ。ご相談内容を入力してください。`);
    closeAreaModal();
  });
  areaModal.addEventListener("click", (e) => {
    if (e.target === areaModal) closeAreaModal();
  });

  // ---------- Area modal ----------
  function openAreaModal(area){
    inModal = true;
    currentArea = area.name;
    pillArea.textContent = `Area: ${area.name}`;
    statusArea.textContent = area.name;

    areaTitle.textContent = area.name;
    areaDesc.textContent = area.desc;
    areaBadge.textContent = area.badge;
    areaAiName.textContent = area.ai.label;
    areaAiLine.textContent = "いらっしゃいませ。ご用件をどうぞ。";

    // Slightly theme the badge with area colors
    areaBadge.style.borderColor = "rgba(255,255,255,0.18)";
    areaBadge.style.background = "rgba(0,0,0,0.30)";

    areaModal.classList.add("show");
    areaModal.setAttribute("aria-hidden", "false");
  }

  function closeAreaModal(){
    inModal = false;
    areaModal.classList.remove("show");
    areaModal.setAttribute("aria-hidden", "true");
    currentArea = "World (Select)";
    pillArea.textContent = "Area: World (Select)";
    statusArea.textContent = "World (Select)";
  }

  // ---------- Simulation loop ----------
  let last = performance.now();

  function tick(now){
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    update(dt);
    draw();

    requestAnimationFrame(tick);
  }

  function update(dt){
    // Movement from keyboard + joystick
    let ax = 0, ay = 0;

    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;

    // joystick overrides additively
    ax += input.joyX;
    ay += input.joyY;

    const len = Math.hypot(ax, ay);
    if (len > 1e-6){
      ax /= len;
      ay /= len;
    }

    player.vx = ax * player.speed;
    player.vy = ay * player.speed;

    player.x = clamp(player.x + player.vx * dt, 0, world.mapW);
    player.y = clamp(player.y + player.vy * dt, 0, world.mapH);

    // Camera follow
    world.cameraX = clamp(player.x - W/2, 0, world.mapW - W);
    world.cameraY = clamp(player.y - H/2, 0, world.mapH - H);

    // particles drift
    for (const p of particles){
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0) p.x += world.mapW;
      if (p.x > world.mapW) p.x -= world.mapW;
      if (p.y < 0) p.y += world.mapH;
      if (p.y > world.mapH) p.y -= world.mapH;
    }

    // Near gate / AI detection
    nearGate = null;
    nearAi = null;

    for (const a of AREAS){
      const dg = dist(player.x, player.y, a.gate.x, a.gate.y);
      if (dg < a.gate.r + 42){
        nearGate = { area: a, d: dg };
      }
      const da = dist(player.x, player.y, a.ai.x, a.ai.y);
      if (da < a.ai.r + 56){
        nearAi = a.ai;
      }
    }

    // UI state
    updateUIState();
  }

  function updateUIState(){
    const canEnter = !!nearGate && nearGate.d < (nearGate.area.gate.r + 34);
    enterBtn.disabled = !canEnter;
    statusEnter.textContent = canEnter ? "Yes" : "No";

    if (nearGate){
      pillHint.textContent = canEnter
        ? `入場可能：${nearGate.area.name}（ボタン有効）`
        : `近づくと入れます：${nearGate.area.name}`;
    } else {
      pillHint.textContent = "ゲートに近づくと入れます（ネオン/霧）";
    }

    btnTalk.disabled = !nearAi;
    statusNpc.textContent = nearAi ? nearAi.label : "なし";
  }

  // ---------- Draw ----------
  function draw(){
    // Background gradient + skyline illusion
    drawBackground();

    // Map grid / roads
    drawGridAndRoads();

    // Buildings
    drawBuildings();

    // Gates & AI markers
    drawGatesAndNPCs();

    // Player
    drawPlayer();

    // Particles / fog
    drawParticles();

    // Minimap
    drawMinimap();
  }

  function worldToScreen(x, y){
    return {
      x: x - world.cameraX,
      y: y - world.cameraY
    };
  }

  function drawBackground(){
    ctx.clearRect(0,0,W,H);

    // Base
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, "rgba(10,18,48,0.95)");
    g.addColorStop(1, "rgba(6,11,24,0.98)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // Distant neon fog
    const fog1 = ctx.createRadialGradient(W*0.25, H*0.2, 10, W*0.25, H*0.2, 520);
    fog1.addColorStop(0, "rgba(99,212,255,0.18)");
    fog1.addColorStop(1, "rgba(99,212,255,0.00)");
    ctx.fillStyle = fog1;
    ctx.fillRect(0,0,W,H);

    const fog2 = ctx.createRadialGradient(W*0.78, H*0.25, 10, W*0.78, H*0.25, 560);
    fog2.addColorStop(0, "rgba(176,108,255,0.20)");
    fog2.addColorStop(1, "rgba(176,108,255,0.00)");
    ctx.fillStyle = fog2;
    ctx.fillRect(0,0,W,H);

    // Subtle stars
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "white";
    for (let i=0;i<60;i++){
      const x = (i*97 % W);
      const y = (i*53 % (H*0.6));
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawGridAndRoads(){
    // Neon grid overlay
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    const step = 48;
    const startX = - (world.cameraX % step);
    const startY = - (world.cameraY % step);

    for (let x = startX; x < W; x += step){
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,H);
      ctx.stroke();
    }
    for (let y = startY; y < H; y += step){
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.lineTo(W,y);
      ctx.stroke();
    }
    ctx.restore();

    // Roads (wider lines)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(99,212,255,0.18)";
    ctx.lineWidth = 18;

    // draw some long "avenues" in world coords
    const avenues = [
      { x1: world.mapW*0.15, y1: world.mapH*0.52, x2: world.mapW*0.92, y2: world.mapH*0.52 },
      { x1: world.mapW*0.48, y1: world.mapH*0.12, x2: world.mapW*0.48, y2: world.mapH*0.92 },
      { x1: world.mapW*0.20, y1: world.mapH*0.26, x2: world.mapW*0.86, y2: world.mapH*0.80 },
    ];

    for (const a of avenues){
      const p1 = worldToScreen(a.x1, a.y1);
      const p2 = worldToScreen(a.x2, a.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Road center thin line
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    for (const a of avenues){
      const p1 = worldToScreen(a.x1, a.y1);
      const p2 = worldToScreen(a.x2, a.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBuildings(){
    for (const b of buildings){
      const p = worldToScreen(b.x, b.y);
      if (p.x + b.w < -100 || p.y + b.h < -100 || p.x > W+100 || p.y > H+100) continue;

      // Body
      const grd = ctx.createLinearGradient(p.x, p.y, p.x+b.w, p.y+b.h);
      grd.addColorStop(0, "rgba(255,255,255,0.06)");
      grd.addColorStop(1, "rgba(255,255,255,0.02)");
      ctx.fillStyle = grd;
      ctx.fillRect(p.x, p.y, b.w, b.h);

      // Edge
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x+0.5, p.y+0.5, b.w-1, b.h-1);

      // Windows shimmer
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(99,212,255,0.22)";
      for (let i=0;i<8;i++){
        const wx = p.x + 10 + (i*17 % (b.w-20));
        const wy = p.y + 10 + (i*31 % (b.h-20));
        ctx.fillRect(wx, wy, 6, 10);
      }
      ctx.globalAlpha = 1;
    }

    // Neon signs
    for (const s of signs){
      const p = worldToScreen(s.x, s.y);
      if (p.x + s.w < -80 || p.y + s.h < -80 || p.x > W+80 || p.y > H+80) continue;

      const gg = ctx.createLinearGradient(p.x, p.y, p.x+s.w, p.y+s.h);
      gg.addColorStop(0, s.c1);
      gg.addColorStop(1, s.c2);

      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = gg;
      roundRect(ctx, p.x, p.y, s.w, s.h, 6);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.shadowColor = s.c1;
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGatesAndNPCs(){
    // Gates
    for (const a of AREAS){
      const g = a.gate;
      const p = worldToScreen(g.x, g.y);

      // outer glow ring
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(53,255,181,0.75)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(53,255,181,0.85)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(p.x, p.y, g.r, 0, Math.PI*2);
      ctx.stroke();

      // inner ring
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(99,212,255,0.65)";
      ctx.shadowColor = "rgba(99,212,255,0.75)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(p.x, p.y, g.r-8, 0, Math.PI*2);
      ctx.stroke();

      // label
      ctx.globalAlpha = 0.85;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px system-ui";
      ctx.fillText(a.name, p.x - g.r, p.y - g.r - 10);
      ctx.restore();
    }

    // AI markers
    for (const a of AREAS){
      const ai = a.ai;
      const p = worldToScreen(ai.x, ai.y);

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(176,108,255,0.75)";
      ctx.shadowColor = "rgba(176,108,255,0.85)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ai.r, 0, Math.PI*2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "12px system-ui";
      ctx.fillText(ai.label, p.x - ai.r, p.y + ai.r + 16);
      ctx.restore();
    }
  }

  function drawPlayer(){
    const p = worldToScreen(player.x, player.y);

    // glow
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(99,212,255,0.85)";
    ctx.shadowColor = "rgba(99,212,255,0.95)";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(p.x, p.y, player.r, 0, Math.PI*2);
    ctx.fill();

    // core
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, player.r*0.45, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles(){
    ctx.save();
    for (const par of particles){
      const p = worldToScreen(par.x, par.y);
      if (p.x < -40 || p.y < -40 || p.x > W+40 || p.y > H+40) continue;

      const col = par.tint === "a" ? "rgba(99,212,255," : "rgba(176,108,255,";
      ctx.fillStyle = `${col}${par.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, par.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMinimap(){
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;

    mctx.clearRect(0,0,mw,mh);

    // background
    const g = mctx.createLinearGradient(0,0,0,mh);
    g.addColorStop(0, "rgba(10,18,48,0.95)");
    g.addColorStop(1, "rgba(6,11,24,0.98)");
    mctx.fillStyle = g;
    mctx.fillRect(0,0,mw,mh);

    // small grid
    mctx.globalAlpha = 0.18;
    mctx.strokeStyle = "rgba(255,255,255,0.18)";
    mctx.lineWidth = 1;
    for (let x=0;x<mw;x+=22){
      mctx.beginPath(); mctx.moveTo(x,0); mctx.lineTo(x,mh); mctx.stroke();
    }
    for (let y=0;y<mh;y+=22){
      mctx.beginPath(); mctx.moveTo(0,y); mctx.lineTo(mw,y); mctx.stroke();
    }
    mctx.globalAlpha = 1;

    // draw gates and ai
    function mapX(x){ return (x / world.mapW) * mw; }
    function mapY(y){ return (y / world.mapH) * mh; }

    // gates
    for (const a of AREAS){
      mctx.fillStyle = "rgba(53,255,181,0.85)";
      mctx.beginPath();
      mctx.arc(mapX(a.gate.x), mapY(a.gate.y), 4.2, 0, Math.PI*2);
      mctx.fill();

      mctx.fillStyle = "rgba(176,108,255,0.80)";
      mctx.beginPath();
      mctx.arc(mapX(a.ai.x), mapY(a.ai.y), 3.6, 0, Math.PI*2);
      mctx.fill();
    }

    // player
    mctx.fillStyle = "rgba(99,212,255,0.95)";
    mctx.beginPath();
    mctx.arc(mapX(player.x), mapY(player.y), 4.6, 0, Math.PI*2);
    mctx.fill();
  }

  function roundRect(c, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+rr, y);
    c.arcTo(x+w, y, x+w, y+h, rr);
    c.arcTo(x+w, y+h, x, y+h, rr);
    c.arcTo(x, y+h, x, y, rr);
    c.arcTo(x, y, x+w, y, rr);
    c.closePath();
  }

  // ---------- Tap on world to talk (mobile friendly) ----------
  worldCanvas.addEventListener("click", () => {
    if (nearAi){
      addMsg("ai", `（近接）${nearAi.label}です。どうされましたか？`);
    }
  });

  // ---------- Start ----------
  initWorld();
  requestAnimationFrame(tick);

})();
