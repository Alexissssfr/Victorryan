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
    personnages: personnages.map((card) => ({
      ...card,
      id: card.id,
      pointsdevie: parseInt(card.pointsdevie) || 100,
      forceattaque: parseInt(card.forceattaque) || 30,
      tourattaque: parseInt(card.tourattaque) || 2,
    })),
    bonus: bonus.map((card) => ({
      ...card,
      id: card.id,
      pourcentagebonus: parseInt(card.pourcentagebonus) || 10,
      tourbonus: parseInt(card.tourbonus) || 2,
    })),
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
    charactersState: {},
  };

  // Initialiser l'état des personnages du joueur
  cards.personnages.forEach((card) => {
    game.players[playerId].charactersState[card.id] = {
      pointsdevie: parseInt(card.pointsdevie) || 100,
      forceattaque: parseInt(card.forceattaque) || 30,
      tourattaque: parseInt(card.tourattaque) || 2,
      activeBonus: [],
    };
  });

  // Premier joueur devient le joueur actif
  if (Object.keys(game.players).length === 1) {
    game.currentTurn = playerId;
    game.status = "waiting";
  }

  // Deux joueurs = partie commence
  if (Object.keys(game.players).length === 2) {
    game.status = "playing";
    game.turnNumber = 1;
    game.bonusPlayedThisTurn = false;
    game.lastBonusTarget = null;
    game.attackPerformed = false;
  }

  console.log(`Joueur ${name} (${playerId}) a rejoint la partie ${gameId}`);
  res.json({
    success: true,
    gameId,
    playerId,
    game: JSON.parse(JSON.stringify(game)),
  });
});

// WebSocket
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion WebSocket: ${socket.id}`);

  // Stocker les parties auxquelles ce socket est connecté
  const playerGames = new Set();

  // Rejoindre une salle de jeu
  socket.on("joinRoom", ({ gameId, playerId, playerName }) => {
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
    playerGames.add(gameId);
    game.players[playerId].socketId = socket.id;
    game.players[playerId].connected = true;

    // Informer le joueur de l'état actuel
    socket.emit("gameState", {
      game: JSON.parse(JSON.stringify(game)),
      playerId: playerId,
    });

    // Informer les autres joueurs
    socket.to(gameId).emit("playerJoined", {
      playerId: playerId,
      playerName: playerName,
      game: JSON.parse(JSON.stringify(game)),
    });

    // Si tous les joueurs sont connectés et la partie est en cours
    const allPlayersConnected = Object.values(game.players).every(
      (p) => p.connected
    );
    if (game.status === "playing" && allPlayersConnected) {
      io.to(gameId).emit("gameReady", {
        game: JSON.parse(JSON.stringify(game)),
        startingPlayer: game.currentTurn,
      });
    }
  });

  // Fin de tour
  socket.on("endTurn", ({ gameId, playerId }) => {
    if (!games.has(gameId)) return;
    const game = games.get(gameId);

    // Vérifier que le socket est bien dans cette partie
    if (!playerGames.has(gameId)) return;

    const gameBonusState = gameBonus.get(gameId);

    if (!game || !gameBonusState) {
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }

    if (game.currentTurn !== playerId) {
      socket.emit("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    // Trouver le joueur actuel et le prochain joueur
    const currentPlayerKey = Object.keys(game.players).find(
      (key) => game.players[key].id === playerId
    );
    const nextPlayerKey = Object.keys(game.players).find(
      (key) => game.players[key].id !== playerId
    );

    if (!currentPlayerKey || !nextPlayerKey) {
      socket.emit("error", { message: "Joueurs non trouvés" });
      return;
    }

    const currentPlayer = game.players[currentPlayerKey];
    const nextPlayer = game.players[nextPlayerKey];

    // Gérer les bonus du joueur actuel
    const currentPlayerBonusMap =
      gameBonusState[currentPlayerKey === "player1" ? "player1" : "player2"];

    for (const [characterId, bonusList] of currentPlayerBonusMap.entries()) {
      const characterState = currentPlayer.charactersState[characterId];
      const baseCard = currentPlayer.cards.personnages.find(
        (c) => c.id === characterId
      );

      if (!characterState || !baseCard) continue;

      // Décrémenter les tours de bonus seulement à la fin du tour
      const updatedBonusList = bonusList
        .map((bonus) => ({ ...bonus, tourbonus: bonus.tourbonus - 1 }))
        .filter((bonus) => bonus.tourbonus > 0);

      if (updatedBonusList.length > 0) {
        // Recalculer l'attaque avec tous les bonus restants
        let totalBonus = 1; // Commencer à 1 (100%)
        updatedBonusList.forEach((bonus) => {
          totalBonus += bonus.pourcentagebonus / 100;
        });
        characterState.forceattaque = Math.floor(
          parseInt(baseCard.forceattaque) * totalBonus
        );
        currentPlayerBonusMap.set(characterId, updatedBonusList);
      } else {
        // Réinitialiser l'attaque et supprimer les bonus
        characterState.forceattaque = parseInt(baseCard.forceattaque);
        currentPlayerBonusMap.delete(characterId);
      }
    }

    // Réinitialiser les tours d'attaque pour le prochain joueur
    Object.keys(nextPlayer.charactersState).forEach((characterId) => {
      const baseCard = nextPlayer.cards.personnages.find(
        (c) => c.id === characterId
      );
      if (baseCard) {
        nextPlayer.charactersState[characterId].tourattaque = parseInt(
          baseCard.tourattaque
        );
      }
    });

    // Mettre à jour l'état du jeu
    game.currentTurn = nextPlayer.id;
    game.bonusPlayedThisTurn = false;
    game.lastBonusTarget = null;

    // Émettre l'événement de changement de tour
    io.to(gameId).emit("turnChanged", {
      currentTurn: game.currentTurn,
      newGameState: JSON.parse(JSON.stringify(game)),
    });
  });

  // Jouer une carte bonus
  socket.on("playBonus", (data) => {
    const { gameId, playerId, bonusId, targetId } = data;
    console.log("Tentative de jouer un bonus:", {
      gameId,
      playerId,
      bonusId,
      targetId,
    });

    if (!games.has(gameId)) {
      console.log("Partie non trouvée:", gameId);
      return;
    }

    // Vérifier que le socket est bien dans cette partie
    if (!playerGames.has(gameId)) {
      console.log("Socket non dans la partie:", gameId);
      return;
    }

    const game = games.get(gameId);
    const gameBonusState = gameBonus.get(gameId);

    if (!game || !gameBonusState) {
      console.log("État de jeu ou bonus non trouvé");
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }

    const playerKey = Object.keys(game.players).find(
      (key) => game.players[key].id === playerId
    );

    if (!playerKey || game.currentTurn !== playerId) {
      console.log("Ce n'est pas le tour du joueur:", {
        playerKey,
        currentTurn: game.currentTurn,
        playerId,
      });
      socket.emit("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    const player = game.players[playerKey];
    console.log("Cartes du joueur:", player.cards);

    const bonusCard = player.cards.bonus.find((card) => card.id === bonusId);
    console.log("Carte bonus trouvée:", bonusCard);

    if (!bonusCard) {
      console.log("Carte bonus non trouvée:", bonusId);
      socket.emit("error", { message: "Carte bonus non trouvée" });
      return;
    }

    // Vérifier si le personnage cible existe dans les cartes du joueur
    const targetCard = player.cards.personnages.find(
      (card) => card.id === targetId
    );
    console.log("Carte cible trouvée:", targetCard);

    if (!targetCard) {
      console.log("Personnage cible non trouvé:", targetId);
      socket.emit("error", {
        message: "Personnage cible non trouvé dans vos cartes",
      });
      return;
    }

    // S'assurer que le personnage existe dans charactersState
    if (!player.charactersState[targetId]) {
      console.log("Initialisation du state du personnage:", targetId);
      player.charactersState[targetId] = {
        pointsdevie: parseInt(targetCard.pointsdevie),
        forceattaque: parseInt(targetCard.forceattaque),
        tourattaque: parseInt(targetCard.tourattaque),
        activeBonus: [],
      };
    }

    // Stocker le bonus dans la structure isolée
    const playerBonusMap =
      gameBonusState[playerKey === "player1" ? "player1" : "player2"];
    if (!playerBonusMap.has(targetId)) {
      playerBonusMap.set(targetId, []);
    }

    const bonusEffect = {
      id: bonusId,
      tourbonus: parseInt(bonusCard.tourbonus),
      pourcentagebonus: parseInt(bonusCard.pourcentagebonus),
    };

    // Ajouter le nouveau bonus
    playerBonusMap.get(targetId).push(bonusEffect);
    console.log("Bonus ajouté:", bonusEffect);

    // Mettre à jour l'attaque du personnage avec tous les bonus actifs
    const characterState = player.charactersState[targetId];
    const baseAttack = parseInt(targetCard.forceattaque);
    let totalBonus = 1; // Commencer à 1 (100%)

    // Calculer l'effet cumulé de tous les bonus actifs
    playerBonusMap.get(targetId).forEach((bonus) => {
      totalBonus += bonus.pourcentagebonus / 100;
    });

    // Appliquer le bonus total
    characterState.forceattaque = Math.floor(baseAttack * totalBonus);
    console.log("Nouvelle attaque calculée:", {
      baseAttack,
      totalBonus,
      newAttack: characterState.forceattaque,
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
      bonusName: bonusCard.nomcartebonus,
      targetName: targetCard.nomcarteperso,
      pourcentagebonus: bonusEffect.pourcentagebonus,
      newAttack: characterState.forceattaque,
      remainingTurns: bonusEffect.tourbonus,
      game: JSON.parse(JSON.stringify(game)),
    });
  });

  // Attaquer un personnage
  socket.on("attack", (data) => {
    const { gameId, playerId, attackerId, targetId } = data;
    if (!games.has(gameId)) return;

    // Vérifier que le socket est bien dans cette partie
    if (!playerGames.has(gameId)) return;

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

    if (!attackerCard) {
      socket.emit("error", { message: "Carte attaquante non trouvée" });
      return;
    }

    // S'assurer que l'attaquant existe dans charactersState
    if (!player.charactersState[attackerId]) {
      player.charactersState[attackerId] = {
        pointsdevie: parseInt(attackerCard.pointsdevie),
        forceattaque: parseInt(attackerCard.forceattaque),
        tourattaque: parseInt(attackerCard.tourattaque),
        activeBonus: [],
      };
    }

    const attackerState = player.charactersState[attackerId];

    if (!attackerState || attackerState.tourattaque <= 0) {
      socket.emit("error", { message: "Cette carte ne peut pas attaquer" });
      return;
    }

    // Trouver la cible
    const opponentKey = playerKey === "player1" ? "player2" : "player1";
    const opponent = game.players[opponentKey];
    const targetCard = opponent.cards.personnages.find(
      (card) => card.id === targetId
    );

    if (!targetCard) {
      socket.emit("error", { message: "Carte cible non trouvée" });
      return;
    }

    // S'assurer que la cible existe dans charactersState
    if (!opponent.charactersState[targetId]) {
      opponent.charactersState[targetId] = {
        pointsdevie: parseInt(targetCard.pointsdevie),
        forceattaque: parseInt(targetCard.forceattaque),
        tourattaque: parseInt(targetCard.tourattaque),
        activeBonus: [],
      };
    }

    const targetState = opponent.charactersState[targetId];

    // Calculer les dégâts
    const damage = attackerState.forceattaque;

    // Appliquer les dégâts
    targetState.pointsdevie = Math.max(0, targetState.pointsdevie - damage);

    // Décrémenter le nombre d'attaques restantes
    attackerState.tourattaque--;

    // Vérifier si le personnage cible est KO
    if (targetState.pointsdevie <= 0) {
      targetState.pointsdevie = 0;
    }

    // Émettre l'événement d'attaque
    io.to(gameId).emit("characterAttacked", {
      gameId,
      playerId,
      attackerId,
      targetId,
      damage,
      newHealth: targetState.pointsdevie,
      newGameState: JSON.parse(JSON.stringify(game)),
    });

    // Vérifier si la partie est terminée
    checkGameEnd(gameId);
  });

  // Gérer la déconnexion
  socket.on("disconnect", () => {
    // Gérer la déconnexion pour toutes les parties auxquelles ce socket participait
    for (const gameId of playerGames) {
      const game = games.get(gameId);
      if (!game) continue;

      const playerId = Object.keys(game.players).find(
        (key) => game.players[key].socketId === socket.id
      );

      if (!playerId) continue;

      console.log(`Joueur ${playerId} déconnecté de la partie ${gameId}`);

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
            const remainingPlayerId = Object.keys(game.players).find(
              (pid) => pid !== playerId
            );
            game.winner = remainingPlayerId;
            game.endReason = "player_abandoned";

            // Calculer les points de vie restants
            const calculateTotalHealth = (playerState) => {
              return Object.values(playerState.charactersState).reduce(
                (total, char) =>
                  total + Math.max(0, parseInt(char.pointsdevie) || 0),
                0
              );
            };

            // Trouver les clés des joueurs
            const disconnectedPlayerKey = Object.keys(game.players).find(
              (key) => game.players[key].id === playerId
            );
            const remainingPlayerKey = Object.keys(game.players).find(
              (key) => game.players[key].id === remainingPlayerId
            );

            game.finalStats = {
              [disconnectedPlayerKey]: calculateTotalHealth(
                game.players[disconnectedPlayerKey]
              ),
              [remainingPlayerKey]: calculateTotalHealth(
                game.players[remainingPlayerKey]
              ),
            };

            // Informer les joueurs restants
            io.to(gameId).emit("gameOver", {
              reason: "player_abandoned",
              winner: game.winner,
              abandonedBy: playerId,
              finalStats: game.finalStats,
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
    }
    playerGames.clear();
  });

  // Gérer la reconnexion
  socket.on("reconnectToGame", ({ gameId, playerId }) => {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);
    if (!game.players[playerId]) {
      socket.emit("error", { message: "Partie ou joueur non trouvé" });
      return;
    }

    // Ajouter la partie à la liste des parties du socket
    playerGames.add(gameId);

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

  // Gérer l'événement leaveGame
  socket.on("leaveGame", ({ gameId }) => {
    if (!games.has(gameId)) return;

    // Vérifier que le socket est bien dans cette partie
    if (!playerGames.has(gameId)) return;

    const game = games.get(gameId);
    const playerId = Object.keys(game.players).find(
      (key) => game.players[key].socketId === socket.id
    );

    if (playerId && game.players[playerId]) {
      // Informer les autres joueurs
      socket.to(gameId).emit("playerLeft", {
        playerId,
        playerName: game.players[playerId].name,
        temporary: false,
      });

      // Si la partie est en cours, la terminer
      if (game.status === "playing") {
        const remainingPlayerId = Object.keys(game.players).find(
          (pid) => pid !== playerId
        );

        if (remainingPlayerId) {
          game.status = "finished";
          game.winner = remainingPlayerId;
          game.endReason = "player_left";

          // Calculer les points de vie restants
          const calculateTotalHealth = (playerState) => {
            return Object.values(playerState.charactersState).reduce(
              (total, char) =>
                total + Math.max(0, parseInt(char.pointsdevie) || 0),
              0
            );
          };

          game.finalStats = {
            [playerId]: calculateTotalHealth(game.players[playerId]),
            [remainingPlayerId]: calculateTotalHealth(
              game.players[remainingPlayerId]
            ),
          };

          // Informer les joueurs restants
          io.to(gameId).emit("gameOver", {
            reason: "player_left",
            winner: remainingPlayerId,
            leftBy: playerId,
            finalStats: game.finalStats,
            newGameState: JSON.parse(JSON.stringify(game)),
          });
        }
      }

      // Nettoyer après un délai
      setTimeout(() => {
        if (games.has(gameId)) {
          games.delete(gameId);
          gameBonus.delete(gameId);
          console.log(`Partie ${gameId} nettoyée après départ du joueur`);
        }
      }, 300000); // 5 minutes
    }

    // Retirer la partie de la liste des parties du socket
    playerGames.delete(gameId);
    socket.leave(gameId);
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
