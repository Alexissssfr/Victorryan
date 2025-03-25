import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Alert,
} from "@mui/material";
import axios from "axios";
import config from "../config/config";

function Home() {
  const navigate = useNavigate();
  const [playerId, setPlayerId] = useState("");
  const [gameId, setGameId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGame = async () => {
    if (!playerId) {
      setError("Veuillez entrer votre identifiant");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${config.apiUrl}/api/games/create`, {
        playerId,
      });

      if (response.data.success) {
        localStorage.setItem("playerId", playerId);
        navigate(`/game/${response.data.gameId}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Erreur lors de la création de la partie"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerId || !gameId) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${config.apiUrl}/api/games/join`, {
        playerId,
        gameId,
      });

      if (response.data.success) {
        localStorage.setItem("playerId", playerId);
        navigate(`/game/${gameId}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Erreur lors de la connexion à la partie"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Bienvenue dans le Jeu de Cartes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Créer une nouvelle partie
            </Typography>
            <TextField
              fullWidth
              label="Votre identifiant"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              margin="normal"
              disabled={loading}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleCreateGame}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Créer une partie
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rejoindre une partie existante
            </Typography>
            <TextField
              fullWidth
              label="Votre identifiant"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              margin="normal"
              disabled={loading}
            />
            <TextField
              fullWidth
              label="ID de la partie"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              margin="normal"
              disabled={loading}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleJoinGame}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Rejoindre la partie
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Home;
