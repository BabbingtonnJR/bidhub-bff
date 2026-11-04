const { Router } = require("express");
const { repassarPara } = require("./repassar");

// proxy do CRUD de leilões para o Leilão Service
module.exports = (container) => {
  const repassar = repassarPara(container.leilaoService);
  return Router()
    .get("/leiloes", repassar)
    .post("/leiloes", repassar)
    .get("/leiloes/:id", repassar)
    .put("/leiloes/:id", repassar)
    .delete("/leiloes/:id", repassar)
    .post("/leiloes/:id/lances", repassar)
    .post("/leiloes/:id/encerramento", repassar);
};
