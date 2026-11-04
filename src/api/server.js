const { criarApp } = require("./app");
const { criarContainer } = require("./container");

const porta = Number(process.env.PORT) || 3000;
const app = criarApp(criarContainer());

const servidor = app.listen(porta, () => console.log(`BFF na porta ${porta}`));
process.on("SIGTERM", () => servidor.close(() => process.exit(0)));
process.on("SIGINT", () => servidor.close(() => process.exit(0)));
