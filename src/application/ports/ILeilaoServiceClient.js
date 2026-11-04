// Porta para o Leilão Service. LeilaoServiceClient (infrastructure) implementa com fetch.
class ILeilaoServiceClient {
  async listar() {
    throw new Error("ILeilaoServiceClient.listar não implementado");
  }
}

module.exports = { ILeilaoServiceClient };
