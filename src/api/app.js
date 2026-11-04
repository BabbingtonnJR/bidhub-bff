const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");
const { errorHandler } = require("./errorHandler");
const { cors } = require("./cors");

const rotas = [
  require("./routes/aggregated-data.route"),
  require("./routes/leiloes.route"),
  require("./routes/comissoes.route"),
  require("./routes/simulacoes.route"),
];

const openapi = YAML.parse(fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"));

function criarApp(container, { origemCors = process.env.CORS_ORIGIN || "*" } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors(origemCors));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok", servico: "bff" }));
  app.get("/docs/openapi.json", (_req, res) => res.json(openapi));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "BidHub - BFF" }));

  for (const rota of rotas) app.use(rota(container));

  app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada" }));
  app.use(errorHandler);
  return app;
}

module.exports = { criarApp };
