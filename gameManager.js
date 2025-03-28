const fs = require("fs");
const path = require("path");

// Charger les cartes depuis les fichiers JSON
const personnages = JSON.parse(
  fs.readFileSync(path.join(__dirname, "stock/personnages.json"))
);
const bonus = JSON.parse(
  fs.readFileSync(path.join(__dirname, "stock/bonus.json"))
);

const activeGames = new Map();

// Fonction pour initialiser les cartes pour une partie
function initializeGameCards() {
  const shuffledPersonnages = shuffleArray(personnages).slice(0, 5);
  const shuffledBonus = shuffleArray(bonus).slice(0, 5);

  return {
    personnages: shuffledPersonnages,
    bonus: shuffledBonus,
  };
}

// Fonction utilitaire pour mélanger un tableau
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function createGame() {
  const gameId = generateUniqueId();
  const gameCards = initializeGameCards();

  activeGames.set(gameId, {
    players: {},
    cards: gameCards,
  });

  return gameId;
}

function joinGame(gameId, playerName) {
  if (!activeGames.has(gameId)) {
    throw new Error("Partie non trouvée");
  }

  const playerId = generateUniqueId();
  const game = activeGames.get(gameId);

  game.players[playerId] = {
    name: playerName,
    health: {},
    attack: {},
    turns: {},
    activeBonus: {},
  };

  return playerId;
}

module.exports = {
  initializeGameCards,
  createGame,
  joinGame,
};
