/**
 * Préchargeur d'images pour le jeu de cartes
 * Ce fichier permet de précharger les images des cartes pour une expérience plus fluide
 */

class ImageLoader {
  constructor() {
    this.loadedImages = new Map();
    this.pendingImages = new Map();
    this.supabaseUrl =
      "https://nlpzherlejtsgjynimko.supabase.co/storage/v1/object/public/images";
  }

  /**
   * Formate l'ID d'une carte avec le préfixe approprié
   * @param {string} id ID de la carte
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @returns {string} ID formaté
   */
  formatCardId(id, type) {
    if (!id) return "";

    const prefix = type === "perso" ? "P" : "B";
    return id.startsWith(prefix) ? id : `${prefix}${id}`;
  }

  /**
   * Construit l'URL d'une image
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @param {string} id ID de la carte
   * @returns {string} URL de l'image
   */
  getImageUrl(type, id) {
    const formattedId = this.formatCardId(id, type);
    return `${this.supabaseUrl}/${type}/${formattedId}.png`;
  }

  /**
   * Précharge une image
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @param {string} id ID de la carte
   * @returns {Promise<HTMLImageElement>} Promise avec l'image chargée
   */
  preloadImage(type, id) {
    const formattedId = this.formatCardId(id, type);
    const key = `${type}_${formattedId}`;

    // Si l'image est déjà chargée, retourner la promesse existante
    if (this.loadedImages.has(key)) {
      return Promise.resolve(this.loadedImages.get(key));
    }

    // Si l'image est en cours de chargement, retourner la promesse existante
    if (this.pendingImages.has(key)) {
      return this.pendingImages.get(key);
    }

    // Créer une nouvelle promesse pour charger l'image
    const imageUrl = this.getImageUrl(type, formattedId);

    const promise = new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages.set(key, img);
        this.pendingImages.delete(key);
        resolve(img);
      };

      img.onerror = (error) => {
        console.error(`Erreur de chargement d'image: ${imageUrl}`, error);
        this.pendingImages.delete(key);

        // Charger une image de remplacement en cas d'erreur
        const fallbackImg = new Image();
        fallbackImg.src = `https://via.placeholder.com/200x300?text=${type}+${formattedId}`;
        this.loadedImages.set(key, fallbackImg);

        resolve(fallbackImg);
      };

      img.src = imageUrl;
    });

    this.pendingImages.set(key, promise);
    return promise;
  }

  /**
   * Précharge un ensemble d'images de cartes
   * @param {Array} cards Cartes à précharger
   * @returns {Promise<Array>} Promise avec les résultats du préchargement
   */
  preloadCardImages(cards) {
    const promises = [];

    cards.forEach((card) => {
      const type = card.type || (card.id.startsWith("P") ? "perso" : "bonus");
      promises.push(
        this.preloadImage(type, card.id)
          .then(() => ({ success: true, id: card.id, type }))
          .catch(() => ({ success: false, id: card.id, type }))
      );
    });

    return Promise.all(promises);
  }

  /**
   * Précharge toutes les images de la partie
   * @param {Object} gameState État de la partie
   * @returns {Promise<Array>} Promise avec les résultats du préchargement
   */
  preloadGameImages(gameState) {
    const cards = [];

    // Personnages du joueur
    if (gameState.you.personnages) {
      gameState.you.personnages.forEach((perso) => {
        cards.push({ id: perso.id, type: "perso" });
      });
    }

    // Cartes bonus du joueur
    if (gameState.you.cartesBonus) {
      gameState.you.cartesBonus.forEach((bonus) => {
        cards.push({ id: bonus.id, type: "bonus" });
      });
    }

    // Personnages de l'adversaire
    if (gameState.opponent.personnages) {
      gameState.opponent.personnages.forEach((perso) => {
        cards.push({ id: perso.id, type: "perso" });
      });
    }

    // Précharger toutes les cartes
    return this.preloadCardImages(cards);
  }

  /**
   * Obtient une image préchargée ou la charge si nécessaire
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @param {string} id ID de la carte
   * @returns {Promise<HTMLImageElement>} Promise avec l'image
   */
  getImage(type, id) {
    return this.preloadImage(type, id);
  }

  /**
   * Définit l'image d'un élément HTML
   * @param {HTMLElement} element Élément HTML (img)
   * @param {string} type Type de carte ('perso' ou 'bonus')
   * @param {string} id ID de la carte
   * @returns {Promise<void>} Promise résolue quand l'image est définie
   */
  setElementImage(element, type, id) {
    if (!element || element.tagName !== "IMG") {
      return Promise.reject(new Error("L'élément doit être une balise img"));
    }

    return this.getImage(type, id).then((img) => {
      element.src = img.src;
      return;
    });
  }
}

// Exporter l'instance du préchargeur d'images
const imageLoader = new ImageLoader();
