const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const gameRoutes = require("./routes/gameRoutes");
const cardRoutes = require("./routes/cardRoutes");
const gameManager = require("./services/gameManager");

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();
const server = http.createServer(app);

// Configurer CORS avec options avancées
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use("/src", express.static(path.join(__dirname, "../frontend/src")));

// Configurer les routes de l'API
app.use("/api/games", gameRoutes);
app.use("/api/cards", cardRoutes);

// Route principale qui renvoie le fichier index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.stack);
  res.status(500).json({
    error: "Une erreur est survenue sur le serveur",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Configurer Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Gérer les connexions WebSocket
io.on("connection", (socket) => {
  console.log(`Nouveau client connecté: ${socket.id}`);

  // Rejoindre une partie
  socket.on("join_game", (data) => {
    // Accepter à la fois le format objet et le format chaîne pour rétrocompatibilité
    const gameId = typeof data === "object" ? data.gameId : data;
    const playerId = typeof data === "object" ? data.playerId : null;

    if (!gameId) {
      socket.emit("error", { message: "ID de partie manquant" });
      return;
    }

    // Rejoindre la salle socket.io
    socket.join(gameId);

    // Stocker l'ID du joueur dans l'objet socket
    if (playerId) {
      socket.playerId = playerId;
    }

    console.log(
      `Client ${socket.id} a rejoint la partie ${gameId}${
        playerId ? ` en tant que joueur ${playerId}` : ""
      }`
    );

    // Si l'ID du joueur est fourni, mettre à jour le statut de connexion
    if (playerId) {
      try {
        const gameState = gameManager.updatePlayerConnection(
          gameId,
          playerId,
          true
        );
        if (gameState) {
          // Émettre une mise à jour de l'état de jeu à tous les clients dans cette partie
          io.to(gameId).emit("game_update", gameState);
        }
      } catch (error) {
        console.error(
          `Erreur lors de la mise à jour de la connexion: ${error.message}`
        );
        socket.emit("error", { message: error.message });
      }
    }
  });

  // Jouer une carte
  socket.on("play_card", ({ gameId, playerId, cardId, targetId }) => {
    try {
      const gameState = gameManager.playCard(
        gameId,
        playerId,
        cardId,
        targetId
      );
      io.to(gameId).emit("game_update", gameState);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Faire une attaque
  socket.on("attack", ({ gameId, playerId, attackerId, targetId }) => {
    try {
      const gameState = gameManager.attack(
        gameId,
        playerId,
        attackerId,
        targetId
      );
      io.to(gameId).emit("game_update", gameState);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Terminer le tour
  socket.on("end_turn", ({ gameId, playerId }) => {
    try {
      const gameState = gameManager.endTurn(gameId, playerId);
      io.to(gameId).emit("game_update", gameState);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log(`Client déconnecté: ${socket.id}`);

    // Récupérer les parties où ce socket était actif
    const socketRooms = Array.from(socket.rooms || []);
    const gameIds = socketRooms.filter((room) => room !== socket.id);

    // Récupérer l'ID du joueur s'il est disponible dans le socket
    const playerId = socket.playerId;

    if (playerId && gameIds.length > 0) {
      // Marquer le joueur comme déconnecté dans toutes les parties
      gameIds.forEach((gameId) => {
        try {
          const gameState = gameManager.updatePlayerConnection(
            gameId,
            playerId,
            false
          );
          if (gameState) {
            // Informer les autres joueurs de la déconnexion
            io.to(gameId).emit("game_update", gameState);
          }
        } catch (error) {
          console.error(
            `Erreur lors de la mise à jour de la déconnexion: ${error.message}`
          );
        }
      });
    }
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
