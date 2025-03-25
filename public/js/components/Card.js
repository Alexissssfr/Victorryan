class Card {
  constructor(container, cardData, options = {}) {
    this.container = container;
    this.cardData = cardData;
    this.options = {
      isPlayable: options.isPlayable || false,
      onSelect: options.onSelect || (() => {}),
      size: options.size || "normal", // 'normal' ou 'small'
    };

    this.element = this.createCardElement();
    this.render();

    // Ajouter les événements
    if (this.options.isPlayable) {
      this.element.addEventListener("click", () => {
        this.options.onSelect(this.cardData);
      });
    }
  }

  createCardElement() {
    const card = document.createElement("div");
    card.className = `card ${this.cardData.type}-card`;
    if (this.options.size === "small") {
      card.classList.add("card-small");
    }

    // Image de fond
    const img = document.createElement("img");
    img.src = this.cardData.fond;
    img.className = "card-background";
    img.alt =
      this.cardData.type === "perso"
        ? this.cardData.nomcarteperso
        : this.cardData.nomcartebonus;

    // Conteneur pour l'overlay
    const overlay = document.createElement("div");
    overlay.className = "card-overlay";

    card.appendChild(img);
    card.appendChild(overlay);
    this.container.appendChild(card);

    this.overlayElement = overlay;
    return card;
  }

  render() {
    if (this.cardData.type === "perso") {
      this.renderPersonnageCard();
    } else {
      this.renderBonusCard();
    }
  }

  renderPersonnageCard() {
    const currentHealth =
      this.cardData.currentPointsdevie || this.cardData.pointsdevie;
    const maxHealth = this.cardData.pointsdevie;
    const healthPercentage = (currentHealth / maxHealth) * 100;

    this.overlayElement.innerHTML = `
      <div class="card-header">
        <div class="card-name">${this.cardData.nomcarteperso}</div>
      </div>
      <div class="card-power">${this.cardData.nomdupouvoir}</div>
      <div class="card-stats">
        <div class="stat health">
          <div class="health-bar">
            <div class="health-bar-fill" style="width: ${healthPercentage}%"></div>
          </div>
          <span>♥ ${currentHealth}/${maxHealth}</span>
        </div>
        <div class="stat attack">⚔ ${this.cardData.forceattaque}</div>
        <div class="stat turns">⏱ ${this.cardData.tourattaque}</div>
      </div>
      ${this.renderActiveBonus()}
    `;
  }

  renderBonusCard() {
    this.overlayElement.innerHTML = `
      <div class="card-header">
        <div class="card-name">${this.cardData.nomcartebonus}</div>
      </div>
      <div class="card-power">${this.cardData.nomdupouvoir}</div>
      <div class="card-stats">
        <div class="stat bonus">+${this.cardData.pourcentagebonus}%</div>
        <div class="stat duration">⏱ ${this.cardData.tourbonus}</div>
      </div>
      <div class="card-description">${this.cardData.description}</div>
    `;
  }

  renderActiveBonus() {
    if (!this.cardData.activeBonus || this.cardData.activeBonus.length === 0) {
      return "";
    }

    return `
      <div class="active-bonus">
        ${this.cardData.activeBonus
          .map(
            (bonus) => `
          <div class="bonus-indicator">
            +${bonus.pourcentagebonus}% (${bonus.toursRestants})
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  update(newData) {
    this.cardData = { ...this.cardData, ...newData };
    this.render();
  }

  setState(state) {
    // Retirer les états précédents
    this.element.classList.remove(
      "selected",
      "disabled",
      "attackable",
      "attacked"
    );

    if (state) {
      this.element.classList.add(state);

      // Ajouter une animation pour l'état attacked
      if (state === "attacked") {
        this.element.addEventListener(
          "animationend",
          () => {
            this.element.classList.remove("attacked");
          },
          { once: true }
        );
      }
    }
  }

  destroy() {
    this.element.remove();
  }
}

export default Card;
