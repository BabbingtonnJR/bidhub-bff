const { IComissaoServiceClient } = require("../../application/ports/IComissaoServiceClient");
const { ServicoHttpClient } = require("./ServicoHttpClient");

class ComissaoServiceClient extends IComissaoServiceClient {
  constructor({ baseUrl, timeoutMs, fetchImpl }) {
    super();
    this.http = new ServicoHttpClient({ nome: "Comissão Service", baseUrl, timeoutMs, fetchImpl });
  }

  async listar() {
    return this.http.obterJson("/comissoes");
  }

  async repassar({ metodo, caminho, corpo }) {
    return this.http.requisitar({ metodo, caminho, corpo });
  }
}

module.exports = { ComissaoServiceClient };
