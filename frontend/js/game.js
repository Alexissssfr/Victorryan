// Récupérer les éléments du DOM
const createGameBtn = document.getElementById("create-game-btn");
const joinGameBtn = document.getElementById("join-game-btn");
const gameIdInput = document.getElementById("game-id-input");
const mainMenu = document.getElementById("main-menu");
const gameBoard = document.getElementById("game-board");
const player1CardsContainer = document.getElementById("player1-cards");
const player2CardsContainer = document.getElementById("player2-cards");
const playBonusBtn = document.getElementById("play-bonus-btn");
const attackBtn = document.getElementById("attack-btn");
const endTurnBtn = document.getElementById("end-turn-btn");
const turnIndicator = document.getElementById("turn-indicator");
const gameIdDisplay = document.getElementById("game-id-display");
const statusDisplay = document.getElementById("status-display");

// Variables globales
let gameId = null;
let playerId = null;
let playerCards = [];
let selectedCardId = null;
let selectedTargetId = null;
let selectedBonusCards = [];
let isMyTurn = false;
let playerKey = null; // 'player1' ou 'player2'

class GameUI {
  constructor(container) {
    this.container = container;
    this.gameState = null;
    this.playerId = null;
    this.selectedBonus = null;
    this.selectedPerso = null;
    this.isMyTurn = false;
  }

  updateState(state) {
    this.gameState = state;
    this.isMyTurn = state.isYourTurn;
    this.updateTurnIndicator();
    this.displayCards();
  }

  displayCards() {
    const { playerCards, opponentCards } = this.gameState;

    // Afficher les cartes avec animation d'entrée
    this.container.innerHTML = `
      <div class="opponent-area">
        <div class="bonus-cards drop-zone">
          ${this.renderCards(opponentCards.bonus, false)}
        </div>
        <div class="perso-cards drop-zone">
          ${this.renderCards(opponentCards.perso, false)}
        </div>
      </div>
      <div class="player-area">
        <div class="perso-cards drop-zone">
          ${this.renderCards(playerCards.perso, this.isMyTurn)}
        </div>
        <div class="bonus-cards drop-zone">
          ${this.renderCards(playerCards.bonus, this.isMyTurn)}
        </div>
      </div>
    `;

    this.attachCardListeners();
  }

  renderCards(cards, isPlayable) {
    return cards
      .map(
        (card) => `
      <div class="card ${isPlayable ? "playable" : ""} ${this.getSelectedClass(
          card
        )}"
           data-card-id="${card.id}"
           data-card-type="${card.type}">
        ${card.svgContent}
        <div class="card-stats">
          ${this.renderCardStats(card)}
        </div>
      </div>
    `
      )
      .join("");
  }

  getSelectedClass(card) {
    if (this.selectedBonus && this.selectedBonus.id === card.id)
      return "selected";
    if (this.selectedPerso && this.selectedPerso.id === card.id)
      return "selected";
    return "";
  }

  renderCardStats(card) {
    return `
      <div>PV: ${card.currentStats.pointsdevie}</div>
      <div>ATT: ${card.currentStats.forceattaque}</div>
      ${
        card.currentStats.tourattaque
          ? `<div>Tour: ${card.currentStats.tourattaque}</div>`
          : ""
      }
    `;
  }

  attachCardListeners() {
    if (!this.isMyTurn) return;

    const cards = this.container.querySelectorAll(".card.playable");
    cards.forEach((card) => {
      card.addEventListener("click", () => this.handleCardClick(card));
    });
  }

  handleCardClick(cardElement) {
    const cardId = cardElement.dataset.cardId;
    const cardType = cardElement.dataset.cardType;

    if (cardType === "bonus") {
      this.handleBonusSelection(cardId);
    } else {
      this.handlePersoSelection(cardId);
    }
  }

  handleBonusSelection(cardId) {
    const bonusCard = this.findCard(cardId, "bonus");
    if (!bonusCard) return;

    // Désélectionner si déjà sélectionné
    if (this.selectedBonus && this.selectedBonus.id === cardId) {
      this.selectedBonus = null;
      this.refreshCardSelections();
      return;
    }

    this.selectedBonus = bonusCard;
    this.refreshCardSelections();
    this.showNotification("Sélectionnez un personnage pour appliquer le bonus");
  }

  handlePersoSelection(cardId) {
    if (!this.selectedBonus) return;

    const persoCard = this.findCard(cardId, "perso");
    if (!persoCard) return;

    // Appliquer le bonus
    window.gameSocket.playBonus(
      this.gameState.gameId,
      this.playerId,
      this.selectedBonus.id,
      cardId
    );

    // Ajouter l'animation de carte jouée
    const cardElement = this.container.querySelector(
      `[data-card-id="${cardId}"]`
    );
    cardElement.classList.add("played");

    this.selectedBonus = null;
    this.refreshCardSelections();
  }

  refreshCardSelections() {
    const cards = this.container.querySelectorAll(".card");
    cards.forEach((card) => {
      card.classList.remove("selected");
      if (this.selectedBonus && card.dataset.cardId === this.selectedBonus.id) {
        card.classList.add("selected");
      }
    });
  }

  showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "turn-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  updateTurnIndicator() {
    const indicator = document.getElementById("turn-indicator");
    if (!indicator) return;

    indicator.textContent = this.isMyTurn
      ? "À votre tour"
      : "Tour de l'adversaire";
    indicator.className = this.isMyTurn ? "active" : "";
  }

  findCard(cardId, type) {
    const cards =
      type === "bonus"
        ? this.gameState.playerCards.bonus
        : this.gameState.playerCards.perso;
    return cards.find((card) => card.id === cardId);
  }
}

// Fonction pour créer une partie
async function createGame() {
  try {
    // Générer un ID de joueur unique
    playerId = generatePlayerId();

    statusDisplay.textContent = "Création de la partie...";

    const response = await fetch("/games/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerId }),
    });

    const data = await response.json();

    if (data.success) {
      gameId = data.gameId;
      playerKey = "player1"; // Le créateur est toujours le joueur 1

      // Afficher l'ID de la partie pour que le joueur 2 puisse le rejoindre
      gameIdDisplay.textContent = `ID de la partie: ${gameId}`;
      statusDisplay.textContent = "En attente d'un adversaire...";

      // Connecter via WebSocket
      if (window.gameSocket) {
        window.gameSocket.joinGame(gameId, playerId);
      }

      // Passer à l'écran de jeu
      mainMenu.style.display = "none";
      gameBoard.style.display = "block";

      // Initialiser le plateau de jeu
      await joinGame();
    } else {
      alert("Erreur lors de la création de la partie: " + data.message);
    }
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    alert("Erreur de connexion au serveur.");
  }
}

// Fonction pour rejoindre une partie
async function joinGame() {
  try {
    statusDisplay.textContent = "Connexion à la partie...";

    const response = await fetch("/games/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, playerId }),
    });

    const data = await response.json();

    if (data.success && data.joined) {
      // La partie a été rejointe avec succès
      mainMenu.style.display = "none";
      gameBoard.style.display = "block";

      // Si c'est le joueur 2 qui rejoint
      if (!playerKey) {
        playerKey = "player2";
      }

      // Déterminer si c'est le tour du joueur
      isMyTurn = data.gameState.currentPlayer === playerKey;
      updateTurnIndicator();

      // Récupérer les cartes du joueur
      if (data.gameState[playerKey]) {
        playerCards = data.gameState[playerKey].hand || [];
        renderPlayerCards();
      }

      // Connecter via WebSocket si ce n'est pas déjà fait
      if (window.gameSocket) {
        window.gameSocket.joinGame(gameId, playerId);
      }

      // Configurer les événements pour les actions du joueur
      setupGameEvents();

      statusDisplay.textContent = "Partie en cours";
    } else {
      alert(
        "Impossible de rejoindre la partie: " +
          (data.message || "La partie est peut-être complète ou n'existe pas.")
      );
    }
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    alert("Erreur de connexion au serveur.");
  }
}

// Fonction pour afficher les cartes du joueur
function renderPlayerCards() {
  if (!player1CardsContainer) return;

  player1CardsContainer.innerHTML = "";

  playerCards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.dataset.id = card.id;
    cardElement.dataset.type = card.type;

    // Afficher la carte en fonction de son type
    if (card.type === "perso") {
      cardElement.innerHTML = `
        <div class="card-header">${card.nomcarteperso}</div>
        <img src="${card.imageUrl || `/stock/svg_perso/${card.id}.svg`}" alt="${
        card.nomcarteperso
      }">
        <div class="card-stats">
          <div class="stat">PV: ${card.pointsdevie}</div>
          <div class="stat">ATT: ${card.forceattaque}</div>
          <div class="stat">Tours: ${card.tourattaque}</div>
        </div>
        <div class="card-name">${card.nomdupouvoir}</div>
      `;
    } else {
      cardElement.innerHTML = `
        <div class="card-header">${card.nomcartebonus}</div>
        <img src="${card.imageUrl || `/stock/svg_bonus/${card.id}.svg`}" alt="${
        card.nomcartebonus
      }">
        <div class="card-stats">
          <div class="stat">Bonus: ${card.pourcentagebonus}%</div>
          <div class="stat">Tours: ${card.tourbonus}</div>
        </div>
        <div class="card-name">${card.nomdupouvoir}</div>
      `;
    }

    player1CardsContainer.appendChild(cardElement);
  });
}

// Fonction pour afficher les cartes de l'adversaire
function renderOpponentCards(cards) {
  if (!player2CardsContainer) return;

  player2CardsContainer.innerHTML = "";

  cards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("card", "opponent-card");
    cardElement.dataset.id = card.id;
    cardElement.dataset.type = card.type;

    // Afficher la carte en fonction de son type
    if (card.type === "perso") {
      cardElement.innerHTML = `
        <div class="card-header">${card.nomcarteperso}</div>
        <img src="${card.imageUrl || `/stock/svg_perso/${card.id}.svg`}" alt="${
        card.nomcarteperso
      }">
        <div class="card-stats">
          <div class="stat">PV: ${card.pointsdevie}</div>
        </div>
        <div class="card-name">${card.nomdupouvoir}</div>
      `;
    } else {
      // Pour les cartes bonus de l'adversaire, on affiche juste le dos
      cardElement.innerHTML = `
        <div class="card-back">Carte Bonus Adversaire</div>
      `;
    }

    player2CardsContainer.appendChild(cardElement);
  });
}

// Fonction pour configurer les événements du jeu
function setupGameEvents() {
  // Événement de clic sur les cartes du joueur
  player1CardsContainer.addEventListener("click", (event) => {
    const cardElement = event.target.closest(".card");
    if (!cardElement) return;

    if (isMyTurn) {
      // Si une carte est déjà sélectionnée, la désélectionner
      const previousSelected =
        player1CardsContainer.querySelector(".card.selected");
      if (previousSelected) {
        previousSelected.classList.remove("selected");
      }

      // Sélectionner la nouvelle carte
      cardElement.classList.add("selected");
      selectedCardId = cardElement.dataset.id;

      // Déterminer si c'est une carte bonus ou personnage
      const isBonus = cardElement.dataset.type === "bonus";

      if (isBonus) {
        // Si c'est une carte bonus, l'ajouter à la liste des bonus sélectionnés
        if (!selectedBonusCards.includes(selectedCardId)) {
          selectedBonusCards.push(selectedCardId);
        }
      } else {
        // Si c'est une carte personnage, réinitialiser la liste des bonus
        selectedBonusCards = [];
      }
    }
  });

  // Événement de clic sur les cartes de l'adversaire
  player2CardsContainer.addEventListener("click", (event) => {
    const cardElement = event.target.closest(".card");
    if (!cardElement || !isMyTurn) return;

    // Si une carte est déjà sélectionnée, la désélectionner
    const previousSelected =
      player2CardsContainer.querySelector(".card.selected");
    if (previousSelected) {
      previousSelected.classList.remove("selected-target");
    }

    // Sélectionner la nouvelle cible
    cardElement.classList.add("selected-target");
    selectedTargetId = cardElement.dataset.id;
  });

  // Événement de clic sur le bouton "Jouer Bonus"
  if (playBonusBtn) {
    playBonusBtn.addEventListener("click", playBonus);
  }

  // Événement de clic sur le bouton "Attaquer"
  if (attackBtn) {
    attackBtn.addEventListener("click", attack);
  }

  // Événement de clic sur le bouton "Terminer Tour"
  if (endTurnBtn) {
    endTurnBtn.addEventListener("click", endTurn);
  }
}

// Fonction pour jouer un bonus
async function playBonus() {
  if (!isMyTurn || selectedBonusCards.length === 0 || !selectedCardId) {
    alert(
      "Vous devez sélectionner une carte bonus et une carte personnage cible."
    );
    return;
  }

  try {
    // Préparer les actions de bonus
    const bonusActions = selectedBonusCards.map((bonusId) => ({
      bonusId,
      targetId: selectedCardId,
    }));

    // Envoyer l'action au serveur
    const response = await fetch("/games/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        playerId,
        actions: {
          bonus: bonusActions,
          attack: null,
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Mettre à jour l'état du jeu
      updateGameState(data.gameState);

      // Réinitialiser les sélections
      selectedBonusCards = [];
      selectedCardId = null;

      // Désélectionner les cartes
      const selectedCards = document.querySelectorAll(".card.selected");
      selectedCards.forEach((card) => card.classList.remove("selected"));
    } else {
      alert("Erreur lors du jeu des bonus: " + data.message);
    }
  } catch (error) {
    console.error("Erreur lors du jeu des bonus:", error);
    alert("Erreur de connexion au serveur.");
  }
}

// Fonction pour attaquer
async function attack() {
  if (!isMyTurn || !selectedCardId || !selectedTargetId) {
    alert("Vous devez sélectionner une carte personnage et une cible.");
    return;
  }

  try {
    // Envoyer l'action au serveur
    const response = await fetch("/games/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        playerId,
        actions: {
          bonus: [],
          attack: {
            cardId: selectedCardId,
            targetId: selectedTargetId,
          },
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Mettre à jour l'état du jeu
      updateGameState(data.gameState);

      // Réinitialiser les sélections
      selectedCardId = null;
      selectedTargetId = null;

      // Désélectionner les cartes
      const selectedCards = document.querySelectorAll(
        ".card.selected, .card.selected-target"
      );
      selectedCards.forEach((card) => {
        card.classList.remove("selected");
        card.classList.remove("selected-target");
      });
    } else {
      alert("Erreur lors de l'attaque: " + data.message);
    }
  } catch (error) {
    console.error("Erreur lors de l'attaque:", error);
    alert("Erreur de connexion au serveur.");
  }
}

// Fonction pour terminer le tour
async function endTurn() {
  if (!isMyTurn) {
    alert("Ce n'est pas votre tour.");
    return;
  }

  try {
    // Envoyer l'action au serveur
    const response = await fetch("/games/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        playerId,
        actions: {
          bonus: [],
          attack: null,
          endTurn: true,
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Mettre à jour l'état du jeu
      updateGameState(data.gameState);

      // Indiquer que ce n'est plus notre tour
      isMyTurn = false;
      updateTurnIndicator();
    } else {
      alert("Erreur lors de la fin du tour: " + data.message);
    }
  } catch (error) {
    console.error("Erreur lors de la fin du tour:", error);
    alert("Erreur de connexion au serveur.");
  }
}

// Fonction pour mettre à jour l'état du jeu
function updateGameState(gameState) {
  if (!gameState) return;

  // Mettre à jour les informations du joueur
  if (gameState[playerKey]) {
    playerCards = gameState[playerKey].hand || [];
    renderPlayerCards();

    // Mettre à jour les statistiques des cartes
    updateCardStats(gameState[playerKey], player1CardsContainer);
  }

  // Mettre à jour les informations de l'adversaire
  const opponentKey = playerKey === "player1" ? "player2" : "player1";
  if (gameState[opponentKey]) {
    const opponentCards = gameState[opponentKey].hand || [];
    renderOpponentCards(opponentCards);

    // Mettre à jour les statistiques des cartes
    updateCardStats(gameState[opponentKey], player2CardsContainer);
  }

  // Mettre à jour l'indicateur de tour
  isMyTurn = gameState.currentPlayer === playerKey;
  updateTurnIndicator();

  // Vérifier si la partie est terminée
  if (gameState.gameOver) {
    const hasWon = gameState.winner === playerKey;
    alert(hasWon ? "Félicitations ! Vous avez gagné !" : "Vous avez perdu !");

    // Désactiver les boutons d'action
    isMyTurn = false;
    updateTurnIndicator();

    // Ajouter un bouton pour revenir au menu principal
    const backButton = document.createElement("button");
    backButton.textContent = "Retour au menu principal";
    backButton.className = "btn";
    backButton.addEventListener("click", () => {
      window.location.reload();
    });

    const gameControls = document.getElementById("game-controls");
    if (gameControls) {
      gameControls.appendChild(backButton);
    }
  }
}

// Fonction pour mettre à jour les statistiques des cartes
function updateCardStats(player, container) {
  if (!container) return;

  // Mettre à jour les points de vie des cartes
  Object.entries(player.health || {}).forEach(([cardId, health]) => {
    const cardElement = container.querySelector(`[data-id="${cardId}"]`);
    if (cardElement) {
      const pvElement = cardElement.querySelector(".stat:nth-child(1)");
      if (pvElement) {
        pvElement.textContent = `PV: ${health}`;

        // Appliquer un style visuel si les PV sont bas
        if (health < 30) {
          cardElement.classList.add("low-health");
        } else {
          cardElement.classList.remove("low-health");
        }
      }
    }
  });

  // Mettre à jour les tours d'attaque restants
  Object.entries(player.turns || {}).forEach(([cardId, turns]) => {
    const cardElement = container.querySelector(`[data-id="${cardId}"]`);
    if (cardElement) {
      const turnsElement = cardElement.querySelector(".stat:nth-child(3)");
      if (turnsElement) {
        turnsElement.textContent = `Tours: ${turns}`;

        // Appliquer un style visuel si les tours sont épuisés
        if (turns <= 0) {
          cardElement.classList.add("no-turns");
        } else {
          cardElement.classList.remove("no-turns");
        }
      }
    }
  });

  // Mettre à jour les bonus actifs
  Object.entries(player.activeBonus || {}).forEach(([cardId, bonusList]) => {
    const cardElement = container.querySelector(`[data-id="${cardId}"]`);
    if (cardElement && bonusList.length > 0) {
      // Ajouter un indicateur visuel de bonus actif
      cardElement.classList.add("has-bonus");

      // Optionnel : Afficher le nombre de bonus actifs
      const bonusIndicator = document.createElement("div");
      bonusIndicator.className = "bonus-indicator";
      bonusIndicator.textContent = `${bonusList.length} bonus`;

      // Remplacer l'ancien indicateur s'il existe
      const oldIndicator = cardElement.querySelector(".bonus-indicator");
      if (oldIndicator) {
        cardElement.replaceChild(bonusIndicator, oldIndicator);
      } else {
        cardElement.appendChild(bonusIndicator);
      }
    } else if (cardElement) {
      cardElement.classList.remove("has-bonus");
      const oldIndicator = cardElement.querySelector(".bonus-indicator");
      if (oldIndicator) {
        oldIndicator.remove();
      }
    }
  });
}

// Fonction pour générer un identifiant de joueur unique
function generatePlayerId() {
  // Utiliser un timestamp + valeur aléatoire pour l'unicité
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Configurer les événements pour les boutons du menu principal
if (createGameBtn) {
  createGameBtn.addEventListener("click", createGame);
}

if (joinGameBtn) {
  joinGameBtn.addEventListener("click", () => {
    const enteredGameId = gameIdInput.value.trim();
    if (!enteredGameId) {
      alert("Veuillez entrer un ID de partie valide.");
      return;
    }

    gameId = enteredGameId;
    playerId = generatePlayerId();

    joinGame();
  });
}

// Fonctions exposées globalement
window.gameController = {
  createGame,
  joinGame,
  playBonus,
  attack,
  endTurn,
};
