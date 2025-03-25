import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import config from "../config/config";
import PlayerHand from "../components/PlayerHand";
import GameBoard from "../components/GameBoard";
import GameActions from "../components/GameActions";

function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Vérifier si le joueur est authentifié
  useEffect(() => {
    const playerId = localStorage.getItem("playerId");
    if (!playerId) {
      navigate("/");
    }
  }, [navigate]);

  // Récupérer l'état initial de la partie
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const response = await axios.get(
          `${config.apiUrl}/api/games/state/${gameId}`,
          {
            headers: {
              Authorization: localStorage.getItem("playerId"),
            },
          }
        );
        setGameState(response.data.state);
      } catch (err) {
        setError(
          err.response?.data?.error ||
            "Erreur lors de la récupération de la partie"
        );
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(fetchGameState, 2000); // Polling toutes les 2 secondes
    return () => clearInterval(interval);
  }, [gameId]);

  const handleCardSelect = (card) => {
    setSelectedCard(card);
    setSelectedTarget(null);
  };

  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
  };

  const handlePlayBonus = async () => {
    if (!selectedCard || !selectedTarget) return;

    try {
      const response = await axios.post(
        `${config.apiUrl}/api/games/play-bonus`,
        {
          gameId,
          bonusCardId: selectedCard.id,
          targetPersoId: selectedTarget.id,
        },
        {
          headers: {
            Authorization: localStorage.getItem("playerId"),
          },
        }
      );

      if (response.data.success) {
        setGameState(response.data.state);
        setSelectedCard(null);
        setSelectedTarget(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Erreur lors de l'utilisation du bonus"
      );
    }
  };

  const handleAttack = async () => {
    if (!selectedCard || !selectedTarget) return;

    try {
      const response = await axios.post(
        `${config.apiUrl}/api/games/attack`,
        {
          gameId,
          attackerCardId: selectedCard.id,
          targetCardId: selectedTarget.id,
        },
        {
          headers: {
            Authorization: localStorage.getItem("playerId"),
          },
        }
      );

      if (response.data.success) {
        setGameState(response.data.state);
        setSelectedCard(null);
        setSelectedTarget(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'attaque");
    }
  };

  const handleEndTurn = async () => {
    try {
      const response = await axios.post(
        `${config.apiUrl}/api/games/end-turn`,
        { gameId },
        {
          headers: {
            Authorization: localStorage.getItem("playerId"),
          },
        }
      );

      if (response.data.success) {
        setGameState(response.data.state);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la fin du tour");
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!gameState) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Partie non trouvée
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Partie en cours
      </Typography>

      <Grid container spacing={3}>
        {/* Plateau de jeu */}
        <Grid item xs={12}>
          <GameBoard
            gameState={gameState}
            selectedCard={selectedCard}
            selectedTarget={selectedTarget}
            onCardSelect={handleCardSelect}
            onTargetSelect={handleTargetSelect}
          />
        </Grid>

        {/* Actions de jeu */}
        <Grid item xs={12}>
          <GameActions
            selectedCard={selectedCard}
            selectedTarget={selectedTarget}
            onPlayBonus={handlePlayBonus}
            onAttack={handleAttack}
            onEndTurn={handleEndTurn}
            isPlayerTurn={
              gameState.currentPlayer === localStorage.getItem("playerId")
            }
          />
        </Grid>

        {/* Main du joueur */}
        <Grid item xs={12}>
          <PlayerHand
            cards={gameState.playerHand}
            selectedCard={selectedCard}
            onCardSelect={handleCardSelect}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Game;
