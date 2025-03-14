const fs = require("fs");
const path = require("path");

// Variables pour stocker les données des cartes
let persoData = [];
let bonusData = [];

// Fonction pour charger les données depuis les fichiers JSON
function loadCardData() {
  try {
    const persoPath = path.join(__dirname, "../../stock/personnages.json");
    const bonusPath = path.join(__dirname, "../../stock/bonus.json");

    console.log("Tentative de chargement des personnages depuis:", persoPath);

    if (fs.existsSync(persoPath)) {
      persoData = JSON.parse(fs.readFileSync(persoPath, "utf8"));
      console.log(`${persoData.length} personnages chargés avec succès`);
    } else {
      console.error("Fichier personnages.json introuvable à", persoPath);
      // Générer des données fictives si le fichier n'existe pas
      persoData = generateDummyData("perso", 10);
    }

    if (fs.existsSync(bonusPath)) {
      bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf8"));
      console.log(`${bonusData.length} bonus chargés avec succès`);
    } else {
      console.error("Fichier bonus.json introuvable à", bonusPath);
      // Générer des données fictives si le fichier n'existe pas
      bonusData = generateDummyData("bonus", 10);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données des cartes:", error);
    // Utiliser des données fictives en cas d'erreur
    persoData = generateDummyData("perso", 10);
    bonusData = generateDummyData("bonus", 10);
  }
}

// Générer des données de test
function generateDummyData(type, count) {
  console.log(
    `Génération de ${count} cartes ${type} factices pour le développement`
  );

  const dummyCards = [];

  for (let i = 1; i <= count; i++) {
    if (type === "perso") {
      dummyCards.push({
        id: `P${i}`,
        nomcarteperso: `Personnage Test ${i}`,
        pointsdevie: "100",
        forceattaque: "30",
        tourattaque: "2",
        nomdupouvoir: `Pouvoir Test ${i}`,
        description: "Description du pouvoir de test",
        type: "perso",
      });
    } else {
      dummyCards.push({
        id: `B${i}`,
        nomcartebonus: `Bonus Test ${i}`,
        pourcentagebonus: "20",
        tourbonus: "2",
        nomdupouvoir: `Effet Test ${i}`,
        description: "Description de l'effet de test",
        type: "bonus",
      });
    }
  }

  return dummyCards;
}

// Charger les données au démarrage
loadCardData();

// Ajouter cette fonction pour charger les SVG
async function loadCardSVG(type, cardId) {
  try {
    const svgType = type === "perso" ? "svg_perso" : "svg_bonus";
    const svgPath = path.join(
      __dirname,
      `../../stock/${svgType}/${cardId}.svg`
    );

    console.log(`Tentative de chargement du SVG: ${svgPath}`);

    if (fs.existsSync(svgPath)) {
      const svgContent = fs.readFileSync(svgPath, "utf8");
      console.log(
        `SVG chargé avec succès pour ${cardId} (${svgContent.length} caractères)`
      );
      return svgContent;
    } else {
      console.error(`SVG non trouvé: ${svgPath}`);
      // Retourner un SVG par défaut
      return `<svg width="100" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ddd"/>
        <text x="50%" y="50%" text-anchor="middle">${cardId}</text>
      </svg>`;
    }
  } catch (error) {
    console.error(`Erreur lors du chargement du SVG pour ${cardId}:`, error);
    return null;
  }
}

// Modifier la fonction getRandomCards pour inclure les SVG
async function getRandomCards(type, count) {
  const data = type === "perso" ? persoData : bonusData;
  count = Math.min(count, data.length);

  if (data.length === 0) {
    console.warn(`Aucune donnée disponible pour le type ${type}`);
    return [];
  }

  const shuffled = [...data];
  // Mélanger le tableau...

  const selectedCards = shuffled.slice(0, count);

  // Charger les SVG pour chaque carte
  const cardsWithSVG = await Promise.all(
    selectedCards.map(async (card) => {
      const svg = await loadCardSVG(type, card.id);
      return {
        ...card,
        type,
        imageUrl: `/stock/${type === "perso" ? "svg_perso" : "svg_bonus"}/${
          card.id
        }.svg`,
        svgContent: svg,
      };
    })
  );

  return cardsWithSVG;
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

// Recharger les données (utile pour les tests)
function reloadCardData() {
  loadCardData();
  return { persoCount: persoData.length, bonusCount: bonusData.length };
}

module.exports = {
  getRandomCards,
  getCardById,
  reloadCardData,
};
