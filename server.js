const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

// Initialisation
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuration
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Log au démarrage pour s'assurer que le dossier public est correctement configuré
console.log("Dossier public configuré:", path.join(__dirname, "public"));

// Données en mémoire pour les parties
const games = new Map();

// Charger les données des cartes (ou créer des données de test si les fichiers n'existent pas)
let personnagesData = [];
let bonusData = [];

try {
  // Essayer de charger depuis des fichiers
  const personnagesPath = path.join(__dirname, "stock", "personnages.json");
  const bonusPath = path.join(__dirname, "stock", "bonus.json");

  if (fs.existsSync(personnagesPath) && fs.existsSync(bonusPath)) {
    personnagesData = JSON.parse(fs.readFileSync(personnagesPath, "utf-8"));
    bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf-8"));
    console.log("Données des cartes chargées avec succès");
  } else {
    console.error("Fichiers de cartes introuvables. Vérifiez les chemins.");
  }
} catch (error) {
  console.error("Erreur lors du chargement des données de cartes:", error);
  // Créer quelques données de test minimales
  personnagesData = Array(20)
    .fill()
    .map((_, i) => ({
      id: `P${i + 1}`,
      nom: `Personnage ${i + 1}`,
      PV: 100,
      force_attaque: 30,
      tours_attaque: 2,
      description: "Personnage de test",
    }));

  bonusData = Array(20)
    .fill()
    .map((_, i) => ({
      id: `B${i + 1}`,
      nom: `Bonus ${i + 1}`,
      effet: "Augmentation d'attaque",
      pourcentage: 20,
      tours: 2,
      description: "Bonus de test",
    }));
}

// Fonctions utilitaires
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function distributeCards() {
  // Mélanger et sélectionner 5 cartes de chaque type
  const personnages = shuffleArray(personnagesData).slice(0, 5);
  const bonus = shuffleArray(bonusData).slice(0, 5);

  return {
    personnages: personnages.map((card) => ({ ...card })), // Copie pour éviter le partage
    bonus: bonus.map((card) => ({ ...card })),
  };
}

// Route de base
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Vérification de l'état du serveur
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes API
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
  const cards = distributeCards();

  // Initialiser l'état du joueur avec ses cartes
  game.players[playerId] = {
    id: playerId,
    name: name,
    cards: cards,
    // Initialiser l'état des personnages
    charactersState: cards.personnages.reduce((acc, card) => {
      acc[card.id] = {
        currentHealth: card.PV,
        currentAttack: card.force_attaque,
        currentTurns: card.tours_attaque,
        activeBonus: [],
      };
      return acc;
    }, {}),
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
    game.players[playerId].connected = true;
    console.log(`Joueur ${playerId} connecté à la salle ${gameId}`);

    // Informer le joueur de l'état actuel
    socket.emit("gameState", {
      game: JSON.parse(JSON.stringify(game)),
      playerId: playerId,
    });

    // Informer les autres joueurs
    socket.to(gameId).emit("playerJoined", {
      playerId: playerId,
      playerName: game.players[playerId].name,
    });

    // Si tous les joueurs sont connectés et la partie est en cours
    if (
      game.status === "playing" &&
      Object.values(game.players).every((p) => p.connected)
    ) {
      io.to(gameId).emit("gameReady", {
        game: JSON.parse(JSON.stringify(game)),
        startingPlayer: game.currentTurn,
      });
    }

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

  // Action: jouer une carte bonus
  socket.on("playBonus", ({ gameId, playerId, bonusId, targetCharacterId }) => {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    if (game.currentTurn !== playerId) {
      socket.emit("error", { message: "Pas votre tour" });
      return;
    }

    // Logique pour appliquer le bonus
    // (pour l'exemple, simplement notifier tout le monde)
    io.to(gameId).emit("bonusPlayed", {
      playerId,
      bonusId,
      targetCharacterId,
    });
  });

  // Action: attaquer un personnage
  socket.on("attackCharacter", ({ gameId, playerId, attackerId, targetId }) => {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    if (game.currentTurn !== playerId) {
      socket.emit("error", { message: "Pas votre tour" });
      return;
    }

    // Logique pour effectuer l'attaque
    // (pour l'exemple, simplement notifier tout le monde)
    io.to(gameId).emit("characterAttacked", {
      attackerId,
      targetId,
    });
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
