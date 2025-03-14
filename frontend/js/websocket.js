// Script pour gérer les connexions WebSocket dans le frontend
document.addEventListener("DOMContentLoaded", () => {
  // Connexion à Socket.io
  const socket = io();

  // Variables globales
  let gameId = null;
  let playerId = null;
  let isMyTurn = false;

  // Éléments du DOM
  const statusElement = document.getElementById("status");
  const gameIdDisplay = document.getElementById("game-id-display");
  const player1CardsContainer = document.getElementById("player1-cards");
  const player2CardsContainer = document.getElementById("player2-cards");
  const notificationArea = document.getElementById("notification-area");

  // Fonction pour afficher des notifications
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationArea.appendChild(notification);

    // Supprimer la notification après 5 secondes
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Événement lorsque la connexion est établie
  socket.on("connect", () => {
    console.log("Connecté au serveur WebSocket");
    statusElement.textContent = "Connecté";
    statusElement.className = "connected";
  });

  // Événement lorsque la connexion est perdue
  socket.on("disconnect", () => {
    console.log("Déconnecté du serveur WebSocket");
    statusElement.textContent = "Déconnecté";
    statusElement.className = "disconnected";
    showNotification(
      "La connexion au serveur a été perdue. Tentative de reconnexion...",
      "error"
    );
  });

  // Événement lorsqu'une partie commence
  socket.on("gameStarted", (data) => {
    console.log("Partie commencée:", data);
    gameIdDisplay.textContent = `Partie #${data.gameId}`;

    showNotification("La partie a commencé!", "success");

    // Mettre à jour l'interface en fonction du joueur actuel
    isMyTurn =
      data.currentPlayer ===
      (playerId === data.player1Id ? "player1" : "player2");
    updateTurnIndicator();
  });

  // Événement lorsqu'une carte est jouée par l'adversaire
  socket.on("cardPlayed", (data) => {
    console.log("Carte jouée par l'adversaire:", data);
    showNotification(
      `Votre adversaire a joué une carte: ${data.cardData.name}`
    );
    // Mettre à jour l'affichage des cartes
    updateGameBoard();
  });

  // Événement lorsque le tour change
  socket.on("turnChanged", (data) => {
    console.log("Tour changé:", data);

    // Mettre à jour l'interface
    const playerKey = playerId === data.player1Id ? "player1" : "player2";
    isMyTurn = data.currentPlayer === playerKey;

    showNotification(
      isMyTurn ? "C'est votre tour!" : "C'est le tour de votre adversaire"
    );
    updateTurnIndicator();
    updateGameBoard();
  });

  // Événement lorsque la partie se termine
  socket.on("gameOver", (data) => {
    console.log("Partie terminée:", data);

    const playerKey = playerId === data.player1Id ? "player1" : "player2";
    const hasWon = data.winner === playerKey;

    showNotification(
      hasWon
        ? "Félicitations! Vous avez gagné la partie!"
        : "Vous avez perdu la partie.",
      hasWon ? "success" : "error"
    );

    // Désactiver les contrôles de jeu
    isMyTurn = false;
    updateTurnIndicator();
    updateGameBoard();

    // Afficher un bouton pour revenir au menu principal
    const backToMenuBtn = document.createElement("button");
    backToMenuBtn.textContent = "Retour au menu principal";
    backToMenuBtn.className = "btn btn-primary";
    backToMenuBtn.addEventListener("click", () => {
      // Réinitialiser l'application
      window.location.reload();
    });

    document.getElementById("game-controls").appendChild(backToMenuBtn);
  });

  // Fonction pour rejoindre une partie
  function joinGame(gameIdToJoin, playerIdToUse) {
    gameId = gameIdToJoin;
    playerId = playerIdToUse;

    // Rejoindre la salle Socket.io pour cette partie
    socket.emit("joinGame", { gameId, playerId });

    // Mettre à jour l'interface
    gameIdDisplay.textContent = `Partie #${gameId}`;
    statusElement.textContent = "En attente d'un adversaire...";
    statusElement.className = "waiting";

    showNotification("Connexion à la partie en cours...");
  }

  // Fonction pour jouer une carte
  function playCard(cardId, targetId) {
    if (!isMyTurn) {
      showNotification("Ce n'est pas votre tour!", "error");
      return;
    }

    // Récupérer les détails de la carte à partir du DOM
    const cardElement = document.querySelector(`[data-id="${cardId}"]`);
    const cardData = {
      id: cardId,
      name: cardElement.querySelector(".card-name").textContent,
      type: cardElement.dataset.type,
    };

    // Envoyer l'action au serveur
    socket.emit("playCard", { gameId, playerId, cardData, targetId });

    showNotification(`Vous avez joué la carte ${cardData.name}`);
  }

  // Fonction pour terminer son tour
  function endTurn() {
    if (!isMyTurn) {
      showNotification("Ce n'est pas votre tour!", "error");
      return;
    }

    socket.emit("endTurn", { gameId, playerId });
    showNotification("Vous avez terminé votre tour");

    // Désactiver temporairement les contrôles de jeu
    isMyTurn = false;
    updateTurnIndicator();
  }

  // Fonction pour mettre à jour l'indicateur de tour
  function updateTurnIndicator() {
    const turnIndicator = document.getElementById("turn-indicator");
    if (!turnIndicator) return;

    turnIndicator.textContent = isMyTurn
      ? "C'est votre tour"
      : "Tour de l'adversaire";
    turnIndicator.className = isMyTurn ? "your-turn" : "opponent-turn";

    // Mettre à jour l'état des boutons
    const actionButtons = document.querySelectorAll(".action-btn");
    actionButtons.forEach((btn) => {
      btn.disabled = !isMyTurn;
    });
  }

  // Fonction pour mettre à jour l'affichage du plateau de jeu
  function updateGameBoard() {
    // Cette fonction devrait être implémentée pour mettre à jour l'affichage
    // des cartes et de l'état du jeu en fonction des données reçues du serveur

    // Pour l'instant, c'est juste un espace réservé
    console.log("Mise à jour du plateau de jeu");
  }

  // Exposer les fonctions utiles globalement
  window.gameSocket = {
    joinGame,
    playCard,
    endTurn,
  };
});
