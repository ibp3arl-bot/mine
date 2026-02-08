const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("start");

const cellSize = 40;
const rows = Math.floor(canvas.height / cellSize);
const cols = Math.floor(canvas.width / cellSize);
const walls = new Set([
  "1,1",
  "2,1",
  "3,1",
  "5,1",
  "6,1",
  "7,1",
  "1,2",
  "7,2",
  "1,3",
  "4,3",
  "7,3",
  "1,4",
  "7,4",
  "1,5",
  "2,5",
  "3,5",
  "5,5",
  "6,5",
  "7,5",
]);

const pellets = new Set();
for (let r = 0; r < rows; r += 1) {
  for (let c = 0; c < cols; c += 1) {
    const key = `${c},${r}`;
    if (!walls.has(key) && !(c === 0 && r === 0)) {
      pellets.add(key);
    }
  }
}

const pacman = {
  x: 0,
  y: 0,
  direction: { x: 1, y: 0 },
  mouth: 0,
};

const ghost = {
  x: cols - 1,
  y: rows - 1,
};

let lastMove = 0;
let lastGhostMove = 0;
let isRunning = false;

function drawGrid() {
  ctx.fillStyle = "#08131f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f3352";
  walls.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  });
}

function drawPellets() {
  ctx.fillStyle = "#f1f5ff";
  pellets.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    ctx.beginPath();
    ctx.arc(
      x * cellSize + cellSize / 2,
      y * cellSize + cellSize / 2,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });
}

function drawPacman() {
  const centerX = pacman.x * cellSize + cellSize / 2;
  const centerY = pacman.y * cellSize + cellSize / 2;
  const angle = Math.abs(Math.sin(pacman.mouth)) * 0.5;
  const directionAngle = Math.atan2(pacman.direction.y, pacman.direction.x);

  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(
    centerX,
    centerY,
    cellSize * 0.4,
    directionAngle + angle,
    directionAngle + Math.PI * 2 - angle
  );
  ctx.closePath();
  ctx.fill();
}

function drawGhost() {
  const centerX = ghost.x * cellSize + cellSize / 2;
  const centerY = ghost.y * cellSize + cellSize / 2;
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.arc(centerX, centerY, cellSize * 0.35, Math.PI, 0, false);
  ctx.lineTo(centerX + cellSize * 0.35, centerY + cellSize * 0.35);
  ctx.lineTo(centerX, centerY + cellSize * 0.2);
  ctx.lineTo(centerX - cellSize * 0.35, centerY + cellSize * 0.35);
  ctx.closePath();
  ctx.fill();
}

function drawScore() {
  ctx.fillStyle = "#c8d6ff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Gommes: ${pellets.size}`, 16, 24);
}

function render() {
  drawGrid();
  drawPellets();
  drawGhost();
  drawPacman();
  drawScore();
}

function canMoveTo(x, y) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) {
    return false;
  }
  return !walls.has(`${x},${y}`);
}

function movePacman() {
  const nextX = pacman.x + pacman.direction.x;
  const nextY = pacman.y + pacman.direction.y;
  if (canMoveTo(nextX, nextY)) {
    pacman.x = nextX;
    pacman.y = nextY;
    pellets.delete(`${pacman.x},${pacman.y}`);
  }
}

function moveGhost() {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const options = directions.filter((dir) =>
    canMoveTo(ghost.x + dir.x, ghost.y + dir.y)
  );
  if (options.length === 0) {
    return;
  }
  const choice = options[Math.floor(Math.random() * options.length)];
  ghost.x += choice.x;
  ghost.y += choice.y;
}

function update(timestamp) {
  if (!isRunning) {
    render();
    requestAnimationFrame(update);
    return;
  }

  pacman.mouth += 0.2;
  if (timestamp - lastMove > 220) {
    movePacman();
    lastMove = timestamp;
  }
  if (timestamp - lastGhostMove > 500 && Math.random() < 0.6) {
    moveGhost();
    lastGhostMove = timestamp;
  }
  render();
  requestAnimationFrame(update);
}

window.addEventListener("keydown", (event) => {
  const map = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };
  if (map[event.key]) {
    event.preventDefault();
    pacman.direction = map[event.key];
  }
});

render();
requestAnimationFrame(update);

startButton.addEventListener("click", () => {
  isRunning = true;
  overlay.classList.add("hidden");
});
