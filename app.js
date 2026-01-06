// REALIA Open World / Simple Demo (C案)
// HTML側のID/クラスが日本語でも動く版

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const AREAS = {
  "ファッション": {
    title: "Fashion District",
    desc: "ファッション・アパレルの街。AIスタイリストが提案（デモ）。",
    first: "ようこそファッションへ。どんな服を探していますか？ 予算・用途も教えてください。"
  },
  "改革": {
    title: "Reform Street",
    desc: "リフォーム・建築の街。予算100万円の塗装相談など（デモ）。",
    first: "改革通りへようこそ。外壁？屋根？地域・予算・希望条件を教えてください。"
  },
  "食べ物": {
    title: "Food Street",
    desc: "飲食の街。おすすめ/予約相談など（デモ）。",
    first: "フードストリートへようこそ。食べたいジャンル・人数・予算を教えてください。"
  }
};

function show(el) {
  if (!el) return;
  // あなたのCSSが「隠し」「非表示」を使っているので両方外す
  el.classList.remove("隠し");
  el.classList.remove("非表示");
  el.style.display = "";
}

function hide(el) {
  if (!el) return;
  // 既存CSSを壊さず確実に隠す
  el.classList.add("非表示");
  el.style.display = "none";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function addChat(text) {
  // もしチャットログ要素が無ければ、最低限 alert で出す
  const log =
    document.getElementById("チャットログ") ||
    document.getElementById("chatLog") ||
    document.getElementById("ログ");

  if (!log) {
    alert(text);
    return;
  }
  const div = document.createElement("div");
  div.className = "msg";
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function openWorld() {
  const entrance = document.getElementById("入口");
  const world = document.getElementById("ワールド");

  hide(entrance);
  show(world);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openArea(areaKey) {
  const world = document.getElementById("ワールド");
  const view = document.getElementById("エリアビュー");

  const data = AREAS[areaKey] || {
    title: areaKey,
    desc: "エリア説明（デモ）",
    first: `${areaKey}へようこそ。ご要望を教えてください。`
  };

  // 表示切替：ワールド → エリアビュー
  hide(world);
  show(view);

  setText("エリアタイトル", data.title);
  setText("エリア説明", data.desc);

  addChat("🤖 " + data.first);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToWorld() {
  const world = document.getElementById("ワールド");
  const view = document.getElementById("エリアビュー");

  hide(view);
  show(world);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  // 入口の「このエリアに入る」
  const enterWorldBtn = document.getElementById("enterWorldボタン");
  if (enterWorldBtn) {
    enterWorldBtn.addEventListener("click", openWorld);
  }

  // ワールド内の「入る」ボタン（クラス名が「エンターエリア」）
  // areaKey は ①data-area ②親の data-area ③親の「データエリア」属性 の順で取る
  const areaButtons = $$(".エンターエリア");
  areaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".エリアカード");
      const key =
        btn.getAttribute("data-area") ||
        (card && card.getAttribute("data-area")) ||
        (card && card.getAttribute("データエリア")) || // あなたのHTMLに合わせてフォールバック
        "ファッション";

      openArea(key);
    });
  });

  // 戻るボタンがある場合
  const backBtn =
    document.getElementById("戻るボタン") ||
    document.getElementById("backBtn") ||
    document.getElementById("戻る");
  if (backBtn) {
    backBtn.addEventListener("click", backToWorld);
  }
});
