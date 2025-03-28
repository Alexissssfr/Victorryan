const fs = require("fs");
const path = require("path");
const { getImageUrl } = require("../config/supabase");

class GameManager {
  constructor() {
    this.activeGames = new Map();
  }

  /**
   * Crée une nouvelle partie
   * @param {string} gameId - ID de la partie
   * @returns {object} - Objet représentant l'état initial de la partie
   */
  createGame(gameId) {
    console.log(`Création d'une nouvelle partie avec ID: ${gameId}`);

    const gameState = {
      gameId,
      players: {
        player1: {
          id: "player1",
          pv: 0, // Sera mis à jour à la distribution des cartes
          personnages: [],
          personnageActif: null,
          cartesBonus: [],
        },
        player2: {
          id: "player2",
          pv: 0, // Sera mis à jour à la distribution des cartes
          personnages: [],
          personnageActif: null,
          cartesBonus: [],
        },
      },
      currentTurn: 1,
      currentPlayer: "player1",
      status: "waiting", // waiting, playing, finished
      lastUpdate: new Date().toISOString(),
    };

    this.activeGames.set(gameId, gameState);
    return gameState;
  }

  /**
   * Distribue les cartes initiales aux joueurs
   * @param {string} gameId - ID de la partie
   * @param {Array} personnages - Liste des personnages disponibles
   * @param {Array} bonus - Liste des bonus disponibles
   * @returns {boolean} - Succès de l'opération
   */
  dealInitialCards(gameId, personnages, bonus) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(
        `Partie ${gameId} non trouvée pour la distribution des cartes`
      );
      return false;
    }

    console.log(`Distribution des cartes pour la partie ${gameId}`);

    // Vérifier si nous avons des données
    if (!personnages || !personnages.length || !bonus || !bonus.length) {
      console.error(
        "Pas de données de cartes disponibles pour la distribution !"
      );
      return false;
    }

    // Mélanger les cartes
    const shuffledPersonnages = [...personnages].sort(
      () => Math.random() - 0.5
    );
    const shuffledBonus = [...bonus].sort(() => Math.random() - 0.5);

    // Distribuer 5 personnages à chaque joueur
    gameState.players.player1.personnages = shuffledPersonnages.slice(0, 5);
    gameState.players.player2.personnages = shuffledPersonnages.slice(5, 10);

    // S'assurer que chaque personnage a 100 points de vie
    gameState.players.player1.personnages.forEach((p) => (p.pointsdevie = 100));
    gameState.players.player2.personnages.forEach((p) => (p.pointsdevie = 100));

    // Calculer les PV totaux: 5 personnages × 100 PV = 500 PV par joueur
    gameState.players.player1.pv = 500;
    gameState.players.player2.pv = 500;

    // Définir le personnage actif pour chaque joueur
    gameState.players.player1.personnageActif =
      gameState.players.player1.personnages[0];
    gameState.players.player2.personnageActif =
      gameState.players.player2.personnages[0];

    // Distribuer 5 bonus à chaque joueur
    gameState.players.player1.cartesBonus = shuffledBonus.slice(0, 5);
    gameState.players.player2.cartesBonus = shuffledBonus.slice(5, 10);

    // Mettre à jour l'état du jeu
    gameState.status = "playing";
    gameState.lastUpdate = new Date().toISOString();

    // Sauvegarder l'état dans un fichier JSON
    this.saveGameState(gameId);

    return true;
  }

  /**
   * Sauvegarde l'état du jeu dans un fichier JSON
   * @param {string} gameId - ID de la partie
   * @returns {boolean} - Succès de l'opération
   */
  saveGameState(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Partie ${gameId} non trouvée pour la sauvegarde`);
      return false;
    }

    try {
      // Créer le dossier gameStates s'il n'existe pas
      const gameStatesDir = path.join(__dirname, "..", "..", "gameStates");
      if (!fs.existsSync(gameStatesDir)) {
        fs.mkdirSync(gameStatesDir, { recursive: true });
      }

      // Chemin du fichier de sauvegarde
      const filePath = path.join(gameStatesDir, `${gameId}.json`);

      // Sauvegarder l'état complet avec la date de dernière mise à jour
      gameState.lastUpdate = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(gameState, null, 2));

      console.log(`État de la partie ${gameId} sauvegardé dans ${filePath}`);
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
   * Récupère l'état du jeu pour un joueur spécifique
   * @param {string} gameId - ID de la partie
   * @param {string} playerId - ID du joueur
   * @returns {object} - État du jeu pour le joueur
   */
  getStateForPlayer(gameId, playerId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(
        `Partie ${gameId} non trouvée pour la récupération de l'état`
      );
      return null;
    }

    const opponent = playerId === "player1" ? "player2" : "player1";

    return {
      gameId: gameState.gameId,
      turn: gameState.currentTurn,
      currentPlayer: gameState.currentPlayer,
      status: gameState.status,
      you: {
        id: playerId,
        pv: gameState.players[playerId].pv,
        personnages: gameState.players[playerId].personnages,
        personnageActif: gameState.players[playerId].personnageActif,
        cartesBonus: gameState.players[playerId].cartesBonus,
      },
      opponent: {
        id: opponent,
        pv: gameState.players[opponent].pv,
        // Ne pas envoyer tous les détails des personnages de l'adversaire
        personnages: gameState.players[opponent].personnages.map((p) => ({
          id: p.id,
          nomcarteperso: p.nomcarteperso,
          pointsdevie: p.pointsdevie,
        })),
        personnageActif: gameState.players[opponent].personnageActif
          ? {
              id: gameState.players[opponent].personnageActif.id,
              nomcarteperso:
                gameState.players[opponent].personnageActif.nomcarteperso,
              pointsdevie:
                gameState.players[opponent].personnageActif.pointsdevie,
            }
          : null,
        // Ne pas envoyer les détails des cartes bonus de l'adversaire
        cartesBonus: gameState.players[opponent].cartesBonus.length,
      },
    };
  }

  /**
   * Change le personnage actif d'un joueur
   * @param {string} gameId - ID de la partie
   * @param {string} playerId - ID du joueur
   * @param {string} characterId - ID du personnage à activer
   * @returns {boolean} - Succès de l'opération
   */
  changeActiveCharacter(gameId, playerId, characterId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(
        `Partie ${gameId} non trouvée pour le changement de personnage actif`
      );
      return false;
    }

    const player = gameState.players[playerId];
    if (!player) {
      console.error(`Joueur ${playerId} non trouvé dans la partie ${gameId}`);
      return false;
    }

    // Vérifier si c'est bien le tour du joueur
    if (gameState.currentPlayer !== playerId) {
      console.error(
        `Ce n'est pas le tour du joueur ${playerId} dans la partie ${gameId}`
      );
      return false;
    }

    // Trouver le personnage dans la liste des personnages du joueur
    const character = player.personnages.find((p) => p.id === characterId);
    if (!character) {
      console.error(
        `Personnage ${characterId} non trouvé pour le joueur ${playerId}`
      );
      return false;
    }

    // Changer le personnage actif
    player.personnageActif = character;

    // Sauvegarder l'état du jeu
    this.saveGameState(gameId);

    console.log(
      `Personnage actif du joueur ${playerId} changé pour ${characterId}`
    );
    return true;
  }

  /**
   * Applique un bonus à un personnage
   * @param {string} gameId - ID de la partie
   * @param {string} playerId - ID du joueur
   * @param {object} bonusCard - Carte bonus à appliquer
   * @returns {boolean} - Succès de l'opération
   */
  applyBonus(gameId, playerId, bonusCard) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`Partie ${gameId} non trouvée pour l'application du bonus`);
      return false;
    }

    const player = gameState.players[playerId];
    if (!player) {
      console.error(`Joueur ${playerId} non trouvé dans la partie ${gameId}`);
      return false;
    }

    // Vérifier si c'est bien le tour du joueur
    if (gameState.currentPlayer !== playerId) {
      console.error(
        `Ce n'est pas le tour du joueur ${playerId} dans la partie ${gameId}`
      );
      return false;
    }

    // Trouver la carte bonus dans la main du joueur
    const bonusIndex = player.cartesBonus.findIndex(
      (card) => card.id === bonusCard.id
    );
    if (bonusIndex === -1) {
      console.error(
        `Carte bonus ${bonusCard.id} non trouvée dans la main du joueur ${playerId}`
      );
      return false;
    }

    // Vérifier si le joueur a un personnage actif
    if (!player.personnageActif) {
      console.error(
        `Le joueur ${playerId} n'a pas de personnage actif pour appliquer le bonus`
      );
      return false;
    }

    // Appliquer l'effet du bonus
    const bonus = parseInt(bonusCard.pourcentagebonus, 10) || 0;
    if (bonus > 0) {
      // Augmenter la force d'attaque du personnage
      const currentAttack =
        parseInt(player.personnageActif.forceattaque, 10) || 0;
      player.personnageActif.forceattaque = Math.round(
        currentAttack * (1 + bonus / 100)
      );

      console.log(
        `Bonus de ${bonus}% appliqué au personnage ${player.personnageActif.id}. Attaque: ${currentAttack} -> ${player.personnageActif.forceattaque}`
      );
    }

    // Retirer la carte bonus de la main du joueur
    player.cartesBonus.splice(bonusIndex, 1);

    // Sauvegarder l'état du jeu
    this.saveGameState(gameId);

    return true;
  }

  /**
   * Passe au tour suivant
   * @param {string} gameId - ID de la partie
   * @returns {boolean} - Succès de l'opération
   */
  nextTurn(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(
        `Partie ${gameId} non trouvée pour le passage au tour suivant`
      );
      return false;
    }

    // Changer de joueur
    gameState.currentPlayer =
      gameState.currentPlayer === "player1" ? "player2" : "player1";

    // Incrémenter le compteur de tours si on revient au premier joueur
    if (gameState.currentPlayer === "player1") {
      gameState.currentTurn++;
    }

    // Sauvegarder l'état du jeu
    this.saveGameState(gameId);

    console.log(
      `Tour suivant dans la partie ${gameId}: Joueur ${gameState.currentPlayer}, Tour ${gameState.currentTurn}`
    );
    return true;
  }

  /**
   * Charge une partie depuis un fichier JSON
   * @param {string} gameId - ID de la partie
   * @returns {boolean} - Succès de l'opération
   */
  loadGame(gameId) {
    try {
      const gameStatesDir = path.join(__dirname, "..", "..", "gameStates");
      const filePath = path.join(gameStatesDir, `${gameId}.json`);

      if (!fs.existsSync(filePath)) {
        console.error(`Fichier de sauvegarde ${filePath} non trouvé`);
        return false;
      }

      const gameState = JSON.parse(fs.readFileSync(filePath, "utf8"));
      this.activeGames.set(gameId, gameState);

      console.log(`Partie ${gameId} chargée depuis ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Erreur lors du chargement de la partie ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Récupère une image à partir de son type et de son ID
   * @param {string} type - Type de l'image (perso, bonus)
   * @param {string} id - ID de l'image
   * @returns {string} - URL de l'image
   */
  getImageUrl(type, id) {
    return getImageUrl(type, id);
  }
}

module.exports = GameManager;
