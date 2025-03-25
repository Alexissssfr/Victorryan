const fs = require("fs");
const path = require("path");
const { supabase, getCardImageUrl } = require("../config/supabase");

class Card {
  constructor(data, type) {
    this.id = data.id;
    this.type = type;
    this.imageUrl = getCardImageUrl(type, data.id);

    if (type === "perso") {
      this.name = data.nomperso;
      this.baseStats = {
        health: data.pv,
        attack: data.force,
        attackTurns: data.tourattaque,
      };
      this.currentStats = { ...this.baseStats };
      this.activeBonuses = [];
    } else if (type === "bonus") {
      this.name = data.nomcartebonus;
      this.bonusPercentage = data.pourcentagebonus;
      this.bonusTurns = data.tourbonus;
    }

    // Données d'affichage
    this.nomcarte = type === "perso" ? data.nomcarteperso : data.nomcartebonus;
    this.description = data.description;
    this.nomdupouvoir = data.nomdupouvoir;
  }

  applyBonus(bonusCard) {
    if (this.type !== "perso" || bonusCard.type !== "bonus") {
      throw new Error("Invalid card types for bonus application");
    }

    this.activeBonuses.push({
      percentage: bonusCard.bonusPercentage,
      turns: bonusCard.bonusTurns,
    });

    this.updateStats();
  }

  updateStats() {
    if (this.type !== "perso") return;

    let totalBonus = 0;
    this.activeBonuses = this.activeBonuses.filter((bonus) => {
      bonus.turns--;
      if (bonus.turns > 0) {
        totalBonus += bonus.percentage;
      }
      return bonus.turns > 0;
    });

    this.currentStats.attack = Math.floor(
      this.baseStats.attack * (1 + totalBonus / 100)
    );
  }

  receiveDamage(amount) {
    if (this.type !== "perso") {
      throw new Error("Only personnage cards can receive damage");
    }

    this.currentStats.health = Math.max(0, this.currentStats.health - amount);
    return this.currentStats.health === 0;
  }

  canAttack() {
    if (this.type !== "perso") return false;
    return this.currentStats.attackTurns > 0;
  }

  useAttack() {
    if (!this.canAttack()) {
      throw new Error("Card cannot attack");
    }
    this.currentStats.attackTurns--;
  }
}

class CardManager {
  constructor() {
    this.personnages = new Map();
    this.bonus = new Map();
    this.loadCards();
  }

  loadCards() {
    try {
      const personnagesData = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../../stock/personnages.json"),
          "utf8"
        )
      );
      const bonusData = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../../stock/bonus.json"), "utf8")
      );

      personnagesData.forEach((data) => {
        this.personnages.set(data.id, new Card(data, "perso"));
      });

      bonusData.forEach((data) => {
        this.bonus.set(data.id, new Card(data, "bonus"));
      });

      console.log(
        `Cartes chargées: ${this.personnages.size} perso, ${this.bonus.size} bonus`
      );
    } catch (error) {
      console.error("Erreur lors du chargement des cartes:", error);
    }
  }

  getRandomCards(type, count) {
    const cards = type === "perso" ? this.personnages : this.bonus;
    const cardArray = Array.from(cards.values());
    const result = [];

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * cardArray.length);
      result.push(cardArray[randomIndex]);
    }

    return result;
  }

  getCard(type, id) {
    return type === "perso" ? this.personnages.get(id) : this.bonus.get(id);
  }
}

module.exports = new CardManager();
