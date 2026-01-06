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
  request: { area: "六本木", budgetMan: 100, needs: "外壁塗装 / 屋根塗装" },
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

  // request form (C plan)
  ensureRequestInputs();
  const btnSuggest = $("#btnSuggest");
  if(btnSuggest) btnSuggest.addEventListener("click", () => {
    readRequestInputs();
    renderSuggest();
    setStatus("候補を表示しました");
  });
  const btnSuggestToChat = $("#btnSuggestToChat");
  if(btnSuggestToChat) btnSuggestToChat.addEventListener("click", () => {
    readRequestInputs();
    chatSay("you", `依頼: ${state.request.area} / 予算${state.request.budgetMan}万円 / 要望: ${state.request.needs}`);
    setView("chat");
        setStatus("チャットに移動しました");
  });

  // delegate clicks for dynamic buttons (suggest list etc.)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-propose],[data-enter],[data-dm]");
    if(!t) return;

    const proposeId = t.dataset.propose;
    if(proposeId){
      const shop = shops.find(s=>s.id===proposeId);
      readRequestInputs();
      chatSay("you", `【提案依頼】${shop ? shop.title : proposeId} に相談したいです。場所: ${state.request.area} / 予算${state.request.budgetMan}万円 / 要望: ${state.request.needs}`);
      chatSay("bot", "了解です。加盟店（バーチャルオフィス）へ依頼内容を共有しました（デモ）。数分で提案が届く想定です。");
      setView("chat");
            setStatus("提案依頼（デモ）");
      return;
    }

    // for enter/dm buttons created later, call existing handlers
    const enterId = t.dataset.enter;
    if(enterId){
      const shop = shops.find(s=>s.id===enterId);
      if(shop){
        state.selectedShop = shop;
        setView("shops");
        renderShops();
        setStatus(`店舗: ${shop.title}`);
      }
      return;
    }
    const dmId = t.dataset.dm;
    if(dmId){
      const shop = shops.find(s=>s.id===dmId);
      if(shop){
        chatSay("you", `DM: ${shop.title} さん、相談できますか？`);
        chatSay("bot", "（デモ）既読。営業時間内に返信が来る想定です。");
        setView("chat");
                setStatus("DM送信（デモ）");
      }
      return;
    }
  }, { capture: true });

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


function normalize(s){ return (s||"").toLowerCase(); }

function scoreShop(shop, req){
  const needs = normalize(req.needs);
  const area  = normalize(req.area);

  let score = 0;
  // category affinity
  if(needs.includes("塗装") || needs.includes("reform") || needs.includes("roof") || needs.includes("wall")) {
    if(shop.cat === "Reform") score += 55;
  }
  if(needs.includes("fashion") || needs.includes("服") || needs.includes("アパレル") || needs.includes("sneaker")) {
    if(shop.cat === "Fashion") score += 55;
  }
  if(needs.includes("food") || needs.includes("ラーメン") || needs.includes("飲食")) {
    if(shop.cat === "Food") score += 55;
  }
  if(needs.includes("biz") || needs.includes("法人") || needs.includes("事務所") || needs.includes("営業")) {
    if(shop.cat === "Biz") score += 55;
  }

  // keyword match against title/desc
  const text = normalize((shop.title||"") + " " + (shop.desc||""));
  const tokens = needs.split(/[\s,\/、]+/).filter(Boolean);
  tokens.forEach(t=>{
    if(t.length>=2 && text.includes(t)) score += 6;
  });

  // area hint (demo)
  if(area.includes("六本木") || area.includes("roppongi")) score += 8;
  if(area.includes("福島") || area.includes("fukushima")) score += 8;

  // budget hint (very rough)
  const b = Number(req.budgetMan||0);
  if(shop.cat === "Reform"){
    if(b>=80 && b<=150) score += 18; else score -= 6;
  }
  if(shop.cat === "Fashion" && b>0){
    if(b<=30) score += 8;
  }

  return Math.max(0, Math.min(100, score));
}

function pickShops(req){
  return shops
    .map(s => ({...s, _score: scoreShop(s, req)}))
    .sort((a,b)=>b._score-a._score)
    .slice(0,4);
}

function renderSuggest(){
  const req = state.request;
  const list = pickShops(req);

  const el = $("#suggestList");
  if(!el) return;
  if(list.length===0){
    el.innerHTML = '<div class="item">候補が見つかりませんでした</div>';
    return;
  }

  el.innerHTML = list.map(s => `
    <div class="suggestItem">
      <div class="suggestMeta">
        <div class="itemTitle">${s.title}</div>
        <div class="itemDesc">${s.desc}</div>
        <div class="badge">マッチ度 <b>${s._score}</b> / 100</div>
      </div>
      <div class="suggestActions">
        <button class="secondary" data-enter="${s.id}">店舗を見る</button>
        <button class="primary" data-propose="${s.id}">提案を依頼</button>
      </div>
    </div>
  `).join("");
}



function chatSay(who, text){
  const log = $("#chatLog");
  if(!log) return;
  pushChat(log, text, who);
  // do not persist "who" in this demo
}

function ensureRequestInputs(){
  const a = $("#reqArea"), b = $("#reqBudget"), n = $("#reqNeeds");
  if(a) a.value = state.request.area || "";
  if(b) b.value = String(state.request.budgetMan ?? "");
  if(n) n.value = state.request.needs || "";
}

function readRequestInputs(){
  const a = $("#reqArea"), b = $("#reqBudget"), n = $("#reqNeeds");
  state.request.area = (a && a.value) ? a.value : state.request.area;
  state.request.budgetMan = (b && b.value) ? Number(b.value) : state.request.budgetMan;
  state.request.needs = (n && n.value) ? n.value : state.request.needs;
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
  
  // request form (C plan)
  ensureRequestInputs();
  const btnSuggest = $("#btnSuggest");
  if(btnSuggest) btnSuggest.addEventListener("click", () => {
    readRequestInputs();
    renderSuggest();
    setStatus("候補を表示しました");
  });
  const btnSuggestToChat = $("#btnSuggestToChat");
  if(btnSuggestToChat) btnSuggestToChat.addEventListener("click", () => {
    readRequestInputs();
    chatSay("you", `依頼: ${state.request.area} / 予算${state.request.budgetMan}万円 / 要望: ${state.request.needs}`);
    setView("chat");
        setStatus("チャットに移動しました");
  });

  // delegate clicks for dynamic buttons (suggest list etc.)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-propose],[data-enter],[data-dm]");
    if(!t) return;

    const proposeId = t.dataset.propose;
    if(proposeId){
      const shop = shops.find(s=>s.id===proposeId);
      readRequestInputs();
      chatSay("you", `【提案依頼】${shop ? shop.title : proposeId} に相談したいです。場所: ${state.request.area} / 予算${state.request.budgetMan}万円 / 要望: ${state.request.needs}`);
      chatSay("bot", "了解です。加盟店（バーチャルオフィス）へ依頼内容を共有しました（デモ）。数分で提案が届く想定です。");
      setView("chat");
            setStatus("提案依頼（デモ）");
      return;
    }

    // for enter/dm buttons created later, call existing handlers
    const enterId = t.dataset.enter;
    if(enterId){
      const shop = shops.find(s=>s.id===enterId);
      if(shop){
        state.selectedShop = shop;
        setView("shops");
        renderShops();
        setStatus(`店舗: ${shop.title}`);
      }
      return;
    }
    const dmId = t.dataset.dm;
    if(dmId){
      const shop = shops.find(s=>s.id===dmId);
      if(shop){
        chatSay("you", `DM: ${shop.title} さん、相談できますか？`);
        chatSay("bot", "（デモ）既読。営業時間内に返信が来る想定です。");
        setView("chat");
                setStatus("DM送信（デモ）");
      }
      return;
    }
  }, { capture: true });

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


  // request form (C plan)
  ensureRequestInputs();
  const btnSuggest = $("#btnSuggest");
  if(btnSuggest) btnSuggest.addEventListener("click", () => {
    readRequestInputs();
    renderSuggest();
    setStatus("候補を表示しました");
  });
  const btnSuggestToChat = $("#btnSuggestToChat");
  if(btnSuggestToChat) btnSuggestToChat.addEventListener("click", () => {
    readRequestInputs();
    chatSay("you", `依頼: ${state.request.area} / 予算${state.request.budgetMan}万円 / 要望: ${state.request.needs}`);
    setView("chat");
        setStatus("チャットに移動しました");
  });

  // delegate clicks for dynamic buttons (suggest list etc.)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-propose],[data-enter],[data-dm]");
    if(!t) return;

    const proposeId = t.dataset.propose;
    if(proposeId){
      const shop = shops.find(s=>s.id===proposeId);
      readRequestInputs();
      chatSay("you", `【提案依頼】${shop ? shop.title : proposeId} に相談したいです。場所: ${state.request.area} / 予算${state.request.budgetMan}万円 / 要望: ${state.request.needs}`);
      chatSay("bot", "了解です。加盟店（バーチャルオフィス）へ依頼内容を共有しました（デモ）。数分で提案が届く想定です。");
      setView("chat");
            setStatus("提案依頼（デモ）");
      return;
    }

    // for enter/dm buttons created later, call existing handlers
    const enterId = t.dataset.enter;
    if(enterId){
      const shop = shops.find(s=>s.id===enterId);
      if(shop){
        state.selectedShop = shop;
        setView("shops");
        renderShops();
        setStatus(`店舗: ${shop.title}`);
      }
      return;
    }
    const dmId = t.dataset.dm;
    if(dmId){
      const shop = shops.find(s=>s.id===dmId);
      if(shop){
        chatSay("you", `DM: ${shop.title} さん、相談できますか？`);
        chatSay("bot", "（デモ）既読。営業時間内に返信が来る想定です。");
        setView("chat");
                setStatus("DM送信（デモ）");
      }
      return;
    }
  }, { capture: true });

  renderKV();
  renderShops();
  setView("world");
  setStatus("起動完了");
}
document.addEventListener("DOMContentLoaded", init);
