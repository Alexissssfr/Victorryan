require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

// Initialisation de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialisation du serveur Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Chargement des données des cartes
const fs = require("fs");
let personnages = [];
let bonus = [];

try {
  personnages = JSON.parse(
    fs.readFileSync(path.join(__dirname, "stock", "personnages.json"))
  );
  bonus = JSON.parse(
    fs.readFileSync(path.join(__dirname, "stock", "bonus.json"))
  );
  console.log(
    `Chargement réussi: ${personnages.length} personnages et ${bonus.length} cartes bonus`
  );
} catch (error) {
  console.error("Erreur lors du chargement des cartes:", error);
}

// Fonction pour obtenir l'URL d'une image dans Supabase
function getImageUrl(type, id) {
  return `${supabaseUrl}/storage/v1/object/public/images/${type}/data/images/${type}/${
    type === "perso" ? "P" : "B"
  }${id}.png`;
}

// Routes API
app.get("/api/cards/personnages", (req, res) => {
  res.json(personnages);
});

app.get("/api/cards/bonus", (req, res) => {
  res.json(bonus);
});

app.get("/api/image/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const imageUrl = getImageUrl(type, id);
  res.json({ url: imageUrl });
});

// Route principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route de santé
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur" });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || "development"}`);
});
