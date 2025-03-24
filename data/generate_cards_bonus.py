import json
import os
from PIL import Image, ImageDraw, ImageFont

class CardGeneratorBonus:
    def __init__(self):
        # Dimensions de la carte (en pixels)
        self.card_width = 600
        self.card_height = 800
        self.background_path = os.path.join("data", "backgrounds", "bonus")  # Images de fond
        self.output_path = os.path.join("stock", "images", "bonus")  # Où sauvegarder les cartes finales

    def generate_cards(self):
        # Charger les données des bonus
        with open('stock/bonus.json', 'r', encoding='utf-8') as f:
            bonus = json.load(f)

        # Créer le dossier de sortie
        os.makedirs(self.output_path, exist_ok=True)

        # Charger la police
        try:
            title_font = ImageFont.truetype("Cinzel-Bold.ttf", 40)
            text_font = ImageFont.truetype("Cinzel-Regular.ttf", 30)
        except:
            title_font = ImageFont.load_default()
            text_font = ImageFont.load_default()

        for card in bonus:
            try:
                # Charger l'image de fond
                background_path = os.path.join(self.background_path, f"{card['id']}.png")
                if os.path.exists(background_path):
                    background = Image.open(background_path)
                    background = background.resize((self.card_width, self.card_height))
                else:
                    # Créer une image avec fond noir si pas d'image de fond
                    background = Image.new('RGBA', (self.card_width, self.card_height), (0, 0, 0, 128))

                # Créer l'image finale
                img = background.copy()
                draw = ImageDraw.Draw(img)

                # Ajouter le titre
                title = card['nomcartebonus']
                title_bbox = draw.textbbox((0, 0), title, font=title_font)
                title_width = title_bbox[2] - title_bbox[0]
                draw.text(
                    (self.card_width/2 - title_width/2, 50),
                    title,
                    font=title_font,
                    fill=(255, 255, 255)
                )

                # Ajouter le nom du pouvoir
                pouvoir = card['nomdupouvoir']
                pouvoir_bbox = draw.textbbox((0, 0), pouvoir, font=text_font)
                pouvoir_width = pouvoir_bbox[2] - pouvoir_bbox[0]
                draw.text(
                    (self.card_width/2 - pouvoir_width/2, 600),
                    pouvoir,
                    font=text_font,
                    fill=(255, 255, 255)
                )

                # Ajouter la description
                description = card['description']
                # Wrap text (simple implementation)
                words = description.split()
                lines = []
                current_line = []
                for word in words:
                    current_line.append(word)
                    line = ' '.join(current_line)
                    line_bbox = draw.textbbox((0, 0), line, font=text_font)
                    if line_bbox[2] - line_bbox[0] > self.card_width - 60:
                        current_line.pop()
                        lines.append(' '.join(current_line))
                        current_line = [word]
                if current_line:
                    lines.append(' '.join(current_line))

                y = 650
                for line in lines:
                    line_bbox = draw.textbbox((0, 0), line, font=text_font)
                    line_width = line_bbox[2] - line_bbox[0]
                    draw.text(
                        (self.card_width/2 - line_width/2, y),
                        line,
                        font=text_font,
                        fill=(255, 255, 255)
                    )
                    y += 40

                # Sauvegarder l'image finale
                output_path = os.path.join(self.output_path, f"{card['id']}.png")
                img.save(output_path, "PNG")

                print(f"Carte PNG générée pour {card['nomcartebonus']}")
                
            except Exception as e:
                print(f"Erreur lors de la génération de la carte {card['id']}: {str(e)}")

if __name__ == "__main__":
    generator = CardGeneratorBonus()
    generator.generate_cards()