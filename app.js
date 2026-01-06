document.addEventListener("DOMContentLoaded", () => {

  const enterBtn = document.getElementById("enterWorld");
  const entrance = document.getElementById("入口");
  const world = document.getElementById("ワールド");
  const areaView = document.getElementById("エリアビュー");

  const areaTitle = document.getElementById("エリアタイトル");
  const areaDesc = document.getElementById("エリア説明");
  const backBtn = document.getElementById("戻る");

  // 入口 → ワールド
  enterBtn.addEventListener("click", () => {
    entrance.style.display = "none";
    world.style.display = "block";
  });

  // 各エリア「入る」ボタン
  document.querySelectorAll(".エンターエリア").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".エリアカード");
      const area = card.dataset.area;

      world.style.display = "none";
      areaView.style.display = "block";

      if (area === "ファッション") {
        areaTitle.textContent = "Fashion District";
        areaDesc.textContent = "ここはファッションディストリクトです。AI店員が接客します。";
      }

      if (area === "改革") {
        areaTitle.textContent = "Reform Street";
        areaDesc.textContent = "リフォーム・建築の街。AIアバターに相談できます。";
      }

      if (area === "食べ物") {
        areaTitle.textContent = "Food Street";
        areaDesc.textContent = "飲食の街。おすすめメニューをAIが案内します。";
      }
    });
  });

  // 戻る
  backBtn.addEventListener("click", () => {
    areaView.style.display = "none";
    world.style.display = "block";
  });

});
