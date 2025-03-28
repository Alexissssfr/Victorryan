class Duel {
  constructor(player1Cards, player2Cards) {
    this.player1 = {
      name: "Joueur 1",
      cards: [...player1Cards],
      activeCard: null,
      activeBonus: [],
      score: 0,
    };

    this.player2 = {
      name: "Joueur 2",
      cards: [...player2Cards],
      activeCard: null,
      activeBonus: [],
      score: 0,
    };

    this.currentTurn = 0;
    this.currentPlayer = this.player1;
    this.opponent = this.player2;
    this.gameOver = false;
    this.winner = null;
  }

  startGame() {
    // Mélanger les cartes des joueurs
    this.player1.cards = this.shuffleCards(this.player1.cards);
    this.player2.cards = this.shuffleCards(this.player2.cards);

    console.log("Le duel commence !");
    this.nextTurn();
  }

  shuffleCards(cards) {
    return [...cards].sort(() => 0.5 - Math.random());
  }

  nextTurn() {
    this.currentTurn++;
    console.log(`\n--- Tour ${this.currentTurn} ---`);

    // Alterner les joueurs
    if (this.currentTurn % 2 === 1) {
      this.currentPlayer = this.player1;
      this.opponent = this.player2;
    } else {
      this.currentPlayer = this.player2;
      this.opponent = this.player1;
    }

    console.log(`C'est au tour de ${this.currentPlayer.name}`);

    // Mettre à jour les effets de bonus actifs
    this.updateActiveBonus();

    // Tirer une nouvelle carte si nécessaire
    if (!this.currentPlayer.activeCard) {
      this.drawCardForCurrentPlayer();
    }

    // Afficher l'état actuel
    this.displayGameState();
  }

  drawCardForCurrentPlayer() {
    if (this.currentPlayer.cards.length === 0) {
      console.log(`${this.currentPlayer.name} n'a plus de cartes !`);
      this.gameOver = true;
      this.winner = this.opponent;
      return;
    }

    const card = this.currentPlayer.cards.pop();

    if (card.type === "personnage") {
      this.currentPlayer.activeCard = card;
      console.log(
        `${this.currentPlayer.name} a tiré la carte personnage: ${card.nom}`
      );
    } else if (card.type === "bonus") {
      console.log(
        `${this.currentPlayer.name} a tiré la carte bonus: ${card.nom}`
      );
      this.applyBonus(card);
    }
  }

  applyBonus(bonusCard) {
    console.log(`Application du bonus: ${bonusCard.nom}`);

    // Ajouter le bonus aux effets actifs
    this.currentPlayer.activeBonus.push({
      card: bonusCard,
      remainingTurns: bonusCard.duree,
    });

    // Tirer une autre carte car le bonus n'est pas une carte active
    this.drawCardForCurrentPlayer();
  }

  updateActiveBonus() {
    // Mettre à jour la durée des bonus actifs et supprimer ceux qui ont expiré
    this.currentPlayer.activeBonus = this.currentPlayer.activeBonus
      .map((bonus) => {
        bonus.remainingTurns--;
        return bonus;
      })
      .filter((bonus) => bonus.remainingTurns > 0);
  }

  playCard(actionType) {
    if (!this.currentPlayer.activeCard) {
      console.log("Aucune carte active à jouer !");
      return;
    }

    if (actionType === "attack") {
      this.performAttack();
    }

    // Passer au tour suivant si le jeu n'est pas terminé
    if (!this.gameOver) {
      this.nextTurn();
    } else {
      this.endGame();
    }
  }

  performAttack() {
    if (!this.opponent.activeCard) {
      console.log("L'adversaire n'a pas de carte active à attaquer !");
      return;
    }

    const attackerCard = this.currentPlayer.activeCard;
    const defenderCard = this.opponent.activeCard;

    let attackForce = attackerCard.forceAttaque;

    // Appliquer les bonus d'attaque
    this.currentPlayer.activeBonus.forEach((bonus) => {
      attackForce += attackForce * (bonus.card.pourcentageBonus / 100);
    });

    console.log(
      `${attackerCard.nom} attaque ${
        defenderCard.nom
      } avec une force de ${Math.floor(attackForce)}`
    );

    // Infliger des dégâts
    defenderCard.pointsDeVie -= Math.floor(attackForce);

    console.log(
      `${defenderCard.nom} a maintenant ${defenderCard.pointsDeVie} points de vie`
    );

    // Vérifier si la carte défenseur est détruite
    if (defenderCard.pointsDeVie <= 0) {
      console.log(`${defenderCard.nom} a été vaincu !`);
      this.opponent.activeCard = null;
      this.currentPlayer.score++;

      // Vérifier si l'adversaire a encore des cartes
      if (this.opponent.cards.length === 0) {
        console.log(`${this.opponent.name} n'a plus de cartes !`);
        this.gameOver = true;
        this.winner = this.currentPlayer;
      }
    }
  }

  displayGameState() {
    console.log("\nÉtat du jeu:");
    console.log(`${this.player1.name}: Score ${this.player1.score}`);
    if (this.player1.activeCard) {
      console.log(
        `Carte active: ${this.player1.activeCard.nom} (PV: ${this.player1.activeCard.pointsDeVie}, ATK: ${this.player1.activeCard.forceAttaque})`
      );
    }

    console.log(`${this.player2.name}: Score ${this.player2.score}`);
    if (this.player2.activeCard) {
      console.log(
        `Carte active: ${this.player2.activeCard.nom} (PV: ${this.player2.activeCard.pointsDeVie}, ATK: ${this.player2.activeCard.forceAttaque})`
      );
    }

    console.log(
      `Cartes restantes: ${this.player1.name}: ${this.player1.cards.length}, ${this.player2.name}: ${this.player2.cards.length}`
    );
  }

  endGame() {
    console.log("\n=== FIN DU JEU ===");
    if (this.winner) {
      console.log(
        `${this.winner.name} a gagné avec un score de ${this.winner.score} !`
      );
    } else {
      console.log("Match nul !");
    }

    console.log(
      `Score final: ${this.player1.name} ${this.player1.score} - ${this.player2.score} ${this.player2.name}`
    );
  }
}

module.exports = Duel;
