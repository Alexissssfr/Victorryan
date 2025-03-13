import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import _ from "lodash";
import path from "path";
import fs from "fs/promises";

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Structure d'une partie
const GameState = {
  gameId: null,
  status: "WAITING", // WAITING, PLAYING, FINISHED
  players: {
    player1: {
      id: null,
      name: null,
      persoCards: [], // 5 cartes personnages
      bonusCards: [], // 5 cartes bonus
      ready: false,
    },
    player2: {
      id: null,
      name: null,
      persoCards: [],
      bonusCards: [],
      ready: false,
    },
  },
  currentTurn: null,
  turnNumber: 0,
};

// Gestionnaire de jeu
class GameManager {
  constructor() {
    this.activeGames = new Map();
    this.playerConnections = new Map(); // PlayerId -> WebSocket
    this.loadCardData();
  }

  async loadCardData() {
    // Charger personnages.json et bonus.json
    const persoPath = path.join(process.cwd(), "personnages.json");
    const bonusPath = path.join(process.cwd(), "bonus.json");

    try {
      const [persoContent, bonusContent] = await Promise.all([
        fs.readFile(persoPath, "utf8"),
        fs.readFile(bonusPath, "utf8"),
      ]);

      this.allPersoCards = JSON.parse(persoContent);
      this.allBonusCards = JSON.parse(bonusContent);
      console.log("✅ Données des cartes chargées");
    } catch (error) {
      console.error("❌ Erreur chargement cartes:", error);
      throw error;
    }
  }

  createGame(gameId, hostPlayer) {
    const gameState = _.cloneDeep(GameState);
    gameState.gameId = gameId;
    gameState.players.player1.id = hostPlayer.id;
    gameState.players.player1.name = hostPlayer.name;
    this.activeGames.set(gameId, gameState);
    return gameState;
  }

  joinGame(gameId, player) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) return null;

    gameState.players.player2.id = player.id;
    gameState.players.player2.name = player.name;

    if (this.areBothPlayersReady(gameState)) {
      this.startGame(gameState);
    }

    return gameState;
  }

  startGame(gameState) {
    // Distribution des cartes
    const p1Perso = this.drawRandomCards(this.allPersoCards, 5);
    const p1Bonus = this.drawRandomCards(this.allBonusCards, 5);
    const p2Perso = this.drawRandomCards(this.allPersoCards, 5);
    const p2Bonus = this.drawRandomCards(this.allBonusCards, 5);

    gameState.players.player1.persoCards = p1Perso;
    gameState.players.player1.bonusCards = p1Bonus;
    gameState.players.player2.persoCards = p2Perso;
    gameState.players.player2.bonusCards = p2Bonus;

    gameState.status = "PLAYING";
    gameState.currentTurn = "player1";
    gameState.turnNumber = 1;

    return gameState;
  }

  drawRandomCards(cardPool, count) {
    return _.sampleSize(cardPool, count);
  }

  areBothPlayersReady(gameState) {
    return gameState.players.player1.id && gameState.players.player2.id;
  }

  getGame(gameId) {
    return this.activeGames.get(gameId);
  }

  registerPlayerConnection(playerId, ws) {
    this.playerConnections.set(playerId, ws);
  }

  removePlayerConnection(playerId) {
    this.playerConnections.delete(playerId);
  }

  broadcastToGame(gameId, message) {
    const gameState = this.getGame(gameId);
    if (!gameState) return;

    const p1Socket = this.playerConnections.get(gameState.players.player1.id);
    const p2Socket = this.playerConnections.get(gameState.players.player2.id);

    const messageStr = JSON.stringify(message);

    if (p1Socket?.readyState === 1) p1Socket.send(messageStr);
    if (p2Socket?.readyState === 1) p2Socket.send(messageStr);
  }
}

// Création du gestionnaire de jeu
const gameManager = new GameManager();

// Création du serveur HTTP
const server = app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});

// WebSocket Server
const wss = new WebSocketServer({ server });

// Gestion des connexions WebSocket
wss.on("connection", (ws) => {
  console.log("🟢 Nouvelle connexion WebSocket");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "JOIN_GAME":
          // Enregistrer la connexion du joueur
          gameManager.registerPlayerConnection(data.playerId, ws);

          // Récupérer l'état de la partie
          const gameState = gameManager.getGame(data.gameId);
          if (gameState) {
            ws.send(
              JSON.stringify({
                type: "GAME_STATE",
                gameState,
              })
            );
          }
          break;

        case "PLAY_CARD":
          handleCardPlay(data);
          break;

        case "ATTACK":
          handleAttack(data);
          break;

        case "END_TURN":
          handleTurnEnd(data);
          break;
      }
    } catch (error) {
      console.error("❌ Erreur WebSocket:", error);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Déconnexion WebSocket");
  });
});

// Gestionnaires d'actions
function handleCardPlay(data) {
  const gameState = gameManager.getGame(data.gameId);
  if (!gameState) return;

  // TODO: Implémenter la logique de jeu de carte
  gameManager.broadcastToGame(data.gameId, {
    type: "CARD_PLAYED",
    playerId: data.playerId,
    cardId: data.cardId,
  });
}

function handleAttack(data) {
  const gameState = gameManager.getGame(data.gameId);
  if (!gameState) return;

  // TODO: Implémenter la logique d'attaque
  gameManager.broadcastToGame(data.gameId, {
    type: "ATTACK_PERFORMED",
    attackerId: data.attackerId,
    targetId: data.targetId,
  });
}

function handleTurnEnd(data) {
  const gameState = gameManager.getGame(data.gameId);
  if (!gameState) return;

  // Changer de joueur
  gameState.currentTurn =
    gameState.currentTurn === "player1" ? "player2" : "player1";
  gameState.turnNumber++;

  gameManager.broadcastToGame(data.gameId, {
    type: "TURN_CHANGED",
    currentTurn: gameState.currentTurn,
    turnNumber: gameState.turnNumber,
  });
}

// Routes API
app.post("/games/create", async (req, res) => {
  const gameId = uuidv4().slice(0, 6).toUpperCase(); // ex: ABC123
  const { playerId, playerName } = req.body;

  try {
    const gameState = gameManager.createGame(gameId, {
      id: playerId,
      name: playerName,
    });

    await supabase.from("games").insert([
      {
        game_id: gameId,
        host_player: playerId,
        status: "WAITING",
        created_at: new Date(),
      },
    ]);

    res.json({ gameId, gameState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/games/join", async (req, res) => {
  const { gameId, playerId, playerName } = req.body;

  try {
    const gameState = gameManager.joinGame(gameId, {
      id: playerId,
      name: playerName,
    });

    if (!gameState) {
      return res.status(404).json({ error: "Partie non trouvée" });
    }

    await supabase
      .from("games")
      .update({
        status: "PLAYING",
        player2: playerId,
        started_at: new Date(),
      })
      .eq("game_id", gameId);

    gameManager.broadcastToGame(gameId, {
      type: "GAME_START",
      gameState,
    });

    res.json({ gameState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/games/:id", async (req, res) => {
  const gameId = req.params.id;
  const gameState = gameManager.getGame(gameId);

  if (!gameState) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json(gameState);
});

// Routes existantes
app.get("/cards", async (req, res) => {
  const { data, error } = await supabase.from("cards").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/users", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default app;
