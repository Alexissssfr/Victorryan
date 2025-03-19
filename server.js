const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const crypto = require("crypto");
const gameCache = require("./backend/services/gameCache");
const cardManager = require("./backend/services/cardManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
app.use(express.static(frontendPath));

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
const gameManager = require("./backend/services/gameManager")(io);

// Routes pour les parties et les cartes
app.use("/games", require("./backend/routes/games"));
app.use("/cards", require("./backend/routes/cards"));

// Routes pour la gestion des parties
app.post("/api/games/create", async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      throw new Error("playerId requis");
    }

    const result = await gameCache.createGame(playerId);
    res.json({
      success: true,
      gameId: result.gameId,
      playerId: playerId,
      state: result.state,
    });
  } catch (error) {
    console.error("Erreur création partie:", error);
    res.status(500).json({
      success: false,
      error: error.message,
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

    // S'assurer que les cartes sont distribuées
    if (!game.cards.player1.perso.length) {
      await game.distributeInitialCards(cardManager);
    }

    res.json({
      success: true,
      state: game.getStateForPlayer(playerId),
    });

    // Notifier l'autre joueur de la mise à jour
    const otherPlayerId =
      playerRole === "player1" ? game.players.player2 : game.players.player1;
    if (otherPlayerId) {
      io.to(gameId).emit("gameState", game.getStateForPlayer(otherPlayerId));
    }
  } catch (error) {
    console.error("Erreur join partie:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la connexion à la partie",
    });
  }
});

// Route pour le tirage des cartes
app.post("/api/games/draw-cards", async (req, res) => {
  try {
    const { gameId, playerId } = req.body;
    const game = gameCache.getGame(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Partie non trouvée",
      });
    }

    // Vérifier que c'est bien le créateur
    if (game.players.player1 !== playerId) {
      return res.status(403).json({
        success: false,
        error: "Seul le créateur peut tirer les cartes",
      });
    }

    // Distribuer les cartes
    await game.distributeInitialCards(cardManager);

    // Envoyer l'état mis à jour aux deux joueurs via WebSocket
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

    // Répondre au créateur
    res.json({
      success: true,
      state: game.getStateForPlayer(playerId),
    });
  } catch (error) {
    console.error("Erreur tirage cartes:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du tirage des cartes",
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
  console.log("Un client s'est connecté:", socket.id);

  socket.on("joinGame", async ({ gameId, playerId }) => {
    try {
      console.log(`Tentative de rejoindre la partie ${gameId} par ${playerId}`);
      console.log("Parties existantes:", Array.from(gameCache.games.keys()));

      const game = gameCache.getGame(gameId);
      if (!game) {
        console.log(`Partie ${gameId} non trouvée`);
        throw new Error("Partie non trouvée");
      }

      console.log("État actuel de la partie:", {
        players: game.players,
        status: game.status,
      });

      const playerRole = game.addPlayer(playerId);
      if (!playerRole) {
        console.log("Impossible d'ajouter le joueur, partie pleine");
        throw new Error("Impossible de rejoindre la partie");
      }

      socket.join(gameId);
      console.log(`Joueur ${playerId} ajouté comme ${playerRole}`);

      // Si c'est le second joueur, distribuer les cartes
      if (playerRole === "player2") {
        const cardManager = require("./backend/services/cardManager");
        await game.distributeInitialCards(cardManager);
      }

      // Envoyer l'état actuel au joueur qui rejoint
      socket.emit("gameState", game.getStateForPlayer(playerId));

      // Notifier l'autre joueur
      const otherPlayerId =
        game.players[playerRole === "player1" ? "player2" : "player1"];
      if (otherPlayerId) {
        socket
          .to(gameId)
          .emit("gameState", game.getStateForPlayer(otherPlayerId));
      }

      socket.to(gameId).emit("playerJoined", { playerId });
    } catch (error) {
      console.error("Erreur joinGame:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("Un client s'est déconnecté:", socket.id);
  });

  socket.on(
    "attackCard",
    async ({ gameId, playerId, attackerId, targetId }) => {
      try {
        console.log(
          `Attaque de ${attackerId} vers ${targetId} par ${playerId}`
        );

        const game = gameCache.getGame(gameId);
        if (!game) {
          throw new Error("Partie non trouvée");
        }

        // Effectuer l'attaque
        const result = game.attackCard(attackerId, targetId, playerId);

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

// Port d'écoute
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
