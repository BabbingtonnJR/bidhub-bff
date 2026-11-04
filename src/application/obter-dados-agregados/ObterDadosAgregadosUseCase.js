const { PainelAgregado } = require("../../domain/painel/PainelAgregado");

// GET /aggregated-data (Seção 6.1): Leilão Service e Comissão Service em paralelo,
// depois a Function com os leilões ao vivo. Se uma fonte falhar, devolve o resto e preenche "erros".
class ObterDadosAgregadosUseCase {
  constructor({ leilaoService, comissaoService, calculadora, relogio = () => new Date() }) {
    this.leilaoService = leilaoService;
    this.comissaoService = comissaoService;
    this.calculadora = calculadora;
    this.relogio = relogio;
  }

  async executar() {
    const erros = [];
    const [resLeiloes, resComissoes] = await Promise.allSettled([this.leilaoService.listar(), this.comissaoService.listar()]);

    const leiloes = resLeiloes.status === "fulfilled" ? resLeiloes.value : [];
    if (resLeiloes.status === "rejected") erros.push({ fonte: "leilao-service", mensagem: resLeiloes.reason.message });

    const comissoes = resComissoes.status === "fulfilled" ? resComissoes.value : [];
    if (resComissoes.status === "rejected") erros.push({ fonte: "comissao-service", mensagem: resComissoes.reason.message });

    // comissão projetada: quanto a plataforma receberia se cada leilão ao vivo fechasse no lance atual
    let projecao = [];
    const aoVivo = leiloes.filter((l) => l.status === "ao-vivo");
    if (aoVivo.length) {
      try {
        const { itens } = await this.calculadora.calcularLote(
          aoVivo.map((l) => ({ leilaoId: l.id, valorBase: l.lanceAtual, categoria: l.categoria }))
        );
        projecao = itens.map(({ leilaoId, valorBase, percentual, valorCobrado }) => ({ leilaoId, valorBase, percentual, valorCobrado }));
      } catch (err) {
        erros.push({ fonte: "function-calcular-comissao", mensagem: err.message });
      }
    }

    return {
      leiloes,
      comissoes,
      projecao,
      resumo: PainelAgregado.montar({ leiloes, comissoes, projecao }),
      erros,
      geradoEm: this.relogio().toISOString(),
    };
  }
}

module.exports = { ObterDadosAgregadosUseCase };
