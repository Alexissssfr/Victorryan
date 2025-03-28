const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

// Initialisation de base
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuration de base
app.use(express.json());
app.use(express.static("public"));

// Données en mémoire pour les parties
const games = new Map();

// Fonctions utilitaires
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// Page d'accueil
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Créer une partie
app.post("/api/games", (req, res) => {
  const gameId = generateId();
  games.set(gameId, {
    id: gameId,
    players: {},
    status: "waiting",
    currentTurn: null,
    createdAt: new Date().toISOString(),
  });

  console.log(`Nouvelle partie créée: ${gameId}`);
  res.json({ success: true, gameId });
});

// Rejoindre une partie
app.post("/api/games/:id/join", (req, res) => {
  const gameId = req.params.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: "Nom requis" });
  }

  if (!games.has(gameId)) {
    return res
      .status(404)
      .json({ success: false, error: "Partie non trouvée" });
  }

  const game = games.get(gameId);

  if (Object.keys(game.players).length >= 2) {
    return res.status(403).json({ success: false, error: "Partie pleine" });
  }

  const playerId = generateId();

  game.players[playerId] = {
    id: playerId,
    name: name,
    cards: {
      characters: [],
      bonuses: [],
    },
  };

  // Premier joueur devient le joueur actif
  if (Object.keys(game.players).length === 1) {
    game.currentTurn = playerId;
  }

  // Deux joueurs = partie commence
  if (Object.keys(game.players).length === 2) {
    game.status = "playing";
  }

  console.log(`Joueur ${name} (${playerId}) a rejoint la partie ${gameId}`);
  res.json({ success: true, gameId, playerId });
});

// WebSocket
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion WebSocket: ${socket.id}`);

  // Rejoindre une salle de jeu
  socket.on("joinRoom", ({ gameId, playerId }) => {
    if (!games.has(gameId)) {
      socket.emit("error", { message: "Partie introuvable" });
      return;
    }

    const game = games.get(gameId);

    if (!game.players[playerId]) {
      socket.emit("error", { message: "Joueur non reconnu" });
      return;
    }

    // Connexion réussie
    socket.join(gameId);
    game.players[playerId].socketId = socket.id;
    console.log(`Joueur ${playerId} connecté à la salle ${gameId}`);

    // Informer le joueur de l'état actuel
    socket.emit("gameState", {
      game: JSON.parse(JSON.stringify(game)),
    });

    // Informer les autres joueurs
    socket.to(gameId).emit("playerJoined", {
      playerId: playerId,
      playerName: game.players[playerId].name,
    });

    // Gérer les déconnexions
    socket.on("disconnect", () => {
      console.log(`Joueur ${playerId} déconnecté`);
      if (game.players[playerId]) {
        game.players[playerId].connected = false;
        socket.to(gameId).emit("playerLeft", { playerId });
      }
    });
  });

  // Action: finir son tour
  socket.on("endTurn", ({ gameId, playerId }) => {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    if (game.currentTurn !== playerId) {
      socket.emit("error", { message: "Pas votre tour" });
      return;
    }

    // Changer de joueur
    const players = Object.keys(game.players);
    const currentIndex = players.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % players.length;
    game.currentTurn = players[nextIndex];

    // Informer tous les joueurs
    io.to(gameId).emit("turnChanged", {
      currentTurn: game.currentTurn,
    });
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
