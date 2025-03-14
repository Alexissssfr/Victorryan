const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();
const crypto = require("crypto");
const gameCache = require("./backend/services/gameCache");
const cardManager = require("./backend/services/cardManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Afficher les chemins pour le débogage
console.log("Chemins de l'application:");
console.log("- Répertoire courant:", process.cwd());
console.log("- Chemin du frontend:", path.join(__dirname, "frontend"));
console.log("- Chemin du stock:", path.join(__dirname, "stock"));
console.log("- Structure des répertoires:");
console.log("  - backend/:", path.join(__dirname, "backend"));
console.log("  - backend/services/:", path.join(__dirname, "backend/services"));

// Configuration de base
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Servir les fichiers du dossier stock (pour les images des cartes)
app.use("/stock", express.static(path.join(__dirname, "stock")));

// Initialiser le module de gestion des jeux avec Socket.io
const gameManager = require("./backend/services/gameManager")(io);

// Routes pour les parties et les cartes
app.use("/games", require("./backend/routes/games"));
app.use("/cards", require("./backend/routes/cards"));

// Routes pour la gestion des parties
app.post("/api/games/create", async (req, res) => {
  try {
    const gameId = gameCache.createGame();
    const playerId = req.body.playerId || crypto.randomUUID();

    const game = gameCache.getGame(gameId);
    game.addPlayer(playerId); // Le créateur est player1

    res.json({
      success: true,
      gameId,
      playerId,
      state: game.getStateForPlayer(playerId),
    });
  } catch (error) {
    console.error("Erreur création partie:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création de la partie",
    });
  }
});

app.post("/api/games/join", async (req, res) => {
  try {
    const { gameId, playerId } = req.body;
    const game = gameCache.getGame(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Partie non trouvée",
      });
    }

    const playerRole = game.addPlayer(playerId);
    if (!playerRole) {
      return res.status(400).json({
        success: false,
        error: "Partie complète",
      });
    }

    if (playerRole === "player2") {
      await game.distributeInitialCards(cardManager);
    }

    res.json({
      success: true,
      state: game.getStateForPlayer(playerId),
    });
  } catch (error) {
    console.error("Erreur join partie:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la connexion à la partie",
    });
  }
});

// Routes de base
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// Route de diagnostic pour vérifier les chemins et les données des cartes
app.get("/api/diagnostic", (req, res) => {
  try {
    const cardManager = require("./backend/services/cardManager");
    const persoSample = cardManager.getRandomCards("perso", 1);
    const bonusSample = cardManager.getRandomCards("bonus", 1);

    res.json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      paths: {
        cwd: process.cwd(),
        frontend: path.join(__dirname, "frontend"),
        stock: path.join(__dirname, "stock"),
        backend: path.join(__dirname, "backend"),
      },
      cards: {
        persoSample,
        bonusSample,
      },
    });
  } catch (error) {
    console.error("Erreur lors du diagnostic:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      stack: error.stack,
    });
  }
});

// Route de diagnostic pour les SVG
app.get("/api/check-svg/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const cardManager = require("./backend/services/cardManager");
    const svg = await cardManager.loadCardSVG(type, id);

    res.json({
      success: true,
      svg: svg,
      cardId: id,
      type: type,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Configuration des WebSockets
io.on("connection", (socket) => {
  console.log("Un client s'est connecté:", socket.id);

  // Rejoindre une partie
  socket.on("joinGame", async ({ gameId, playerId }) => {
    try {
      const game = gameCache.getGame(gameId);
      if (!game) {
        socket.emit("error", { message: "Partie non trouvée" });
        return;
      }

      socket.join(gameId);
      console.log(`Joueur ${playerId} a rejoint la partie ${gameId}`);

      // Envoyer l'état actuel de la partie au joueur
      socket.emit("gameState", game.getStateForPlayer(playerId));

      // Notifier les autres joueurs
      socket.to(gameId).emit("playerJoined", { playerId });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Jouer un bonus
  socket.on("playBonus", async ({ gameId, playerId, bonusId, targetId }) => {
    try {
      const game = gameCache.getGame(gameId);
      if (!game) {
        socket.emit("error", { message: "Partie non trouvée" });
        return;
      }

      const newState = game.applyBonusToCard(bonusId, targetId, playerId);

      // Envoyer le nouvel état à tous les joueurs
      io.to(gameId).emit("gameStateUpdated", {
        player1State: game.getStateForPlayer(game.players.player1),
        player2State: game.getStateForPlayer(game.players.player2),
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Fin de tour
  socket.on("endTurn", ({ gameId, playerId }) => {
    try {
      const game = gameCache.getGame(gameId);
      if (!game) {
        socket.emit("error", { message: "Partie non trouvée" });
        return;
      }

      game.endTurn();

      // Envoyer le nouvel état à tous les joueurs
      io.to(gameId).emit("gameStateUpdated", {
        player1State: game.getStateForPlayer(game.players.player1),
        player2State: game.getStateForPlayer(game.players.player2),
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("Un client s'est déconnecté:", socket.id);
  });
});

// Port d'écoute
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
