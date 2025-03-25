/**
 * Middleware d'authentification pour vérifier l'identité des joueurs
 */
const authenticatePlayer = (req, res, next) => {
  // Récupérer le playerId depuis le header Authorization
  const playerId = req.headers.authorization;

  if (!playerId) {
    return res.status(401).json({
      success: false,
      error: "Authentification requise",
    });
  }

  // Ajouter le playerId à l'objet req pour utilisation dans les routes
  req.playerId = playerId;
  next();
};

module.exports = {
  authenticatePlayer,
};
