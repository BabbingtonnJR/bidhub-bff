const { ILeilaoServiceClient } = require("../../application/ports/ILeilaoServiceClient");
const { ServicoHttpClient } = require("./ServicoHttpClient");

class LeilaoServiceClient extends ILeilaoServiceClient {
  constructor({ baseUrl, timeoutMs, fetchImpl }) {
    super();
    this.http = new ServicoHttpClient({ nome: "Leilão Service", baseUrl, timeoutMs, fetchImpl });
  }

  async listar() {
    return this.http.obterJson("/leiloes");
  }

  // usado pelas rotas de proxy (CRUD): repassa método, caminho e corpo
  async repassar({ metodo, caminho, corpo }) {
    return this.http.requisitar({ metodo, caminho, corpo });
  }
}

module.exports = { LeilaoServiceClient };
