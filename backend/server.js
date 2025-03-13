const express = require("express");
const app = express();
const gamesRouter = require("./routes/games");
const cardsRouter = require("./routes/cards");

// Middleware pour parser le corps des requêtes en JSON
app.use(express.json());

// Routes pour les parties et les cartes
app.use("/games", gamesRouter);
app.use("/cards", cardsRouter);

// Servir les fichiers statiques du dossier "frontend"
app.use(express.static("frontend"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
