// Script pour gérer les connexions WebSocket dans le frontend
document.addEventListener("DOMContentLoaded", () => {
  // Connexion à Socket.io
  const socket = io();

  // Variables globales
  let gameId = null;
  let playerId = null;
  let isMyTurn = false;

  // Éléments du DOM
  const statusElement = document.getElementById("status-display");
  const statusIndicator = document.querySelector(".status-indicator");
  const gameIdDisplay = document.getElementById("game-id-display");
  const player1CardsContainer = document.getElementById("player1-cards");
  const player2CardsContainer = document.getElementById("player2-cards");
  const notificationArea = document.getElementById("notification-area");
  const turnIndicator = document.getElementById("turn-indicator");

  // Fonction pour afficher des notifications
  function showNotification(message, type = "info") {
    console.log(`Notification (${type}): ${message}`);

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
    console.log("Connecté au serveur WebSocket", socket.id);
    statusElement.textContent = "Connecté";
    statusIndicator.className = "status-indicator connected";
    showNotification("Connexion au serveur établie", "success");
  });

  // Événement lorsque la connexion est perdue
  socket.on("disconnect", () => {
    console.log("Déconnecté du serveur WebSocket");
    statusElement.textContent = "Déconnecté";
    statusIndicator.className = "status-indicator disconnected";
    showNotification(
      "La connexion au serveur a été perdue. Tentative de reconnexion...",
      "error"
    );
  });

  // Événement lorsqu'un joueur rejoint la partie
  socket.on("playerJoined", (data) => {
    console.log("Un joueur a rejoint la partie:", data);
    showNotification(`Le joueur ${data.playerId} a rejoint la partie`, "info");
  });

  // Événement lorsqu'une partie commence
  socket.on("gameStarted", (data) => {
    console.log("Partie commencée:", data);
    gameIdDisplay.textContent = `Partie #${data.gameId}`;
    statusElement.textContent = "Partie en cours";
    statusIndicator.className = "status-indicator connected";

    showNotification("La partie a commencé!", "success");

    // Mettre à jour l'interface en fonction du joueur actuel
    const currentPlayer = playerId === data.player1Id ? "player1" : "player2";
    isMyTurn = data.currentPlayer === currentPlayer;
    updateTurnIndicator();

    // Rafraîchir l'état du jeu
    if (window.gameController && window.gameController.updateGameState) {
      fetch(`/games/${gameId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.gameController.updateGameState(data.gameState);
          }
        })
        .catch((error) =>
          console.error(
            "Erreur lors de la récupération de l'état du jeu:",
            error
          )
        );
    }
  });

  // Événement lorsqu'une carte est jouée par l'adversaire
  socket.on("cardPlayed", (data) => {
    console.log("Carte jouée par l'adversaire:", data);
    showNotification(
      `Votre adversaire a joué une carte: ${
        data.cardData.name || data.cardData.id
      }`
    );
    // Mettre à jour l'affichage des cartes
    if (window.gameController && window.gameController.updateGameState) {
      // Récupérer le nouvel état du jeu
      fetch(`/games/${gameId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.gameController.updateGameState(data.gameState);
          }
        })
        .catch((error) =>
          console.error(
            "Erreur lors de la récupération de l'état du jeu:",
            error
          )
        );
    }
  });

  // Événement lorsque le tour change
  socket.on("turnChanged", (data) => {
    console.log("Tour changé:", data);

    // Déterminer si c'est notre tour
    const myPlayerKey = playerId === data.player1Id ? "player1" : "player2";
    isMyTurn = data.currentPlayer === myPlayerKey;

    showNotification(
      isMyTurn ? "C'est votre tour!" : "C'est le tour de votre adversaire",
      isMyTurn ? "success" : "info"
    );

    updateTurnIndicator();

    // Mettre à jour l'état du jeu
    if (window.gameController && window.gameController.updateGameState) {
      const gameState = {
        currentPlayer: data.currentPlayer,
      };

      // Si nous avons reçu des informations de santé, les inclure
      if (data.player1Health) {
        gameState.player1 = { health: data.player1Health };
      }

      if (data.player2Health) {
        gameState.player2 = { health: data.player2Health };
      }

      window.gameController.updateGameState(gameState);
    }
  });

  // Événement lorsque la partie se termine
  socket.on("gameOver", (data) => {
    console.log("Partie terminée:", data);

    const myPlayerKey = playerId === data.player1Id ? "player1" : "player2";
    const hasWon = data.winner === myPlayerKey;

    showNotification(
      hasWon
        ? "Félicitations! Vous avez gagné la partie!"
        : "Vous avez perdu la partie.",
      hasWon ? "success" : "error"
    );

    // Mettre à jour l'interface
    statusElement.textContent = "Partie terminée";
    turnIndicator.textContent = hasWon ? "Victoire!" : "Défaite!";
    turnIndicator.className = hasWon ? "your-turn" : "opponent-turn";

    // Désactiver les contrôles de jeu
    isMyTurn = false;
    updateTurnIndicator();

    // Mettre à jour l'affichage si nécessaire
    if (window.gameController && window.gameController.updateGameState) {
      // Récupérer l'état final du jeu
      fetch(`/games/${gameId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Ajouter les informations de fin de partie
            const finalState = {
              ...data.gameState,
              gameOver: true,
              winner: data.winner,
            };
            window.gameController.updateGameState(finalState);
          }
        })
        .catch((error) =>
          console.error(
            "Erreur lors de la récupération de l'état du jeu:",
            error
          )
        );
    }

    // Afficher un bouton pour revenir au menu principal
    const backToMenuBtn = document.createElement("button");
    backToMenuBtn.textContent = "Retour au menu principal";
    backToMenuBtn.className = "btn btn-primary";
    backToMenuBtn.addEventListener("click", () => {
      // Réinitialiser l'application
      window.location.reload();
    });

    const gameControls = document.getElementById("game-controls");
    if (gameControls) {
      // Supprimer les contrôles existants
      while (gameControls.firstChild) {
        gameControls.removeChild(gameControls.firstChild);
      }
      gameControls.appendChild(backToMenuBtn);
    }
  });

  // Fonction pour rejoindre une partie
  function joinGame(gameIdToJoin, playerIdToUse) {
    gameId = gameIdToJoin;
    playerId = playerIdToUse;

    console.log(
      `Tentative de rejoindre la partie ${gameId} en tant que ${playerId}`
    );

    // Rejoindre la salle Socket.io pour cette partie
    socket.emit("joinGame", { gameId, playerId });

    // Mettre à jour l'interface
    gameIdDisplay.textContent = `Partie #${gameId}`;
    statusElement.textContent = "En attente d'un adversaire...";
    statusIndicator.className = "status-indicator waiting";

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
    if (!cardElement) {
      showNotification("Carte introuvable dans le DOM", "error");
      return;
    }

    const cardType = cardElement.dataset.type;
    const cardName =
      cardElement.querySelector(".card-name")?.textContent || cardId;

    const cardData = {
      id: cardId,
      name: cardName,
      type: cardType,
    };

    console.log(
      `Joueur ${playerId} joue la carte ${cardId} (${cardType}) sur ${targetId}`
    );

    // Envoyer l'action au serveur
    socket.emit("playCard", { gameId, playerId, cardData, targetId });

    showNotification(`Vous avez joué la carte ${cardName}`);
  }

  // Fonction pour terminer son tour
  function endTurn() {
    if (!isMyTurn) {
      showNotification("Ce n'est pas votre tour!", "error");
      return;
    }

    console.log(`Joueur ${playerId} termine son tour`);
    socket.emit("endTurn", { gameId, playerId });
    showNotification("Vous avez terminé votre tour");

    // Désactiver temporairement les contrôles de jeu en attendant la confirmation
    isMyTurn = false;
    updateTurnIndicator();
  }

  // Fonction pour mettre à jour l'indicateur de tour
  function updateTurnIndicator() {
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

  // Exposer les fonctions utiles globalement
  window.gameSocket = {
    joinGame,
    playCard,
    endTurn,
    showNotification,
    updateTurnIndicator,
    getPlayerId: () => playerId,
    getGameId: () => gameId,
    isMyTurn: () => isMyTurn,
  };
});

class GameSocket {
  constructor() {
    this.socket = io();
    this.setupListeners();
  }

  setupListeners() {
    this.socket.on("connect", () => {
      console.log("Connecté au serveur WebSocket", this.socket.id);
      // Ne pas essayer d'accéder à des éléments DOM ici
    });

    this.socket.on("gameState", (state) => {
      if (window.gameUI) {
        window.gameUI.updateState(state);
      }
    });

    this.socket.on("playerJoined", ({ playerId }) => {
      console.log("Joueur rejoint:", playerId);
      this.showNotification("Un joueur a rejoint la partie");
    });

    this.socket.on("error", (error) => {
      console.error("Erreur socket:", error);
      this.showNotification(error.message, "error");
    });
  }

  joinGame(gameId, playerId) {
    console.log(
      `Tentative de rejoindre la partie ${gameId} en tant que ${playerId}`
    );
    this.socket.emit("joinGame", { gameId, playerId });
  }
}

// Créer l'instance globale
window.gameSocket = new GameSocket();
