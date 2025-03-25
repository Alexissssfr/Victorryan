const express = require("express");
const path = require("path");
const cors = require("cors");
const { GameManager } = require("./services/gameManager");
const { supabase, getImageUrl } = require("./config/supabase");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Initialisation du gestionnaire de jeu
const gameManager = new GameManager();

// Routes API
app.post("/api/game/create", (req, res) => {
  const gameId = gameManager.createGame();
  res.json({ gameId });
});

app.get("/api/game/:gameId", (req, res) => {
  const game = gameManager.getGame(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }
  res.json(game);
});

app.post("/api/game/:gameId/start", (req, res) => {
  const game = gameManager.getGame(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }
  game.startGame();
  res.json({ message: "Game started" });
});

app.post("/api/game/:gameId/end-turn", (req, res) => {
  const game = gameManager.getGame(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }
  game.endTurn();
  res.json({ message: "Turn ended" });
});

// Route pour obtenir l'URL d'une image
app.get("/api/image/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const imageUrl = getImageUrl(type, id);
  res.json({ url: imageUrl });
});

// Route principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
