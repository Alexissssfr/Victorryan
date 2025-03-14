const crypto = require("crypto");
const cardManager = require("./cardManager");

// Map pour stocker les parties actives en mémoire
const activeGames = new Map();

// Déplacer le code de distribution des cartes dans une fonction asynchrone
async function distributeInitialCards(game, playerId) {
  if (!game.player1.hand || game.player1.hand.length === 0) {
    const persoCards = await cardManager.getRandomCards("perso", 5);
    const bonusCards = await cardManager.getRandomCards("bonus", 5);

    game.player1.hand = [...persoCards, ...bonusCards];
    game.player1.cardSVGs = {};

    // Stocker les SVG
    [...persoCards, ...bonusCards].forEach((card) => {
      if (card.svgContent) {
        game.player1.cardSVGs[card.id] = card.svgContent;
      }
    });
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
        // Récupérer la partie depuis la Map
        let game = activeGames.get(gameId);

        if (!game) {
          console.log("Partie non trouvée:", gameId);
          return false;
        }

        // Si le joueur 1 essaie de rejoindre à nouveau
        if (game.player1 && game.player1.id === playerId) {
          console.log(`Le joueur 1 (${playerId}) rejoint sa propre partie`);
          // Si le joueur 1 rejoint, s'assurer qu'il a des cartes
          game = await distributeInitialCards(game, playerId);
          return true;
        }

        // Si la partie n'a pas de joueur 2 ou si c'est le joueur 2 qui rejoint
        if (!game.player2 || (game.player2 && game.player2.id === playerId)) {
          // Si c'est un nouveau joueur 2
          if (!game.player2) {
            console.log(`Nouveau joueur 2 (${playerId}) rejoint la partie`);

            // Initialiser le joueur 2
            game.player2 = {
              id: playerId,
              health: {},
              attack: {},
              turns: {},
              activeBonus: {},
              deck: [],
              hand: [],
            };

            // Mettre à jour dans la Map locale
            activeGames.set(gameId, game);

            // Notifier les joueurs via Socket.io
            if (io) {
              io.to(gameId).emit("gameStarted", {
                gameId,
                player1Id: game.player1.id,
                player2Id: game.player2.id,
                currentPlayer: game.currentPlayer,
              });
              console.log("Événement gameStarted émis");
            }
          } else {
            console.log(`Le joueur 2 existant (${playerId}) rejoint à nouveau`);
          }

          return true;
        }

        console.log("Impossible de rejoindre la partie (déjà complète)");
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
