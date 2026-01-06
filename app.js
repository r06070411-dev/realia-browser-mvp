(() => {
  // ====== DOM ======
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");

  const areaPill = document.getElementById("areaPill");
  const hintPill = document.getElementById("hintPill");

  const btnEntrance = document.getElementById("btnEntrance");
  const btnWorld = document.getElementById("btnWorld");
  const btnReset = document.getElementById("btnReset");
  const btnTalk = document.getElementById("btnTalk");
  const btnEnterArea = document.getElementById("btnEnterArea");

  const areaList = document.getElementById("areaList");

  const chatLog = document.getElementById("chatLog");
  const chatInput = document.getElementById("chatInput");
  const chatSend = document.getElementById("chatSend");
  const npcInfo = document.getElementById("npcInfo");

  const stick = document.getElementById("stick");
  const stickKnob = stick.querySelector(".stickKnob");

  // ====== State ======
  const AREAS = [
    { key: "fashion", name: "Fashion District", desc: "ファッション・アパレルの街", npc: { name: "AI店員（Fashion）", role: "アパレル接客" } },
    { key: "reform",  name: "Reform Street",   desc: "リフォーム・建築の街",     npc: { name: "AI職人（Reform）", role: "塗装/リフォーム相談" } },
    { key: "food",    name: "Food Street",     desc: "飲食・フードの街",           npc: { name: "AI店長（Food）", role: "飲食案内" } },
  ];

  const state = {
    screen: "entrance", // entrance | world | area
    currentAreaKey: null,
    nearbyNpc: null,
    keys: new Set(),
    // Player physics
    player: { x: 140, y: 260, r: 14, vx: 0, vy: 0, speed: 190 },
    // Touch stick
    stickActive: false,
    stickVec: { x: 0, y: 0 },
  };

  // ====== Helpers ======
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function isMobileLike() {
    return window.matchMedia("(pointer: coarse)").matches || /iPhone|Android/i.test(navigator.userAgent);
  }

  function setScreen(next) {
    state.screen = next;
    // ボタン状態
    btnEnterArea.disabled = (state.screen !== "world") || !state.currentAreaKey;
    // 会話関連
    state.nearbyNpc = null;
    btnTalk.disabled = true;
    hintPill.textContent = "近づいて「話す」";
    renderStatus();
  }

  function setArea(key) {
    state.currentAreaKey = key;
    btnEnterArea.disabled = (state.screen !== "world") || !state.currentAreaKey;
    renderAreas();
    renderStatus();
  }

  function enterSelectedArea() {
    if (!state.currentAreaKey) return;
    setScreen("area");
    pushSystem(`【${getArea().name}】に入りました。AI店員に近づくと話せます。`);
  }

  function getArea() {
    return AREAS.find(a => a.key === state.currentAreaKey) || null;
  }

  function pushMessage(text, from = "ai") {
    const row = document.createElement("div");
    row.className = "msg " + (from === "me" ? "me" : "");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function pushSystem(text) {
    const row = document.createElement("div");
    row.className = "msg";
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = text;
    row.appendChild(badge);
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function aiReply(userText) {
    // まずはダミーAI：エリアごとに返答を変える
    const area = getArea();
    const npc = state.nearbyNpc;

    const base = area ? area.key : "none";
    const name = npc ? npc.name : "AI";
    let reply = `（${name}）すみません、いまは簡易版です。質問「${userText}」を受け取りました。`;

    if (base === "fashion") {
      reply += `\nおすすめ：新作/セール/サイズ相談ができます。`;
    } else if (base === "reform") {
      reply += `\n塗装なら「地域・坪数・希望色・予算」を教えてください。概算を出せます。`;
    } else if (base === "food") {
      reply += `\n混雑状況/おすすめ/予約案内ができます。`;
    } else {
      reply += `\nまずはワールドへ入ってエリアを選んでください。`;
    }

    return reply;
  }

  // ====== UI Render ======
  function renderStatus() {
    if (state.screen === "entrance") {
      areaPill.textContent = `Area: Entrance`;
    } else if (state.screen === "world") {
      areaPill.textContent = `Area: World (Select)`;
    } else {
      const a = getArea();
      areaPill.textContent = `Area: ${a ? a.name : "Unknown"}`;
    }

    if (state.nearbyNpc) {
      hintPill.textContent = `近くに ${state.nearbyNpc.name}（話すOK）`;
      hintPill.classList.remove("muted");
    } else {
      hintPill.classList.add("muted");
    }
  }

  function renderAreas() {
    areaList.innerHTML = "";
    AREAS.forEach(a => {
      const wrap = document.createElement("div");
      wrap.className = "areaItem";
      const row = document.createElement("div");
      row.className = "row";

      const left = document.createElement("div");
      left.innerHTML = `<div class="name">${a.name}</div>`;
      const right = document.createElement("button");
      right.className = "btn";
      right.textContent = (state.currentAreaKey === a.key) ? "選択中" : "選ぶ";
      right.disabled = (state.currentAreaKey === a.key);
      right.addEventListener("click", () => setArea(a.key));

      row.appendChild(left);
      row.appendChild(right);

      const desc = document.createElement("div");
      desc.className = "desc";
      desc.textContent = a.desc;

      wrap.appendChild(row);
      wrap.appendChild(desc);
      areaList.appendChild(wrap);
    });
  }

  // ====== World Data ======
  const world = {
    w: canvas.width,
    h: canvas.height,
    // NPC / POI positions in "area" screen
    npcs: [
      { id: "npc1", x: 520, y: 210, r: 18, name: "AI店員",  color: "rgba(90,167,255,.9)" },
      { id: "npc2", x: 660, y: 320, r: 18, name: "AI案内",  color: "rgba(124,92,255,.9)" },
    ],
    // In "world" screen: gates to areas
    gates: [
      { key: "fashion", x: 340, y: 220, w: 220, h: 90 },
      { key: "reform",  x: 340, y: 330, w: 220, h: 90 },
      { key: "food",    x: 340, y: 440, w: 220, h: 90 },
    ],
  };

  function resetPlayer() {
    state.player.x = 140;
    state.player.y = 260;
    state.player.vx = 0;
    state.player.vy = 0;
  }

  // ====== Input (Keyboard) ======
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," "].includes(k)) {
      // spaceでページスクロールしないように
      e.preventDefault();
    }
    state.keys.add(k);
    if (k === " " || k === "enter") {
      // 近くなら話す
      if (!btnTalk.disabled) talkToNpc();
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    state.keys.delete(e.key.toLowerCase());
  });

  // ====== Input (Touch Stick) ======
  function setupStick() {
    if (!isMobileLike()) {
      stick.style.display = "none";
      return;
    }
    stick.style.display = "block";

    let baseRect = null;
    let origin = { x: 0, y: 0 };

    function setKnob(dx, dy) {
      const max = 46;
      const len = Math.hypot(dx, dy);
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      stickKnob.style.transform = `translate(${nx}px, ${ny}px)`;
      // -1..1
      state.stickVec.x = clamp(nx / max, -1, 1);
      state.stickVec.y = clamp(ny / max, -1, 1);
    }

    function onDown(ev) {
      state.stickActive = true;
      baseRect = stick.getBoundingClientRect();
      const t = ev.touches ? ev.touches[0] : ev;
      origin.x = baseRect.left + baseRect.width / 2;
      origin.y = baseRect.top + baseRect.height / 2;
      onMove(ev);
    }
    function onMove(ev) {
      if (!state.stickActive) return;
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = t.clientX - origin.x;
      const dy = t.clientY - origin.y;
      setKnob(dx, dy);
      ev.preventDefault();
    }
    function onUp() {
      state.stickActive = false;
      state.stickVec.x = 0;
      state.stickVec.y = 0;
      stickKnob.style.transform = `translate(0px, 0px)`;
    }

    stick.addEventListener("touchstart", onDown, { passive: false });
    stick.addEventListener("touchmove", onMove, { passive: false });
    stick.addEventListener("touchend", onUp, { passive: true });
    stick.addEventListener("touchcancel", onUp, { passive: true });
  }

  // ====== Buttons ======
  btnEntrance.addEventListener("click", () => setScreen("entrance"));
  btnWorld.addEventListener("click", () => setScreen("world"));
  btnReset.addEventListener("click", () => { resetPlayer(); pushSystem("プレイヤー位置をリセットしました"); });

  btnEnterArea.addEventListener("click", () => enterSelectedArea());

  btnTalk.addEventListener("click", () => talkToNpc());

  chatSend.addEventListener("click", () => {
    const t = chatInput.value.trim();
    if (!t) return;
    pushMessage(t, "me");
    chatInput.value = "";
    pushMessage(aiReply(t), "ai");
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      chatSend.click();
    }
  });

  function talkToNpc() {
    if (!state.nearbyNpc) return;
    npcInfo.textContent = `相手：${state.nearbyNpc.name}（${state.nearbyNpc.role}）`;
    pushSystem(`「${state.nearbyNpc.name}」に話しかけました。質問を入力してください。`);
    chatInput.focus();
  }

  // ====== Game Loop ======
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(tick);
  }

  function update(dt) {
    // movement input
    let ix = 0, iy = 0;
    if (state.keys.has("arrowleft") || state.keys.has("a")) ix -= 1;
    if (state.keys.has("arrowright") || state.keys.has("d")) ix += 1;
    if (state.keys.has("arrowup") || state.keys.has("w")) iy -= 1;
    if (state.keys.has("arrowdown") || state.keys.has("s")) iy += 1;

    // touch stick adds
    ix += state.stickVec.x;
    iy += state.stickVec.y;

    // normalize
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    const sp = state.player.speed;
    state.player.vx = ix * sp;
    state.player.vy = iy * sp;

    state.player.x += state.player.vx * dt;
    state.player.y += state.player.vy * dt;

    // bounds
    state.player.x = clamp(state.player.x, state.player.r + 8, world.w - state.player.r - 8);
    state.player.y = clamp(state.player.y, state.player.r + 8, world.h - state.player.r - 8);

    // Proximity logic
    state.nearbyNpc = null;

    if (state.screen === "world") {
      // near a gate -> enable enter
      let nearKey = null;
      for (const g of world.gates) {
        const cx = clamp(state.player.x, g.x, g.x + g.w);
        const cy = clamp(state.player.y, g.y, g.y + g.h);
        const d = Math.hypot(state.player.x - cx, state.player.y - cy);
        if (d < 26) { nearKey = g.key; break; }
      }
      if (nearKey) {
        setArea(nearKey);
        btnEnterArea.disabled = false;
        hintPill.textContent = `「このエリアに入る」を押せます`;
      } else {
        btnEnterArea.disabled = true;
        hintPill.textContent = `ゲートに近づくと入れます`;
      }
    }

    if (state.screen === "area") {
      // near NPC -> enable talk
      const a = getArea();
      const npc = a ? a.npc : null;
      if (npc) {
        // pick nearest point (use npc1 as main in each area)
        const target = world.npcs[0];
        const d = dist(state.player, target);
        if (d < 46) {
          state.nearbyNpc = npc;
          btnTalk.disabled = false;
        } else {
          btnTalk.disabled = true;
        }
      }
    } else {
      btnTalk.disabled = true;
    }

    renderStatus();
  }

  function draw() {
    // background grid
    ctx.clearRect(0, 0, world.w, world.h);

    // subtle gradient
    const grad = ctx.createLinearGradient(0, 0, 0, world.h);
    grad.addColorStop(0, "rgba(255,255,255,.06)");
    grad.addColorStop(1, "rgba(255,255,255,.02)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, world.w, world.h);

    // grid
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    for (let x = 0; x <= world.w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.h); ctx.stroke();
    }
    for (let y = 0; y <= world.h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.w, y); ctx.stroke();
    }
    ctx.restore();

    if (state.screen === "entrance") {
      drawCenterCard("入口", "「ワールド」を押して入場 → ゲートに近づいてエリア選択");
    } else if (state.screen === "world") {
      drawWorldGates();
      drawPlayer();
    } else {
      drawAreaScene();
      drawPlayer();
    }
  }

  function drawCenterCard(title, sub) {
    const w = 560, h = 150;
    const x = (world.w - w) / 2;
    const y = (world.h - h) / 2;

    roundRect(x, y, w, h, 16, "rgba(0,0,0,.22)", "rgba(255,255,255,.12)");
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "700 24px system-ui, -apple-system, sans-serif";
    ctx.fillText(title, x + 22, y + 54);
    ctx.fillStyle = "rgba(255,255,255,.70)";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText(sub, x + 22, y + 86);
  }

  function drawWorldGates() {
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "800 22px system-ui, -apple-system, sans-serif";
    ctx.fillText("オープンワールド", 22, 44);
    ctx.fillStyle = "rgba(255,255,255,.70)";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("ゲートに近づくと「このエリアに入る」が有効になります", 22, 70);

    world.gates.forEach((g) => {
      const a = AREAS.find(x => x.key === g.key);
      const selected = (state.currentAreaKey === g.key);
      roundRect(
        g.x, g.y, g.w, g.h, 16,
        selected ? "rgba(90,167,255,.18)" : "rgba(255,255,255,.06)",
        selected ? "rgba(90,167,255,.35)" : "rgba(255,255,255,.12)"
      );
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.font = "800 18px system-ui, -apple-system, sans-serif";
      ctx.fillText(a.name, g.x + 16, g.y + 36);
      ctx.fillStyle = "rgba(255,255,255,.70)";
      ctx.font = "500 13px system-ui, -apple-system, sans-serif";
      ctx.fillText(a.desc, g.x + 16, g.y + 60);
    });
  }

  function drawAreaScene() {
    const a = getArea();
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "800 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(a ? a.name : "Area", 22, 44);
    ctx.fillStyle = "rgba(255,255,255,.70)";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("NPCに近づいて「話す」→ 右側のAI接客で会話", 22, 70);

    // NPC draw
    const npc = world.npcs[0];
    drawNpc(npc.x, npc.y, npc.r, "AI", npc.color);

    // Some props
    roundRect(430, 260, 260, 160, 18, "rgba(255,255,255,.05)", "rgba(255,255,255,.10)");
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "600 13px system-ui";
    ctx.fillText("ホログラム広告（仮）", 448, 286);
  }

  function drawNpc(x, y, r, label, color) {
    // glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.arc(x, y + r + 10, r * 0.9, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "800 12px system-ui";
    ctx.fillText(label, x - 10, y + 4);
    ctx.fillStyle = "rgba(255,255,255,.70)";
    ctx.font = "500 12px system-ui";
    ctx.fillText("AI", x - 8, y - 22);
  }

  function drawPlayer() {
    const p = state.player;

    // body
    ctx.save();
    ctx.shadowColor = "rgba(90,167,255,.85)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(90,167,255,.92)";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // face
    ctx.fillStyle = "rgba(7,11,22,.6)";
    ctx.beginPath(); ctx.arc(p.x - 5, p.y - 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 5, p.y - 2, 2, 0, Math.PI * 2); ctx.fill();

    // name
    ctx.fillStyle = "rgba(255,255,255,.80)";
    ctx.font = "700 12px system-ui";
    ctx.fillText("YOU", p.x - 14, p.y - 22);
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  // ====== Init ======
  function init() {
    renderAreas();
    setupStick();

    // 初期メッセージ
    pushSystem("起動しました。まず「ワールド」へ → ゲートに近づいてエリア選択 → 「このエリアに入る」");
    setScreen("entrance");
    setArea("fashion"); // 初期選択
    resetPlayer();

    // 画面切替でプレイヤー位置を調整（わかりやすい）
    const originalSetScreen = setScreen;
    // wrap: (JSの都合上ここで上書き)
    window.__setScreen = (next) => {
      originalSetScreen(next);
      if (next === "world") resetPlayer();
      if (next === "area") {
        // area入場時はNPC近くに移動しないように少し離して配置
        state.player.x = 180;
        state.player.y = 320;
      }
    };

    btnWorld.addEventListener("click", () => window.__setScreen("world"));
    btnEntrance.addEventListener("click", () => window.__setScreen("entrance"));

    // エリアに入ったら screen を area に
    btnEnterArea.addEventListener("click", () => window.__setScreen("area"));

    // 右側のエリア選択→ワールド画面ならゲート選択と同義
    // （すでに setArea は効くのでOK）

    requestAnimationFrame(tick);
  }

  init();
})();
