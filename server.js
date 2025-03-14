const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Afficher les chemins pour le débogage
console.log("Chemins de l'application:");
console.log("- Répertoire courant:", process.cwd());
console.log("- Chemin du frontend:", path.join(__dirname, "frontend"));
console.log("- Chemin du stock:", path.join(__dirname, "stock"));

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

// Routes de base
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// Route de diagnostic pour vérifier les chemins et les données des cartes
app.get("/api/diagnostic", (req, res) => {
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
    },
    cards: {
      persoSample,
      bonusSample,
    },
  });
});

// Configuration des WebSockets
io.on("connection", (socket) => {
  console.log("Un client s'est connecté:", socket.id);

  socket.on("joinGame", ({ gameId, playerId }) => {
    socket.join(gameId);
    console.log(`Joueur ${playerId} a rejoint la partie ${gameId}`);
  });

  socket.on("playCard", ({ gameId, playerId, cardData }) => {
    // Informer les autres joueurs de la carte jouée
    socket.to(gameId).emit("cardPlayed", { playerId, cardData });
  });

  socket.on("endTurn", ({ gameId, playerId }) => {
    // Informer les autres joueurs de la fin du tour
    socket.to(gameId).emit("turnEnded", { playerId });
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
