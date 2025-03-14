const crypto = require("crypto");

class Game {
  constructor(gameId) {
    this.id = gameId;
    this.players = {
      player1: null,
      player2: null,
    };
    this.cards = {
      player1: {
        perso: [],
        bonus: [],
      },
      player2: {
        perso: [],
        bonus: [],
      },
    };
    this.currentTurn = {
      player: "player1", // Le joueur 1 commence toujours
      selectedBonus: null,
      targetPerso: null,
    };
    this.status = "waiting"; // waiting, playing, finished
  }

  // Ajouter un joueur à la partie
  addPlayer(playerId) {
    if (!this.players.player1) {
      this.players.player1 = playerId;
      return "player1";
    } else if (!this.players.player2) {
      this.players.player2 = playerId;
      this.status = "playing";
      return "player2";
    }
    return null;
  }

  // Distribuer les cartes initiales aux joueurs
  async distributeInitialCards(cardManager) {
    try {
      // Distribuer les cartes au joueur 1
      const [persoCards1, bonusCards1] = await Promise.all([
        cardManager.getRandomCards("perso", 5),
        cardManager.getRandomCards("bonus", 5),
      ]);

      // Stocker les IDs des cartes déjà distribuées
      const usedPersoIds = persoCards1.map((c) => c.id);
      const usedBonusIds = bonusCards1.map((c) => c.id);

      // Distribuer les cartes au joueur 2
      const [persoCards2, bonusCards2] = await Promise.all([
        cardManager.getRandomCards("perso", 5, usedPersoIds),
        cardManager.getRandomCards("bonus", 5, usedBonusIds),
      ]);

      // S'assurer que les SVG sont chargés pour toutes les cartes
      for (const card of [
        ...persoCards1,
        ...bonusCards1,
        ...persoCards2,
        ...bonusCards2,
      ]) {
        try {
          const type = card.id.startsWith("P") ? "perso" : "bonus";
          card.svgContent = await cardManager.loadCardSVG(type, card.id);
          console.log(`SVG chargé pour la carte ${card.id}`);
        } catch (error) {
          console.error(
            `Erreur chargement SVG pour la carte ${card.id}:`,
            error
          );
        }
      }

      // Assigner les cartes aux joueurs
      this.cards.player1 = {
        perso: persoCards1,
        bonus: bonusCards1,
      };

      this.cards.player2 = {
        perso: persoCards2,
        bonus: bonusCards2,
      };

      console.log(
        `Cartes distribuées et chargées - Joueur 1: ${
          persoCards1.length + bonusCards1.length
        }, Joueur 2: ${persoCards2.length + bonusCards2.length}`
      );
    } catch (error) {
      console.error("Erreur lors de la distribution des cartes:", error);
      throw error;
    }
  }

  async loadCardSVG(card, type) {
    if (!card.svgContent) {
      card.svgContent = await cardManager.loadCardSVG(type, card.id);
    }
    return card;
  }

  // Obtenir l'état de la partie pour un joueur spécifique
  getStateForPlayer(playerId) {
    const isPlayer1 = this.players.player1 === playerId;
    const playerRole = isPlayer1 ? "player1" : "player2";

    return {
      gameId: this.id,
      status: this.status,
      currentTurn: this.currentTurn,
      isYourTurn: this.currentTurn.player === playerRole,
      playerCards: {
        perso: this.cards[playerRole].perso,
        bonus: this.cards[playerRole].bonus,
      },
      opponentCards: {
        perso: this.cards[isPlayer1 ? "player2" : "player1"].perso,
        bonus: this.cards[isPlayer1 ? "player2" : "player1"].bonus,
      },
    };
  }

  // Appliquer un bonus à une carte
  applyBonus(bonusCard, targetCard) {
    // Mettre à jour les stats de la carte cible
    targetCard.currentStats.pointsdevie += parseInt(bonusCard.pointsdevie || 0);
    targetCard.currentStats.forceattaque += parseInt(
      bonusCard.forceattaque || 0
    );
    targetCard.currentStats.tourattaque += parseInt(bonusCard.tourattaque || 0);
    targetCard.currentStats.bonusActifs.push(bonusCard.id);
  }

  // Appliquer un bonus à une carte
  applyBonusToCard(bonusCardId, targetCardId, playerId) {
    const playerRole =
      this.players.player1 === playerId ? "player1" : "player2";

    if (this.currentTurn.player !== playerRole) {
      throw new Error("Ce n'est pas votre tour");
    }

    // Trouver les cartes concernées
    const bonusCard = this.cards[playerRole].bonus.find(
      (c) => c.id === bonusCardId
    );
    const targetCard = this.cards[playerRole].perso.find(
      (c) => c.id === targetCardId
    );

    if (!bonusCard || !targetCard) {
      throw new Error("Carte non trouvée");
    }

    // Si un autre personnage a déjà reçu un bonus ce tour-ci
    if (
      this.currentTurn.targetPerso &&
      this.currentTurn.targetPerso !== targetCardId
    ) {
      throw new Error(
        "Vous ne pouvez donner des bonus qu'à un seul personnage par tour"
      );
    }

    // Appliquer le bonus
    this.applyBonus(bonusCard, targetCard);
    this.currentTurn.targetPerso = targetCardId;

    return this.getStateForPlayer(playerId);
  }

  // Passer au tour suivant
  endTurn() {
    this.currentTurn = {
      player: this.currentTurn.player === "player1" ? "player2" : "player1",
      selectedBonus: null,
      targetPerso: null,
    };
  }
}

// Gestionnaire de cache pour les parties
class GameCache {
  constructor() {
    this.games = new Map();
  }

  async createGame(playerId) {
    try {
      const gameId = crypto.randomUUID().slice(0, 6).toUpperCase();
      const game = new Game(gameId);

      // Ajouter le premier joueur
      game.addPlayer(playerId);

      // Distribuer les cartes initiales
      const cardManager = require("./cardManager");
      const persoCards = await cardManager.getRandomCards("perso", 5);
      const bonusCards = await cardManager.getRandomCards("bonus", 5);

      game.cards.player1 = {
        perso: persoCards,
        bonus: bonusCards,
      };

      this.games.set(gameId, game);

      return {
        gameId,
        state: game.getStateForPlayer(playerId),
      };
    } catch (error) {
      console.error("Erreur création partie:", error);
      throw error;
    }
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  deleteGame(gameId) {
    this.games.delete(gameId);
  }
}

module.exports = new GameCache();
