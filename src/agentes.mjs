// Agentes da AgenciaIa. Cada agente é um especialista com um papel fixo
// (instruções de sistema), uma cor (usada no escritório 3D) e um formulário curto.
// O perfil do cliente (nome, nicho, público, tom de voz) entra em todas as conversas.

const REGRAS_GERAIS = `Você trabalha na AgenciaIa, uma agência de marketing digital.
Escreva sempre em português do Brasil, com clareza e sem enrolação.
Use o perfil do cliente para acertar o tom de voz e o público.
Não invente dados, números, depoimentos ou resultados. Quando faltar uma informação, use [colchetes] para o cliente preencher.
Formate a resposta em Markdown simples (títulos curtos, listas, tabelas quando ajudarem).
Quando o usuário pedir ajustes, entregue a versão nova completa, já ajustada.`;

export const AGENTES = [
  {
    id: 'estrategista', cor: '#3b6cf6',
    nome: 'Estrategista', funcao: 'Plano de conteúdo da semana',
    descricao: 'Monta um calendário de 7 dias com tema, formato e objetivo de cada post.',
    campos: [
      { id: 'objetivo', rotulo: 'Objetivo da semana', exemplo: 'Lotar a agenda de avaliações de dezembro' },
      { id: 'canais', rotulo: 'Canais', exemplo: 'Instagram e WhatsApp' },
    ],
    sistema: `Você é o estrategista de conteúdo. Entregue um plano de 7 dias em tabela
(Dia | Canal | Formato | Tema | Objetivo | Chamada para ação) e, depois, 3 dicas curtas de execução.`,
  },
  {
    id: 'copywriter', cor: '#e8735a',
    nome: 'Copywriter', funcao: 'Legenda para Instagram',
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
    id: 'roteirista', cor: '#2fa37a',
    nome: 'Roteirista', funcao: 'Roteiro de Reels e TikTok',
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
    id: 'anuncios', cor: '#c9952b',
    nome: 'Anúncios', funcao: 'Variações de anúncio (Meta Ads)',
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
    id: 'atendimento', cor: '#8b5cf6',
    nome: 'Atendimento', funcao: 'Resposta para WhatsApp e Direct',
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
    id: 'revisor', cor: '#d14d8a',
    nome: 'Revisor', funcao: 'Revisão de texto',
    descricao: 'Corrige gramática, deixa o texto mais claro e explica as mudanças principais.',
    campos: [
      { id: 'texto', rotulo: 'Texto para revisar', exemplo: 'Cole aqui o texto do post, e-mail ou anúncio.', longo: true },
    ],
    sistema: `Você é o revisor. Entregue: 1) o texto revisado, pronto para usar, no tom da marca;
2) uma lista curta das mudanças mais importantes e por quê.`,
  },
];

export const CORES_EXTRAS = ['#0ea5b7', '#6f9a2b', '#b8612a', '#5b6bd6', '#c2417a', '#3f8f8a', '#9a6b2e', '#7a52c7'];

const limpar = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'agente';

// Valida e normaliza um agente vindo da interface. Lança erro com mensagem clara.
export function validarAgente(dados, existentes = []) {
  const nome = limpar(dados.nome, 40);
  const funcao = limpar(dados.funcao, 70);
  const descricao = limpar(dados.descricao, 220);
  const sistema = String(dados.sistema ?? '').trim().slice(0, 4000);
  if (!nome) throw Object.assign(new Error('Dê um nome ao agente.'), { status: 400 });
  if (sistema.length < 20) throw Object.assign(new Error('Escreva as instruções do agente (pelo menos uma frase).'), { status: 400 });
  const usados = new Set();
  const campos = (Array.isArray(dados.campos) ? dados.campos : []).slice(0, 6).map((c) => {
    const rotulo = limpar(c?.rotulo, 60);
    if (!rotulo) return null;
    let id = slug(rotulo); while (usados.has(id)) id += '-2'; usados.add(id);
    return { id, rotulo, exemplo: limpar(c?.exemplo, 200), longo: Boolean(c?.longo) };
  }).filter(Boolean);
  if (!campos.length) throw Object.assign(new Error('O agente precisa de pelo menos um campo no formulário.'), { status: 400 });
  const cor = /^#[0-9a-f]{6}$/i.test(dados.cor || '') ? dados.cor.toLowerCase()
    : CORES_EXTRAS[existentes.length % CORES_EXTRAS.length];
  return { nome, funcao: funcao || 'Agente personalizado', descricao, campos, sistema, cor };
}

// Prompt que transforma uma descrição em português num agente pronto.
export function mensagensRascunho(pedido) {
  return [
    { role: 'system', content: `Você projeta agentes para a AgenciaIa, uma agência de marketing digital.
A partir da descrição do usuário, crie UM agente e responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, neste formato:
{"nome":"até 3 palavras","funcao":"o que ele entrega, até 6 palavras","descricao":"uma frase sobre o que ele faz","campos":[{"rotulo":"pergunta curta do formulário","exemplo":"exemplo de resposta","longo":false}],"sistema":"instruções detalhadas do agente, em segunda pessoa (Você é...), dizendo exatamente o que entregar e em que formato"}
Regras: de 1 a 4 campos; use "longo": true só para campos onde o usuário cola textos grandes; tudo em português do Brasil; as instruções devem pedir resultados prontos para usar e proibir inventar dados.` },
    { role: 'user', content: String(pedido).slice(0, 2000) },
  ];
}

export function extrairJson(texto) {
  const ini = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (ini < 0 || fim <= ini) throw new Error('A IA não devolveu um agente válido. Tente descrever de outro jeito.');
  try { return JSON.parse(texto.slice(ini, fim + 1)); }
  catch { throw new Error('A IA não devolveu um agente válido. Tente de novo.'); }
}

function textoPerfil(perfil = {}) {
  const linhas = [['Marca / cliente', perfil.nome], ['Nicho', perfil.nicho], ['Público', perfil.publico], ['Tom de voz', perfil.tom]]
    .filter(([, v]) => v && String(v).trim()).map(([k, v]) => `- ${k}: ${limpar(v, 300)}`);
  return linhas.length ? linhas.join('\n') : '- (não informado)';
}

export function textoPedido(agente, respostas = {}, briefing = '') {
  const linhas = agente.campos.map((c) => [c.rotulo, respostas[c.id]])
    .filter(([, v]) => v && String(v).trim()).map(([k, v]) => `- ${k}: ${String(v).trim().slice(0, 4000)}`);
  return [
    'Pedido:',
    linhas.length ? linhas.join('\n') : '- (sem campos preenchidos)',
    briefing && briefing.trim() ? `\nObservações extras:\n${briefing.trim().slice(0, 2000)}` : '',
  ].join('\n').trim();
}

// Conversa completa: sistema (regras + agente + perfil), pedido inicial e o que veio depois.
export function montarConversa(agente, { perfil, respostas, briefing, seguimento } = {}) {
  const depois = (Array.isArray(seguimento) ? seguimento : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
  return [
    { role: 'system', content: `${REGRAS_GERAIS}\n\n${agente.sistema}\n\nPerfil do cliente:\n${textoPerfil(perfil)}` },
    { role: 'user', content: textoPedido(agente, respostas, briefing) },
    ...depois,
  ];
}

export function agentePublico(a) {
  const { sistema, ...resto } = a;
  return a.personalizado ? { ...resto, sistema } : resto;
}
