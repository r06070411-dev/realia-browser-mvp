const entrance = document.getElementById("entrance");
const world = document.getElementById("world");
const enterWorldBtn = document.getElementById("enterWorldBtn");

const areaCards = document.querySelectorAll(".enter-area");
const areaView = document.getElementById("areaView");
const areaTitle = document.getElementById("areaTitle");
const areaDescription = document.getElementById("areaDescription");
const backBtn = document.getElementById("backBtn");

const chatLog = document.getElementById("chatLog");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// エントランス → ワールド
enterWorldBtn.addEventListener("click", () => {
  entrance.classList.add("hidden");
  world.classList.remove("hidden");
});

// エリアデータ
const areaData = {
  fashion: {
    title: "Fashion District",
    description: "ファッション・アパレル系の店舗が集まるエリアです。",
    ai: "ここはファッションディストリクトです。新作アイテムやAIデザインの相談ができます。"
  },
  reform: {
    title: "Reform Street",
    description: "住宅リフォーム・建築・塗装のエリアです。",
    ai: "こちらはリフォームストリートです。外壁塗装や住宅改修の相談が可能です。"
  },
  food: {
    title: "Food Street",
    description: "飲食・フードビジネスのエリアです。",
    ai: "フードストリートへようこそ。飲食店の相談やメニュー開発のサポートができます。"
  }
};

// エリアに入る
areaCards.forEach(btn => {
  btn.addEventListener("click", (e) => {
    const areaKey = e.target.parentElement.dataset.area;
    const data = areaData[areaKey];

    areaTitle.textContent = data.title;
    areaDescription.textContent = data.description;
    chatLog.innerHTML = `<div class="system">${data.ai}</div>`;

    areaView.classList.remove("hidden");
  });
});

// ワールドに戻る
backBtn.addEventListener("click", () => {
  areaView.classList.add("hidden");
});

// チャット送信（簡易AI応答）
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.className = "user";
  userMsg.textContent = text;
  chatLog.appendChild(userMsg);

  userInput.value = "";

  setTimeout(() => {
    const aiMsg = document.createElement("div");
    aiMsg.className = "ai";
    aiMsg.textContent = "（デモAI）ご質問ありがとうございます。将来的にはここに本物のAI接客を接続します。";
    chatLog.appendChild(aiMsg);
    chatLog.scrollTop = chatLog.scrollHeight;
  }, 500);
}
