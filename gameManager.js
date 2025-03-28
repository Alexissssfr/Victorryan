const fs = require("fs");
const path = require("path");

// Charger les cartes depuis les fichiers JSON
const personnagesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "stock/personnages.json"), "utf-8")
);
const bonusData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "stock/bonus.json"), "utf-8")
);

const activeGames = new Map();

// Fonction utilitaire pour mélanger un tableau
function shuffleArray(array) {
  const shuffled = [...array]; // Crée une copie pour ne pas modifier l'original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fonction pour initialiser les cartes pour un joueur
function initializePlayerCards() {
  // Distribue 5 cartes personnages et 5 cartes bonus uniques par joueur
  const personnages = shuffleArray(personnagesData)
    .slice(0, 5)
    .map((card) => ({ ...card })); // Copie profonde
  const bonus = shuffleArray(bonusData)
    .slice(0, 5)
    .map((card) => ({ ...card })); // Copie profonde

  return {
    personnages, // Main de personnages
    bonus, // Main de bonus
  };
}

// Fonction pour générer un ID unique (ajoutée ici)
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 10);
}

function createGame() {
  const gameId = generateUniqueId();
  // Initialise la structure de la partie
  activeGames.set(gameId, {
    id: gameId,
    players: {}, // Sera rempli quand les joueurs rejoignent
    // Pas besoin de 'cards' ici, chaque joueur aura sa propre main
    gameState: "waiting", // États possibles: waiting, playing, finished
    currentTurn: null, // ID du joueur dont c'est le tour
  });
  console.log(`Nouvelle partie créée avec l'ID: ${gameId}`);
  return gameId;
}

function joinGame(gameId, playerName) {
  if (!activeGames.has(gameId)) {
    throw new Error("Partie non trouvée");
  }

  const game = activeGames.get(gameId);

  // Vérifier si la partie est pleine (max 2 joueurs par exemple)
  if (Object.keys(game.players).length >= 2) {
    throw new Error("La partie est pleine");
  }

  const playerId = generateUniqueId();
  const playerCards = initializePlayerCards(); // Donne des cartes au joueur

  // Initialise l'état du joueur dans la partie
  game.players[playerId] = {
    id: playerId,
    name: playerName,
    hand: playerCards, // Cartes en main
    // Initialise les stats des personnages basées sur les cartes distribuées
    charactersState: playerCards.personnages.reduce((acc, card) => {
      acc[card.id] = {
        // Utilise l'ID unique de la carte (ex: P1)
        currentHealth: card.PV,
        currentAttack: card.force_attaque,
        currentTurns: card.tours_attaque,
        activeBonus: [], // Bonus actifs sur ce personnage
      };
      return acc;
    }, {}),
  };

  console.log(
    `Joueur ${playerName} (ID: ${playerId}) a rejoint la partie ${gameId}`
  );

  // Si c'est le premier joueur, il commence ? Ou déterminer aléatoirement.
  if (Object.keys(game.players).length === 1) {
    game.currentTurn = playerId;
  }
  // Si 2 joueurs, la partie peut commencer
  if (Object.keys(game.players).length === 2) {
    game.gameState = "playing";
    // On pourrait choisir le premier joueur aléatoirement ici
    // game.currentTurn = Object.keys(game.players)[Math.floor(Math.random() * 2)];
  }

  return { playerId, game }; // Retourne l'ID du joueur et l'état du jeu mis à jour
}

module.exports = {
  createGame,
  joinGame,
  activeGames, // Exporte activeGames pour y accéder depuis server.js
  // Pas besoin d'exporter initializeGameCards si elle est utilisée seulement ici
};
