const express = require("express");
const router = express.Router();
const cardManager = require("../services/cardManager");

/**
 * @route GET /cards/random
 * @desc Récupérer des cartes aléatoires
 * @access Public
 */
router.get("/random", (req, res) => {
  try {
    const type = req.query.type; // "perso" ou "bonus"
    const count = parseInt(req.query.count) || 5;

    // Vérifier que le type est valide
    if (type !== "perso" && type !== "bonus") {
      return res.status(400).json({
        success: false,
        message: "Le type doit être 'perso' ou 'bonus'",
      });
    }

    // Récupérer les cartes aléatoires
    const cards = cardManager.getRandomCards(type, count);

    res.json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des cartes aléatoires:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des cartes",
    });
  }
});

/**
 * @route GET /cards/:type/:id
 * @desc Récupérer une carte spécifique par son ID
 * @access Public
 */
router.get("/:type/:id", (req, res) => {
  try {
    const { type, id } = req.params;

    // Vérifier que le type est valide
    if (type !== "perso" && type !== "bonus") {
      return res.status(400).json({
        success: false,
        message: "Le type doit être 'perso' ou 'bonus'",
      });
    }

    // Récupérer la carte par son ID
    const card = cardManager.getCardById(type, id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Carte non trouvée",
      });
    }

    res.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la carte:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la carte",
    });
  }
});

/**
 * @route GET /cards/all/:type
 * @desc Récupérer toutes les cartes d'un type
 * @access Public
 */
router.get("/all/:type", (req, res) => {
  try {
    const { type } = req.params;

    // Vérifier que le type est valide
    if (type !== "perso" && type !== "bonus") {
      return res.status(400).json({
        success: false,
        message: "Le type doit être 'perso' ou 'bonus'",
      });
    }

    // Récupérer toutes les cartes (limite à 100 pour éviter les problèmes de performance)
    const cards = cardManager.getRandomCards(type, 100);

    res.json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des cartes",
    });
  }
});

/**
 * @route GET /cards/svg/:type/:id
 * @desc Récupérer le SVG d'une carte spécifique
 * @access Public
 */
router.get("/svg/:type/:id", (req, res) => {
  try {
    const { type, id } = req.params;
    const fs = require("fs");
    const path = require("path");

    // Vérifier que le type est valide
    if (type !== "perso" && type !== "bonus") {
      return res.status(400).json({
        success: false,
        message: "Le type doit être 'perso' ou 'bonus'",
      });
    }

    // Chemin vers le fichier SVG
    const svgFolder = type === "perso" ? "svg_perso" : "svg_bonus";
    const svgPath = path.join(__dirname, `../../stock/${svgFolder}/${id}.svg`);

    // Vérifier si le fichier existe
    if (!fs.existsSync(svgPath)) {
      return res.status(404).json({
        success: false,
        message: "SVG non trouvé",
      });
    }

    // Renvoyer le fichier SVG
    res.setHeader("Content-Type", "image/svg+xml");
    fs.createReadStream(svgPath).pipe(res);
  } catch (error) {
    console.error("Erreur lors de la récupération du SVG:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du SVG",
    });
  }
});

module.exports = router;
