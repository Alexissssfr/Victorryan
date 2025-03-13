const supabase = require("../config/supabase");
const cardManager = require("./cardManager");

const activeGames = new Map();

async function createGame(playerId) {
  const gameId = generateUniqueId();
  const gameState = {
    id: gameId,
    player1: {
      id: playerId,
      health: {},
      attack: {},
      turns: {},
      activeBonus: {},
    },
    player2: null,
    currentPlayer: "player1",
    gameOver: false,
  };

  activeGames.set(gameId, gameState);

  // Sauvegarder l'état initial de la partie dans Supabase
  await supabase.from("games").insert(gameState);

  return gameId;
}

async function joinGame(gameId, playerId) {
  const game = activeGames.get(gameId);
  if (game && !game.player2) {
    game.player2 = {
      id: playerId,
      health: {},
      attack: {},
      turns: {},
      activeBonus: {},
    };

    // Distribuer les cartes aux joueurs
    const [player1Cards, player2Cards] = await Promise.all([
      cardManager.getRandomCards("perso", 5),
      cardManager.getRandomCards("perso", 5),
      cardManager.getRandomCards("bonus", 5),
      cardManager.getRandomCards("bonus", 5),
    ]);
    game.player1.cards = player1Cards;
    game.player2.cards = player2Cards;

    // Mettre à jour l'état de la partie dans Supabase
    await supabase.from("games").update(game).eq("id", gameId);

    return true;
  }
  return false;
}

async function playTurn(gameId, playerId, actions) {
  const game = activeGames.get(gameId);
  if (!game || game.gameOver) {
    return false;
  }

  const player = game.player1.id === playerId ? game.player1 : game.player2;
  if (
    !player ||
    game.currentPlayer !==
      (game.player1.id === playerId ? "player1" : "player2")
  ) {
    return false;
  }

  // Appliquer les actions du joueur
  applyBonusEffects(player, actions.bonus);
  applyAttack(player, actions.attack, game);

  // Vérifier les conditions de victoire
  if (checkWinCondition(game)) {
    game.gameOver = true;
  } else {
    // Passer au joueur suivant
    game.currentPlayer =
      game.currentPlayer === "player1" ? "player2" : "player1";
  }

  // Mettre à jour l'état de la partie dans Supabase
  await supabase.from("games").update(game).eq("id", gameId);

  return true;
}

function generateUniqueId() {
  // Générer un identifiant unique pour la partie
  // ...
}

function applyBonusEffects(player, bonusActions) {
  // Appliquer les effets des bonus joués par le joueur
  // ...
}

function applyAttack(player, attackAction, game) {
  // Appliquer l'attaque du joueur
  // ...
}

function checkWinCondition(game) {
  // Vérifier si un joueur a gagné la partie
  // ...
}

module.exports = {
  createGame,
  joinGame,
  playTurn,
};
