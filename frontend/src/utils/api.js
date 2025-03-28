// URL de base de l'API
const API_BASE_URL = "/api";

/**
 * Fonction pour appeler l'API avec fetch
 * @param {string} endpoint - Point d'entrée de l'API
 * @param {string} method - Méthode HTTP
 * @param {object} data - Données pour les requêtes POST/PUT
 * @returns {Promise} - Promesse avec les données de la réponse
 */
async function callApi(endpoint, method = "GET", data = null) {
  const url = `${API_BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Une erreur est survenue");
    }

    return await response.json();
  } catch (error) {
    console.error(`Erreur API (${endpoint}):`, error);
    throw error;
  }
}

/**
 * API du jeu de cartes
 */
export const api = {
  // Créer une nouvelle partie
  createGame: (playerName) => callApi("/games", "POST", { playerName }),

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
