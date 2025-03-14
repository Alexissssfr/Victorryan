async function createGame() {
  try {
    const playerId = crypto.randomUUID();
    console.log("Création d'une partie...");

    const response = await fetch("/api/games/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Réponse reçue:", data);

    if (data.success) {
      // Cacher le menu et afficher le plateau
      document.getElementById("main-menu").style.display = "none";
      document.getElementById("game-board").style.display = "block";

      // Mettre à jour l'affichage du code de partie
      const gameIdDisplay = document.getElementById("game-id-display");
      if (gameIdDisplay) {
        gameIdDisplay.textContent = `Code partie: ${data.state.gameId}`;
      }

      // Stocker l'ID de partie et l'ID joueur
      window.gameId = data.state.gameId;
      window.playerId = playerId;

      // Mettre à jour l'état du jeu
      if (window.gameUI) {
        window.gameUI.updateState(data.state);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
  }
}

class GameUI {
  constructor(container) {
    this.container = container;
    this.gameState = null;
    this.playerId = null;
    this.selectedBonus = null;
    this.selectedPerso = null;
    this.isMyTurn = false;
    this.createContainers();
  }

  updateState(state) {
    console.log("Mise à jour de l'état:", state);
    this.gameState = state;
    this.isMyTurn = state.isYourTurn;

    // Mettre à jour l'affichage
    this.displayCards();
    this.updateTurnIndicator();
    this.updateGameStatus();
  }

  displayCards() {
    try {
      const { playerCards, opponentCards } = this.gameState;

      if (!playerCards?.perso || !playerCards?.bonus) {
        console.log("En attente des cartes...");
        return;
      }

      console.log("Affichage des cartes:", {
        player: playerCards,
        opponent: opponentCards,
      });

      // Afficher les cartes
      this.container.innerHTML = `
        <div class="opponent-area">
          <div class="bonus-cards">${this.renderCards(
            opponentCards.bonus || [],
            false
          )}</div>
          <div class="perso-cards">${this.renderCards(
            opponentCards.perso || [],
            false
          )}</div>
        </div>
        <div class="player-area">
          <div class="perso-cards">${this.renderCards(
            playerCards.perso || [],
            this.isMyTurn
          )}</div>
          <div class="bonus-cards">${this.renderCards(
            playerCards.bonus || [],
            this.isMyTurn
          )}</div>
        </div>
      `;

      this.attachCardListeners();
    } catch (error) {
      console.error("Erreur affichage cartes:", error);
    }
  }
}
