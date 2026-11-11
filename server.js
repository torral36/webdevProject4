// Devon Torralva
// CS 310 - Project 4, Problem 1 - Multiplayer Tic-Tac-Toe server

// SERVER SETUP
const express = require("express");   // Express framework
const http = require("http");         // HTTP module shared by Express and WebSockets
const WebSocket = require("ws");      // WebSocket library

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));    // Serve everything inside the public folder

const GAME_PASSWORD = "password";    // Password required to join the game

// GAME STATE
function newGameState() {
  return {
    board: Array(9).fill(""),
    currentPlayer: "X",
    winner: null
  };
}

let gameState = newGameState();

// Track the two active players
let players = {
  X: null,
  O: null
};

// SEND GAME STATE TO EVERYONE
function broadcastState() {
  const payload = JSON.stringify({ type: "state", gameState });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// CHECK FOR WINNER (returns "X", "O", "Draw", or null)
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (!board.includes("")) {
    return "Draw";
  }
  return null;
}

// CONNECTION EVENT HANDLER (ws is the connection for one specific browser)
wss.on("connection", ws => {
  ws.playerName = "";
  ws.role = "spectator";
  ws.authenticated = false;

  // Send current game state immediately
  ws.send(JSON.stringify({ type: "state", gameState }));

  // RECEIVE MESSAGE
  ws.on("message", message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return; // ignore malformed messages
    }

    // LOGIN
    if (data.type === "login") {
      if (ws.authenticated) {
        return; // already logged in
      }

      if (data.password !== GAME_PASSWORD) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid password" }));
        return;
      }

      ws.playerName = String(data.name || "").slice(0, 30) || "Anonymous";
      ws.authenticated = true;

      if (!players.X) {
        players.X = ws;
        ws.role = "X";
      } else if (!players.O) {
        players.O = ws;
        ws.role = "O";
      } else {
        ws.role = "spectator";
      }

      console.log(`role = ${ws.role} for ${ws.playerName}`);

      ws.send(JSON.stringify({ type: "role", role: ws.role, name: ws.playerName }));
      return;
    }

    // Ignore everything else until authenticated
    if (!ws.authenticated) {
      return;
    }

    // PLACE PIECE
    if (data.type === "place") {
      const index = data.index;

      // Must be X or O
      if (ws.role !== "X" && ws.role !== "O") {
        return;
      }
      // Must be this player's turn
      if (ws.role !== gameState.currentPlayer) {
        return;
      }
      // Game already finished
      if (gameState.winner) {
        return;
      }
      // Index must be a valid cell
      if (!Number.isInteger(index) || index < 0 || index > 8) {
        return;
      }
      // Cell already occupied
      if (gameState.board[index] !== "") {
        return;
      }

      console.log(`player ${ws.role} is trying to place a game piece`);

      // Place move
      gameState.board[index] = gameState.currentPlayer;
      const winner = checkWinner(gameState.board);

      if (winner) {
        gameState.winner = winner;
      } else {
        gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
      }

      broadcastState();
      return;
    }

    // RESET
    if (data.type === "reset") {
      gameState = newGameState();
      broadcastState();
    }
  });

  // CLIENT DISCONNECTS
  ws.on("close", () => {
    if (players.X === ws) {
      players.X = null;
    }
    if (players.O === ws) {
      players.O = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
