// Estúdio AgenciaIa: escritório 3D, conversas em tempo real, painel e criação de agentes.
// Perfil do cliente e conversas ficam só neste navegador.

const $ = (id) => document.getElementById(id);
const CHAVE_PERFIL = 'agenciaia.perfil';
const CHAVE_CONVERSAS = 'agenciaia.conversas.v2';
const CHAVE_ATUAL = 'agenciaia.agenteAtual';
const CAMPOS_PERFIL = ['nome', 'nicho', 'publico', 'tom'];

const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const num = new Intl.NumberFormat('pt-BR');
const quando = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const segundos = (ms) => (ms == null ? '—' : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`);
const el = (tag, props = {}, ...filhos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) e.style.setProperty(p, val); else e.style[p] = val; }
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...filhos.filter((f) => f !== null && f !== undefined));
  return e;
};

async function api(caminho, opcoes = {}) {
  const r = await fetch(caminho, {
    ...opcoes,
    headers: opcoes.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
  return dados;
}

// ---------- Markdown simples e seguro (escapa HTML antes de formatar) ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
  .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
function markdown(md) {
  const linhas = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const celulas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(l) && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1] || '')) {
      const cab = celulas(l); i += 2;
      const corpo = [];
      while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) corpo.push(celulas(linhas[i++]));
      out.push(`<div class="tabela-rolagem"><table><thead><tr>${cab.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\s*[-*•]\s+/.test(l)) {
      const itens = [];
      while (i < linhas.length && /^\s*[-*•]\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*[-*•]\s+/, ''));
      out.push(`<ul>${itens.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const itens = [];
      while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*\d+[.)]\s+/, ''));
      out.push(`<ol>${itens.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`); continue;
    }
    const par = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|\s*\|)/.test(linhas[i])) par.push(linhas[i++]);
    if (!par.length) par.push(linhas[i++]);
    out.push(`<p>${par.map(inline).join('<br>')}</p>`);
  }
  return out.join('');
}

// =====================================================================
// Estado
// =====================================================================
let agentes = [];
let atual = null;
let cena = null;
let gerando = null; // { id, controle }
const conversas = ler(CHAVE_CONVERSAS, {});
const salvarConversas = () => gravar(CHAVE_CONVERSAS, conversas);

// =====================================================================
// Navegação entre abas
// =====================================================================
const VISTAS = ['agencia', 'painel', 'agentes'];
function mostrarVista() {
  const v = VISTAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'agencia';
  for (const nome of VISTAS) $(`vista-${nome}`).hidden = nome !== v;
  document.querySelectorAll('.abas a').forEach((a) => { if (a.dataset.vista === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (v === 'painel') carregarPainel();
  if (v === 'agentes') desenharListasAgentes();
  if (v === 'agencia') requestAnimationFrame(() => cena?.redimensionar());
}
addEventListener('hashchange', mostrarVista);

// =====================================================================
// Perfil do cliente
// =====================================================================
function perfil() { return Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, $(`perfil-${c}`).value.trim()])); }
function carregarPerfil() {
  const p = ler(CHAVE_PERFIL, {});
  CAMPOS_PERFIL.forEach((c) => { $(`perfil-${c}`).value = p[c] || ''; });
  resumoPerfil();
}
function resumoPerfil() { $('cliente-nome').textContent = perfil().nome || 'Definir'; }
CAMPOS_PERFIL.forEach((c) => $(`perfil-${c}`).addEventListener('input', () => { gravar(CHAVE_PERFIL, perfil()); resumoPerfil(); }));
$('abrir-cliente').addEventListener('click', () => $('dlg-cliente').showModal());

// =====================================================================
// Motor
// =====================================================================
async function verificarMotor() {
  const caixa = $('motor');
  try {
    const s = await api('/api/status');
    caixa.dataset.estado = s.ok ? 'ok' : 'erro';
    $('motor-texto').textContent = s.ok ? `Motor ligado · ${num.format(s.disponiveis)} modelos prontos` : s.motivo;
    caixa.title = s.ok ? `${s.modelos} modelos no catálogo, ${s.disponiveis} prontos para uso` : s.motivo;
  } catch {
    caixa.dataset.estado = 'erro';
    $('motor-texto').textContent = 'O servidor da AgenciaIa não respondeu.';
  }
}

// =====================================================================
// Agência: escritório 3D + elenco
// =====================================================================
async function iniciarCena() {
  const aviso = $('palco-aviso');
  try {
    const modulo = await import('./cena3d.js');
    if (!modulo.webglDisponivel()) throw new Error('sem WebGL');
    cena = modulo.criarCena($('palco'), {
      aoEscolher: (id) => escolher(id),
      aoNovo: () => { location.hash = 'agentes'; $('descricao-agente').focus(); },
    });
    cena.definirAgentes(agentes);
    if (atual) cena.selecionar(atual.id);
  } catch {
    $('palco-dica').hidden = true;
    aviso.hidden = false;
    aviso.textContent = 'O escritório 3D não abriu neste navegador (ele precisa de internet na primeira vez e de WebGL). Use a lista de agentes abaixo: tudo funciona normalmente.';
  }
}

function desenharElenco() {
  const ul = $('elenco');
  ul.replaceChildren(...agentes.map((a) => el('li', {}, el('button', {
    type: 'button', style: { '--cor': a.cor }, 'aria-pressed': String(atual?.id === a.id),
    text: a.nome, onclick: () => escolher(a.id),
  }))), el('li', {}, el('button', { type: 'button', class: 'novo', text: 'Novo agente', onclick: () => { location.hash = 'agentes'; } })));
}

// =====================================================================
// Conversa
// =====================================================================
function conversaDe(id) { return (conversas[id] ||= { respostas: {}, briefing: '', mensagens: [] }); }

function escolher(id, { navegar = true } = {}) {
  const a = agentes.find((x) => x.id === id) || agentes[0];
  if (!a) return;
  atual = a;
  gravar(CHAVE_ATUAL, a.id);
  if (navegar && location.hash !== '#agencia' && location.hash !== '') location.hash = 'agencia';
  $('conversa').style.setProperty('--cor', a.cor);
  $('conv-cor').style.setProperty('--cor', a.cor);
  $('conv-nome').textContent = a.nome;
  $('conv-funcao').textContent = a.funcao;
  $('conv-descricao').textContent = a.descricao || '';
  cena?.selecionar(a.id);
  desenharElenco();
  desenharConversa();
}

function desenharCampos(a, conv) {
  $('campos').replaceChildren(...a.campos.map((c) => {
    const campo = el(c.longo ? 'textarea' : 'input', {
      id: `campo-${a.id}-${c.id}`, name: c.id, placeholder: c.exemplo || '', autocomplete: 'off',
      ...(c.longo ? { rows: 4 } : { type: 'text' }),
    });
    campo.value = conv.respostas[c.id] || '';
    campo.addEventListener('input', () => { conv.respostas[c.id] = campo.value; salvarConversas(); });
    return el('label', { class: 'campo' }, c.rotulo, campo);
  }));
  $('briefing').value = conv.briefing || '';
}
$('briefing').addEventListener('input', () => { if (atual) { conversaDe(atual.id).briefing = $('briefing').value; salvarConversas(); } });

function bolhaPedido(a, conv) {
  const dl = el('dl');
  for (const c of a.campos) {
    const v = (conv.respostas[c.id] || '').trim();
    if (v) dl.append(el('dt', { text: c.rotulo }), el('dd', { text: v }));
  }
  if ((conv.briefing || '').trim()) dl.append(el('dt', { text: 'Observações' }), el('dd', { text: conv.briefing.trim() }));
  return el('div', { class: 'msg msg-usuario' }, el('div', { class: 'bolha' }, dl));
}

function bolhaAgente(m) {
  const texto = el('div', { class: 'bolha texto' });
  texto.innerHTML = markdown(m.content || '');
  const meta = el('div', { class: 'msg-meta' });
  if (m.meta) {
    meta.append(el('span', { text: [m.meta.modelo, segundos(m.meta.ms), m.meta.tokens ? `${num.format(m.meta.tokens)} tokens` : null].filter(Boolean).join(' · ') }));
    meta.append(el('button', { type: 'button', text: 'Copiar', onclick: (e) => copiar(m.content, e.currentTarget) }));
  }
  return el('div', { class: 'msg msg-agente' }, texto, meta);
}

function desenharConversa() {
  const a = atual;
  const conv = conversaDe(a.id);
  const temMensagens = conv.mensagens.length > 0;
  $('pedido').hidden = temMensagens;
  $('compositor').hidden = !temMensagens;
  $('nova-conversa').hidden = !temMensagens;
  desenharCampos(a, conv);
  const box = $('mensagens');
  box.replaceChildren();
  if (!temMensagens) return;
  box.append(bolhaPedido(a, conv));
  for (const m of conv.mensagens) {
    if (m.role === 'user') box.append(el('div', { class: 'msg msg-usuario' }, el('div', { class: 'bolha', text: m.content })));
    else if (m.role === 'assistant') box.append(bolhaAgente(m));
    else if (m.role === 'erro') box.append(el('div', { class: 'msg msg-erro' }, el('div', { class: 'bolha', text: m.content })));
  }
  if (gerando?.id === a.id) box.append(gerando.bolha);
  rolarFim();
}

function rolarFim() {
  const f = $('fluxo');
  if (getComputedStyle(f).overflowY === 'auto') f.scrollTop = f.scrollHeight;
  else $('compositor').scrollIntoView({ block: 'end' });
}

async function copiar(texto, botao) {
  try { await navigator.clipboard.writeText(texto); botao.textContent = 'Copiado'; }
  catch { botao.textContent = 'Selecione e copie (Ctrl+C)'; }
  setTimeout(() => { botao.textContent = 'Copiar'; }, 1800);
}

async function enviar(textoUsuario) {
  const a = atual;
  if (!a || gerando) return;
  const conv = conversaDe(a.id);
  if (textoUsuario) conv.mensagens.push({ role: 'user', content: textoUsuario });
  salvarConversas();

  const corpoTexto = el('div', { class: 'bolha texto' }, el('span', { class: 'pensando' }, el('i'), el('i'), el('i'), ` ${a.nome} está pensando…`));
  const meta = el('div', { class: 'msg-meta' });
  const bolha = el('div', { class: 'msg msg-agente' }, corpoTexto, meta);
  const controle = new AbortController();
  gerando = { id: a.id, bolha, controle };
  desenharConversa();
  $('enviar').disabled = true; $('comecar').disabled = true;
  cena?.trabalhando(a.id, true);

  let acumulado = '';
  let agendado = false;
  const pintar = () => { agendado = false; corpoTexto.innerHTML = markdown(acumulado); corpoTexto.classList.add('cursor'); rolarFim(); };
  try {
    const r = await fetch(`/api/conversa/${a.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controle.signal,
      body: JSON.stringify({
        perfil: perfil(), respostas: conv.respostas, briefing: conv.briefing,
        seguimento: conv.mensagens.filter((m) => m.role === 'user' || m.role === 'assistant').map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error(j.erro || `Erro ${r.status}`); }
    const leitor = r.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let fim = null;
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      buffer += value;
      let corte;
      while ((corte = buffer.indexOf('\n\n')) >= 0) {
        const bloco = buffer.slice(0, corte).replace(/^data:\s?/, '');
        buffer = buffer.slice(corte + 2);
        let ev; try { ev = JSON.parse(bloco); } catch { continue; }
        if (ev.tipo === 'pensando' && !acumulado) corpoTexto.querySelector('.pensando')?.lastChild?.replaceWith(` ${a.nome} está raciocinando…`);
        if (ev.tipo === 'nova-tentativa') corpoTexto.querySelector('.pensando')?.lastChild?.replaceWith(` Um modelo falhou; tentando outro (${ev.tentativa}ª tentativa)…`);
        if (ev.tipo === 'texto') { acumulado += ev.d; if (!agendado) { agendado = true; requestAnimationFrame(pintar); } }
        if (ev.tipo === 'fim') fim = ev;
        if (ev.tipo === 'erro') throw new Error(ev.mensagem);
      }
    }
    if (!fim) throw new Error('A resposta foi interrompida. Tente de novo.');
    conv.mensagens.push({ role: 'assistant', content: acumulado, meta: { modelo: fim.modelo, ms: fim.ms, tokens: fim.tokens } });
  } catch (e) {
    if (e.name === 'AbortError') {
      if (acumulado) conv.mensagens.push({ role: 'assistant', content: `${acumulado}\n\n*(interrompido)*` });
    } else {
      conv.mensagens.push({ role: 'erro', content: e.message });
    }
  } finally {
    gerando = null;
    salvarConversas();
    cena?.trabalhando(a.id, false);
    $('enviar').disabled = false; $('comecar').disabled = false;
    if (atual?.id === a.id) desenharConversa();
    verificarMotor();
  }
}

$('pedido').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const conv = conversaDe(atual.id);
  if (!atual.campos.some((c) => (conv.respostas[c.id] || '').trim())) {
    $(`campo-${atual.id}-${atual.campos[0].id}`)?.focus();
    return;
  }
  enviar(null);
});
$('compositor').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const t = $('mensagem').value.trim();
  if (!t) return;
  $('mensagem').value = ''; ajustarAltura();
  enviar(t);
});
$('mensagem').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); $('compositor').requestSubmit(); }
});
function ajustarAltura() { const t = $('mensagem'); t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; }
$('mensagem').addEventListener('input', ajustarAltura);
$('sugestoes').addEventListener('click', (ev) => {
  const s = ev.target.closest('button')?.dataset.sugestao;
  if (s) enviar(s);
});
$('nova-conversa').addEventListener('click', () => {
  if (gerando?.id === atual.id) gerando.controle.abort();
  conversaDe(atual.id).mensagens = [];
  salvarConversas();
  desenharConversa();
});

// =====================================================================
// Painel
// =====================================================================
let dadosPainel = null;
let filtroModelo = 'todos';

async function carregarPainel() {
  $('painel-resumo').textContent = 'Carregando…';
  try { dadosPainel = await api('/api/painel'); }
  catch (e) { $('painel-resumo').textContent = e.message; return; }
  const { uso, modelos, motor } = dadosPainel;
  const prontos = modelos.filter((m) => m.disponivel && m.id !== 'auto' && m.id !== 'fusion');
  const reais = modelos.filter((m) => m.id !== 'auto' && m.id !== 'fusion');
  const lider = uso.porModelo[0];

  $('painel-resumo').textContent = !motor.ok ? motor.motivo
    : uso.pedidos === 0 ? `Nenhum pedido ainda. ${num.format(prontos.length)} modelos estão prontos para os seus agentes.`
      : `${num.format(uso.pedidos)} pedidos até agora${lider ? `; o modelo que mais respondeu foi ${lider.chave}` : ''}.`;

  $('kpi-pedidos').textContent = num.format(uso.pedidos);
  $('kpi-pedidos-nota').textContent = uso.falhas ? `${num.format(uso.sucesso)} com resposta, ${num.format(uso.falhas)} com falha` : 'Todos com resposta';
  $('kpi-tokens').textContent = num.format(uso.tokens);
  $('kpi-tempo').textContent = segundos(uso.msMedio);
  $('kpi-modelos').textContent = motor.ok ? num.format(prontos.length) : '—';
  $('kpi-modelos-nota').textContent = motor.ok ? `de ${num.format(reais.length)} no catálogo` : 'Motor desligado';

  desenharGraficoDias(uso.porDia);
  desenharBarras($('graf-agentes'), uso.porAgente.map((g) => ({ nome: g.nome, valor: g.pedidos, cor: dadosPainel.cores[g.chave], extra: g.msMedio ? `${segundos(g.msMedio)} em média` : '' })), 'Nenhum agente usado ainda.');
  desenharBarras($('graf-modelos'), uso.porModelo.slice(0, 8).map((g) => ({ nome: g.chave, valor: g.pedidos, extra: g.tokens ? `${num.format(g.tokens)} tokens` : '' })), 'Os modelos aparecem aqui depois das primeiras respostas.');

  const tb = $('tab-recentes').tBodies[0];
  tb.replaceChildren(...uso.recentes.map((r) => el('tr', {},
    el('td', { text: quando.format(r.t) }),
    el('td', { text: r.nome }),
    el('td', {}, r.modelo ? el('code', { text: r.modelo }) : '—'),
    el('td', { class: 'num', text: r.tokens ? num.format(r.tokens) : '—' }),
    el('td', { class: 'num', text: segundos(r.ms) }),
    el('td', {}, el('span', { class: `pilula ${r.ok ? 'ok' : 'erro'}`, text: r.ok ? 'Respondido' : 'Falhou', title: r.erro || '' })),
  )));
  $('recentes-vazio').hidden = uso.recentes.length > 0;
  $('tab-recentes').hidden = uso.recentes.length === 0;

  desenharCatalogo();
  $('nota-motor').textContent = '';
  if (motor.painel) {
    $('nota-motor').append('O uso por chave de cada provedor (cotas por minuto e por dia) fica no painel do FreeLLMAPI, em Análises: ',
      el('a', { href: motor.painel, target: '_blank', rel: 'noopener', text: motor.painel }), '.');
  }
}
$('atualizar-painel').addEventListener('click', carregarPainel);

function desenharBarras(caixa, itens, vazio) {
  if (!itens.length) { caixa.replaceChildren(el('p', { class: 'vazio', text: vazio })); return; }
  const max = Math.max(...itens.map((i) => i.valor), 1);
  caixa.replaceChildren(...itens.map((i) => el('div', { class: 'barra-linha', style: i.cor ? { '--cor': i.cor } : {}, title: i.extra || '' },
    el('span', { class: 'barra-nome' }, el('i'), el('span', { text: i.nome })),
    el('span', { class: 'barra-trilho' }, el('span', { class: 'barra-preenche', style: { width: `${(i.valor / max) * 100}%` } })),
    el('span', { class: 'barra-num', text: num.format(i.valor) }),
  )));
}

function desenharGraficoDias(dias) {
  const caixa = $('graf-dias');
  const W = Math.max(caixa.clientWidth, 300), H = 200, m = { t: 18, r: 8, b: 26, l: 30 };
  const max = Math.max(...dias.map((d) => d.pedidos), 4);
  const passo = Math.ceil(max / 4);
  const topo = passo * 4;
  const x = (i) => m.l + (i * (W - m.l - m.r)) / dias.length;
  const bw = ((W - m.l - m.r) / dias.length) * 0.62;
  const y = (v) => H - m.b - (v / topo) * (H - m.t - m.b);
  const fmtDia = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, texto) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (texto != null) e.textContent = texto; return e; };
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Pedidos por dia nos últimos 14 dias; total ${dias.reduce((a, d) => a + d.pedidos, 0)}` });
  const eixo = s('g', { class: 'eixo' });
  for (let v = 0; v <= topo; v += passo) {
    eixo.append(s('line', { class: 'grade', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
    eixo.append(s('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }, String(v)));
  }
  const cada = Math.ceil(dias.length / Math.max(2, Math.floor((W - m.l) / 52)));
  dias.forEach((d, i) => { if (i % cada === 0 || i === dias.length - 1) eixo.append(s('text', { x: x(i) + bw / 2, y: H - 6, 'text-anchor': 'middle' }, fmtDia(d.dia))); });
  svg.append(eixo);
  const dica = el('div', { class: 'dica', hidden: true });
  dias.forEach((d, i) => {
    const alt = Math.max(d.pedidos ? 2 : 0, H - m.b - y(d.pedidos));
    const r = s('rect', { class: 'barra', x: x(i), y: H - m.b - alt, width: bw, height: alt, rx: 3 });
    const alvo = s('rect', { x: x(i) - 2, y: m.t, width: bw + 4, height: H - m.t - m.b, fill: 'transparent' });
    const mostrar = () => {
      dica.hidden = false;
      dica.textContent = `${fmtDia(d.dia)}: ${num.format(d.pedidos)} pedidos · ${num.format(d.tokens)} tokens`;
      const px = (x(i) + bw / 2) / W * caixa.clientWidth;
      dica.style.left = `${Math.min(Math.max(px - dica.offsetWidth / 2, 0), caixa.clientWidth - dica.offsetWidth)}px`;
      dica.style.top = '0px';
    };
    alvo.addEventListener('pointerenter', mostrar); alvo.addEventListener('pointerdown', mostrar);
    alvo.addEventListener('pointerleave', () => { dica.hidden = true; });
    svg.append(r, alvo);
    if (d.pedidos) svg.append(s('text', { class: 'valor', x: x(i) + bw / 2, y: H - m.b - alt - 5, 'text-anchor': 'middle' }, String(d.pedidos)));
  });
  caixa.replaceChildren(svg, dica);
}

const SITUACOES = {
  disponivel: ['ok', 'Pronto'], needsKey: ['chave', 'Precisa de chave'], disabled: ['off', 'Desligado'],
};
function desenharCatalogo() {
  if (!dadosPainel) return;
  const busca = $('busca-modelo').value.trim().toLowerCase();
  const lista = dadosPainel.modelos
    .filter((m) => filtroModelo === 'todos' || (filtroModelo === 'disponivel' ? m.disponivel : m.situacao === 'needsKey'))
    .filter((m) => !busca || m.id.toLowerCase().includes(busca) || m.nome.toLowerCase().includes(busca))
    .sort((a, b) => (b.disponivel - a.disponivel) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const tb = $('tab-modelos').tBodies[0];
  tb.replaceChildren(...lista.slice(0, 400).map((m) => {
    const [classe, texto] = SITUACOES[m.situacao] || ['off', m.situacao];
    return el('tr', {},
      el('td', { text: m.nome }),
      el('td', {}, el('code', { text: m.id })),
      el('td', { class: 'num', text: m.contexto ? `${num.format(Math.round(m.contexto / 1000))} mil` : '—' }),
      el('td', {}, el('span', { class: `pilula ${classe}`, text: texto })));
  }));
  const total = dadosPainel.modelos.length;
  $('catalogo-sub').textContent = `${num.format(lista.length)} de ${num.format(total)} modelos. "Precisa de chave": adicione a chave gratuita do provedor no FreeLLMAPI para liberar.`;
}
$('busca-modelo').addEventListener('input', desenharCatalogo);
document.querySelector('.segmentos').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-filtro]');
  if (!b) return;
  filtroModelo = b.dataset.filtro;
  document.querySelectorAll('.segmentos button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  desenharCatalogo();
});
new ResizeObserver(() => { if (dadosPainel && !$('vista-painel').hidden) desenharGraficoDias(dadosPainel.uso.porDia); }).observe($('graf-dias'));

// =====================================================================
// Agentes: criar, editar, apagar
// =====================================================================
let editando = null; // id do agente em edição, ou null para novo

function desenharListasAgentes() {
  const item = (a) => el('li', { style: { '--cor': a.cor } },
    el('span', { class: 'bolinha' }),
    el('span', { class: 'info' }, el('strong', { text: a.nome }), el('span', { text: a.funcao })),
    el('span', { class: 'botoes' },
      el('button', { type: 'button', class: 'botao-leve', text: 'Conversar', onclick: () => escolher(a.id) }),
      a.personalizado ? el('button', { type: 'button', class: 'botao-leve', text: 'Editar', onclick: () => abrirEditor(a) }) : null));
  const proprios = agentes.filter((a) => a.personalizado);
  $('lista-personalizados').replaceChildren(...proprios.map(item));
  $('personalizados-vazio').hidden = proprios.length > 0;
  $('lista-originais').replaceChildren(...agentes.filter((a) => !a.personalizado).map(item));
}

function linhaCampo(c = {}) {
  const rotulo = el('input', { type: 'text', placeholder: 'Pergunta (ex.: Tema do post)', 'aria-label': 'Pergunta', maxlength: 60 });
  const exemplo = el('input', { type: 'text', placeholder: 'Exemplo de resposta', 'aria-label': 'Exemplo', maxlength: 200 });
  const longo = el('input', { type: 'checkbox' });
  rotulo.value = c.rotulo || ''; exemplo.value = c.exemplo || ''; longo.checked = Boolean(c.longo);
  const linha = el('div', { class: 'ed-campo' }, rotulo, exemplo,
    el('label', { class: 'longo', title: 'Caixa grande, para colar textos' }, longo, 'Texto longo'),
    el('button', { type: 'button', class: 'remover', 'aria-label': 'Remover pergunta', text: '×', onclick: () => linha.remove() }));
  linha.ler = () => ({ rotulo: rotulo.value, exemplo: exemplo.value, longo: longo.checked });
  return linha;
}

function abrirEditor(a = null, origem = '') {
  editando = a?.id && a.personalizado ? a.id : null;
  $('editor').hidden = false;
  $('editor-titulo').textContent = editando ? `Editar ${a.nome}` : 'Novo agente';
  $('editor-origem').textContent = origem;
  $('ed-nome').value = a?.nome || '';
  $('ed-funcao').value = a?.funcao || '';
  $('ed-descricao').value = a?.descricao || '';
  $('ed-cor').value = a?.cor || '#0ea5b7';
  $('ed-sistema').value = a?.sistema || '';
  const campos = a?.campos?.length ? a.campos : [{}];
  $('ed-lista-campos').replaceChildren(...campos.map(linhaCampo));
  $('ed-apagar').hidden = !editando;
  $('aviso-editor').textContent = '';
  if (!location.hash.includes('agentes')) location.hash = 'agentes';
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('ed-nome').focus({ preventScroll: true });
}

$('ed-add-campo').addEventListener('click', () => {
  if ($('ed-lista-campos').children.length >= 6) { avisar('aviso-editor', 'Use no máximo 6 perguntas.', 'erro'); return; }
  $('ed-lista-campos').append(linhaCampo());
});
$('ed-cancelar').addEventListener('click', () => { $('editor').hidden = true; editando = null; });
$('criar-manual').addEventListener('click', () => abrirEditor(null, 'Do zero'));

function avisar(id, msg, tipo = '') { const a = $(id); a.textContent = msg; a.dataset.tipo = tipo; }

$('editor').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const dados = {
    nome: $('ed-nome').value, funcao: $('ed-funcao').value, descricao: $('ed-descricao').value, cor: $('ed-cor').value,
    sistema: $('ed-sistema').value, campos: [...$('ed-lista-campos').children].map((l) => l.ler()),
  };
  $('ed-salvar').disabled = true;
  try {
    const salvo = await api(editando ? `/api/agentes/${editando}` : '/api/agentes', { method: editando ? 'PUT' : 'POST', body: dados });
    await recarregarAgentes();
    $('editor').hidden = true; editando = null;
    avisar('aviso-criacao', `${salvo.nome} foi salvo e já tem uma mesa no escritório.`, 'ok');
    $('descricao-agente').value = '';
  } catch (e) {
    avisar('aviso-editor', e.message, 'erro');
  } finally { $('ed-salvar').disabled = false; }
});

$('ed-apagar').addEventListener('click', async () => {
  const b = $('ed-apagar');
  if (b.dataset.confirmar !== '1') { b.dataset.confirmar = '1'; b.textContent = 'Clique de novo para apagar'; setTimeout(() => { b.dataset.confirmar = ''; b.textContent = 'Apagar'; }, 4000); return; }
  try {
    await api(`/api/agentes/${editando}`, { method: 'DELETE' });
    delete conversas[editando]; salvarConversas();
    $('editor').hidden = true; editando = null;
    await recarregarAgentes();
    avisar('aviso-criacao', 'Agente apagado.', 'ok');
  } catch (e) { avisar('aviso-editor', e.message, 'erro'); }
  b.dataset.confirmar = ''; b.textContent = 'Apagar';
});

$('criar-ia').addEventListener('click', async () => {
  const pedido = $('descricao-agente').value.trim();
  if (pedido.length < 10) { avisar('aviso-criacao', 'Descreva o agente com pelo menos uma frase.', 'erro'); $('descricao-agente').focus(); return; }
  const b = $('criar-ia');
  b.disabled = true; b.textContent = 'Criando…';
  avisar('aviso-criacao', 'A IA está montando o agente. Leva de 10 a 60 segundos.');
  try {
    const rascunho = await api('/api/agentes/rascunho', { method: 'POST', body: { pedido } });
    abrirEditor(rascunho, `Rascunho feito por ${rascunho.modelo}`);
    avisar('aviso-criacao', 'Rascunho pronto. Revise abaixo e clique em Salvar agente.', 'ok');
  } catch (e) {
    avisar('aviso-criacao', e.message, 'erro');
  } finally { b.disabled = false; b.textContent = 'Criar com IA'; }
});

async function recarregarAgentes() {
  agentes = await api('/api/agentes');
  if (atual && !agentes.some((a) => a.id === atual.id)) atual = null;
  cena?.definirAgentes(agentes);
  desenharElenco();
  desenharListasAgentes();
  escolher(atual?.id || ler(CHAVE_ATUAL, null) || agentes[0]?.id, { navegar: false });
}

// =====================================================================
// Início
// =====================================================================
carregarPerfil();
verificarMotor();
setInterval(verificarMotor, 60000);
try {
  agentes = await api('/api/agentes');
} catch {
  agentes = [];
  $('palco-aviso').hidden = false;
  $('palco-aviso').textContent = 'Não consegui carregar a equipe. Confira se o servidor da AgenciaIa está rodando.';
}
const salvo = ler(CHAVE_ATUAL, null);
escolher(agentes.some((a) => a.id === salvo) ? salvo : agentes[0]?.id, { navegar: false });
mostrarVista();
iniciarCena();
