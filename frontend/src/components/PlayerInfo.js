/**
 * Classe représentant les informations d'un joueur
 */
export class PlayerInfo {
  /**
   * Crée une instance d'informations de joueur
   * @param {string} containerId - ID du conteneur HTML
   * @param {string} name - Nom du joueur
   */
  constructor(containerId, name) {
    this.container = document.getElementById(containerId);
    this.name = name;
    this.stats = {
      totalHealth: 0,
      remainingPersonnages: 0,
    };
  }

  /**
   * Met à jour les statistiques du joueur
   * @param {object} playerState - État du joueur
   */
  update(playerState) {
    if (!playerState) {
      return;
    }

    // Calculer les statistiques
    let totalHealth = 0;
    let remainingPersonnages = 0;

    // Parcourir les points de vie de chaque personnage
    for (const cardId in playerState.health) {
      const health = playerState.health[cardId];

      totalHealth += health;

      if (health > 0) {
        remainingPersonnages++;
      }
    }

    this.stats.totalHealth = totalHealth;
    this.stats.remainingPersonnages = remainingPersonnages;

    // Mettre à jour l'affichage
    this.render();
  }

  /**
   * Rend les informations du joueur
   */
  render() {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = `
      <div class="player-info">
        <h3>${this.name}</h3>
        <p>Points de vie totaux: ${this.stats.totalHealth}</p>
        <p>Personnages restants: ${this.stats.remainingPersonnages}</p>
      </div>
    `;
  }
}
