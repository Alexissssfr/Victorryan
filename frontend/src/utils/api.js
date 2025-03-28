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
  const url = `${API_BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    // Ajouter credentials pour les requêtes CORS
    credentials: "include",
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const requestId =
    Date.now().toString(36) + Math.random().toString(36).substr(2);

  try {
    console.log(
      `📡 [${requestId}] Appel API: ${method} ${url}`,
      data ? data : ""
    );

    // Ajouter un timeout pour éviter les requêtes qui ne répondent jamais
    const timeoutId = setTimeout(() => {
      console.error(
        `⏱️ [${requestId}] Timeout de la requête API: ${method} ${url}`
      );
    }, 15000); // 15 secondes de timeout

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    // Afficher le code d'état HTTP pour le débogage
    console.log(`🔄 [${requestId}] Statut réponse: ${response.status}`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {
          error: `Erreur ${response.status}: ${response.statusText}`,
        };
      }

      console.error(`❌ [${requestId}] Erreur API détaillée:`, errorData);

      // Créer une erreur enrichie avec plus d'informations
      const error = new Error(
        errorData.error || `Erreur ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      error.statusText = response.statusText;
      error.responseData = errorData;
      error.endpoint = endpoint;

      throw error;
    }

    const responseData = await response.json();
    console.log(`✅ [${requestId}] Réponse API:`, responseData);
    return responseData;
  } catch (error) {
    // Vérifier si c'est une erreur réseau
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      console.error(
        `🌐 [${requestId}] Erreur réseau lors de l'appel API: ${method} ${url}`
      );
      const networkError = new Error(
        "Impossible de se connecter au serveur. Vérifiez votre connexion Internet."
      );
      networkError.isNetworkError = true;
      networkError.originalError = error;
      throw networkError;
    }

    // Si c'est une erreur déjà traitée, la propager
    if (error.status) {
      throw error;
    }

    // Erreur non traitée
    console.error(`❌ [${requestId}] Erreur API (${endpoint}):`, error);
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
