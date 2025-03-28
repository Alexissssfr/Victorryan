// Entry point that redirects to the actual server file in the backend directory
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static("public"));

// Ajout d'un stockage en mémoire pour les parties actives
const activeGames = {};

// Route pour créer une nouvelle partie
app.post("/api/games", (req, res) => {
  const gameId = generateUniqueId(); // Fonction pour générer un ID unique
  activeGames[gameId] = {
    id: gameId,
    players: [],
    // Autres informations de jeu initiales
  };

  console.log(`Nouvelle partie créée avec l'ID: ${gameId}`);
  res.json({ gameId });
});

// Route pour rejoindre une partie existante
app.post("/api/games/:gameId/join", (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body;

  if (!activeGames[gameId]) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  // Ajouter le joueur à la partie
  const playerId = generateUniqueId();
  activeGames[gameId].players.push({
    id: playerId,
    name: playerName,
  });

  console.log(`Joueur ${playerName} a rejoint la partie ${gameId}`);
  res.json({ gameId, playerId });
});

// Fonction pour générer un ID unique
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 10);
}

// Configuration WebSocket pour la communication en temps réel
io.on("connection", (socket) => {
  console.log("Nouvelle connexion WebSocket");

  // Gérer un joueur qui rejoint une partie
  socket.on("joinGame", ({ gameId, playerId }) => {
    if (!activeGames[gameId]) {
      socket.emit("error", "Partie non trouvée");
      return;
    }

    console.log(`WebSocket: Joueur ${playerId} a rejoint la partie ${gameId}`);
    socket.join(gameId); // Rejoindre le channel de la partie

    // Informer les autres joueurs qu'un nouveau joueur a rejoint
    socket.to(gameId).emit("playerJoined", {
      playerId,
      playerName: getPlayerName(gameId, playerId),
    });

    // Envoyer l'état actuel de la partie au nouveau joueur
    socket.emit("gameState", activeGames[gameId]);
  });

  // ... autres événements WebSocket ...
});

function getPlayerName(gameId, playerId) {
  const game = activeGames[gameId];
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
