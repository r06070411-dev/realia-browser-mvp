// REALIA Simple Demo (No build)
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const state = {
  view: "world",
  category: "Fashion",
  area: "Roppongi Neo",
  online: false,
  onlineCount: 0,
  adStyle: "bold",
};

const shops = [
  { id:"f-01", title:"NEO Boutique", desc:"AIスタイリストが提案。アバター試着対応（予定）", cat:"Fashion" },
  { id:"f-02", title:"Synth Sneaker Lab", desc:"限定スニーカー / 受注生産 / カスタム", cat:"Fashion" },
  { id:"r-01", title:"100万円リフォーム相談所", desc:"予算・地域・要望から加盟店をピックアップ（構想）", cat:"Reform" },
  { id:"r-02", title:"外壁・屋根 塗装プロ", desc:"見積/提案/施工。AIが条件整理 → 店舗から営業可能", cat:"Reform" },
  { id:"b-01", title:"Virtual Office Hub", desc:"法人/個人のオンライン事務所（住所/郵便転送などは将来）", cat:"Biz" },
  { id:"b-02", title:"Partnership Lounge", desc:"商業区画で出会い → チャット/通話へ（予定）", cat:"Biz" },
  { id:"fo-01", title:"Ramen Neon Alley", desc:"フード街（デモ）", cat:"Food" },
];

function setStatus(text){
  $("#statusText").textContent = text;
}
function renderKV(){
  $("#currentCategory").textContent = state.category;
  $("#currentArea").textContent = state.area;
  $("#onlineCount").textContent = state.online ? `${state.onlineCount}人` : "0人";
  $("#btnOnline").textContent = `オンライン: ${state.online ? "ON" : "OFF"}`;
}
function setView(view){
  state.view = view;
  $$(".tab").forEach(b => b.classList.toggle("is-active", b.dataset.view === view));
  $$(".view").forEach(v => v.classList.toggle("is-active", v.dataset.view === view));
  setStatus(`表示: ${view}`);
}

function pushChat(logEl, text, me=false){
  const row = document.createElement("div");
  row.className = "msg" + (me ? " me" : "");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;
}

function saveChat(msg){
  const key = "realia_simple_chat";
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push({ t: Date.now(), msg });
  localStorage.setItem(key, JSON.stringify(arr.slice(-50)));
}
function loadChat(){
  const key = "realia_simple_chat";
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  const log = $("#chatLog");
  log.innerHTML = "";
  arr.forEach(x => pushChat(log, x.msg, true));
}

function filterShops(q){
  const query = (q||"").trim().toLowerCase();
  return shops.filter(s => {
    const inCat = (state.category ? s.cat === state.category : true);
    const hit = !query || (s.title+s.desc+s.cat).toLowerCase().includes(query);
    return inCat && hit;
  });
}

function renderShops(){
  const list = $("#shopList");
  list.innerHTML = "";
  const q = $("#shopQuery").value || "";
  const results = filterShops(q);
  results.forEach(s => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="t">${s.title}</div>
      <div class="d">${s.desc}</div>
      <div class="a">
        <button class="secondary" data-enter="${s.id}">店舗に入る</button>
        <button class="secondary" data-dm="${s.id}">DM</button>
      </div>
    `;
    list.appendChild(item);
  });
  if(results.length === 0){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = `<div class="t">該当なし</div><div class="d">別のキーワードで試してください。</div>`;
    list.appendChild(empty);
  }
}

function botReply(q){
  const text = String(q||"");
  if(text.includes("回り方")) return "まずは Fashion District で雰囲気を掴み、オンラインONで交流→気になる店舗に入るのが最短です。";
  if(text.includes("100万") || text.includes("塗装")) return "条件（地域/予算/希望）を入力→AIが加盟店候補を抽出→加盟店側から提案/営業できる形が実装候補です。次のC案で仕組み化します。";
  if(text.includes("法人") || text.includes("バーチャル")) return "住所の提供/郵便転送/本人確認などは運用と法務が絡みます。まずは『オンライン上の店舗/名刺ページ』から始めるのが安全です。";
  if(text.includes("AI") && text.includes("服")) return "可能です。生成→デザイン抽出→受注生産のフローにできます。初期は“サンプル商品”でデモ、次に受注生産連携へ。";
  return "了解です。いまは雰囲気デモですが、次のC案で機能を増やしていきましょう。";
}

function setCategory(cat){
  state.category = cat;
  // area naming
  state.area =
    cat === "Fashion" ? "Roppongi Neo / Fashion" :
    cat === "Reform" ? "Roppongi Neo / Reform" :
    cat === "Food" ? "Roppongi Neo / Food" :
    "Roppongi Neo / Biz";
  renderKV();
  renderShops();
  setStatus(`カテゴリ変更: ${cat}`);
}

function setAdStyle(style){
  state.adStyle = style;
  $$(".chip").forEach(c => c.classList.toggle("is-on", c.dataset.adstyle === style));
  const ad1 = $(".holo.ad1");
  const ad2 = $(".holo.ad2");
  const map = {
    soft: { opacity: .85, anim: "none" },
    bold: { opacity: 1, anim: "pulse 1.8s ease-in-out infinite" },
    flash:{ opacity: 1, anim: "flash 1.1s linear infinite" },
  };
  const s = map[style] || map.bold;
  [ad1,ad2].forEach(el => {
    el.style.opacity = s.opacity;
    el.style.animation = s.anim;
  });
}

function injectKeyframes(){
  const st = document.createElement("style");
  st.textContent = `
    @keyframes pulse { 0%,100%{ transform: translateY(0); filter: brightness(1) } 50%{ transform: translateY(-2px); filter: brightness(1.25) } }
    @keyframes flash { 0%,49%{ filter: brightness(1) } 50%{ filter: brightness(1.6) } 60%{ filter: brightness(1) } 100%{ filter: brightness(1.1) } }
  `;
  document.head.appendChild(st);
}

function init(){
  injectKeyframes();
  // tabs
  $$(".tab").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));

  // POIs
  $$(".poi").forEach(btn => btn.addEventListener("click", () => setCategory(btn.dataset.poi)));

  $("#btnEnter").addEventListener("click", () => {
    setView("shops");
    setStatus("店舗へ移動");
  });
  $("#btnTeleport").addEventListener("click", () => {
    const next = state.category === "Fashion" ? "Reform" : state.category === "Reform" ? "Biz" : state.category === "Biz" ? "Food" : "Fashion";
    setCategory(next);
  });

  // online toggle
  $("#btnOnline").addEventListener("click", () => {
    state.online = !state.online;
    state.onlineCount = state.online ? 7 : 0; // demo
    renderKV();
    setStatus(state.online ? "オンライン交流: ON" : "オンライン交流: OFF");
    if(state.online){ loadChat(); }
  });

  // share
  $("#btnShare").addEventListener("click", async () => {
    const url = location.href;
    try{
      if(navigator.share){ await navigator.share({ title:"REALIA Demo", url }); }
      else{ await navigator.clipboard.writeText(url); alert("URLをコピーしました"); }
    }catch(e){
      // ignore
    }
  });

  // shops
  $("#btnSearch").addEventListener("click", renderShops);
  $("#shopQuery").addEventListener("keydown", (e) => { if(e.key==="Enter") renderShops(); });
  $("#shopList").addEventListener("click", (e) => {
    const t = e.target;
    if(!(t instanceof HTMLElement)) return;
    const enterId = t.getAttribute("data-enter");
    const dmId = t.getAttribute("data-dm");
    if(enterId){
      const s = shops.find(x=>x.id===enterId);
      alert(`入店（デモ）: ${s?.title || enterId}\n\n※本実装では店舗空間へ遷移します。`);
    }
    if(dmId){
      const s = shops.find(x=>x.id===dmId);
      setView("chat");
      setStatus("DM（デモ）");
      if(!state.online){
        alert("オンラインがOFFです。右上の「オンライン: ON」にするとチャットが有効になります。");
      }else{
        pushChat($("#chatLog"), `【DM】${s?.title || dmId} にメッセージを送れます（デモ）`, false);
      }
    }
  });

  // chat
  $("#btnSend").addEventListener("click", () => {
    if(!state.online){
      alert("オンラインがOFFです。右上の「オンライン: ON」にしてください。");
      return;
    }
    const input = $("#chatInput");
    const msg = input.value.trim();
    if(!msg) return;
    input.value = "";
    pushChat($("#chatLog"), msg, true);
    saveChat(msg);
  });

  // bot
  const botLog = $("#botLog");
  pushChat(botLog, "こんにちは。REALIAの案内AIです。質問ボタンを押してください。", false);
  $$(".q").forEach(b => b.addEventListener("click", () => {
    const q = b.getAttribute("data-q") || "";
    pushChat(botLog, q, true);
    const a = botReply(q);
    setTimeout(() => pushChat(botLog, a, false), 220);
  }));

  // ad styles
  $$(".chip").forEach(c => c.addEventListener("click", () => setAdStyle(c.dataset.adstyle)));
  setAdStyle("bold");

  renderKV();
  renderShops();
  setView("world");
  setStatus("起動完了");
}
document.addEventListener("DOMContentLoaded", init);
