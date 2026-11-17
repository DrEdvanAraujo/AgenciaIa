# AgenciaIa: notas para o Claude

- Idioma: tudo que o usuário vê (interface, README, mensagens de erro, commits) é em português do Brasil.
- Pilha: Node 20+. O servidor (`server.mjs`) não usa dependências npm (só `node:http` e `fetch`). A única dependência é `three` (escritório 3D), servida em `/vendor/three/` a partir de `node_modules`. Sem ela, o servidor redireciona para o CDN jsdelivr na mesma versão. Se mudar a versão do three, mude também `VERSAO_THREE` em `server.mjs`.
- Motor de IA: FreeLLMAPI. No PC do usuário é o app de desktop (`http://127.0.0.1:31415/v1`, chave no `.env`). Na nuvem fica em `../freellmapi` (versão fixada em `scripts/instalar-motor.sh`) na porta 3001. O Estúdio fala com ele pela API compatível com OpenAI (`src/motor.mjs`), modelo `auto`, com streaming.
- Para ligar tudo numa sessão na nuvem: `npm run instalar-motor` (se `../freellmapi/node_modules` não existir), `npm install`, e `npm run iniciar` em segundo plano. Estúdio na porta 8080, painel do FreeLLMAPI na 3001.
- Teste rápido depois de mudanças: `npm run testar` (com o Estúdio ligado).
- Rotas: `GET /api/agentes`, `POST /api/agentes`, `PUT|DELETE /api/agentes/:id` (só personalizados), `POST /api/agentes/rascunho` (IA cria o agente a partir de uma descrição), `POST /api/conversa/:id` (resposta em tempo real, eventos `inicio|pensando|texto|nova-tentativa|fim|erro`), `GET /api/painel`, `GET /api/status`.
- Agentes originais ficam em `src/agentes.mjs`. Os criados pelo usuário ficam em `data/agentes.json`, e o uso em `data/uso.jsonl` (pasta ignorada pelo Git).
- Segredos: nunca grave chaves de API em arquivos do repositório. O `.env` é ignorado pelo Git.
