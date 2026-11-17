// Interface do Estúdio AgenciaIa. Perfil e histórico ficam só neste navegador.
(() => {
  const $ = (id) => document.getElementById(id);
  const CHAVE_PERFIL = 'agenciaia.perfil';
  const CHAVE_HIST = 'agenciaia.historico';
  const CAMPOS_PERFIL = ['nome', 'nicho', 'publico', 'tom'];
  let agentes = [];
  let atual = null;
  let ultimoTexto = '';

  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

  // ---------- Markdown simples e seguro (escapa HTML antes de formatar) ----------
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

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
        out.push(`<div class="tabela"><table><thead><tr>${cab.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
          corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c).replace(/&lt;br\s*\/?&gt;/gi, '<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
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

  // ---------- Perfil do cliente ----------
  function carregarPerfil() {
    const p = ler(CHAVE_PERFIL, {});
    CAMPOS_PERFIL.forEach((c) => { $(`perfil-${c}`).value = p[c] || ''; });
    resumoPerfil();
    if (!p.nome) $('perfil-bloco').open = true;
  }
  function perfil() {
    return Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, $(`perfil-${c}`).value.trim()]));
  }
  function resumoPerfil() {
    const p = perfil();
    $('perfil-resumo').textContent = p.nome ? [p.nome, p.nicho].filter(Boolean).join(' · ') : 'Preencha o perfil do cliente';
  }
  CAMPOS_PERFIL.forEach((c) => $(`perfil-${c}`).addEventListener('input', () => { gravar(CHAVE_PERFIL, perfil()); resumoPerfil(); }));

  // ---------- Agentes ----------
  function desenharEquipe() {
    const ul = $('lista-agentes');
    ul.replaceChildren(...agentes.map((a) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'agente-botao'; b.dataset.id = a.id;
      b.setAttribute('aria-pressed', String(atual?.id === a.id));
      const n = document.createElement('span'); n.className = 'nome'; n.textContent = a.nome;
      const f = document.createElement('span'); f.className = 'funcao'; f.textContent = a.funcao;
      b.append(n, f);
      b.addEventListener('click', () => escolher(a.id));
      li.append(b);
      return li;
    }));
  }

  function escolher(id) {
    atual = agentes.find((a) => a.id === id) || agentes[0];
    if (!atual) return;
    try { history.replaceState(null, '', `#${atual.id}`); } catch { /* ignora */ }
    $('agente-nome').textContent = atual.nome;
    $('agente-funcao').textContent = atual.funcao;
    $('agente-descricao').textContent = atual.descricao;
    $('campos').replaceChildren(...atual.campos.map((c) => {
      const label = document.createElement('label');
      label.textContent = c.rotulo;
      const campo = document.createElement(c.longo ? 'textarea' : 'input');
      if (c.longo) campo.rows = 4; else campo.type = 'text';
      campo.id = `campo-${atual.id}-${c.id}`; campo.name = c.id; campo.placeholder = c.exemplo || '';
      campo.autocomplete = 'off';
      label.append(campo);
      return label;
    }));
    avisar('');
    desenharEquipe();
  }

  // ---------- Geração ----------
  function avisar(msg, tipo) { const a = $('aviso'); a.textContent = msg; a.dataset.tipo = tipo || ''; }

  function mostrarResultado(r) {
    ultimoTexto = r.texto;
    $('resultado').hidden = false;
    const partes = [r.agenteNome, `modelo ${r.modelo}`, `${(r.ms / 1000).toFixed(1)} s`];
    if (r.tokens) partes.push(`${r.tokens.toLocaleString('pt-BR')} tokens`);
    $('resultado-meta').textContent = partes.join(' · ');
    $('resultado-texto').innerHTML = markdown(r.texto);
  }

  $('pedido').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!atual) return;
    const respostas = Object.fromEntries(atual.campos.map((c) => [c.id, $(`campo-${atual.id}-${c.id}`).value]));
    if (!Object.values(respostas).some((v) => v.trim())) {
      avisar('Preencha pelo menos um campo do pedido.', 'erro'); return;
    }
    const botao = $('gerar');
    botao.disabled = true; botao.textContent = 'Gerando…';
    avisar(`${atual.nome} está trabalhando. Modelos gratuitos podem levar de 5 a 60 segundos.`);
    $('resultado').hidden = false;
    $('resultado-meta').textContent = atual.nome;
    $('resultado-texto').innerHTML = '<div class="carregando-linha"><span style="width:70%"></span><span style="width:92%"></span><span style="width:55%"></span></div>';
    try {
      const r = await fetch(`/api/agentes/${atual.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: perfil(), respostas, briefing: $('briefing').value }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || 'Falha ao gerar.');
      const item = { ...dados, agenteNome: atual.nome, quando: Date.now(), cliente: perfil().nome };
      mostrarResultado(item);
      const hist = [item, ...ler(CHAVE_HIST, [])].slice(0, 20);
      gravar(CHAVE_HIST, hist);
      desenharHistorico(hist);
      avisar('Pronto.');
    } catch (e) {
      $('resultado').hidden = true;
      avisar(e.message, 'erro');
    } finally {
      botao.disabled = false; botao.textContent = 'Gerar';
    }
  });

  $('copiar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ultimoTexto); avisar('Texto copiado.'); }
    catch {
      const sel = window.getSelection(); const r = document.createRange();
      r.selectNodeContents($('resultado-texto')); sel.removeAllRanges(); sel.addRange(r);
      avisar('Texto selecionado. Use Ctrl+C para copiar.');
    }
  });

  // ---------- Histórico ----------
  const fmtQuando = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  function desenharHistorico(hist = ler(CHAVE_HIST, [])) {
    $('hist-vazio').hidden = hist.length > 0;
    $('hist-lista').replaceChildren(...hist.map((h) => {
      const li = document.createElement('li');
      const b = document.createElement('button'); b.type = 'button';
      const t = document.createElement('span'); t.textContent = [h.agenteNome, h.cliente].filter(Boolean).join(' · ');
      const q = document.createElement('span'); q.className = 'quando'; q.textContent = fmtQuando.format(h.quando);
      b.append(t, q);
      b.addEventListener('click', () => { mostrarResultado(h); $('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      li.append(b);
      return li;
    }));
  }

  // ---------- Status do motor ----------
  async function verificarMotor() {
    const el = $('motor');
    try {
      const s = await (await fetch('/api/status')).json();
      el.dataset.estado = s.ok ? 'ok' : 'erro';
      $('motor-texto').textContent = s.ok ? `Motor de IA ligado · ${s.modelos} modelos` : s.motivo;
    } catch {
      el.dataset.estado = 'erro';
      $('motor-texto').textContent = 'O servidor da AgenciaIa não respondeu.';
    }
  }

  // ---------- Início ----------
  carregarPerfil();
  desenharHistorico();
  verificarMotor();
  setInterval(verificarMotor, 60000);
  fetch('/api/agentes').then((r) => r.json()).then((lista) => {
    agentes = lista;
    escolher(location.hash.slice(1) || agentes[0]?.id);
  }).catch(() => avisar('Não consegui carregar a equipe de agentes.', 'erro'));
})();
