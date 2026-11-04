const { Router } = require("express");

// GET /aggregated-data: Leilão Service + Comissão Service + Function em uma única resposta
module.exports = (container) =>
  Router().get("/aggregated-data", async (_req, res) => {
    res.json(await container.obterDadosAgregados().executar());
  });
