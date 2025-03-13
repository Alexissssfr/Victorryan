const express = require("express");
const router = express.Router();
const gameManager = require("../services/gameManager");

router.post("/create", async (req, res) => {
  try {
    const playerId = req.body.playerId;
    const gameId = await gameManager.createGame(playerId);
    res.json({ gameId });
  } catch (error) {
    console.error("Erreur lors de la création de la partie :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/join", async (req, res) => {
  try {
    const gameId = req.body.gameId;
    const playerId = req.body.playerId;
    const joined = await gameManager.joinGame(gameId, playerId);
    res.json({ joined });
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/play", async (req, res) => {
  try {
    const gameId = req.body.gameId;
    const playerId = req.body.playerId;
    const actions = req.body.actions;
    const success = await gameManager.playTurn(gameId, playerId, actions);
    res.json({ success });
  } catch (error) {
    console.error("Erreur lors du tour de jeu :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
