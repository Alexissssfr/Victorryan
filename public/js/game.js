class Game {
  constructor() {
    this.players = {
      player1: {
        name: "Joueur 1",
        personnage: null,
        bonus: [],
        pv: 100,
      },
      player2: {
        name: "Joueur 2",
        personnage: null,
        bonus: [],
        pv: 100,
      },
    };
    this.currentPlayer = "player1";
    this.selectedCard = null;
    this.gameState = "waiting"; // waiting, playing, finished
    this.setupEventListeners();
  }

  setupEventListeners() {
    document
      .getElementById("startGame")
      .addEventListener("click", () => this.startGame());
    document
      .getElementById("endTurn")
      .addEventListener("click", () => this.endTurn());
  }

  async startGame() {
    try {
      // Créer une nouvelle partie
      const response = await fetch("/api/game/create", {
        method: "POST",
      });
      const { gameId } = await response.json();

      // Démarrer la partie
      await fetch(`/api/game/${gameId}/start`, {
        method: "POST",
      });

      this.gameState = "playing";
      this.render();
    } catch (error) {
      console.error("Erreur lors du démarrage de la partie:", error);
    }
  }

  render() {
    // Mise à jour du plateau
    const player1Board = document.getElementById("player1Board");
    const player2Board = document.getElementById("player2Board");
    const player1Hand = document.getElementById("player1Hand");
    const player2Hand = document.getElementById("player2Hand");

    // Nettoyage des zones
    player1Board.innerHTML = "<h2>Joueur 1</h2>";
    player2Board.innerHTML = "<h2>Joueur 2</h2>";
    player1Hand.innerHTML = "<h2>Main du Joueur 1</h2>";
    player2Hand.innerHTML = "<h2>Main du Joueur 2</h2>";

    // Affichage des personnages
    if (this.players.player1.personnage) {
      const cardElement = this.players.player1.personnage.createCardElement();
      cardElement.addEventListener("click", () =>
        this.handleCardSelect(this.players.player1.personnage)
      );
      player1Board.appendChild(cardElement);
    }

    if (this.players.player2.personnage) {
      const cardElement = this.players.player2.personnage.createCardElement();
      cardElement.addEventListener("click", () =>
        this.handleCardSelect(this.players.player2.personnage)
      );
      player2Board.appendChild(cardElement);
    }

    // Affichage des cartes bonus
    this.players.player1.bonus.forEach((bonus) => {
      const cardElement = bonus.createCardElement();
      cardElement.addEventListener("click", () => this.handleCardSelect(bonus));
      player1Hand.appendChild(cardElement);
    });

    this.players.player2.bonus.forEach((bonus) => {
      const cardElement = bonus.createCardElement();
      cardElement.addEventListener("click", () => this.handleCardSelect(bonus));
      player2Hand.appendChild(cardElement);
    });

    this.updateTurnIndicator();
  }

  handleCardSelect(card) {
    if (this.gameState !== "playing") return;

    const isPlayer1Turn = this.currentPlayer === "player1";
    const isPlayer1Card =
      this.players.player1.personnage === card ||
      this.players.player1.bonus.includes(card);

    if (
      (isPlayer1Turn && isPlayer1Card) ||
      (!isPlayer1Turn && !isPlayer1Card)
    ) {
      this.selectedCard = card;
      this.applyCardEffect(card);
    }
  }

  applyCardEffect(card) {
    if (card.type === "bonus") {
      const targetPlayer = this.currentPlayer;
      const effect = card.stats.effet;
      const value = card.stats.valeur;

      switch (effect) {
        case "attaque":
          this.players[targetPlayer].personnage.stats.forceattaque += value;
          break;
        case "pv":
          this.players[targetPlayer].pv = Math.min(
            100,
            this.players[targetPlayer].pv + value
          );
          break;
        case "defense":
          this.players[targetPlayer].personnage.stats.defense += value;
          break;
      }

      // Retirer la carte bonus utilisée
      const bonusIndex = this.players[targetPlayer].bonus.indexOf(card);
      if (bonusIndex > -1) {
        this.players[targetPlayer].bonus.splice(bonusIndex, 1);
      }
    }
  }

  async endTurn() {
    if (this.gameState !== "playing") return;

    try {
      // Récupérer l'ID de la partie en cours
      const gameId = window.location.pathname.split("/").pop();

      // Appeler l'API pour terminer le tour
      await fetch(`/api/game/${gameId}/end-turn`, {
        method: "POST",
      });

      this.currentPlayer =
        this.currentPlayer === "player1" ? "player2" : "player1";
      this.selectedCard = null;
      this.render();
    } catch (error) {
      console.error("Erreur lors de la fin du tour:", error);
    }
  }

  updateTurnIndicator() {
    const turnIndicator = document.getElementById("turnIndicator");
    turnIndicator.textContent = `Tour de ${
      this.players[this.currentPlayer].name
    }`;
  }
}

// Initialisation du jeu
window.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();
});
