const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

// Configuration de base
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// Routes de base
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// Routes pour les parties et les cartes
app.use("/games", require("./backend/routes/games"));
app.use("/cards", require("./backend/routes/cards"));

// Port d'écoute
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
