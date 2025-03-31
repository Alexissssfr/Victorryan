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

// Structure pour stocker les bonus par partie
const gameBonus = new Map();

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

  // Initialiser la structure des bonus pour cette partie
  gameBonus.set(gameId, {
    player1: new Map(),
    player2: new Map(),
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

      // Vérifier si la partie est terminée car plus de tours d'attaque
      let allPlayersOutOfTurns = true;

      for (const pid in game.players) {
        const p = game.players[pid];
        const hasAttackTurnsLeft = Object.values(p.charactersState).some(
          (c) => c.currentHealth > 0 && c.currentTurns > 0
        );

        if (hasAttackTurnsLeft) {
          allPlayersOutOfTurns = false;
          break;
        }
      }

      if (allPlayersOutOfTurns) {
        // Si plus de tours d'attaque pour personne, terminer la partie
        game.status = "finished";

        // Déterminer le vainqueur en comparant les PV restants
        const playersTotalHealth = {};

        for (const pid in game.players) {
          playersTotalHealth[pid] = Object.values(
            game.players[pid].charactersState
          ).reduce((total, char) => total + char.currentHealth, 0);
        }

        const playerIds = Object.keys(playersTotalHealth);

        if (playerIds.length === 2) {
          if (
            playersTotalHealth[playerIds[0]] > playersTotalHealth[playerIds[1]]
          ) {
            game.winner = playerIds[0];
          } else if (
            playersTotalHealth[playerIds[1]] > playersTotalHealth[playerIds[0]]
          ) {
            game.winner = playerIds[1];
          } else {
            game.winner = "tie"; // Match nul
          }
        }

        // Informer tous les joueurs de la fin de partie
        io.to(gameId).emit("gameOver", {
          reason: "no_attack_turns",
          winner: game.winner,
          playersTotalHealth: playersTotalHealth,
          newGameState: JSON.parse(JSON.stringify(game)),
        });

        return;
      }

      // Si la partie continue, passer au joueur suivant
      const players = Object.keys(game.players);
      const currentIndex = players.indexOf(playerId);
      const nextIndex = (currentIndex + 1) % players.length;
      game.currentTurn = players[nextIndex];

      // Réinitialiser les flags pour le nouveau joueur
      game.attackPerformed = false;
      game.bonusPlayedThisTurn = false;
      game.lastBonusTarget = null;

      // Informer tous les joueurs
      io.to(gameId).emit("turnChanged", {
        currentTurn: game.currentTurn,
        newGameState: JSON.parse(JSON.stringify(game)),
      });
    });

    // Jouer une carte bonus
    socket.on("playBonus", (data) => {
      const { gameId, playerId, bonusId, targetId } = data;
      const game = games.get(gameId);
      const gameBonusState = gameBonus.get(gameId);

      if (!game || !gameBonusState) {
        socket.emit("error", { message: "Partie non trouvée" });
        return;
      }

      const playerKey = Object.keys(game.players).find(
        (key) => game.players[key].id === playerId
      );

      if (!playerKey || game.currentTurn !== playerId) {
        socket.emit("error", { message: "Ce n'est pas votre tour" });
        return;
      }

      const player = game.players[playerKey];
      const bonusCard = player.cards.bonus.find((card) => card.id === bonusId);

      if (!bonusCard) {
        socket.emit("error", { message: "Carte bonus non trouvée" });
        return;
      }

      // Stocker le bonus dans la structure isolée
      const playerBonusMap =
        gameBonusState[playerKey === "player1" ? "player1" : "player2"];
      if (!playerBonusMap.has(targetId)) {
        playerBonusMap.set(targetId, []);
      }

      playerBonusMap.get(targetId).push({
        id: bonusId,
        turns: parseInt(bonusCard.tourbonus),
        percentage: parseInt(bonusCard.pourcentagebonus),
      });

      // Retirer la carte bonus de la main du joueur
      player.cards.bonus = player.cards.bonus.filter(
        (card) => card.id !== bonusId
      );

      // Émettre l'événement de bonus joué
      io.to(gameId).emit("bonusPlayed", {
        gameId,
        playerId,
        bonusId,
        targetId,
        game,
      });
    });

    // Attaquer un personnage
    socket.on("attack", (data) => {
      const { gameId, playerId, attackerId, targetId } = data;
      const game = games.get(gameId);
      const gameBonusState = gameBonus.get(gameId);

      if (!game || !gameBonusState) {
        socket.emit("error", { message: "Partie non trouvée" });
        return;
      }

      const playerKey = Object.keys(game.players).find(
        (key) => game.players[key].id === playerId
      );

      if (!playerKey || game.currentTurn !== playerId) {
        socket.emit("error", { message: "Ce n'est pas votre tour" });
        return;
      }

      const player = game.players[playerKey];
      const attackerCard = player.cards.personnages.find(
        (card) => card.id === attackerId
      );

      if (!attackerCard || attackerCard.toursRestants <= 0) {
        socket.emit("error", { message: "Cette carte ne peut pas attaquer" });
        return;
      }

      // Calculer la force d'attaque avec les bonus
      let attackPower = parseInt(attackerCard.force_attaque);
      const playerBonusMap =
        gameBonusState[playerKey === "player1" ? "player1" : "player2"];
      const activeBonus = playerBonusMap.get(attackerId) || [];

      // Appliquer tous les bonus actifs
      for (const bonus of activeBonus) {
        attackPower = Math.floor(attackPower * (1 + bonus.percentage / 100));
      }

      // Trouver la cible
      const opponentKey = playerKey === "player1" ? "player2" : "player1";
      const opponent = game.players[opponentKey];
      const targetCard = opponent.cards.personnages.find(
        (card) => card.id === targetId
      );

      if (!targetCard) {
        socket.emit("error", { message: "Cible non trouvée" });
        return;
      }

      // Appliquer les dégâts
      targetCard.pointsdevie = Math.max(
        0,
        parseInt(targetCard.pointsdevie) - attackPower
      );

      // Décrémenter le nombre de tours d'attaque
      attackerCard.toursRestants--;

      // Vérifier si la partie est terminée
      const isGameOver = opponent.cards.personnages.every(
        (card) => parseInt(card.pointsdevie) <= 0
      );

      if (isGameOver) {
        game.status = "finished";
        game.winner = playerId;

        // Nettoyer les données de la partie
        setTimeout(() => {
          games.delete(gameId);
          gameBonus.delete(gameId);
        }, 300000); // Nettoyage après 5 minutes
      }

      // Émettre l'événement d'attaque
      io.to(gameId).emit("characterAttacked", {
        gameId,
        attackerId,
        targetId,
        damage: attackPower,
        newHealth: targetCard.pointsdevie,
        isGameOver,
        winner: game.winner,
        game,
      });
    });

    // Gérer la déconnexion
    socket.on("disconnect", () => {
      console.log(`Joueur ${playerId} déconnecté de la partie ${gameId}`);

      if (!game || !game.players[playerId]) return;

      // Marquer le joueur comme déconnecté
      game.players[playerId].connected = false;
      game.players[playerId].lastDisconnect = Date.now();

      // Informer les autres joueurs
      socket.to(gameId).emit("playerLeft", {
        playerId,
        playerName: game.players[playerId].name,
        temporary: true,
      });

      // Mettre la partie en pause si elle est en cours
      if (game.status === "playing") {
        game.status = "paused";
        game.pausedAt = Date.now();
        game.pausedBy = playerId;

        // Sauvegarder l'état du jeu avant la pause
        game.pausedState = {
          currentTurn: game.currentTurn,
          attackPerformed: game.attackPerformed,
          bonusPlayedThisTurn: game.bonusPlayedThisTurn,
          lastBonusTarget: game.lastBonusTarget,
        };

        // Informer les autres joueurs de la pause
        io.to(gameId).emit("gamePaused", {
          reason: "player_disconnected",
          playerId: playerId,
          playerName: game.players[playerId].name,
          newGameState: JSON.parse(JSON.stringify(game)),
        });

        // Définir un délai de reconnexion (par exemple 2 minutes)
        setTimeout(() => {
          if (
            game &&
            game.status === "paused" &&
            !game.players[playerId].connected
          ) {
            // Si le joueur ne s'est pas reconnecté après le délai
            game.status = "finished";
            game.winner = Object.keys(game.players).find(
              (pid) => pid !== playerId
            );
            game.endReason = "player_abandoned";

            // Informer les joueurs restants
            io.to(gameId).emit("gameOver", {
              reason: "player_abandoned",
              winner: game.winner,
              abandonedBy: playerId,
              newGameState: JSON.parse(JSON.stringify(game)),
            });

            // Optionnel : Nettoyer la partie après un certain temps
            setTimeout(() => {
              if (games.has(gameId)) {
                games.delete(gameId);
                console.log(`Partie ${gameId} nettoyée après abandon`);
              }
            }, 300000); // 5 minutes
          }
        }, 120000); // 2 minutes
      }
    });

    // Gérer la reconnexion
    socket.on("reconnectToGame", ({ gameId, playerId }) => {
      if (!games.has(gameId) || !game.players[playerId]) {
        socket.emit("error", { message: "Partie ou joueur non trouvé" });
        return;
      }

      console.log(
        `Joueur ${playerId} tente de se reconnecter à la partie ${gameId}`
      );

      // Mettre à jour le socket et l'état de connexion
      game.players[playerId].socketId = socket.id;
      game.players[playerId].connected = true;

      // Si la partie était en pause à cause de ce joueur
      if (game.status === "paused" && game.pausedBy === playerId) {
        // Restaurer l'état de la partie
        game.status = "playing";
        game.currentTurn = game.pausedState.currentTurn;
        game.attackPerformed = game.pausedState.attackPerformed;
        game.bonusPlayedThisTurn = game.pausedState.bonusPlayedThisTurn;
        game.lastBonusTarget = game.pausedState.lastBonusTarget;

        delete game.pausedAt;
        delete game.pausedBy;
        delete game.pausedState;

        // Informer tous les joueurs de la reprise
        io.to(gameId).emit("gameResumed", {
          playerId: playerId,
          playerName: game.players[playerId].name,
          newGameState: JSON.parse(JSON.stringify(game)),
        });
      }

      // Envoyer l'état actuel au joueur reconnecté
      socket.emit("gameState", {
        game: JSON.parse(JSON.stringify(game)),
        playerId: playerId,
        reconnected: true,
      });

      // Informer les autres joueurs
      socket.to(gameId).emit("playerReconnected", {
        playerId: playerId,
        playerName: game.players[playerId].name,
      });
    });
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
