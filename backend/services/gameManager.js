const supabase = require("../config/supabase");
const cardManager = require("./cardManager");
const crypto = require("crypto");

// Map pour stocker les parties actives en mémoire
const activeGames = new Map();

// Fonction pour gérer les parties avec Socket.io
module.exports = function (io) {
  return {
    createGame: async function (playerId) {
      const gameId = generateUniqueId();

      // Structure initiale de la partie
      const gameState = {
        id: gameId,
        player1: {
          id: playerId,
          health: {},
          attack: {},
          turns: {},
          activeBonus: {},
          deck: [],
          hand: [],
        },
        player2: null,
        currentPlayer: "player1",
        gameOver: false,
        winner: null,
        createdAt: new Date().toISOString(),
      };

      // Sauvegarder dans la Map locale
      activeGames.set(gameId, gameState);

      // Sauvegarder l'état initial de la partie dans Supabase
      await supabase.from("games").insert([gameState]);

      return gameId;
    },

    joinGame: async function (gameId, playerId) {
      console.log(
        `Tentative de rejoindre la partie ${gameId} pour le joueur ${playerId}`
      );

      // Récupérer la partie depuis la Map ou Supabase
      let game = activeGames.get(gameId);

      if (!game) {
        // Si la partie n'est pas en mémoire, la chercher dans Supabase
        console.log(`Recherche de la partie ${gameId} dans Supabase`);
        try {
          const { data, error } = await supabase
            .from("games")
            .select("*")
            .eq("id", gameId)
            .single();

          if (error) {
            console.error("Erreur Supabase:", error);
            return false;
          }

          if (!data) {
            console.log("Partie non trouvée dans Supabase");
            return false;
          }

          game = data;
          activeGames.set(gameId, game);
          console.log("Partie récupérée depuis Supabase:", gameId);
        } catch (err) {
          console.error("Exception lors de la recherche dans Supabase:", err);
          return false;
        }
      }

      // Si le joueur 1 essaie de rejoindre à nouveau, retourner l'état actuel
      if (game.player1 && game.player1.id === playerId) {
        console.log(`Le joueur 1 (${playerId}) rejoint sa propre partie`);

        // Si le joueur 1 n'a pas encore de cartes, les distribuer
        if (!game.player1.hand || game.player1.hand.length === 0) {
          console.log("Distribution initiale de cartes pour le joueur 1");
          const persoCards = await cardManager.getRandomCards("perso", 5);
          const bonusCards = await cardManager.getRandomCards("bonus", 5);

          game.player1.hand = [...persoCards, ...bonusCards];

          // Initialiser les statistiques des cartes
          persoCards.forEach((card) => {
            game.player1.health[card.id] = parseInt(card.pointsdevie) || 100;
            game.player1.attack[card.id] = parseInt(card.forceattaque) || 30;
            game.player1.turns[card.id] = parseInt(card.tourattaque) || 2;
          });

          // Mettre à jour dans la Map locale et Supabase
          activeGames.set(gameId, game);
          await supabase.from("games").update(game).eq("id", gameId);
        }

        return true;
      }

      // Si la partie n'a pas de joueur 2 ou si c'est le joueur 2 qui rejoint
      if (!game.player2 || (game.player2 && game.player2.id === playerId)) {
        // Si c'est un nouveau joueur 2
        if (!game.player2) {
          console.log(`Nouveau joueur 2 (${playerId}) rejoint la partie`);

          // Initialiser le joueur 2
          game.player2 = {
            id: playerId,
            health: {},
            attack: {},
            turns: {},
            activeBonus: {},
            deck: [],
            hand: [],
          };
        } else {
          console.log(`Le joueur 2 existant (${playerId}) rejoint à nouveau`);
        }

        // Distribuer les cartes aux joueurs si nécessaire
        let updateNeeded = false;

        // Vérifier/distribuer les cartes au joueur 1 si nécessaire
        if (!game.player1.hand || game.player1.hand.length === 0) {
          console.log("Distribution de cartes pour le joueur 1");
          updateNeeded = true;

          const persoCardsP1 = await cardManager.getRandomCards("perso", 5);
          const bonusCardsP1 = await cardManager.getRandomCards("bonus", 5);

          // Configuration des cartes joueur 1
          game.player1.hand = [...persoCardsP1, ...bonusCardsP1];
          persoCardsP1.forEach((card) => {
            game.player1.health[card.id] = parseInt(card.pointsdevie) || 100;
            game.player1.attack[card.id] = parseInt(card.forceattaque) || 30;
            game.player1.turns[card.id] = parseInt(card.tourattaque) || 2;
          });
        }

        // Vérifier/distribuer les cartes au joueur 2 si nécessaire
        if (!game.player2.hand || game.player2.hand.length === 0) {
          console.log("Distribution de cartes pour le joueur 2");
          updateNeeded = true;

          const persoCardsP2 = await cardManager.getRandomCards("perso", 5);
          const bonusCardsP2 = await cardManager.getRandomCards("bonus", 5);

          // Configuration des cartes joueur 2
          game.player2.hand = [...persoCardsP2, ...bonusCardsP2];
          persoCardsP2.forEach((card) => {
            game.player2.health[card.id] = parseInt(card.pointsdevie) || 100;
            game.player2.attack[card.id] = parseInt(card.forceattaque) || 30;
            game.player2.turns[card.id] = parseInt(card.tourattaque) || 2;
          });
        }

        // Mettre à jour dans la Map locale
        activeGames.set(gameId, game);

        // Mettre à jour l'état de la partie dans Supabase si nécessaire
        if (updateNeeded) {
          try {
            await supabase.from("games").update(game).eq("id", gameId);
            console.log("État de jeu mis à jour dans Supabase");
          } catch (err) {
            console.error("Erreur lors de la mise à jour dans Supabase:", err);
          }
        }

        // Notifier les joueurs via Socket.io
        if (io) {
          io.to(gameId).emit("gameStarted", {
            gameId,
            player1Id: game.player1.id,
            player2Id: game.player2.id,
            currentPlayer: game.currentPlayer,
          });
          console.log("Événement gameStarted émis");
        }

        return true;
      }

      console.log(
        "Impossible de rejoindre la partie (déjà complète ou autre problème)"
      );
      return false;
    },

    playTurn: async function (gameId, playerId, actions) {
      // Récupérer la partie
      let game = activeGames.get(gameId);

      if (!game) {
        // Si la partie n'est pas en mémoire, la chercher dans Supabase
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error || !data) {
          console.error("Partie introuvable:", error);
          return false;
        }

        game = data;
        activeGames.set(gameId, game);
      }

      if (!game || game.gameOver) {
        return false;
      }

      // Déterminer quel joueur joue
      const playerKey = game.player1.id === playerId ? "player1" : "player2";

      // Vérifier que c'est bien le tour du joueur
      if (game.currentPlayer !== playerKey) {
        return false;
      }

      const player = game[playerKey];
      const opponent = playerKey === "player1" ? game.player2 : game.player1;

      // Traiter les actions
      if (actions.bonus && actions.bonus.length > 0) {
        applyBonusEffects(player, opponent, actions.bonus);
      }

      if (actions.attack && actions.attack.targetId) {
        applyAttack(player, opponent, actions.attack, game);
      }

      // Vérifier les conditions de victoire
      if (checkWinCondition(game)) {
        game.gameOver = true;
        game.winner = playerKey;

        // Notifier les joueurs de la fin de partie
        if (io) {
          io.to(gameId).emit("gameOver", {
            gameId,
            winner: playerKey,
            player1Health: game.player1.health,
            player2Health: game.player2.health,
          });
        }
      } else {
        // Passer au joueur suivant
        game.currentPlayer =
          game.currentPlayer === "player1" ? "player2" : "player1";

        // Notifier du changement de tour
        if (io) {
          io.to(gameId).emit("turnChanged", {
            gameId,
            currentPlayer: game.currentPlayer,
            player1Health: game.player1.health,
            player2Health: game.player2.health,
          });
        }
      }

      // Mettre à jour dans la Map locale
      activeGames.set(gameId, game);

      // Mettre à jour l'état de la partie dans Supabase
      await supabase.from("games").update(game).eq("id", gameId);

      return true;
    },

    getGameState: async function (gameId) {
      // Récupérer la partie depuis la Map ou Supabase
      let game = activeGames.get(gameId);

      if (!game) {
        // Si la partie n'est pas en mémoire, la chercher dans Supabase
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error || !data) {
          console.error("Partie introuvable:", error);
          return null;
        }

        game = data;
        activeGames.set(gameId, game);
      }

      return game;
    },
  };
};

// Fonctions utilitaires

// Générer un identifiant unique pour la partie
function generateUniqueId() {
  // Générer un UUID v4 compatible avec Supabase
  return crypto.randomUUID();
}

// Appliquer les effets des bonus
function applyBonusEffects(player, opponent, bonusActions) {
  if (!bonusActions || !Array.isArray(bonusActions)) return;

  bonusActions.forEach((action) => {
    const { bonusId, targetId } = action;

    // Vérifier que la carte bonus existe dans la main du joueur
    const bonusIndex = player.hand.findIndex((card) => card.id === bonusId);
    if (bonusIndex === -1) return;

    const bonusCard = player.hand[bonusIndex];

    // Vérifier que la carte cible existe
    if (!player.health[targetId]) return;

    // Initialiser les bonus actifs pour cette carte s'ils n'existent pas
    if (!player.activeBonus[targetId]) {
      player.activeBonus[targetId] = [];
    }

    // Ajouter le bonus à la carte cible
    player.activeBonus[targetId].push({
      id: bonusId,
      value: parseInt(bonusCard.pourcentagebonus) || 0,
      remainingTurns: parseInt(bonusCard.tourbonus) || 1,
    });

    // Retirer la carte bonus de la main du joueur
    player.hand.splice(bonusIndex, 1);
  });
}

// Appliquer une attaque
function applyAttack(attacker, defender, attackAction, game) {
  const { cardId, targetId } = attackAction;

  // Vérifier que la carte d'attaque existe et a des tours restants
  if (
    !attacker.health[cardId] ||
    !attacker.turns[cardId] ||
    attacker.turns[cardId] <= 0
  ) {
    return;
  }

  // Vérifier que la cible existe
  if (!defender.health[targetId] || defender.health[targetId] <= 0) {
    return;
  }

  // Calculer la force d'attaque de base
  let attackPower = attacker.attack[cardId] || 0;

  // Appliquer les bonus actifs
  if (attacker.activeBonus[cardId] && attacker.activeBonus[cardId].length > 0) {
    attacker.activeBonus[cardId].forEach((bonus) => {
      // Augmenter l'attaque en fonction du bonus
      attackPower += attackPower * (bonus.value / 100);
    });
  }

  // Arrondir pour avoir un entier
  attackPower = Math.round(attackPower);

  // Réduire les points de vie de la cible
  defender.health[targetId] = Math.max(
    0,
    defender.health[targetId] - attackPower
  );

  // Réduire le nombre de tours d'attaque
  attacker.turns[cardId]--;

  // Mettre à jour les tours restants des bonus et supprimer ceux expirés
  Object.keys(attacker.activeBonus).forEach((cardId) => {
    attacker.activeBonus[cardId] = attacker.activeBonus[cardId].filter(
      (bonus) => {
        bonus.remainingTurns--;
        return bonus.remainingTurns > 0;
      }
    );

    // Si plus aucun bonus, supprimer la clé
    if (attacker.activeBonus[cardId].length === 0) {
      delete attacker.activeBonus[cardId];
    }
  });
}

// Vérifier les conditions de victoire
function checkWinCondition(game) {
  // Vérifier si un joueur a perdu toutes ses cartes (santé à 0)
  const player1Alive = Object.values(game.player1.health).some(
    (health) => health > 0
  );
  const player2Alive = Object.values(game.player2.health).some(
    (health) => health > 0
  );

  // Vérifier si un joueur a encore des tours d'attaque disponibles
  const player1CanAttack = Object.values(game.player1.turns).some(
    (turns) => turns > 0
  );
  const player2CanAttack = Object.values(game.player2.turns).some(
    (turns) => turns > 0
  );

  // Si les deux joueurs sont en vie mais ne peuvent plus attaquer, c'est un match nul
  if (player1Alive && player2Alive && !player1CanAttack && !player2CanAttack) {
    // Calculer le total des points de vie restants
    const player1TotalHealth = Object.values(game.player1.health).reduce(
      (sum, health) => sum + health,
      0
    );
    const player2TotalHealth = Object.values(game.player2.health).reduce(
      (sum, health) => sum + health,
      0
    );

    // Le gagnant est celui avec le plus de points de vie
    if (player1TotalHealth > player2TotalHealth) {
      game.winner = "player1";
    } else if (player2TotalHealth > player1TotalHealth) {
      game.winner = "player2";
    } else {
      game.winner = "draw"; // Match nul
    }

    return true;
  }

  // Si un joueur n'a plus de personnages en vie, l'autre gagne
  if (!player1Alive) {
    game.winner = "player2";
    return true;
  }

  if (!player2Alive) {
    game.winner = "player1";
    return true;
  }

  // Sinon, la partie continue
  return false;
}
