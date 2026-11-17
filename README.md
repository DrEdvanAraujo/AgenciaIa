# AgenciaIa

Estúdio de agentes de IA da agência, num escritório 3D. Cada agente é um especialista em uma tarefa de marketing, e todos usam o **[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi)** como motor: um roteador que junta as cotas gratuitas de vários provedores de IA (Gemini, Groq, OpenRouter, Kilo, OVH e outros) em uma única API.

## O que tem

- **Agência (3D):** cada agente tem uma mesa no escritório. Arraste para girar, role para aproximar e clique num agente para conversar. Quem está escrevendo se mexe, e o núcleo no centro (o motor de IA) acelera.
- **Conversa em tempo real:** a resposta aparece enquanto é escrita. Depois, peça ajustes ("mais curto", "outra versão" ou qualquer pedido seu) e o agente refaz. Se um modelo gratuito falhar antes de responder, o Estúdio tenta outro sozinho.
- **Painel:** pedidos, tokens, tempo médio, pedidos por dia, uso por agente, modelos que mais responderam, últimos pedidos e o catálogo de modelos do FreeLLMAPI (prontos ou precisando de chave).
- **Agentes:** descreva em português o especialista que você quer e a IA monta o agente (nome, perguntas do formulário e instruções). Revise, ajuste, escolha a cor e salve: ele ganha uma mesa no escritório. Também dá para criar do zero, editar e apagar.
- **Funciona no celular:** o escritório, a conversa, o painel e o editor se adaptam à tela.

### Equipe original

| Agente | Entrega |
|---|---|
| Estrategista | Plano de conteúdo de 7 dias (canal, formato, tema, objetivo, chamada) |
| Copywriter | Legenda para Instagram com ganchos, chamada para ação e hashtags |
| Roteirista | Roteiro de Reels/TikTok de 30 a 60 s, cena a cena |
| Anúncios | 3 variações de anúncio para Meta Ads |
| Atendimento | Resposta pronta para WhatsApp e Direct |
| Revisor | Texto revisado e explicação das mudanças |

O **perfil do cliente** (botão "Cliente" no topo) entra em todas as conversas. Perfil e conversas ficam salvos no navegador. Os agentes que você cria e o histórico de uso ficam na pasta `data/` do projeto (fora do Git).

## Como rodar no seu computador

Você precisa do **Node.js 20 ou mais novo** e do **FreeLLMAPI** rodando (o app do Windows/Mac já basta).

1. No FreeLLMAPI, abra **Chaves** e clique em **Copiar chave de API**.
2. Copie `.env.example` para `.env` e cole a chave em `FREELLMAPI_KEY`.
   O app do Windows/Mac atende em `http://127.0.0.1:31415/v1`, que já é o padrão do `.env.example`. Se a porta for outra, ela aparece em "Running on" no menu do ícone ao lado do relógio. Instalações por Docker usam `http://127.0.0.1:3001/v1`.
3. Na pasta do projeto, abra o terminal (no Windows: digite `cmd` na barra de endereço do Explorador de Arquivos) e rode:

```bash
npm install
```

```bash
npm start
```

4. Abra http://localhost:8080 no navegador.

O `npm install` baixa a biblioteca 3D (three.js) para a pasta do projeto. Ele é opcional: sem ele, o Estúdio carrega o 3D pela internet.

Para conferir se está tudo certo (com o Estúdio ligado):

```bash
npm run testar
```

### Atualizar para uma versão nova

Baixe o projeto de novo do GitHub (ou rode `git pull`). Para não perder nada, mantenha o seu `.env` e a pasta `data/`.

## Rodando tudo sem o app (servidor ou nuvem)

O script abaixo instala o FreeLLMAPI numa versão fixa, ao lado deste repositório (`../freellmapi`):

```bash
npm run instalar-motor
```

Depois, este comando liga o motor na porta 3001 e o Estúdio na 8080. A chave é lida sozinha.

```bash
npm run iniciar
```

O motor já vem configurado (`motor/freellmapi.config.json`) com provedores que **não pedem chave** (OVH e Kilo), então funciona sem cadastro. Para ter mais cota e modelos melhores, adicione chaves gratuitas no painel do FreeLLMAPI (http://localhost:3001, página Chaves). Boas primeiras opções: Google Gemini, Groq e OpenRouter.

## Estrutura

```
server.mjs              servidor HTTP: interface, API dos agentes, conversa em tempo real, painel
src/agentes.mjs         equipe original, validação e montagem das conversas
src/motor.mjs           cliente do FreeLLMAPI (API compatível com OpenAI, com streaming)
src/armazem.mjs         agentes criados e registro de uso (pasta data/)
public/index.html       página (abas Agência, Painel e Agentes)
public/cena3d.js        escritório 3D (three.js)
public/app.js           conversa, painel e editor de agentes
public/app.css          visual (claro e escuro, celular e computador)
motor/                  configuração do FreeLLMAPI usada pelos scripts
scripts/                instalar o motor, iniciar tudo, teste rápido
```

## Cuidados

- Nunca coloque chaves de API no código nem no repositório: use o `.env`, que o Git ignora.
- O Estúdio não tem login. Use-o no seu computador ou numa rede privada.
- Provedores gratuitos podem registrar o que você envia (Kilo e o plano gratuito do Gemini fora da Europa, por exemplo). Não envie dados pessoais de pacientes ou clientes.
- Revise tudo antes de publicar: os agentes podem errar.
