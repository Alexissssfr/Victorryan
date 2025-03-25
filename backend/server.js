const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();
const gamesRouter = require("./routes/games");
const cardsRouter = require("./routes/cards");

// Configuration de base
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes de base
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Routes pour les parties et les cartes
app.use("/games", gamesRouter);
app.use("/cards", cardsRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Erreur serveur interne",
  });
});

// Port d'écoute
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
