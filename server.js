const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Route principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route de test
app.get("/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
