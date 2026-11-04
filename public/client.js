// Devon Torralva
// CS 310 - Project 4, Problem 1 - Multiplayer Tic-Tac-Toe client

// DOM ELEMENTS
const boardCanvas = document.getElementById("board");
const ctx = boardCanvas.getContext("2d");
const statusElement = document.getElementById("status");
const roleElement = document.getElementById("role");
const resetBtn = document.getElementById("resetBtn");
const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("nameInput");
const passwordInput = document.getElementById("passwordInput");

const CELL_SIZE = 200;

// WEBSOCKET CONNECTION (wss:// if the page was loaded over https)
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${window.location.host}`);

let gameState = null;      // Current game state (owned by the server)
let role = "spectator";    // Player role

// Place a piece when the canvas is clicked
boardCanvas.addEventListener("click", event => {
  if (role !== "X" && role !== "O") {
    return;
  }

  // Account for CSS scaling of the canvas
  const rect = boardCanvas.getBoundingClientRect();
  const scale = boardCanvas.width / rect.width;
  const x = (event.clientX - rect.left) * scale;
  const y = (event.clientY - rect.top) * scale;

  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  if (col < 0 || col > 2 || row < 0 || row > 2) {
    return;
  }
  const index = row * 3 + col;

  ws.send(JSON.stringify({ type: "place", index }));
});

// DRAWING 
function drawBoard() {
  if (!gameState) {
    return;
  }

  ctx.clearRect(0, 0, 600, 600);
  drawGrid();

  gameState.board.forEach((value, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;

    if (value === "X") {
      drawX(x, y);
    } else if (value === "O") {
      drawO(x, y);
    }
  });

  if (gameState.winner === "Draw") {
    statusElement.textContent = "Draw!";
  } else if (gameState.winner) {
    statusElement.textContent = `Winner: ${gameState.winner}`;
  } else {
    statusElement.textContent = `Turn: ${gameState.currentPlayer}`;
  }
}

function drawGrid() {
  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(200, 10);  ctx.lineTo(200, 590);
  ctx.moveTo(400, 10);  ctx.lineTo(400, 590);
  ctx.moveTo(10, 200);  ctx.lineTo(590, 200);
  ctx.moveTo(10, 400);  ctx.lineTo(590, 400);
  ctx.stroke();
}

function drawX(x, y) {
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 40, y + 40);
  ctx.lineTo(x + 160, y + 160);
  ctx.moveTo(x + 160, y + 40);
  ctx.lineTo(x + 40, y + 160);
  ctx.stroke();
}

function drawO(x, y) {
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(x + 100, y + 100, 62, 0, Math.PI * 2);
  ctx.stroke();
}

// RECEIVE SERVER MESSAGES VIA WEBSOCKET
ws.onmessage = event => {
  const data = JSON.parse(event.data);

  // Updated game state
  if (data.type === "state") {
    gameState = data.gameState;
    drawBoard();
  }

  // Role assignment
  if (data.type === "role") {
    role = data.role;
    roleElement.textContent = `Logged in as ${data.name} (${role})`;
  }

  // Error messages
  if (data.type === "error") {
    alert(data.message);
  }
};

// JOIN GAME
joinBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({
    type: "login",
    name: nameInput.value.trim(),
    password: passwordInput.value
  }));
});

// RESET GAME
resetBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "reset" }));
});
