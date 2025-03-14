const fs = require("fs");
const path = require("path");

class CardManager {
  constructor() {
    this.persoCards = new Map();
    this.bonusCards = new Map();
    this.loadCards();
  }

  loadCards() {
    try {
      // Charger les cartes depuis les fichiers JSON
      const persoPath = path.join(__dirname, "../../stock/personnages.json");
      const bonusPath = path.join(__dirname, "../../stock/bonus.json");

      const persoData = JSON.parse(fs.readFileSync(persoPath, "utf8"));
      const bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf8"));

      // Stocker les cartes dans les Maps
      persoData.forEach((card) => this.persoCards.set(card.id, card));
      bonusData.forEach((card) => this.bonusCards.set(card.id, card));

      console.log(
        `Cartes chargées: ${this.persoCards.size} perso, ${this.bonusCards.size} bonus`
      );
    } catch (error) {
      console.error("Erreur lors du chargement des cartes:", error);
    }
  }

  async getRandomCards(type, count, excludeIds = []) {
    const cards = type === "perso" ? this.persoCards : this.bonusCards;
    const availableCards = [...cards.values()].filter(
      (card) => !excludeIds.includes(card.id)
    );

    if (availableCards.length < count) {
      throw new Error(`Pas assez de cartes ${type} disponibles`);
    }

    // Mélanger et sélectionner les cartes
    const selectedCards = availableCards
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    // Ajouter les SVG et les stats initiales
    return Promise.all(
      selectedCards.map(async (card) => ({
        ...card,
        type,
        svgContent: await this.loadCardSVG(type, card.id),
        currentStats: {
          pointsdevie: parseInt(card.pointsdevie || 0),
          forceattaque: parseInt(card.forceattaque || 0),
          tourattaque: parseInt(card.tourattaque || 0),
          bonusActifs: [],
        },
      }))
    );
  }

  async loadCardSVG(type, id) {
    try {
      const svgPath = path.join(
        __dirname,
        "..",
        "..",
        "stock",
        `svg_${type}`,
        `${id}.svg`
      );
      console.log("Chargement SVG:", svgPath);

      const svgContent = await fs.promises.readFile(svgPath, "utf8");
      console.log(`SVG chargé pour ${type}/${id}`);
      return svgContent;
    } catch (error) {
      console.error(`Erreur chargement SVG pour ${type}/${id}:`, error);
      return `<svg viewBox="0 0 100 100"><text x="50" y="50" text-anchor="middle">Erreur SVG</text></svg>`;
    }
  }
}

module.exports = new CardManager();
