const { supabase } = require("../config/supabase");
const cardService = require("./cardService");
const { v4: uuidv4 } = require("uuid");

// Stockage en mémoire des parties actives
const activeGames = new Map();

/**
 * Crée une nouvelle partie
 * @param {string} player1 - Nom du joueur 1
 * @returns {string} - ID de la partie
 */
async function createGame(player1) {
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

  // Enregistrer dans la base de données Supabase
  const { data, error } = await supabase.from("games").insert([
    {
      id: gameId,
      player1: player1,
      status: "waiting",
      created_at: new Date(),
      game_state: JSON.stringify(gameState),
    },
  ]);

  if (error) {
    console.error("Erreur lors de la création de la partie:", error);
    throw new Error("Impossible de créer la partie");
  }

  // Stocker l'état en mémoire
  activeGames.set(gameId, gameState);

  return gameId;
}

/**
 * Rejoint une partie existante
 * @param {string} gameId - ID de la partie
 * @param {string} player2 - Nom du joueur 2
 * @returns {object} - État actuel de la partie
 */
async function joinGame(gameId, player2) {
  // Vérifier si la partie existe
  let gameState = activeGames.get(gameId);

  if (!gameState) {
    // Récupérer de la base de données
    const { data, error } = await supabase
      .from("games")
      .select("game_state")
      .eq("id", gameId)
      .single();

    if (error || !data) {
      throw new Error("Partie introuvable");
    }

    gameState = JSON.parse(data.game_state);
    activeGames.set(gameId, gameState);
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

  // Mettre à jour dans Supabase
  const { data, error } = await supabase
    .from("games")
    .update({
      player2: player2,
      status: "playing",
      game_state: JSON.stringify(gameState),
    })
    .eq("id", gameId);

  if (error) {
    console.error("Erreur lors de la mise à jour de la partie:", error);
    throw new Error("Impossible de rejoindre la partie");
  }

  // Mettre à jour en mémoire
  activeGames.set(gameId, gameState);

  return gameState;
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

  // Mettre à jour l'état dans Supabase
  saveGameState(gameId, gameState);

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

  // Infliger les dégâts
  gameState[opponentKey].health[targetId] -= attackPower;

  // S'assurer que les PV ne sont pas négatifs
  if (gameState[opponentKey].health[targetId] < 0) {
    gameState[opponentKey].health[targetId] = 0;
  }

  // Réduire le nombre de tours d'attaque
  gameState[playerKey].turns[attackerId]--;

  // Vérifier si la partie est terminée
  const opponentAlive = Object.values(gameState[opponentKey].health).some(
    (health) => health > 0
  );

  if (!opponentAlive) {
    gameState.status = "finished";
    gameState.winner = playerKey;
  }

  // Mettre à jour l'état dans Supabase
  saveGameState(gameId, gameState);

  return gameState;
}

/**
 * Termine le tour du joueur courant
 * @param {string} gameId - ID de la partie
 * @param {string} playerId - ID du joueur
 * @returns {object} - État actualisé de la partie
 */
function endTurn(gameId, playerId) {
  const gameState = activeGames.get(gameId);

  if (!gameState) {
    throw new Error("Partie introuvable");
  }

  // Vérifier que c'est bien le tour du joueur
  const playerKey = gameState.player1.id === playerId ? "player1" : "player2";
  const opponentKey = playerKey === "player1" ? "player2" : "player1";

  if (gameState.currentTurn !== playerKey) {
    throw new Error("Ce n'est pas votre tour");
  }

  // Mettre à jour les durées des bonus
  for (const characterId in gameState[playerKey].activeBonus) {
    const bonusList = gameState[playerKey].activeBonus[characterId];

    // Réduire la durée de chaque bonus et filtrer ceux terminés
    gameState[playerKey].activeBonus[characterId] = bonusList
      .map((bonus) => ({ ...bonus, tours: bonus.tours - 1 }))
      .filter((bonus) => bonus.tours > 0);
  }

  // Changer le tour
  gameState.currentTurn = opponentKey;

  // Mettre à jour l'état dans Supabase
  saveGameState(gameId, gameState);

  return gameState;
}

/**
 * Récupère l'état d'une partie
 * @param {string} gameId - ID de la partie
 * @returns {object} - État de la partie
 */
async function getGameState(gameId) {
  // Vérifier si la partie est en mémoire
  let gameState = activeGames.get(gameId);

  if (!gameState) {
    // Récupérer de la base de données
    const { data, error } = await supabase
      .from("games")
      .select("game_state")
      .eq("id", gameId)
      .single();

    if (error || !data) {
      throw new Error("Partie introuvable");
    }

    gameState = JSON.parse(data.game_state);
    activeGames.set(gameId, gameState);
  }

  return gameState;
}

/**
 * Sauvegarde l'état d'une partie dans Supabase
 * @param {string} gameId - ID de la partie
 * @param {object} gameState - État à sauvegarder
 */
async function saveGameState(gameId, gameState) {
  const { data, error } = await supabase
    .from("games")
    .update({
      game_state: JSON.stringify(gameState),
      status: gameState.status,
      winner: gameState.winner,
    })
    .eq("id", gameId);

  if (error) {
    console.error(
      "Erreur lors de la sauvegarde de l'état de la partie:",
      error
    );
  }
}

module.exports = {
  createGame,
  joinGame,
  playCard,
  attack,
  endTurn,
  getGameState,
  activeGames,
};
