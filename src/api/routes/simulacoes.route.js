const { Router } = require("express");

// POST /simulacoes/comissao { valorBase, categoria }
module.exports = (container) =>
  Router().post("/simulacoes/comissao", async (req, res) => {
    res.json(await container.simularComissao().executar(req.body || {}));
  });
