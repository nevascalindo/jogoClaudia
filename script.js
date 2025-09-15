const emojis = ['📚', '📒', '✏️', '📏', '🎒'];
const bomb = '💣';

let score = 0;
let lives = 3;
let gameRunning = true;
let spawnInterval;

const gameArea = document.getElementById('game-area');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

function updateHUD() {
  scoreEl.textContent = `Pontos: ${score}`;

  livesEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.textContent = '❤️';
    if (i >= lives) heart.classList.add('lost');
    livesEl.appendChild(heart);
  }
}

function showFloatingText(text, x, y, type) {
  const float = document.createElement('div');
  float.className = `floating-text ${type}`;
  float.textContent = text;
  float.style.left = `${x}px`;
  float.style.top = `${y}px`;
  gameArea.appendChild(float);
  setTimeout(() => float.remove(), 1000);
}

function createEmoji() {
  if (!gameRunning) return;

  const el = document.createElement('div');
  const isBomb = Math.random() < 0.2;
  el.textContent = isBomb ? bomb : emojis[Math.floor(Math.random() * emojis.length)];
  el.className = 'emoji';

  const size = 70;
  const x = Math.random() * (window.innerWidth - size);
  el.style.left = `${x}px`;
  el.style.bottom = '-80px';
  gameArea.appendChild(el);

  let peak = 200 + Math.random() * 200;
  let duration = 2200 + Math.random() * 800;

  let start = null;
  function animateEmoji(timestamp) {
    if (!start) start = timestamp;
    let elapsed = timestamp - start;

    let progress = elapsed / duration;
    if (progress > 1) progress = 1;

    let y = -4 * peak * (progress - 0.5) ** 2 + peak;
    el.style.bottom = `${y}px`;

    if (progress < 1) {
      requestAnimationFrame(animateEmoji);
    } else {
      if (!el.clicked && !isBomb) {
        lives--;
        updateHUD();
        showFloatingText('-1', x, window.innerHeight - 100, 'minus');
        if (lives <= 0) endGame();
      }
      el.remove();
    }
  }

  el.addEventListener('click', () => {
    if (el.clicked || !gameRunning) return;
    el.clicked = true;
    el.classList.add('clicked');
    if (isBomb) {
      lives--;
      showFloatingText('-1', x, window.innerHeight - 100, 'minus');
    } else {
      score++;
      showFloatingText('+1', x, window.innerHeight - 100, 'plus');
    }
    updateHUD();
    if (lives <= 0) endGame();
    setTimeout(() => el.remove(), 300);
  });

  requestAnimationFrame(animateEmoji);
}

function startGame() {
  score = 0;
  lives = 3;
  gameRunning = true;
  updateHUD();
  gameOverEl.style.display = 'none';

  if (spawnInterval) clearInterval(spawnInterval); // ✅ corrigido
  spawnInterval = setInterval(() => {
    if (gameRunning) createEmoji();
  }, 900);
}

function endGame() {
  gameRunning = false;
  gameOverEl.style.display = 'block';
  finalScoreEl.textContent = `Você fez ${score} ponto${score === 1 ? '' : 's'}!`;
}

restartBtn.onclick = () => {
  startGame();
};

startGame();
