// Porta para a Function Calcular Comissão. CalculadoraComissaoClient (infrastructure) implementa.
class ICalculadoraComissao {
  // { valorBase, categoria } -> { valorBase, percentual, valorCobrado, faixas }
  async calcular(_entrada) {
    throw new Error("ICalculadoraComissao.calcular não implementado");
  }

  // [{ leilaoId, valorBase, categoria }] -> { itens: [...], total }
  async calcularLote(_itens) {
    throw new Error("ICalculadoraComissao.calcularLote não implementado");
  }
}

module.exports = { ICalculadoraComissao };
