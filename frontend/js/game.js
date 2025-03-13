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

// Variables globales
let gameId = null;
let playerId = null;
let playerCards = [];

// Fonction pour créer une partie
async function createGame() {
  try {
    playerId = generatePlayerId();
    const response = await fetch("/games/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerId }),
    });
    const { gameId: newGameId } = await response.json();
    gameId = newGameId;
    joinGame();
  } catch (error) {
    console.error("Erreur lors de la création de la partie :", error);
  }
}

// Fonction pour rejoindre une partie
async function joinGame() {
  try {
    const response = await fetch("/games/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, playerId }),
    });
    const { joined } = await response.json();
    if (joined) {
      // La partie a été rejointe avec succès
      mainMenu.style.display = "none";
      gameBoard.style.display = "block";
      startGame();
    } else {
      alert("Impossible de rejoindre la partie.");
    }
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie :", error);
  }
}

// Fonction pour démarrer la partie
function startGame() {
  // Récupérer les cartes du joueur depuis le serveur
  fetchPlayerCards();

  // Configurer les événements pour les actions du joueur
  playBonusBtn.addEventListener("click", playBonus);
  attackBtn.addEventListener("click", attack);
  endTurnBtn.addEventListener("click", endTurn);
}

// Fonction pour récupérer les cartes du joueur
async function fetchPlayerCards() {
  try {
    const response = await fetch(`/cards/random?type=perso&count=5`);
    const persoCards = await response.json();

    const response2 = await fetch(`/cards/random?type=bonus&count=5`);
    const bonusCards = await response2.json();

    playerCards = [...persoCards, ...bonusCards];
    renderPlayerCards();
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des cartes du joueur :",
      error
    );
  }
}

// Fonction pour afficher les cartes du joueur
function renderPlayerCards() {
  player1CardsContainer.innerHTML = "";
  playerCards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.dataset.id = card.id;
    cardElement.dataset.type = card.type;
    cardElement.innerHTML = `
      <img src="${card.imageUrl}" alt="${card.name}">
      <div class="card-name">${card.name}</div>
    `;
    player1CardsContainer.appendChild(cardElement);
  });
}

// Fonction pour jouer un bonus
function playBonus() {
  // ...
}

// Fonction pour attaquer
function attack() {
  // ...
}

// Fonction pour finir le tour
async function endTurn() {
  try {
    const response = await fetch("/games/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        playerId,
        actions: {
          /* ... */
        },
      }),
    });
    const { success } = await response.json();
    if (success) {
      // Le tour a été joué avec succès
      // Mettre à jour l'affichage du jeu
      // ...
    } else {
      alert("Erreur lors du tour de jeu.");
    }
  } catch (error) {
    console.error("Erreur lors du tour de jeu :", error);
  }
}

// Fonction pour générer un identifiant de joueur unique
function generatePlayerId() {
  return Math.random().toString(36).substring(7);
}

// Configurer les événements pour les boutons du menu principal
createGameBtn.addEventListener("click", createGame);
joinGameBtn.addEventListener("click", () => {
  gameId = gameIdInput.value;
  joinGame();
});
