const fs = require("fs");
const path = require("path");

// Définir des données par défaut au cas où les fichiers ne peuvent pas être chargés
let persoData = [];
let bonusData = [];

// Fonction pour charger les données à partir des fichiers JSON
function loadCardData() {
  try {
    // Chemin relatif depuis la racine du projet
    const persoPath = path.join(__dirname, "../../stock/personnages.json");
    const bonusPath = path.join(__dirname, "../../stock/bonus.json");

    console.log("Tentative de chargement des personnages depuis:", persoPath);
    console.log("Tentative de chargement des bonus depuis:", bonusPath);

    try {
      if (fs.existsSync(persoPath)) {
        persoData = JSON.parse(fs.readFileSync(persoPath, "utf8"));
        console.log(`${persoData.length} personnages chargés avec succès`);
      } else {
        console.error("Fichier personnages.json introuvable");
      }
    } catch (e) {
      console.error("Erreur lors du chargement des personnages:", e);
    }

    try {
      if (fs.existsSync(bonusPath)) {
        bonusData = JSON.parse(fs.readFileSync(bonusPath, "utf8"));
        console.log(`${bonusData.length} bonus chargés avec succès`);
      } else {
        console.error("Fichier bonus.json introuvable");
      }
    } catch (e) {
      console.error("Erreur lors du chargement des bonus:", e);
    }

    // Si aucune donnée n'a été chargée, utiliser des données fictives pour le développement
    if (persoData.length === 0) {
      console.warn("Aucun personnage chargé, utilisation de données de test");
      persoData = generateDummyPersoData();
    }

    if (bonusData.length === 0) {
      console.warn("Aucun bonus chargé, utilisation de données de test");
      bonusData = generateDummyBonusData();
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données des cartes:", error);
  }
}

// Générer des données de test pour les personnages
function generateDummyPersoData() {
  const dummyPerso = [];
  for (let i = 1; i <= 10; i++) {
    dummyPerso.push({
      id: `P${i}`,
      nomcarteperso: `Personnage Test ${i}`,
      pointsdevie: "100",
      forceattaque: "30",
      tourattaque: "2",
      nomdupouvoir: `Pouvoir Test ${i}`,
      description: "Description du pouvoir de test",
      type: "perso",
    });
  }
  return dummyPerso;
}

// Générer des données de test pour les bonus
function generateDummyBonusData() {
  const dummyBonus = [];
  for (let i = 1; i <= 10; i++) {
    dummyBonus.push({
      id: `B${i}`,
      nomcartebonus: `Bonus Test ${i}`,
      pourcentagebonus: "20",
      tourbonus: "2",
      nomdupouvoir: `Effet Test ${i}`,
      description: "Description de l'effet de test",
      type: "bonus",
    });
  }
  return dummyBonus;
}

// Charger les données au démarrage
loadCardData();

// Méthode pour récupérer des cartes aléatoires d'un type spécifique
function getRandomCards(type, count) {
  // Déterminer quelle source de données utiliser
  const data = type === "perso" ? persoData : bonusData;

  // S'assurer que count ne dépasse pas le nombre de cartes disponibles
  count = Math.min(count, data.length);

  // Copier le tableau pour ne pas modifier l'original
  const shuffled = [...data];

  // Mélanger le tableau
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Ajouter l'URL de l'image et le type pour chaque carte
  return shuffled.slice(0, count).map((card) => {
    // Copie pour ne pas modifier l'original
    const cardCopy = { ...card };

    // Détermine quel type de SVG utiliser
    const svgType = type === "perso" ? "svg_perso" : "svg_bonus";

    // Construire l'URL du SVG
    cardCopy.imageUrl = `/stock/${svgType}/${cardCopy.id}.svg`;

    // Ajouter le type pour faciliter la gestion côté client
    cardCopy.type = type;

    return cardCopy;
  });
}

// Méthode pour récupérer une carte spécifique par son ID
function getCardById(type, id) {
  const data = type === "perso" ? persoData : bonusData;
  const card = data.find((card) => card.id === id);

  if (card) {
    // Copie pour ne pas modifier l'original
    const cardCopy = { ...card };

    const svgType = type === "perso" ? "svg_perso" : "svg_bonus";
    cardCopy.imageUrl = `/stock/${svgType}/${cardCopy.id}.svg`;
    cardCopy.type = type;

    return cardCopy;
  }

  return null;
}

// Fonction pour recharger les données (utile pour les tests ou mises à jour)
function reloadCardData() {
  loadCardData();
  return { persoCount: persoData.length, bonusCount: bonusData.length };
}

module.exports = {
  getRandomCards,
  getCardById,
  reloadCardData,
};
