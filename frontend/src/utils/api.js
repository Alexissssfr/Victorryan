// URL de base de l'API
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";

/**
 * Fonction pour appeler l'API avec fetch
 * @param {string} endpoint - Point d'entrée de l'API
 * @param {string} method - Méthode HTTP
 * @param {object} data - Données pour les requêtes POST/PUT
 * @returns {Promise} - Promesse avec les données de la réponse
 */
async function callApi(endpoint, method = "GET", data = null) {
  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:10000/api"
      : "/api";

  console.log(`Appel API: ${method} ${API_URL}${endpoint}`);

  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    console.log(`Réponse API ${endpoint}:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur API (${response.status}):`, errorText);
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Erreur API ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API du jeu de cartes
 */
export const api = {
  // Créer une nouvelle partie
  createGame: async (playerName) => {
    try {
      const result = await callApi("/games", "POST", { playerName });
      if (!result.gameId) {
        throw new Error("L'ID de partie est manquant dans la réponse");
      }
      console.log("Partie créée avec succès, ID:", result.gameId);
      return result;
    } catch (error) {
      console.error("Erreur lors de la création de la partie:", error);
      throw error;
    }
  },

  // Rejoindre une partie existante
  joinGame: (gameId, playerName) =>
    callApi(`/games/${gameId}/join`, "POST", { playerName }),

  // Récupérer l'état d'une partie
  getGameState: (gameId) => callApi(`/games/${gameId}`),

  // Récupérer toutes les cartes d'un type
  getAllCards: (type) => callApi(`/cards/${type}`),

  // Récupérer une carte par son ID
  getCardById: (type, id) => callApi(`/cards/${type}/${id}`),

  // Récupérer l'URL d'une image de carte
  getCardImageUrl: (type, id) => callApi(`/cards/image/${type}/${id}`),
};
