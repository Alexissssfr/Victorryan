const fs = require("fs");
const path = require("path");

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
    img.alt = this.stats.nom;
    img.onerror = () => {
      img.src = "placeholder.png";
    };

    const overlay = document.createElement("div");
    overlay.className = "card-overlay";

    if (this.type === "perso") {
      overlay.innerHTML = `
                <h3>${this.stats.nom}</h3>
                <p>PV: ${this.stats.pv}</p>
                <p>Attaque: ${this.stats.attaque}</p>
                <p>Défense: ${this.stats.defense}</p>
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

class CardManager {
  constructor() {
    this.personnages = [];
    this.bonus = [];
    this.loadCards();
  }

  loadCards() {
    try {
      const personnagesPath = path.join(
        __dirname,
        "../../stock/personnages.json"
      );
      const bonusPath = path.join(__dirname, "../../stock/bonus.json");

      const personnagesData = JSON.parse(
        fs.readFileSync(personnagesPath, "utf8")
      );
      const bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf8"));

      this.personnages = personnagesData.personnages;
      this.bonus = bonusData.bonus;
    } catch (error) {
      console.error("Erreur lors du chargement des cartes:", error);
    }
  }

  getRandomPersonnage() {
    const randomIndex = Math.floor(Math.random() * this.personnages.length);
    const personnage = this.personnages[randomIndex];
    return new Card("perso", personnage.id, personnage);
  }

  getRandomBonus() {
    const randomIndex = Math.floor(Math.random() * this.bonus.length);
    const bonus = this.bonus[randomIndex];
    return new Card("bonus", bonus.id, bonus);
  }

  getPersonnageById(id) {
    const personnage = this.personnages.find((p) => p.id === id);
    return personnage ? new Card("perso", personnage.id, personnage) : null;
  }

  getBonusById(id) {
    const bonus = this.bonus.find((b) => b.id === id);
    return bonus ? new Card("bonus", bonus.id, bonus) : null;
  }
}

module.exports = { Card, CardManager };
