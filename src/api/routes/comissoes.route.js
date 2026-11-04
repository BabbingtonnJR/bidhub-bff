const { Router } = require("express");
const { repassarPara } = require("./repassar");

// proxy do CRUD de comissões para o Comissão Service
module.exports = (container) => {
  const repassar = repassarPara(container.comissaoService);
  return Router()
    .get("/comissoes", repassar)
    .post("/comissoes", repassar)
    .get("/comissoes/:id", repassar)
    .put("/comissoes/:id", repassar)
    .delete("/comissoes/:id", repassar);
};
