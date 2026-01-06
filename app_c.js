function enterArea() {
  document.querySelector('.hero').classList.add('hidden');
  const result = document.getElementById('result');
  const vendors = document.getElementById('vendors');

  vendors.innerHTML = '';
  const samples = [
    '福翔工務店（予算内・地域対応）',
    '碧リフォーム（価格重視・自社施工）',
    '長谷川建装（品質重視・実績多数）'
  ];

  samples.forEach(v => {
    const li = document.createElement('li');
    li.textContent = v;
    vendors.appendChild(li);
  });

  result.classList.remove('hidden');
}

function back() {
  document.querySelector('.hero').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
}
