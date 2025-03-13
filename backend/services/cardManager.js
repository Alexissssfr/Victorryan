const fs = require("fs");
const path = require("path");

const persoData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../stock/personnages.json"), "utf8")
);
const bonusData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../stock/bonus.json"), "utf8")
);

function getRandomCards(type, count) {
  const data = type === "perso" ? persoData : bonusData;
  const shuffled = data.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getCardById(type, id) {
  const data = type === "perso" ? persoData : bonusData;
  return data.find((card) => card.id === id);
}

module.exports = {
  getRandomCards,
  getCardById,
};
