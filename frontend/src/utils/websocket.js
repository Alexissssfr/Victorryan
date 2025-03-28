/**
 * Configure la connexion WebSocket pour le jeu
 * @param {string} gameId - ID de la partie
 * @param {string} playerId - ID du joueur
 * @param {Function} onGameUpdate - Callback appelé quand l'état du jeu est mis à jour
 */
export function setupWebSocket(gameId, playerId, onGameUpdate) {
  // L'URL du serveur WebSocket
  const socketUrl =
    window.location.hostname === "localhost"
      ? "http://localhost:10000"
      : window.location.origin;

  console.log("Tentative de connexion WebSocket à:", socketUrl);

  // Créer l'instance de socket.io
  const socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Stocker la référence du socket dans l'objet window pour y accéder globalement
  window.socket = socket;

  // Événement de connexion
  socket.on("connect", () => {
    console.log("Connecté au serveur WebSocket:", socket.id);

    // Stocker l'ID du joueur dans le socket pour référence
    socket.playerId = playerId;

    // Rejoindre la salle de la partie avec l'ID du joueur
    socket.emit("join_game", { gameId, playerId });
    console.log(`Rejoint la partie ${gameId} en tant que joueur ${playerId}`);
  });

  // Événement de tentative de connexion
  socket.on("connect_attempt", () => {
    console.log("Tentative de connexion WebSocket...");
  });

  // Événement d'erreur de connexion
  socket.on("connect_error", (error) => {
    console.error("Erreur de connexion WebSocket:", error);
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
  socket.on("disconnect", (reason) => {
    console.log("Déconnecté du serveur WebSocket. Raison:", reason);
  });

  // Événement de reconnexion
  socket.on("reconnect", (attemptNumber) => {
    console.log(
      `Reconnecté au serveur WebSocket après ${attemptNumber} tentatives`
    );

    // Stocker l'ID du joueur dans le socket pour référence
    socket.playerId = playerId;

    // Rejoindre à nouveau la salle de la partie après reconnexion
    socket.emit("join_game", { gameId, playerId });
  });

  return socket;
}
