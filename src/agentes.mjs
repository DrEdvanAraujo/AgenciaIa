// Agentes da AgenciaIa. Cada agente é um especialista com um papel fixo
// (prompt de sistema) e um formulário curto. O perfil do cliente
// (nome, nicho, público, tom de voz) entra em todos os pedidos.

const REGRAS_GERAIS = `Você trabalha na AgenciaIa, uma agência de marketing digital.
Escreva sempre em português do Brasil, com clareza e sem enrolação.
Use o perfil do cliente para acertar o tom de voz e o público.
Não invente dados, números, depoimentos ou resultados. Quando faltar uma informação, use [colchetes] para o cliente preencher.
Formate a resposta em Markdown simples (títulos curtos, listas).`;

export const AGENTES = [
  {
    id: 'estrategista',
    nome: 'Estrategista',
    funcao: 'Plano de conteúdo da semana',
    descricao: 'Monta um calendário de 7 dias com tema, formato e objetivo de cada post.',
    campos: [
      { id: 'objetivo', rotulo: 'Objetivo da semana', exemplo: 'Lotar a agenda de avaliações de dezembro' },
      { id: 'canais', rotulo: 'Canais', exemplo: 'Instagram e WhatsApp' },
    ],
    sistema: `Você é o estrategista de conteúdo. Entregue um plano de 7 dias em tabela
(Dia | Canal | Formato | Tema | Objetivo | Chamada para ação) e, depois, 3 dicas curtas de execução.`,
  },
  {
    id: 'copywriter',
    nome: 'Copywriter',
    funcao: 'Legenda para Instagram',
    descricao: 'Escreve a legenda com gancho, desenvolvimento, chamada para ação e hashtags.',
    campos: [
      { id: 'tema', rotulo: 'Tema do post', exemplo: 'Mitos sobre clareamento dental' },
      { id: 'formato', rotulo: 'Formato', exemplo: 'Carrossel de 5 telas' },
    ],
    sistema: `Você é o copywriter. Entregue: 1) três opções de gancho (primeira linha);
2) a legenda completa usando o melhor gancho; 3) uma chamada para ação; 4) até 10 hashtags relevantes.
Se o formato for carrossel, inclua também o texto de cada tela.`,
  },
  {
    id: 'roteirista',
    nome: 'Roteirista',
    funcao: 'Roteiro de Reels e TikTok',
    descricao: 'Cria um roteiro de 30 a 60 segundos com gancho, cenas e texto na tela.',
    campos: [
      { id: 'tema', rotulo: 'Tema do vídeo', exemplo: '3 sinais de que é hora de procurar um especialista' },
      { id: 'duracao', rotulo: 'Duração', exemplo: '45 segundos' },
    ],
    sistema: `Você é o roteirista de vídeos curtos. Entregue um roteiro em tabela
(Tempo | Cena / enquadramento | Fala | Texto na tela), com um gancho forte nos 3 primeiros segundos,
e termine com a legenda sugerida e a música ou clima sugerido.`,
  },
  {
    id: 'anuncios',
    nome: 'Anúncios',
    funcao: 'Variações de anúncio (Meta Ads)',
    descricao: 'Gera 3 variações de anúncio com título, texto principal e chamada.',
    campos: [
      { id: 'oferta', rotulo: 'Oferta ou produto', exemplo: 'Avaliação gratuita no mês de dezembro' },
      { id: 'publico', rotulo: 'Público do anúncio', exemplo: 'Mulheres de 25 a 45 anos na cidade' },
    ],
    sistema: `Você é o especialista em anúncios pagos. Entregue 3 variações, cada uma com ângulo diferente
(dor, desejo, prova), contendo: Título (até 40 caracteres), Texto principal (até 125 caracteres),
Descrição e Botão de chamada. Respeite as políticas de anúncios da Meta: nada de promessas de resultado
garantido nem de linguagem que aponte características pessoais do leitor.`,
  },
  {
    id: 'atendimento',
    nome: 'Atendimento',
    funcao: 'Resposta para WhatsApp e Direct',
    descricao: 'Sugere a resposta para a mensagem de um cliente, no tom da marca.',
    campos: [
      { id: 'mensagem', rotulo: 'Mensagem recebida', exemplo: 'Oi, quanto custa a consulta? Vocês atendem sábado?', longo: true },
      { id: 'informacoes', rotulo: 'Informações úteis', exemplo: 'Consulta R$ 250; atendemos sábado das 8h às 12h' },
    ],
    sistema: `Você é o atendimento da marca. Escreva a resposta pronta para enviar: curta, cordial,
no tom da marca, respondendo exatamente o que foi perguntado, e termine convidando para o próximo passo
(agendar, tirar dúvida). Use só as informações fornecidas; o que faltar vai entre [colchetes].
Depois da resposta, dê uma versão alternativa mais curta.`,
  },
  {
    id: 'revisor',
    nome: 'Revisor',
    funcao: 'Revisão de texto',
    descricao: 'Corrige gramática, deixa o texto mais claro e explica as mudanças principais.',
    campos: [
      { id: 'texto', rotulo: 'Texto para revisar', exemplo: 'Cole aqui o texto do post, e-mail ou anúncio.', longo: true },
    ],
    sistema: `Você é o revisor. Entregue: 1) o texto revisado, pronto para usar, no tom da marca;
2) uma lista curta das mudanças mais importantes e por quê.`,
  },
];

export function montarMensagens(agente, perfil = {}, respostas = {}, briefing = '') {
  const linhasPerfil = [
    ['Marca / cliente', perfil.nome],
    ['Nicho', perfil.nicho],
    ['Público', perfil.publico],
    ['Tom de voz', perfil.tom],
  ].filter(([, v]) => v && String(v).trim()).map(([k, v]) => `- ${k}: ${String(v).trim()}`);

  const linhasPedido = agente.campos
    .map((c) => [c.rotulo, respostas[c.id]])
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${String(v).trim()}`);

  const usuario = [
    'Perfil do cliente:',
    linhasPerfil.length ? linhasPerfil.join('\n') : '- (não informado)',
    '',
    'Pedido:',
    linhasPedido.length ? linhasPedido.join('\n') : '- (sem campos preenchidos)',
    briefing && briefing.trim() ? `\nObservações extras:\n${briefing.trim()}` : '',
  ].join('\n');

  return [
    { role: 'system', content: `${REGRAS_GERAIS}\n\n${agente.sistema}` },
    { role: 'user', content: usuario },
  ];
}

export function agentePublico(a) {
  const { sistema, ...resto } = a;
  return resto;
}
