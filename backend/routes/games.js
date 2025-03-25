const express = require("express");
const router = express.Router();
const gameManager = require("../services/gameManager")();
const { authenticatePlayer } = require("../middleware/auth");

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
        error: "playerId requis",
      });
    }

    // Créer une nouvelle partie
    const game = gameManager.createGame(playerId);

    res.json({
      success: true,
      gameId: game.gameId,
      state: game.getStateForPlayer(playerId),
    });
  } catch (error) {
    console.error("Erreur création partie:", error);
    res.status(500).json({
      success: false,
      error: error.message,
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
    const game = gameManager.getGame(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Partie non trouvée",
      });
    }

    if (!game.canJoin(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Impossible de rejoindre la partie",
      });
    }

    const playerRole = game.addPlayer(playerId);
    if (!playerRole) {
      return res.status(400).json({
        success: false,
        error: "Partie complète",
      });
    }

    // Distribuer les cartes initiales si pas déjà fait
    if (!game.cards.player1.perso.length) {
      await game.distributeInitialCards();
    }

    res.json({
      success: true,
      state: game.getStateForPlayer(playerId),
    });
  } catch (error) {
    console.error("Erreur join partie:", error);
    res.status(500).json({
      success: false,
      error: error.message,
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

/**
 * @route GET /games/state/:gameId
 * @desc Obtenir l'état de la partie
 * @access Private
 */
router.get("/state/:gameId", authenticatePlayer, (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req;

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res
      .status(404)
      .json({ success: false, error: "Partie non trouvée" });
  }

  const state = game.getStateForPlayer(playerId);
  if (!state) {
    return res
      .status(403)
      .json({ success: false, error: "Accès non autorisé" });
  }

  res.json({ success: true, state });
});

/**
 * @route POST /games/play-bonus
 * @desc Jouer une carte bonus
 * @access Private
 */
router.post("/play-bonus", authenticatePlayer, (req, res) => {
  const { gameId, bonusCardId, targetPersoId } = req.body;
  const { playerId } = req;

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res
      .status(404)
      .json({ success: false, error: "Partie non trouvée" });
  }

  const result = game.playBonus(playerId, bonusCardId, targetPersoId);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }

  res.json({
    success: true,
    message: result.message,
    state: game.getStateForPlayer(playerId),
  });
});

/**
 * @route POST /games/attack
 * @desc Attaquer avec une carte
 * @access Private
 */
router.post("/attack", authenticatePlayer, (req, res) => {
  const { gameId, attackerCardId, targetCardId } = req.body;
  const { playerId } = req;

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res
      .status(404)
      .json({ success: false, error: "Partie non trouvée" });
  }

  const result = game.attack(playerId, attackerCardId, targetCardId);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }

  res.json({
    success: true,
    message: result.message,
    damage: result.damage,
    isDead: result.isDead,
    state: game.getStateForPlayer(playerId),
  });
});

/**
 * @route POST /games/end-turn
 * @desc Terminer son tour
 * @access Private
 */
router.post("/end-turn", authenticatePlayer, (req, res) => {
  const { gameId } = req.body;
  const { playerId } = req;

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res
      .status(404)
      .json({ success: false, error: "Partie non trouvée" });
  }

  const result = game.endTurn(playerId);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }

  res.json({
    success: true,
    message: result.message,
    state: game.getStateForPlayer(playerId),
  });
});

module.exports = router;
