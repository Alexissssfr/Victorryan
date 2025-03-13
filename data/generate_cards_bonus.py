import json
import os
import sys
from pathlib import Path

def get_project_root():
    """Retourne le chemin racine du projet"""
    script_path = Path(__file__).resolve()
    return script_path.parent.parent

def create_output_dir(output_dir):
    """Crée le dossier de sortie s'il n'existe pas"""
    if not output_dir.exists():
        os.makedirs(output_dir)
        print(f"Dossier créé : {output_dir}")

def generate_bonus_cards():
    try:
        # Obtenir le chemin racine du projet
        root_dir = get_project_root()
        
        # Définition des chemins
        template_path = root_dir / "data" / "templates" / "modele_carte_bonus.svg"
        output_dir = root_dir / "stock" / "svg_bonus"
        json_path = root_dir / "bonus.json"
        
        # Vérification des fichiers
        if not template_path.exists():
            raise FileNotFoundError(f"Template SVG non trouvé : {template_path}")
        if not json_path.exists():
            raise FileNotFoundError(f"Fichier JSON non trouvé : {json_path}")
        
        # Création du dossier de sortie
        create_output_dir(output_dir)
        
        # Lecture du template SVG
        with open(template_path, 'r', encoding='utf-8') as f:
            template = f.read()
        
        # Lecture du JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            cards_data = json.load(f)
        
        # Compteur pour les statistiques
        cards_generated = 0
        
        for card in cards_data:
            try:
                # Création d'une copie du template
                card_svg = template
                
                # Remplacement des valeurs dans le SVG
                replacements = {
                    # Image de fond
                    'xlink:href="BONUS_IMAGE_PLACEHOLDER"': f'xlink:href="{card["fond"]}"',
                    # Textes de la carte
                    '>Banananiia<': f'>{card["nomcartebonus"]}<',
                    '>20<': f'>{card["pourcentagebonus"]}<',
                    '>1<': f'>{card["tourbonus"]}<',
                    '>Augmentation de Puissance<': f'>{card["nomdupouvoir"]}<',
                    '>Augmente les dégâts du personnage<': f'>{card["description"]}<'
                }
                
                # Application des remplacements
                for old_text, new_text in replacements.items():
                    if old_text not in card_svg:
                        print(f"⚠️ Attention : Texte '{old_text}' non trouvé dans le template pour {card['id']}")
                    card_svg = card_svg.replace(old_text, new_text)
                
                # Sauvegarde de la carte
                output_path = output_dir / f"{card['id']}.svg"
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(card_svg)
                
                cards_generated += 1
                print(f"✅ Carte générée : {card['id']} - {card['nomcartebonus']}")
                
            except Exception as e:
                print(f"❌ Erreur lors de la génération de la carte {card['id']} : {str(e)}")
                continue
        
        print(f"\n🎉 Génération terminée !")
        print(f"📊 Cartes générées : {cards_generated}")
        
    except Exception as e:
        print(f"❌ Erreur critique : {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Début de la génération des cartes bonus...")
    generate_bonus_cards()