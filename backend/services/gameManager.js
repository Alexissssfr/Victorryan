const crypto = require("crypto");
const cardManager = require("./cardManager");

// Map pour stocker les parties actives en mémoire
const activeGames = new Map();

// Déplacer le code de distribution des cartes dans une fonction asynchrone
async function distributeInitialCards(game, playerId, isPlayer2 = false) {
  const playerKey = isPlayer2 ? "player2" : "player1";

  if (!game[playerKey].hand || game[playerKey].hand.length === 0) {
    // Distribuer 5 cartes de chaque type
    const persoCards = await cardManager.getRandomCards("perso", 5);
    const bonusCards = await cardManager.getRandomCards("bonus", 5);

    game[playerKey].hand = [...persoCards, ...bonusCards];
    game[playerKey].cardSVGs = {};

    // Stocker les SVG
    [...persoCards, ...bonusCards].forEach((card) => {
      if (card.svgContent) {
        game[playerKey].cardSVGs[card.id] = card.svgContent;
      }
    });

    console.log(`${playerKey} a reçu ${game[playerKey].hand.length} cartes`);
  }
  return game;
}

// Fonction pour gérer les parties avec Socket.io
module.exports = function (io) {
  return {
    createGame: async function (playerId) {
      try {
        const gameId = generateUniqueId();
        const gameState = {
          id: gameId,
          player1: {
            id: playerId,
            health: {},
            attack: {},
            turns: {},
            activeBonus: {},
            deck: [],
            hand: [],
            cardSVGs: {},
          },
          player2: null,
          currentPlayer: "player1",
          gameOver: false,
          winner: null,
          createdAt: new Date().toISOString(),
        };

        // Distribuer les cartes initiales
        await distributeInitialCards(gameState, playerId);

        // Sauvegarder dans la Map locale
        activeGames.set(gameId, gameState);

        return gameId;
      } catch (error) {
        console.error("Erreur lors de la création de la partie:", error);
        throw error;
      }
    },

    joinGame: async function (gameId, playerId) {
      console.log(
        `Tentative de rejoindre la partie ${gameId} pour le joueur ${playerId}`
      );

      try {
        let game = activeGames.get(gameId);
        if (!game) return false;

        if (game.player1 && game.player1.id === playerId) {
          game = await distributeInitialCards(game, playerId, false);
          return true;
        }

        if (!game.player2 || (game.player2 && game.player2.id === playerId)) {
          if (!game.player2) {
            game.player2 = {
              id: playerId,
              health: {},
              attack: {},
              turns: {},
              activeBonus: {},
              deck: [],
              hand: [],
              cardSVGs: {},
            };

            // Distribuer les cartes au joueur 2
            game = await distributeInitialCards(game, playerId, true);

            activeGames.set(gameId, game);

            if (io) {
              io.to(gameId).emit("gameStarted", {
                gameId,
                player1Id: game.player1.id,
                player2Id: game.player2.id,
                currentPlayer: game.currentPlayer,
                player1Cards: game.player1.hand,
                player2Cards: game.player2.hand,
              });
            }
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          "Erreur lors de la tentative de rejoindre la partie:",
          error
        );
        return false;
      }
    },

    playTurn: async function (gameId, playerId, actions) {
      // Version simplifiée pour le débogage
      console.log(`Joueur ${playerId} joue dans la partie ${gameId}`);
      console.log("Actions:", actions);

      // Récupérer la partie
      let game = activeGames.get(gameId);

      if (!game) {
        console.log("Partie non trouvée");
        return false;
      }

      // Dans cette version simplifiée, toujours retourner true
      return true;
    },

    getGameState: async function (gameId) {
      return activeGames.get(gameId) || null;
    },
  };
};

// Générer un identifiant unique pour la partie
function generateUniqueId() {
  // Générer un UUID v4
  return crypto.randomUUID();
}
