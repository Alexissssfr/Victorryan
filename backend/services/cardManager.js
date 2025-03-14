const fs = require("fs");
const path = require("path");

// Charger les données des cartes depuis les fichiers JSON
let persoData;
let bonusData;

try {
  const personnagesPath = path.join(__dirname, "../../stock/personnages.json");
  const bonusPath = path.join(__dirname, "../../stock/bonus.json");

  console.log("Chargement des cartes depuis:", personnagesPath);
  console.log("Chargement des bonus depuis:", bonusPath);

  persoData = JSON.parse(fs.readFileSync(personnagesPath, "utf8"));
  bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf8"));

  console.log(
    `Chargé ${persoData.length} cartes personnages et ${bonusData.length} cartes bonus`
  );
} catch (error) {
  console.error("Erreur lors du chargement des données des cartes:", error);
  // Initialiser avec des tableaux vides en cas d'erreur
  persoData = [];
  bonusData = [];
}

// Méthode pour récupérer des cartes aléatoires d'un type spécifique
function getRandomCards(type, count) {
  // Déterminer quelle source de données utiliser
  const data = type === "perso" ? persoData : bonusData;

  // S'assurer que count ne dépasse pas le nombre de cartes disponibles
  count = Math.min(count, data.length);

  // Vérifier si les données sont disponibles
  if (data.length === 0) {
    console.warn(`Aucune donnée disponible pour le type ${type}`);
    return [];
  }

  // Copier le tableau pour ne pas modifier l'original
  const shuffled = [...data];

  // Mélanger le tableau
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Ajouter l'URL de l'image pour chaque carte
  return shuffled.slice(0, count).map((card) => {
    // Détermine quel type de SVG utiliser
    const svgType = type === "perso" ? "svg_perso" : "svg_bonus";

    // Construire l'URL du SVG
    card.imageUrl = `/stock/${svgType}/${card.id}.svg`;

    // Ajouter le type pour faciliter la gestion côté client
    card.type = type;

    return card;
  });
}

// Méthode pour récupérer une carte spécifique par son ID
function getCardById(type, id) {
  const data = type === "perso" ? persoData : bonusData;
  const card = data.find((card) => card.id === id);

  if (card) {
    const svgType = type === "perso" ? "svg_perso" : "svg_bonus";
    card.imageUrl = `/stock/${svgType}/${card.id}.svg`;
    card.type = type;
  }

  return card;
}

// Méthode pour précharger toutes les données SVG
function preloadSVGData() {
  const svgData = {
    perso: {},
    bonus: {},
  };

  try {
    // Charger les SVG des personnages
    persoData.forEach((card) => {
      try {
        const svgPath = path.join(
          __dirname,
          `../../stock/svg_perso/${card.id}.svg`
        );
        if (fs.existsSync(svgPath)) {
          svgData.perso[card.id] = fs.readFileSync(svgPath, "utf8");
        } else {
          console.warn(`SVG non trouvé pour ${card.id} à ${svgPath}`);
        }
      } catch (err) {
        console.error(`Erreur lors du chargement du SVG pour ${card.id}:`, err);
      }
    });

    // Charger les SVG des bonus
    bonusData.forEach((card) => {
      try {
        const svgPath = path.join(
          __dirname,
          `../../stock/svg_bonus/${card.id}.svg`
        );
        if (fs.existsSync(svgPath)) {
          svgData.bonus[card.id] = fs.readFileSync(svgPath, "utf8");
        } else {
          console.warn(`SVG non trouvé pour ${card.id} à ${svgPath}`);
        }
      } catch (err) {
        console.error(`Erreur lors du chargement du SVG pour ${card.id}:`, err);
      }
    });
  } catch (err) {
    console.error("Erreur lors du préchargement des SVG:", err);
  }

  return svgData;
}

// Fonction pour recharger les données (utile pour les tests ou mises à jour)
function reloadCardData() {
  try {
    persoData = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../stock/personnages.json"),
        "utf8"
      )
    );
    bonusData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../stock/bonus.json"), "utf8")
    );
    console.log(
      `Rechargé ${persoData.length} cartes personnages et ${bonusData.length} cartes bonus`
    );
  } catch (error) {
    console.error("Erreur lors du rechargement des données des cartes:", error);
  }

  return { persoCount: persoData.length, bonusCount: bonusData.length };
}

module.exports = {
  getRandomCards,
  getCardById,
  preloadSVGData,
  reloadCardData,
};
