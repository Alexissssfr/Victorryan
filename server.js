const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();
const crypto = require("crypto");
const gameCache = require("./backend/services/gameCache");
const cardManager = require("./backend/services/cardManager");
const { GameManager } = require("./backend/services/gameManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Configuration des chemins
const frontendPath = path.join(__dirname, "frontend");
const stockPath = path.join(__dirname, "stock");

console.log("Chemins de l'application:");
console.log("- Répertoire courant:", __dirname);
console.log("- Chemin du frontend:", frontendPath);
console.log("- Chemin du stock:", stockPath);
console.log("- Structure des répertoires:");
console.log("  - backend/:", path.join(__dirname, "backend"));
console.log("  - backend/services/:", path.join(__dirname, "backend/services"));

// Configuration de base
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "frontend/build")));

// Servir les fichiers du dossier stock (pour les images des cartes)
app.use("/stock", express.static(stockPath));

// Servir les fichiers SVG
app.use(
  "/stock/svg_perso",
  express.static(path.join(__dirname, "stock/svg_perso"))
);
app.use(
  "/stock/svg_bonus",
  express.static(path.join(__dirname, "stock/svg_bonus"))
);

// Initialiser le module de gestion des jeux avec Socket.io
const gameManager = new GameManager();

// Routes pour les parties et les cartes
app.use("/games", require("./backend/routes/games"));
app.use("/cards", require("./backend/routes/cards"));

// Routes pour la gestion des parties
app.post("/api/games", (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: "playerId is required" });
    }

    const game = gameManager.createGame();
    game.addPlayer(playerId);

    res.json({ gameId: game.gameId });
  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:gameId/join", (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: "playerId is required" });
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (!game.canJoin()) {
      return res.status(400).json({ error: "Game is full" });
    }

    game.addPlayer(playerId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error joining game:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:gameId/bonus", (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, bonusCardId, targetCardId } = req.body;

    if (!playerId || !bonusCardId || !targetCardId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const result = game.playBonus(playerId, bonusCardId, targetCardId);
    io.to(gameId).emit("gameStateUpdate", game.getStateForPlayer(playerId));
    res.json(result);
  } catch (error) {
    console.error("Error playing bonus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:gameId/attack", (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, attackerCardId, targetCardId } = req.body;

    if (!playerId || !attackerCardId || !targetCardId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const result = game.attack(playerId, attackerCardId, targetCardId);
    io.to(gameId).emit("gameStateUpdate", game.getStateForPlayer(playerId));
    res.json(result);
  } catch (error) {
    console.error("Error attacking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:gameId/end-turn", (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: "playerId is required" });
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    game.endTurn(playerId);
    io.to(gameId).emit("gameStateUpdate", game.getStateForPlayer(playerId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error ending turn:", error);
    res.status(500).json({ error: "Internal server error" });
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

// Route de diagnostic pour les images
app.get("/api/check-image/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const card = await cardManager.getCard(type, id);

    res.json({
      success: true,
      card: {
        id: card.id,
        type: card.type,
        fond: card.fond,
        svgContent: card.svgContent ? "présent" : "absent",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Route de test pour les URLs des images
app.get("/api/test-image-url/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const { getImageUrl } = require("./backend/config/supabase");

  const imageUrl = getImageUrl(type, id);

  res.json({
    url: imageUrl,
    testUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${type}/${id}.png`,
    type,
    id,
  });
});

// Gestion des WebSockets
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinGame", async ({ gameId, playerId }) => {
    socket.join(gameId);
    const game = gameManager.getGame(gameId);
    if (game) {
      socket.emit("gameStateUpdate", game.getStateForPlayer(playerId));
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on(
    "attackCard",
    async ({ gameId, playerId, attackerId, targetId }) => {
      try {
        console.log(
          `Attaque de ${attackerId} vers ${targetId} par ${playerId}`
        );

        const game = gameManager.getGame(gameId);
        if (!game) {
          throw new Error("Partie non trouvée");
        }

        // Effectuer l'attaque
        const result = game.attackCard(attackerId, targetId, playerId);

        // Changer le tour après l'attaque
        const currentPlayer = game.currentTurn.player;
        const nextPlayer = currentPlayer === "player1" ? "player2" : "player1";
        game.currentTurn = {
          player: nextPlayer,
          selectedBonus: null,
          targetPerso: null,
        };

        // Envoyer le nouvel état aux deux joueurs
        io.to(gameId).emit(
          "gameState",
          game.getStateForPlayer(game.players.player1)
        );
        if (game.players.player2) {
          io.to(gameId).emit(
            "gameState",
            game.getStateForPlayer(game.players.player2)
          );
        }

        // Envoyer une notification d'attaque
        io.to(gameId).emit("attackPerformed", {
          attackerId,
          targetId,
          damage: result.damage,
          remainingHP: result.remainingHP,
        });
      } catch (error) {
        console.error("Erreur lors de l'attaque:", error);
        socket.emit("error", { message: error.message });
      }
    }
  );
});

// Route par défaut pour le client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Port d'écoute
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
