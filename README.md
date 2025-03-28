# Victorryan

Jeu de cartes en ligne multijoueur avec des personnages et des bonus.

## Installation

```bash
npm install
```

## Démarrage

```bash
npm start
```

Le serveur démarre sur le port 10000 par défaut ou sur le port spécifié dans la variable d'environnement PORT.

## Règles du jeu

### Distribution

- 5 cartes personnages par joueur
- 5 cartes bonus par joueur
- Sélection aléatoire dans les jeux de cartes

### Déroulement d'un Tour

1. Un joueur peut :

   - Jouer tous ses bonus sur un seul personnage ou bien jouer une ou plusieurs cartes bonus tant qu'elles ont toujours des tours bonus au-dessus de 0
   - Faire une attaque avec un personnage

2. Application des Bonus
   - Augmentation de l'attaque : force \* (1 + bonus/100)
   - Limité par le nombre de tours du bonus

### Conditions de Victoire

- Défaite si tous les personnages à 0 PV
- Si personnages sans tours d'attaque mais PV > 0, l'adversaire peut continuer à attaquer
- En cas d'égalité : comparaison des PV restants
