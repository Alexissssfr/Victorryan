const gameManager = require("../services/gameManager");

/**
 * Crée une nouvelle partie
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function createGame(req, res) {
  try {
    const { playerName } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: "Nom de joueur requis" });
    }

    const gameId = await gameManager.createGame(playerName);

    res.status(201).json({
      gameId,
      message: "Partie créée avec succès",
    });
  } catch (error) {
    console.error("Erreur création partie:", error);
    res.status(500).json({ error: "Erreur lors de la création de la partie" });
  }
}

/**
 * Rejoint une partie existante
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function joinGame(req, res) {
  try {
    const { gameId } = req.params;
    const { playerName } = req.body;

    if (!gameId || !playerName) {
      return res
        .status(400)
        .json({ error: "ID de partie et nom de joueur requis" });
    }

    const gameState = await gameManager.joinGame(gameId, playerName);

    res.status(200).json({
      message: "Partie rejointe avec succès",
      gameState,
    });
  } catch (error) {
    console.error("Erreur en rejoignant la partie:", error);
    res
      .status(500)
      .json({
        error: error.message || "Erreur lors de la connexion à la partie",
      });
  }
}

/**
 * Récupère l'état d'une partie
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 */
async function getGameState(req, res) {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({ error: "ID de partie requis" });
    }

    const gameState = await gameManager.getGameState(gameId);

    res.status(200).json(gameState);
  } catch (error) {
    console.error("Erreur récupération état partie:", error);
    res
      .status(500)
      .json({
        error:
          error.message ||
          "Erreur lors de la récupération de l'état de la partie",
      });
  }
}

module.exports = {
  createGame,
  joinGame,
  getGameState,
};
