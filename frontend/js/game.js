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
    this.selectedCard = null;
    this.selectedTarget = null;

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

    // Si le tour change, réinitialiser les cartes attaquables
    if (this.isMyTurn !== state.isYourTurn) {
      this.resetAttackableCards();
    }

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

  renderCards(cards, container, type, isPlayer, isAttackable = false) {
    if (!cards || !Array.isArray(cards) || !container) {
      console.error("Paramètres invalides:", { cards, container, type });
      return;
    }

    cards.forEach((card) => {
      const cardElement = document.createElement("div");
      cardElement.className = `card ${type}-card`;
      cardElement.dataset.id = card.id;
      cardElement.dataset.type = type;

      // Ajouter la classe "playable" si c'est le tour du joueur et que la carte est jouable
      if (isPlayer && this.gameState.isYourTurn && !card.hasAttacked) {
        cardElement.classList.add("playable");
      }

      // Ajouter la classe "attackable" si c'est une carte adverse qui peut être attaquée
      if (isAttackable && this.gameState.isYourTurn) {
        cardElement.classList.add("attackable");
      }

      // Créer le contenu de la carte
      const cardContent = document.createElement("div");
      cardContent.className = "card-content";

      // Charger le SVG de la carte
      fetch(`/stock/svg_${type}/${card.id}.svg`)
        .then((response) => response.text())
        .then((svgContent) => {
          cardContent.innerHTML = svgContent;
        })
        .catch((error) => {
          console.error(`Erreur chargement SVG pour ${card.id}:`, error);
          cardContent.innerHTML = `<div class="card-placeholder">${
            type === "perso" ? "P" : "B"
          }</div>`;
        });

      cardElement.appendChild(cardContent);

      // Ajouter les gestionnaires d'événements
      if (isPlayer && this.gameState.isYourTurn) {
        cardElement.addEventListener("click", () => {
          console.log("Carte joueur cliquée:", card.id);
          this.handleCardClick(card, cardElement);
        });
      } else if (isAttackable && this.gameState.isYourTurn) {
        cardElement.addEventListener("click", () => {
          console.log("Carte adverse cliquée:", card.id);
          this.handleTargetClick(card, cardElement);
        });
      }

      container.appendChild(cardElement);
    });
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

      // Vider les conteneurs existants
      const playerPersoContainer = this.container.querySelector(
        ".player-area .perso-cards"
      );
      const playerBonusContainer = this.container.querySelector(
        ".player-area .bonus-cards"
      );
      const opponentPersoContainer = this.container.querySelector(
        ".opponent-area .perso-cards"
      );
      const opponentBonusContainer = this.container.querySelector(
        ".opponent-area .bonus-cards"
      );

      // S'assurer que les conteneurs existent
      if (
        !playerPersoContainer ||
        !playerBonusContainer ||
        !opponentPersoContainer ||
        !opponentBonusContainer
      ) {
        // Créer la structure si elle n'existe pas
        this.container.innerHTML = `
          <div class="opponent-area">
            <div class="bonus-cards"></div>
            <div class="perso-cards"></div>
          </div>
          <div class="player-area">
            <div class="perso-cards"></div>
            <div class="bonus-cards"></div>
          </div>
        `;
      }

      // Récupérer les conteneurs à nouveau (au cas où ils viennent d'être créés)
      const playerPerso = this.container.querySelector(
        ".player-area .perso-cards"
      );
      const playerBonus = this.container.querySelector(
        ".player-area .bonus-cards"
      );
      const opponentPerso = this.container.querySelector(
        ".opponent-area .perso-cards"
      );
      const opponentBonus = this.container.querySelector(
        ".opponent-area .bonus-cards"
      );

      // Vider les conteneurs
      playerPerso.innerHTML = "";
      playerBonus.innerHTML = "";
      opponentPerso.innerHTML = "";
      opponentBonus.innerHTML = "";

      // Rendre les cartes dans chaque conteneur
      this.renderCards(playerCards.perso, playerPerso, "perso", true);
      this.renderCards(playerCards.bonus, playerBonus, "bonus", true);
      this.renderCards(
        opponentCards.perso,
        opponentPerso,
        "perso",
        false,
        true
      ); // Marquer comme attaquable
      this.renderCards(opponentCards.bonus, opponentBonus, "bonus", false);

      this.fixCardImages();
      this.fixAttackableCards();
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

  handleCardClick(card, element) {
    console.log("handleCardClick appelé avec:", card, element);

    if (!this.gameState.isYourTurn) {
      console.log("Ce n'est pas votre tour");
      return;
    }

    // Si une carte était déjà sélectionnée, la désélectionner
    if (this.selectedCard) {
      const prevElement = document.querySelector(
        `.card[data-id="${this.selectedCard.id}"]`
      );
      if (prevElement) prevElement.classList.remove("selected");
    }

    // Sélectionner la nouvelle carte
    this.selectedCard = card;
    element.classList.add("selected");

    // Si c'est une carte personnage, activer les cibles potentielles
    if (card.type === "perso" || element.dataset.type === "perso") {
      this.activateTargets();
    }

    this.showNotification(`Carte ${card.id} sélectionnée`, "info");
  }

  handleTargetClick(card, element) {
    if (!this.selectedCard) return;

    // Si la carte sélectionnée est une carte personnage, attaquer
    if (this.selectedCard.type === "perso") {
      this.attackCard(this.selectedCard.id, card.id);
    }

    // Réinitialiser la sélection
    this.resetSelection();
  }

  attackCard(attackerId, targetId) {
    if (!window.gameSocket) {
      this.showNotification("Erreur: connexion au serveur perdue", "error");
      return;
    }

    try {
      console.log(`Attaque de ${attackerId} vers ${targetId}`);

      // Appeler la fonction d'attaque du socket
      window.gameSocket.attackCard(
        attackerId,
        targetId,
        window.gameId,
        window.playerId
      );

      // Ajouter des animations temporaires en attendant la réponse du serveur
      const attackerElement = document.querySelector(
        `.card[data-id="${attackerId}"]`
      );
      const targetElement = document.querySelector(
        `.card[data-id="${targetId}"]`
      );

      if (attackerElement) attackerElement.classList.add("attacking");
      if (targetElement) targetElement.classList.add("receiving-damage");

      setTimeout(() => {
        if (attackerElement) attackerElement.classList.remove("attacking");
        if (targetElement) targetElement.classList.remove("receiving-damage");
      }, 1000);

      // Réinitialiser la sélection
      this.resetSelection();
    } catch (error) {
      console.error("Erreur lors de l'attaque:", error);
      this.showNotification(
        "Erreur lors de l'attaque: " + error.message,
        "error"
      );
    }
  }

  resetSelection() {
    this.selectedCard = null;
    this.selectedTarget = null;

    // Désélectionner toutes les cartes
    document.querySelectorAll(".card.selected").forEach((card) => {
      card.classList.remove("selected");
    });

    // Désactiver toutes les cibles
    document.querySelectorAll(".card.attackable").forEach((card) => {
      card.classList.remove("attackable");
    });
  }

  activateTargets() {
    console.log("Activation des cibles potentielles");

    // Sélectionner toutes les cartes personnage de l'adversaire
    const opponentCards = document.querySelectorAll(
      ".opponent-area .perso-card"
    );
    console.log("Cartes adverses trouvées:", opponentCards.length);

    opponentCards.forEach((card) => {
      card.classList.add("attackable");
      console.log("Carte rendue attaquable:", card.dataset.id);
    });
  }

  debug() {
    console.log("=== DÉBOGAGE ===");
    console.log("État du jeu:", this.gameState);
    console.log("Carte sélectionnée:", this.selectedCard);
    console.log("Est mon tour:", this.gameState.isYourTurn);

    const playerCards = document.querySelectorAll(".player-area .card");
    console.log("Cartes joueur:", playerCards.length);

    const opponentCards = document.querySelectorAll(".opponent-area .card");
    console.log("Cartes adverses:", opponentCards.length);

    const attackableCards = document.querySelectorAll(".card.attackable");
    console.log("Cartes attaquables:", attackableCards.length);

    // Ajouter un bouton de test pour rendre toutes les cartes adverses attaquables
    const testButton = document.createElement("button");
    testButton.textContent = "Rendre attaquables";
    testButton.style.position = "fixed";
    testButton.style.top = "10px";
    testButton.style.right = "10px";
    testButton.style.zIndex = "1000";

    testButton.addEventListener("click", () => {
      document.querySelectorAll(".opponent-area .card").forEach((card) => {
        card.classList.add("attackable");
        card.style.boxShadow = "0 0 10px red";
        card.addEventListener("click", () => {
          alert("Carte adverse cliquée: " + card.dataset.id);
        });
      });
    });

    document.body.appendChild(testButton);
  }

  fixAttackableCards() {
    console.log("Correction des cartes attaquables");

    // Sélectionner toutes les cartes personnage de l'adversaire
    const opponentCards = document.querySelectorAll(
      ".opponent-area .perso-card"
    );
    console.log(`Trouvé ${opponentCards.length} cartes adverses`);

    if (opponentCards.length === 0) {
      // Essayer avec un sélecteur plus général
      const allOpponentCards = document.querySelectorAll(
        ".opponent-area .card"
      );
      console.log(
        `Trouvé ${allOpponentCards.length} cartes adverses (général)`
      );

      allOpponentCards.forEach((card) => {
        if (card.classList.contains("bonus-card")) return;

        card.classList.add("attackable");
        card.style.boxShadow = "0 0 10px red";

        // Ajouter un gestionnaire d'événement pour le clic
        card.addEventListener("click", () => {
          console.log("Carte adverse cliquée:", card.dataset.id);

          // Si une carte du joueur est sélectionnée, attaquer
          const selectedCard = document.querySelector(
            ".player-area .card.selected"
          );
          if (selectedCard) {
            console.log(
              "Attaque de",
              selectedCard.dataset.id,
              "vers",
              card.dataset.id
            );

            // Appeler la fonction d'attaque
            window.gameSocket.attackCard(
              selectedCard.dataset.id,
              card.dataset.id,
              window.gameId,
              window.playerId
            );

            // Animation d'attaque
            selectedCard.classList.add("attacking");
            card.classList.add("receiving-damage");

            setTimeout(() => {
              selectedCard.classList.remove("attacking");
              card.classList.remove("receiving-damage");
              selectedCard.classList.remove("selected");
            }, 1000);
          }
        });
      });
    } else {
      opponentCards.forEach((card) => {
        card.classList.add("attackable");
        card.style.boxShadow = "0 0 10px red";

        // Ajouter un gestionnaire d'événement pour le clic
        card.addEventListener("click", () => {
          console.log("Carte adverse cliquée:", card.dataset.id);

          // Si une carte du joueur est sélectionnée, attaquer
          const selectedCard = document.querySelector(
            ".player-area .card.selected"
          );
          if (selectedCard) {
            console.log(
              "Attaque de",
              selectedCard.dataset.id,
              "vers",
              card.dataset.id
            );

            // Appeler la fonction d'attaque
            window.gameSocket.attackCard(
              selectedCard.dataset.id,
              card.dataset.id,
              window.gameId,
              window.playerId
            );

            // Animation d'attaque
            selectedCard.classList.add("attacking");
            card.classList.add("receiving-damage");

            setTimeout(() => {
              selectedCard.classList.remove("attacking");
              card.classList.remove("receiving-damage");
              selectedCard.classList.remove("selected");
            }, 1000);
          }
        });
      });
    }
  }

  updateCardSVG(cardId, newHP, isAttacker = false) {
    console.log(
      `Mise à jour du SVG pour la carte ${cardId}, nouveaux PV: ${newHP}`
    );

    // Trouver l'élément de carte
    const cardElement = document.querySelector(`.card[data-id="${cardId}"]`);
    if (!cardElement) {
      console.error(`Carte ${cardId} non trouvée dans le DOM`);
      return;
    }

    // Récupérer le contenu SVG
    const svgContainer = cardElement.querySelector(".card-content");
    if (!svgContainer) {
      console.error(`Conteneur SVG non trouvé pour la carte ${cardId}`);
      return;
    }

    // Supprimer l'ancien indicateur s'il existe
    const oldIndicator = cardElement.querySelector(".hp-indicator");
    if (oldIndicator) {
      oldIndicator.remove();
    }

    // Essayer de mettre à jour le SVG si possible
    const svgElement = svgContainer.querySelector("svg");
    if (svgElement) {
      try {
        // Trouver et mettre à jour le texte des points de vie dans le SVG
        const textElements = svgElement.querySelectorAll("text");
        let updated = false;

        for (const text of textElements) {
          // Chercher tous les textes qui pourraient contenir des points de vie
          const content = text.textContent;
          if (
            content.includes("HP:") ||
            content.includes("PV:") ||
            content.includes("pointsdevie") ||
            content.match(/\d+\s*\/\s*\d+/) || // Format "XX / XX"
            content.match(/PV\s*:\s*\d+/) || // Format "PV: XX"
            content.match(/HP\s*:\s*\d+/)
          ) {
            // Format "HP: XX"

            // Mettre à jour le texte en préservant le format
            if (content.includes("/")) {
              // Format "XX / 100"
              text.textContent = content.replace(/\d+\s*\//, `${newHP} /`);
            } else if (
              content.match(/PV\s*:\s*\d+/) ||
              content.match(/HP\s*:\s*\d+/)
            ) {
              // Format "PV: XX" ou "HP: XX"
              text.textContent = content.replace(/\d+/, newHP);
            } else {
              // Autres formats
              text.textContent = content.replace(/\d+/, newHP);
            }

            // Changer la couleur en fonction des PV
            text.setAttribute(
              "fill",
              newHP < 50 ? "red" : newHP < 75 ? "orange" : "black"
            );
            updated = true;

            // Ajouter une animation de clignotement
            text.style.animation = "blink 0.5s 3";
          }
        }

        if (!updated) {
          // Si aucun texte n'a été trouvé, ajouter un nouveau texte
          const newText = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
          );
          newText.setAttribute("x", "50%");
          newText.setAttribute("y", "95%");
          newText.setAttribute("text-anchor", "middle");
          newText.setAttribute(
            "fill",
            newHP < 50 ? "red" : newHP < 75 ? "orange" : "black"
          );
          newText.setAttribute("font-size", "14");
          newText.setAttribute("font-weight", "bold");
          newText.textContent = `PV: ${newHP}`;
          svgElement.appendChild(newText);
        }
      } catch (error) {
        console.error(
          `Erreur lors de la mise à jour du SVG pour ${cardId}:`,
          error
        );
      }
    }

    // Ajouter un effet visuel à la carte
    if (isAttacker) {
      cardElement.classList.add("attacking");
      setTimeout(() => cardElement.classList.remove("attacking"), 1000);
    } else {
      cardElement.classList.add("receiving-damage");
      setTimeout(() => cardElement.classList.remove("receiving-damage"), 1000);

      // Ajouter un effet de dégâts
      const damageEffect = document.createElement("div");
      damageEffect.className = "damage-effect";
      damageEffect.textContent = "-" + (100 - newHP);
      damageEffect.style.position = "absolute";
      damageEffect.style.top = "50%";
      damageEffect.style.left = "50%";
      damageEffect.style.transform = "translate(-50%, -50%)";
      damageEffect.style.color = "red";
      damageEffect.style.fontSize = "24px";
      damageEffect.style.fontWeight = "bold";
      damageEffect.style.textShadow = "0 0 5px white";
      damageEffect.style.animation = "fadeUp 1s forwards";

      cardElement.appendChild(damageEffect);
      setTimeout(() => damageEffect.remove(), 1000);
    }
  }

  fixCardImages() {
    // Sélectionner toutes les cartes
    const cards = document.querySelectorAll(".card");

    cards.forEach((card) => {
      const cardId = card.dataset.id;
      const cardType = card.dataset.type;

      // Vérifier si l'image de fond existe déjà
      if (!card.style.backgroundImage) {
        // Ajouter une image de fond de secours
        const bgUrl = `/stock/images/${cardType}/${cardId}.png`;
        card.style.backgroundImage = `url('${bgUrl}')`;
        card.style.backgroundSize = "cover";
        card.style.backgroundPosition = "center";
      }

      // Vérifier si le SVG est chargé
      const svgContainer = card.querySelector(".card-content");
      if (svgContainer && !svgContainer.innerHTML.includes("<svg")) {
        // Réessayer de charger le SVG
        fetch(`/stock/svg_${cardType}/${cardId}.svg`)
          .then((response) => response.text())
          .then((svgContent) => {
            svgContainer.innerHTML = svgContent;

            // Ajouter un fond blanc au SVG pour une meilleure visibilité
            const svg = svgContainer.querySelector("svg");
            if (svg) {
              // Ajouter un rectangle blanc en arrière-plan
              const rect = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
              );
              rect.setAttribute("width", "100%");
              rect.setAttribute("height", "100%");
              rect.setAttribute("fill", "white");
              rect.setAttribute("opacity", "0.8");

              // Insérer le rectangle en premier enfant du SVG
              svg.insertBefore(rect, svg.firstChild);
            }
          })
          .catch((error) => {
            console.error(`Erreur chargement SVG pour ${cardId}:`, error);
          });
      }
    });
  }

  resetAttackableCards() {
    // Supprimer la classe attackable de toutes les cartes
    document.querySelectorAll(".card.attackable").forEach((card) => {
      card.classList.remove("attackable");
      card.style.boxShadow = "";
    });

    // Supprimer la classe selected de toutes les cartes
    document.querySelectorAll(".card.selected").forEach((card) => {
      card.classList.remove("selected");
    });
  }
}

// Exposer la classe
window.GameUI = GameUI;
