// monta um handler que repassa a requisição ao serviço e devolve o mesmo status e corpo
function repassarPara(cliente) {
  return async (req, res) => {
    const temCorpo = ["POST", "PUT"].includes(req.method);
    const { status, corpo } = await cliente.repassar({
      metodo: req.method,
      caminho: req.originalUrl, // mesmo caminho e query string (ex.: /leiloes?status=ao-vivo)
      corpo: temCorpo ? req.body || {} : undefined,
    });
    if (corpo === null) return res.status(status).end();
    return res.status(status).json(corpo);
  };
}

module.exports = { repassarPara };
