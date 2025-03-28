// Entry point that redirects to the actual server file in the backend directory
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { createGame, joinGame } = require("./gameManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static("public"));

// Ajout d'un stockage en mémoire pour les parties actives
const activeGames = new Map();

// Route pour créer une nouvelle partie
app.post("/api/games", (req, res) => {
  try {
    const gameId = createGame();
    res.json({ gameId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour rejoindre une partie existante
app.post("/api/games/:gameId/join", (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body;

  try {
    const playerId = joinGame(gameId, playerName);
    res.json({ gameId, playerId });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Fonction pour générer un ID unique
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 10);
}

// Configuration WebSocket pour la communication en temps réel
io.on("connection", (socket) => {
  console.log("Nouvelle connexion WebSocket");

  socket.on("joinGame", ({ gameId, playerId }) => {
    if (!activeGames.has(gameId)) {
      socket.emit("error", "Partie non trouvée");
      return;
    }

    socket.join(gameId);
    socket.to(gameId).emit("playerJoined", { playerId });

    const gameState = activeGames.get(gameId);
    socket.emit("gameState", gameState);
  });

  // Autres événements de jeu...
});

function getPlayerName(gameId, playerId) {
  const game = activeGames.get(gameId);
  if (!game) return null;

  const player = game.players.find((p) => p.id === playerId);
  return player ? player.name : null;
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Si ce fichier est le point d'entrée, rediriger vers le vrai serveur
if (require.main === module) {
  try {
    require("./backend/server.js");
  } catch (error) {
    console.log("Utilisation du serveur direct sans backend/ directory");
  }
}
