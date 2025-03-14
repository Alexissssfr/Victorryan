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

// Fonction pour créer une partie
async function createGame() {
  try {
    // Générer un ID de joueur unique
    playerId = generatePlayerId();

    statusDisplay.textContent = "Création de la partie...";
    console.log("Création d'une nouvelle partie...");

    const response = await fetch("/games/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerId }),
    });

    const data = await response.json();
    console.log("Réponse création de partie:", data);

    if (data.success) {
      gameId = data.gameId;
      playerKey = "player1"; // Le créateur est toujours le joueur 1

      // Afficher l'ID de la partie pour que le joueur 2 puisse le rejoindre
      gameIdDisplay.textContent = `ID: ${gameId}`;
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
    console.log(
      `Tentative de rejoindre la partie ${gameId} avec l'ID joueur ${playerId}`
    );

    const response = await fetch("/games/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, playerId }),
    });

    const data = await response.json();
    console.log("Réponse du serveur:", data);

    if (data.success && data.joined) {
      // La partie a été rejointe avec succès
      mainMenu.style.display = "none";
      gameBoard.style.display = "block";

      // Déterminer le rôle du joueur (player1 ou player2)
      if (!playerKey) {
        if (
          data.gameState &&
          data.gameState.player1 &&
          data.gameState.player1.id === playerId
        ) {
          playerKey = "player1";
          console.log("Je suis le joueur 1");
        } else {
          playerKey = "player2";
          console.log("Je suis le joueur 2");
        }
      }

      console.log("État du jeu reçu:", data.gameState);

      // Mettre à jour l'état du jeu complet
      if (data.gameState) {
        updateGameState(data.gameState);
      }

      // Connecter via WebSocket si ce n'est pas déjà fait
      if (window.gameSocket) {
        window.gameSocket.joinGame(gameId, playerId);
      }

      // Configurer les événements pour les actions du joueur
      setupGameEvents();

      statusDisplay.textContent = "Partie en cours";

      // Si on n'a pas reçu de cartes, essayer de les récupérer explicitement
      if (!playerCards.length) {
        console.log("Tentative de récupération explicite des cartes...");
        fetchGameState();
      }
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

// Fonction pour récupérer l'état du jeu actuel
async function fetchGameState() {
  try {
    const response = await fetch(`/games/${gameId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success && data.gameState) {
      console.log("État du jeu récupéré:", data.gameState);
      updateGameState(data.gameState);
    } else {
      console.error("Impossible de récupérer l'état du jeu:", data.message);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'état du jeu:", error);
  }
}

// Fonction pour mettre à jour l'indicateur de tour
function updateTurnIndicator() {
  if (turnIndicator) {
    turnIndicator.textContent = isMyTurn
      ? "C'est votre tour"
      : "Tour de l'adversaire";
    turnIndicator.className = isMyTurn ? "your-turn" : "opponent-turn";

    // Activer/désactiver les boutons d'action
    if (playBonusBtn) playBonusBtn.disabled = !isMyTurn;
    if (attackBtn) attackBtn.disabled = !isMyTurn;
    if (endTurnBtn) endTurnBtn.disabled = !isMyTurn;
  }
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
    const previousSelected = player2CardsContainer.querySelector(
      ".card.selected-target"
    );
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

// Fonction pour afficher les cartes du joueur
function renderPlayerCards() {
  if (!player1CardsContainer) {
    console.error("Container de cartes joueur non trouvé");
    return;
  }

  player1CardsContainer.innerHTML = "";
  console.log(`Rendu de ${playerCards.length} cartes pour le joueur`);

  if (playerCards.length === 0) {
    console.warn("Aucune carte à afficher pour le joueur");
    const noCardsMsg = document.createElement("div");
    noCardsMsg.className = "no-cards-message";
    noCardsMsg.textContent = "En attente de cartes...";
    player1CardsContainer.appendChild(noCardsMsg);
    return;
  }

  playerCards.forEach((card, index) => {
    try {
      console.log(`Rendu de la carte ${index}:`, card);

      const cardElement = document.createElement("div");
      cardElement.classList.add("card");
      cardElement.dataset.id = card.id;
      cardElement.dataset.type = card.type;

      // Afficher la carte en fonction de son type
      if (card.type === "perso") {
        cardElement.innerHTML = `
          <div class="card-header">${card.nomcarteperso || "Personnage"}</div>
          <img src="${
            card.imageUrl || `/stock/svg_perso/${card.id}.svg`
          }" alt="${
          card.nomcarteperso || card.id
        }" onerror="this.src='/placeholder-card.png'">
          <div class="card-stats">
            <div class="stat">PV: ${card.pointsdevie || "100"}</div>
            <div class="stat">ATT: ${card.forceattaque || "30"}</div>
            <div class="stat">Tours: ${card.tourattaque || "2"}</div>
          </div>
          <div class="card-name">${card.nomdupouvoir || "Pouvoir"}</div>
          <div class="card-id">${card.id}</div>
        `;
      } else if (card.type === "bonus") {
        cardElement.innerHTML = `
          <div class="card-header">${card.nomcartebonus || "Bonus"}</div>
          <img src="${
            card.imageUrl || `/stock/svg_bonus/${card.id}.svg`
          }" alt="${
          card.nomcartebonus || card.id
        }" onerror="this.src='/placeholder-card.png'">
          <div class="card-stats">
            <div class="stat">Bonus: ${card.pourcentagebonus || "0"}%</div>
            <div class="stat">Tours: ${card.tourbonus || "1"}</div>
          </div>
          <div class="card-name">${card.nomdupouvoir || "Effet"}</div>
          <div class="card-id">${card.id}</div>
        `;
      } else {
        // Type de carte inconnu ou non spécifié
        cardElement.innerHTML = `
          <div class="card-header">Carte #${index + 1}</div>
          <div class="card-content">
            <p>Type: ${card.type || "Inconnu"}</p>
            <p>ID: ${card.id || "Non défini"}</p>
          </div>
        `;
      }

      player1CardsContainer.appendChild(cardElement);
    } catch (error) {
      console.error(`Erreur lors du rendu de la carte ${index}:`, error);
      // Afficher une carte d'erreur à la place
      const errorCard = document.createElement("div");
      errorCard.classList.add("card", "error-card");
      errorCard.innerHTML = `
        <div class="card-header">Erreur</div>
        <div class="card-content">
          <p>Impossible d'afficher cette carte</p>
          <p>ID: ${card?.id || "Inconnu"}</p>
        </div>
      `;
      player1CardsContainer.appendChild(errorCard);
    }
  });
}

// Fonction pour afficher les cartes de l'adversaire
function renderOpponentCards(cards) {
  if (!player2CardsContainer) {
    console.error("Container de cartes adversaire non trouvé");
    return;
  }

  player2CardsContainer.innerHTML = "";
  console.log(`Rendu de ${cards.length} cartes pour l'adversaire`);

  if (cards.length === 0) {
    console.warn("Aucune carte à afficher pour l'adversaire");
    const noCardsMsg = document.createElement("div");
    noCardsMsg.className = "no-cards-message";
    noCardsMsg.textContent = "En attente de l'adversaire...";
    player2CardsContainer.appendChild(noCardsMsg);
    return;
  }

  cards.forEach((card, index) => {
    try {
      const cardElement = document.createElement("div");
      cardElement.classList.add("card", "opponent-card");
      cardElement.dataset.id = card.id;
      cardElement.dataset.type = card.type;

      // Afficher la carte en fonction de son type
      if (card.type === "perso") {
        cardElement.innerHTML = `
          <div class="card-header">${card.nomcarteperso || "Personnage"}</div>
          <img src="${
            card.imageUrl || `/stock/svg_perso/${card.id}.svg`
          }" alt="${
          card.nomcarteperso || card.id
        }" onerror="this.src='/placeholder-card.png'">
          <div class="card-stats">
            <div class="stat">PV: ${card.pointsdevie || "100"}</div>
          </div>
          <div class="card-name">${card.nomdupouvoir || "Pouvoir"}</div>
          <div class="card-id">${card.id}</div>
        `;
      } else {
        // Pour les cartes bonus de l'adversaire, on affiche juste le dos
        cardElement.innerHTML = `
          <div class="card-back">Carte Bonus Adversaire</div>
          <div class="card-id">${card.id}</div>
        `;
      }

      player2CardsContainer.appendChild(cardElement);
    } catch (error) {
      console.error(
        `Erreur lors du rendu de la carte adversaire ${index}:`,
        error
      );
      // Afficher une carte d'erreur à la place
      const errorCard = document.createElement("div");
      errorCard.classList.add("card", "error-card");
      errorCard.innerHTML = `
        <div class="card-header">Erreur</div>
        <div class="card-content">
          <p>Impossible d'afficher cette carte</p>
          <p>ID: ${card?.id || "Inconnu"}</p>
        </div>
      `;
      player2CardsContainer.appendChild(errorCard);
    }
  });
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
    console.log(
      `Jouer bonus: ${selectedBonusCards.join(
        ", "
      )} sur la carte ${selectedCardId}`
    );

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
      console.log("Bonus joué avec succès, nouvel état:", data.gameState);

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
    console.log(`Attaque: carte ${selectedCardId} → cible ${selectedTargetId}`);

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
      console.log("Attaque réussie, nouvel état:", data.gameState);

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
    console.log("Fin du tour");

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
      console.log("Tour terminé, nouvel état:", data.gameState);

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
  if (!gameState) {
    console.error("updateGameState appelé avec un état de jeu vide");
    return;
  }

  console.log(`Mise à jour de l'état du jeu, je suis le joueur ${playerKey}`);

  // Mettre à jour les informations du joueur
  if (gameState[playerKey]) {
    console.log(`Cartes du joueur ${playerKey}:`, gameState[playerKey].hand);

    // Si je reçois des cartes, les enregistrer et les afficher
    if (gameState[playerKey].hand && gameState[playerKey].hand.length > 0) {
      playerCards = gameState[playerKey].hand;
      console.log(`${playerCards.length} cartes récupérées pour le joueur`);
      renderPlayerCards();
    } else {
      console.warn("Aucune carte trouvée pour ce joueur");
    }

    // Mettre à jour les statistiques des cartes
    updateCardStats(gameState[playerKey], player1CardsContainer);
  } else {
    console.error(
      `Aucune information pour le joueur ${playerKey} dans l'état du jeu`
    );
  }

  // Mettre à jour les informations de l'adversaire
  const opponentKey = playerKey === "player1" ? "player2" : "player1";

  if (gameState[opponentKey]) {
    console.log(
      `Cartes de l'adversaire ${opponentKey}:`,
      gameState[opponentKey].hand
    );

    // Si l'adversaire a des cartes, les afficher
    if (gameState[opponentKey].hand && gameState[opponentKey].hand.length > 0) {
      renderOpponentCards(gameState[opponentKey].hand);
      console.log(
        `${gameState[opponentKey].hand.length} cartes affichées pour l'adversaire`
      );
    } else {
      console.warn("Aucune carte trouvée pour l'adversaire");
    }

    // Mettre à jour les statistiques des cartes
    updateCardStats(gameState[opponentKey], player2CardsContainer);
  } else {
    console.log(
      `L'adversaire (${opponentKey}) n'a pas encore rejoint la partie`
    );
  }

  // Mettre à jour l'indicateur de tour
  isMyTurn = gameState.currentPlayer === playerKey;
  console.log(
    `Tour actuel: ${gameState.currentPlayer}, c'est ${
      isMyTurn ? "mon tour" : "le tour de l'adversaire"
    }`
  );
  updateTurnIndicator();

  // Vérifier si la partie est terminée
  if (gameState.gameOver) {
    const hasWon = gameState.winner === playerKey;
    alert(hasWon ? "Félicitations ! Vous avez gagné !" : "Vous avez perdu !");
    console.log(`Partie terminée, gagnant: ${gameState.winner}`);

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
    // Supprimer tout caractère non alphanumérique (comme #) de l'ID
    const enteredGameId = gameIdInput.value
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, "");
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
  fetchGameState,
};

// CSS pour les messages d'attente de cartes
document.head.insertAdjacentHTML(
  "beforeend",
  `
<style>
  .no-cards-message {
    width: 100%;
    padding: 20px;
    text-align: center;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    color: #666;
    font-style: italic;
  }
  
  .card-id {
    position: absolute;
    bottom: 2px;
    right: 2px;
    font-size: 8px;
    color: #999;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 1px 3px;
    border-radius: 2px;
  }
  
  .error-card {
    background-color: #ffeeee;
    border: 1px solid #ffcccc;
  }
  
  .error-card .card-header {
    background-color: #f44336;
  }
</style>
`
);
