// Servidor da AgenciaIa: entrega a interface (public/) e a API dos agentes.
// Sem dependências externas: só Node 20+.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AGENTES, agentePublico, extrairJson, mensagensRascunho, montarConversa, slug, validarAgente,
} from './src/agentes.mjs';
import { configMotor, gerar, gerarAoVivo, listarModelos, statusMotor } from './src/motor.mjs';
import {
  gravarAgentesPersonalizados, lerAgentesPersonalizados, lerUso, registrarUso, resumirUso,
} from './src/armazem.mjs';

const RAIZ = fileURLToPath(new URL('./public/', import.meta.url));
const PORTA = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
};

const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

async function lerCorpo(req, limite = 256 * 1024) {
  let tamanho = 0;
  const partes = [];
  for await (const p of req) {
    tamanho += p.length;
    if (tamanho > limite) throw erro(413, 'Pedido grande demais.');
    partes.push(p);
  }
  try { return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}'); }
  catch { throw erro(400, 'JSON inválido.'); }
}

async function estatico(req, res) {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = normalize(join(RAIZ, caminho === '/' ? 'index.html' : caminho));
  if (!arquivo.startsWith(RAIZ)) return json(res, 403, { erro: 'Proibido.' });
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(dados);
  } catch {
    json(res, 404, { erro: 'Não encontrado.' });
  }
}

// three.js (gráficos 3D): usa node_modules/three se existir (após "npm install");
// senão, redireciona para o CDN na mesma versão.
const VERSAO_THREE = '0.170.0';
const RAIZ_THREE = fileURLToPath(new URL('./node_modules/three/', import.meta.url));
async function vendorThree(res, caminho) {
  const rel = caminho.replace(/^\/vendor\/three\//, '');
  const arquivo = normalize(join(RAIZ_THREE, rel));
  if (!arquivo.startsWith(RAIZ_THREE) || !/\.js$/.test(arquivo)) return json(res, 404, { erro: 'Não encontrado.' });
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS['.js'], 'Cache-Control': 'public, max-age=86400' });
    res.end(dados);
  } catch {
    res.writeHead(302, { Location: `https://cdn.jsdelivr.net/npm/three@${VERSAO_THREE}/${rel}` });
    res.end();
  }
}

// Escritas no arquivo de agentes, uma de cada vez.
let fila = Promise.resolve();
const emFila = (fn) => (fila = fila.then(fn, fn));

async function todosAgentes() {
  const extras = (await lerAgentesPersonalizados()).map((a) => ({ ...a, personalizado: true }));
  return [...AGENTES, ...extras];
}
async function acharAgente(id) {
  const a = (await todosAgentes()).find((x) => x.id === id);
  if (!a) throw erro(404, 'Agente não encontrado.');
  return a;
}

// ---------- Rotas ----------
async function conversa(req, res, id) {
  const agente = await acharAgente(id);
  const corpo = await lerCorpo(req);
  const mensagens = montarConversa(agente, corpo);
  const cancelar = new AbortController();
  res.on('close', () => { if (!res.writableFinished) cancelar.abort(); });

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  const enviar = (dados) => res.write(`data: ${JSON.stringify(dados)}\n\n`);
  enviar({ tipo: 'inicio' });
  try {
    // Modelos gratuitos falham às vezes. Se falhar antes da primeira palavra,
    // tenta de novo (o roteador do FreeLLMAPI escolhe outro modelo).
    let r = null;
    for (let tentativa = 1; !r; tentativa++) {
      let escreveu = false;
      try {
        r = await gerarAoVivo(mensagens, {
          sinal: cancelar.signal,
          aoPensar: () => enviar({ tipo: 'pensando' }),
          aoEscrever: (d) => { escreveu = true; enviar({ tipo: 'texto', d }); },
        });
      } catch (e) {
        if (escreveu || cancelar.signal.aborted || tentativa >= 3) throw e;
        await registrarUso({ agente: agente.id, ok: false, erro: String(e.message).slice(0, 200) });
        enviar({ tipo: 'nova-tentativa', tentativa: tentativa + 1 });
      }
    }
    await registrarUso({ agente: agente.id, modelo: r.modelo, tokens: r.tokens, ms: r.ms, ok: true });
    enviar({ tipo: 'fim', modelo: r.modelo, tokens: r.tokens, ms: r.ms });
  } catch (e) {
    if (!cancelar.signal.aborted) {
      await registrarUso({ agente: agente.id, ok: false, erro: String(e.message).slice(0, 200) });
      enviar({ tipo: 'erro', mensagem: e.message });
    }
  }
  res.end();
}

async function painel(res) {
  const [motor, registros, agentes] = await Promise.all([listarModelos(), lerUso(), todosAgentes()]);
  const nomes = { 'criador-de-agentes': 'Criador de agentes', ...Object.fromEntries(agentes.map((a) => [a.id, a.nome])) };
  const cores = Object.fromEntries(agentes.map((a) => [a.id, a.cor]));
  let painelMotor = null;
  try { painelMotor = new URL(configMotor().url).origin; } catch { /* URL inválida */ }
  json(res, 200, {
    motor: { ok: motor.ok, motivo: motor.motivo || null, painel: painelMotor },
    modelos: motor.modelos,
    uso: resumirUso(registros, nomes),
    cores,
    agentes: agentes.length,
  });
}

async function criarAgente(req, res) {
  const dados = await lerCorpo(req);
  const novo = await emFila(async () => {
    const lista = await lerAgentesPersonalizados();
    const agente = validarAgente(dados, lista);
    const ocupados = new Set([...AGENTES, ...lista].map((a) => a.id));
    let id = slug(agente.nome); let n = 2;
    while (ocupados.has(id)) id = `${slug(agente.nome)}-${n++}`;
    const salvo = { id, ...agente, criadoEm: new Date().toISOString() };
    await gravarAgentesPersonalizados([...lista, salvo]);
    return salvo;
  });
  json(res, 201, agentePublico({ ...novo, personalizado: true }));
}

async function editarAgente(req, res, id) {
  const dados = await lerCorpo(req);
  const salvo = await emFila(async () => {
    const lista = await lerAgentesPersonalizados();
    const i = lista.findIndex((a) => a.id === id);
    if (i < 0) throw erro(AGENTES.some((a) => a.id === id) ? 403 : 404,
      AGENTES.some((a) => a.id === id) ? 'Os agentes da equipe original não podem ser alterados aqui.' : 'Agente não encontrado.');
    const agente = validarAgente({ cor: lista[i].cor, ...dados }, lista);
    lista[i] = { ...lista[i], ...agente, atualizadoEm: new Date().toISOString() };
    await gravarAgentesPersonalizados(lista);
    return lista[i];
  });
  json(res, 200, agentePublico({ ...salvo, personalizado: true }));
}

async function apagarAgente(res, id) {
  await emFila(async () => {
    const lista = await lerAgentesPersonalizados();
    if (!lista.some((a) => a.id === id)) throw erro(404, 'Só dá para apagar agentes criados por você.');
    await gravarAgentesPersonalizados(lista.filter((a) => a.id !== id));
  });
  json(res, 200, { ok: true });
}

async function rascunho(req, res) {
  const { pedido } = await lerCorpo(req);
  if (!pedido || String(pedido).trim().length < 10) throw erro(400, 'Descreva o agente com pelo menos uma frase.');
  // Até 3 tentativas: modelos gratuitos às vezes falham ou devolvem JSON quebrado.
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await gerar(mensagensRascunho(pedido), { maxTokens: 4000, temperatura: 0.4 });
      const agente = validarAgente(extrairJson(r.texto), await lerAgentesPersonalizados());
      await registrarUso({ agente: 'criador-de-agentes', modelo: r.modelo, tokens: r.tokens, ms: r.ms, ok: true });
      return json(res, 200, { ...agente, modelo: r.modelo });
    } catch (e) {
      ultimoErro = e;
      await registrarUso({ agente: 'criador-de-agentes', ok: false, erro: String(e.message).slice(0, 200) });
    }
  }
  throw erro(502, `Não consegui montar o agente agora (${ultimoErro.message}). Tente de novo ou use "Criar do zero".`);
}

const servidor = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  const metodo = req.method;
  try {
    if (metodo === 'GET' && pathname === '/api/status') return json(res, 200, await statusMotor());
    if (metodo === 'GET' && pathname === '/api/painel') return await painel(res);
    if (metodo === 'GET' && pathname === '/api/agentes') return json(res, 200, (await todosAgentes()).map(agentePublico));
    if (metodo === 'POST' && pathname === '/api/agentes') return await criarAgente(req, res);
    if (metodo === 'POST' && pathname === '/api/agentes/rascunho') return await rascunho(req, res);

    const ag = pathname.match(/^\/api\/agentes\/([a-z0-9-]+)$/);
    if (ag && metodo === 'PUT') return await editarAgente(req, res, ag[1]);
    if (ag && metodo === 'DELETE') return await apagarAgente(res, ag[1]);

    const cv = pathname.match(/^\/api\/conversa\/([a-z0-9-]+)$/);
    if (cv && metodo === 'POST') return await conversa(req, res, cv[1]);

    if (metodo === 'GET' && pathname.startsWith('/vendor/three/')) return await vendorThree(res, pathname);
    if (metodo === 'GET' && !pathname.startsWith('/api/')) return await estatico(req, res);
    json(res, 404, { erro: 'Rota não encontrada.' });
  } catch (e) {
    if (res.headersSent) { res.end(); return; }
    json(res, e.status || 502, { erro: e.message || 'Erro inesperado.' });
  }
});

servidor.listen(PORTA, HOST, () => {
  console.log(`AgenciaIa rodando em http://localhost:${PORTA}`);
});
