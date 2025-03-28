import { api } from "./utils/api.js";
import { setupWebSocket } from "./utils/websocket.js";
import { GameBoard } from "./components/GameBoard.js";
import { CardHand } from "./components/CardHand.js";
import { PlayerInfo } from "./components/PlayerInfo.js";

// État de l'application
let appState = {
  player: {
    name: "",
    id: "",
  },
  game: {
    id: "",
    state: null,
    isMyTurn: false,
    selectedCard: null,
    selectedTarget: null,
    playerKey: null,
    opponentKey: null,
  },
};

// Éléments du DOM
const elements = {
  lobbyView: document.getElementById("lobby-view"),
  gameView: document.getElementById("game-view"),
  gameOver: document.getElementById("game-over"),
  playerName: document.getElementById("playerName"),
  createGameBtn: document.getElementById("createGameBtn"),
  joinGameBtn: document.getElementById("joinGameBtn"),
  confirmJoinBtn: document.getElementById("confirmJoinBtn"),
  joinGameForm: document.getElementById("joinGameForm"),
  gameId: document.getElementById("gameId"),
  waitingRoom: document.getElementById("waitingRoom"),
  gameIdDisplay: document.getElementById("gameIdDisplay"),
  turnIndicator: document.getElementById("turnIndicator"),
  playerPersonnages: document.getElementById("playerPersonnages"),
  playerBonus: document.getElementById("playerBonus"),
  opponentCards: document.getElementById("opponentCards"),
  attackBtn: document.getElementById("attackBtn"),
  applyBonusBtn: document.getElementById("applyBonusBtn"),
  endTurnBtn: document.getElementById("endTurnBtn"),
  winnerDisplay: document.getElementById("winnerDisplay"),
  backToLobbyBtn: document.getElementById("backToLobbyBtn"),
};

// Initialisation de l'application
function init() {
  setupEventListeners();

  // Désactiver les boutons d'action par défaut
  toggleActionButtons(false);
}

// Mise en place des écouteurs d'événements
function setupEventListeners() {
  // Événements du lobby
  elements.createGameBtn.addEventListener("click", handleCreateGame);
  elements.joinGameBtn.addEventListener("click", () => {
    elements.joinGameForm.style.display = "block";
  });
  elements.confirmJoinBtn.addEventListener("click", handleJoinGame);

  // Événements du jeu
  elements.attackBtn.addEventListener("click", handleAttack);
  elements.applyBonusBtn.addEventListener("click", handleApplyBonus);
  elements.endTurnBtn.addEventListener("click", handleEndTurn);
  elements.backToLobbyBtn.addEventListener("click", resetGame);
}

// Gestionnaire de création de partie
async function handleCreateGame() {
  const playerName = elements.playerName.value.trim();

  if (!playerName) {
    alert("Veuillez entrer votre nom");
    return;
  }

  try {
    const response = await api.createGame(playerName);

    appState.player.name = playerName;
    appState.game.id = response.gameId;
    appState.player.id = playerName;

    // Afficher l'ID de la partie
    elements.gameIdDisplay.textContent = response.gameId;
    elements.waitingRoom.style.display = "block";
    elements.joinGameForm.style.display = "none";

    // Configurer WebSocket
    setupWebSocket(appState.game.id, handleGameUpdate);
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    alert("Erreur lors de la création de la partie");
  }
}

// Gestionnaire pour rejoindre une partie
async function handleJoinGame() {
  const playerName = elements.playerName.value.trim();
  const gameId = elements.gameId.value.trim();

  if (!playerName || !gameId) {
    alert("Veuillez entrer votre nom et l'ID de la partie");
    return;
  }

  try {
    const response = await api.joinGame(gameId, playerName);

    appState.player.name = playerName;
    appState.game.id = gameId;
    appState.player.id = playerName;
    appState.game.state = response.gameState;

    // Configurer WebSocket
    setupWebSocket(appState.game.id, handleGameUpdate);

    // Déterminer les clés joueur/adversaire
    determinePlayerKeys();

    // Passer à la vue du jeu
    showGameView();
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    alert("Erreur lors de la connexion à la partie");
  }
}

// Détermine les clés du joueur et de l'adversaire
function determinePlayerKeys() {
  const state = appState.game.state;

  if (state.player1 && state.player1.id === appState.player.id) {
    appState.game.playerKey = "player1";
    appState.game.opponentKey = "player2";
  } else {
    appState.game.playerKey = "player2";
    appState.game.opponentKey = "player1";
  }

  // Vérifier si c'est le tour du joueur
  appState.game.isMyTurn = state.currentTurn === appState.game.playerKey;
}

// Gestionnaire des mises à jour du jeu via WebSocket
function handleGameUpdate(gameState) {
  appState.game.state = gameState;

  // Déterminer les clés du joueur si pas encore fait
  if (!appState.game.playerKey) {
    determinePlayerKeys();
  }

  // Si la partie était en attente et maintenant commence
  if (
    elements.waitingRoom.style.display === "block" &&
    gameState.status === "playing"
  ) {
    showGameView();
  }

  // Vérifier si c'est le tour du joueur
  appState.game.isMyTurn = gameState.currentTurn === appState.game.playerKey;

  // Mettre à jour l'indicateur de tour
  updateTurnIndicator();

  // Mettre à jour l'affichage des cartes
  renderCards();

  // Gérer les boutons d'action
  toggleActionButtons(appState.game.isMyTurn);

  // Vérifier si la partie est terminée
  if (gameState.status === "finished") {
    handleGameOver(gameState);
  }
}

// Affiche la vue du jeu
function showGameView() {
  elements.lobbyView.style.display = "none";
  elements.gameView.style.display = "block";
  elements.waitingRoom.style.display = "none";

  // Rendre les cartes
  renderCards();

  // Mettre à jour l'indicateur de tour
  updateTurnIndicator();
}

// Met à jour l'indicateur de tour
function updateTurnIndicator() {
  elements.turnIndicator.textContent = appState.game.isMyTurn
    ? "C'est votre tour"
    : "Tour de l'adversaire";

  elements.turnIndicator.style.backgroundColor = appState.game.isMyTurn
    ? "#007bff"
    : "#6c757d";
}

// Rend les cartes du joueur et de l'adversaire
function renderCards() {
  const state = appState.game.state;
  const playerKey = appState.game.playerKey;
  const opponentKey = appState.game.opponentKey;

  if (!state || !state[playerKey] || !state[opponentKey]) {
    return;
  }

  // Effacer les conteneurs
  elements.playerPersonnages.innerHTML = "";
  elements.playerBonus.innerHTML = "";
  elements.opponentCards.innerHTML = "";

  // Rendre les cartes personnage du joueur
  state[playerKey].cards.personnages.forEach((card) => {
    const cardElement = createCardElement(card, "personnage", true);

    // Ajouter les statistiques actuelles
    const stats = document.createElement("div");
    stats.className = "card-stats";
    stats.innerHTML = `
      <div>PV: ${state[playerKey].health[card.id]}</div>
      <div>Attaque: ${state[playerKey].attack[card.id]}</div>
      <div>Tours: ${state[playerKey].turns[card.id]}</div>
    `;

    cardElement.appendChild(stats);

    // Désactiver la carte si elle n'a pas de tours d'attaque
    if (state[playerKey].turns[card.id] <= 0) {
      cardElement.classList.add("disabled-card");
    }

    elements.playerPersonnages.appendChild(cardElement);
  });

  // Rendre les cartes bonus du joueur
  state[playerKey].cards.bonus.forEach((card) => {
    const cardElement = createCardElement(card, "bonus", true);

    // Ajouter les statistiques de la carte bonus
    const stats = document.createElement("div");
    stats.className = "card-stats";
    stats.innerHTML = `
      <div>Bonus: ${card.pourcentagebonus}%</div>
      <div>Tours: ${card.tourbonus}</div>
    `;

    cardElement.appendChild(stats);
    elements.playerBonus.appendChild(cardElement);
  });

  // Rendre les cartes personnage de l'adversaire
  state[opponentKey].cards.personnages.forEach((card) => {
    const cardElement = createCardElement(card, "personnage", false);

    // Ajouter les statistiques actuelles
    const stats = document.createElement("div");
    stats.className = "card-stats";
    stats.innerHTML = `
      <div>PV: ${state[opponentKey].health[card.id]}</div>
    `;

    cardElement.appendChild(stats);
    elements.opponentCards.appendChild(cardElement);
  });
}

// Crée un élément de carte
function createCardElement(card, type, isPlayer) {
  const container = document.createElement("div");
  container.className = "card-container";
  container.dataset.id = card.id;
  container.dataset.type = type;

  const cardDiv = document.createElement("div");
  cardDiv.className = "card";

  const img = document.createElement("img");
  img.src = card.fond;
  img.alt = type === "personnage" ? card.nomcarteperso : card.nomcartebonus;

  cardDiv.appendChild(img);
  container.appendChild(cardDiv);

  // Ajouter les écouteurs d'événements si c'est au joueur
  if (isPlayer) {
    container.addEventListener("click", () => handleCardClick(card, type));
  } else {
    // Pour les cartes adverses, ajouter un écouteur pour sélectionner comme cible
    container.addEventListener("click", () => handleTargetClick(card));
  }

  return container;
}

// Gestionnaire de clic sur une carte
function handleCardClick(card, type) {
  if (!appState.game.isMyTurn) {
    return; // Pas le tour du joueur
  }

  // Si c'est une carte personnage et pas de tours d'attaque, ignorer
  if (
    type === "personnage" &&
    appState.game.state[appState.game.playerKey].turns[card.id] <= 0
  ) {
    return;
  }

  // Désélectionner toutes les cartes
  document.querySelectorAll(".selected-card").forEach((el) => {
    el.classList.remove("selected-card");
  });

  // Sélectionner cette carte
  const cardElement = document.querySelector(
    `.card-container[data-id="${card.id}"]`
  );
  cardElement.classList.add("selected-card");

  // Mettre à jour l'état
  appState.game.selectedCard = {
    card,
    type,
  };

  // Réinitialiser la cible sélectionnée
  appState.game.selectedTarget = null;
}

// Gestionnaire de clic sur une carte cible
function handleTargetClick(card) {
  if (!appState.game.isMyTurn || !appState.game.selectedCard) {
    return; // Pas le tour du joueur ou pas de carte sélectionnée
  }

  // Si la carte sélectionnée est un bonus, on ne peut cibler que ses propres personnages
  if (appState.game.selectedCard.type === "bonus") {
    return; // Les cibles adverses ne sont pas valides pour les bonus
  }

  // Désélectionner les cibles précédentes
  document.querySelectorAll(".opponent-hand .selected-card").forEach((el) => {
    el.classList.remove("selected-card");
  });

  // Sélectionner cette cible
  const cardElement = document.querySelector(
    `.opponent-hand .card-container[data-id="${card.id}"]`
  );
  cardElement.classList.add("selected-card");

  // Mettre à jour l'état
  appState.game.selectedTarget = card;
}

// Gestionnaire d'attaque
function handleAttack() {
  if (
    !appState.game.isMyTurn ||
    !appState.game.selectedCard ||
    !appState.game.selectedTarget
  ) {
    alert("Veuillez sélectionner une carte personnage et une cible");
    return;
  }

  if (appState.game.selectedCard.type !== "personnage") {
    alert("Veuillez sélectionner une carte personnage pour attaquer");
    return;
  }

  const attackData = {
    gameId: appState.game.id,
    playerId: appState.player.id,
    attackerId: appState.game.selectedCard.card.id,
    targetId: appState.game.selectedTarget.id,
  };

  // Envoyer via WebSocket
  if (window.socket) {
    window.socket.emit("attack", attackData);
  }

  // Réinitialiser les sélections
  resetSelections();
}

// Gestionnaire d'application de bonus
function handleApplyBonus() {
  if (!appState.game.isMyTurn || !appState.game.selectedCard) {
    alert("Veuillez sélectionner une carte bonus");
    return;
  }

  if (appState.game.selectedCard.type !== "bonus") {
    alert("Veuillez sélectionner une carte bonus");
    return;
  }

  // Pour appliquer un bonus, demander à l'utilisateur de sélectionner un personnage
  const targetPersonnage = prompt(
    "Entrez l'ID de la carte personnage à laquelle appliquer le bonus"
  );

  if (!targetPersonnage) {
    return;
  }

  // Vérifier si c'est un ID valide
  const isValidTarget = appState.game.state[
    appState.game.playerKey
  ].cards.personnages.some((card) => card.id === targetPersonnage);

  if (!isValidTarget) {
    alert("Carte personnage invalide");
    return;
  }

  const bonusData = {
    gameId: appState.game.id,
    playerId: appState.player.id,
    cardId: appState.game.selectedCard.card.id,
    targetId: targetPersonnage,
  };

  // Envoyer via WebSocket
  if (window.socket) {
    window.socket.emit("play_card", bonusData);
  }

  // Réinitialiser les sélections
  resetSelections();
}

// Gestionnaire de fin de tour
function handleEndTurn() {
  if (!appState.game.isMyTurn) {
    return;
  }

  const turnData = {
    gameId: appState.game.id,
    playerId: appState.player.id,
  };

  // Envoyer via WebSocket
  if (window.socket) {
    window.socket.emit("end_turn", turnData);
  }

  // Réinitialiser les sélections
  resetSelections();
}

// Réinitialise les sélections de cartes
function resetSelections() {
  appState.game.selectedCard = null;
  appState.game.selectedTarget = null;

  document.querySelectorAll(".selected-card").forEach((el) => {
    el.classList.remove("selected-card");
  });
}

// Active/désactive les boutons d'action
function toggleActionButtons(enable) {
  elements.attackBtn.disabled = !enable;
  elements.applyBonusBtn.disabled = !enable;
  elements.endTurnBtn.disabled = !enable;
}

// Gère la fin de partie
function handleGameOver(gameState) {
  const winner =
    gameState.winner === appState.game.playerKey
      ? "Vous avez gagné !"
      : "Vous avez perdu !";

  elements.winnerDisplay.textContent = winner;
  elements.gameView.style.display = "none";
  elements.gameOver.style.display = "block";
}

// Réinitialise le jeu pour retourner au lobby
function resetGame() {
  appState = {
    player: {
      name: "",
      id: "",
    },
    game: {
      id: "",
      state: null,
      isMyTurn: false,
      selectedCard: null,
      selectedTarget: null,
      playerKey: null,
      opponentKey: null,
    },
  };

  // Réinitialiser les éléments du DOM
  elements.playerName.value = "";
  elements.gameId.value = "";
  elements.waitingRoom.style.display = "none";
  elements.gameView.style.display = "none";
  elements.gameOver.style.display = "none";
  elements.lobbyView.style.display = "block";
  elements.joinGameForm.style.display = "none";

  // Fermer la connexion WebSocket
  if (window.socket) {
    window.socket.disconnect();
  }
}

// Lancer l'application
document.addEventListener("DOMContentLoaded", init);
