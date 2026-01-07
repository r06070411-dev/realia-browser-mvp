import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas = document.getElementById("worldCanvas");

  const minimapCanvas = document.getElementById("minimapCanvas");
  const mctx = minimapCanvas.getContext("2d");

  const pillArea = document.getElementById("pillArea");
  const pillHint = document.getElementById("pillHint");
  const enterBtn = document.getElementById("enterBtn");

  const btnReset = document.getElementById("btnReset");
  const btnTeleport1 = document.getElementById("btnTeleport1");
  const btnTeleport2 = document.getElementById("btnTeleport2");
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

  // ---------- Utils ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function addMsg(role, text) {
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

  function dummyAIReply(userText) {
    const t = userText.trim();
    if (!t) return "ご用件を入力してください。";
    if (t.includes("100") || t.includes("万円") || t.includes("予算")) {
      return "予算感を確認しました。場所（都道府県/市区町村）と希望内容（外壁/屋根/両方、面積）を教えてください。条件に合う候補を絞り込みます。";
    }
    if (t.includes("外壁") || t.includes("塗装")) {
      return "外壁塗装ですね。築年数と現状（ひび割れ・チョーキング）を教えてください。最適な塗料と施工手順を提案します。";
    }
    if (t.includes("予約") || t.includes("混雑")) {
      return "予約と混雑案内ですね。希望日時と人数、エリアを教えてください。空き候補を提案します。";
    }
    return "承知しました。目的（買い物/相談/予約）と希望条件（場所・予算・期限）を教えてください。最短で候補を提案します。";
  }

  // ---------- 3D Scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060b18, 0.035);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.set(0, 3.2, 6.5);

  // Lights
  const hemi = new THREE.HemisphereLight(0x9bbcff, 0x0b1020, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(6, 10, 4);
  scene.add(dir);

  const neonLightA = new THREE.PointLight(0x63d4ff, 1.4, 40, 2);
  neonLightA.position.set(-10, 3, -6);
  scene.add(neonLightA);

  const neonLightB = new THREE.PointLight(0xb06cff, 1.2, 40, 2);
  neonLightB.position.set(10, 3, 8);
  scene.add(neonLightB);

  // Ground (procedural texture)
  function makeGroundTexture() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d");

    g.fillStyle = "#0b1020";
    g.fillRect(0,0,256,256);

    // asphalt-ish noise
    for (let i=0;i<12000;i++){
      const x = Math.random()*256;
      const y = Math.random()*256;
      const v = 20 + Math.random()*30;
      g.fillStyle = `rgba(${v},${v+5},${v+15},0.20)`;
      g.fillRect(x,y,1,1);
    }

    // subtle grid lines
    g.strokeStyle = "rgba(255,255,255,0.06)";
    for (let i=0;i<256;i+=32){
      g.beginPath(); g.moveTo(i,0); g.lineTo(i,256); g.stroke();
      g.beginPath(); g.moveTo(0,i); g.lineTo(256,i); g.stroke();
    }

    // neon stains
    const gradA = g.createRadialGradient(70,70,0, 70,70,90);
    gradA.addColorStop(0,"rgba(99,212,255,0.18)");
    gradA.addColorStop(1,"rgba(99,212,255,0)");
    g.fillStyle = gradA;
    g.fillRect(0,0,256,256);

    const gradB = g.createRadialGradient(180,150,0, 180,150,110);
    gradB.addColorStop(0,"rgba(176,108,255,0.16)");
    gradB.addColorStop(1,"rgba(176,108,255,0)");
    g.fillStyle = gradB;
    g.fillRect(0,0,256,256);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    return tex;
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80, 1, 1),
    new THREE.MeshStandardMaterial({
      map: makeGroundTexture(),
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.y = 0;
  scene.add(ground);

  // Sky gradient dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0a1230, side: THREE.BackSide })
  );
  scene.add(sky);

  // City blocks (simple buildings + emissive signs)
  const buildings = new THREE.Group();
  scene.add(buildings);

  function addBuilding(x,z,w,d,h, hue=200){
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue/360, 0.35, 0.18),
      roughness: 0.85,
      metalness: 0.15,
      emissive: new THREE.Color().setHSL((hue+30)/360, 0.6, 0.06),
      emissiveIntensity: 0.6,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    mesh.position.set(x, h/2, z);
    buildings.add(mesh);

    // sign
    if (Math.random() < 0.45){
      const smat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.2,
        metalness: 0.6,
        emissive: new THREE.Color(Math.random()<0.5 ? 0x63d4ff : 0xb06cff),
        emissiveIntensity: 2.0,
      });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w*0.25, h*0.10, 0.12), smat);
      sign.position.set(x + (Math.random()*0.5-0.25)*w, h*0.65, z + d/2 + 0.08);
      buildings.add(sign);
    }
  }

  function buildCity(){
    buildings.clear();
    for (let i=0;i<120;i++){
      const x = (Math.random()*2-1)*34;
      const z = (Math.random()*2-1)*34;
      // keep center street open
      if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
      const w = 1.8 + Math.random()*4.2;
      const d = 1.8 + Math.random()*4.2;
      const h = 3 + Math.random()*10;
      addBuilding(x,z,w,d,h, 200 + Math.random()*90);
    }
  }
  buildCity();

  // Neon particles (simple points)
  const particleCount = 900;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i=0;i<particleCount;i++){
    const x = (Math.random()*2-1)*40;
    const y = 0.8 + Math.random()*8;
    const z = (Math.random()*2-1)*40;
    positions[i*3+0]=x;
    positions[i*3+1]=y;
    positions[i*3+2]=z;

    const c = new THREE.Color(Math.random()<0.5 ? 0x63d4ff : 0xb06cff);
    colors[i*3+0]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });

  const neonDust = new THREE.Points(pGeo, pMat);
  scene.add(neonDust);

  // ---------- Gates & AI markers ----------
  const AREAS = [
    {
      id: "fashion",
      name: "Fashion District",
      badge: "NEON FASHION",
      desc: "ファッション・アパレルの街。AIがショップ案内と接客をします。",
      gatePos: new THREE.Vector3(-14, 0, -6),
      aiPos: new THREE.Vector3(-10, 0, -2),
      aiLabel: "AI店員"
    },
    {
      id: "reform",
      name: "Reform Street",
      badge: "SMART REFORM",
      desc: "リフォーム・建築の街。見積もり相談や提案をAIが行います。",
      gatePos: new THREE.Vector3(12, 0, -10),
      aiPos: new THREE.Vector3(8, 0, -6),
      aiLabel: "AIコンシェルジュ"
    },
    {
      id: "food",
      name: "Food Street",
      badge: "FOOD & CITY",
      desc: "飲食・予約・混雑案内。AIが店探しを手伝います。",
      gatePos: new THREE.Vector3(6, 0, 14),
      aiPos: new THREE.Vector3(2, 0, 10),
      aiLabel: "AI案内"
    },
  ];

  const gateMeshes = [];
  const aiMeshes = [];

  function createGate(pos){
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.08, 16, 48),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x35ffb5,
        emissiveIntensity: 2.3,
        roughness: 0.15,
        metalness: 0.8
      })
    );
    ring.rotation.x = Math.PI/2;
    ring.position.copy(pos).add(new THREE.Vector3(0, 0.15, 0));
    scene.add(ring);

    const glow = new THREE.PointLight(0x35ffb5, 1.5, 10, 2);
    glow.position.copy(pos).add(new THREE.Vector3(0, 1.1, 0));
    scene.add(glow);

    return { ring, glow };
  }

  function createAiMarker(pos){
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 18, 18),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0xb06cff,
        emissiveIntensity: 2.2,
        roughness: 0.25,
        metalness: 0.7
      })
    );
    sphere.position.copy(pos).add(new THREE.Vector3(0, 0.55, 0));
    scene.add(sphere);

    const glow = new THREE.PointLight(0xb06cff, 1.2, 8, 2);
    glow.position.copy(pos).add(new THREE.Vector3(0, 1.0, 0));
    scene.add(glow);

    return { sphere, glow };
  }

  for (const a of AREAS){
    gateMeshes.push(createGate(a.gatePos));
    aiMeshes.push(createAiMarker(a.aiPos));
  }

  // ---------- Character (clothed + animation) ----------
  // Soldier.glb includes clothes + walk/run/idle animations (public examples model)
  const loader = new GLTFLoader();
  const char = {
    root: null,
    mixer: null,
    actions: {},
    current: null,
    velocity: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    speed: 3.2, // m/s
  };

  const PLAYER_START = new THREE.Vector3(0, 0, 0);

  let loadingShown = false;
  function showLoadingOnce(){
    if (loadingShown) return;
    loadingShown = true;
    addMsg("system", "3Dキャラを読み込み中です（最初だけ数秒かかることがあります）。");
  }

  showLoadingOnce();

  loader.load(
    "https://threejs.org/examples/models/gltf/Soldier.glb",
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(1.0);
      model.position.copy(PLAYER_START);
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = false;
        }
      });
      scene.add(model);

      const mixer = new THREE.AnimationMixer(model);
      const clips = gltf.animations;

      const actions = {};
      for (const clip of clips){
        actions[clip.name] = mixer.clipAction(clip);
      }

      // preferred clip names: "Idle", "Walk", "Run"
      function play(name){
        if (!actions[name]) return;
        if (char.current === actions[name]) return;
        if (char.current) char.current.fadeOut(0.18);
        actions[name].reset().fadeIn(0.18).play();
        char.current = actions[name];
      }

      // start idle
      play("Idle");

      char.root = model;
      char.mixer = mixer;
      char.actions = actions;
      char.play = play;

      addMsg("system", "読み込み完了。移動してゲートへ近づいてください。");
    },
    undefined,
    () => {
      addMsg("system", "3Dキャラの読み込みに失敗しました。通信状態を確認してください。");
    }
  );

  // ---------- Controls (WASD + joystick) ----------
  const keys = new Set();
  window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  const input = { joyActive:false, joyX:0, joyY:0, joyMax:44 };

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
    input.joyX = 0; input.joyY = 0;
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
    setKnob(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
    ev.preventDefault?.();
  }
  function onJoyMove(ev){
    if (!input.joyActive) return;
    const touches = ev.changedTouches ? Array.from(ev.changedTouches) : [ev];
    const t = touches.find(tt => (tt.identifier ?? "mouse") === joyPointerId);
    if (!t) return;
    setKnob(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
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
  joystickEl.addEventListener("mousedown", onJoyStart);
  window.addEventListener("mousemove", onJoyMove);
  window.addEventListener("mouseup", onJoyEnd);

  // ---------- UI buttons ----------
  btnReset.addEventListener("click", () => resetWorld());

  btnTeleport1.addEventListener("click", () => {
    if (!char.root) return addMsg("system","キャラ読み込み中です。");
    char.root.position.copy(AREAS[0].gatePos).add(new THREE.Vector3(0,0,2.4));
    addMsg("system","ゲート1付近へ移動しました。");
  });

  btnTeleport2.addEventListener("click", () => {
    if (!char.root) return addMsg("system","キャラ読み込み中です。");
    char.root.position.copy(AREAS[1].gatePos).add(new THREE.Vector3(0,0,2.4));
    addMsg("system","ゲート2付近へ移動しました。");
  });

  btnTalk.addEventListener("click", () => {
    if (!nearAi) return addMsg("system","AIに近づくと話せます（紫の発光）。");
    addMsg("ai", `こんにちは。${nearAi.aiLabel}です。ご用件をどうぞ。`);
  });

  enterBtn.addEventListener("click", () => {
    if (!nearGate) return;
    openAreaModal(nearGate);
  });

  // Chat
  function sendChat(){
    const t = chatText.value.trim();
    if (!t) return;
    chatText.value = "";
    addMsg("user", t);
    const r = dummyAIReply(t);
    setTimeout(() => addMsg("ai", r), 200);
  }
  chatSend.addEventListener("click", sendChat);
  chatText.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

  // Modal
  areaClose.addEventListener("click", closeAreaModal);
  areaBack.addEventListener("click", closeAreaModal);
  areaTalk.addEventListener("click", () => {
    addMsg("ai", `【${currentArea}】いらっしゃいませ。ご相談内容を入力してください。`);
    closeAreaModal();
  });
  areaModal.addEventListener("click", (e) => { if (e.target === areaModal) closeAreaModal(); });

  // ---------- World state ----------
  let currentArea = "World (Select)";
  let nearGate = null;
  let nearAi = null;
  let inModal = false;

  function resetWorld(){
    buildCity();
    if (char.root){
      char.root.position.copy(PLAYER_START);
      char.root.rotation.set(0,0,0);
      char.velocity.set(0,0,0);
      if (char.play) char.play("Idle");
    }
    addMsg("system","リセットしました。");
  }

  function openAreaModal(area){
    inModal = true;
    currentArea = area.name;
    pillArea.textContent = `Area: ${area.name}`;
    statusArea.textContent = area.name;

    areaTitle.textContent = area.name;
    areaDesc.textContent = area.desc;
    areaBadge.textContent = area.badge;
    areaAiName.textContent = area.aiLabel;
    areaAiLine.textContent = "いらっしゃいませ。ご用件をどうぞ。";

    areaModal.classList.add("show");
    areaModal.setAttribute("aria-hidden","false");
  }
  function closeAreaModal(){
    inModal = false;
    areaModal.classList.remove("show");
    areaModal.setAttribute("aria-hidden","true");
    currentArea = "World (Select)";
    pillArea.textContent = "Area: World (Select)";
    statusArea.textContent = "World (Select)";
  }

  // Tap canvas to talk if close
  canvas.addEventListener("click", () => {
    if (nearAi) addMsg("ai", `（近接）${nearAi.aiLabel}です。どうされましたか？`);
  });

  // ---------- Camera follow (third-person) ----------
  const cam = {
    offset: new THREE.Vector3(0, 2.9, 5.6), // behind and above
    lookAt: new THREE.Vector3(0, 1.4, 0),
    smooth: 0.10
  };

  // ---------- Animate ----------
  const clock = new THREE.Clock();

  function resize(){
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function updateMinimap(){
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    mctx.clearRect(0,0,mw,mh);

    // bg
    const g = mctx.createLinearGradient(0,0,0,mh);
    g.addColorStop(0, "rgba(10,18,48,0.95)");
    g.addColorStop(1, "rgba(6,11,24,0.98)");
    mctx.fillStyle = g;
    mctx.fillRect(0,0,mw,mh);

    // grid
    mctx.globalAlpha = 0.18;
    mctx.strokeStyle = "rgba(255,255,255,0.18)";
    for (let x=0;x<mw;x+=22){ mctx.beginPath(); mctx.moveTo(x,0); mctx.lineTo(x,mh); mctx.stroke(); }
    for (let y=0;y<mh;y+=22){ mctx.beginPath(); mctx.moveTo(0,y); mctx.lineTo(mw,y); mctx.stroke(); }
    mctx.globalAlpha = 1;

    // map coords (-40..40)
    const mapX = (x) => ((x + 40) / 80) * mw;
    const mapY = (z) => ((z + 40) / 80) * mh;

    // gates & AI
    for (const a of AREAS){
      mctx.fillStyle = "rgba(53,255,181,0.90)";
      mctx.beginPath(); mctx.arc(mapX(a.gatePos.x), mapY(a.gatePos.z), 4.2, 0, Math.PI*2); mctx.fill();

      mctx.fillStyle = "rgba(176,108,255,0.86)";
      mctx.beginPath(); mctx.arc(mapX(a.aiPos.x), mapY(a.aiPos.z), 3.6, 0, Math.PI*2); mctx.fill();
    }

    // player
    if (char.root){
      mctx.fillStyle = "rgba(99,212,255,0.95)";
      mctx.beginPath(); mctx.arc(mapX(char.root.position.x), mapY(char.root.position.z), 4.6, 0, Math.PI*2); mctx.fill();
    }
  }

  function updateUI(){
    const canEnter = !!nearGate && nearGate._dist < 2.0;
    enterBtn.disabled = !canEnter;
    statusEnter.textContent = canEnter ? "Yes" : "No";

    if (nearGate){
      pillHint.textContent = canEnter
        ? `入場可能：${nearGate.name}（ボタン有効）`
        : `近づくと入れます：${nearGate.name}`;
    } else {
      pillHint.textContent = "キャラを動かしてゲートへ（近づくと入場ボタン有効）";
    }

    btnTalk.disabled = !nearAi;
    statusNpc.textContent = nearAi ? nearAi.aiLabel : "なし";
  }

  function loop(){
    const dt = Math.min(0.033, clock.getDelta());

    // float particles
    const p = neonDust.geometry.attributes.position;
    for (let i=0;i<p.count;i++){
      const y = p.getY(i) + (Math.sin((i*13 + performance.now()*0.001)) * 0.002);
      p.setY(i, y);
    }
    p.needsUpdate = true;

    // animate gates
    for (const g of gateMeshes){
      g.ring.rotation.z += dt * 0.8;
      g.ring.material.emissiveIntensity = 2.0 + Math.sin(performance.now()*0.003)*0.5;
    }
    for (const a of aiMeshes){
      a.sphere.position.y = 0.55 + Math.sin(performance.now()*0.004)*0.06;
      a.sphere.material.emissiveIntensity = 2.0 + Math.sin(performance.now()*0.004)*0.4;
    }

    // movement
    if (char.root && !inModal){
      let ix = 0, iz = 0;

      if (keys.has("w") || keys.has("arrowup")) iz -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iz += 1;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;

      // joystick
      ix += input.joyX;
      iz += input.joyY;

      const len = Math.hypot(ix, iz);
      if (len > 1e-6){ ix/=len; iz/=len; }

      // camera-relative move (forward = camera direction on XZ)
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

      char.dir.copy(forward).multiplyScalar(iz).addScaledVector(right, ix);
      const moving = char.dir.lengthSq() > 1e-6;

      if (moving){
        char.dir.normalize();
        char.velocity.x = char.dir.x * char.speed;
        char.velocity.z = char.dir.z * char.speed;

        // face movement
        const targetRot = Math.atan2(char.dir.x, char.dir.z);
        char.root.rotation.y = lerp(char.root.rotation.y, targetRot, 0.18);

        // move
        char.root.position.x = clamp(char.root.position.x + char.velocity.x * dt, -38, 38);
        char.root.position.z = clamp(char.root.position.z + char.velocity.z * dt, -38, 38);

        // animation
        if (char.play) char.play("Walk");
      } else {
        char.velocity.set(0,0,0);
        if (char.play) char.play("Idle");
      }

      // Gate / AI proximity
      nearGate = null;
      nearAi = null;

      for (const a of AREAS){
        const dg = char.root.position.distanceTo(a.gatePos);
        if (dg < 4.0){
          nearGate = Object.assign({}, a, { _dist: dg });
        }
        const da = char.root.position.distanceTo(a.aiPos);
        if (da < 3.2){
          nearAi = a;
        }
      }

      updateUI();
    }

    // character mixer
    if (char.mixer) char.mixer.update(dt);

    // third-person camera follow
    if (char.root){
      const target = char.root.position.clone().add(cam.lookAt);
      const desired = char.root.position.clone();

      // offset is applied in character facing direction
      const back = new THREE.Vector3(0,0,1).applyQuaternion(char.root.quaternion).multiplyScalar(cam.offset.z);
      const up = new THREE.Vector3(0,1,0).multiplyScalar(cam.offset.y);
      const side = new THREE.Vector3(1,0,0).applyQuaternion(char.root.quaternion).multiplyScalar(cam.offset.x);

      desired.add(up).add(back).add(side);

      camera.position.lerp(desired, 0.10);
      camera.lookAt(target);
    }

    updateMinimap();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
  updateUI();
})();
