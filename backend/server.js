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
