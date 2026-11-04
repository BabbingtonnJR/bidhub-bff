const { ValidacaoError } = require("../../domain/errors/DomainError");

// POST /simulacoes/comissao: quanto custaria a comissão para um valor qualquer (MF Financeiro)
class SimularComissaoUseCase {
  constructor({ calculadora }) {
    this.calculadora = calculadora;
  }

  async executar({ valorBase, categoria } = {}) {
    const valor = Number(valorBase);
    if (valorBase === undefined || valorBase === "" || !Number.isFinite(valor) || valor < 0) {
      throw new ValidacaoError("valorBase deve ser um número maior ou igual a zero");
    }
    return this.calculadora.calcular({ valorBase: valor, categoria });
  }
}

module.exports = { SimularComissaoUseCase };
