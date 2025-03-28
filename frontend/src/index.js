import { api } from "../utils/api.js";
import { setupWebSocket } from "../utils/websocket.js";
import { GameBoard } from "../components/GameBoard.js";
import { CardHand } from "../components/CardHand.js";
import { PlayerInfo } from "../components/PlayerInfo.js";

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
  createGameBtn: document.getElementById("create-game-btn"),
  confirmJoinBtn: document.getElementById("confirm-join-btn"),
  gameId: document.getElementById("game-id-input"),
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
  errorMessage: document.getElementById("errorMessage"),
};

// Initialisation de l'application
function init() {
  console.log("=== Initialisation de l'application ===");
  console.log("Version: 1.0.0");

  // Vérifier que tous les éléments DOM sont disponibles
  let missingElements = [];
  for (const key in elements) {
    if (!elements[key]) {
      missingElements.push(key);
      console.error(`Élément DOM manquant: ${key}`);
    }
  }

  if (missingElements.length > 0) {
    console.error(
      "ATTENTION: Certains éléments DOM sont manquants:",
      missingElements
    );
  } else {
    console.log("✅ Tous les éléments DOM sont disponibles");
  }

  // Configurer les écouteurs d'événements
  setupEventListeners();
  console.log("✅ Écouteurs d'événements configurés");

  // Désactiver les boutons d'action par défaut
  toggleActionButtons(false);
  console.log("✅ Boutons d'action désactivés par défaut");

  // Configurer la reconnexion WebSocket automatique
  setupWebSocketReconnection();
  console.log("✅ Reconnexion WebSocket configurée");

  // Activer le mode debug si nécessaire (window.DEBUG = true dans la console pour l'activer)
  setupDebugging();
  console.log("✅ Débogage configuré");

  // Au début de la fonction init()
  window.addEventListener("error", (event) => {
    console.error("Erreur globale capturée:", event.error);
    showError(`Une erreur est survenue: ${event.error.message}`);
  });

  console.log("=== Initialisation terminée ===");
}

/**
 * Configure les outils de débogage
 */
function setupDebugging() {
  // Exposer l'état de l'application et les fonctions de débogage sur window
  window.appState = appState;
  window.debugGame = {
    showState: () => console.log("État actuel du jeu:", appState),
    logPlayerCards: () => {
      if (appState.game.state && appState.game.playerKey) {
        console.log(
          "Cartes du joueur:",
          appState.game.state[appState.game.playerKey].cards
        );
      } else {
        console.log("Aucune partie en cours");
      }
    },
    forceUpdate: () => {
      if (appState.game.gameBoard) {
        appState.game.gameBoard.update();
        console.log("Mise à jour forcée du plateau de jeu");
      }
    },
    resetGame: resetGame,
  };

  console.log("Mode debug disponible via window.debugGame");
}

/**
 * Configure la reconnexion automatique des WebSockets
 */
function setupWebSocketReconnection() {
  window.addEventListener("online", function () {
    console.log(
      "Connexion réseau rétablie, tentative de reconnexion WebSocket..."
    );
    reconnectWebSocket();
  });

  // Vérifier l'état de la connexion toutes les 30 secondes
  setInterval(checkWebSocketConnection, 30000);
}

/**
 * Vérifie l'état de la connexion WebSocket et tente une reconnexion si nécessaire
 */
function checkWebSocketConnection() {
  if (appState.game.id && !isWebSocketConnected()) {
    console.log("Connexion WebSocket perdue, tentative de reconnexion...");
    reconnectWebSocket();
  }
}

/**
 * Vérifie si la connexion WebSocket est active
 * @returns {boolean} - true si la connexion est active, false sinon
 */
function isWebSocketConnected() {
  // Vérification basée sur l'état du socket actuel
  const socket = window.gameSocket?.socket;
  return socket && socket.connected;
}

/**
 * Tente de reconnecter le WebSocket et de rejoindre la partie en cours
 */
function reconnectWebSocket() {
  if (!appState.game.id) return;

  // Reconfigurer le WebSocket
  setupWebSocket(appState.game.id, appState.player.id, handleGameUpdate);

  // Afficher un message à l'utilisateur
  showNotification("Reconnexion au serveur...", "info");
}

/**
 * Affiche une notification à l'utilisateur
 * @param {string} message - Le message à afficher
 * @param {string} type - Le type de notification (info, success, error, warning)
 */
function showNotification(message, type = "info") {
  // Si l'élément de notification n'existe pas, on le crée
  let notificationElement = document.getElementById("notification");
  if (!notificationElement) {
    notificationElement = document.createElement("div");
    notificationElement.id = "notification";
    notificationElement.style.position = "fixed";
    notificationElement.style.top = "20px";
    notificationElement.style.right = "20px";
    notificationElement.style.padding = "10px 20px";
    notificationElement.style.borderRadius = "5px";
    notificationElement.style.color = "white";
    notificationElement.style.zIndex = "1000";
    notificationElement.style.transition = "opacity 0.5s";
    document.body.appendChild(notificationElement);
  }

  // Définir le style selon le type
  const bgColors = {
    info: "#007bff",
    success: "#28a745",
    error: "#dc3545",
    warning: "#ffc107",
  };

  notificationElement.style.backgroundColor = bgColors[type] || bgColors.info;
  notificationElement.textContent = message;
  notificationElement.style.opacity = "1";

  // Faire disparaître la notification après 3 secondes
  clearTimeout(window.notificationTimeout);
  window.notificationTimeout = setTimeout(() => {
    notificationElement.style.opacity = "0";
  }, 3000);
}

// Mise en place des écouteurs d'événements
function setupEventListeners() {
  // Événements du lobby
  elements.createGameBtn.addEventListener("click", createGame);
  elements.confirmJoinBtn.addEventListener("click", joinGame);

  // Améliorer l'expérience utilisateur avec les entrées de clavier
  elements.gameId.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      joinGame();
    }
  });

  // Événements du jeu
  elements.attackBtn.addEventListener("click", handleAttack);
  elements.applyBonusBtn.addEventListener("click", handleApplyBonus);
  elements.endTurnBtn.addEventListener("click", handleEndTurn);
  elements.backToLobbyBtn.addEventListener("click", resetGame);
}

// Fonction pour afficher les messages d'erreur
function showError(message) {
  console.error("ERREUR:", message);

  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = "block";

    // Scroll jusqu'au message d'erreur
    elements.errorMessage.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Cacher le message après 8 secondes
    setTimeout(() => {
      elements.errorMessage.style.display = "none";
    }, 8000);
  } else {
    // Fallback si l'élément n'est pas disponible
    alert(message);
  }
}

// Fonction pour générer un nom aléatoire pour les joueurs
function generateRandomName() {
  const prefix = ["Joueur", "User", "Gamer", "Player"];
  const suffix = Math.floor(1000 + Math.random() * 9000); // nombre à 4 chiffres
  return `${prefix[Math.floor(Math.random() * prefix.length)]}_${suffix}`;
}

// Créer une nouvelle partie
async function createGame() {
  try {
    console.log("Fonction createGame appelée");
    // Désactiver le bouton pendant le traitement
    elements.createGameBtn.disabled = true;
    elements.createGameBtn.textContent = "Création en cours...";

    const playerName = prompt("Entrez votre nom:", generateRandomName());
    if (!playerName) {
      throw new Error("Nom de joueur non fourni");
    }

    console.log("Tentative d'appel API createGame avec le nom:", playerName);
    const response = await api.createGame(playerName);
    console.log("Réponse complète de l'API:", JSON.stringify(response));

    if (!response || !response.gameId) {
      throw new Error("Réponse du serveur invalide");
    }

    // Définir l'ID de la partie et du joueur
    appState.game.id = response.gameId;
    appState.player.id = playerName;

    // Configurer WebSocket
    setupWebSocket(appState.game.id, appState.player.id, handleGameUpdate);

    // Obtenir l'état initial du jeu
    const gameState = await api.getGameState(response.gameId);
    if (!gameState) {
      throw new Error("Impossible de récupérer l'état du jeu");
    }

    appState.game.state = gameState;

    // Déterminer les clés joueur/adversaire
    appState.game.playerKey = "player1";
    appState.game.opponentKey = "player2";

    // Passer en mode d'affichage d'attente spécial pour le créateur
    showWaitingForOpponent(response.gameId);

    console.log("Partie créée avec succès, en attente d'un adversaire");
  } catch (error) {
    console.error("Erreur détaillée:", error);
    alert("Erreur: " + error.message);
  } finally {
    // Réactiver le bouton
    elements.createGameBtn.disabled = false;
    elements.createGameBtn.textContent = "Créer une partie";
  }
}

// Rejoindre une partie existante
async function joinGame() {
  const gameIdValue = elements.gameId.value.trim().toUpperCase();
  if (gameIdValue.length === 0) {
    showError("Veuillez entrer l'identifiant de la partie");
    return;
  }

  const playerName = prompt("Entrez votre nom:", "Joueur2");
  if (!playerName) return;

  // Désactiver le bouton pendant le traitement
  elements.confirmJoinBtn.disabled = true;
  elements.confirmJoinBtn.textContent = "Connexion en cours...";

  try {
    // Rejoindre une partie
    const response = await api.joinGame(gameIdValue, playerName);
    console.log("Réponse API:", response);

    // Définir l'ID de la partie et du joueur
    appState.game.id = gameIdValue;
    appState.player.id = playerName;

    // Configurer WebSocket
    setupWebSocket(appState.game.id, appState.player.id, handleGameUpdate);

    // Obtenir l'état du jeu
    const gameState = await api.getGameState(gameIdValue);
    appState.game.state = gameState;

    // Déterminer les clés joueur/adversaire
    appState.game.playerKey = "player2";
    appState.game.opponentKey = "player1";

    // Afficher l'écran de jeu
    showGameView();

    console.log("Partie rejointe avec succès");
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    showError(
      "Erreur lors de la connexion à la partie: " +
        (error.message || "Connexion au serveur impossible")
    );
  } finally {
    // Réactiver le bouton
    elements.confirmJoinBtn.disabled = false;
    elements.confirmJoinBtn.textContent = "Rejoindre";
  }
}

/**
 * Affiche l'écran d'attente pour le créateur de la partie
 * @param {string} gameId - ID de la partie
 */
function showWaitingForOpponent(gameId) {
  console.log("Affichage de l'écran d'attente avec le code:", gameId);

  // Afficher clairement le code de partie
  elements.gameIdDisplay.textContent = gameId;

  // Vider les autres contenus possibles du waiting room
  while (elements.waitingRoom.childNodes.length > 3) {
    elements.waitingRoom.removeChild(elements.waitingRoom.lastChild);
  }

  // Réinitialiser le contenu du paragraphe avec le code de partie
  const idContainer = elements.waitingRoom.querySelector("p");
  if (idContainer) {
    // Conserver uniquement le texte et le span, supprimer tout autre élément
    const textNode = idContainer.firstChild;
    const spanElement = elements.gameIdDisplay;
    idContainer.innerHTML = "";
    idContainer.appendChild(textNode);
    idContainer.appendChild(spanElement);

    // Créer un bouton pour copier le code
    const copyButton = document.createElement("button");
    copyButton.className = "btn btn-primary mt-2 mb-3 ms-2";
    copyButton.textContent = "Copier le code";
    copyButton.onclick = function () {
      navigator.clipboard
        .writeText(gameId)
        .then(() => {
          copyButton.textContent = "Code copié !";
          setTimeout(() => {
            copyButton.textContent = "Copier le code";
          }, 2000);
        })
        .catch((err) => {
          console.error("Erreur lors de la copie:", err);
          showError("Impossible de copier le code");
        });
    };
    idContainer.appendChild(copyButton);
  }

  // Ajouter un message d'instructions
  const instructions = document.createElement("p");
  instructions.innerHTML =
    "<strong>En attente d'un adversaire...</strong><br>Partagez ce code pour que votre adversaire puisse vous rejoindre.";
  instructions.className = "mt-3";
  elements.waitingRoom.appendChild(instructions);

  // Cacher l'écran de lobby et afficher l'écran d'attente
  elements.lobbyView.style.display = "none";
  elements.gameView.style.display = "none";
  elements.waitingRoom.style.display = "block";
  elements.gameIdDisplay.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// Gestionnaire des mises à jour du jeu via WebSocket
function handleGameUpdate(gameState) {
  console.log("Mise à jour de l'état du jeu reçue:", gameState);

  // Stocker l'état précédent pour comparer
  const previousState = appState.game.state;
  const previousTurn = previousState ? previousState.currentTurn : null;

  // Mettre à jour l'état du jeu
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
    console.log(
      "Le second joueur a rejoint la partie. Passage à l'écran de jeu."
    );
    showGameView();
  }

  // Vérifier si c'est le tour du joueur
  const wasMyTurn = appState.game.isMyTurn;
  appState.game.isMyTurn = gameState.currentTurn === appState.game.playerKey;

  // Si le tour vient de changer, notifier l'utilisateur
  if (previousTurn && previousTurn !== gameState.currentTurn) {
    if (appState.game.isMyTurn) {
      // C'est maintenant mon tour
      notifyTurnChange(true);
    } else if (wasMyTurn) {
      // Ce n'est plus mon tour
      notifyTurnChange(false);
    }
  }

  // Mettre à jour l'interface
  updateGameInterface();

  // Vérifier si la partie est terminée
  if (gameState.status === "finished") {
    handleGameOver(gameState);
  }
}

/**
 * Notifie l'utilisateur d'un changement de tour
 * @param {boolean} isMyTurn - Indique si c'est maintenant le tour du joueur
 */
function notifyTurnChange(isMyTurn) {
  const message = isMyTurn
    ? "C'est votre tour !"
    : "C'est maintenant le tour de votre adversaire";

  // Animation de l'indicateur de tour
  elements.turnIndicator.style.animation = "none";
  setTimeout(() => {
    elements.turnIndicator.style.animation = "pulse 2s infinite";
  }, 10);

  // Afficher une notification si le navigateur le supporte
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(message);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(message);
        }
      });
    }
  }

  // Jouer un son si c'est votre tour (à implémenter plus tard)
  if (isMyTurn) {
    console.log("🔔 C'est votre tour!");
  }
}

/**
 * Met à jour l'interface du jeu en fonction de l'état actuel
 */
function updateGameInterface() {
  // Mettre à jour l'indicateur de tour
  elements.turnIndicator.textContent = appState.game.isMyTurn
    ? "C'est votre tour"
    : "Tour de l'adversaire";

  // Mettre à jour le style de l'indicateur de tour
  elements.turnIndicator.style.backgroundColor = appState.game.isMyTurn
    ? "#007bff"
    : "#6c757d";

  // Activer/désactiver les boutons d'action
  toggleActionButtons(appState.game.isMyTurn);

  // Actualiser l'affichage des cartes
  refreshCardsDisplay();
}

/**
 * Rafraîchit l'affichage des cartes du joueur et de l'adversaire
 */
function refreshCardsDisplay() {
  // Si le gameBoard n'existe pas encore, créons-le
  if (!appState.game.gameBoard) {
    appState.game.gameBoard = new GameBoard(
      appState,
      elements,
      handleCardSelect,
      handleTargetSelect
    );
  }

  // Mettre à jour l'affichage des cartes
  appState.game.gameBoard.update();
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
  // Réinitialiser l'état de l'application
  appState.game.id = "";
  appState.game.state = null;
  appState.game.isMyTurn = false;
  appState.game.selectedCard = null;
  appState.game.selectedTarget = null;

  // Revenir à l'écran de lobby
  elements.gameView.style.display = "none";
  elements.gameOver.style.display = "none";
  elements.waitingRoom.style.display = "none";
  elements.lobbyView.style.display = "block";

  // Nettoyer la connexion WebSocket
  if (window.socket) {
    window.socket.disconnect();
  }

  console.log("Jeu réinitialisé, retour au lobby");
}

// Vérifiez que init() est appelé quand le DOM est chargé
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM chargé, initialisation de l'application...");

  // Vérifiez que les éléments sont bien trouvés
  console.log("Bouton créer:", elements.createGameBtn);
  console.log("Bouton rejoindre:", elements.confirmJoinBtn);

  init();
});

// Exporter certaines fonctions pour le débogage
window.appFunctions = {
  createGame,
  joinGame,
  resetGame,
};

// Fonction de test pour déboguer l'API
window.testAPI = async function () {
  try {
    console.log("Test de l'API en cours...");

    // Test de base pour vérifier la connectivité
    const response = await fetch(window.location.origin + "/api/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerName: "TestPlayer" }),
    });

    const data = await response.text();
    console.log("Statut de la réponse:", response.status);
    console.log("Réponse complète:", data);

    return data;
  } catch (error) {
    console.error("Erreur de test API:", error);
    return error.message;
  }
};
