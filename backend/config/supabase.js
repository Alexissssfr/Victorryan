const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

// Charger les variables d'environnement
dotenv.config();

console.log(
  "========== DÉMARRAGE AVEC CONFIGURATION SUPABASE CORRECTE =========="
);

// Récupérer les informations de connexion à Supabase
const supabaseUrl =
  process.env.SUPABASE_URL || "https://prcpnttqrxrymqecgksm.supabase.co";
const supabaseKey =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByY3BudHRxcnhyeW1xZWNna3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEyMjE2ODgsImV4cCI6MjAyNjc5NzY4OH0.wCu-CVxkTHr4dBnlzGUBhj63e1L2PqQIpZw7S8zI7Yo";

// Vérifier si les informations de connexion sont disponibles
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Les informations de connexion à Supabase sont manquantes dans le fichier .env"
  );
}

// Créer un client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fonction pour générer l'URL d'une image à partir de son type et de son ID
 * @param {string} type - Type de l'image (perso, bonus)
 * @param {string} id - ID de l'image
 * @returns {string} - URL de l'image
 */
function getImageUrl(type, id) {
  // S'assurer que l'ID est correctement formaté (avec extension .png si nécessaire)
  let formattedId = id;
  if (!formattedId.includes(".")) {
    formattedId = formattedId + ".png";
  }

  // Déterminer le dossier en fonction du type
  const folder = type === "perso" ? "personnages" : "bonus";

  // Construire l'URL d'image Supabase
  return `${supabaseUrl}/storage/v1/object/public/victorryan/${folder}/${formattedId}`;
}

// Ajouter une fonction pour stocker les SVG
async function storeCardSVG(gameId, playerId, cardId, svgContent) {
  try {
    const { error } = await supabase
      .from("game_cards")
      .update({
        svg_content: svgContent,
      })
      .match({ game_id: gameId, player_name: playerId, card_id: cardId });

    if (error) {
      console.error("Erreur lors du stockage du SVG:", error);
    }
  } catch (err) {
    console.error("Exception lors du stockage du SVG:", err);
  }
}

// Exporter le client et la fonction
module.exports = {
  supabase,
  getImageUrl,
  storeCardSVG,
};
