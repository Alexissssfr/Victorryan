const fs = require("fs");
const path = require("path");

// Chemins vers les fichiers JSON
const BONUS_PATH = "/Users/robert/Victorryan/stock/bonus.json";
const PERSONNAGES_PATH = "/Users/robert/Victorryan/stock/personnages.json";

// Fonction pour charger les données JSON
function loadJsonData(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Erreur lors du chargement du fichier ${filePath}:`, error);
    return null;
  }
}

// Fonction pour enrichir les cartes avec des attributs de jeu
function enrichCards(cards, type) {
  return cards.map((card) => {
    const enrichedCard = { ...card, type };

    // Ajout des attributs de jeu en fonction du type de carte
    if (type === "personnage") {
      // Les personnages ont des points de vie, force d'attaque
      enrichedCard.pointsDeVie = calculateHealthPoints(card);
      enrichedCard.forceAttaque = calculateAttackForce(card);
      enrichedCard.nombreTours = 3; // Valeur par défaut
    } else if (type === "bonus") {
      // Les bonus ont un pourcentage d'effet
      enrichedCard.pourcentageBonus = calculateBonusPercentage(card);
      enrichedCard.duree = 2; // Durée d'effet en tours
    }

    return enrichedCard;
  });
}

// Fonctions pour calculer les attributs en fonction des données existantes
function calculateHealthPoints(card) {
  // Utilisation de données existantes pour générer des points de vie cohérents
  // Par exemple, basé sur la description ou d'autres attributs
  // Ici nous utilisons simplement une valeur aléatoire entre 80 et 120
  return Math.floor(Math.random() * 40) + 80;
}

function calculateAttackForce(card) {
  // Génération de la force d'attaque entre 10 et 30
  return Math.floor(Math.random() * 20) + 10;
}

function calculateBonusPercentage(card) {
  // Génération du pourcentage de bonus entre 10% et 50%
  return Math.floor(Math.random() * 40) + 10;
}

// Fonction pour tirer au sort 20 cartes parmi toutes les cartes disponibles
function drawRandomCards(allCards, count = 20) {
  const shuffled = [...allCards].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Fonction principale pour charger et préparer les cartes
function prepareCards() {
  const bonusData = loadJsonData(BONUS_PATH);
  const personnagesData = loadJsonData(PERSONNAGES_PATH);

  if (!bonusData || !personnagesData) {
    return null;
  }

  const enrichedBonus = enrichCards(bonusData, "bonus");
  const enrichedPersonnages = enrichCards(personnagesData, "personnage");

  // Combine toutes les cartes
  const allCards = [...enrichedBonus, ...enrichedPersonnages];

  return {
    allCards,
    drawRandomCards: (count) => drawRandomCards(allCards, count),
  };
}

module.exports = {
  prepareCards,
};
