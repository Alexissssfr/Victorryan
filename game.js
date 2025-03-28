const { prepareCards } = require("./cardLoader");
const Duel = require("./duel");

// Fonction principale du jeu
function startGame() {
  console.log("Chargement des cartes...");

  // Préparation des cartes
  const cardsManager = prepareCards();

  if (!cardsManager) {
    console.error(
      "Impossible de charger les cartes. Vérifiez les chemins des fichiers JSON."
    );
    return;
  }

  // Tirage de 20 cartes aléatoires
  const randomCards = cardsManager.drawRandomCards(20);

  // Diviser les cartes entre les deux joueurs (10 cartes chacun)
  const player1Cards = randomCards.slice(0, 10);
  const player2Cards = randomCards.slice(10, 20);

  console.log(`Cartes chargées : ${randomCards.length} cartes au total`);
  console.log(`Joueur 1 : ${player1Cards.length} cartes`);
  console.log(`Joueur 2 : ${player2Cards.length} cartes`);

  // Création d'un nouveau duel
  const duel = new Duel(player1Cards, player2Cards);

  // Démarrer le duel
  duel.startGame();

  // Simuler quelques tours (pour la démonstration)
  simulateGame(duel, 10);
}

// Fonction pour simuler quelques tours de jeu (pour la démonstration)
function simulateGame(duel, turns) {
  let currentTurn = 0;

  const actions = ["attack"];

  const simulateTurn = () => {
    currentTurn++;

    if (currentTurn > turns || duel.gameOver) {
      if (!duel.gameOver) {
        duel.endGame();
      }
      return;
    }

    // Choisir une action aléatoire
    const action = actions[Math.floor(Math.random() * actions.length)];

    console.log(`\nSimulation du tour ${currentTurn}: action = ${action}`);
    duel.playCard(action);

    // Continuer la simulation après un court délai
    setTimeout(simulateTurn, 1000);
  };

  // Démarrer la simulation
  setTimeout(simulateTurn, 1000);
}

// Démarrer le jeu
startGame();
