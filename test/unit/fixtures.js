const leiloes = () => [
  { id: 1, titulo: "Quadro", categoria: "Arte", lanceAtual: 36500, status: "ao-vivo" },
  { id: 2, titulo: "Carro", categoria: "Veículos", lanceAtual: 220000, status: "ao-vivo" },
  { id: 3, titulo: "Vaso", categoria: "Arte", lanceAtual: 900, status: "agendado" },
  { id: 4, titulo: "Joia", categoria: "Joias", lanceAtual: 128000, status: "encerrado" },
  { id: 5, titulo: "Livro", categoria: "Livros", lanceAtual: 5000, status: "encerrado" },
];
const comissoes = () => [{ id: 1, leilaoId: 4, valorBase: 128000, percentual: 4.56, valorCobrado: 5840, status: "PENDENTE" }];

const regra = (v) => Math.round((Math.min(v, 100000) * 0.05 + Math.max(0, v - 100000) * 0.03) * 100) / 100;
const calculadoraFalsa = () => ({
  chamadas: [],
  async calcular({ valorBase }) { this.chamadas.push(["calcular", valorBase]); return { valorBase, percentual: 5, valorCobrado: regra(valorBase), faixas: [] }; },
  async calcularLote(itens) { this.chamadas.push(["lote", itens]); const r = itens.map((i) => ({ ...i, percentual: 5, valorCobrado: regra(i.valorBase) })); return { itens: r, total: r.reduce((s, i) => s + i.valorCobrado, 0) }; },
});

module.exports = { leiloes, comissoes, calculadoraFalsa };
