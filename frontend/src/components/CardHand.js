import { Card } from "./Card.js";

/**
 * Classe représentant une main de cartes
 */
export class CardHand {
  /**
   * Crée une instance de main de cartes
   * @param {string} containerId - ID du conteneur HTML
   * @param {Function} onCardClick - Fonction à appeler lors du clic sur une carte
   */
  constructor(containerId, onCardClick) {
    this.container = document.getElementById(containerId);
    this.cards = [];
    this.onCardClick = onCardClick;
  }

  /**
   * Définit les cartes de la main
   * @param {Array} cardsData - Données des cartes
   * @param {string} type - Type de cartes (personnage ou bonus)
   * @param {object} stats - Statistiques actuelles des cartes
   * @param {object} activeBonus - Bonus actifs sur les cartes
   */
  setCards(cardsData, type, stats = {}, activeBonus = {}) {
    // Vider le conteneur
    this.container.innerHTML = "";
    this.cards = [];

    // Créer une carte pour chaque élément de données
    cardsData.forEach((cardData) => {
      const card = new Card(cardData, type);
      this.cards.push(card);

      // Calculer les statistiques de la carte
      const cardStats =
        type === "personnage"
          ? {
              health: stats.health?.[cardData.id],
              attack: stats.attack?.[cardData.id],
              turns: stats.turns?.[cardData.id],
            }
          : null;

      // Récupérer les bonus actifs pour cette carte
      const cardBonus =
        type === "personnage" ? activeBonus[cardData.id] || [] : [];

      // Rendre la carte et l'ajouter au conteneur
      const cardElement = card.render(this.onCardClick, cardStats, cardBonus);

      // Désactiver la carte si c'est un personnage sans tours d'attaque
      if (type === "personnage" && cardStats && cardStats.turns <= 0) {
        card.setDisabled(true);
      }

      this.container.appendChild(cardElement);
    });
  }

  /**
   * Sélectionne une carte et désélectionne les autres
   * @param {Card} selectedCard - Carte à sélectionner
   */
  selectCard(selectedCard) {
    this.cards.forEach((card) => {
      card.setSelected(card === selectedCard);
    });
  }

  /**
   * Désélectionne toutes les cartes
   */
  clearSelection() {
    this.cards.forEach((card) => {
      card.setSelected(false);
    });
  }

  /**
   * Met à jour les statistiques d'une carte
   * @param {string} cardId - ID de la carte à mettre à jour
   * @param {object} stats - Nouvelles statistiques
   * @param {Array} bonusList - Nouveaux bonus actifs
   */
  updateCardStats(cardId, stats, bonusList = []) {
    const card = this.cards.find((c) => c.data.id === cardId);

    if (card) {
      // Recréer l'élément de la carte avec les nouvelles statistiques
      const newElement = card.render(this.onCardClick, stats, bonusList);

      // Remplacer l'ancien élément par le nouveau
      if (card.element && card.element.parentNode) {
        card.element.parentNode.replaceChild(newElement, card.element);
      }

      // Mettre à jour la référence de l'élément
      card.element = newElement;

      // Désactiver la carte si c'est un personnage sans tours d'attaque
      if (card.type === "personnage" && stats && stats.turns <= 0) {
        card.setDisabled(true);
      }
    }
  }
}
