const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const gameRoutes = require("./routes/gameRoutes");
const cardRoutes = require("./routes/cardRoutes");
const gameManager = require("./services/gameManager");

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();
const server = http.createServer(app);

// Configurer CORS
app.use(cors());
app.use(express.json());

// Configurer les routes
app.use("/api/games", gameRoutes);
app.use("/api/cards", cardRoutes);

// Configurer Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Gérer les connexions WebSocket
io.on("connection", (socket) => {
  console.log(`Nouveau client connecté: ${socket.id}`);

  // Rejoindre une partie
  socket.on("join_game", (gameId) => {
    socket.join(gameId);
    console.log(`Client ${socket.id} a rejoint la partie ${gameId}`);
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
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
