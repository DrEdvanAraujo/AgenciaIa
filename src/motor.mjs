// Cliente do "motor" de IA: o FreeLLMAPI (ou qualquer API compatível com OpenAI).
// URL e chave vêm de variáveis de ambiente, nunca do código.

export function configMotor() {
  return {
    url: (process.env.FREELLMAPI_URL || 'http://localhost:3001/v1').replace(/\/+$/, ''),
    chave: process.env.FREELLMAPI_KEY || '',
    modelo: process.env.AGENCIA_MODELO || 'auto',
  };
}

export async function statusMotor() {
  const { url, chave } = configMotor();
  if (!chave) return { ok: false, motivo: 'Falta a chave do FreeLLMAPI (FREELLMAPI_KEY).' };
  try {
    const r = await fetch(`${url}/models`, {
      headers: { Authorization: `Bearer ${chave}` },
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 401 || r.status === 403) return { ok: false, motivo: 'O FreeLLMAPI recusou a chave. Confira FREELLMAPI_KEY.' };
    if (!r.ok) return { ok: false, motivo: `O FreeLLMAPI respondeu com erro ${r.status}.` };
    const j = await r.json();
    return { ok: true, modelos: Array.isArray(j.data) ? j.data.length : 0 };
  } catch {
    return { ok: false, motivo: `Não consegui falar com o FreeLLMAPI em ${url}. Ele está ligado?` };
  }
}

export async function gerar(mensagens, { maxTokens = 1800 } = {}) {
  const { url, chave, modelo } = configMotor();
  if (!chave) throw new Error('Falta a chave do FreeLLMAPI (FREELLMAPI_KEY).');
  const inicio = Date.now();
  const r = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, messages: mensagens, max_tokens: maxTokens, temperature: 0.7 }),
    signal: AbortSignal.timeout(180000),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok || !corpo.choices) {
    const msg = corpo?.error?.message || `erro ${r.status}`;
    throw new Error(`O motor de IA não conseguiu responder: ${msg}`);
  }
  const texto = (corpo.choices[0]?.message?.content || '').trim();
  if (!texto) throw new Error('O modelo respondeu vazio. Tente de novo.');
  return {
    texto,
    modelo: corpo.model || modelo,
    tokens: corpo.usage?.total_tokens ?? null,
    ms: Date.now() - inicio,
  };
}
