// Servidor da AgenciaIa: entrega a interface (public/) e a API dos agentes.
// Sem dependências externas: só Node 20+.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTES, agentePublico, montarMensagens } from './src/agentes.mjs';
import { gerar, statusMotor } from './src/motor.mjs';

const RAIZ = fileURLToPath(new URL('./public/', import.meta.url));
const PORTA = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

async function lerCorpo(req, limite = 64 * 1024) {
  let tamanho = 0;
  const partes = [];
  for await (const p of req) {
    tamanho += p.length;
    if (tamanho > limite) throw Object.assign(new Error('Pedido grande demais.'), { status: 413 });
    partes.push(p);
  }
  try { return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}

async function estatico(req, res) {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = normalize(join(RAIZ, caminho === '/' ? 'index.html' : caminho));
  if (!arquivo.startsWith(RAIZ)) return json(res, 403, { erro: 'Proibido.' });
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(dados);
  } catch {
    json(res, 404, { erro: 'Não encontrado.' });
  }
}

const servidor = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && pathname === '/api/agentes') return json(res, 200, AGENTES.map(agentePublico));
    if (req.method === 'GET' && pathname === '/api/status') return json(res, 200, await statusMotor());

    const m = pathname.match(/^\/api\/agentes\/([a-z0-9-]+)$/);
    if (req.method === 'POST' && m) {
      const agente = AGENTES.find((a) => a.id === m[1]);
      if (!agente) return json(res, 404, { erro: 'Agente não encontrado.' });
      const { perfil, respostas, briefing } = await lerCorpo(req);
      const resultado = await gerar(montarMensagens(agente, perfil, respostas, briefing));
      return json(res, 200, { agente: agente.id, ...resultado });
    }

    if (req.method === 'GET' && !pathname.startsWith('/api/')) return estatico(req, res);
    json(res, 404, { erro: 'Rota não encontrada.' });
  } catch (e) {
    json(res, e.status || 502, { erro: e.message || 'Erro inesperado.' });
  }
});

servidor.listen(PORTA, HOST, () => {
  console.log(`AgenciaIa rodando em http://localhost:${PORTA}`);
});
