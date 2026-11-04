// Composition root: lê as URLs das variáveis de ambiente e injeta os clientes nos casos de uso.
const { LeilaoServiceClient } = require("../infrastructure/http/LeilaoServiceClient");
const { ComissaoServiceClient } = require("../infrastructure/http/ComissaoServiceClient");
const { CalculadoraComissaoClient } = require("../infrastructure/http/CalculadoraComissaoClient");
const { ObterDadosAgregadosUseCase } = require("../application/obter-dados-agregados/ObterDadosAgregadosUseCase");
const { SimularComissaoUseCase } = require("../application/simular-comissao/SimularComissaoUseCase");

function criarContainer({ env = process.env, leilaoService, comissaoService, calculadora, fetchImpl, relogio } = {}) {
  const timeoutMs = Number(env.SERVICOS_TIMEOUT_MS) || 2500;
  const leiloes = leilaoService || new LeilaoServiceClient({ baseUrl: env.LEILAO_SERVICE_URL || "http://localhost:3001", timeoutMs, fetchImpl });
  const comissoes = comissaoService || new ComissaoServiceClient({ baseUrl: env.COMISSAO_SERVICE_URL || "http://localhost:3002", timeoutMs, fetchImpl });
  const calc = calculadora || new CalculadoraComissaoClient({ url: env.FUNCTION_URL || "http://localhost:7071/api/calcular-comissao", timeoutMs, fetchImpl });

  return {
    leilaoService: leiloes,
    comissaoService: comissoes,
    obterDadosAgregados: () => new ObterDadosAgregadosUseCase({ leilaoService: leiloes, comissaoService: comissoes, calculadora: calc, relogio }),
    simularComissao: () => new SimularComissaoUseCase({ calculadora: calc }),
  };
}

module.exports = { criarContainer };
