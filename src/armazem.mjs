// Armazenamento local em arquivos (pasta data/, ignorada pelo Git):
// - agentes.json: agentes criados pelo usuário
// - uso.jsonl: uma linha por resposta gerada (para o Painel)
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIR = process.env.AGENCIA_DADOS || fileURLToPath(new URL('../data/', import.meta.url));
const ARQ_AGENTES = join(DIR, 'agentes.json');
const ARQ_USO = join(DIR, 'uso.jsonl');

async function garantirPasta() { await mkdir(DIR, { recursive: true }); }

export async function lerAgentesPersonalizados() {
  try {
    const lista = JSON.parse(await readFile(ARQ_AGENTES, 'utf8'));
    return Array.isArray(lista) ? lista : [];
  } catch { return []; }
}

export async function gravarAgentesPersonalizados(lista) {
  await garantirPasta();
  const tmp = `${ARQ_AGENTES}.tmp`;
  await writeFile(tmp, JSON.stringify(lista, null, 2));
  await rename(tmp, ARQ_AGENTES);
}

export async function registrarUso(registro) {
  await garantirPasta();
  await appendFile(ARQ_USO, `${JSON.stringify({ t: Date.now(), ...registro })}\n`);
}

export async function lerUso() {
  try {
    return (await readFile(ARQ_USO, 'utf8')).split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// Resumo do uso para o Painel.
export function resumirUso(registros, nomes = {}, dias = 14) {
  const ok = registros.filter((r) => r.ok);
  const soma = (arr, f) => arr.reduce((s, r) => s + (Number(r[f]) || 0), 0);
  const agrupar = (campo) => {
    const m = new Map();
    for (const r of registros) {
      const k = r[campo] || '—';
      const g = m.get(k) || { chave: k, pedidos: 0, ok: 0, tokens: 0, ms: 0 };
      g.pedidos++; if (r.ok) { g.ok++; g.tokens += Number(r.tokens) || 0; g.ms += Number(r.ms) || 0; }
      m.set(k, g);
    }
    return [...m.values()].map((g) => ({ ...g, msMedio: g.ok ? Math.round(g.ms / g.ok) : null }))
      .sort((a, b) => b.pedidos - a.pedidos);
  };

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const porDia = [];
  for (let i = dias - 1; i >= 0; i--) {
    const ini = hoje.getTime() - i * 86400000;
    const doDia = registros.filter((r) => r.t >= ini && r.t < ini + 86400000);
    porDia.push({ dia: new Date(ini).toISOString().slice(0, 10), pedidos: doDia.length, tokens: soma(doDia.filter((r) => r.ok), 'tokens') });
  }

  return {
    pedidos: registros.length,
    sucesso: ok.length,
    falhas: registros.length - ok.length,
    tokens: soma(ok, 'tokens'),
    msMedio: ok.length ? Math.round(soma(ok, 'ms') / ok.length) : null,
    porModelo: agrupar('modelo').filter((g) => g.chave !== '—'),
    porAgente: agrupar('agente').map((g) => ({ ...g, nome: nomes[g.chave] || g.chave })),
    porDia,
    recentes: registros.slice(-12).reverse().map((r) => ({ ...r, nome: nomes[r.agente] || r.agente })),
  };
}
