// Traduz erros em status HTTP.
const STATUS_POR_TIPO = Object.freeze({
  validacao: 400,
  "nao-encontrado": 404,
  conflito: 409,
  "regra-de-negocio": 422,
  "servico-indisponivel": 502,
});

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "Corpo da requisição deve ser um JSON válido" });
  }
  const status = STATUS_POR_TIPO[err && err.tipo];
  if (status) return res.status(status).json({ erro: err.message });
  console.error(err);
  return res.status(500).json({ erro: "Erro interno no BFF", detalhe: err && err.message });
}

module.exports = { errorHandler, STATUS_POR_TIPO };
