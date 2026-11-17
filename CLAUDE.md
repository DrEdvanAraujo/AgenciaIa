# AgenciaIa: notas para o Claude

- Idioma: tudo que o usuário vê (interface, README, mensagens de erro, commits) é em português do Brasil.
- Pilha: Node 20+, sem dependências npm no Estúdio (`server.mjs` usa só `node:http` e `fetch`). Não adicione framework sem necessidade.
- Motor de IA: FreeLLMAPI em `../freellmapi` (versão fixada em `scripts/instalar-motor.sh`). O Estúdio fala com ele pela API compatível com OpenAI (`src/motor.mjs`), modelo `auto`.
- Para ligar tudo numa sessão: `npm run instalar-motor` (se `../freellmapi/node_modules` não existir) e depois `npm run iniciar` em segundo plano. O Estúdio fica na porta 8080 e o painel do FreeLLMAPI na 3001.
- Teste rápido depois de mudanças: `npm run testar` (com o Estúdio ligado).
- Agentes ficam em `src/agentes.mjs`. Cada um tem `id`, `nome`, `funcao`, `descricao`, `campos` e `sistema`. As regras gerais (pt-BR, não inventar dados, Markdown) valem para todos.
- Segredos: nunca grave chaves de API em arquivos do repositório. O `.env` é ignorado pelo Git.
