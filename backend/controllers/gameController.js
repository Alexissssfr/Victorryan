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

    console.log(`Création d'une partie pour le joueur: ${playerName}`);
    const gameId = await gameManager.createGame(playerName);

    console.log(`Partie créée avec succès. ID: ${gameId}`);
    res.status(201).json({
      gameId,
      message: "Partie créée avec succès",
    });
  } catch (error) {
    console.error("Erreur création partie:", error);
    res
      .status(500)
      .json({
        error: "Erreur lors de la création de la partie: " + error.message,
      });
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

    console.log(`Joueur ${playerName} tente de rejoindre la partie ${gameId}`);
    const gameState = await gameManager.joinGame(gameId, playerName);

    console.log(`Joueur ${playerName} a rejoint la partie ${gameId}`);
    res.status(200).json({
      message: "Partie rejointe avec succès",
      gameState,
    });
  } catch (error) {
    console.error("Erreur en rejoignant la partie:", error);
    res.status(error.message.includes("introuvable") ? 404 : 500).json({
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

    console.log(`Récupération de l'état de la partie ${gameId}`);
    const gameState = await gameManager.getGameState(gameId);

    res.status(200).json(gameState);
  } catch (error) {
    console.error("Erreur récupération état partie:", error);
    res.status(error.message.includes("introuvable") ? 404 : 500).json({
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
