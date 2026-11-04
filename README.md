# BidHub — BFF (Backend for Frontend)

Backend feito sob medida para os microfrontends do BidHub. É o único backend que o front usa, sempre pelo
API Gateway. Agrega os dois microsserviços e a Azure Function e repassa os CRUDs.

## Onde este serviço entra

```
Navegador ──> Shell + MFs (Static Web Apps) ──> API Gateway (APIM) ──> BFF ──┬──> Leilão Service ──> MongoDB Atlas
                                                                             │          │ publica LeilaoEncerrado
                                                                             │          v
                                                                             │     Service Bus (fila leilao-encerrado)
                                                                             │          │
                                                                             ├──> Comissão Service ──> Azure SQL
                                                                             │          │
                                                                             └──> Function Calcular Comissão <┘
```

## Endpoint obrigatório: `GET /aggregated-data`

Chama **em paralelo** o Leilão Service (`GET /leiloes`, MongoDB) e o Comissão Service (`GET /comissoes`, Azure SQL)
com `Promise.allSettled`; depois envia os leilões ao vivo de uma vez para a **Function** (`POST /api/calcular-comissao`
com `itens`), que devolve a comissão projetada de cada um. Responde um único JSON:

```json
{
  "leiloes": [ ... ],
  "comissoes": [ ... ],
  "projecao": [ { "leilaoId": 1, "valorBase": 34500, "percentual": 5, "valorCobrado": 1725 } ],
  "resumo": { "totalLeiloes": 4, "leiloesPorStatus": { "ao-vivo": 1, "agendado": 2, "encerrado": 1 },
              "valorEmDisputa": 34500, "comissaoProjetadaTotal": 1725, "valorComissoesPendentes": 0,
              "encerradosAguardandoComissao": 1, "...": "..." },
  "erros": [],
  "geradoEm": "2026-11-04T13:21:00.000Z"
}
```

Se uma fonte falhar ou passar do tempo limite (`SERVICOS_TIMEOUT_MS`, padrão 2,5 s), a resposta sai mesmo assim,
com o que respondeu, e `erros` diz qual fonte falhou (`leilao-service`, `comissao-service` ou `function-calcular-comissao`).

## Demais rotas

| Método | Rota | O que faz |
|---|---|---|
| GET/POST | `/leiloes` | proxy para o Leilão Service |
| GET/PUT/DELETE | `/leiloes/{id}` | proxy |
| POST | `/leiloes/{id}/lances` · `/leiloes/{id}/encerramento` | proxy |
| GET/POST | `/comissoes` | proxy para o Comissão Service |
| GET/PUT/DELETE | `/comissoes/{id}` | proxy |
| POST | `/simulacoes/comissao` | simula a comissão de um valor (Function) |
| GET | `/health` · `/docs` | saúde e Swagger UI |

O proxy devolve o mesmo status e corpo do microsserviço (ex.: 409 e 422 do lance chegam ao front com a mensagem
do domínio). Serviço fora do ar → **502**.

## Clean Architecture + Vertical Slice

| Camada | Pasta | Pode depender de |
|---|---|---|
| Domain | `src/domain` | só do próprio Domain (sem pacotes externos) |
| Application | `src/application/<feature>` + `src/application/ports` | Domain e as próprias portas |
| Infrastructure | `src/infrastructure` | Domain e portas (implementa as interfaces) |
| API | `src/api` | Application; só `container.js` (composition root) conhece a Infrastructure |

Cada pasta de `src/application` é uma feature (Vertical Slice) com um único caso de uso.
As regras acima são verificadas por `test/architecture/dependency-rules.test.js` (ver "Testes").

```
src/
  domain/          painel/ (PainelAgregado) · errors/
  application/     ports/ (ILeilaoServiceClient, IComissaoServiceClient, ICalculadoraComissao)
                   obter-dados-agregados (ObterDadosAgregadosUseCase) · simular-comissao (SimularComissaoUseCase)
  infrastructure/  http/ (ServicoHttpClient, LeilaoServiceClient, ComissaoServiceClient, CalculadoraComissaoClient)
  api/             routes/ (aggregated-data, leiloes, comissoes, simulacoes) · errorHandler · cors · openapi.yaml · container
apim/politica-api.xml   política do API Gateway (CORS, rate limit, backend)
```

## Tecnologias

Node.js 24 · Express 5 · fetch nativo · swagger-ui-express · node:test · Docker (`node:24-alpine`) ·
Azure Container Apps · Azure API Management (Consumption)

## Como rodar localmente

```bash
npm ci
cp .env.example .env
npm start                 # http://localhost:3000  ·  Swagger em http://localhost:3000/docs
```

| Variável | Padrão |
|---|---|
| `LEILAO_SERVICE_URL` | `http://localhost:3001` |
| `COMISSAO_SERVICE_URL` | `http://localhost:3002` |
| `FUNCTION_URL` | `http://localhost:7071/api/calcular-comissao` (na Azure, com `?code=<chave>`) |
| `SERVICOS_TIMEOUT_MS` | `2500` |
| `CORS_ORIGIN` | `*` localmente; **`desligado`** atrás do APIM (o Gateway faz o CORS) |

## API Gateway

A API é importada no APIM a partir de `https://<bff>/docs/openapi.json`, com sufixo `api` e assinatura obrigatória.
A política está em `apim/politica-api.xml` (CORS primeiro no inbound, `rate-limit` de 100 chamadas/min e
`set-backend-service` para o BFF). Pelo Gateway: `https://<apim>.azure-api.net/api/aggregated-data` com o cabeçalho
`Ocp-Apim-Subscription-Key`.

## Testes

```bash
npm test                  # 29 testes: unitários + arquitetura
```

Unitários: `PainelAgregado`, `ObterDadosAgregadosUseCase` (paralelismo, falha parcial de cada fonte, Function fora),
`SimularComissaoUseCase` e a API por HTTP contra serviços falsos (agregação, proxy com 409/422/404, 502, timeout, CORS).

O teste de arquitetura lê todos os arquivos de `src/`, extrai os `require()` e falha se:

1. `domain/` importar outra camada ou pacote externo;
2. `application/` importar algo além de `domain/` e `application/ports/`;
3. uma feature importar outra feature;
4. `infrastructure/` importar `api/`;
5. um arquivo de `api/` que não seja `container.js` importar `infrastructure/`.

Ele também confere que cada feature tem um único `*UseCase.js` e está ligada no `container.js`, e testa a si mesmo contra um projeto com violações plantadas.

## Docker

```bash
docker build -t <usuario-dockerhub>/bidhub-bff:v1 .
docker login
docker push <usuario-dockerhub>/bidhub-bff:v1

# rodar a imagem localmente
docker run --rm -p 3000:3000 --env-file .env <usuario-dockerhub>/bidhub-bff:v1
```

O workflow `.github/workflows/ci.yml` roda `npm test` em cada push e, na `main`, publica `latest` e `sha-<commit>` no Docker Hub
(segredos `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`). Se os testes falharem, a imagem não é publicada.

## Endereços publicados

Preencher depois da implantação (os mesmos endereços vão na Seção 7.3 do arc42).

| Item | URL |
|---|---|
| BFF | https://<bff>.<regiao>.azurecontainerapps.io |
| Swagger do BFF | https://<bff>.<regiao>.azurecontainerapps.io/docs |
| API Gateway | https://<apim>.azure-api.net/api |
| Imagem Docker | https://hub.docker.com/r/<usuario-dockerhub>/bidhub-bff |

## Repositórios do projeto

| Componente | Repositório |
|---|---|
| Front-end (Shell + MF Leilões + MF Financeiro) | https://github.com/BabbingtonnJR/bidhub-frontend |
| BFF | https://github.com/BabbingtonnJR/bidhub-bff |
| Microsserviço 1 — Leilão Service (MongoDB) | https://github.com/BabbingtonnJR/bidhub-leilao-service |
| Microsserviço 2 — Comissão Service (Azure SQL) | https://github.com/BabbingtonnJR/bidhub-comissao-service |
| Azure Function — Calcular Comissão | https://github.com/BabbingtonnJR/bidhub-function |

## Alunos

- André Gustavo
- Babbingtonn Luiz
- Gabriel Carmo
- Marcel Araújo

Disciplina: Arquitetura e Soluções Cloud · Professor: Manoel Valerio da Silveira Neto · PUCPR
