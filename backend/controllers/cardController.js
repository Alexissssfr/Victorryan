const cardService = require("../services/cardService");
const { supabase, getImageUrl } = require("../config/supabase");

/**
 * Récupère toutes les cartes d'un type
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function getAllCards(req, res) {
  try {
    const { type } = req.params;

    // Valider le type
    if (type !== "personnages" && type !== "bonus") {
      return res
        .status(400)
        .json({
          error: "Type de carte invalide. Utilisez 'personnages' ou 'bonus'.",
        });
    }

    const cards = await cardService.getAllCards(type);
    res.status(200).json(cards);
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
    res
      .status(500)
      .json({
        error: error.message || "Erreur lors de la récupération des cartes",
      });
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

    // Valider le type
    if (type !== "personnages" && type !== "bonus") {
      return res
        .status(400)
        .json({
          error: "Type de carte invalide. Utilisez 'personnages' ou 'bonus'.",
        });
    }

    const card = await cardService.getCardById(type, id);

    if (!card) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    res.status(200).json(card);
  } catch (error) {
    console.error("Erreur lors de la récupération de la carte:", error);
    res
      .status(500)
      .json({
        error: error.message || "Erreur lors de la récupération de la carte",
      });
  }
}

/**
 * Récupère l'URL de l'image d'une carte
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function getCardImageUrl(req, res) {
  try {
    const { type, id } = req.params;

    // Valider le type
    if (type !== "personnages" && type !== "bonus") {
      return res
        .status(400)
        .json({
          error: "Type de carte invalide. Utilisez 'personnages' ou 'bonus'.",
        });
    }

    const imageUrl = await cardService.getCardImageUrl(type, id);
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'URL de l'image:", error);
    res
      .status(500)
      .json({
        error:
          error.message || "Erreur lors de la récupération de l'URL de l'image",
      });
  }
}

module.exports = {
  getAllCards,
  getCardById,
  getCardImageUrl,
};
