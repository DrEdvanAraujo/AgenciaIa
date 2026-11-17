// Teste rápido: o Estúdio responde, o motor está ligado e um agente gera texto.
// Uso: npm run testar   (com o Estúdio rodando; outra porta: AGENCIA_URL=http://localhost:9000)
const base = process.env.AGENCIA_URL || 'http://localhost:8080';
const passo = (ok, msg) => { console.log(`${ok ? 'OK ' : 'ERRO'}  ${msg}`); if (!ok) process.exitCode = 1; };

const status = await fetch(`${base}/api/status`).then((r) => r.json()).catch(() => null);
passo(!!status?.ok, status?.ok ? `motor ligado (${status.modelos} modelos)` : `motor: ${status?.motivo || 'Estúdio fora do ar'}`);
if (status?.ok) {
  const r = await fetch(`${base}/api/agentes/revisor`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil: { nome: 'Teste' }, respostas: { texto: 'nos atendemos de segunda a sabado, venha nos visitar' } }),
  });
  const d = await r.json();
  passo(r.ok, r.ok ? `agente Revisor respondeu via ${d.modelo} em ${(d.ms / 1000).toFixed(1)} s` : `agente: ${d.erro}`);
}
