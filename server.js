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

// Stockage des parties actives
const games = new Map();

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
    console.log(
      "Fichiers de cartes introuvables. Création de données de test."
    );
    // Créer des données de test si les fichiers n'existent pas
    personnagesData = Array(20)
      .fill()
      .map((_, i) => ({
        id: `P${i + 1}`,
        nomcarteperso: `Personnage ${i + 1}`,
        pointsdevie: "100",
        forceattaque: `${30 + Math.floor(Math.random() * 20)}`,
        tourattaque: `${1 + Math.floor(Math.random() * 3)}`,
        nomdupouvoir: `Pouvoir ${i + 1}`,
        description: `Description du personnage ${i + 1}`,
      }));

    bonusData = Array(20)
      .fill()
      .map((_, i) => ({
        id: `B${i + 1}`,
        nomcartebonus: `Bonus ${i + 1}`,
        pourcentagebonus: `${10 + Math.floor(Math.random() * 20)}`,
        tourbonus: `${1 + Math.floor(Math.random() * 3)}`,
        nomdupouvoir: `Effet ${i + 1}`,
        description: `Description du bonus ${i + 1}`,
      }));
  }
} catch (error) {
  console.error("Erreur lors du chargement des données de cartes:", error);
  // Créer des données de secours en cas d'erreur
  personnagesData = [];
  bonusData = [];
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

// Route de santé pour vérifier que le serveur fonctionne
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Page d'accueil
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Créer une partie
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

// Rejoindre une partie
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
    charactersState: {},
  };

  // Initialiser l'état des personnages du joueur
  cards.personnages.forEach((card) => {
    game.players[playerId].charactersState[card.id] = {
      currentHealth: parseInt(card.pointsdevie) || 100,
      currentAttack: parseInt(card.forceattaque) || 30,
      currentTurns: parseInt(card.tourattaque) || 2,
      activeBonus: [],
    };
  });

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
    console.log(
      `Tentative de rejoindre la salle ${gameId} pour le joueur ${playerId}`
    );

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
    console.log(
      `Socket ${socket.id} (Joueur ${playerId}) a rejoint la salle ${gameId}`
    );

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

    // Fin de tour
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

    // Jouer une carte bonus
    socket.on(
      "playBonus",
      ({ gameId, playerId, bonusId, targetCharacterId }) => {
        if (!games.has(gameId)) return;

        const game = games.get(gameId);

        if (game.currentTurn !== playerId) {
          socket.emit("error", { message: "Pas votre tour" });
          return;
        }

        const player = game.players[playerId];
        if (!player) return;

        // Trouver la carte bonus
        const bonusCard = player.cards.bonus.find((c) => c.id === bonusId);
        if (!bonusCard) {
          socket.emit("error", { message: "Carte bonus non trouvée" });
          return;
        }

        // Trouver la carte personnage cible
        const characterState = player.charactersState[targetCharacterId];
        if (!characterState) {
          socket.emit("error", { message: "Personnage cible non trouvé" });
          return;
        }

        // Appliquer le bonus
        const bonusPercentage = parseInt(bonusCard.pourcentagebonus) || 0;
        const bonusTurns = parseInt(bonusCard.tourbonus) || 1;

        // Sauvegarder la valeur d'attaque originale si ce n'est pas déjà fait
        if (!characterState.baseAttack) {
          characterState.baseAttack = characterState.currentAttack;
        }

        // Calculer la nouvelle attaque: force * (1 + bonus/100)
        characterState.currentAttack = Math.floor(
          characterState.baseAttack * (1 + bonusPercentage / 100)
        );

        // Ajouter le bonus aux bonus actifs
        if (!characterState.activeBonus) {
          characterState.activeBonus = [];
        }

        characterState.activeBonus.push({
          bonusId: bonusId,
          remainingTurns: bonusTurns,
          percentage: bonusPercentage,
          name: bonusCard.nomcartebonus,
        });

        // Informer tous les joueurs
        io.to(gameId).emit("bonusPlayed", {
          playerId,
          bonusId,
          targetCharacterId,
          bonusName: bonusCard.nomcartebonus,
          targetName: player.cards.personnages.find(
            (c) => c.id === targetCharacterId
          )?.nomcarteperso,
          percentage: bonusPercentage,
          newGameState: JSON.parse(JSON.stringify(game)),
        });
      }
    );

    // Attaquer un personnage
    socket.on(
      "attackCharacter",
      ({ gameId, playerId, attackerId, targetId }) => {
        if (!games.has(gameId)) return;

        const game = games.get(gameId);

        if (game.currentTurn !== playerId) {
          socket.emit("error", { message: "Pas votre tour" });
          return;
        }

        // Trouver l'attaquant
        const player = game.players[playerId];
        if (!player || !player.charactersState[attackerId]) {
          socket.emit("error", { message: "Attaquant non trouvé" });
          return;
        }

        // Trouver la cible
        let targetPlayer = null;
        let targetCharacter = null;

        for (const pid in game.players) {
          if (pid !== playerId) {
            const p = game.players[pid];
            if (p.charactersState[targetId]) {
              targetPlayer = p;
              targetCharacter = p.charactersState[targetId];
              break;
            }
          }
        }

        if (!targetPlayer || !targetCharacter) {
          socket.emit("error", { message: "Cible non trouvée" });
          return;
        }

        // Vérifier si l'attaquant a des tours d'attaque
        const attacker = player.charactersState[attackerId];
        if (attacker.currentTurns <= 0) {
          socket.emit("error", {
            message: "Plus de tours d'attaque disponibles",
          });
          return;
        }

        // Calcul des dégâts
        const damage = attacker.currentAttack;
        targetCharacter.currentHealth = Math.max(
          0,
          targetCharacter.currentHealth - damage
        );

        // Réduire le nombre de tours d'attaque
        attacker.currentTurns--;

        // Vérifier la victoire/défaite
        let gameOver = false;
        let winner = null;

        // Vérifier si toutes les cartes d'un joueur sont à 0 PV
        const allPlayersStatus = {};

        for (const pid in game.players) {
          const p = game.players[pid];
          const hasAliveCharacters = Object.values(p.charactersState).some(
            (c) => c.currentHealth > 0
          );
          allPlayersStatus[pid] = hasAliveCharacters;

          if (!hasAliveCharacters) {
            gameOver = true;
            // Le gagnant est l'autre joueur
            winner = Object.keys(game.players).find((id) => id !== pid);
          }
        }

        // Mettre à jour l'état du jeu
        if (gameOver) {
          game.status = "finished";
          game.winner = winner;
        }

        // Informer tous les joueurs
        io.to(gameId).emit("characterAttacked", {
          attackerId,
          targetId,
          damage,
          attackerName: player.cards.personnages.find(
            (c) => c.id === attackerId
          )?.nomcarteperso,
          targetName: targetPlayer.cards.personnages.find(
            (c) => c.id === targetId
          )?.nomcarteperso,
          gameOver,
          winner,
          newGameState: JSON.parse(JSON.stringify(game)),
        });
      }
    );

    // Gérer la déconnexion
    socket.on("disconnect", () => {
      console.log(`Joueur ${playerId} déconnecté de la partie ${gameId}`);

      if (game && game.players[playerId]) {
        game.players[playerId].connected = false;
        socket.to(gameId).emit("playerLeft", { playerId });
      }
    });
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
