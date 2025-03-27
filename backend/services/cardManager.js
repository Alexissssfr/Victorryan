/**
 * Gestionnaire de cartes
 * Ce fichier gère le tirage aléatoire des cartes, leur stockage et leur formatage pour l'affichage
 */

const fs = require("fs");
const path = require("path");

class Card {
  constructor(type, id, stats) {
    this.type = type; // 'perso' ou 'bonus'
    this.id = id;
    this.stats = stats;
  }

  createCardElement() {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.dataset.type = this.type;
    cardDiv.dataset.id = this.id;

    const img = document.createElement("img");
    img.src = `https://nlpzherlejtsgjynimko.supabase.co/storage/v1/object/public/images/${
      this.type
    }/data/images/${this.type}/${this.type === "perso" ? "P" : "B"}${
      this.id
    }.png`;
    img.alt = this.stats.nom;
    img.onerror = () => {
      img.src = "placeholder.png";
    };

    const overlay = document.createElement("div");
    overlay.className = "card-overlay";

    if (this.type === "perso") {
      overlay.innerHTML = `
                <h3>${this.stats.nom}</h3>
                <p>PV: ${this.stats.pv}</p>
                <p>Attaque: ${this.stats.attaque}</p>
                <p>Défense: ${this.stats.defense}</p>
                <p>${this.stats.description}</p>
            `;
    } else {
      overlay.innerHTML = `
                <h3>${this.stats.nom}</h3>
                <p>Effet: ${this.stats.effet}</p>
                <p>Valeur: ${this.stats.valeur}</p>
                <p>${this.stats.description}</p>
            `;
    }

    cardDiv.appendChild(img);
    cardDiv.appendChild(overlay);
    return cardDiv;
  }
}

class CardManager {
  constructor() {
    this.personnages = [];
    this.bonus = [];
    this.loadedCards = false;
  }

  /**
   * Charge les cartes depuis les fichiers JSON
   */
  async loadCards() {
    try {
      // Chemins des fichiers JSON
      const personnagesPath = path.join(
        __dirname,
        "../../stock/personnages.json"
      );
      const bonusPath = path.join(__dirname, "../../stock/bonus.json");

      // Vérifier l'existence des fichiers
      if (!fs.existsSync(personnagesPath)) {
        console.error(`Erreur: Fichier ${personnagesPath} introuvable`);
        return false;
      }

      if (!fs.existsSync(bonusPath)) {
        console.error(`Erreur: Fichier ${bonusPath} introuvable`);
        return false;
      }

      // Charger les données
      this.personnages = JSON.parse(fs.readFileSync(personnagesPath, "utf8"));
      this.bonus = JSON.parse(fs.readFileSync(bonusPath, "utf8"));

      console.log(
        `Cartes chargées: ${this.personnages.length} personnages, ${this.bonus.length} bonus`
      );
      this.loadedCards = true;
      return true;
    } catch (error) {
      console.error("Erreur lors du chargement des cartes:", error);
      return false;
    }
  }

  /**
   * Tire au sort des cartes de personnages
   * @param {number} count Nombre de cartes à tirer
   * @returns {Array} Cartes tirées au sort
   */
  getRandomPersonnages(count) {
    if (!this.loadedCards) {
      throw new Error(
        "Les cartes doivent être chargées avec loadCards() avant utilisation"
      );
    }

    if (count > this.personnages.length) {
      console.warn(
        `Attention: ${count} cartes demandées mais seulement ${this.personnages.length} disponibles`
      );
      count = this.personnages.length;
    }

    // Mélanger les cartes
    const shuffled = [...this.personnages].sort(() => Math.random() - 0.5);

    // Retourner le nombre demandé de cartes
    return shuffled.slice(0, count);
  }

  /**
   * Tire au sort des cartes bonus
   * @param {number} count Nombre de cartes à tirer
   * @returns {Array} Cartes tirées au sort
   */
  getRandomBonus(count) {
    if (!this.loadedCards) {
      throw new Error(
        "Les cartes doivent être chargées avec loadCards() avant utilisation"
      );
    }

    if (count > this.bonus.length) {
      console.warn(
        `Attention: ${count} cartes demandées mais seulement ${this.bonus.length} disponibles`
      );
      count = this.bonus.length;
    }

    // Mélanger les cartes
    const shuffled = [...this.bonus].sort(() => Math.random() - 0.5);

    // Retourner le nombre demandé de cartes
    return shuffled.slice(0, count);
  }

  /**
   * Récupère une carte personnage par son ID
   * @param {string} id ID de la carte
   * @returns {Object|null} Carte trouvée ou null
   */
  getPersonnageById(id) {
    if (!this.loadedCards) {
      throw new Error(
        "Les cartes doivent être chargées avec loadCards() avant utilisation"
      );
    }

    // Normaliser l'ID (enlever le préfixe P si présent)
    const normalizedId = id.startsWith("P") ? id : `P${id}`;

    return (
      this.personnages.find(
        (card) => card.id === normalizedId || card.id === id
      ) || null
    );
  }

  /**
   * Récupère une carte bonus par son ID
   * @param {string} id ID de la carte
   * @returns {Object|null} Carte trouvée ou null
   */
  getBonusById(id) {
    if (!this.loadedCards) {
      throw new Error(
        "Les cartes doivent être chargées avec loadCards() avant utilisation"
      );
    }

    // Normaliser l'ID (enlever le préfixe B si présent)
    const normalizedId = id.startsWith("B") ? id : `B${id}`;

    return (
      this.bonus.find((card) => card.id === normalizedId || card.id === id) ||
      null
    );
  }

  /**
   * Obtient l'URL d'image pour une carte
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @param {string} id ID de la carte
   * @returns {string} URL de l'image
   */
  getImageUrl(type, id) {
    // Normaliser l'ID avec le préfixe approprié si nécessaire
    const formattedId = id.startsWith(type === "perso" ? "P" : "B")
      ? id
      : `${type === "perso" ? "P" : "B"}${id}`;

    // Construire l'URL pour Supabase
    return `https://nlpzherlejtsgjynimko.supabase.co/storage/v1/object/public/images/${type}/${formattedId}.png`;
  }

  /**
   * Crée un objet de carte formaté pour l'interface utilisateur
   * @param {Object} card Données de la carte originale
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @returns {Object} Carte formatée pour l'UI
   */
  formatCardForUI(card, type) {
    if (type === "perso") {
      return {
        id: card.id,
        type: "perso",
        nom: card.nom || card.nomcarteperso || "Personnage",
        pointsdevie: parseInt(card.pointsdevie) || 100,
        forceattaque: parseInt(card.forceattaque) || 0,
        pouvoir: card.nomdupouvoir || card.pouvoir || "",
        description: card.description || "",
        imageUrl: this.getImageUrl("perso", card.id),
      };
    } else {
      return {
        id: card.id,
        type: "bonus",
        nom: card.nom || card.nomcartebonus || "Bonus",
        pourcentagebonus: parseInt(card.pourcentagebonus) || 0,
        tourbonus: parseInt(card.tourbonus) || 1,
        pouvoir: card.nomdupouvoir || card.pouvoir || "",
        description: card.description || "",
        imageUrl: this.getImageUrl("bonus", card.id),
      };
    }
  }

  /**
   * Génère un nouveau jeu de cartes pour une partie
   * @param {number} persoCount Nombre de cartes personnage par joueur
   * @param {number} bonusCount Nombre de cartes bonus par joueur
   * @returns {Object} Cartes distribuées aux joueurs
   */
  generateGameCards(persoCount = 5, bonusCount = 5) {
    // Vérifier si les cartes sont chargées
    if (!this.loadedCards) {
      throw new Error(
        "Les cartes doivent être chargées avec loadCards() avant utilisation"
      );
    }

    // Tirer au sort des cartes pour les deux joueurs
    const allPersonnages = this.getRandomPersonnages(persoCount * 2);
    const allBonus = this.getRandomBonus(bonusCount * 2);

    // Formater les cartes pour l'UI
    const formattedPersonnages = allPersonnages.map((card) =>
      this.formatCardForUI(card, "perso")
    );
    const formattedBonus = allBonus.map((card) =>
      this.formatCardForUI(card, "bonus")
    );

    // Diviser les cartes entre les joueurs
    return {
      player1: {
        personnages: formattedPersonnages.slice(0, persoCount),
        bonus: formattedBonus.slice(0, bonusCount),
      },
      player2: {
        personnages: formattedPersonnages.slice(persoCount, persoCount * 2),
        bonus: formattedBonus.slice(bonusCount, bonusCount * 2),
      },
    };
  }

  /**
   * Sauvegarde le jeu de cartes d'une partie
   * @param {string} gameId ID de la partie
   * @param {Object} cards Cartes de la partie
   * @returns {boolean} Succès de la sauvegarde
   */
  saveGameCards(gameId, cards) {
    try {
      // Créer le dossier de sauvegarde s'il n'existe pas
      const saveDir = path.join(__dirname, "../../gameStates");
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // Chemin du fichier de sauvegarde
      const filePath = path.join(saveDir, `${gameId}_cards.json`);

      // Sauvegarder les cartes
      fs.writeFileSync(filePath, JSON.stringify(cards, null, 2));
      console.log(
        `Cartes de la partie ${gameId} sauvegardées dans ${filePath}`
      );
      return true;
    } catch (error) {
      console.error(
        `Erreur lors de la sauvegarde des cartes de la partie ${gameId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Charge le jeu de cartes d'une partie
   * @param {string} gameId ID de la partie
   * @returns {Object|null} Cartes de la partie ou null si erreur
   */
  loadGameCards(gameId) {
    try {
      // Chemin du fichier de sauvegarde
      const filePath = path.join(
        __dirname,
        "../../gameStates",
        `${gameId}_cards.json`
      );

      // Vérifier l'existence du fichier
      if (!fs.existsSync(filePath)) {
        console.error(`Erreur: Fichier de cartes ${filePath} introuvable`);
        return null;
      }

      // Charger les cartes
      const cards = JSON.parse(fs.readFileSync(filePath, "utf8"));
      console.log(`Cartes de la partie ${gameId} chargées depuis ${filePath}`);
      return cards;
    } catch (error) {
      console.error(
        `Erreur lors du chargement des cartes de la partie ${gameId}:`,
        error
      );
      return null;
    }
  }
}

module.exports = CardManager;
