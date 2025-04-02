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
    bonusPlayedThisTurn: 0, // Compteur de bonus joués ce tour
    maxBonusPerTurn: 2, // Nombre maximum de bonus par tour
  });

  // Initialiser la structure des bonus pour cette partie
  gameBonus.set(gameId, {});

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
  const gameBonusState = gameBonus.get(gameId);

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

  // Initialiser la Map des bonus pour ce joueur
  if (!gameBonusState[playerId]) {
    gameBonusState[playerId] = new Map();
  }

  // Premier joueur devient le joueur actif
  if (Object.keys(game.players).length === 1) {
    game.currentTurn = playerId;
    game.status = "waiting";
  }

  // Deux joueurs = partie commence
  if (Object.keys(game.players).length === 2) {
    game.status = "playing";
    game.turnNumber = 1;
    game.bonusPlayedThisTurn = 0;
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
    const gameBonusState = gameBonus.get(gameId);

    if (!game) return;

    // Trouver les clés du joueur actuel et du prochain joueur
    const currentPlayerKey = Object.keys(game.players).find(
      (key) => game.players[key].id === playerId
    );
    const nextPlayerKey = Object.keys(game.players).find(
      (key) => game.players[key].id !== playerId
    );

    if (!currentPlayerKey || !nextPlayerKey) return;

    const currentPlayer = game.players[currentPlayerKey];
    const nextPlayer = game.players[nextPlayerKey];

    // Vérifier que c'est bien le tour du joueur
    if (game.currentTurn !== playerId) {
      socket.emit("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    // Gérer les bonus actifs du joueur courant
    const currentPlayerBonusMap = gameBonusState[currentPlayerKey];
    if (currentPlayerBonusMap) {
      for (const [characterId, bonusList] of currentPlayerBonusMap.entries()) {
        const characterState = currentPlayer.charactersState[characterId];
        const baseCard = currentPlayer.cards.personnages.find(
          (c) => c.id === characterId
        );

        if (!characterState || !baseCard) continue;

        // Décrémenter les tours restants de chaque bonus
        const updatedBonusList = bonusList
          .map((bonus) => ({
            ...bonus,
            remainingTurns: bonus.remainingTurns - 1,
          }))
          .filter((bonus) => bonus.remainingTurns > 0);

        // Recalculer l'attaque si des bonus sont encore actifs
        if (updatedBonusList.length > 0) {
          // On part de la valeur de base et on applique chaque bonus séquentiellement
          let currentAttack = parseInt(baseCard.forceattaque);
          updatedBonusList.forEach((bonus) => {
            const bonusMultiplier = 1 + bonus.pourcentagebonus / 100;
            currentAttack = Math.ceil(currentAttack * bonusMultiplier);
          });
          characterState.forceattaque = currentAttack;
          currentPlayerBonusMap.set(characterId, updatedBonusList);
        } else {
          // Si plus aucun bonus actif, réinitialiser l'attaque
          characterState.forceattaque = parseInt(baseCard.forceattaque);
          currentPlayerBonusMap.delete(characterId);
        }

        // Synchroniser currentAttack avec forceattaque
        if (characterState.currentAttack !== undefined) {
          characterState.currentAttack = characterState.forceattaque;
        }
      }
    }

    // Mettre à jour l'état du jeu
    game.currentTurn = nextPlayer.id;
    game.bonusPlayedThisTurn = 0; // Réinitialiser le compteur de bonus pour le nouveau tour
    game.lastBonusTarget = null;

    // Gestion du numéro de tour
    if (!game.turnNumber) {
      game.turnNumber = 1;
    } else if (currentPlayerKey === Object.keys(game.players)[1]) {
      game.turnNumber += 1;
    }

    // Émettre l'événement de changement de tour
    io.to(gameId).emit("turnChanged", {
      currentTurn: game.currentTurn,
      newGameState: JSON.parse(JSON.stringify(game)),
    });
  });

  // Jouer une carte bonus
  socket.on("playBonus", (data) => {
    const { gameId, playerId, bonusId, targetId } = data;
    console.log("Tentative de jouer un bonus:", data);

    if (!games.has(gameId)) {
      console.log("Partie non trouvée:", gameId);
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }

    const game = games.get(gameId);
    const gameBonusState = gameBonus.get(gameId);

    if (!game || !gameBonusState) {
      console.log("État de jeu ou bonus non trouvé");
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }

    // Vérifier que le joueur est dans la partie
    const playerKey = Object.keys(game.players).find(
      (key) => game.players[key].id === playerId
    );

    if (!playerKey) {
      console.log("Joueur non trouvé dans la partie:", playerId);
      socket.emit("error", { message: "Joueur non trouvé dans la partie" });
      return;
    }

    // Vérifier que c'est bien le tour du joueur
    if (game.currentTurn !== playerId) {
      console.log("Ce n'est pas le tour du joueur pour jouer un bonus:", {
        currentTurn: game.currentTurn,
        playerId,
      });
      socket.emit("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    // Vérifier si le nombre maximum de bonus par tour a été atteint
    if (game.bonusPlayedThisTurn >= game.maxBonusPerTurn) {
      console.log("Nombre maximum de bonus par tour atteint");
      socket.emit("error", {
        message: `Vous avez déjà joué ${game.maxBonusPerTurn} bonus ce tour. Attendez le tour suivant.`,
      });
      return;
    }

    const player = game.players[playerKey];
    const bonusCard = player.cards.bonus.find((card) => card.id === bonusId);

    if (!bonusCard) {
      console.log("Carte bonus non trouvée:", bonusId);
      socket.emit("error", { message: "Carte bonus non trouvée" });
      return;
    }

    // Vérifier si le bonus a encore des tours disponibles
    if (parseInt(bonusCard.tourbonus) <= 0) {
      console.log("Ce bonus n'a plus de tours disponibles:", bonusId);
      socket.emit("error", {
        message: "Ce bonus n'a plus de tours disponibles",
      });
      return;
    }

    // Vérifier si la cible existe et est valide
    const targetCard = player.cards.personnages.find(
      (card) => card.id === targetId
    );

    if (!targetCard) {
      console.log("Carte cible non trouvée:", targetId);
      socket.emit("error", { message: "Carte cible non trouvée" });
      return;
    }

    // S'assurer que la cible existe dans charactersState
    if (!player.charactersState[targetId]) {
      console.log("Initialisation du state de la cible:", targetId);
      player.charactersState[targetId] = {
        pointsdevie: parseInt(targetCard.pointsdevie),
        forceattaque: parseInt(targetCard.forceattaque),
        tourattaque: parseInt(targetCard.tourattaque),
        activeBonus: [],
      };
    }

    const targetState = player.charactersState[targetId];

    // Vérifier si la cible n'est pas KO
    if (targetState.pointsdevie <= 0) {
      console.log("La cible est KO:", targetId);
      socket.emit("error", { message: "Cette cible est KO" });
      return;
    }

    // S'assurer que la Map des bonus existe pour ce joueur
    if (!gameBonusState[playerId]) {
      gameBonusState[playerId] = new Map();
    }

    const playerBonusMap = gameBonusState[playerId];

    // Vérifier si le personnage a déjà un bonus actif
    if (!playerBonusMap.has(targetId)) {
      playerBonusMap.set(targetId, []);
    }

    // Créer l'effet de bonus
    const bonusEffect = {
      bonusId: bonusId,
      pourcentagebonus: parseInt(bonusCard.pourcentagebonus),
      remainingTurns: parseInt(bonusCard.tourbonus),
    };

    // Ajouter le bonus à la liste des bonus actifs du personnage
    const activeBonuses = playerBonusMap.get(targetId);
    activeBonuses.push(bonusEffect);

    // Décrémenter le nombre de tours restants du bonus
    bonusCard.tourbonus = parseInt(bonusCard.tourbonus) - 1;

    // Recalculer l'attaque du personnage avec tous les bonus actifs
    // On part de la valeur actuelle de forceattaque et on applique le nouveau bonus
    const currentAttack = targetState.forceattaque;
    const bonusMultiplier = 1 + bonusEffect.pourcentagebonus / 100;
    targetState.forceattaque = Math.ceil(currentAttack * bonusMultiplier);

    // Incrémenter le compteur de bonus joués ce tour
    game.bonusPlayedThisTurn++;

    // Émettre l'événement de bonus joué
    io.to(gameId).emit("bonusPlayed", {
      gameId,
      playerId,
      bonusId,
      targetId,
      newAttack: targetState.forceattaque,
      bonusPlayedThisTurn: game.bonusPlayedThisTurn,
      maxBonusPerTurn: game.maxBonusPerTurn,
      newGameState: JSON.parse(JSON.stringify(game)),
    });

    // Vérifier si la partie est terminée
    checkGameEnd(gameId);
  });

  // Attaquer un personnage
  socket.on("attack", (data) => {
    const { gameId, playerId, attackerId, targetId } = data;
    console.log("Tentative d'attaque:", {
      gameId,
      playerId,
      attackerId,
      targetId,
    });

    if (!games.has(gameId)) {
      console.log("Partie non trouvée:", gameId);
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }

    const game = games.get(gameId);
    const gameBonusState = gameBonus.get(gameId);

    if (!game || !gameBonusState) {
      console.log("État de jeu ou bonus non trouvé");
      socket.emit("error", { message: "Partie non trouvée" });
      return;
    }

    // Vérifier que le joueur est dans la partie
    const playerKey = Object.keys(game.players).find(
      (key) => game.players[key].id === playerId
    );

    if (!playerKey) {
      console.log("Joueur non trouvé dans la partie:", playerId);
      socket.emit("error", { message: "Joueur non trouvé dans la partie" });
      return;
    }

    // Vérifier que c'est bien le tour du joueur
    if (game.currentTurn !== playerId) {
      console.log("Ce n'est pas le tour du joueur pour attaquer:", {
        currentTurn: game.currentTurn,
        playerId,
      });
      socket.emit("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    // Vérifier si une attaque a déjà été effectuée
    if (game.attackPerformed) {
      console.log("Une attaque a déjà été effectuée ce tour");
      socket.emit("error", {
        message: "Vous avez déjà attaqué ce tour. Attendez le tour suivant.",
      });
      return;
    }

    const player = game.players[playerKey];
    const attackerCard = player.cards.personnages.find(
      (card) => card.id === attackerId
    );

    if (!attackerCard) {
      console.log("Carte attaquante non trouvée:", attackerId);
      socket.emit("error", { message: "Carte attaquante non trouvée" });
      return;
    }

    // S'assurer que l'attaquant existe dans charactersState
    if (!player.charactersState[attackerId]) {
      console.log("Initialisation du state de l'attaquant:", attackerId);
      player.charactersState[attackerId] = {
        pointsdevie: parseInt(attackerCard.pointsdevie),
        forceattaque: parseInt(attackerCard.forceattaque),
        tourattaque: parseInt(attackerCard.tourattaque),
        activeBonus: [],
      };
    }

    const attackerState = player.charactersState[attackerId];

    // Vérifier si le personnage peut attaquer (PV > 0 et tours d'attaque > 0)
    if (!attackerState || attackerState.pointsdevie <= 0) {
      console.log("Ce personnage est KO et ne peut pas attaquer:", attackerId);
      socket.emit("error", {
        message: "Ce personnage est KO et ne peut pas attaquer",
      });
      return;
    }

    if (!attackerState || attackerState.tourattaque <= 0) {
      console.log("Cette carte ne peut plus attaquer ce tour:", attackerId);
      socket.emit("error", {
        message: "Cette carte ne peut plus attaquer ce tour",
      });
      return;
    }

    // Trouver l'adversaire
    const opponentKey = Object.keys(game.players).find(
      (key) => key !== playerKey
    );

    if (!opponentKey) {
      console.log("Adversaire non trouvé dans la partie");
      socket.emit("error", { message: "Adversaire non trouvé dans la partie" });
      return;
    }

    const opponent = game.players[opponentKey];
    const targetCard = opponent.cards.personnages.find(
      (card) => card.id === targetId
    );

    if (!targetCard) {
      console.log("Carte cible non trouvée:", targetId);
      socket.emit("error", { message: "Carte cible non trouvée" });
      return;
    }

    // S'assurer que la cible existe dans charactersState
    if (!opponent.charactersState[targetId]) {
      console.log("Initialisation du state de la cible:", targetId);
      opponent.charactersState[targetId] = {
        pointsdevie: parseInt(targetCard.pointsdevie),
        forceattaque: parseInt(targetCard.forceattaque),
        tourattaque: parseInt(targetCard.tourattaque),
        activeBonus: [],
      };
    }

    const targetState = opponent.charactersState[targetId];

    // Vérifier si la cible n'est pas déjà KO
    if (targetState.pointsdevie <= 0) {
      console.log("La cible est déjà KO:", targetId);
      socket.emit("error", { message: "Cette cible est déjà KO" });
      return;
    }

    // Calculer les dégâts (avec les bonus)
    const damage = attackerState.forceattaque;
    console.log("Dégâts calculés:", damage);

    // Appliquer les dégâts
    targetState.pointsdevie = Math.max(0, targetState.pointsdevie - damage);
    console.log("Nouveau PV de la cible:", targetState.pointsdevie);

    // Décrémenter le nombre d'attaques restantes
    attackerState.tourattaque--;

    // Vérifier si le personnage cible est KO
    if (targetState.pointsdevie <= 0) {
      targetState.pointsdevie = 0;
      console.log("La cible est KO:", targetId);
    }

    // Mettre à jour l'état du jeu
    game.attackPerformed = true;

    // Trouver le prochain joueur (l'adversaire)
    const nextPlayerId = opponent.id;

    // Mettre à jour l'état du jeu pour le prochain tour
    game.currentTurn = nextPlayerId;
    game.bonusPlayedThisTurn = false;
    game.lastBonusTarget = null;
    game.attackPerformed = false;

    // Gestion du numéro de tour
    if (!game.turnNumber) {
      game.turnNumber = 1;
    } else if (playerKey === Object.keys(game.players)[1]) {
      game.turnNumber += 1;
    }

    // Émettre l'événement d'attaque
    io.to(gameId).emit("characterAttacked", {
      gameId,
      playerId,
      attackerId,
      targetId,
      damage,
      newHealth: targetState.pointsdevie,
      attackerName: attackerCard.nomcarteperso,
      targetName: targetCard.nomcarteperso,
      newGameState: JSON.parse(JSON.stringify(game)),
    });

    // Émettre l'événement de changement de tour
    io.to(gameId).emit("turnChanged", {
      currentTurn: game.currentTurn,
      newGameState: JSON.parse(JSON.stringify(game)),
    });

    // Vérifier si la partie est terminée
    checkGameEnd(gameId);
  });

  // Fonction pour vérifier si la partie est terminée
  function checkGameEnd(gameId) {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    // Vérifier si un joueur a perdu tous ses personnages
    const checkGameOver = (gameId) => {
      const game = games.get(gameId);
      if (!game) return;

      for (const playerId in game.players) {
        const player = game.players[playerId];
        const allCharactersKO = Object.values(player.charactersState).every(
          (char) => char.pointsdevie <= 0
        );

        if (allCharactersKO) {
          // Trouver le gagnant (l'autre joueur)
          const winner = Object.keys(game.players).find(
            (id) => id !== playerId
          );

          if (winner) {
            game.winner = winner;
            game.endReason = "all_characters_ko";
            game.status = "finished";

            // Envoyer l'état final du jeu à tous les joueurs
            const gameState = {
              game: {
                ...game,
                players: Object.fromEntries(
                  Object.entries(game.players).map(([id, player]) => [
                    id,
                    {
                      ...player,
                      cards: {
                        personnages: player.cards.personnages.map((card) => ({
                          ...card,
                          tourattaque: parseInt(card.tourattaque),
                        })),
                        bonus: player.cards.bonus.map((card) => ({
                          ...card,
                          tourbonus: parseInt(card.tourbonus),
                        })),
                      },
                    },
                  ])
                ),
              },
            };

            // Envoyer à tous les joueurs de la partie
            game.players[playerId].socket.emit("gameStateUpdate", gameState);
            game.players[winner].socket.emit("gameStateUpdate", gameState);

            // Émettre l'événement gameOver à tous les joueurs
            game.players[playerId].socket.emit("gameOver", {
              winner: winner,
              reason: "all_characters_ko",
            });
            game.players[winner].socket.emit("gameOver", {
              winner: winner,
              reason: "all_characters_ko",
            });
          }
          break;
        }
      }
    };

    // Trouver les clés des joueurs
    const playerKeys = Object.keys(game.players);
    if (playerKeys.length !== 2) return; // La partie doit avoir exactement 2 joueurs

    const player1Key = playerKeys[0];
    const player2Key = playerKeys[1];

    const player1AllKO = checkAllCharactersKO(player1Key);
    const player2AllKO = checkAllCharactersKO(player2Key);

    // Si tous les personnages d'un joueur sont KO, la partie est terminée
    if (player1AllKO || player2AllKO) {
      // Déterminer le gagnant
      const winnerKey = player1AllKO ? player2Key : player1Key;
      const winner = game.players[winnerKey].id;

      // Mettre à jour l'état de la partie
      game.status = "finished";
      game.winner = winner;
      game.endReason = "all_characters_ko";

      // Calculer les points de vie restants pour les statistiques
      const calculateTotalHealth = (playerState) => {
        return Object.values(playerState.charactersState).reduce(
          (total, char) => total + Math.max(0, parseInt(char.pointsdevie) || 0),
          0
        );
      };

      game.finalStats = {
        [player1Key]: calculateTotalHealth(game.players[player1Key]),
        [player2Key]: calculateTotalHealth(game.players[player2Key]),
      };

      // Informer les joueurs de la fin de la partie
      io.to(gameId).emit("gameOver", {
        reason: "all_characters_ko",
        winner: winner,
        finalStats: game.finalStats,
        newGameState: JSON.parse(JSON.stringify(game)),
      });

      // Nettoyer la partie après un certain temps
      setTimeout(() => {
        if (games.has(gameId)) {
          games.delete(gameId);
          gameBonus.delete(gameId);
          console.log(`Partie ${gameId} nettoyée après fin`);
        }
      }, 300000); // 5 minutes
    }
  }

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
