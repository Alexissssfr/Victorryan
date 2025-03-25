class Card {
  constructor(type, id, stats) {
    this.type = type; // 'perso' ou 'bonus'
    this.id = id;
    this.stats = stats;
  }

  createCardElement() {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.dataset.type = this.type;
    cardDiv.dataset.id = this.id;

    const img = document.createElement("img");
    img.src = `https://nlpzherlejtsgjynimko.supabase.co/storage/v1/object/public/images/${
      this.type
    }/data/images/${this.type}/${this.type === "perso" ? "P" : "B"}${
      this.id
    }.png`;
    img.alt = this.stats.nomcarteperso || this.stats.nom;
    img.onerror = () => {
      img.src = "placeholder.png";
    };

    const overlay = document.createElement("div");
    overlay.className = "card-overlay";

    if (this.type === "perso") {
      overlay.innerHTML = `
        <h3>${this.stats.nomcarteperso}</h3>
        <p>PV: ${this.stats.pointsdevie}</p>
        <p>Attaque: ${this.stats.forceattaque}</p>
        <p>Tour d'attaque: ${this.stats.tourattaque}</p>
        <p>Pouvoir: ${this.stats.nomdupouvoir}</p>
        <p>${this.stats.description}</p>
      `;
    } else {
      overlay.innerHTML = `
        <h3>${this.stats.nom}</h3>
        <p>Effet: ${this.stats.effet}</p>
        <p>Valeur: ${this.stats.valeur}</p>
        <p>${this.stats.description}</p>
      `;
    }

    cardDiv.appendChild(img);
    cardDiv.appendChild(overlay);
    return cardDiv;
  }
}
