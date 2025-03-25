require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials are missing in environment variables");
}

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour obtenir l'URL d'une image de carte
const getCardImageUrl = (type, cardId) => {
  // Construire l'URL vers l'image dans le bucket Supabase
  const bucket = "images";
  const folder = type; // 'perso' ou 'bonus'
  const filename = `${type === "perso" ? "P" : "B"}${cardId
    .toString()
    .padStart(1, "0")}.png`;

  // Générer l'URL publique
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(`${folder}/${filename}`);

  return publicUrl;
};

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

module.exports = {
  supabase,
  getCardImageUrl,
  storeCardSVG,
};
