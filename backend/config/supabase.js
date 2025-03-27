require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

function getImageUrl(type, id) {
  const prefix = type === "perso" ? "P" : "B";
  return `${supabaseUrl}/storage/v1/object/public/images/${type}/${prefix}${id}.png`;
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

console.log("========== DÉMARRAGE SERVER.JS VERSION PRINCIPALE ==========");

module.exports = {
  supabase,
  getImageUrl,
  storeCardSVG,
};
