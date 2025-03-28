const { v4: uuidv4 } = require("uuid");
const cardService = require("./cardService");

// Stockage en mémoire des parties actives
const activeGames = new Map();

/**
 * Crée une nouvelle partie
 * @param {string} player1 - Nom du joueur 1
 * @returns {string} - ID de la partie
 */
async function createGame(player1) {
  try {
    console.log(`Création d'une partie pour ${player1} en mode mémoire`);
    const gameId = uuidv4().substring(0, 6).toUpperCase();

    // Tirer les cartes pour le joueur 1
    const player1Cards = await cardService.drawInitialCards();

    // Initialiser l'état de la partie
    const gameState = {
      id: gameId,
      status: "waiting",
      player1: {
        id: player1,
        cards: player1Cards,
        health: {},
        attack: {},
        turns: {},
        activeBonus: {},
      },
      player2: null,
      currentTurn: null,
    };

    // Initialiser les statistiques des cartes
    for (const card of player1Cards.personnages) {
      gameState.player1.health[card.id] = parseInt(card.pv);
      gameState.player1.attack[card.id] = parseInt(card.force);
      gameState.player1.turns[card.id] = parseInt(card.tours);
      gameState.player1.activeBonus[card.id] = [];
    }

    // Stocker l'état en mémoire
    activeGames.set(gameId, gameState);
    console.log(`Partie ${gameId} créée avec succès en mode mémoire`);

    return gameId;
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    throw new Error("Impossible de créer la partie");
  }
}

/**
 * Rejoint une partie existante
 * @param {string} gameId - ID de la partie
 * @param {string} player2 - Nom du joueur 2
 * @returns {object} - État actuel de la partie
 */
async function joinGame(gameId, player2) {
  try {
    // Vérifier si la partie existe
    let gameState = activeGames.get(gameId);

    if (!gameState) {
      throw new Error("Partie introuvable");
    }

    if (gameState.status !== "waiting") {
      throw new Error("Cette partie est déjà complète");
    }

    // Tirer les cartes pour le joueur 2
    const player2Cards = await cardService.drawInitialCards();

    // Mettre à jour l'état de la partie
    gameState.player2 = {
      id: player2,
      cards: player2Cards,
      health: {},
      attack: {},
      turns: {},
      activeBonus: {},
    };

    // Initialiser les statistiques des cartes
    for (const card of player2Cards.personnages) {
      gameState.player2.health[card.id] = parseInt(card.pv);
      gameState.player2.attack[card.id] = parseInt(card.force);
      gameState.player2.turns[card.id] = parseInt(card.tours);
      gameState.player2.activeBonus[card.id] = [];
    }

    // Mettre à jour le statut et le tour courant
    gameState.status = "playing";
    gameState.currentTurn = Math.random() < 0.5 ? "player1" : "player2";

    // Mettre à jour en mémoire
    activeGames.set(gameId, gameState);
    console.log(
      `Joueur ${player2} a rejoint la partie ${gameId} en mode mémoire`
    );

    return gameState;
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    throw error;
  }
}

/**
 * Récupère l'état d'une partie
 * @param {string} gameId - ID de la partie
 * @returns {object} - État actuel de la partie
 */
async function getGameState(gameId) {
  try {
    const gameState = activeGames.get(gameId);

    if (!gameState) {
      throw new Error("Partie introuvable");
    }

    return gameState;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'état de la partie:",
      error
    );
    throw error;
  }
}

/**
 * Joue une carte bonus
 * @param {string} gameId - ID de la partie
 * @param {string} playerId - ID du joueur
 * @param {string} cardId - ID de la carte bonus
 * @param {string} targetId - ID de la carte personnage cible
 * @returns {object} - État actualisé de la partie
 */
function playCard(gameId, playerId, cardId, targetId) {
  const gameState = activeGames.get(gameId);

  if (!gameState) {
    throw new Error("Partie introuvable");
  }

  // Déterminer le joueur actuel
  const playerKey = gameState.player1.id === playerId ? "player1" : "player2";
  const opponentKey = playerKey === "player1" ? "player2" : "player1";

  // Vérifier si c'est le tour du joueur
  if (gameState.currentTurn !== playerKey) {
    throw new Error("Ce n'est pas votre tour");
  }

  // Trouver la carte bonus
  const bonusCard = gameState[playerKey].cards.bonus.find(
    (card) => card.id === cardId
  );

  if (!bonusCard) {
    throw new Error("Carte bonus non trouvée");
  }

  // Vérifier si la carte cible existe
  if (!gameState[playerKey].health[targetId]) {
    throw new Error("Carte personnage cible non trouvée");
  }

  // Appliquer le bonus
  gameState[playerKey].activeBonus[targetId] =
    gameState[playerKey].activeBonus[targetId] || [];

  gameState[playerKey].activeBonus[targetId].push({
    id: bonusCard.id,
    pourcentage: parseInt(bonusCard.pourcentagebonus),
    tours: parseInt(bonusCard.tourbonus),
    nom: bonusCard.nomcartebonus,
  });

  // Retirer la carte bonus de la main du joueur
  gameState[playerKey].cards.bonus = gameState[playerKey].cards.bonus.filter(
    (card) => card.id !== cardId
  );

  // Mettre à jour l'état en mémoire
  activeGames.set(gameId, gameState);

  return gameState;
}

/**
 * Fait une attaque avec un personnage
 * @param {string} gameId - ID de la partie
 * @param {string} playerId - ID du joueur
 * @param {string} attackerId - ID de la carte attaquante
 * @param {string} targetId - ID de la carte cible
 * @returns {object} - État actualisé de la partie
 */
function attack(gameId, playerId, attackerId, targetId) {
  const gameState = activeGames.get(gameId);

  if (!gameState) {
    throw new Error("Partie introuvable");
  }

  // Déterminer le joueur actuel
  const playerKey = gameState.player1.id === playerId ? "player1" : "player2";
  const opponentKey = playerKey === "player1" ? "player2" : "player1";

  // Vérifier si c'est le tour du joueur
  if (gameState.currentTurn !== playerKey) {
    throw new Error("Ce n'est pas votre tour");
  }

  // Vérifier si l'attaquant existe et a des tours d'attaque disponibles
  if (
    !gameState[playerKey].health[attackerId] ||
    gameState[playerKey].turns[attackerId] <= 0
  ) {
    throw new Error("Carte attaquante non valide");
  }

  // Vérifier si la cible existe
  if (!gameState[opponentKey].health[targetId]) {
    throw new Error("Carte cible non valide");
  }

  // Calculer la force d'attaque avec les bonus
  let attackPower = gameState[playerKey].attack[attackerId];
  const activeBonus = gameState[playerKey].activeBonus[attackerId] || [];

  // Appliquer les bonus à l'attaque
  if (activeBonus.length > 0) {
    const totalBonusPercentage = activeBonus.reduce(
      (total, bonus) => total + bonus.pourcentage,
      0
    );
    attackPower = Math.floor(attackPower * (1 + totalBonusPercentage / 100));
  }

  // Appliquer l'attaque
  gameState[opponentKey].health[targetId] -= attackPower;

  // Réduire le nombre de tours restants pour l'attaquant
  gameState[playerKey].turns[attackerId]--;

  // Vérifier si la partie est terminée
  checkGameOver(gameState);

  // Mettre à jour l'état en mémoire
  activeGames.set(gameId, gameState);

  return gameState;
}

/**
 * Termine le tour du joueur
 * @param {string} gameId - ID de la partie
 * @param {string} playerId - ID du joueur
 * @returns {object} - État actualisé de la partie
 */
function endTurn(gameId, playerId) {
  const gameState = activeGames.get(gameId);

  if (!gameState) {
    throw new Error("Partie introuvable");
  }

  // Déterminer le joueur actuel
  const playerKey = gameState.player1.id === playerId ? "player1" : "player2";
  const nextPlayerKey = playerKey === "player1" ? "player2" : "player1";

  // Vérifier si c'est le tour du joueur
  if (gameState.currentTurn !== playerKey) {
    throw new Error("Ce n'est pas votre tour");
  }

  // Passer au tour suivant
  gameState.currentTurn = nextPlayerKey;

  // Réinitialiser les tours d'attaque pour le prochain joueur
  for (const cardId in gameState[nextPlayerKey].turns) {
    gameState[nextPlayerKey].turns[cardId] = parseInt(
      gameState[nextPlayerKey].cards.personnages.find(
        (card) => card.id === cardId
      ).tours
    );
  }

  // Décrémenter les tours de bonus
  for (const targetId in gameState[playerKey].activeBonus) {
    const bonusList = gameState[playerKey].activeBonus[targetId];

    // Filtrer les bonus expirés
    gameState[playerKey].activeBonus[targetId] = bonusList
      .map((bonus) => {
        bonus.tours--;
        return bonus;
      })
      .filter((bonus) => bonus.tours > 0);
  }

  // Mettre à jour l'état en mémoire
  activeGames.set(gameId, gameState);

  return gameState;
}

/**
 * Vérifie si la partie est terminée
 * @param {object} gameState - État du jeu
 */
function checkGameOver(gameState) {
  // Compter les personnages encore en vie pour chaque joueur
  let player1Alive = 0;
  let player2Alive = 0;

  for (const cardId in gameState.player1.health) {
    if (gameState.player1.health[cardId] > 0) {
      player1Alive++;
    }
  }

  for (const cardId in gameState.player2.health) {
    if (gameState.player2.health[cardId] > 0) {
      player2Alive++;
    }
  }

  // Vérifier si un joueur n'a plus de personnages
  if (player1Alive === 0 || player2Alive === 0) {
    gameState.status = "finished";
    gameState.winner = player1Alive > 0 ? "player1" : "player2";
  }
}

/**
 * Fonction auxiliaire pour sauvegarder l'état du jeu (non utilisée en mode mémoire)
 */
function saveGameState(gameId, gameState) {
  // En mode mémoire, on ne fait rien de plus
  activeGames.set(gameId, gameState);
}

/**
 * Met à jour le statut de connexion d'un joueur
 * @param {string} gameId - ID de la partie
 * @param {string} playerId - ID du joueur
 * @param {boolean} isConnected - Status de connexion
 * @returns {Object} État mis à jour du jeu
 */
function updatePlayerConnection(gameId, playerId, isConnected) {
  const game = getGame(gameId);

  if (!game) {
    console.log(
      `Partie ${gameId} non trouvée pour la mise à jour de connexion`
    );
    return null;
  }

  // Vérifier si le joueur fait partie de cette partie
  let playerKey = null;
  if (game.state.player1?.id === playerId) {
    playerKey = "player1";
  } else if (game.state.player2?.id === playerId) {
    playerKey = "player2";
  }

  if (!playerKey) {
    console.log(`Joueur ${playerId} non trouvé dans la partie ${gameId}`);
    return null;
  }

  // Mettre à jour le statut de connexion
  if (!game.state[playerKey].connectionStatus) {
    game.state[playerKey].connectionStatus = {};
  }

  const previousStatus = game.state[playerKey].connectionStatus.isConnected;
  game.state[playerKey].connectionStatus = {
    isConnected,
    lastUpdate: new Date().toISOString(),
  };

  // Log uniquement si le statut a changé
  if (previousStatus !== isConnected) {
    console.log(
      `Joueur ${playerId} ${
        isConnected ? "connecté" : "déconnecté"
      } dans la partie ${gameId}`
    );
  }

  return game.state;
}

module.exports = {
  createGame,
  joinGame,
  getGameState,
  playCard,
  attack,
  endTurn,
  saveGameState,
  updatePlayerConnection,
};
