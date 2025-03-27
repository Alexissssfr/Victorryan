/**
 * Routes de l'API du jeu
 * Ce fichier définit les routes API pour le jeu de cartes
 */

const express = require("express");
const GameStateManager = require("./services/gameStateManager");

// Créer le gestionnaire d'état de jeu
const gameStateManager = new GameStateManager();

// Créer le routeur
const router = express.Router();

/**
 * Création d'une nouvelle partie
 * POST /api/game/create
 */
router.post("/game/create", (req, res) => {
  const gameId = gameStateManager.createGame();
  res.json({ gameId });
});

/**
 * Démarrage d'une partie
 * POST /api/game/:gameId/start
 */
router.post("/game/:gameId/start", (req, res) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({ error: "ID de partie manquant" });
  }

  const success = gameStateManager.startGame(gameId);

  if (!success) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json({ success: true });
});

/**
 * Récupération de l'état d'une partie pour un joueur
 * GET /api/game/:gameId/state/:playerId
 */
router.get("/game/:gameId/state/:playerId", (req, res) => {
  const { gameId, playerId } = req.params;

  if (!gameId || !playerId) {
    return res
      .status(400)
      .json({ error: "ID de partie ou de joueur manquant" });
  }

  const gameState = gameStateManager.getGameStateForPlayer(gameId, playerId);

  if (!gameState) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json(gameState);
});

/**
 * Changement de personnage actif
 * POST /api/game/:gameId/change-character
 */
router.post("/game/:gameId/change-character", (req, res) => {
  const { gameId } = req.params;
  const { playerId, characterId } = req.body;

  if (!gameId || !playerId || !characterId) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const success = gameStateManager.changeActiveCharacter(
    gameId,
    playerId,
    characterId
  );

  if (!success) {
    return res
      .status(400)
      .json({ error: "Impossible de changer de personnage" });
  }

  res.json({ success: true });
});

/**
 * Application d'une carte bonus
 * POST /api/game/:gameId/bonus
 */
router.post("/game/:gameId/bonus", (req, res) => {
  const { gameId } = req.params;
  const { playerId, bonusCard } = req.body;

  if (!gameId || !playerId || !bonusCard) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const success = gameStateManager.applyBonus(gameId, playerId, bonusCard);

  if (!success) {
    return res.status(400).json({ error: "Impossible d'appliquer le bonus" });
  }

  res.json({ success: true });
});

/**
 * Fin du tour d'un joueur
 * POST /api/game/:gameId/end-turn
 */
router.post("/game/:gameId/end-turn", (req, res) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({ error: "ID de partie manquant" });
  }

  const success = gameStateManager.nextTurn(gameId);

  if (!success) {
    return res.status(400).json({ error: "Impossible de terminer le tour" });
  }

  res.json({ success: true });
});

/**
 * Chargement d'une partie existante
 * GET /api/game/:gameId/load
 */
router.get("/game/:gameId/load", (req, res) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({ error: "ID de partie manquant" });
  }

  const success = gameStateManager.loadGameState(gameId);

  if (!success) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json({ success: true });
});

module.exports = router;
