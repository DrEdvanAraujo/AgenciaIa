// Cliente do "motor" de IA: o FreeLLMAPI (ou qualquer API compatível com OpenAI).
// URL e chave vêm de variáveis de ambiente, nunca do código.

export function configMotor() {
  return {
    url: (process.env.FREELLMAPI_URL || 'http://127.0.0.1:31415/v1').replace(/\/+$/, ''),
    chave: process.env.FREELLMAPI_KEY || '',
    modelo: process.env.AGENCIA_MODELO || 'auto',
  };
}

const DICA_PORTA = 'O app do Windows/Mac usa http://127.0.0.1:31415/v1.';

// Lista os modelos do motor. Também serve como teste de conexão.
export async function listarModelos() {
  const { url, chave } = configMotor();
  if (!chave) return { ok: false, motivo: 'Falta a chave do FreeLLMAPI (FREELLMAPI_KEY no arquivo .env).', modelos: [] };
  try {
    const r = await fetch(`${url}/models`, { headers: { Authorization: `Bearer ${chave}` }, signal: AbortSignal.timeout(8000) });
    if (r.status === 401 || r.status === 403) return { ok: false, motivo: 'O FreeLLMAPI recusou a chave. Confira FREELLMAPI_KEY no .env.', modelos: [] };
    if (!r.ok) return { ok: false, motivo: `O FreeLLMAPI respondeu com erro ${r.status}.`, modelos: [] };
    const j = await r.json();
    const modelos = (Array.isArray(j.data) ? j.data : []).map((m) => ({
      id: m.id,
      nome: m.name || m.id,
      contexto: m.context_window || m.context_length || null,
      disponivel: m.available !== false,
      situacao: m.available !== false ? 'disponivel' : (m.execution_status || m.unavailable_reason || 'indisponivel'),
      dono: m.owned_by || null,
    }));
    return { ok: true, modelos };
  } catch {
    return { ok: false, motivo: `Não consegui falar com o FreeLLMAPI em ${url}. Ele está ligado? ${DICA_PORTA}`, modelos: [] };
  }
}

export async function statusMotor() {
  const r = await listarModelos();
  return r.ok
    ? { ok: true, modelos: r.modelos.length, disponiveis: r.modelos.filter((m) => m.disponivel).length }
    : { ok: false, motivo: r.motivo };
}

async function erroDaResposta(r) {
  const corpo = await r.json().catch(() => ({}));
  return new Error(`O motor de IA não conseguiu responder: ${corpo?.error?.message || `erro ${r.status}`}`);
}

// Resposta inteira de uma vez (usada para criar agentes).
export async function gerar(mensagens, { maxTokens = 1800, temperatura = 0.7 } = {}) {
  const { url, chave, modelo } = configMotor();
  if (!chave) throw new Error('Falta a chave do FreeLLMAPI (FREELLMAPI_KEY no arquivo .env).');
  const inicio = Date.now();
  const r = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, messages: mensagens, max_tokens: maxTokens, temperature: temperatura }),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) throw await erroDaResposta(r);
  const corpo = await r.json();
  const texto = (corpo.choices?.[0]?.message?.content || '').trim();
  if (!texto) throw new Error('O modelo respondeu vazio. Tente de novo.');
  return { texto, modelo: corpo.model || modelo, tokens: corpo.usage?.total_tokens ?? null, ms: Date.now() - inicio };
}

// Resposta em tempo real: chama aoPensar() quando o modelo começa a raciocinar
// e aoEscrever(trecho) para cada pedaço de texto. Devolve o resumo no fim.
export async function gerarAoVivo(mensagens, { aoPensar, aoEscrever, sinal, maxTokens = 2200 } = {}) {
  const { url, chave, modelo } = configMotor();
  if (!chave) throw new Error('Falta a chave do FreeLLMAPI (FREELLMAPI_KEY no arquivo .env).');
  const inicio = Date.now();
  const r = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo, messages: mensagens, max_tokens: maxTokens, temperature: 0.7,
      stream: true, stream_options: { include_usage: true },
    }),
    signal: sinal ? AbortSignal.any([sinal, AbortSignal.timeout(240000)]) : AbortSignal.timeout(240000),
  });
  if (!r.ok) throw await erroDaResposta(r);

  let usado = modelo, tokens = null, texto = '', pensou = false, buffer = '';
  const decodificador = new TextDecoder();
  for await (const parte of r.body) {
    buffer += decodificador.decode(parte, { stream: true });
    let fim;
    while ((fim = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, fim).trim();
      buffer = buffer.slice(fim + 1);
      if (!linha.startsWith('data:')) continue;
      const dado = linha.slice(5).trim();
      if (!dado || dado === '[DONE]') continue;
      let j; try { j = JSON.parse(dado); } catch { continue; }
      if (j.error) throw new Error(`O motor de IA parou no meio: ${j.error.message || 'erro desconhecido'}`);
      if (j.model) usado = j.model;
      if (j.usage?.total_tokens) tokens = j.usage.total_tokens;
      const delta = j.choices?.[0]?.delta || {};
      if (!pensou && (delta.reasoning || delta.reasoning_content)) { pensou = true; aoPensar?.(); }
      if (delta.content) { texto += delta.content; aoEscrever?.(delta.content); }
    }
  }
  if (!texto.trim()) throw new Error('O modelo respondeu vazio. Tente de novo.');
  return { texto, modelo: usado, tokens, ms: Date.now() - inicio };
}
