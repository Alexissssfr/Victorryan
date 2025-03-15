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
      // Stocker l'ID de partie et l'ID joueur
      window.gameId = data.gameId;
      window.playerId = playerId;

      // Cacher le menu et afficher le plateau
      document.getElementById("main-menu").style.display = "none";
      document.getElementById("game-board").style.display = "block";

      // Mettre à jour l'affichage du code de partie
      const gameIdDisplay = document.getElementById("game-id-display");
      if (gameIdDisplay) {
        gameIdDisplay.textContent = `Code partie: ${data.gameId}`;
      }

      // Indiquer que c'est le créateur
      if (window.gameUI) {
        window.gameUI.setAsCreator();
      }

      // Connecter au WebSocket
      if (window.gameSocket) {
        window.gameSocket.joinGame(data.gameId, playerId);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    alert("Erreur lors de la création de la partie");
  }
}

async function joinGame() {
  try {
    const gameId = document.getElementById("game-id-input").value.toUpperCase();
    const playerId = crypto.randomUUID();

    if (!gameId) {
      alert("Veuillez entrer un code de partie");
      return;
    }

    // Cacher le menu et afficher le plateau
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("game-board").style.display = "block";

    // Stocker l'ID de partie et l'ID joueur
    window.gameId = gameId;
    window.playerId = playerId;

    // Connecter au WebSocket
    if (window.gameSocket) {
      window.gameSocket.joinGame(gameId, playerId);
    }
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    alert("Erreur lors de la connexion à la partie");
  }
}

// Ajouter les gestionnaires d'événements quand le DOM est chargé
document.addEventListener("DOMContentLoaded", () => {
  const createBtn = document.getElementById("create-game-btn");
  const joinBtn = document.getElementById("join-game-btn");

  if (createBtn) {
    createBtn.addEventListener("click", createGame);
  }

  if (joinBtn) {
    joinBtn.addEventListener("click", joinGame);
  }
});

class GameUI {
  constructor(container) {
    if (!container) {
      throw new Error("Container non trouvé");
    }

    this.container = container;
    this.gameState = null;
    this.playerId = null;
    this.selectedBonus = null;
    this.selectedPerso = null;
    this.isMyTurn = false;
    this.isCreator = false;

    this.setupUI();
    console.log("Interface initialisée avec succès");
  }

  setupUI() {
    this.turnIndicator = document.getElementById("turn-indicator");
    this.gameStatus = document.getElementById("game-status");
    this.endTurnBtn = document.getElementById("end-turn-btn");
    this.drawCardsBtn = document.getElementById("draw-cards-btn");

    if (this.drawCardsBtn) {
      this.drawCardsBtn.addEventListener("click", () => this.handleDrawCards());
    }
  }

  setAsCreator() {
    this.isCreator = true;
    if (this.drawCardsBtn) {
      this.drawCardsBtn.style.display = "block";
    }
  }

  async handleDrawCards() {
    try {
      const response = await fetch("/api/games/draw-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: window.gameId,
          playerId: window.playerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du tirage des cartes");
      }

      if (data.success) {
        this.updateState(data.state);
        if (this.drawCardsBtn) {
          this.drawCardsBtn.style.display = "none";
        }
      } else {
        throw new Error(data.error || "Erreur lors du tirage des cartes");
      }
    } catch (error) {
      console.error("Erreur tirage cartes:", error);
      this.showNotification(error.message, "error");
    }
  }

  showNotification(message, type = "info") {
    const container = document.getElementById("notification-container");
    if (!container) {
      console.log("Notification:", message);
      return;
    }

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  updateState(state) {
    if (!state) {
      console.error("État invalide reçu");
      return;
    }

    console.log("Mise à jour de l'état:", state);
    this.gameState = state;
    this.isMyTurn = state.isYourTurn;

    // Toujours afficher les cartes
    this.displayCards();

    // Mettre à jour l'interface
    this.updateInterface();
  }

  updateInterface() {
    if (this.turnIndicator) {
      this.turnIndicator.textContent = this.isMyTurn
        ? "C'est votre tour"
        : "Tour de l'adversaire";
    }

    if (this.gameStatus) {
      this.gameStatus.textContent =
        this.gameState.status === "waiting"
          ? "En attente d'un autre joueur..."
          : "Partie en cours";
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

        console.log(`Rendu carte ${card.id}:`, {
          svgContent: card.svgContent ? "présent" : "absent",
          type: card.type,
          isPlayable,
        });

        return `
          <div class="card ${
            isPlayable ? "playable" : ""
          } ${this.getSelectedClass(card)}"
               data-card-id="${card.id}"
               data-card-type="${card.type}">
            <div class="card-content">
              ${
                card.svgContent ||
                `
                <!-- SVG par défaut -->
                <svg viewBox="0 0 100 140">
                  <rect width="100" height="140" fill="#ddd"/>
                  <text x="50" y="70" text-anchor="middle" fill="#666">
                    ${card.id} (SVG manquant)
                  </text>
                </svg>
              `
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  getDefaultCardImage(card) {
    // Ne retourner le SVG que si pas d'image de fond
    if (!card.fond) {
      return `
        <svg viewBox="0 0 100 140">
          <rect width="100" height="140" fill="#ddd"/>
          <text x="50" y="70" text-anchor="middle" fill="#666">
            ${card.id}
          </text>
        </svg>
      `;
    }
    return "";
  }

  getSelectedClass(card) {
    if (card.id === this.selectedBonus?.id) return "selected bonus-selected";
    if (card.id === this.selectedPerso?.id) return "selected perso-selected";
    return "";
  }

  displayCards() {
    if (!this.gameState?.playerCards) {
      console.log("Pas de cartes à afficher");
      return;
    }

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

  handleBonusSelection(cardId) {
    if (!this.isMyTurn) return;

    const card = this.gameState.playerCards.bonus.find((c) => c.id === cardId);
    if (!card) return;

    this.selectedBonus = this.selectedBonus?.id === cardId ? null : card;
    this.displayCards(); // Rafraîchir l'affichage
  }

  handlePersoSelection(cardId) {
    if (!this.isMyTurn) return;

    const card = this.gameState.playerCards.perso.find((c) => c.id === cardId);
    if (!card) return;

    this.selectedPerso = this.selectedPerso?.id === cardId ? null : card;
    this.displayCards(); // Rafraîchir l'affichage
  }
}
