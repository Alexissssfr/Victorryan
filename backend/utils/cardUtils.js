/**
 * Calcule la force d'attaque avec les bonus appliqués
 * @param {number} baseAttack - Force d'attaque de base
 * @param {Array} bonusList - Liste des bonus actifs
 * @returns {number} - Force d'attaque calculée
 */
function calculateAttackWithBonus(baseAttack, bonusList) {
  if (!bonusList || bonusList.length === 0) {
    return baseAttack;
  }

  // Calculer le pourcentage de bonus total
  const totalBonusPercentage = bonusList.reduce((total, bonus) => {
    return total + (parseInt(bonus.pourcentage) || 0);
  }, 0);

  // Appliquer le bonus à l'attaque de base
  const calculatedAttack = Math.floor(
    baseAttack * (1 + totalBonusPercentage / 100)
  );

  return calculatedAttack;
}

/**
 * Vérifie si une carte a des tours d'attaque disponibles
 * @param {object} card - Carte à vérifier
 * @returns {boolean} - True si la carte peut attaquer, false sinon
 */
function canAttack(card) {
  return parseInt(card.tours) > 0;
}

/**
 * Génère un SVG pour une carte avec ses statistiques actuelles
 * @param {object} card - Données de la carte
 * @param {object} stats - Statistiques actuelles (points de vie, attaque, etc.)
 * @param {Array} activeBonus - Liste des bonus actifs sur la carte
 * @returns {string} - Contenu SVG de la carte
 */
function generateCardSVG(card, stats, activeBonus = []) {
  const isPersonnage = card.id.startsWith("P");

  // Base SVG template
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
    <image href="${card.fond}" width="300" height="400" />`;

  if (isPersonnage) {
    // Pour les cartes personnage
    svg += `
      <rect x="10" y="320" width="280" height="70" fill="rgba(0,0,0,0.7)" rx="5" />
      <text x="20" y="340" fill="white" font-family="Arial" font-size="14">PV: ${stats.health}</text>
      <text x="20" y="360" fill="white" font-family="Arial" font-size="14">Force: ${stats.attack}</text>
      <text x="20" y="380" fill="white" font-family="Arial" font-size="14">Tours: ${stats.turns}</text>
    `;

    // Afficher les bonus actifs
    if (activeBonus && activeBonus.length > 0) {
      svg += `<rect x="150" y="320" width="140" height="70" fill="rgba(255,215,0,0.5)" rx="5" />
        <text x="160" y="340" fill="black" font-family="Arial" font-size="12">Bonus actifs:</text>`;

      activeBonus.forEach((bonus, index) => {
        svg += `<text x="160" y="${
          360 + index * 16
        }" fill="black" font-family="Arial" font-size="10">${bonus.nom} (${
          bonus.pourcentage
        }%, ${bonus.tours}t)</text>`;
      });
    }
  } else {
    // Pour les cartes bonus
    svg += `
      <rect x="10" y="320" width="280" height="70" fill="rgba(0,0,0,0.7)" rx="5" />
      <text x="20" y="340" fill="white" font-family="Arial" font-size="14">Bonus: ${card.pourcentagebonus}%</text>
      <text x="20" y="360" fill="white" font-family="Arial" font-size="14">Tours: ${card.tourbonus}</text>
      <text x="20" y="380" fill="white" font-family="Arial" font-size="14">${card.nomdupouvoir}</text>
    `;
  }

  svg += `</svg>`;

  return svg;
}

module.exports = {
  calculateAttackWithBonus,
  canAttack,
  generateCardSVG,
};
