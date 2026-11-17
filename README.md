# AgenciaIa

Estúdio de agentes de IA da agência. Cada agente é um especialista em uma tarefa de marketing, e todos usam o **[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi)** como motor: um roteador que junta as cotas gratuitas de vários provedores de IA (Gemini, Groq, OpenRouter, Kilo, OVH e outros) em uma única API.

## Os agentes

| Agente | Entrega |
|---|---|
| Estrategista | Plano de conteúdo de 7 dias (canal, formato, tema, objetivo, chamada) |
| Copywriter | Legenda para Instagram com ganchos, chamada para ação e hashtags |
| Roteirista | Roteiro de Reels/TikTok de 30 a 60 s, cena a cena |
| Anúncios | 3 variações de anúncio para Meta Ads |
| Atendimento | Resposta pronta para WhatsApp e Direct |
| Revisor | Texto revisado e explicação das mudanças |

O **perfil do cliente** (marca, nicho, público, tom de voz) entra em todos os pedidos. O perfil e as últimas 20 entregas ficam salvos só no navegador de quem usa.

Para criar ou mudar um agente, edite `src/agentes.mjs`: cada agente tem nome, campos do formulário e as instruções (`sistema`).

## Como rodar no seu computador

Você precisa do **Node.js 20 ou mais novo** e do **FreeLLMAPI** rodando (o app do Windows/Mac já basta).

1. No FreeLLMAPI, abra **Chaves** e clique em **Copiar chave de API**.
2. Neste repositório, copie `.env.example` para `.env` e cole a chave em `FREELLMAPI_KEY`.
   O app do Windows/Mac atende em `http://127.0.0.1:31415/v1`, que já é o padrão do `.env.example`. Se a porta for outra, ela aparece em "Running on" no menu do ícone ao lado do relógio. Instalações por Docker usam `http://127.0.0.1:3001/v1`.
3. Inicie o Estúdio:

```bash
npm start
```

4. Abra http://localhost:8080 no navegador. No Windows, rode o comando no Prompt de Comando aberto dentro da pasta (digite `cmd` na barra de endereço do Explorador de Arquivos).

Para conferir se está tudo certo (com o Estúdio ligado):

```bash
npm run testar
```

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
server.mjs              servidor HTTP (interface + API dos agentes), sem dependências
src/agentes.mjs         definição dos agentes e montagem dos prompts
src/motor.mjs           cliente do FreeLLMAPI (API compatível com OpenAI)
public/                 interface do Estúdio
motor/                  configuração do FreeLLMAPI usada pelos scripts
scripts/                instalar o motor, iniciar tudo, teste rápido
```

## Cuidados

- Nunca coloque chaves de API no código nem no repositório: use o `.env`, que o Git ignora.
- O Estúdio não tem login. Use-o no seu computador ou numa rede privada.
- Provedores gratuitos podem registrar o que você envia (Kilo e o plano gratuito do Gemini fora da Europa, por exemplo). Não envie dados pessoais de pacientes ou clientes.
- Revise tudo antes de publicar: os agentes podem errar.
