import React from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Stack,
} from "@mui/material";

function PlayerHand({ cards, selectedCard, onCardSelect }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Votre main
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {cards.map((card) => (
          <Card
            key={card.id}
            sx={{
              width: 200,
              height: 300,
              cursor: "pointer",
              border:
                selectedCard?.id === card.id ? "2px solid #90caf9" : "none",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
            onClick={() => onCardSelect(card)}
          >
            <CardMedia
              component="img"
              height="200"
              image={card.imageUrl}
              alt={card.nomcarte}
            />
            <CardContent>
              <Typography variant="h6" noWrap>
                {card.nomcarte}
              </Typography>
              {card.type === "perso" && (
                <Stack spacing={1}>
                  <Typography variant="body2">
                    PV: {card.currentStats.pointsdevie}
                  </Typography>
                  <Typography variant="body2">
                    Attaque: {card.currentStats.forceattaque}
                  </Typography>
                  <Typography variant="body2">
                    Tours d'attaque: {card.currentStats.tourattaque}
                  </Typography>
                </Stack>
              )}
              {card.type === "bonus" && (
                <Stack spacing={1}>
                  <Typography variant="body2">
                    Bonus: +{card.bonusStats.pourcentagebonus}%
                  </Typography>
                  <Typography variant="body2">
                    Durée: {card.bonusStats.tourbonus} tours
                  </Typography>
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Paper>
  );
}

export default PlayerHand;
