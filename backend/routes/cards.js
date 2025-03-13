const express = require("express");
const router = express.Router();
const cardManager = require("../services/cardManager");

router.get("/random", (req, res) => {
  const type = req.query.type;
  const count = parseInt(req.query.count);
  const cards = cardManager.getRandomCards(type, count);
  res.json(cards);
});

router.get("/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const card = cardManager.getCardById(type, id);
  res.json(card);
});

module.exports = router;
