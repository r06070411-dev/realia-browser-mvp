// REALIA Open World / Simple Demo (C案)
// 入口ボタンIDが違っても動く「確実版」

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const AREAS = {
  "ファッション": { title: "Fashion District", desc: "ファッション・アパレルの街", first: "ようこそ。どんな服を探していますか？" },
  "改革": { title: "Reform Street", desc: "リフォーム・建築の街", first: "ようこそ。外壁？屋根？地域と予算も教えてください。" },
  "食べ物": { title: "Food Street", desc: "飲食・フードの街", first: "ようこそ。食べたいジャンル・人数・予算は？" }
};

function show(el){ if(!el) return; el.classList.remove("隠し"); el.classList.remove("非表示"); el.style.display=""; }
function hide(el){ if(!el) return; el.classList.add("非表示"); el.style.display="none"; }

function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

function addChat(text){
  const log = document.getElementById("チャットログ") || document.getElementById("chatLog") || document.getElementById("ログ");
  if(!log){ alert(text); return; }
  const div = document.createElement("div");
  div.className = "msg";
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function openWorld(){
  const entrance = document.getElementById("入口");
  const world = document.getElementById("ワールド");
  hide(entrance);
  show(world);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openArea(areaKey){
  const world = document.getElementById("ワールド");
  const view  = document.getElementById("エリアビュー");
  const data = AREAS[areaKey] || { title: areaKey, desc: "エリア説明（デモ）", first: `${areaKey}へようこそ。ご要望を教えてください。` };

  hide(world);
  show(view);

  setText("エリアタイトル", data.title);
  setText("エリア説明", data.desc);
  addChat("🤖 " + data.first);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToWorld(){
  const world = document.getElementById("ワールド");
  const view  = document.getElementById("エリアビュー");
  hide(view);
  show(world);
}

document.addEventListener("DOMContentLoaded", () => {
  // ✅ 入口ボタン：IDが違っても「入口セクション内のボタン全部」にイベントを付ける
  const entrance = document.getElementById("入口");
  if (entrance) {
    const btns = $$("button", entrance);
    btns.forEach((b) => b.addEventListener("click", openWorld));
  }
  // ついでに旧IDにも対応
  const enterWorldBtn = document.getElementById("enterWorldボタン");
  if (enterWorldBtn) enterWorldBtn.addEventListener("click", openWorld);

  // ✅ ワールド内の「入る」ボタン
  const areaButtons = $$(".エンターエリア");
  areaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".エリアカード");
      const key =
        btn.getAttribute("data-area") ||
        (card && card.getAttribute("data-area")) ||
        (card && card.getAttribute("データエリア")) ||
        "ファッション";
      openArea(key);
    });
  });

  // ✅ 戻る
  const backBtn = document.getElementById("戻るボタン") || document.getElementById("backBtn") || document.getElementById("戻る");
  if (backBtn) backBtn.addEventListener("click", backToWorld);
});
