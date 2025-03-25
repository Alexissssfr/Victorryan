const fs = require("fs");
const path = require("path");
const { supabase, getCardImageUrl } = require("../config/supabase");

class Card {
  constructor(data, type) {
    this.id = data.id;
    this.type = type;
    this.imageUrl = getCardImageUrl(type, data.id);

    if (type === "perso") {
      // Stats de base pour les cartes personnage
      this.baseStats = {
        pointsdevie: parseInt(data.pointsdevie) || 100,
        forceattaque: parseInt(data.forceattaque) || 10,
        tourattaque: parseInt(data.tourattaque) || 3,
      };
      // Stats courantes (modifiables pendant le jeu)
      this.currentStats = { ...this.baseStats };
      this.activeBuffs = []; // Liste des bonus actifs
    } else {
      // Stats pour les cartes bonus
      this.bonusStats = {
        pourcentagebonus: parseInt(data.pourcentagebonus) || 20,
        tourbonus: parseInt(data.tourbonus) || 2,
      };
    }

    // Données d'affichage
    this.nomcarte = type === "perso" ? data.nomcarteperso : data.nomcartebonus;
    this.description = data.description;
    this.nomdupouvoir = data.nomdupouvoir;
  }

  // Pour les cartes personnage
  applyBonus(bonusCard) {
    if (this.type !== "perso") return false;

    const buff = {
      id: bonusCard.id,
      pourcentagebonus: bonusCard.bonusStats.pourcentagebonus,
      toursRestants: bonusCard.bonusStats.tourbonus,
    };

    // Appliquer le bonus à la force d'attaque
    const bonusAmount = Math.floor(
      this.baseStats.forceattaque * (buff.pourcentagebonus / 100)
    );
    this.currentStats.forceattaque += bonusAmount;

    // Enregistrer le buff
    this.activeBuffs.push({
      ...buff,
      bonusAmount: bonusAmount,
    });

    return true;
  }

  // Réduire la durée des bonus actifs
  updateBuffs() {
    this.activeBuffs = this.activeBuffs
      .map((buff) => ({
        ...buff,
        toursRestants: buff.toursRestants - 1,
      }))
      .filter((buff) => {
        if (buff.toursRestants <= 0) {
          // Retirer le bonus quand il expire
          this.currentStats.forceattaque -= buff.bonusAmount;
          return false;
        }
        return true;
      });
  }

  // Pour les cartes personnage
  receiveDamage(amount) {
    if (this.type !== "perso") return false;

    this.currentStats.pointsdevie = Math.max(
      0,
      this.currentStats.pointsdevie - amount
    );
    return this.currentStats.pointsdevie === 0;
  }

  // Vérifier si la carte peut attaquer
  canAttack() {
    return this.type === "perso" && this.currentStats.tourattaque > 0;
  }

  // Utiliser un tour d'attaque
  useAttackTurn() {
    if (this.canAttack()) {
      this.currentStats.tourattaque--;
      return true;
    }
    return false;
  }
}

class CardManager {
  constructor() {
    this.persoCards = new Map();
    this.bonusCards = new Map();
    this.loadCards();
  }

  async loadCards() {
    try {
      // Charger les cartes depuis les fichiers JSON
      const persoPath = path.join(__dirname, "../../stock/personnages.json");
      const bonusPath = path.join(__dirname, "../../stock/bonus.json");

      const persoData = JSON.parse(fs.readFileSync(persoPath, "utf8"));
      const bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf8"));

      // Créer les objets Card
      persoData.forEach((data) => {
        this.persoCards.set(data.id, new Card(data, "perso"));
      });

      bonusData.forEach((data) => {
        this.bonusCards.set(data.id, new Card(data, "bonus"));
      });

      console.log(
        `Cartes chargées: ${this.persoCards.size} perso, ${this.bonusCards.size} bonus`
      );
    } catch (error) {
      console.error("Erreur lors du chargement des cartes:", error);
    }
  }

  getRandomCards(type, count, excludeIds = []) {
    const cards = type === "perso" ? this.persoCards : this.bonusCards;
    const availableCards = [...cards.values()].filter(
      (card) => !excludeIds.includes(card.id)
    );

    if (availableCards.length < count) {
      throw new Error(`Pas assez de cartes ${type} disponibles`);
    }

    // Mélanger et sélectionner les cartes
    return availableCards
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((card) => ({
        ...card,
        currentStats:
          type === "perso" ? { ...card.baseStats } : card.bonusStats,
      }));
  }

  getCard(type, id) {
    const cards = type === "perso" ? this.persoCards : this.bonusCards;
    return cards.get(parseInt(id));
  }
}

module.exports = new CardManager();
