// Entry point that redirects to the actual server file in the backend directory
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

// Initialisation
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Stockage des parties actives (déclaré une seule fois)
const activeGames = new Map();

// Chargement des données des cartes
let personnagesData = [];
let bonusData = [];

try {
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
}

// Fonction pour mélanger un tableau
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fonction pour générer un ID unique
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 10);
}

// Fonction pour initialiser les cartes d'un joueur
function initializePlayerCards() {
  if (personnagesData.length === 0 || bonusData.length === 0) {
    console.error("Données de cartes non disponibles");
    return { personnages: [], bonus: [] };
  }

  const personnages = shuffleArray(personnagesData).slice(0, 5).map(card => ({ ...card }));
  const bonus = shuffleArray(bonusData).slice(0, 5).map(card => ({ ...card }));
  
  return { personnages, bonus };
}

// ROUTES

// Route pour créer une nouvelle partie
app.post("/api/games", (req, res) => {
  try {
    const gameId = generateUniqueId();
    
    activeGames.set(gameId, {
      id: gameId,
      players: {},
      gameState: "waiting",
      currentTurn: null,
      createdAt: new Date().toISOString()
    });
    
    console.log(`Nouvelle partie créée avec l'ID: ${gameId}`);
    res.json({ success: true, gameId });
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    res.status(500).json({ success: false, error: "Erreur lors de la création de la partie" });
  }
});

// Route pour rejoindre une partie
app.post("/api/games/:gameId/join", (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerName } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ success: false, error: "Le nom du joueur est requis" });
    }
    
    if (!activeGames.has(gameId)) {
      return res.status(404).json({ success: false, error: "Partie non trouvée" });
    }
    
    const game = activeGames.get(gameId);
    
    // Vérifier si la partie est pleine
    if (Object.keys(game.players).length >= 2) {
      return res.status(403).json({ success: false, error: "La partie est pleine" });
    }
    
    const playerId = generateUniqueId();
    const playerCards = initializePlayerCards();
    
    // Initialiser l'état du joueur
    game.players[playerId] = {
      id: playerId,
      name: playerName,
      hand: playerCards,
      charactersState: {}
    };
    
    // Initialiser l'état des personnages du joueur
    playerCards.personnages.forEach(card => {
      game.players[playerId].charactersState[card.id] = {
        currentHealth: card.PV || 100,
        currentAttack: card.force_attaque || 30,
        currentTurns: card.tours_attaque || 2,
        activeBonus: []
      };
    });
    
    // Définir le premier joueur si c'est le premier à rejoindre
    if (Object.keys(game.players).length === 1) {
      game.currentTurn = playerId;
    }
    
    // Marquer le jeu comme "en cours" si deux joueurs ont rejoint
    if (Object.keys(game.players).length === 2) {
      game.gameState = "playing";
    }
    
    console.log(`Joueur ${playerName} (ID: ${playerId}) a rejoint la partie ${gameId}`);
    res.json({ success: true, gameId, playerId });
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Socket.IO
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion WebSocket: ${socket.id}`);
  
  // Rejoindre une salle de jeu
  socket.on("joinGameRoom", ({ gameId, playerId }) => {
    console.log(`Tentative de rejoindre la salle ${gameId} pour le joueur ${playerId}`);
    
    if (!activeGames.has(gameId)) {
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }
    
    const game = activeGames.get(gameId);
    
    if (!game.players[playerId]) {
      socket.emit("error", { message: "Joueur non trouvé dans cette partie" });
      return;
    }
    
    // Associer l'ID du socket au joueur
    game.players[playerId].socketId = socket.id;
    game.players[playerId].connected = true;
    
    // Rejoindre la salle du jeu
    socket.join(gameId);
    console.log(`Socket ${socket.id} (Joueur ${playerId}) a rejoint la salle ${gameId}`);
    
    // Envoyer l'état du jeu au joueur qui vient de se connecter
    socket.emit("gameJoined", { 
      gameId,
      playerId,
      game: JSON.parse(JSON.stringify(game)) // Copie pour éviter les références circulaires
    });
    
    // Informer les autres joueurs de la salle
    socket.to(gameId).emit("playerConnected", {
      playerId,
      playerName: game.players[playerId].name
    });
    
    // Si tous les joueurs sont connectés et que la partie est prête à commencer
    const allPlayersConnected = Object.values(game.players).every(p => p.connected);
    if (game.gameState === "playing" && Object.keys(game.players).length === 2 && allPlayersConnected) {
      io.to(gameId).emit("gameReady", { 
        game: JSON.parse(JSON.stringify(game)),
        startingPlayer: game.currentTurn
      });
    }
    
    // Gérer la fin de tour
    socket.on("endTurn", () => {
      if (game.currentTurn !== playerId) {
        socket.emit("error", { message: "Ce n'est pas votre tour" });
        return;
      }
      
      // Trouver l'autre joueur
      const otherPlayerId = Object.keys(game.players).find(id => id !== playerId);
      
      if (otherPlayerId) {
        game.currentTurn = otherPlayerId;
        io.to(gameId).emit("turnChanged", { currentTurn: otherPlayerId });
      }
    });
    
    // Gérer la déconnexion
    socket.on("disconnect", () => {
      console.log(`Joueur ${playerId} déconnecté de la partie ${gameId}`);
      
      if (game && game.players[playerId]) {
        game.players[playerId].connected = false;
        game.players[playerId].socketId = null;
        
        // Informer l'autre joueur
        socket.to(gameId).emit("playerDisconnected", { playerId });
      }
    });
    
    // Événements de jeu spécifiques ici (playBonus, attack, etc.)
  });
});

// Route pour obtenir l'état d'une partie
app.get("/api/games/:gameId", (req, res) => {
  const { gameId } = req.params;
  
  if (!activeGames.has(gameId)) {
    return res.status(404).json({ success: false, error: "Partie non trouvée" });
  }
  
  const game = JSON.parse(JSON.stringify(activeGames.get(gameId)));
  res.json({ success: true, game });
});

// Démarrer le serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

});
