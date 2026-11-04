// Falha de rede ou tempo esgotado ao chamar um serviço. A API responde 502 (pelo "tipo").
class ServicoIndisponivelError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = "ServicoIndisponivelError";
    this.tipo = "servico-indisponivel";
  }
}

module.exports = { ServicoIndisponivelError };
