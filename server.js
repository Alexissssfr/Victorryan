require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const { supabase, getImageUrl } = require("./backend/config/supabase"); // Importer le module Supabase
const GameManager = require("./backend/services/gameManager");

// Classe pour gérer l'état d'une partie
class GameState {
  constructor(gameId) {
    this.gameId = gameId;
    this.players = {
      player1: {
        pv: 525,
        cartes: 5,
        bonus: 0,
        personnage: null,
        cartesBonus: [],
      },
      player2: {
        pv: 490,
        cartes: 5,
        bonus: 0,
        personnage: null,
        cartesBonus: [],
      },
    };
    this.currentTurn = 1;
    this.currentPlayer = "player1";
    this.status = "waiting"; // waiting, playing, finished
  }

  // Distribuer les cartes initiales
  async dealInitialCards(personnages, bonus) {
    // Vérifier si nous avons des données
    if (!personnages || !personnages.length || !bonus || !bonus.length) {
      console.error(
        "Pas de données de cartes disponibles pour la distribution !"
      );
      return false;
    }

    console.log(
      `Distribution de cartes: ${personnages.length} personnages, ${bonus.length} bonus`
    );

    // Mélanger les cartes
    const shuffledPersonnages = [...personnages].sort(
      () => Math.random() - 0.5
    );
    const shuffledBonus = [...bonus].sort(() => Math.random() - 0.5);

    // Distribuer les personnages (5 pour chaque joueur)
    this.players.player1.personnages = shuffledPersonnages.slice(0, 5);
    this.players.player2.personnages = shuffledPersonnages.slice(5, 10);

    // On choisit 1 personnage actif pour chaque joueur
    this.players.player1.personnage = this.players.player1.personnages[0];
    this.players.player2.personnage = this.players.player2.personnages[0];

    // Log pour débogage
    console.log("Personnage actif joueur 1:", this.players.player1.personnage);
    console.log("Personnage actif joueur 2:", this.players.player2.personnage);

    // Distribuer les bonus (5 pour chaque joueur)
    this.players.player1.cartesBonus = shuffledBonus.slice(0, 5);
    this.players.player2.cartesBonus = shuffledBonus.slice(5, 10);

    // Sauvegarder l'état de la partie dans un fichier JSON
    this.saveGameStateToFile();

    this.status = "playing";
    return true;
  }

  // Sauvegarder l'état de la partie dans un fichier JSON
  saveGameStateToFile() {
    try {
      // Créer le dossier gameStates s'il n'existe pas
      const gameStatesDir = path.join(__dirname, "gameStates");
      if (!fs.existsSync(gameStatesDir)) {
        fs.mkdirSync(gameStatesDir, { recursive: true });
      }

      // Chemin du fichier de sauvegarde
      const filePath = path.join(gameStatesDir, `${this.gameId}.json`);

      // Sauvegarder l'état complet
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            gameId: this.gameId,
            players: this.players,
            currentTurn: this.currentTurn,
            currentPlayer: this.currentPlayer,
            status: this.status,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      console.log(
        `État de la partie ${this.gameId} sauvegardé dans ${filePath}`
      );
    } catch (error) {
      console.error(
        `Erreur lors de la sauvegarde de l'état de la partie ${this.gameId}:`,
        error
      );
    }
  }

  // Obtenir l'état actuel pour un joueur
  getStateForPlayer(playerId) {
    const opponent = playerId === "player1" ? "player2" : "player1";
    return {
      gameId: this.gameId,
      turn: this.currentTurn,
      currentPlayer: this.currentPlayer,
      status: this.status,
      you: {
        pv: this.players[playerId].pv,
        cartes: this.players[playerId].cartes,
        bonus: this.players[playerId].bonus,
        personnage: this.players[playerId].personnage,
        personnages: this.players[playerId].personnages || [],
        cartesBonus: this.players[playerId].cartesBonus,
      },
      opponent: {
        pv: this.players[opponent].pv,
        cartes: this.players[opponent].cartes,
        bonus: this.players[opponent].bonus,
        personnage: this.players[opponent].personnage,
        personnages:
          this.players[opponent].personnages?.map((p) => ({
            id: p.id,
            nom: p.nom,
          })) || [],
        cartesBonus: this.players[opponent].cartesBonus?.length || 0, // On n'envoie que le nombre de cartes, pas leur contenu
      },
    };
  }

  // Appliquer un bonus
  applyBonus(playerId, bonusCard) {
    const player = this.players[playerId];
    if (!player || !bonusCard) return false;

    // Trouver et retirer la carte bonus de la main du joueur
    const bonusIndex = player.cartesBonus.findIndex(
      (card) => card.id === bonusCard.id
    );
    if (bonusIndex === -1) return false;

    player.cartesBonus.splice(bonusIndex, 1);

    // Appliquer l'effet du bonus selon le type de bonus
    if (bonusCard.pourcentagebonus) {
      if (player.personnage) {
        // Augmenter la force d'attaque du personnage
        player.personnage.forceattaque = Math.round(
          player.personnage.forceattaque *
            (1 + bonusCard.pourcentagebonus / 100)
        );
      }
    } else if (bonusCard.effet) {
      switch (bonusCard.effet) {
        case "attaque":
          if (player.personnage) {
            player.personnage.forceattaque += bonusCard.valeur;
          }
          break;
        case "pv":
          player.pv = Math.min(1000, player.pv + bonusCard.valeur);
          break;
        case "defense":
          if (player.personnage) {
            player.personnage.defense =
              (player.personnage.defense || 0) + bonusCard.valeur;
          }
          break;
      }
    }

    // Sauvegarder l'état après l'application du bonus
    this.saveGameStateToFile();

    return true;
  }

  // Changer de personnage actif
  changeActiveCharacter(playerId, characterId) {
    const player = this.players[playerId];
    if (!player || !player.personnages) return false;

    // Trouver le personnage dans la liste
    const character = player.personnages.find((p) => p.id === characterId);
    if (!character) return false;

    // Changer le personnage actif
    player.personnage = character;

    // Sauvegarder l'état
    this.saveGameStateToFile();

    return true;
  }

  // Passer au tour suivant
  nextTurn() {
    this.currentPlayer =
      this.currentPlayer === "player1" ? "player2" : "player1";
    this.currentTurn++;

    // Sauvegarder l'état après le changement de tour
    this.saveGameStateToFile();

    return true;
  }
}

// Map pour stocker les parties en cours
const activeGames = new Map();

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

// Initialisation du serveur Express
const app = express();
const PORT = process.env.PORT || 3000;
const gameManager = new GameManager();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Importer les routes API
const apiRoutes = require("./backend/server-routes");

// Ajouter les routes API
app.use("/api", apiRoutes);

// Création du dossier pour les états de jeu s'il n'existe pas
const gameStatesDir = path.join(__dirname, "gameStates");
if (!fs.existsSync(gameStatesDir)) {
  try {
    fs.mkdirSync(gameStatesDir, { recursive: true });
    console.log(`Dossier de sauvegarde des parties créé: ${gameStatesDir}`);
  } catch (error) {
    console.error(
      `Erreur lors de la création du dossier ${gameStatesDir}:`,
      error
    );
  }
}

// Chargement des données des cartes
let personnagesData = [];
let bonusData = [];

try {
  const personnagesFile = path.join(__dirname, "stock", "personnages.json");
  if (fs.existsSync(personnagesFile)) {
    personnagesData = JSON.parse(fs.readFileSync(personnagesFile, "utf8"));
    console.log(`${personnagesData.length} personnages chargés`);
  } else {
    console.error("Fichier personnages.json non trouvé");
  }
} catch (error) {
  console.error("Erreur lors du chargement des personnages:", error);
}

try {
  const bonusFile = path.join(__dirname, "stock", "bonus.json");
  if (fs.existsSync(bonusFile)) {
    bonusData = JSON.parse(fs.readFileSync(bonusFile, "utf8"));
    console.log(`${bonusData.length} bonus chargés`);
  } else {
    console.error("Fichier bonus.json non trouvé");
  }
} catch (error) {
  console.error("Erreur lors du chargement des bonus:", error);
}

// Routes API
app.get("/api/cards/personnages", (req, res) => {
  // Si aucun personnage n'a été chargé, renvoyer des données d'exemple
  if (personnagesData.length === 0) {
    return res.json([
      {
        id: "P1",
        nom: "Personnage Exemple",
        pointsdevie: 100,
        forceattaque: 10,
        tourattaque: 1,
        pouvoir: "Pouvoir Exemple",
        description: "Ceci est un exemple de personnage",
      },
    ]);
  }
  res.json(personnagesData);
});

app.get("/api/cards/bonus", (req, res) => {
  // Si aucun bonus n'a été chargé, renvoyer des données d'exemple
  if (bonusData.length === 0) {
    return res.json([
      {
        id: "B1",
        nom: "Bonus Exemple",
        pourcentagebonus: 10,
        toursbonus: 2,
        description: "Ceci est un exemple de bonus",
      },
    ]);
  }
  res.json(bonusData);
});

app.get("/api/image/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const imageUrl = getImageUrl(type, id);
  res.json({ url: imageUrl });
});

app.post("/api/game/create", (req, res) => {
  const gameId = `game_${Date.now()}`;
  const gameState = gameManager.createGame(gameId);
  res.json({
    gameId,
    message: "Partie créée avec succès",
    gameState,
  });
});

app.post("/api/game/:gameId/start", (req, res) => {
  const { gameId } = req.params;
  const success = gameManager.dealInitialCards(
    gameId,
    personnagesData,
    bonusData
  );

  if (!success) {
    return res
      .status(500)
      .json({ error: "Erreur lors du démarrage de la partie" });
  }

  const gameState = gameManager.getStateForPlayer(gameId, "player1");
  res.json({
    message: "Partie démarrée avec succès",
    gameState,
  });
});

app.get("/api/game/:gameId", (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.query;

  if (!playerId) {
    return res.status(400).json({ error: "ID du joueur manquant" });
  }

  const gameState = gameManager.getStateForPlayer(gameId, playerId);
  if (!gameState) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json(gameState);
});

app.post("/api/game/:gameId/changecharacter", (req, res) => {
  const { gameId } = req.params;
  const { playerId, characterId } = req.body;

  if (!playerId || !characterId) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const success = gameManager.changeActiveCharacter(
    gameId,
    playerId,
    characterId
  );
  if (!success) {
    return res
      .status(500)
      .json({ error: "Erreur lors du changement de personnage" });
  }

  const gameState = gameManager.getStateForPlayer(gameId, playerId);
  res.json({
    message: "Personnage changé avec succès",
    gameState,
  });
});

app.post("/api/game/:gameId/applybonus", (req, res) => {
  const { gameId } = req.params;
  const { playerId, bonusCard } = req.body;

  if (!playerId || !bonusCard) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const success = gameManager.applyBonus(gameId, playerId, bonusCard);
  if (!success) {
    return res
      .status(500)
      .json({ error: "Erreur lors de l'application du bonus" });
  }

  const gameState = gameManager.getStateForPlayer(gameId, playerId);
  res.json({
    message: "Bonus appliqué avec succès",
    gameState,
  });
});

app.post("/api/game/:gameId/end-turn", (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.body;

  if (!playerId) {
    return res.status(400).json({ error: "ID du joueur manquant" });
  }

  const success = gameManager.nextTurn(gameId);
  if (!success) {
    return res.status(500).json({ error: "Erreur lors de la fin du tour" });
  }

  const gameState = gameManager.getStateForPlayer(gameId, playerId);
  res.json({
    message: "Tour terminé avec succès",
    gameState,
  });
});

app.get("/api/game/:gameId/load", (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.query;

  if (!playerId) {
    return res.status(400).json({ error: "ID du joueur manquant" });
  }

  const success = gameManager.loadGame(gameId);
  if (!success) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  const gameState = gameManager.getStateForPlayer(gameId, playerId);
  res.json({
    message: "Partie chargée avec succès",
    gameState,
  });
});

// Route principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route de santé
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    personnages: personnagesData.length,
    bonus: bonusData.length,
    activeGames: gameManager.activeGames.size,
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err);
  res.status(500).json({ error: "Erreur serveur" });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(
    `Serveur démarré sur le port ${PORT} - Environnement: ${
      process.env.NODE_ENV || "development"
    }`
  );
  console.log(
    `🎮 Victorryan Game Server - Utilisant les URL Supabase pour les images`
  );
});
