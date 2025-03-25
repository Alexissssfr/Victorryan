require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Vérification des variables d'environnement
console.log("Démarrage du serveur...");
console.log("Répertoire courant:", __dirname);
console.log("Environnement:", process.env.NODE_ENV || "development");

// Vérification de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERREUR: Variables d'environnement Supabase manquantes!");
  console.log("SUPABASE_URL défini:", !!supabaseUrl);
  console.log("SUPABASE_KEY défini:", !!supabaseKey);
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// Initialisation du serveur Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Liste des fichiers pour le débogage
try {
  console.log("Contenu du répertoire racine:");
  fs.readdirSync(__dirname).forEach((file) => {
    console.log(file);
  });

  // Vérifier si le dossier stock existe
  const stockPath = path.join(__dirname, "stock");
  if (fs.existsSync(stockPath)) {
    console.log("Contenu du répertoire stock:");
    fs.readdirSync(stockPath).forEach((file) => {
      console.log(file);
    });
  } else {
    console.error("Le répertoire 'stock' n'existe pas!");
  }
} catch (error) {
  console.error("Erreur lors de la lecture des répertoires:", error);
}

// Chargement des données des cartes
let personnages = [];
let bonus = [];

try {
  const personnagesPath = path.join(__dirname, "stock", "personnages.json");
  const bonusPath = path.join(__dirname, "stock", "bonus.json");

  console.log("Tentative de chargement de:", personnagesPath);
  console.log("Fichier existe:", fs.existsSync(personnagesPath));

  if (fs.existsSync(personnagesPath)) {
    personnages = JSON.parse(fs.readFileSync(personnagesPath, "utf8"));
    console.log(`Chargement réussi: ${personnages.length} personnages`);
  }

  console.log("Tentative de chargement de:", bonusPath);
  console.log("Fichier existe:", fs.existsSync(bonusPath));

  if (fs.existsSync(bonusPath)) {
    bonus = JSON.parse(fs.readFileSync(bonusPath, "utf8"));
    console.log(`Chargement réussi: ${bonus.length} cartes bonus`);
  }
} catch (error) {
  console.error("Erreur lors du chargement des cartes:", error);
}

// Fonction pour obtenir l'URL d'une image dans Supabase
function getImageUrl(type, id) {
  if (!supabaseUrl) {
    console.warn("AVERTISSEMENT: URL Supabase non définie pour les images");
    return `https://via.placeholder.com/200x300?text=${type}+${id}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/images/${type}/data/images/${type}/${
    type === "perso" ? "P" : "B"
  }${id}.png`;
}

// Routes API
app.get("/api/cards/personnages", (req, res) => {
  // Si aucun personnage n'a été chargé, renvoyer des données d'exemple
  if (personnages.length === 0) {
    return res.json([
      {
        id: 1,
        nomcarteperso: "Personnage Exemple",
        pointsdevie: 100,
        forceattaque: 10,
        tourattaque: 1,
        nomdupouvoir: "Pouvoir Exemple",
        description: "Ceci est un exemple de personnage",
      },
    ]);
  }
  res.json(personnages);
});

app.get("/api/cards/bonus", (req, res) => {
  // Si aucun bonus n'a été chargé, renvoyer des données d'exemple
  if (bonus.length === 0) {
    return res.json([
      {
        id: 100,
        nom: "Bonus Exemple",
        bonuspourcentage: "+10%",
        toursbonus: 2,
        description: "Ceci est un exemple de bonus",
      },
    ]);
  }
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
    filesLoaded: {
      personnages: personnages.length,
      bonus: bonus.length,
    },
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.stack);
  res.status(500).json({
    error: "Erreur serveur",
    message: err.message,
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
