
document.getElementById("enterBtn").addEventListener("click", () => {
  document.getElementById("result").style.display = "block";
  document.getElementById("currentArea").textContent = "Fashion District";
});

document.getElementById("backBtn").addEventListener("click", () => {
  document.getElementById("result").style.display = "none";
});
