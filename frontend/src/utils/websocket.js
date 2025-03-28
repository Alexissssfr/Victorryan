/**
 * Configure la connexion WebSocket pour le jeu
 * @param {string} gameId - ID de la partie
 * @param {Function} onGameUpdate - Callback appelé quand l'état du jeu est mis à jour
 */
export function setupWebSocket(gameId, onGameUpdate) {
  // L'URL du serveur WebSocket
  const socketUrl =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : window.location.origin;

  // Créer l'instance de socket.io
  const socket = io(socketUrl);

  // Stocker la référence du socket dans l'objet window pour y accéder globalement
  window.socket = socket;

  // Événement de connexion
  socket.on("connect", () => {
    console.log("Connecté au serveur WebSocket");

    // Rejoindre la salle de la partie
    socket.emit("join_game", gameId);
    console.log(`Rejoint la partie ${gameId}`);
  });

  // Événement de mise à jour du jeu
  socket.on("game_update", (gameState) => {
    console.log("Mise à jour de l'état du jeu:", gameState);

    // Appeler le callback avec le nouvel état
    if (onGameUpdate) {
      onGameUpdate(gameState);
    }
  });

  // Événement d'erreur
  socket.on("error", (error) => {
    console.error("Erreur WebSocket:", error);
    alert(`Erreur: ${error.message}`);
  });

  // Événement de déconnexion
  socket.on("disconnect", () => {
    console.log("Déconnecté du serveur WebSocket");
  });

  return socket;
}
