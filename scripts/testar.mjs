// Teste rápido: o Estúdio responde, o motor está ligado e um agente responde em tempo real.
// Uso: npm run testar   (com o Estúdio rodando; outra porta: AGENCIA_URL=http://localhost:9000)
const base = process.env.AGENCIA_URL || 'http://localhost:8080';
const passo = (ok, msg) => { console.log(`${ok ? 'OK ' : 'ERRO'}  ${msg}`); if (!ok) process.exitCode = 1; };

const status = await fetch(`${base}/api/status`).then((r) => r.json()).catch(() => null);
passo(!!status?.ok, status?.ok ? `motor ligado (${status.disponiveis} modelos prontos)` : `motor: ${status?.motivo || 'Estúdio fora do ar'}`);

const agentes = await fetch(`${base}/api/agentes`).then((r) => r.json()).catch(() => []);
passo(agentes.length > 0, `${agentes.length} agentes na equipe`);

if (status?.ok) {
  const r = await fetch(`${base}/api/conversa/revisor`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil: { nome: 'Teste' }, respostas: { texto: 'nos atendemos de segunda a sabado, venha nos visitar' } }),
  });
  const eventos = (await r.text()).split('\n\n').filter(Boolean).map((b) => { try { return JSON.parse(b.replace(/^data:\s?/, '')); } catch { return {}; } });
  const fim = eventos.find((e) => e.tipo === 'fim');
  const erro = eventos.find((e) => e.tipo === 'erro');
  const trechos = eventos.filter((e) => e.tipo === 'texto').length;
  passo(Boolean(fim), fim ? `Revisor respondeu em tempo real (${trechos} trechos) via ${fim.modelo} em ${(fim.ms / 1000).toFixed(1)} s` : `agente: ${erro?.mensagem || 'sem resposta'}`);
}
