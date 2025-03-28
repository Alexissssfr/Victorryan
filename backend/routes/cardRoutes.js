const express = require("express");
const cardController = require("../controllers/cardController");

const router = express.Router();

// Récupérer toutes les cartes d'un type
router.get("/:type", cardController.getAllCards);

// Récupérer une carte par son ID
router.get("/:type/:id", cardController.getCardById);

// Récupérer l'URL d'une image de carte
router.get("/image/:type/:id", cardController.getCardImageUrl);

module.exports = router;
