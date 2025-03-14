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

    // Initialiser les conteneurs
    this.initializeUI();
  }

  initializeUI() {
    // Récupérer les éléments du DOM
    this.turnIndicator = document.getElementById("turn-indicator");
    this.gameStatus = document.getElementById("game-status");
    this.endTurnBtn = document.getElementById("end-turn-btn");
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

  updateTurnIndicator() {
    if (this.turnIndicator) {
      this.turnIndicator.textContent = this.isMyTurn
        ? "C'est votre tour"
        : "Tour de l'adversaire";
      this.turnIndicator.className = this.isMyTurn
        ? "your-turn"
        : "opponent-turn";
    }

    if (this.endTurnBtn) {
      this.endTurnBtn.disabled = !this.isMyTurn;
    }
  }

  updateGameStatus() {
    if (this.gameStatus) {
      const status = this.gameState.status;
      this.gameStatus.textContent =
        status === "waiting"
          ? "En attente d'un autre joueur..."
          : status === "playing"
          ? "Partie en cours"
          : "Partie terminée";
    }
  }

  renderCardStats(card) {
    if (card.type === "perso") {
      return `
        <div class="stats">
          <div>PV: ${card.currentStats?.pointsdevie || card.pointsdevie}</div>
          <div>ATT: ${
            card.currentStats?.forceattaque || card.forceattaque
          }</div>
          <div>TOUR: ${card.currentStats?.tourattaque || card.tourattaque}</div>
        </div>
      `;
    } else {
      return `
        <div class="stats">
          <div>BONUS: ${card.pourcentagebonus}%</div>
          <div>TOUR: ${card.tourbonus}</div>
        </div>
      `;
    }
  }

  renderCards(cards, isPlayable) {
    if (!Array.isArray(cards)) {
      console.error("cards n'est pas un tableau:", cards);
      return "";
    }

    return cards
      .map((card) => {
        if (!card) {
          console.error("Carte invalide:", card);
          return "";
        }

        return `
          <div class="card ${
            isPlayable ? "playable" : ""
          } ${this.getSelectedClass(card)}"
               data-card-id="${card.id}"
               data-card-type="${card.type}">
            <div class="card-image">
              ${card.svgContent || this.getDefaultCardImage(card)}
            </div>
            <div class="card-info">
              <div class="card-name">${
                card.nomcarteperso || card.nomcartebonus
              }</div>
              ${this.renderCardStats(card)}
            </div>
          </div>
        `;
      })
      .join("");
  }

  getDefaultCardImage(card) {
    return `
      <svg viewBox="0 0 100 140">
        <rect width="100" height="140" fill="#ddd"/>
        <text x="50" y="70" text-anchor="middle" fill="#666">
          ${card.id}
        </text>
      </svg>
    `;
  }

  getSelectedClass(card) {
    if (card.id === this.selectedBonus?.id) return "selected bonus-selected";
    if (card.id === this.selectedPerso?.id) return "selected perso-selected";
    return "";
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

  attachCardListeners() {
    const cards = this.container.querySelectorAll(".card.playable");
    cards.forEach((card) => {
      card.addEventListener("click", () => this.handleCardClick(card));
    });
  }

  handleCardClick(cardElement) {
    const cardId = cardElement.dataset.cardId;
    const cardType = cardElement.dataset.cardType;

    if (!this.isMyTurn) return;

    if (cardType === "bonus") {
      this.handleBonusSelection(cardId);
    } else if (cardType === "perso") {
      this.handlePersoSelection(cardId);
    }
  }
}
