import os

# Liste des fichiers à inclure dans syntheseprojet.txt
files = [
    "/Users/robert/Victorryan/backend/config/supabase.js",
    "/Users/robert/Victorryan/backend/routes/cards.js",
    "/Users/robert/Victorryan/backend/routes/games.js",
    "/Users/robert/Victorryan/backend/services/cardManager.js",
    "/Users/robert/Victorryan/backend/services/gameManager.js",
    "/Users/robert/Victorryan/backend/package.json",
    "/Users/robert/Victorryan/frontend/css/cards.css",
    "/Users/robert/Victorryan/frontend/css/game.css",
    "/Users/robert/Victorryan/frontend/css/responsive.css",
    "/Users/robert/Victorryan/frontend/js/cardManager.js",
    "/Users/robert/Victorryan/frontend/js/game.js",
    "/Users/robert/Victorryan/frontend/js/utils.js",
    "/Users/robert/Victorryan/frontend/js/websocket.js",
    "/Users/robert/Victorryan/stock/svg_bonus/B1.svg",
    "/Users/robert/Victorryan/stock/svg_perso/P1.svg",
    "/Users/robert/Victorryan/stock/bonus.json",
    "/Users/robert/Victorryan/stock/personnages.json",
    "/Users/robert/Victorryan/.gitignore",
    "/Users/robert/Victorryan/package.json",
    "/Users/robert/Victorryan/package-lock.json",
    "/Users/robert/Victorryan/procfile",
    "/Users/robert/Victorryan/render-start.js",
    "/Users/robert/Victorryan/render.yaml",
    "/Users/robert/Victorryan/server.js"
]

output_file = "/Users/robert/Victorryan/syntheseprojet.txt"

# Création du fichier synthèse
with open(output_file, "w", encoding="utf-8") as synthese:
    for file in files:
        if os.path.exists(file):  # Vérifie si le fichier existe
            with open(file, "r", encoding="utf-8") as f:
                synthese.write(f"===== {file} =====\n")  # Séparateur avec le nom du fichier
                synthese.write(f.read())  # Écrit le contenu du fichier
                synthese.write("\n\n")  # Ajoute un saut de ligne entre les fichiers
        else:
            synthese.write(f"===== {file} =====\nFichier introuvable !\n\n")

print(f"Synthèse créée : {output_file}")
