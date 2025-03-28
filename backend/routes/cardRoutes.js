const express = require("express");
const cardController = require("../controllers/cardController");

const router = express.Router();

// Middleware pour gérer les erreurs de route
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Erreur route:", err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
  });
};

// Récupérer toutes les cartes d'un type
router.get("/:type", asyncHandler(cardController.getAllCards));

// Récupérer une carte par son ID
router.get("/:type/:id", asyncHandler(cardController.getCardById));

// Récupérer l'URL d'une image de carte
router.get("/image/:type/:id", asyncHandler(cardController.getCardImageUrl));

module.exports = router;
