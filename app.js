// REALIA Complete Demo (No build / static)
// Two entrances (A/B) + multiple areas per entrance + simple open-world movement + dummy AI chat

const $ = (sel) => document.querySelector(sel);

const entranceSection = $("#entranceSection");
const worldSection = $("#worldSection");
const areaSection = $("#areaSection");

const uiAreaLabel = $("#uiAreaLabel");
const uiHint = $("#uiHint");

const enterA = $("#enterA");
const enterB = $("#enterB");

const playerEl = $("#player");
const gateEl = $("#gate");
const npcEl = $("#npc");

const gateName = $("#gateName");
const gateDesc = $("#gateDesc");

const btnPrev = $("#btnPrev");
const btnNext = $("#btnNext");
const enterAreaBtn = $("#enterAreaBtn");

const talkBtn = $("#talkBtn");
const chatLog = $("#chatLog");
const chatInput = $("#chatInput");
const sendBtn = $("#sendBtn");

const btnBackToEntrance = $("#btnBackToEntrance");
const btnReset = $("#btnReset");

const areaTitle = $("#areaTitle");
const areaDesc = $("#areaDesc");
const areaAvatarName = $("#areaAvatarName");
const areaAvatarHint = $("#areaAvatarHint");
const areaChatLog = $("#areaChatLog");
const areaChatInput = $("#areaChatInput");
const areaSendBtn = $("#areaSendBtn");
const btnReturnToWorld = $("#btnReturnToWorld");
const btnBackToEntrance2 = $("#btnBackToEntrance2");

// Mobile joystick
const joystick = $("#joystick");
const joyKnob = $("#joyKnob");

const PRESETS = {
  A: {
    key: "A",
    label: "Cyber Roppongi (A)",
    hint: "ワールドへ → ゲートに近づくと入れます（ネオン/霧）",
    bgMode: "cyber",
    npcName: "AI店員（ネオン街）",
    npcLine: "いらっしゃいませ。服・ガジェット・街の案内、どれにしますか？",
    areas: [
      { name: "Fashion District", desc: "ネオン商業区 / AI接客あり", gx: 0.62, gy: 0.42, nx: 0.38, ny: 0.64 },
      { name: "Reform Street", desc: "建築・リフォーム街 / 見積相談", gx: 0.78, gy: 0.62, nx: 0.52, ny: 0.30 },
      { name: "Food Street", desc: "飲食の街 / 予約・混雑案内", gx: 0.48, gy: 0.30, nx: 0.70, ny: 0.45 },
    ]
  },
  B: {
    key: "B",
    label: "Luxury Future (B)",
    hint: "ワールドへ → ゲートに近づくと入れます（高級近未来）",
    bgMode: "luxury",
    npcName: "AIコンシェルジュ（高級）",
    npcLine: "ようこそ。ショップ案内、予約、提案のいずれをご希望ですか？",
    areas: [
      { name: "Luxury Mall", desc: "高級モール / AIコンシェルジュ", gx: 0.66, gy: 0.40, nx: 0.42, ny: 0.62 },
      { name: "Residence Gallery", desc: "住まい相談 / VR内見", gx: 0.44, gy: 0.55, nx: 0.72, ny: 0.48 },
      { name: "Sky Lounge", desc: "展望・ラウンジ / イベント", gx: 0.80, gy: 0.70, nx: 0.58, ny: 0.28 },
    ]
  }
};

const state = {
  mode: "ENTRANCE", // ENTRANCE | WORLD | AREA
  presetKey: "A",
  areaIndex: 0,
  px: 0.20,
  py: 0.72,
  vx: 0,
  vy: 0,
  joyActive: false,
  joyVX: 0,
  joyVY: 0,
};

function setMode(mode){
  state.mode = mode;
  entranceSection.classList.toggle("hidden", mode !== "ENTRANCE");
  worldSection.classList.toggle("hidden", mode !== "WORLD");
  areaSection.classList.toggle("hidden", mode !== "AREA");
}

function currentPreset(){ return PRESETS[state.presetKey]; }
function currentArea(){ return currentPreset().areas[state.areaIndex]; }

function placeAt(el, x, y){
  el.style.left = (x * 100) + "%";
  el.style.top  = (y * 100) + "%";
}

function setAreaByIndex(i){
  const p = currentPreset();
  state.areaIndex = (i + p.areas.length) % p.areas.length;
  const a = currentArea();

  gateName.textContent = a.name;
  gateDesc.textContent = a.desc;

  placeAt(gateEl, a.gx, a.gy);
  placeAt(npcEl, a.nx, a.ny);
  uiHint.textContent = `${p.hint} / 現在のゲート：${a.name}`;

  render();
}

function applyPreset(key){
  state.presetKey = key;
  state.areaIndex = 0;
  state.px = 0.20;
  state.py = 0.72;

  const p = currentPreset();
  document.body.dataset.world = p.bgMode;

  uiAreaLabel.textContent = `Area: World (${p.label})`;
  uiHint.textContent = p.hint;

  setAreaByIndex(0);

  chatLog.innerHTML = "";
  logChat("SYSTEM", "起動しました。ワールドへ → ゲートに近づく → エリアに入る。");
  logChat("NPC", p.npcLine);

  setMode("WORLD");
  render();
}

function dist(x1,y1,x2,y2){
  const dx = x1-x2, dy = y1-y2;
  return Math.sqrt(dx*dx + dy*dy);
}

function render(){
  placeAt(playerEl, state.px, state.py);

  const a = currentArea();
  const dGate = dist(state.px, state.py, a.gx, a.gy);
  const dNpc  = dist(state.px, state.py, a.nx, a.ny);

  enterAreaBtn.disabled = !(dGate < 0.09);
  talkBtn.disabled = !(dNpc < 0.10);

  enterAreaBtn.textContent = enterAreaBtn.disabled
    ? "このエリアに入る（近づくと有効）"
    : `このエリアに入る：${a.name}`;

  talkBtn.textContent = talkBtn.disabled ? "話す（近くで有効）" : "話す（NPC）";
}

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

/* Movement loop */
let lastT = performance.now();
function tick(t){
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  if (state.mode === "WORLD"){
    let vx = state.vx, vy = state.vy;
    if (state.joyActive){ vx = state.joyVX; vy = state.joyVY; }

    const speed = 0.45;
    state.px = clamp(state.px + vx * speed * dt, 0.04, 0.96);
    state.py = clamp(state.py + vy * speed * dt, 0.06, 0.94);
    render();
  }
  requestAnimationFrame(tick);
}

/* Chat (world) */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function logChat(who, text){
  const div = document.createElement("div");
  div.innerHTML = `<b>${escapeHtml(who)}:</b> ${escapeHtml(text)}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
function logAreaChat(who, text){
  const div = document.createElement("div");
  div.innerHTML = `<b>${escapeHtml(who)}:</b> ${escapeHtml(text)}`;
  areaChatLog.appendChild(div);
  areaChatLog.scrollTop = areaChatLog.scrollHeight;
}
function dummyAIResponse(text){
  const lower = text.toLowerCase();
  if (lower.includes("100") || text.includes("100万") || text.includes("１００万")){
    return "100万円のご予算ですね。場所・坪数・劣化状況を教えていただければ、候補の業者と概算を提示できます。";
  }
  if (lower.includes("外壁") || lower.includes("塗装") || text.includes("リフォーム")){
    return "施工内容（外壁/屋根/付帯）と希望時期、予算感を教えてください。複数社比較できる形で提案します。";
  }
  if (lower.includes("店") || text.includes("店舗") || text.includes("ショップ")){
    return "このエリアの人気店舗を3件ピックアップできます。カテゴリ（服/飲食/リフォーム）を指定してください。";
  }
  return "了解です。目的（購入/相談/見学）と条件（予算/地域/希望）を教えてください。";
}

/* Area view */
function enterArea(){
  const a = currentArea();
  const p = currentPreset();

  uiAreaLabel.textContent = `Area: ${a.name}`;
  uiHint.textContent = "エリア内：AI接客（簡易）";

  areaTitle.textContent = a.name;
  areaDesc.textContent = a.desc;
  areaAvatarName.textContent = p.npcName;
  areaAvatarHint.textContent = "※ここはダミー応答です。後で本物のAIに差し替えます。";

  areaChatLog.innerHTML = "";
  logAreaChat("SYSTEM", `「${a.name}」へ入りました。質問してみてください。`);
  logAreaChat("AI", p.npcLine);

  setMode("AREA");
}
function returnToWorld(){
  const p = currentPreset();
  uiAreaLabel.textContent = `Area: World (${p.label})`;
  uiHint.textContent = p.hint;
  setMode("WORLD");
  render();
}

/* Events */
enterA.addEventListener("click", ()=> applyPreset("A"));
enterB.addEventListener("click", ()=> applyPreset("B"));

btnPrev.addEventListener("click", ()=> setAreaByIndex(state.areaIndex - 1));
btnNext.addEventListener("click", ()=> setAreaByIndex(state.areaIndex + 1));

enterAreaBtn.addEventListener("click", ()=> { if (!enterAreaBtn.disabled) enterArea(); });

talkBtn.addEventListener("click", ()=> { if (!talkBtn.disabled) logChat("NPC", currentPreset().npcLine); });

sendBtn.addEventListener("click", ()=>{
  const v = chatInput.value.trim();
  if (!v) return;
  chatInput.value = "";
  logChat("YOU", v);
  logChat("AI", dummyAIResponse(v));
});
chatInput.addEventListener("keydown", (e)=>{ if (e.key === "Enter") sendBtn.click(); });

btnBackToEntrance.addEventListener("click", ()=>{
  uiAreaLabel.textContent = "Area: Entrance";
  uiHint.textContent = "入口を選んでワールドへ";
  setMode("ENTRANCE");
});
btnBackToEntrance2.addEventListener("click", ()=>{
  uiAreaLabel.textContent = "Area: Entrance";
  uiHint.textContent = "入口を選んでワールドへ";
  setMode("ENTRANCE");
});

btnReset.addEventListener("click", ()=>{ state.px = 0.20; state.py = 0.72; render(); });

btnReturnToWorld.addEventListener("click", returnToWorld);

areaSendBtn.addEventListener("click", ()=>{
  const v = areaChatInput.value.trim();
  if (!v) return;
  areaChatInput.value = "";
  logAreaChat("YOU", v);
  logAreaChat("AI", dummyAIResponse(v));
});
areaChatInput.addEventListener("keydown", (e)=>{ if (e.key === "Enter") areaSendBtn.click(); });

/* Keyboard movement */
const keys = new Set();
window.addEventListener("keydown", (e)=>{
  const k = e.key.toLowerCase();
  if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)){
    keys.add(k);
    e.preventDefault();
    updateKeyVelocity();
  }
});
window.addEventListener("keyup", (e)=>{
  keys.delete(e.key.toLowerCase());
  updateKeyVelocity();
});
function updateKeyVelocity(){
  let vx = 0, vy = 0;
  if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
  if (keys.has("arrowright") || keys.has("d")) vx += 1;
  if (keys.has("arrowup") || keys.has("w")) vy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vy += 1;
  const len = Math.hypot(vx,vy) || 1;
  state.vx = vx/len;
  state.vy = vy/len;
}

/* Joystick (touch) */
let joyCenter = {x:0,y:0};
function setKnob(dx,dy){
  const max = 34;
  const len = Math.hypot(dx,dy);
  let nx=dx, ny=dy;
  if (len > max){ nx = dx/len*max; ny = dy/len*max; }
  joyKnob.style.transform = `translate(${nx}px, ${ny}px) translate(-50%,-50%)`;
  state.joyVX = nx / max;
  state.joyVY = ny / max;
}
function onJoyStart(e){
  state.joyActive = true;
  const rect = joystick.getBoundingClientRect();
  joyCenter.x = rect.left + rect.width/2;
  joyCenter.y = rect.top + rect.height/2;
  onJoyMove(e);
}
function onJoyMove(e){
  if (!state.joyActive) return;
  const t = e.touches[0];
  setKnob(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
  e.preventDefault();
}
function onJoyEnd(){
  state.joyActive = false;
  state.joyVX = 0; state.joyVY = 0;
  joyKnob.style.transform = "translate(-50%,-50%)";
}
if (joystick){
  joystick.addEventListener("touchstart", onJoyStart, {passive:false});
  joystick.addEventListener("touchmove", onJoyMove, {passive:false});
  joystick.addEventListener("touchend", onJoyEnd);
  joystick.addEventListener("touchcancel", onJoyEnd);
}

/* Boot */
uiAreaLabel.textContent = "Area: Entrance";
uiHint.textContent = "入口を選んでワールドへ";
setMode("ENTRANCE");
render();
requestAnimationFrame(tick);
