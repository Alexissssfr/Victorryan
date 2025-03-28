let socket;

export function initializeSocket() {
  if (!socket) {
    socket = io();

    socket.on("connect", () => {
      console.log("Connexion WebSocket établie");
    });

    socket.on("error", (error) => {
      console.error("Erreur WebSocket:", error);
    });
  }

  return socket;
}

export function joinGameRoom(gameId, playerId) {
  const socket = initializeSocket();

  return new Promise((resolve, reject) => {
    socket.emit("joinGame", { gameId, playerId });

    socket.once("gameState", (gameState) => {
      console.log("État de la partie reçu:", gameState);
      resolve(gameState);
    });

    socket.once("error", (error) => {
      reject(error);
    });

    // Définir un délai d'attente
    setTimeout(() => {
      reject(new Error("Délai d'attente dépassé pour rejoindre la partie"));
    }, 5000);
  });
}
