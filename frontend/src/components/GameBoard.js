import React from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Stack,
} from "@mui/material";

function GameBoard({
  gameState,
  selectedCard,
  selectedTarget,
  onCardSelect,
  onTargetSelect,
}) {
  const currentPlayerId = localStorage.getItem("playerId");
  const isPlayer1 = gameState.player1.id === currentPlayerId;

  const renderCard = (card, isOpponent = false) => {
    const isSelected = selectedCard?.id === card.id;
    const isTarget = selectedTarget?.id === card.id;
    const canBeTarget =
      selectedCard && selectedCard.type === "bonus" && card.type === "perso";

    return (
      <Card
        sx={{
          width: 200,
          height: 300,
          cursor: canBeTarget ? "pointer" : "default",
          border: isSelected
            ? "2px solid #90caf9"
            : isTarget
            ? "2px solid #f48fb1"
            : "none",
          opacity: isOpponent ? 0.8 : 1,
          "&:hover": {
            transform: canBeTarget ? "scale(1.05)" : "none",
          },
        }}
        onClick={() => {
          if (canBeTarget) {
            onTargetSelect(card);
          } else if (!isOpponent) {
            onCardSelect(card);
          }
        }}
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
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Joueur 2 (opposant) */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {isPlayer1 ? "Adversaire" : "Vos cartes"}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {(isPlayer1 ? gameState.player2 : gameState.player1).cards.map(
              (card) => renderCard(card, isPlayer1)
            )}
          </Box>
        </Grid>

        {/* Zone centrale */}
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <Typography variant="h5">
              {gameState.currentPlayer === currentPlayerId
                ? "C'est votre tour"
                : "Tour de l'adversaire"}
            </Typography>
          </Box>
        </Grid>

        {/* Joueur 1 (vous) */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {isPlayer1 ? "Vos cartes" : "Adversaire"}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {(isPlayer1 ? gameState.player1 : gameState.player2).cards.map(
              (card) => renderCard(card, !isPlayer1)
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default GameBoard;
