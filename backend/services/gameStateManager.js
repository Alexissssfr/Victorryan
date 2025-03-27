/**
 * Gestionnaire d'état de jeu
 * Ce fichier gère le stockage, la mise à jour et la récupération des états de jeu
 */

const fs = require("fs");
const path = require("path");
const CardManager = require("./cardManager");

class GameStateManager {
  constructor() {
    this.activeGames = new Map();
    this.cardManager = new CardManager();
    this.stateDirectory = path.join(__dirname, "../../gameStates");

    // Créer le dossier de sauvegarde s'il n'existe pas
    if (!fs.existsSync(this.stateDirectory)) {
      fs.mkdirSync(this.stateDirectory, { recursive: true });
    }

    // Charger les cartes
    this.cardManager.loadCards();
  }

  /**
   * Crée une nouvelle partie
   * @returns {string} ID de la partie créée
   */
  createGame() {
    // Générer un ID de partie unique
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Créer un nouvel état de jeu
    const gameState = {
      gameId,
      startTime: new Date().toISOString(),
      turn: 1,
      currentPlayer: "player1",
      status: "waiting",
      players: {
        player1: {
          pv: 525,
          cartes: 5,
          bonus: 0,
          personnage: null,
          personnages: [],
          cartesBonus: [],
        },
        player2: {
          pv: 490,
          cartes: 5,
          bonus: 0,
          personnage: null,
          personnages: [],
          cartesBonus: [],
        },
      },
    };

    // Stocker la partie
    this.activeGames.set(gameId, gameState);
    this.saveGameState(gameId);

    console.log(`Nouvelle partie créée: ${gameId}`);
    return gameId;
  }

  /**
   * Démarre une partie en distribuant les cartes
   * @param {string} gameId ID de la partie
   * @returns {boolean} Succès du démarrage
   */
  startGame(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Erreur: Partie ${gameId} introuvable`);
      return false;
    }

    // Vérifier si la partie est déjà commencée
    if (gameState.status !== "waiting") {
      console.log(`La partie ${gameId} est déjà en cours ou terminée`);
      return true;
    }

    // Générer des cartes pour la partie
    const gameCards = this.cardManager.generateGameCards(5, 5);

    // Distribuer les cartes aux joueurs
    gameState.players.player1.personnages = gameCards.player1.personnages;
    gameState.players.player1.cartesBonus = gameCards.player1.bonus;
    gameState.players.player1.personnage = gameCards.player1.personnages[0];

    gameState.players.player2.personnages = gameCards.player2.personnages;
    gameState.players.player2.cartesBonus = gameCards.player2.bonus;
    gameState.players.player2.personnage = gameCards.player2.personnages[0];

    // Mettre à jour l'état de la partie
    gameState.status = "playing";

    // Sauvegarder l'état
    this.saveGameState(gameId);

    console.log(`Partie ${gameId} démarrée, premier joueur: player1`);
    return true;
  }

  /**
   * Sauvegarde l'état d'une partie
   * @param {string} gameId ID de la partie
   * @returns {boolean} Succès de la sauvegarde
   */
  saveGameState(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Erreur: Partie ${gameId} introuvable pour la sauvegarde`);
      return false;
    }

    try {
      // Chemin du fichier de sauvegarde
      const filePath = path.join(this.stateDirectory, `${gameId}.json`);

      // Ajouter la date de mise à jour
      gameState.lastUpdated = new Date().toISOString();

      // Sauvegarder l'état
      fs.writeFileSync(filePath, JSON.stringify(gameState, null, 2));
      console.log(`État de la partie ${gameId} sauvegardé`);
      return true;
    } catch (error) {
      console.error(
        `Erreur lors de la sauvegarde de l'état de la partie ${gameId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Charge l'état d'une partie
   * @param {string} gameId ID de la partie
   * @returns {boolean} Succès du chargement
   */
  loadGameState(gameId) {
    try {
      // Chemin du fichier de sauvegarde
      const filePath = path.join(this.stateDirectory, `${gameId}.json`);

      // Vérifier l'existence du fichier
      if (!fs.existsSync(filePath)) {
        console.error(`Erreur: Fichier d'état ${filePath} introuvable`);
        return false;
      }

      // Charger l'état
      const gameState = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Stocker la partie
      this.activeGames.set(gameId, gameState);
      console.log(`État de la partie ${gameId} chargé`);
      return true;
    } catch (error) {
      console.error(
        `Erreur lors du chargement de l'état de la partie ${gameId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Obtient l'état d'une partie pour un joueur
   * @param {string} gameId ID de la partie
   * @param {string} playerId ID du joueur
   * @returns {Object|null} État de la partie pour le joueur ou null si erreur
   */
  getGameStateForPlayer(gameId, playerId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      // Essayer de charger la partie depuis le fichier
      const loaded = this.loadGameState(gameId);
      if (!loaded) {
        console.error(`Erreur: Partie ${gameId} introuvable`);
        return null;
      }
      return this.getGameStateForPlayer(gameId, playerId);
    }

    // Déterminer qui est l'adversaire
    const opponent = playerId === "player1" ? "player2" : "player1";

    // Créer une vue de l'état pour le joueur
    return {
      gameId: gameState.gameId,
      turn: gameState.turn,
      currentPlayer: gameState.currentPlayer,
      status: gameState.status,
      you: {
        pv: gameState.players[playerId].pv,
        cartes: gameState.players[playerId].cartes,
        bonus: gameState.players[playerId].bonus,
        personnage: gameState.players[playerId].personnage,
        personnages: gameState.players[playerId].personnages,
        cartesBonus: gameState.players[playerId].cartesBonus,
      },
      opponent: {
        pv: gameState.players[opponent].pv,
        cartes: gameState.players[opponent].cartes,
        bonus: gameState.players[opponent].bonus,
        personnage: gameState.players[opponent].personnage,
        // Masquer certaines informations de l'adversaire
        personnages: gameState.players[opponent].personnages?.map((p) => ({
          id: p.id,
          nom: p.nom,
          imageUrl: p.imageUrl,
        })),
        // Ne pas envoyer les cartes bonus de l'adversaire
        cartesBonus: gameState.players[opponent].cartesBonus?.length || 0,
      },
    };
  }

  /**
   * Change le personnage actif d'un joueur
   * @param {string} gameId ID de la partie
   * @param {string} playerId ID du joueur
   * @param {string} characterId ID du personnage
   * @returns {boolean} Succès du changement
   */
  changeActiveCharacter(gameId, playerId, characterId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Erreur: Partie ${gameId} introuvable`);
      return false;
    }

    // Vérifier que c'est le tour du joueur
    if (gameState.currentPlayer !== playerId) {
      console.error(`Erreur: Ce n'est pas le tour du joueur ${playerId}`);
      return false;
    }

    // Trouver le personnage
    const player = gameState.players[playerId];
    const character = player.personnages.find((p) => p.id === characterId);

    if (!character) {
      console.error(
        `Erreur: Personnage ${characterId} introuvable pour le joueur ${playerId}`
      );
      return false;
    }

    // Changer le personnage actif
    player.personnage = character;

    // Sauvegarder l'état
    this.saveGameState(gameId);

    console.log(
      `Joueur ${playerId} a changé son personnage actif pour ${characterId}`
    );
    return true;
  }

  /**
   * Applique une carte bonus
   * @param {string} gameId ID de la partie
   * @param {string} playerId ID du joueur
   * @param {Object} bonusCard Carte bonus à appliquer
   * @returns {boolean} Succès de l'application
   */
  applyBonus(gameId, playerId, bonusCard) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Erreur: Partie ${gameId} introuvable`);
      return false;
    }

    // Vérifier que c'est le tour du joueur
    if (gameState.currentPlayer !== playerId) {
      console.error(`Erreur: Ce n'est pas le tour du joueur ${playerId}`);
      return false;
    }

    // Trouver la carte bonus
    const player = gameState.players[playerId];
    const bonusIndex = player.cartesBonus.findIndex(
      (b) => b.id === bonusCard.id
    );

    if (bonusIndex === -1) {
      console.error(
        `Erreur: Carte bonus ${bonusCard.id} introuvable pour le joueur ${playerId}`
      );
      return false;
    }

    // Appliquer l'effet de la carte bonus
    const bonus = player.cartesBonus[bonusIndex];

    if (bonus.pourcentagebonus && player.personnage) {
      // Augmenter l'attaque du personnage actif
      const oldAttack = player.personnage.forceattaque;
      player.personnage.forceattaque = Math.round(
        oldAttack * (1 + bonus.pourcentagebonus / 100)
      );
      console.log(
        `Bonus appliqué: Attaque de ${oldAttack} à ${player.personnage.forceattaque}`
      );
    }

    // Retirer la carte bonus de la main du joueur
    player.cartesBonus.splice(bonusIndex, 1);

    // Sauvegarder l'état
    this.saveGameState(gameId);

    console.log(`Joueur ${playerId} a utilisé la carte bonus ${bonus.id}`);
    return true;
  }

  /**
   * Passe au tour suivant
   * @param {string} gameId ID de la partie
   * @returns {boolean} Succès du changement de tour
   */
  nextTurn(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Erreur: Partie ${gameId} introuvable`);
      return false;
    }

    // Changer de joueur
    gameState.currentPlayer =
      gameState.currentPlayer === "player1" ? "player2" : "player1";

    // Incrémenter le compteur de tours
    gameState.turn++;

    // Sauvegarder l'état
    this.saveGameState(gameId);

    console.log(
      `Partie ${gameId}: Tour ${gameState.turn}, joueur actif: ${gameState.currentPlayer}`
    );
    return true;
  }
}

module.exports = GameStateManager;
