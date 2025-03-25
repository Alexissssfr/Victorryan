import Card from "./components/Card.js";

class GameManager {
  constructor(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.gameState = null;
    this.selectedCard = null;
    this.socket = null;
    this.cards = new Map();

    // Éléments DOM
    this.playerBoardElement = document.getElementById("player-board");
    this.opponentBoardElement = document.getElementById("opponent-board");
    this.playerHandElement = document.getElementById("player-hand");
    this.turnIndicatorElement = document.getElementById("turn-indicator");

    this.initializeSocket();
    this.initializeEventListeners();
  }

  initializeSocket() {
    this.socket = io(window.location.origin);

    this.socket.on("connect", () => {
      this.socket.emit("joinGame", {
        gameId: this.gameId,
        playerId: this.playerId,
      });
    });

    this.socket.on("gameState", (newState) => {
      this.updateGameState(newState);
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      alert(error.message);
    });
  }

  initializeEventListeners() {
    document.getElementById("end-turn-btn").addEventListener("click", () => {
      this.endTurn();
    });
  }

  updateGameState(newState) {
    this.gameState = newState;
    this.render();
  }

  render() {
    this.clearBoards();
    this.renderBoards();
    this.renderHand();
    this.updateTurnIndicator();
  }

  clearBoards() {
    this.playerBoardElement.innerHTML = "";
    this.opponentBoardElement.innerHTML = "";
    this.playerHandElement.innerHTML = "";
    this.cards.clear();
  }

  renderBoards() {
    const isPlayer1 = this.gameState.player1.id === this.playerId;
    const playerData = isPlayer1
      ? this.gameState.player1
      : this.gameState.player2;
    const opponentData = isPlayer1
      ? this.gameState.player2
      : this.gameState.player1;

    // Cartes du joueur
    playerData.cards.perso.forEach((cardData) => {
      const card = new Card(
        this.playerBoardElement,
        {
          ...cardData,
          type: "perso",
        },
        {
          isPlayable: this.isMyTurn(),
          onSelect: (card) => this.handleCardSelect(card),
        }
      );
      this.cards.set(cardData.id, card);
    });

    // Cartes de l'adversaire
    opponentData.cards.perso.forEach((cardData) => {
      const card = new Card(
        this.opponentBoardElement,
        {
          ...cardData,
          type: "perso",
        },
        {
          isPlayable: false,
        }
      );
      this.cards.set(cardData.id, card);
    });
  }

  renderHand() {
    const isPlayer1 = this.gameState.player1.id === this.playerId;
    const playerData = isPlayer1
      ? this.gameState.player1
      : this.gameState.player2;

    playerData.cards.bonus.forEach((cardData) => {
      const card = new Card(
        this.playerHandElement,
        {
          ...cardData,
          type: "bonus",
        },
        {
          isPlayable: this.isMyTurn(),
          onSelect: (card) => this.handleCardSelect(card),
          size: "small",
        }
      );
      this.cards.set(cardData.id, card);
    });
  }

  updateTurnIndicator() {
    const isMyTurn = this.isMyTurn();
    this.turnIndicatorElement.textContent = isMyTurn
      ? "C'est votre tour"
      : "Tour de l'adversaire";
    this.turnIndicatorElement.className = isMyTurn
      ? "my-turn"
      : "opponent-turn";
  }

  isMyTurn() {
    return this.gameState && this.gameState.currentPlayer === this.playerId;
  }

  handleCardSelect(card) {
    if (!this.isMyTurn()) return;

    if (this.selectedCard) {
      if (this.selectedCard.id === card.id) {
        // Désélectionner la carte
        this.cards.get(card.id).setState(null);
        this.selectedCard = null;
        this.resetTargetableCards();
      } else if (this.selectedCard.type === "bonus" && card.type === "perso") {
        // Appliquer un bonus
        this.playBonus(this.selectedCard.id, card.id);
      } else if (this.selectedCard.type === "perso" && card.type === "perso") {
        // Attaquer
        this.attack(this.selectedCard.id, card.id);
      }
    } else {
      // Sélectionner la carte
      this.selectedCard = card;
      this.cards.get(card.id).setState("selected");
      this.highlightTargetableCards(card);
    }
  }

  highlightTargetableCards(selectedCard) {
    if (selectedCard.type === "bonus") {
      // Mettre en surbrillance les cartes personnage alliées
      const isPlayer1 = this.gameState.player1.id === this.playerId;
      const playerCards = isPlayer1
        ? this.gameState.player1.cards.perso
        : this.gameState.player2.cards.perso;

      playerCards.forEach((card) => {
        this.cards.get(card.id).setState("attackable");
      });
    } else if (selectedCard.type === "perso") {
      // Mettre en surbrillance les cartes personnage ennemies
      const isPlayer1 = this.gameState.player1.id === this.playerId;
      const opponentCards = isPlayer1
        ? this.gameState.player2.cards.perso
        : this.gameState.player1.cards.perso;

      opponentCards.forEach((card) => {
        this.cards.get(card.id).setState("attackable");
      });
    }
  }

  resetTargetableCards() {
    this.cards.forEach((card) => {
      if (card.element.classList.contains("attackable")) {
        card.setState(null);
      }
    });
  }

  async playBonus(bonusCardId, targetCardId) {
    try {
      const response = await fetch(`/api/games/play-bonus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.playerId,
        },
        body: JSON.stringify({
          gameId: this.gameId,
          bonusCardId,
          targetPersoId: targetCardId,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      this.selectedCard = null;
      this.resetTargetableCards();
    } catch (error) {
      console.error("Error playing bonus:", error);
      alert(error.message);
    }
  }

  async attack(attackerCardId, targetCardId) {
    try {
      const response = await fetch(`/api/games/attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.playerId,
        },
        body: JSON.stringify({
          gameId: this.gameId,
          attackerCardId,
          targetCardId,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      // Animer l'attaque
      this.cards.get(targetCardId).setState("attacked");

      this.selectedCard = null;
      this.resetTargetableCards();
    } catch (error) {
      console.error("Error attacking:", error);
      alert(error.message);
    }
  }

  async endTurn() {
    try {
      const response = await fetch(`/api/games/end-turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.playerId,
        },
        body: JSON.stringify({
          gameId: this.gameId,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      this.selectedCard = null;
      this.resetTargetableCards();
    } catch (error) {
      console.error("Error ending turn:", error);
      alert(error.message);
    }
  }
}

export default GameManager;
