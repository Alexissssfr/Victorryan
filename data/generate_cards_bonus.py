import json
import os
from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET
import subprocess

class CardGeneratorBonus:
    def __init__(self):
        # Dimensions de la carte (en pixels)
        self.card_width = 600
        self.card_height = 800
        self.template_path = os.path.join("data", "templates", "modele_carte_bonus.svg")
        self.background_path = os.path.join("data", "backgrounds", "bonus")  # Images de fond
        self.output_path = os.path.join("stock", "images", "bonus")  # Où sauvegarder les cartes finales
        self.output_svg_path = os.path.join("stock", "images", "bonus", "svg")  # Pour les fichiers SVG

    def generate_cards(self):
        with open('stock/bonus.json', 'r', encoding='utf-8') as f:
            bonus = json.load(f)

        os.makedirs(self.output_path, exist_ok=True)
        os.makedirs(self.output_svg_path, exist_ok=True)

        for bonus_card in bonus:
            try:
                print(f"\nTraitement de la carte {bonus_card['id']} - {bonus_card['nomcartebonus']}")
                
                # Charger le template SVG
                tree = ET.parse(self.template_path)
                root = tree.getroot()

                # Mettre à jour l'image de fond
                for image_elem in root.findall(".//{http://www.w3.org/2000/svg}image"):
                    if image_elem.get('id') == 'fond':
                        # Utiliser le chemin absolu vers l'image de fond
                        background_path = os.path.abspath(os.path.join(self.background_path, f"{bonus_card['id'].replace('B', '')}.png"))
                        image_elem.set('{http://www.w3.org/1999/xlink}href', background_path)

                # Mettre à jour les textes dans le SVG
                for text_elem in root.findall(".//{http://www.w3.org/2000/svg}text"):
                    if text_elem.get('id') == 'nomcartebonus':
                        text_elem.find('.//{http://www.w3.org/2000/svg}tspan').text = bonus_card['nomcartebonus']
                    elif text_elem.get('id') == 'nomdupouvoir':
                        text_elem.find('.//{http://www.w3.org/2000/svg}tspan').text = bonus_card['nomdupouvoir']
                    elif text_elem.get('id') == 'description':
                        text_elem.find('.//{http://www.w3.org/2000/svg}tspan').text = bonus_card['description']

                # Sauvegarder le SVG
                svg_path = os.path.join(self.output_svg_path, f"{bonus_card['id']}.svg")
                tree.write(svg_path, encoding='utf-8', xml_declaration=True)
                print(f"✓ SVG généré : {svg_path}")

                # Convertir SVG en PNG immédiatement avec inkscape
                try:
                    png_path = os.path.join(self.output_path, f"{bonus_card['id']}.png")
                    subprocess.run([
                        'inkscape',
                        '--export-type=png',
                        f'--export-filename={png_path}',
                        f'--export-width={self.card_width}',
                        f'--export-height={self.card_height}',
                        svg_path
                    ], check=True)
                    print(f"✓ PNG généré : {png_path}")
                except Exception as e:
                    print(f"❌ Erreur lors de la conversion en PNG : {str(e)}")
                
            except Exception as e:
                print(f"❌ Erreur lors de la génération de la carte {bonus_card['id']}: {str(e)}")

if __name__ == "__main__":
    generator = CardGeneratorBonus()
    generator.generate_cards()