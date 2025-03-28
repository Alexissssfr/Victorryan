const express = require("express");
const gameController = require("../controllers/gameController");

const router = express.Router();

// Middleware pour gérer les erreurs de route
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Erreur route:", err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
  });
};

// Créer une nouvelle partie
router.post("/", asyncHandler(gameController.createGame));

// Rejoindre une partie existante
router.post("/:gameId/join", asyncHandler(gameController.joinGame));

// Récupérer l'état d'une partie
router.get("/:gameId", asyncHandler(gameController.getGameState));

module.exports = router;
