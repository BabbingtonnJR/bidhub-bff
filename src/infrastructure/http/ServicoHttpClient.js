const { ServicoIndisponivelError } = require("./ServicoIndisponivelError");

// Cliente HTTP genérico usado pelos clientes de cada serviço. Usa o fetch nativo do Node 24.
class ServicoHttpClient {
  constructor({ nome, baseUrl, timeoutMs = 2500, fetchImpl = globalThis.fetch }) {
    if (!baseUrl) throw new Error(`URL do ${nome} não configurada`);
    this.nome = nome;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  url(caminho) {
    return caminho.startsWith("http") ? caminho : `${this.baseUrl}${caminho}`;
  }

  // devolve { status, corpo } sem interpretar o status: quem chama decide (proxy repassa, agregação valida)
  async requisitar({ metodo = "GET", caminho = "", corpo, url } = {}) {
    let resposta;
    try {
      resposta = await this.fetch(url || this.url(caminho), {
        method: metodo,
        headers: corpo === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const motivo = err && (err.name === "TimeoutError" || err.name === "AbortError") ? `sem resposta em ${this.timeoutMs} ms` : err.message;
      throw new ServicoIndisponivelError(`${this.nome} indisponível: ${motivo}`);
    }
    const texto = await resposta.text();
    let dados = null;
    if (texto) {
      try {
        dados = JSON.parse(texto);
      } catch {
        dados = { erro: texto };
      }
    }
    return { status: resposta.status, corpo: dados };
  }

  // para a agregação: exige 2xx
  async obterJson(caminho) {
    const { status, corpo } = await this.requisitar({ caminho });
    if (status < 200 || status >= 300) {
      throw new Error(`${this.nome} respondeu ${status}${corpo && corpo.erro ? `: ${corpo.erro}` : ""}`);
    }
    return corpo;
  }
}

module.exports = { ServicoHttpClient };
