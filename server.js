// Entry point that redirects to the actual server file in the backend directory
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { createGame, joinGame, activeGames } = require("./gameManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static("public"));

// Route pour créer une nouvelle partie
app.post("/api/games", (req, res) => {
  try {
    const gameId = createGame();
    res.json({ gameId });
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    res.status(500).json({
      error: "Erreur interne du serveur lors de la création de la partie.",
    });
  }
});

// Route pour rejoindre une partie existante
app.post("/api/games/:gameId/join", (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body;

  if (!playerName) {
    return res.status(400).json({ error: "Le nom du joueur est requis." });
  }

  try {
    const { playerId, game } = joinGame(gameId, playerName);

    io.to(gameId).emit("playerJoined", {
      playerId: playerId,
      playerName: playerName,
      playerCount: Object.keys(game.players).length,
    });

    if (game.gameState === "playing") {
      io.to(gameId).emit("gameStart", game);
    }

    res.json({ gameId, playerId });
  } catch (error) {
    console.error(`Erreur pour rejoindre la partie ${gameId}:`, error);
    if (error.message === "Partie non trouvée") {
      res.status(404).json({ error: error.message });
    } else if (error.message === "La partie est pleine") {
      res.status(403).json({ error: error.message });
    } else {
      res
        .status(500)
        .json({ error: "Erreur interne du serveur pour rejoindre la partie." });
    }
  }
});

// Configuration WebSocket pour la communication en temps réel
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion WebSocket: ${socket.id}`);

  socket.on("joinGameRoom", ({ gameId, playerId }) => {
    const game = activeGames.get(gameId);
    if (!game || !game.players[playerId]) {
      console.error(
        `Tentative de connexion invalide à la salle: Game ${gameId}, Player ${playerId}`
      );
      socket.emit(
        "error",
        "Impossible de rejoindre la salle de jeu. Partie ou joueur invalide."
      );
      return;
    }

    console.log(`WebSocket: Joueur ${playerId} rejoint la salle ${gameId}`);
    socket.join(gameId);

    socket.emit("gameJoined", game);

    socket.to(gameId).emit("playerReconnected", {
      playerId: playerId,
      playerName: game.players[playerId].name,
    });

    socket.on("disconnect", () => {
      console.log(`Joueur ${playerId} déconnecté de la partie ${gameId}`);
      socket.to(gameId).emit("playerLeft", { playerId });
    });
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
