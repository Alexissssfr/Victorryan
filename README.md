# Victorryan Game

Une application de jeu de cartes utilisant Node.js, Express et Supabase pour le stockage d'images.

## Configuration

1. Assurez-vous d'avoir Node.js installé sur votre système.
2. Clonez ce dépôt.
3. Installez les dépendances : `npm install`
4. Créez un fichier `.env` à la racine du projet avec les informations suivantes :
   ```
   SUPABASE_URL=https://prcpnttqrxrymqecgksm.supabase.co
   SUPABASE_KEY=votre_clé_supabase
   PORT=3000
   ```

## Structure du projet

- `/backend` : Code serveur et services
  - `/config` : Configuration Supabase
  - `/services` : Services pour la gestion du jeu
- `/gameStates` : États des parties sauvegardés en JSON
- `/public` : Interface utilisateur
- `/stock` : Données JSON des cartes

## Démarrage

1. Lancez le serveur : `node server.js`
2. Accédez à l'application via `http://localhost:3000`

## Fonctionnalités

- Création et chargement de parties
- Distribution de cartes personnages et bonus
- Gestion des tours de jeu
- Application de bonus aux personnages
- Sauvegarde automatique de l'état du jeu

## Remarques importantes

- Les images sont stockées dans Supabase et chargées directement depuis le navigateur
- Les états de jeu sont sauvegardés dans des fichiers JSON dans le dossier `gameStates`
- Les données des cartes sont chargées depuis `stock/personnages.json` et `stock/bonus.json`

## Déploiement

Pour déployer sur Render ou un service similaire :

1. Connectez votre dépôt GitHub à Render
2. Configurez un nouveau service Web avec les paramètres suivants :
   - Build Command : `npm install`
   - Start Command : `node server.js`
   - Ajoutez les variables d'environnement (SUPABASE_URL, SUPABASE_KEY)

## Notes de développement

- Les images sont chargées directement depuis Supabase sans copie locale
- L'état du jeu est géré par le serveur et stocké dans des fichiers JSON
- La communication client-serveur se fait via des API REST
