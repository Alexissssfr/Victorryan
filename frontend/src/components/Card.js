/**
 * Classe représentant une carte du jeu
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
    this.element = null;
  }

  /**
   * Rend la carte sous forme d'élément DOM
   * @param {Function} onClick - Fonction à appeler lors du clic sur la carte
   * @param {object} stats - Statistiques actuelles de la carte
   * @param {Array} activeBonus - Bonus actifs sur la carte
   * @returns {HTMLElement} - Élément DOM représentant la carte
   */
  render(onClick, stats = null, activeBonus = []) {
    // Créer le conteneur de la carte
    const container = document.createElement("div");
    container.className = "card-container";

    // Si la carte est sélectionnée, ajouter la classe correspondante
    if (this.selected) {
      container.classList.add("selected-card");
    }

    // Créer l'élément de la carte
    const cardElement = document.createElement("div");
    cardElement.className = "card";

    // Créer l'image de la carte
    const img = document.createElement("img");
    img.src = this.data.fond;
    img.alt =
      this.type === "personnage"
        ? this.data.nomcarteperso
        : this.data.nomcartebonus;

    // Ajouter l'image à la carte
    cardElement.appendChild(img);

    // Si des statistiques sont fournies, les afficher
    if (stats) {
      const statsElement = document.createElement("div");
      statsElement.className = "card-stats";

      if (this.type === "personnage") {
        statsElement.innerHTML = `
          <div>PV: ${stats.health || this.data.pv}</div>
          <div>Attaque: ${stats.attack || this.data.force}</div>
          <div>Tours: ${stats.turns || this.data.tours}</div>
        `;
      } else {
        statsElement.innerHTML = `
          <div>Bonus: ${this.data.pourcentagebonus}%</div>
          <div>Tours: ${this.data.tourbonus}</div>
          <div>${this.data.nomdupouvoir}</div>
        `;
      }

      cardElement.appendChild(statsElement);
    }

    // Ajouter les bonus actifs si fournis
    if (activeBonus.length > 0 && this.type === "personnage") {
      const bonusElement = document.createElement("div");
      bonusElement.className = "card-bonus";
      bonusElement.innerHTML = "<div>Bonus actifs:</div>";

      activeBonus.forEach((bonus) => {
        const bonusItem = document.createElement("div");
        bonusItem.className = "bonus-item";
        bonusItem.textContent = `${bonus.nom} (${bonus.pourcentage}%, ${bonus.tours}t)`;
        bonusElement.appendChild(bonusItem);
      });

      cardElement.appendChild(bonusElement);
    }

    // Ajouter l'élément carte au conteneur
    container.appendChild(cardElement);

    // Ajouter l'écouteur d'événement pour le clic
    if (onClick) {
      container.addEventListener("click", () => onClick(this));
    }

    // Stocker l'élément DOM pour référence future
    this.element = container;

    return container;
  }

  /**
   * Sélectionne ou désélectionne la carte
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
   * Désactive la carte (par exemple, quand elle n'a plus de tours d'attaque)
   * @param {boolean} disabled - État de désactivation
   */
  setDisabled(disabled) {
    if (this.element) {
      if (disabled) {
        this.element.classList.add("disabled-card");
      } else {
        this.element.classList.remove("disabled-card");
      }
    }
  }
}
