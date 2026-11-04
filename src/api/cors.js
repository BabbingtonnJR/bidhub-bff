// CORS para rodar o front direto contra o BFF (local).
// Atrás do API Gateway, use CORS_ORIGIN=desligado: o APIM já responde o CORS, e cabeçalho
// Access-Control-Allow-Origin duplicado faz o navegador recusar a resposta.
function cors(origem = "*") {
  if (!origem || origem === "desligado") return (_req, _res, next) => next();
  return (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Ocp-Apim-Subscription-Key");
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  };
}

module.exports = { cors };
