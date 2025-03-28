const cardService = require("../services/cardService");
const { supabase, getImageUrl } = require("../config/supabase");

/**
 * Récupère toutes les cartes d'un certain type
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function getAllCards(req, res) {
  try {
    const { type } = req.params;

    if (!type || (type !== "personnage" && type !== "bonus")) {
      return res.status(400).json({ error: "Type de carte invalide" });
    }

    const { bonus, personnages } = await cardService.loadCards();
    const cards = type === "personnage" ? personnages : bonus;

    res.status(200).json(cards);
  } catch (error) {
    console.error("Erreur récupération cartes:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des cartes" });
  }
}

/**
 * Récupère une carte par son ID
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function getCardById(req, res) {
  try {
    const { type, id } = req.params;

    if (!type || !id || (type !== "personnage" && type !== "bonus")) {
      return res.status(400).json({ error: "Type ou ID de carte invalide" });
    }

    const card = await cardService.getCardById(type, id);

    if (!card) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    res.status(200).json(card);
  } catch (error) {
    console.error("Erreur récupération carte:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de la carte" });
  }
}

/**
 * Récupère l'URL d'une image de carte
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
function getCardImageUrl(req, res) {
  try {
    const { type, id } = req.params;

    if (!type || !id || (type !== "perso" && type !== "bonus")) {
      return res.status(400).json({ error: "Type ou ID d'image invalide" });
    }

    const imageUrl = getImageUrl(type, id);

    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Erreur récupération URL image:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'URL de l'image" });
  }
}

module.exports = {
  getAllCards,
  getCardById,
  getCardImageUrl,
};
