const express = require("express");
const router = express.Router();
const gameManager = require("../services/gameManager")();

/**
 * @route POST /games/create
 * @desc Créer une nouvelle partie
 * @access Public
 */
router.post("/create", async (req, res) => {
  try {
    const { playerId } = req.body;

    // Vérifier que l'ID du joueur est fourni
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: "L'ID du joueur est requis",
      });
    }

    // Créer une nouvelle partie
    const gameId = await gameManager.createGame(playerId);

    res.json({
      success: true,
      gameId,
      message: "Partie créée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la partie",
    });
  }
});

/**
 * @route POST /games/join
 * @desc Rejoindre une partie existante
 * @access Public
 */
router.post("/join", async (req, res) => {
  try {
    const { gameId, playerId } = req.body;

    // Vérifier que l'ID de la partie et l'ID du joueur sont fournis
    if (!gameId || !playerId) {
      return res.status(400).json({
        success: false,
        message: "L'ID de la partie et l'ID du joueur sont requis",
      });
    }

    // Rejoindre la partie
    const joined = await gameManager.joinGame(gameId, playerId);

    if (joined) {
      // Récupérer l'état actuel de la partie
      const gameState = await gameManager.getGameState(gameId);

      res.json({
        success: true,
        joined: true,
        gameState,
        message: "Partie rejointe avec succès",
      });
    } else {
      res.status(400).json({
        success: false,
        joined: false,
        message:
          "Impossible de rejoindre la partie. Elle est peut-être complète ou n'existe pas.",
      });
    }
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la connexion à la partie",
    });
  }
});

/**
 * @route POST /games/play
 * @desc Jouer un tour dans une partie
 * @access Public
 */
router.post("/play", async (req, res) => {
  try {
    const { gameId, playerId, actions } = req.body;

    // Vérifier que toutes les informations nécessaires sont fournies
    if (!gameId || !playerId || !actions) {
      return res.status(400).json({
        success: false,
        message: "L'ID de la partie, l'ID du joueur et les actions sont requis",
      });
    }

    // Jouer le tour
    const success = await gameManager.playTurn(gameId, playerId, actions);

    if (success) {
      // Récupérer l'état mis à jour de la partie
      const gameState = await gameManager.getGameState(gameId);

      res.json({
        success: true,
        gameState,
        message: "Tour joué avec succès",
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          "Impossible de jouer le tour. Vérifiez que c'est bien votre tour et que la partie est en cours.",
      });
    }
  } catch (error) {
    console.error("Erreur lors du tour de jeu:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du tour de jeu",
    });
  }
});

/**
 * @route GET /games/:gameId
 * @desc Récupérer l'état d'une partie
 * @access Public
 */
router.get("/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;

    // Récupérer l'état de la partie
    const gameState = await gameManager.getGameState(gameId);

    if (gameState) {
      res.json({
        success: true,
        gameState,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Partie non trouvée",
      });
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'état de la partie:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'état de la partie",
    });
  }
});

module.exports = router;
