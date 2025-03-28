const fs = require("fs").promises;
const path = require("path");

/**
 * Charge les données d'un JSON
 * @param {string} type - Type de cartes (personnages ou bonus)
 * @returns {Promise<Array>} - Promesse contenant les données
 */
async function loadCardData(type) {
  try {
    const filePath = path.join(__dirname, `../../stock/${type}.json`);
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Erreur lors du chargement des données ${type}:`, error);
    throw new Error(`Impossible de charger les données ${type}`);
  }
}

/**
 * Sélectionne aléatoirement n éléments d'un tableau
 * @param {Array} array - Tableau d'origine
 * @param {number} n - Nombre d'éléments à sélectionner
 * @returns {Array} - Tableau des éléments sélectionnés
 */
function getRandomElements(array, n) {
  // Copier le tableau pour ne pas modifier l'original
  const copy = [...array];
  const result = [];

  // S'assurer que n n'est pas plus grand que la taille du tableau
  n = Math.min(n, copy.length);

  // Sélectionner n éléments aléatoirement
  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * copy.length);
    result.push(copy[randomIndex]);
    copy.splice(randomIndex, 1);
  }

  return result;
}

/**
 * Tire les cartes initiales pour un joueur
 * @returns {Promise<Object>} - Cartes personnages et bonus
 */
async function drawInitialCards() {
  try {
    // Charger toutes les cartes disponibles
    const [allPersonnages, allBonus] = await Promise.all([
      loadCardData("personnages"),
      loadCardData("bonus"),
    ]);

    // Sélectionner aléatoirement 5 personnages et 5 bonus (au lieu de 3 et 2)
    const personnages = getRandomElements(allPersonnages, 5);
    const bonus = getRandomElements(allBonus, 5);

    return {
      personnages,
      bonus,
    };
  } catch (error) {
    console.error("Erreur lors du tirage des cartes:", error);
    throw new Error("Impossible de tirer les cartes");
  }
}

/**
 * Récupère toutes les cartes d'un type
 * @param {string} type - Type de cartes (personnages ou bonus)
 * @returns {Promise<Array>} - Tableau des cartes
 */
async function getAllCards(type) {
  try {
    // Vérifier le type
    if (type !== "personnages" && type !== "bonus") {
      throw new Error("Type de carte invalide");
    }

    return await loadCardData(type);
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
    throw error;
  }
}

/**
 * Récupère une carte par son ID
 * @param {string} type - Type de cartes (personnages ou bonus)
 * @param {string} id - ID de la carte
 * @returns {Promise<Object>} - Données de la carte
 */
async function getCardById(type, id) {
  try {
    // Vérifier le type
    if (type !== "personnages" && type !== "bonus") {
      throw new Error("Type de carte invalide");
    }

    // Charger toutes les cartes du type
    const cards = await loadCardData(type);

    // Trouver la carte par ID
    const card = cards.find((c) => c.id === id);

    if (!card) {
      throw new Error("Carte non trouvée");
    }

    return card;
  } catch (error) {
    console.error("Erreur lors de la récupération de la carte:", error);
    throw error;
  }
}

/**
 * Obtient l'URL de l'image d'une carte
 * @param {string} type - Type de carte (personnages ou bonus)
 * @param {string} id - ID de la carte
 * @returns {Promise<string>} - URL de l'image
 */
async function getCardImageUrl(type, id) {
  try {
    // Récupérer les données de la carte
    const card = await getCardById(type, id);

    // Retourner l'URL de l'image
    return card.fond;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'URL de l'image:", error);
    throw error;
  }
}

module.exports = {
  drawInitialCards,
  getAllCards,
  getCardById,
  getCardImageUrl,
};
