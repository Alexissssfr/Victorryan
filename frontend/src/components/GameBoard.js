import { CardHand } from "./CardHand.js";
import { PlayerInfo } from "./PlayerInfo.js";

/**
 * Classe représentant le plateau de jeu
 */
export class GameBoard {
  /**
   * Crée une instance de plateau de jeu
   * @param {object} appState - État global de l'application
   * @param {object} elements - Éléments DOM du jeu
   * @param {Function} onCardSelect - Fonction à appeler lors de la sélection d'une carte
   * @param {Function} onTargetSelect - Fonction à appeler lors de la sélection d'une cible
   */
  constructor(appState, elements, onCardSelect, onTargetSelect) {
    this.appState = appState;
    this.elements = elements;

    // Créer les mains de cartes
    this.playerPersonnages = new CardHand("playerPersonnages", (card) =>
      onCardSelect(card, "personnage")
    );

    this.playerBonus = new CardHand("playerBonus", (card) =>
      onCardSelect(card, "bonus")
    );

    this.opponentCards = new CardHand("opponentCards", (card) =>
      onTargetSelect(card)
    );

    // Créer les infos des joueurs
    this.playerInfo = new PlayerInfo("player-info", "Vous");
    this.opponentInfo = new PlayerInfo("opponent-info", "Adversaire");
  }

  /**
   * Met à jour l'affichage du plateau avec l'état actuel du jeu
   */
  update() {
    const gameState = this.appState.game.state;
    const playerKey = this.appState.game.playerKey;
    const opponentKey = this.appState.game.opponentKey;

    // Vérifier si l'état du jeu est disponible
    if (!gameState || !playerKey || !opponentKey) {
      return;
    }

    // Mettre à jour l'indicateur de tour
    this.updateTurnIndicator();

    // Mettre à jour les cartes du joueur
    this.playerPersonnages.setCards(
      gameState[playerKey].cards.personnages,
      "personnage",
      {
        health: gameState[playerKey].health,
        attack: gameState[playerKey].attack,
        turns: gameState[playerKey].turns,
      },
      gameState[playerKey].activeBonus
    );

    this.playerBonus.setCards(gameState[playerKey].cards.bonus, "bonus");

    // Mettre à jour les cartes de l'adversaire
    this.opponentCards.setCards(
      gameState[opponentKey].cards.personnages,
      "personnage",
      {
        health: gameState[opponentKey].health,
      }
    );

    // Activer ou désactiver les boutons d'action
    this.toggleActionButtons(this.appState.game.isMyTurn);

    // Vérifier si la partie est terminée
    if (gameState.status === "finished") {
      this.showGameOver(gameState.winner === playerKey);
    }
  }

  /**
   * Met à jour l'indicateur de tour
   */
  updateTurnIndicator() {
    this.elements.turnIndicator.textContent = this.appState.game.isMyTurn
      ? "C'est votre tour"
      : "Tour de l'adversaire";

    this.elements.turnIndicator.style.backgroundColor = this.appState.game
      .isMyTurn
      ? "#007bff"
      : "#6c757d";
  }

  /**
   * Active ou désactive les boutons d'action
   * @param {boolean} enable - Activer ou désactiver les boutons
   */
  toggleActionButtons(enable) {
    this.elements.attackBtn.disabled = !enable;
    this.elements.applyBonusBtn.disabled = !enable;
    this.elements.endTurnBtn.disabled = !enable;
  }

  /**
   * Affiche l'écran de fin de partie
   * @param {boolean} isWinner - Le joueur est-il le gagnant
   */
  showGameOver(isWinner) {
    this.elements.winnerDisplay.textContent = isWinner
      ? "Vous avez gagné !"
      : "Vous avez perdu !";

    this.elements.gameView.style.display = "none";
    this.elements.gameOver.style.display = "block";
  }

  /**
   * Sélectionne une carte et désélectionne les autres
   * @param {Card} card - Carte à sélectionner
   * @param {string} type - Type de carte (personnage ou bonus)
   */
  selectCard(card, type) {
    // Désélectionner toutes les cartes
    this.playerPersonnages.clearSelection();
    this.playerBonus.clearSelection();

    // Sélectionner la carte appropriée
    if (type === "personnage") {
      this.playerPersonnages.selectCard(card);
    } else {
      this.playerBonus.selectCard(card);
    }

    // Mettre à jour l'état global
    this.appState.game.selectedCard = { card, type };
  }

  /**
   * Sélectionne une cible
   * @param {Card} card - Carte cible
   */
  selectTarget(card) {
    // Désélectionner toutes les cibles précédentes
    this.opponentCards.clearSelection();

    // Sélectionner la nouvelle cible
    this.opponentCards.selectCard(card);

    // Mettre à jour l'état global
    this.appState.game.selectedTarget = card;
  }

  /**
   * Efface toutes les sélections
   */
  clearSelections() {
    this.playerPersonnages.clearSelection();
    this.playerBonus.clearSelection();
    this.opponentCards.clearSelection();

    this.appState.game.selectedCard = null;
    this.appState.game.selectedTarget = null;
  }
}
