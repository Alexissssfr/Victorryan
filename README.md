# Victor Ryan - Jeu de Cartes

Un jeu de cartes stratégique dans un univers fantastique où les joueurs s'affrontent avec leurs cartes de personnages et de bonus.

## Structure du Projet

```
/
├── backend/
│   ├── config/
│   │   └── supabase.js
│   ├── routes/
│   │   ├── cards.js
│   │   └── games.js
│   └── services/
│       ├── cardManager.js
│       └── gameManager.js
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── game.js
│   │   └── websocket.js
│   └── index.html
├── stock/
│   ├── personnages.json
│   ├── bonus.json
│   ├── svg_perso/
│   │   └── (fichiers SVG des personnages)
│   └── svg_bonus/
│       └── (fichiers SVG des bonus)
├── .env
├── package.json
├── server.js
└── README.md
```

## Installation

1. Cloner le dépôt

```bash
git clone <URL-DU-REPO>
cd victorryan
```

2. Installer les dépendances

```bash
npm install
```

3. Configurer les variables d'environnement
   - Créer un fichier `.env` à la racine du projet
   - Ajouter les variables suivantes:

```
SUPABASE_URL=votre_url_supabase
SUPABASE_KEY=votre_clé_supabase
PORT=3000
```

## Démarrage

Pour démarrer le serveur en mode développement:

```bash
npm run dev
```

Pour démarrer le serveur en mode production:

```bash
npm start
```

L'application sera disponible à l'adresse `http://localhost:3000` (ou le port que vous avez spécifié).

## Règles du Jeu

### Distribution

- 5 cartes personnages par joueur
- 5 cartes bonus par joueur
- Sélection aléatoire dans les jeux de cartes

### Déroulement d'un Tour

1. Un joueur peut :
   - Jouer TOUS ses bonus SUR UN SEUL personnage
   - Faire UNE attaque avec UN personnage
2. Application des Bonus
   - Augmentation de l'attaque : force \* (1 + bonus/100)
   - Limité par le nombre de tours du bonus

### Conditions de Victoire

- Défaite si tous les personnages à 0 PV
- Si personnages sans tours d'attaque mais PV > 0 :
  - Adversaire peut continuer à attaquer
- En cas d'égalité : comparaison des PV restants

## Déploiement sur Render

Pour déployer sur Render, assurez-vous de:

1. Connecter votre dépôt GitHub à Render
2. Configurer un nouveau Web Service avec les paramètres suivants:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Variables d'environnement: SUPABASE_URL, SUPABASE_KEY

## Problèmes connus

Si vous rencontrez des erreurs liées aux chemins de fichiers, vérifiez:

1. Que tous les fichiers sont correctement placés dans la structure
2. Que les noms de fichiers respectent la casse exacte
3. Que les chemins dans le code sont corrects

## Licence

Tous droits réservés © 2025
