const { ICalculadoraComissao } = require("../../application/ports/ICalculadoraComissao");
const { ServicoHttpClient } = require("./ServicoHttpClient");

// Chama a Function POST /api/calcular-comissao. FUNCTION_URL já inclui ?code=<chave>.
class CalculadoraComissaoClient extends ICalculadoraComissao {
  constructor({ url, timeoutMs, fetchImpl }) {
    super();
    this.urlFunction = url;
    this.http = new ServicoHttpClient({ nome: "Function Calcular Comissão", baseUrl: url, timeoutMs, fetchImpl });
  }

  async postar(corpo) {
    const { status, corpo: resposta } = await this.http.requisitar({ metodo: "POST", url: this.urlFunction, corpo });
    if (status !== 200) {
      throw new Error(`Function Calcular Comissão respondeu ${status}${resposta && resposta.erro ? `: ${resposta.erro}` : ""}`);
    }
    return resposta;
  }

  async calcular({ valorBase, categoria }) {
    return this.postar({ valorBase, categoria });
  }

  async calcularLote(itens) {
    return this.postar({ itens });
  }
}

module.exports = { CalculadoraComissaoClient };
