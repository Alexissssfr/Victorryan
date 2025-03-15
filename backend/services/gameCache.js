const crypto = require("crypto");

class Game {
  constructor(gameId, creatorId) {
    this.gameId = gameId;
    this.players = {
      player1: creatorId,
      player2: null,
    };
    this.cards = {
      // Structure pour stocker les cartes
      player1: {
        perso: [],
        bonus: [],
      },
      player2: {
        perso: [],
        bonus: [],
      },
    };
    this.status = "waiting";
    this.currentTurn = {
      player: "player1",
      selectedBonus: null,
      targetPerso: null,
    };
  }

  addPlayer(playerId) {
    // Vérifier si le joueur n'est pas déjà dans la partie
    if (
      this.players.player1 === playerId ||
      this.players.player2 === playerId
    ) {
      return this.players.player1 === playerId ? "player1" : "player2";
    }

    // Vérifier si la partie n'est pas pleine
    if (this.players.player2 === null) {
      this.players.player2 = playerId;
      this.status = "playing";

      // S'assurer que les structures de cartes sont initialisées
      this.cards = {
        player1: {
          perso: this.cards.player1.perso || [],
          bonus: this.cards.player1.bonus || [],
        },
        player2: {
          perso: [],
          bonus: [],
        },
      };

      return "player2";
    }
    return null;
  }

  async distributeInitialCards(cardManager) {
    try {
      // Vérifier si les cartes ont déjà été distribuées
      if (this.cards.player1.perso.length > 0) {
        console.log("Les cartes ont déjà été distribuées");
        return true;
      }

      console.log("Distribution des cartes initiales...");

      // Distribuer les cartes aux deux joueurs
      const [persoCards1, bonusCards1] = await Promise.all([
        cardManager.getRandomCards("perso", 5),
        cardManager.getRandomCards("bonus", 5),
      ]);

      const [persoCards2, bonusCards2] = await Promise.all([
        cardManager.getRandomCards("perso", 5),
        cardManager.getRandomCards("bonus", 5),
      ]);

      // Assigner les cartes aux joueurs
      this.cards = {
        player1: {
          perso: persoCards1,
          bonus: bonusCards1,
        },
        player2: {
          perso: persoCards2,
          bonus: bonusCards2,
        },
      };

      console.log("Cartes distribuées:", {
        player1Cards: this.cards.player1,
        player2Cards: this.cards.player2,
      });

      return true;
    } catch (error) {
      console.error("Erreur distribution cartes:", error);
      throw error;
    }
  }

  async loadCardSVG(card, type) {
    if (!card.svgContent) {
      card.svgContent = await cardManager.loadCardSVG(type, card.id);
    }
    return card;
  }

  getStateForPlayer(playerId) {
    // Vérifier si le joueur est dans la partie
    if (
      playerId !== this.players.player1 &&
      playerId !== this.players.player2
    ) {
      throw new Error("Joueur non trouvé dans la partie");
    }

    const isPlayer1 = playerId === this.players.player1;
    const playerRole = isPlayer1 ? "player1" : "player2";

    return {
      gameId: this.gameId,
      status: this.status,
      currentTurn: this.currentTurn,
      isYourTurn: this.currentTurn.player === playerRole,
      playerCards: this.cards[playerRole],
      opponentCards: this.cards[isPlayer1 ? "player2" : "player1"],
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
      const game = new Game(gameId, playerId);
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
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`Partie ${gameId} non trouvée`);
      console.log("Parties existantes:", Array.from(this.games.keys()));
    }
    return game;
  }

  deleteGame(gameId) {
    this.games.delete(gameId);
  }
}

module.exports = new GameCache();
