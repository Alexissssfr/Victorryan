const supabase = require("../config/supabase");
const cardManager = require("./cardManager");
const crypto = require("crypto");

// Map pour stocker les parties actives en mémoire
const activeGames = new Map();

// Fonction pour gérer les parties avec Socket.io
module.exports = function (io) {
  return {
    createGame: async function (playerId) {
      try {
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

        // Sauvegarder dans Supabase - table games
        try {
          const { error } = await supabase.from("games").insert({
            id: gameId,
            host_name: playerId,
            status: "waiting",
            created_at: new Date().toISOString(),
            current_state: {
              player1: gameState.player1,
              currentPlayer: gameState.currentPlayer,
              gameOver: gameState.gameOver,
            },
          });

          if (error) {
            console.error(
              "Erreur Supabase lors de la création (games):",
              error
            );
          } else {
            console.log(`Partie ${gameId} créée dans Supabase (games)`);

            // Ajouter le joueur à la table players
            const { error: playerError } = await supabase
              .from("players")
              .insert({
                id: crypto.randomUUID(),
                game_id: gameId,
                name: playerId,
              });

            if (playerError) {
              console.error("Erreur lors de l'ajout du joueur:", playerError);
            }
          }
        } catch (dbError) {
          console.error("Exception Supabase lors de la création:", dbError);
        }

        return gameId;
      } catch (error) {
        console.error("Erreur lors de la création de la partie:", error);
        throw error;
      }
    },

    joinGame: async function (gameId, playerId) {
      console.log(
        `Tentative de rejoindre la partie ${gameId} pour le joueur ${playerId}`
      );

      try {
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

            // Reconstruire l'état du jeu à partir des données Supabase
            game = {
              id: data.id,
              player1: {
                id: data.host_name,
                health: {},
                attack: {},
                turns: {},
                activeBonus: {},
                deck: [],
                hand: [],
              },
              player2: null,
              currentPlayer: "player1",
              gameOver: data.status === "finished",
              winner: null,
              createdAt: data.created_at,
            };

            // Si current_state existe, incorporer ces données
            if (data.current_state) {
              if (data.current_state.player1) {
                game.player1 = data.current_state.player1;
              }
              if (data.current_state.player2) {
                game.player2 = data.current_state.player2;
              }
              if (data.current_state.currentPlayer) {
                game.currentPlayer = data.current_state.currentPlayer;
              }
              if (data.current_state.gameOver !== undefined) {
                game.gameOver = data.current_state.gameOver;
              }
              if (data.current_state.winner) {
                game.winner = data.current_state.winner;
              }
            }

            // Si opponent_name existe, initialiser player2
            if (data.opponent_name) {
              game.player2 = game.player2 || {
                id: data.opponent_name,
                health: {},
                attack: {},
                turns: {},
                activeBonus: {},
                deck: [],
                hand: [],
              };
            }

            activeGames.set(gameId, game);
            console.log("Partie récupérée depuis Supabase:", gameId);

            // Récupérer les cartes de la partie
            try {
              const { data: cardsData, error: cardsError } = await supabase
                .from("game_cards")
                .select("*")
                .eq("game_id", gameId);

              if (!cardsError && cardsData && cardsData.length > 0) {
                console.log(
                  `Récupéré ${cardsData.length} cartes pour la partie ${gameId}`
                );

                // Reconstruire les mains des joueurs
                cardsData.forEach((cardData) => {
                  const playerKey =
                    cardData.player_name === game.player1.id
                      ? "player1"
                      : cardData.player_name === game.player2?.id
                      ? "player2"
                      : null;

                  if (playerKey && game[playerKey]) {
                    // Récupérer les données de la carte depuis le gestionnaire de cartes
                    const cardInfo = cardManager.getCardById(
                      cardData.card_type,
                      cardData.card_id
                    );

                    if (cardInfo) {
                      // Ajouter à la main du joueur si pas déjà présente
                      const cardExists = game[playerKey].hand.some(
                        (c) => c.id === cardInfo.id
                      );
                      if (!cardExists) {
                        game[playerKey].hand.push(cardInfo);
                      }

                      // Mettre à jour les statistiques si current_state existe
                      if (cardData.current_state) {
                        if (cardData.current_state.health !== undefined) {
                          game[playerKey].health[cardInfo.id] =
                            cardData.current_state.health;
                        }
                        if (cardData.current_state.attack !== undefined) {
                          game[playerKey].attack[cardInfo.id] =
                            cardData.current_state.attack;
                        }
                        if (cardData.current_state.turns !== undefined) {
                          game[playerKey].turns[cardInfo.id] =
                            cardData.current_state.turns;
                        }
                        if (cardData.current_state.activeBonus) {
                          game[playerKey].activeBonus[cardInfo.id] =
                            cardData.current_state.activeBonus;
                        }
                      }
                    }
                  }
                });
              }
            } catch (cardsErr) {
              console.error(
                "Erreur lors de la récupération des cartes:",
                cardsErr
              );
            }
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
            const persoCards = cardManager.getRandomCards("perso", 5);
            const bonusCards = cardManager.getRandomCards("bonus", 5);

            game.player1.hand = [...persoCards, ...bonusCards];

            // Initialiser les statistiques des cartes
            persoCards.forEach((card) => {
              game.player1.health[card.id] = parseInt(card.pointsdevie) || 100;
              game.player1.attack[card.id] = parseInt(card.forceattaque) || 30;
              game.player1.turns[card.id] = parseInt(card.tourattaque) || 2;
            });

            // Sauvegarder les cartes dans Supabase
            await savePlayerCards(game.id, playerId, [
              ...persoCards,
              ...bonusCards,
            ]);

            // Mettre à jour l'état du jeu
            await updateGameState(game);
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

            // Mettre à jour le statut dans Supabase
            try {
              const { error } = await supabase
                .from("games")
                .update({
                  opponent_name: playerId,
                  status: "active",
                  started_at: new Date().toISOString(),
                })
                .eq("id", gameId);

              if (error) {
                console.error(
                  "Erreur lors de la mise à jour du joueur 2:",
                  error
                );
              } else {
                // Ajouter le joueur à la table players
                const { error: playerError } = await supabase
                  .from("players")
                  .insert({
                    id: crypto.randomUUID(),
                    game_id: gameId,
                    name: playerId,
                  });

                if (playerError) {
                  console.error(
                    "Erreur lors de l'ajout du joueur 2:",
                    playerError
                  );
                }
              }
            } catch (err) {
              console.error(
                "Exception lors de la mise à jour du joueur 2:",
                err
              );
            }
          } else {
            console.log(`Le joueur 2 existant (${playerId}) rejoint à nouveau`);
          }

          // Distribuer les cartes aux joueurs si nécessaire
          let updateNeeded = false;

          // Vérifier/distribuer les cartes au joueur 1 si nécessaire
          if (!game.player1.hand || game.player1.hand.length === 0) {
            console.log("Distribution de cartes pour le joueur 1");
            updateNeeded = true;

            const persoCardsP1 = cardManager.getRandomCards("perso", 5);
            const bonusCardsP1 = cardManager.getRandomCards("bonus", 5);

            // Configuration des cartes joueur 1
            game.player1.hand = [...persoCardsP1, ...bonusCardsP1];
            persoCardsP1.forEach((card) => {
              game.player1.health[card.id] = parseInt(card.pointsdevie) || 100;
              game.player1.attack[card.id] = parseInt(card.forceattaque) || 30;
              game.player1.turns[card.id] = parseInt(card.tourattaque) || 2;
            });

            // Sauvegarder les cartes dans Supabase
            await savePlayerCards(game.id, game.player1.id, [
              ...persoCardsP1,
              ...bonusCardsP1,
            ]);
          }

          // Vérifier/distribuer les cartes au joueur 2 si nécessaire
          if (!game.player2.hand || game.player2.hand.length === 0) {
            console.log("Distribution de cartes pour le joueur 2");
            updateNeeded = true;

            const persoCardsP2 = cardManager.getRandomCards("perso", 5);
            const bonusCardsP2 = cardManager.getRandomCards("bonus", 5);

            // Configuration des cartes joueur 2
            game.player2.hand = [...persoCardsP2, ...bonusCardsP2];
            persoCardsP2.forEach((card) => {
              game.player2.health[card.id] = parseInt(card.pointsdevie) || 100;
              game.player2.attack[card.id] = parseInt(card.forceattaque) || 30;
              game.player2.turns[card.id] = parseInt(card.tourattaque) || 2;
            });

            // Sauvegarder les cartes dans Supabase
            await savePlayerCards(game.id, game.player2.id, [
              ...persoCardsP2,
              ...bonusCardsP2,
            ]);
          }

          // Mettre à jour dans la Map locale
          activeGames.set(gameId, game);

          // Mettre à jour l'état de la partie dans Supabase si nécessaire
          if (updateNeeded) {
            await updateGameState(game);
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
      } catch (error) {
        console.error(
          "Erreur lors de la tentative de rejoindre la partie:",
          error
        );
        return false;
      }
    },

    playTurn: async function (gameId, playerId, actions) {
      try {
        // Récupérer la partie
        let game = activeGames.get(gameId);

        if (!game) {
          // Vous pouvez réutiliser la logique de récupération de joinGame ici
          console.log(
            "Partie non trouvée en mémoire, tentative de récupération depuis Supabase"
          );
          return false;
        }

        if (!game || game.gameOver) {
          console.log("Partie terminée ou invalide");
          return false;
        }

        // Déterminer quel joueur joue
        const playerKey = game.player1.id === playerId ? "player1" : "player2";

        // Vérifier que c'est bien le tour du joueur
        if (game.currentPlayer !== playerKey) {
          console.log(`Ce n'est pas le tour de ${playerKey}`);
          return false;
        }

        const player = game[playerKey];
        const opponent = playerKey === "player1" ? game.player2 : game.player1;

        console.log(`Tour de ${playerKey} - Actions:`, actions);

        // Traiter les actions
        if (actions.bonus && actions.bonus.length > 0) {
          applyBonusEffects(player, opponent, actions.bonus);
          console.log("Bonus appliqués");
        }

        if (actions.attack && actions.attack.targetId) {
          applyAttack(player, opponent, actions.attack, game);
          console.log("Attaque effectuée");
        }

        // Vérifier les conditions de victoire
        if (checkWinCondition(game)) {
          game.gameOver = true;
          game.winner = playerKey;

          console.log(`Partie terminée, gagnant: ${game.winner}`);

          // Mettre à jour le statut de la partie dans Supabase
          try {
            const { error } = await supabase
              .from("games")
              .update({
                status: "finished",
                finished_at: new Date().toISOString(),
              })
              .eq("id", gameId);

            if (error) {
              console.error(
                "Erreur lors de la mise à jour du statut de fin de partie:",
                error
              );
            }
          } catch (err) {
            console.error(
              "Exception lors de la mise à jour du statut de fin de partie:",
              err
            );
          }

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
          // Passer au joueur suivant si l'action n'est pas "endTurn: false"
          if (!actions.endTurn === false) {
            game.currentPlayer =
              game.currentPlayer === "player1" ? "player2" : "player1";
            console.log(`Tour passé à ${game.currentPlayer}`);
          }

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
        await updateGameState(game);

        // Mettre à jour les cartes dans Supabase
        await updateGameCards(game);

        return true;
      } catch (error) {
        console.error("Erreur lors du tour de jeu:", error);
        return false;
      }
    },

    getGameState: async function (gameId) {
      try {
        // Récupérer la partie depuis la Map ou Supabase
        let game = activeGames.get(gameId);

        if (!game) {
          // Si la partie n'est pas en mémoire, utiliser la même logique de récupération que joinGame
          console.log(
            "État du jeu non trouvé en mémoire, tentative de récupération depuis Supabase"
          );

          try {
            // Vous pouvez appeler joinGame avec un ID de joueur temporaire pour récupérer l'état
            // ou implémenter une version simplifiée de la logique ici
            return null;
          } catch (err) {
            console.error(
              "Exception lors de la récupération de l'état du jeu:",
              err
            );
            return null;
          }
        }

        return game;
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'état de la partie:",
          error
        );
        return null;
      }
    },
  };
};

// Fonction utilitaire pour sauvegarder les cartes d'un joueur
async function savePlayerCards(gameId, playerId, cards) {
  try {
    for (const card of cards) {
      const cardState = {
        health:
          card.type === "perso" ? parseInt(card.pointsdevie) || 100 : null,
        attack:
          card.type === "perso" ? parseInt(card.forceattaque) || 30 : null,
        turns: card.type === "perso" ? parseInt(card.tourattaque) || 2 : null,
      };

      const { error } = await supabase.from("game_cards").insert({
        id: crypto.randomUUID(),
        game_id: gameId,
        player_name: playerId,
        card_type: card.type,
        card_id: card.id,
        current_state: cardState,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error(
          `Erreur lors de la sauvegarde de la carte ${card.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Exception lors de la sauvegarde des cartes:", error);
  }
}

// Fonction utilitaire pour mettre à jour l'état du jeu
async function updateGameState(game) {
  try {
    const { error } = await supabase
      .from("games")
      .update({
        current_state: {
          player1: game.player1,
          player2: game.player2,
          currentPlayer: game.currentPlayer,
          gameOver: game.gameOver,
          winner: game.winner,
        },
      })
      .eq("id", game.id);

    if (error) {
      console.error("Erreur lors de la mise à jour de l'état du jeu:", error);
    }
  } catch (error) {
    console.error("Exception lors de la mise à jour de l'état du jeu:", error);
  }
}

// Fonction utilitaire pour mettre à jour les cartes du jeu
async function updateGameCards(game) {
  try {
    // Mettre à jour les cartes du joueur 1
    for (const card of game.player1.hand) {
      if (card.type === "perso") {
        const cardState = {
          health: game.player1.health[card.id] || 0,
          attack: game.player1.attack[card.id] || 0,
          turns: game.player1.turns[card.id] || 0,
          activeBonus: game.player1.activeBonus[card.id] || [],
        };

        const { error } = await supabase
          .from("game_cards")
          .update({ current_state: cardState })
          .eq("game_id", game.id)
          .eq("player_name", game.player1.id)
          .eq("card_id", card.id);

        if (error) {
          console.error(
            `Erreur lors de la mise à jour de la carte ${card.id}:`,
            error
          );
        }
      }
    }

    // Mettre à jour les cartes du joueur 2 s'il existe
    if (game.player2) {
      for (const card of game.player2.hand) {
        if (card.type === "perso") {
          const cardState = {
            health: game.player2.health[card.id] || 0,
            attack: game.player2.attack[card.id] || 0,
            turns: game.player2.turns[card.id] || 0,
            activeBonus: game.player2.activeBonus[card.id] || [],
          };

          const { error } = await supabase
            .from("game_cards")
            .update({ current_state: cardState })
            .eq("game_id", game.id)
            .eq("player_name", game.player2.id)
            .eq("card_id", card.id);

          if (error) {
            console.error(
              `Erreur lors de la mise à jour de la carte ${card.id}:`,
              error
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Exception lors de la mise à jour des cartes:", error);
  }
}

// Fonctions utilitaires existantes inchangées

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
    if (bonusIndex === -1) {
      console.warn(`Bonus ${bonusId} non trouvé dans la main du joueur`);
      return;
    }

    const bonusCard = player.hand[bonusIndex];

    // Vérifier que la carte cible existe
    if (!player.health[targetId]) {
      console.warn(`Carte cible ${targetId} non trouvée`);
      return;
    }

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

    console.log(
      `Bonus ${bonusId} appliqué à ${targetId} - Valeur: ${bonusCard.pourcentagebonus}%, Tours: ${bonusCard.tourbonus}`
    );

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
    console.warn(`Carte d'attaque ${cardId} invalide ou sans tours restants`);
    return;
  }

  // Vérifier que la cible existe
  if (!defender.health[targetId] || defender.health[targetId] <= 0) {
    console.warn(`Cible ${targetId} invalide ou déjà vaincue`);
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

  console.log(
    `Attaque de ${cardId} sur ${targetId} - Dégâts: ${attackPower}, PV restants: ${defender.health[targetId]}`
  );

  // Réduire le nombre de tours d'attaque
  attacker.turns[cardId]--;

  // Mettre à jour les tours restants des bonus et supprimer ceux expirés
  Object.keys(attacker.activeBonus || {}).forEach((cardId) => {
    if (!attacker.activeBonus[cardId]) return;

    attacker.activeBonus[cardId] = attacker.activeBonus[cardId].filter(
      (bonus) => {
        bonus.remainingTurns--;
        const active = bonus.remainingTurns > 0;
        if (!active) {
          console.log(`Bonus ${bonus.id} sur ${cardId} expiré`);
        }
        return active;
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
  if (!game.player1 || !game.player2) {
    console.warn("Impossible de vérifier la victoire: joueurs manquants");
    return false;
  }

  // Vérifier si un joueur a perdu toutes ses cartes (santé à 0)
  const player1Alive = Object.values(game.player1.health || {}).some(
    (health) => health > 0
  );
  const player2Alive = Object.values(game.player2.health || {}).some(
    (health) => health > 0
  );

  // Vérifier si un joueur a encore des tours d'attaque disponibles
  const player1CanAttack = Object.values(game.player1.turns || {}).some(
    (turns) => turns > 0
  );
  const player2CanAttack = Object.values(game.player2.turns || {}).some(
    (turns) => turns > 0
  );

  // Si les deux joueurs sont en vie mais ne peuvent plus attaquer, c'est un match nul
  if (player1Alive && player2Alive && !player1CanAttack && !player2CanAttack) {
    // Calculer le total des points de vie restants
    const player1TotalHealth = Object.values(game.player1.health || {}).reduce(
      (sum, health) => sum + health,
      0
    );
    const player2TotalHealth = Object.values(game.player2.health || {}).reduce(
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

    console.log(
      `Match nul résolu par les PV: Player1=${player1TotalHealth}, Player2=${player2TotalHealth}, Winner=${game.winner}`
    );
    return true;
  }

  // Si un joueur n'a plus de personnages en vie, l'autre gagne
  if (!player1Alive) {
    game.winner = "player2";
    console.log(
      "Le joueur 1 n'a plus de personnages en vie, le joueur 2 gagne"
    );
    return true;
  }

  if (!player2Alive) {
    game.winner = "player1";
    console.log(
      "Le joueur 2 n'a plus de personnages en vie, le joueur 1 gagne"
    );
    return true;
  }

  // Sinon, la partie continue
  return false;
}
