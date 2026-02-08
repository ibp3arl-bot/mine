const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("start");
const restartButton = document.getElementById("restart");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const logLineEl = document.getElementById("logLine");

const TILE = 40;
const MAP = [
  "##############",
  "#o..........o#",
  "#.####..####.#",
  "#............#",
  "#.##.####.##.#",
  "#............#",
  "#.####..####.#",
  "#o..........o#",
  "##############",
];

const rows = MAP.length;
const cols = MAP[0].length;

const pellets = new Set();
const powerPellets = new Set();
const walls = new Set();

let score = 0;
let lives = 3;
let level = 1;
let gameRunning = false;
let paused = false;
let gameOver = false;
let frightenedUntil = 0;

const pacman = {
  x: 1,
  y: 1,
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  mouthTick: 0,
};

const spawn = { x: 7, y: 4 };
const ghosts = [
  { x: spawn.x, y: spawn.y, color: "#ff5f5f", mode: "chase" },
  { x: spawn.x - 1, y: spawn.y, color: "#57d5ff", mode: "chase" },
  { x: spawn.x + 1, y: spawn.y, color: "#ff9f43", mode: "chase" },
];

let lastPacMove = 0;
let lastGhostMove = 0;
let pacMoveInterval = 180;
let ghostMoveInterval = 250;

function logLine(message) {
  logLineEl.textContent = message;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function formatScore(value) {
  return value.toString().padStart(6, "0");
}

function syncHud() {
  scoreEl.textContent = formatScore(score);
  livesEl.textContent = String(lives);
  levelEl.textContent = String(level);
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function initBoard() {
  walls.clear();
  pellets.clear();
  powerPellets.clear();

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const tile = MAP[y][x];
      const key = keyOf(x, y);
      if (tile === "#") {
        walls.add(key);
      } else if (tile === ".") {
        pellets.add(key);
      } else if (tile === "o") {
        powerPellets.add(key);
      }
    }
  }
}

function resetActors() {
  pacman.x = 1;
  pacman.y = 1;
  pacman.dir = { x: 1, y: 0 };
  pacman.nextDir = { x: 1, y: 0 };

  ghosts[0].x = spawn.x;
  ghosts[0].y = spawn.y;
  ghosts[1].x = spawn.x - 1;
  ghosts[1].y = spawn.y;
  ghosts[2].x = spawn.x + 1;
  ghosts[2].y = spawn.y;
}

function canMoveTo(x, y) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) {
    return false;
  }
  return !walls.has(keyOf(x, y));
}

function tryApplyNextDirection() {
  const nx = pacman.x + pacman.nextDir.x;
  const ny = pacman.y + pacman.nextDir.y;
  if (canMoveTo(nx, ny)) {
    pacman.dir = { ...pacman.nextDir };
  }
}

function movePacman() {
  tryApplyNextDirection();

  const nx = pacman.x + pacman.dir.x;
  const ny = pacman.y + pacman.dir.y;
  if (!canMoveTo(nx, ny)) {
    return;
  }

  pacman.x = nx;
  pacman.y = ny;

  const here = keyOf(pacman.x, pacman.y);
  if (pellets.delete(here)) {
    score += 10;
  }
  if (powerPellets.delete(here)) {
    score += 50;
    frightenedUntil = performance.now() + 7000;
    setStatus("POWER");
    logLine("Mode POWER: fantômes vulnérables 7s");
  }
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickGhostDirection(ghost) {
  const options = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ].filter((dir) => canMoveTo(ghost.x + dir.x, ghost.y + dir.y));

  if (options.length === 0) {
    return { x: 0, y: 0 };
  }

  if (performance.now() < frightenedUntil) {
    const farthest = [...options].sort((a, b) => {
      const aPos = { x: ghost.x + a.x, y: ghost.y + a.y };
      const bPos = { x: ghost.x + b.x, y: ghost.y + b.y };
      return distance(bPos, pacman) - distance(aPos, pacman);
    });
    return farthest[0];
  }

  const nearest = [...options].sort((a, b) => {
    const aPos = { x: ghost.x + a.x, y: ghost.y + a.y };
    const bPos = { x: ghost.x + b.x, y: ghost.y + b.y };
    return distance(aPos, pacman) - distance(bPos, pacman);
  });

  if (Math.random() < 0.25) {
    return options[Math.floor(Math.random() * options.length)];
  }

  return nearest[0];
}

function moveGhosts() {
  ghosts.forEach((ghost) => {
    const dir = pickGhostDirection(ghost);
    ghost.x += dir.x;
    ghost.y += dir.y;
  });
}

function loseLife() {
  lives -= 1;
  syncHud();

  if (lives <= 0) {
    gameOver = true;
    gameRunning = false;
    overlay.classList.remove("hidden");
    overlayText.textContent = "GAME OVER // Appuie sur RESTART";
    setStatus("KO");
    logLine("Session terminée");
    return;
  }

  setStatus("HIT");
  logLine(`Impact détecté. Vies restantes: ${lives}`);
  resetActors();
}

function handleCollisions() {
  for (const ghost of ghosts) {
    if (ghost.x === pacman.x && ghost.y === pacman.y) {
      if (performance.now() < frightenedUntil) {
        score += 200;
        ghost.x = spawn.x;
        ghost.y = spawn.y;
        logLine("Fantôme absorbé +200");
      } else {
        loseLife();
      }
      return;
    }
  }
}

function clearLevel() {
  level += 1;
  pacMoveInterval = Math.max(115, pacMoveInterval - 12);
  ghostMoveInterval = Math.max(140, ghostMoveInterval - 15);
  initBoard();
  resetActors();
  setStatus("LEVEL UP");
  logLine(`Niveau ${level} chargé. Vitesse augmentée.`);
  syncHud();
}

function drawBackground() {
  ctx.fillStyle = "#010401";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(96, 255, 108, 0.07)";
  ctx.lineWidth = 1;
  for (let y = 0; y <= rows; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE + 0.5);
    ctx.lineTo(canvas.width, y * TILE + 0.5);
    ctx.stroke();
  }
  for (let x = 0; x <= cols; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * TILE + 0.5, 0);
    ctx.lineTo(x * TILE + 0.5, canvas.height);
    ctx.stroke();
  }
}

function drawWalls() {
  ctx.fillStyle = "#062006";
  ctx.strokeStyle = "#4fff4f";
  ctx.lineWidth = 2;

  walls.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
  });
}

function drawPellets() {
  ctx.fillStyle = "#c0ffc0";
  pellets.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const px = x * TILE + TILE / 2 - 2;
    const py = y * TILE + TILE / 2 - 2;
    ctx.fillRect(px, py, 4, 4);
  });

  const blink = Math.floor(performance.now() / 160) % 2 === 0;
  if (blink) {
    ctx.fillStyle = "#fff29b";
    powerPellets.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      ctx.fillRect(x * TILE + TILE / 2 - 6, y * TILE + TILE / 2 - 6, 12, 12);
    });
  }
}

function drawPacman() {
  const cx = pacman.x * TILE + TILE / 2;
  const cy = pacman.y * TILE + TILE / 2;
  const directionAngle = Math.atan2(pacman.dir.y, pacman.dir.x);
  const mouth = Math.abs(Math.sin(pacman.mouthTick)) * 0.55;

  ctx.fillStyle = "#ffe03a";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, TILE * 0.38, directionAngle + mouth, directionAngle + Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  const frightened = performance.now() < frightenedUntil;
  const baseColor = frightened ? "#2f73ff" : ghost.color;

  const x = ghost.x * TILE;
  const y = ghost.y * TILE;

  ctx.fillStyle = baseColor;
  ctx.fillRect(x + 9, y + 14, TILE - 18, TILE - 14);
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + 16, TILE * 0.28, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 15, y + 18, 6, 6);
  ctx.fillRect(x + 23, y + 18, 6, 6);
}

function drawEffects() {
  ctx.fillStyle = "rgba(100, 255, 120, 0.04)";
  for (let i = 0; i < 8; i += 1) {
    const y = ((performance.now() / 12 + i * 50) % canvas.height) | 0;
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function render() {
  drawBackground();
  drawWalls();
  drawPellets();
  ghosts.forEach(drawGhost);
  drawPacman();
  drawEffects();
}

function tick(timestamp) {
  pacman.mouthTick += 0.2;

  if (gameRunning && !paused && !gameOver) {
    if (timestamp - lastPacMove >= pacMoveInterval) {
      movePacman();
      handleCollisions();
      lastPacMove = timestamp;
    }

    if (timestamp - lastGhostMove >= ghostMoveInterval) {
      moveGhosts();
      handleCollisions();
      lastGhostMove = timestamp;
    }

    if (pellets.size === 0 && powerPellets.size === 0) {
      clearLevel();
    }

    if (performance.now() >= frightenedUntil && statusEl.textContent === "POWER") {
      setStatus("RUNNING");
    }
  }

  render();
  syncHud();
  requestAnimationFrame(tick);
}

function startGame() {
  if (gameOver) {
    return;
  }
  gameRunning = true;
  paused = false;
  overlay.classList.add("hidden");
  setStatus("RUNNING");
  logLine("Session active");
}

function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  pacMoveInterval = 180;
  ghostMoveInterval = 250;
  gameOver = false;
  gameRunning = true;
  paused = false;
  frightenedUntil = 0;
  initBoard();
  resetActors();
  setStatus("RUNNING");
  logLine("Nouvelle session lancée");
  overlay.classList.add("hidden");
  syncHud();
}

window.addEventListener("keydown", (event) => {
  const map = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    z: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    q: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    a: { x: -1, y: 0 },
  };

  if (event.key === " ") {
    event.preventDefault();
    if (!gameRunning || gameOver) {
      return;
    }
    paused = !paused;
    if (paused) {
      overlay.classList.remove("hidden");
      overlayText.textContent = "PAUSE // Espace pour reprendre";
      setStatus("PAUSE");
      logLine("Session en pause");
    } else {
      overlay.classList.add("hidden");
      setStatus("RUNNING");
      logLine("Reprise session");
    }
    return;
  }

  const dir = map[event.key];
  if (dir) {
    event.preventDefault();
    pacman.nextDir = dir;
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

initBoard();
resetActors();
syncHud();
setStatus("PRÊT");
render();
requestAnimationFrame(tick);
