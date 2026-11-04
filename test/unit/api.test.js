const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { criarApp } = require("../../src/api/app");
const { criarContainer } = require("../../src/api/container");
const { leiloes, comissoes } = require("./fixtures");

// sobe um servidor Express numa porta livre
async function subir(app) {
  const s = app.listen(0);
  await new Promise((r) => s.once("listening", r));
  return { s, url: `http://127.0.0.1:${s.address().port}` };
}

describe("BFF por HTTP, com serviços falsos no lugar dos microsserviços e da Function", () => {
  let leilaoFalso, comissaoFalso, functionFalsa, bff, recebidos;
  const servidores = [];

  before(async () => {
    recebidos = [];
    const l = express().use(express.json());
    l.get("/leiloes", (req, res) => res.json(req.query.status ? leiloes().filter((x) => x.status === req.query.status) : leiloes()));
    l.post("/leiloes/:id/lances", (req, res) => {
      recebidos.push({ caminho: req.originalUrl, corpo: req.body });
      if (req.body.valor < 1000) return res.status(422).json({ erro: "Lance deve ser de pelo menos 1000" });
      if (req.body.valor === 1001) return res.status(409).json({ erro: "Outro lance foi registrado antes do seu." });
      return res.json({ id: Number(req.params.id), lanceAtual: req.body.valor });
    });
    l.delete("/leiloes/:id", (req, res) => res.status(404).json({ erro: "Leilão não encontrado" }));
    leilaoFalso = await subir(l);

    const c = express().use(express.json());
    c.get("/comissoes", (_req, res) => res.json(comissoes()));
    c.put("/comissoes/:id", (req, res) => res.json({ id: Number(req.params.id), status: req.body.status }));
    comissaoFalso = await subir(c);

    const f = express().use(express.json());
    f.post("/api/calcular-comissao", (req, res) => {
      if (req.query.code !== "chave") return res.status(401).end();
      if (req.body.itens) return res.json({ itens: req.body.itens.map((i) => ({ ...i, percentual: 5, valorCobrado: i.valorBase * 0.05 })), total: 0 });
      return res.json({ valorBase: req.body.valorBase, percentual: 5, valorCobrado: req.body.valorBase * 0.05, faixas: [] });
    });
    functionFalsa = await subir(f);

    const container = criarContainer({
      env: {
        LEILAO_SERVICE_URL: leilaoFalso.url,
        COMISSAO_SERVICE_URL: comissaoFalso.url,
        FUNCTION_URL: `${functionFalsa.url}/api/calcular-comissao?code=chave`,
        SERVICOS_TIMEOUT_MS: "1000",
      },
    });
    bff = await subir(criarApp(container));
    servidores.push(leilaoFalso.s, comissaoFalso.s, functionFalsa.s, bff.s);
  });
  after(() => servidores.forEach((s) => s.close()));

  const chamar = async (metodo, caminho, corpo, headers = {}) => {
    const res = await fetch(bff.url + caminho, { method: metodo, headers: { "content-type": "application/json", ...headers }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const texto = await res.text();
    return { status: res.status, headers: res.headers, corpo: texto ? JSON.parse(texto) : null };
  };

  test("GET /aggregated-data junta Leilão, Comissão e Function", async () => {
    const r = await chamar("GET", "/aggregated-data");
    assert.equal(r.status, 200);
    assert.equal(r.corpo.leiloes.length, 5);
    assert.equal(r.corpo.comissoes.length, 1);
    assert.deepEqual(r.corpo.projecao.map((p) => p.leilaoId), [1, 2]);
    assert.equal(r.corpo.resumo.totalLeiloes, 5);
    assert.deepEqual(r.corpo.erros, []);
  });

  test("proxy repassa query string, corpo e o status de erro do serviço (422, 409, 404)", async () => {
    assert.equal((await chamar("GET", "/leiloes?status=agendado")).corpo.length, 1);
    assert.deepEqual((await chamar("POST", "/leiloes/1/lances", { valor: 2000 })).corpo, { id: 1, lanceAtual: 2000 });
    assert.deepEqual(recebidos.at(-1), { caminho: "/leiloes/1/lances", corpo: { valor: 2000 } });
    const baixo = await chamar("POST", "/leiloes/1/lances", { valor: 10 });
    assert.equal(baixo.status, 422);
    assert.equal(baixo.corpo.erro, "Lance deve ser de pelo menos 1000");
    assert.equal((await chamar("POST", "/leiloes/1/lances", { valor: 1001 })).status, 409);
    assert.equal((await chamar("DELETE", "/leiloes/9")).status, 404);
    assert.equal((await chamar("PUT", "/comissoes/1", { status: "COBRADA" })).corpo.status, "COBRADA");
  });

  test("POST /simulacoes/comissao usa a Function com a chave", async () => {
    const r = await chamar("POST", "/simulacoes/comissao", { valorBase: 1000 });
    assert.equal(r.status, 200);
    assert.equal(r.corpo.valorCobrado, 50);
    assert.equal((await chamar("POST", "/simulacoes/comissao", {})).status, 400);
  });

  test("CORS: preflight responde 204 com os cabeçalhos", async () => {
    const r = await fetch(bff.url + "/aggregated-data", { method: "OPTIONS" });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("access-control-allow-origin"), "*");
    assert.match(r.headers.get("access-control-allow-headers"), /Ocp-Apim-Subscription-Key/);
  });

  test("Swagger em /docs", async () => {
    assert.equal((await chamar("GET", "/docs/openapi.json")).corpo.info.title, "BidHub - BFF");
    assert.equal((await fetch(bff.url + "/docs/")).status, 200);
  });
});

describe("BFF com serviço fora do ar", () => {
  test("proxy devolve 502 e /aggregated-data devolve resposta parcial", async () => {
    const leilao = express().use(express.json());
    leilao.get("/leiloes", (_req, res) => res.json(leiloes()));
    const { s: sl, url: urlLeilao } = await subir(leilao);
    const container = criarContainer({
      env: { LEILAO_SERVICE_URL: urlLeilao, COMISSAO_SERVICE_URL: "http://127.0.0.1:1", FUNCTION_URL: "http://127.0.0.1:1/api/calcular-comissao", SERVICOS_TIMEOUT_MS: "500" },
    });
    const { s: sb, url } = await subir(criarApp(container));
    try {
      const proxy = await fetch(url + "/comissoes");
      assert.equal(proxy.status, 502);
      assert.match((await proxy.json()).erro, /Comissão Service indisponível/);

      const agregado = await (await fetch(url + "/aggregated-data")).json();
      assert.equal(agregado.leiloes.length, 5);
      assert.deepEqual(agregado.erros.map((e) => e.fonte).sort(), ["comissao-service", "function-calcular-comissao"]);
    } finally {
      sl.close();
      sb.close();
    }
  });

  test("timeout: serviço lento vira erro identificado, sem travar a resposta", async () => {
    const lento = express();
    lento.get("/leiloes", (_req, res) => setTimeout(() => res.json([]), 2000));
    const { s: sl, url: urlLento } = await subir(lento);
    const container = criarContainer({ env: { LEILAO_SERVICE_URL: urlLento, COMISSAO_SERVICE_URL: "http://127.0.0.1:1", FUNCTION_URL: "http://127.0.0.1:1/x", SERVICOS_TIMEOUT_MS: "300" } });
    const inicio = Date.now();
    const r = await container.obterDadosAgregados().executar();
    assert.ok(Date.now() - inicio < 1500);
    assert.match(r.erros[0].mensagem, /sem resposta em 300 ms/);
    sl.closeAllConnections();
    sl.close();
  });
});

describe("CORS desligado atrás do API Gateway", () => {
  test("CORS_ORIGIN=desligado não envia cabeçalhos CORS", async () => {
    const s = criarApp(criarContainer({ env: {} }), { origemCors: "desligado" }).listen(0);
    await new Promise((r) => s.once("listening", r));
    const r = await fetch(`http://127.0.0.1:${s.address().port}/health`);
    assert.equal(r.headers.get("access-control-allow-origin"), null);
    s.close();
  });
});
