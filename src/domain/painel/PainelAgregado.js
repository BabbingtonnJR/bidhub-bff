// Indicadores do painel (Seção 5.2 do arc42): leilões por status, comissões por status e comissão projetada.
const STATUS_LEILAO = ["ao-vivo", "agendado", "encerrado"];
const STATUS_COMISSAO = ["PENDENTE", "COBRADA", "CONCILIADA"];

const somar = (lista, campo) => Math.round(lista.reduce((s, x) => s + (Number(x[campo]) || 0), 0) * 100) / 100;
const contarPor = (lista, campo, chaves) => Object.fromEntries(chaves.map((k) => [k, lista.filter((x) => x[campo] === k).length]));

class PainelAgregado {
  static montar({ leiloes = [], comissoes = [], projecao = [] }) {
    const comComissao = new Set(comissoes.map((c) => c.leilaoId));
    const encerrados = leiloes.filter((l) => l.status === "encerrado");
    return {
      totalLeiloes: leiloes.length,
      leiloesPorStatus: contarPor(leiloes, "status", STATUS_LEILAO),
      valorEmDisputa: somar(leiloes.filter((l) => l.status === "ao-vivo"), "lanceAtual"),
      totalComissoes: comissoes.length,
      comissoesPorStatus: contarPor(comissoes, "status", STATUS_COMISSAO),
      valorTotalComissoes: somar(comissoes, "valorCobrado"),
      valorComissoesPendentes: somar(comissoes.filter((c) => c.status === "PENDENTE"), "valorCobrado"),
      comissaoProjetadaTotal: somar(projecao, "valorCobrado"),
      // leilões encerrados cuja comissão ainda não chegou (consistência eventual, ADR-11)
      encerradosAguardandoComissao: encerrados.filter((l) => !comComissao.has(l.id)).length,
    };
  }
}

module.exports = { PainelAgregado };
