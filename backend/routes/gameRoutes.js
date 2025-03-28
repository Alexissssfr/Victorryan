const express = require("express");
const gameController = require("../controllers/gameController");

const router = express.Router();

// Créer une nouvelle partie
router.post("/", gameController.createGame);

// Rejoindre une partie existante
router.post("/:gameId/join", gameController.joinGame);

// Récupérer l'état d'une partie
router.get("/:gameId", gameController.getGameState);

module.exports = router;
