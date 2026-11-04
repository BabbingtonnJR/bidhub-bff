const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { ObterDadosAgregadosUseCase } = require("../../src/application/obter-dados-agregados/ObterDadosAgregadosUseCase");
const { SimularComissaoUseCase } = require("../../src/application/simular-comissao/SimularComissaoUseCase");
const { PainelAgregado } = require("../../src/domain/painel/PainelAgregado");
const { leiloes, comissoes, calculadoraFalsa } = require("./fixtures");

const relogio = () => new Date("2026-11-04T12:00:00.000Z");
const ok = (dados) => ({ listar: async () => dados });
const falha = (msg) => ({ listar: async () => { throw new Error(msg); } });

describe("PainelAgregado", () => {
  test("conta por status, soma valores e aponta encerrados sem comissão", () => {
    const r = PainelAgregado.montar({ leiloes: leiloes(), comissoes: comissoes(), projecao: [{ valorCobrado: 1825 }, { valorCobrado: 8600 }] });
    assert.deepEqual(r.leiloesPorStatus, { "ao-vivo": 2, agendado: 1, encerrado: 2 });
    assert.deepEqual(r.comissoesPorStatus, { PENDENTE: 1, COBRADA: 0, CONCILIADA: 0 });
    assert.equal(r.valorEmDisputa, 256500);
    assert.equal(r.valorTotalComissoes, 5840);
    assert.equal(r.comissaoProjetadaTotal, 10425);
    assert.equal(r.encerradosAguardandoComissao, 1); // leilão 5 encerrado, comissão ainda não chegou
  });
});

describe("Feature obter-dados-agregados (GET /aggregated-data)", () => {
  test("junta as três fontes em uma resposta e calcula a projeção só dos leilões ao vivo", async () => {
    const calc = calculadoraFalsa();
    const r = await new ObterDadosAgregadosUseCase({ leilaoService: ok(leiloes()), comissaoService: ok(comissoes()), calculadora: calc, relogio }).executar();
    assert.deepEqual(Object.keys(r), ["leiloes", "comissoes", "projecao", "resumo", "erros", "geradoEm"]);
    assert.equal(r.leiloes.length, 5);
    assert.equal(r.comissoes.length, 1);
    assert.deepEqual(r.projecao.map((p) => [p.leilaoId, p.valorCobrado]), [[1, 1825], [2, 8600]]);
    assert.deepEqual(calc.chamadas[0][1].map((i) => i.leilaoId), [1, 2]);
    assert.deepEqual(r.erros, []);
    assert.equal(r.geradoEm, "2026-11-04T12:00:00.000Z");
  });

  test("chama Leilão e Comissão em paralelo", async () => {
    let emAndamento = 0, maximo = 0;
    const lento = (dados) => ({ listar: async () => { emAndamento++; maximo = Math.max(maximo, emAndamento); await new Promise((r) => setTimeout(r, 20)); emAndamento--; return dados; } });
    await new ObterDadosAgregadosUseCase({ leilaoService: lento(leiloes()), comissaoService: lento(comissoes()), calculadora: calculadoraFalsa(), relogio }).executar();
    assert.equal(maximo, 2);
  });

  test("QC3: Comissão Service fora -> resposta parcial com o erro identificado", async () => {
    const r = await new ObterDadosAgregadosUseCase({ leilaoService: ok(leiloes()), comissaoService: falha("Comissão Service indisponível"), calculadora: calculadoraFalsa(), relogio }).executar();
    assert.equal(r.leiloes.length, 5);
    assert.deepEqual(r.comissoes, []);
    assert.equal(r.projecao.length, 2);
    assert.deepEqual(r.erros, [{ fonte: "comissao-service", mensagem: "Comissão Service indisponível" }]);
  });

  test("Leilão Service fora: sem leilões não há projeção, e a Function nem é chamada", async () => {
    const calc = calculadoraFalsa();
    const r = await new ObterDadosAgregadosUseCase({ leilaoService: falha("sem rede"), comissaoService: ok(comissoes()), calculadora: calc, relogio }).executar();
    assert.deepEqual(r.erros.map((e) => e.fonte), ["leilao-service"]);
    assert.deepEqual(r.projecao, []);
    assert.equal(calc.chamadas.length, 0);
  });

  test("Function fora: devolve leilões e comissões e registra o erro da Function", async () => {
    const calc = { calcularLote: async () => { throw new Error("Function respondeu 500"); } };
    const r = await new ObterDadosAgregadosUseCase({ leilaoService: ok(leiloes()), comissaoService: ok(comissoes()), calculadora: calc, relogio }).executar();
    assert.deepEqual(r.erros, [{ fonte: "function-calcular-comissao", mensagem: "Function respondeu 500" }]);
    assert.equal(r.resumo.comissaoProjetadaTotal, 0);
  });
});

describe("Feature simular-comissao", () => {
  test("valida e repassa à Function", async () => {
    const calc = calculadoraFalsa();
    const caso = new SimularComissaoUseCase({ calculadora: calc });
    assert.equal((await caso.executar({ valorBase: "220000" })).valorCobrado, 8600);
    await assert.rejects(caso.executar({}), { tipo: "validacao" });
    await assert.rejects(caso.executar({ valorBase: -1 }), { tipo: "validacao" });
  });
});
