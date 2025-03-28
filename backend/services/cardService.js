const fs = require("fs").promises;
const path = require("path");

/**
 * Charge les cartes depuis les fichiers JSON
 * @returns {object} - Cartes personnages et bonus
 */
async function loadCards() {
  try {
    const bonusPath = path.join(__dirname, "../../stock/bonus.json");
    const personnagesPath = path.join(
      __dirname,
      "../../stock/personnages.json"
    );

    const bonusData = await fs.readFile(bonusPath, "utf8");
    const personnagesData = await fs.readFile(personnagesPath, "utf8");

    const bonus = JSON.parse(bonusData);
    const personnages = JSON.parse(personnagesData);

    return { bonus, personnages };
  } catch (error) {
    console.error("Erreur lors du chargement des cartes:", error);
    throw new Error("Impossible de charger les cartes");
  }
}

/**
 * Tire aléatoirement un ensemble de cartes
 * @param {Array} cardsArray - Tableau de cartes
 * @param {number} count - Nombre de cartes à tirer
 * @returns {Array} - Cartes tirées
 */
function drawRandomCards(cardsArray, count) {
  const shuffled = [...cardsArray].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Tire les cartes initiales pour un joueur
 * @returns {object} - Cartes personnages et bonus tirées
 */
async function drawInitialCards() {
  const { bonus, personnages } = await loadCards();

  const drawnPersonnages = drawRandomCards(personnages, 5);
  const drawnBonus = drawRandomCards(bonus, 5);

  return {
    personnages: drawnPersonnages,
    bonus: drawnBonus,
  };
}

/**
 * Récupère une carte par son ID
 * @param {string} type - Type de carte (personnage ou bonus)
 * @param {string} id - ID de la carte
 * @returns {object} - Données de la carte
 */
async function getCardById(type, id) {
  const { bonus, personnages } = await loadCards();

  const cardsArray = type === "personnage" ? personnages : bonus;
  return cardsArray.find((card) => card.id === id);
}

module.exports = {
  loadCards,
  drawRandomCards,
  drawInitialCards,
  getCardById,
};
