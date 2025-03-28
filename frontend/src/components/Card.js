/**
 * Classe représentant une carte de jeu
 */
export class Card {
  /**
   * Crée une instance de carte
   * @param {object} data - Données de la carte
   * @param {string} type - Type de carte (personnage ou bonus)
   */
  constructor(data, type) {
    this.data = data;
    this.type = type;
    this.selected = false;
    this.disabled = false;
    this.element = null;
  }

  /**
   * Génère l'élément DOM pour la carte
   * @param {Function} onClick - Fonction à appeler lors du clic
   * @param {object} stats - Statistiques de la carte (santé, attaque, tours)
   * @param {Array} activeBonus - Bonus actifs sur la carte
   * @returns {HTMLElement} - Élément DOM de la carte
   */
  render(onClick, stats, activeBonus = []) {
    // Créer le conteneur principal
    const container = document.createElement("div");
    container.className = "card-container";

    // Créer l'élément de carte
    const cardElement = document.createElement("div");
    cardElement.className = "card";
    cardElement.dataset.id = this.data.id;
    cardElement.dataset.type = this.type;

    // Créer l'image de la carte
    const image = document.createElement("img");
    image.src = this.data.fond;
    image.alt =
      this.type === "personnage"
        ? this.data.nompersonnage
        : this.data.nomcartebonus;
    cardElement.appendChild(image);

    // Si c'est une carte personnage avec des stats, afficher les stats
    if (this.type === "personnage" && stats) {
      // Créer un overlay pour les stats
      const statsOverlay = document.createElement("div");
      statsOverlay.className = "card-stats-overlay";

      // Titre (nom du personnage)
      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = this.data.nompersonnage;
      statsOverlay.appendChild(title);

      // Barre de PV
      const healthBar = document.createElement("div");
      healthBar.className = "health-bar";

      const healthBarInner = document.createElement("div");
      healthBarInner.className = "health-bar-inner";
      const healthPercent = Math.max(
        0,
        Math.min(100, (stats.health / parseInt(this.data.pv)) * 100)
      );
      healthBarInner.style.width = `${healthPercent}%`;

      const healthText = document.createElement("span");
      healthText.className = "health-text";
      healthText.textContent = `PV: ${stats.health}/${this.data.pv}`;

      healthBar.appendChild(healthBarInner);
      healthBar.appendChild(healthText);
      statsOverlay.appendChild(healthBar);

      // Statistiques principales
      const statsContainer = document.createElement("div");
      statsContainer.className = "card-stats-container";

      // Attaque
      const attackStat = document.createElement("div");
      attackStat.className = "stat attack";
      attackStat.innerHTML = `<span>Attaque: ${stats.attack}</span>`;
      statsContainer.appendChild(attackStat);

      // Tours
      const turnsStat = document.createElement("div");
      turnsStat.className = "stat turns";
      turnsStat.innerHTML = `<span>Tours: ${stats.turns}</span>`;
      statsContainer.appendChild(turnsStat);

      statsOverlay.appendChild(statsContainer);

      // Bonus actifs
      if (activeBonus && activeBonus.length > 0) {
        const bonusContainer = document.createElement("div");
        bonusContainer.className = "active-bonus";

        const bonusTitle = document.createElement("div");
        bonusTitle.className = "bonus-title";
        bonusTitle.textContent = "Bonus actifs:";
        bonusContainer.appendChild(bonusTitle);

        activeBonus.forEach((bonus) => {
          const bonusItem = document.createElement("div");
          bonusItem.className = "bonus-item";
          bonusItem.textContent = `${bonus.nom} (+${bonus.pourcentage}%, ${bonus.tours} tours)`;
          bonusContainer.appendChild(bonusItem);
        });

        statsOverlay.appendChild(bonusContainer);
      }

      cardElement.appendChild(statsOverlay);
    }

    // Si c'est une carte bonus, afficher sa description
    if (this.type === "bonus") {
      const bonusOverlay = document.createElement("div");
      bonusOverlay.className = "bonus-overlay";

      const bonusTitle = document.createElement("div");
      bonusTitle.className = "bonus-title";
      bonusTitle.textContent = this.data.nomcartebonus;
      bonusOverlay.appendChild(bonusTitle);

      const bonusEffect = document.createElement("div");
      bonusEffect.className = "bonus-effect";
      bonusEffect.textContent = `+${this.data.pourcentagebonus}% pendant ${this.data.tourbonus} tours`;
      bonusOverlay.appendChild(bonusEffect);

      cardElement.appendChild(bonusOverlay);
    }

    // Ajouter l'événement de clic
    if (onClick) {
      cardElement.addEventListener("click", () => {
        if (!this.disabled) {
          onClick(this);
        }
      });
    }

    // Définir les états visuels
    if (this.selected) {
      cardElement.classList.add("selected-card");
    }

    if (this.disabled) {
      cardElement.classList.add("disabled-card");
    }

    // Stocker la référence à l'élément
    this.element = cardElement;
    container.appendChild(cardElement);

    return container;
  }

  /**
   * Définit l'état de sélection de la carte
   * @param {boolean} selected - État de sélection
   */
  setSelected(selected) {
    this.selected = selected;

    if (this.element) {
      if (selected) {
        this.element.classList.add("selected-card");
      } else {
        this.element.classList.remove("selected-card");
      }
    }
  }

  /**
   * Définit l'état de désactivation de la carte
   * @param {boolean} disabled - État de désactivation
   */
  setDisabled(disabled) {
    this.disabled = disabled;

    if (this.element) {
      if (disabled) {
        this.element.classList.add("disabled-card");
      } else {
        this.element.classList.remove("disabled-card");
      }
    }
  }
}
