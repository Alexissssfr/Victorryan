import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

function GameActions({
  selectedCard,
  selectedTarget,
  onPlayBonus,
  onAttack,
  onEndTurn,
  isPlayerTurn,
}) {
  const canPlayBonus =
    selectedCard?.type === "bonus" && selectedTarget?.type === "perso";
  const canAttack =
    selectedCard?.type === "perso" && selectedTarget?.type === "perso";

  if (!isPlayerTurn) {
    return (
      <Box sx={{ textAlign: "center", my: 2 }}>
        <Typography variant="h6" color="text.secondary">
          C'est le tour de l'adversaire
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: "center", my: 2 }}>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          color="primary"
          onClick={onPlayBonus}
          disabled={!canPlayBonus}
        >
          Utiliser le bonus
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={onAttack}
          disabled={!canAttack}
        >
          Attaquer
        </Button>
        <Button variant="outlined" color="inherit" onClick={onEndTurn}>
          Terminer le tour
        </Button>
      </Stack>
      {selectedCard && !selectedTarget && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Sélectionnez une cible pour{" "}
          {selectedCard.type === "bonus" ? "utiliser le bonus" : "attaquer"}
        </Typography>
      )}
    </Box>
  );
}

export default GameActions;
