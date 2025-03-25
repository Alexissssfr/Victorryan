import json
import os
from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET
import subprocess

class CardGeneratorPerso:
    def __init__(self):
        # Dimensions de la carte (en pixels) - augmentées pour plus de netteté
        self.card_width = 1200  # Doublé pour plus de netteté
        self.card_height = 1600 # Doublé pour plus de netteté
        self.template_path = os.path.join("data", "templates", "modele_carte_perso.svg")
        self.background_path = os.path.join("data", "backgrounds", "perso")  # Images de fond
        self.output_path = os.path.join("stock", "images", "personnages")  # Où sauvegarder les cartes finales
        self.output_svg_path = os.path.join("stock", "images", "personnages", "svg")  # Pour les fichiers SVG

    def generate_cards(self):
        with open('stock/personnages.json', 'r', encoding='utf-8') as f:
            personnages = json.load(f)

        os.makedirs(self.output_path, exist_ok=True)
        os.makedirs(self.output_svg_path, exist_ok=True)

        for perso in personnages:
            try:
                print(f"\nTraitement de la carte {perso['id']} - {perso['nomcarteperso']}")
                
                # Charger le template SVG
                tree = ET.parse(self.template_path)
                root = tree.getroot()

                # Mettre à jour l'image de fond
                for image_elem in root.findall(".//{http://www.w3.org/2000/svg}image"):
                    if image_elem.get('id') == 'fond':
                        # Utiliser le chemin absolu vers l'image de fond
                        background_path = os.path.abspath(os.path.join(self.background_path, f"{perso['id'].replace('P', '')}.png"))
                        print(f"Chemin de l'image de fond : {background_path}")
                        image_elem.set('{http://www.w3.org/1999/xlink}href', background_path)
                        # S'assurer que l'image couvre toute la carte
                        image_elem.set('width', '196.85001')
                        image_elem.set('height', '274.9021')
                        image_elem.set('x', '0')
                        image_elem.set('y', '0')
                        if 'transform' in image_elem.attrib:
                            del image_elem.attrib['transform']

                # Mettre à jour les textes dans le SVG
                for text_elem in root.findall(".//{http://www.w3.org/2000/svg}text"):
                    if text_elem.get('id') == 'nomcarteperso':
                        for tspan in text_elem.findall(".//{http://www.w3.org/2000/svg}tspan"):
                            tspan.text = perso['nomcarteperso']
                    elif text_elem.get('id') == 'nomdupouvoir':
                        for tspan in text_elem.findall(".//{http://www.w3.org/2000/svg}tspan"):
                            tspan.text = perso['nomdupouvoir']
                    elif text_elem.get('id') == 'description':
                        for tspan in text_elem.findall(".//{http://www.w3.org/2000/svg}tspan"):
                            tspan.text = perso['description']

                # Sauvegarder le SVG
                svg_path = os.path.join(self.output_svg_path, f"{perso['id']}.svg")
                tree.write(svg_path, encoding='utf-8', xml_declaration=True)
                print(f"✓ SVG généré : {svg_path}")

                # Convertir SVG en PNG immédiatement avec inkscape
                try:
                    png_path = os.path.join(self.output_path, f"{perso['id']}.png")
                    subprocess.run([
                        'inkscape',
                        '--export-type=png',
                        f'--export-filename={png_path}',
                        f'--export-width={self.card_width}',
                        f'--export-height={self.card_height}',
                        '--export-dpi=300',  # Haute résolution
                        '--export-background-opacity=0',  # Garde la transparence
                        '--export-text-to-path',  # Convertit le texte en chemins pour une meilleure netteté
                        '--export-area-page',  # Exporte la page entière
                        '--export-overwrite',  # Écrase le fichier existant
                        '--export-ps-level=3',  # Meilleure qualité de rendu
                        svg_path
                    ], check=True)
                    print(f"✓ PNG généré : {png_path}")
                except Exception as e:
                    print(f"❌ Erreur lors de la conversion en PNG : {str(e)}")
                
            except Exception as e:
                print(f"❌ Erreur lors de la génération de la carte {perso['id']}: {str(e)}")

if __name__ == "__main__":
    generator = CardGeneratorPerso()
    generator.generate_cards()