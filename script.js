// Fruit Tap (Senac) - touch-friendly Fruit Ninja-style game
// High-level: spawn fruits with physics arcs, tap to slice, lose life if miss

(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const finalScoreEl = document.getElementById('finalScore');
  const prizeList = document.getElementById('prizeList');

  const DEVICE_PIXEL_RATIO = Math.min(2, window.devicePixelRatio || 1);

  const GAME = {
    running: false,
    score: 0,
    lives: 3,
    time: 0,
    lastSpawn: 0,
    spawnIntervalMs: 900,
    gravity: 1200, // px/s^2 in logical pixels
    fruits: [],
    misses: 0,
  };

  const PRIZES = [
    { threshold: 100, element: null, name: 'Bolinha' },
    { threshold: 150, element: null, name: 'Copo' },
    { threshold: 300, element: null, name: 'Régua' },
    { threshold: 500, element: null, name: 'Porta celular' },
  ];

  function setupPrizes() {
    const items = prizeList.querySelectorAll('li');
    items.forEach((li, idx) => {
      PRIZES[idx].element = li;
    });
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = Math.floor(width * DEVICE_PIXEL_RATIO);
    canvas.height = Math.floor(height * DEVICE_PIXEL_RATIO);
    ctx.setTransform(DEVICE_PIXEL_RATIO, 0, 0, DEVICE_PIXEL_RATIO, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));

  function drawLives() {
    livesEl.innerHTML = '';
    for (let i = 0; i < GAME.lives; i++) {
      const dot = document.createElement('span');
      dot.className = 'life';
      livesEl.appendChild(dot);
    }
  }

  function resetGame() {
    GAME.running = false;
    GAME.score = 0;
    GAME.lives = 3;
    GAME.time = 0;
    GAME.lastSpawn = 0;
    GAME.spawnIntervalMs = 900;
    GAME.fruits = [];
    scoreEl.textContent = '0';
    PRIZES.forEach(p => {
      if (p.element) {
        p.element.classList.remove('prize-won');
        const state = p.element.querySelector('.state');
        if (state) state.textContent = '⏳';
      }
    });
    drawLives();
  }

  function startGame() {
    resetGame();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    GAME.running = true;
    GAME.time = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    GAME.running = false;
    finalScoreEl.textContent = String(GAME.score);
    gameOverOverlay.classList.remove('hidden');
  }

  function rng(min, max) { return Math.random() * (max - min) + min; }

  // Fruit entity
  function spawnFruit(now) {
    const w = canvas.width / DEVICE_PIXEL_RATIO;
    const h = canvas.height / DEVICE_PIXEL_RATIO;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side < 0 ? rng(w * 0.15, w * 0.45) : rng(w * 0.55, w * 0.85);
    const baseY = h + 40; // below bottom
    const radius = rng(24, 40);
    const color = randomFruitColor();

    const initialVy = -rng(700, 920);
    const vx = side < 0 ? rng(140, 260) : -rng(140, 260);

    // Determine if this entity is a bomb (about 18% chance)
    const isBomb = Math.random() < 0.18;

    GAME.fruits.push({
      x, y: baseY,
      vx, vy: initialVy,
      r: radius,
      color,
      isBomb,
      sliced: false,
      sliceTimer: 0,
      createdAt: now,
      reward: 5, // pontos fixos por bolinha
      missed: false,
    });
  }

  function randomFruitColor() {
    const palette = [
      ['#ff5a7a', '#ff2d55'], // watermelon
      ['#fbbf24', '#f59e0b'], // mango
      ['#34d399', '#10b981'], // lime
      ['#22d3ee', '#06b6d4'], // blue fruit
      ['#a78bfa', '#7c3aed'], // grape
    ];
    const [a, b] = palette[Math.floor(Math.random() * palette.length)];
    return { a, b };
  }

  function update(dt) {
    const g = GAME.gravity;
    for (const f of GAME.fruits) {
      if (f.sliced) {
        f.sliceTimer += dt;
        // sliced effect: gentle float up and fade handled in draw; still apply slight gravity for continuity
        f.vy += g * dt * 0.2;
        f.y += f.vy * dt;
        f.x += f.vx * dt * 0.5;
      } else {
        f.vy += g * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
    }

    // Cleanup and misses
    const h = canvas.height / DEVICE_PIXEL_RATIO;
    for (const f of GAME.fruits) {
      if (!f.sliced && !f.missed && f.y - f.r > h) {
        f.missed = true;
        // Only fruits (not bombs) cost a life when missed
        if (!f.isBomb) {
          GAME.lives -= 1;
          drawLives();
          if (GAME.lives <= 0) {
            endGame();
          }
        }
      }
    }
    // Remove sliced after short effect, and also remove far-offscreen items
    GAME.fruits = GAME.fruits.filter(f => {
      if (f.sliced && f.sliceTimer > 0.35) return false;
      if (f.y - f.r > h + 160) return false;
      return true;
    });
  }

  function draw() {
    const w = canvas.width / DEVICE_PIXEL_RATIO;
    const h = canvas.height / DEVICE_PIXEL_RATIO;
    ctx.clearRect(0, 0, w, h);

    for (const f of GAME.fruits) {
      const t = f.sliceTimer;
      const disappear = f.sliced ? Math.min(1, t / 0.35) : 0;
      const scale = f.sliced ? (1 + 0.15 * disappear) : 1;
      const alpha = f.sliced ? (1 - disappear) : 1;

      const radius = f.r * (1 - 0.35 * disappear) * scale;

      if (f.isBomb) {
        // Draw bomb
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        const gradBomb = ctx.createRadialGradient(f.x - radius * 0.2, f.y - radius * 0.2, radius * 0.1, f.x, f.y, radius);
        gradBomb.addColorStop(0, '#2f3140');
        gradBomb.addColorStop(1, '#0c0e18');
        ctx.fillStyle = gradBomb;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // fuse
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(2, radius * 0.12);
        ctx.beginPath();
        ctx.moveTo(f.x + radius * 0.2, f.y - radius * 0.6);
        ctx.quadraticCurveTo(f.x + radius * 0.5, f.y - radius * 1.0, f.x + radius * 0.8, f.y - radius * 0.8);
        ctx.stroke();
        // spark
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(f.x + radius * 0.85, f.y - radius * 0.82, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Draw fruit
        const grad = ctx.createRadialGradient(f.x - radius * 0.3, f.y - radius * 0.3, radius * 0.1, f.x, f.y, radius);
        grad.addColorStop(0, f.color.a);
        grad.addColorStop(1, f.color.b);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // glossy highlight
        ctx.save();
        ctx.globalAlpha = 0.18 * Math.max(0, alpha);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(f.x - radius * 0.3, f.y - radius * 0.35, radius * 0.45, radius * 0.25, -0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (f.sliced) {
        // simple slice effect: ring and faint burst
        ctx.save();
        ctx.globalAlpha = 0.6 * Math.max(0, alpha);
        ctx.strokeStyle = f.isBomb ? 'rgba(251,113,133,.8)' : 'rgba(255,255,255,.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function loop(now) {
    if (!GAME.running) return;
    const dt = Math.min(0.035, (now - GAME.time) / 1000);
    GAME.time = now;

    // spawn logic with mild difficulty scaling
    if (now - GAME.lastSpawn > GAME.spawnIntervalMs) {
      spawnFruit(now);
      if (Math.random() < 0.35) spawnFruit(now); // occasional double
      GAME.lastSpawn = now;
      GAME.spawnIntervalMs = Math.max(420, 900 - Math.floor(GAME.score / 50) * 40);
    }

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function distance(ax, ay, bx, by) {
    const dx = ax - bx; const dy = ay - by; return Math.hypot(dx, dy);
  }

  function handleSlice(x, y) {
    // Reward closest overlapping fruit first
    let best = null; let bestDist = Infinity;
    for (const f of GAME.fruits) {
      if (f.sliced) continue;
      const d = distance(x, y, f.x, f.y);
      if (d <= f.r && d < bestDist) { best = f; bestDist = d; }
    }
    if (best) {
      best.sliced = true;
      best.sliceTimer = 0;
      best.vy = rng(60, 140);
      best.vx *= 0.4;
      if (best.isBomb) {
        // bomb penalty: -2 lives
        GAME.lives -= 2;
        if (GAME.lives < 0) GAME.lives = 0;
        drawLives();
        if (GAME.lives <= 0) {
          endGame();
          return;
        }
      } else {
        // fruit reward: +5 points
        GAME.score += 5;
        scoreEl.textContent = String(GAME.score);
        updatePrizes();
      }
    }
  }

  function updatePrizes() {
    for (const p of PRIZES) {
      if (GAME.score >= p.threshold && p.element && !p.element.classList.contains('prize-won')) {
        p.element.classList.add('prize-won');
        const state = p.element.querySelector('.state');
        if (state) state.textContent = '✅';
        // brief toast effect
        flashBadge(p.element);
      }
    }
  }

  function flashBadge(li) {
    li.animate([
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(52,211,153,0)' },
      { transform: 'scale(1.05)', boxShadow: '0 0 0 12px rgba(52,211,153,.15)' },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(52,211,153,0)' },
    ], { duration: 700, easing: 'ease-out' });
  }

  // Input handling: touch and mouse
  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (evt.touches && evt.touches.length) {
      clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY;
    } else if (evt.changedTouches && evt.changedTouches.length) {
      clientX = evt.changedTouches[0].clientX; clientY = evt.changedTouches[0].clientY;
    } else {
      clientX = evt.clientX; clientY = evt.clientY;
    }
    const x = (clientX - rect.left);
    const y = (clientY - rect.top);
    return { x, y };
  }

  let isPointerDown = false;
  canvas.addEventListener('touchstart', (e) => { isPointerDown = true; const p = getCanvasPoint(e); handleSlice(p.x, p.y); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { if (!isPointerDown) return; const p = getCanvasPoint(e); handleSlice(p.x, p.y); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', () => { isPointerDown = false; });

  canvas.addEventListener('mousedown', (e) => { isPointerDown = true; const p = getCanvasPoint(e); handleSlice(p.x, p.y); });
  canvas.addEventListener('mousemove', (e) => { if (!isPointerDown) return; const p = getCanvasPoint(e); handleSlice(p.x, p.y); });
  canvas.addEventListener('mouseup', () => { isPointerDown = false; });

  // Buttons
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  // Initial setup
  setupPrizes();
  resizeCanvas();
  resetGame();
})();


