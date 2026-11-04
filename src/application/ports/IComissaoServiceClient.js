// Porta para o Comissão Service. ComissaoServiceClient (infrastructure) implementa com fetch.
class IComissaoServiceClient {
  async listar() {
    throw new Error("IComissaoServiceClient.listar não implementado");
  }
}

module.exports = { IComissaoServiceClient };
