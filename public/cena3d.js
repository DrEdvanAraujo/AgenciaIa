// Escritório 3D da AgenciaIa: cada agente tem uma mesa, um monitor na cor dele e um avatar.
// No centro fica o "núcleo" (o motor de IA), que acelera quando alguém está trabalhando.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

function cssVar(nome, padrao) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return v || padrao;
}
function paleta() {
  const escuro = getComputedStyle(document.documentElement).colorScheme.includes('dark');
  return {
    escuro,
    piso: escuro ? '#1a2131' : '#f4f6fb',
    borda: escuro ? '#242d42' : '#d9deea',
    grade: escuro ? '#2b3550' : '#cfd6e6',
    mesa: escuro ? '#3a4256' : '#e9e2d6',
    perna: escuro ? '#596379' : '#b7ad9d',
    monitor: escuro ? '#0b0f18' : '#20263a',
    pele: escuro ? '#d9c2a8' : '#e7cfb4',
    acento: cssVar('--acento', '#1f4fd8'),
  };
}

export function criarCena(recipiente, { aoEscolher, aoNovo } = {}) {
  let cores = paleta();
  const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderizador.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderizador.shadowMap.enabled = true;
  renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  recipiente.appendChild(renderizador.domElement);

  const etiquetas = new CSS2DRenderer();
  Object.assign(etiquetas.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  recipiente.appendChild(etiquetas.domElement);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controles = new OrbitControls(camera, renderizador.domElement);
  Object.assign(controles, {
    enableDamping: true, dampingFactor: 0.08, enablePan: false,
    minPolarAngle: 0.45, maxPolarAngle: 1.32, minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9,
    rotateSpeed: 0.7, zoomSpeed: 0.8,
  });

  // Luzes
  const hemi = new THREE.HemisphereLight('#ffffff', '#8a90a0', 1.4);
  cena.add(hemi);
  const sol = new THREE.DirectionalLight('#ffffff', 2.2);
  sol.position.set(6, 12, 8);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.left = -16; sol.shadow.camera.right = 16; sol.shadow.camera.top = 16; sol.shadow.camera.bottom = -16;
  sol.shadow.radius = 4; sol.shadow.bias = -0.0005;
  cena.add(sol);

  // Piso e núcleo
  const matPiso = new THREE.MeshStandardMaterial({ color: cores.piso, roughness: 0.95 });
  const matBorda = new THREE.MeshStandardMaterial({ color: cores.borda, roughness: 0.9 });
  const piso = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 96), [matBorda, matPiso, matBorda]);
  piso.position.y = -0.15; piso.receiveShadow = true;
  cena.add(piso);
  let grade = null;

  const nucleo = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.35, 48), new THREE.MeshStandardMaterial({ color: cores.borda, roughness: 0.6 }));
  base.position.y = 0.17; base.castShadow = true; base.receiveShadow = true;
  const matCristal = new THREE.MeshStandardMaterial({ color: cores.acento, emissive: cores.acento, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.1, flatShading: true });
  const cristal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), matCristal);
  cristal.position.y = 1.05; cristal.castShadow = true;
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 12, 80), new THREE.MeshBasicMaterial({ color: cores.acento, transparent: true, opacity: 0.55 }));
  anel.position.y = 1.05; anel.rotation.x = Math.PI / 2.4;
  const luzNucleo = new THREE.PointLight(cores.acento, 3, 6, 2);
  luzNucleo.position.y = 1.1;
  nucleo.add(base, cristal, anel, luzNucleo);
  cena.add(nucleo);
  const etqNucleo = document.createElement('div');
  etqNucleo.className = 'etiqueta';
  etqNucleo.innerHTML = '<strong>Motor de IA</strong><span>FreeLLMAPI</span>';
  etqNucleo.style.setProperty('--cor', cores.acento);
  etqNucleo.style.pointerEvents = 'none';
  const objNucleo = new CSS2DObject(etqNucleo);
  objNucleo.position.set(0, 1.85, 0);
  nucleo.add(objNucleo);

  // Mesas
  const geo = {
    tampo: new THREE.BoxGeometry(1.5, 0.07, 0.8),
    perna: new THREE.BoxGeometry(0.06, 0.72, 0.06),
    monitor: new THREE.BoxGeometry(0.82, 0.42, 0.05),
    tela: new THREE.PlaneGeometry(0.74, 0.34),
    haste: new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12),
    pe: new THREE.CylinderGeometry(0.14, 0.16, 0.03, 24),
    corpo: new THREE.CapsuleGeometry(0.27, 0.5, 6, 20),
    cabeca: new THREE.SphereGeometry(0.23, 28, 20),
    cadeira: new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24),
    anelSel: new THREE.RingGeometry(0.95, 1.12, 64),
    disco: new THREE.CylinderGeometry(0.75, 0.75, 0.04, 48),
  };
  const matMesa = new THREE.MeshStandardMaterial({ color: cores.mesa, roughness: 0.7 });
  const matPerna = new THREE.MeshStandardMaterial({ color: cores.perna, roughness: 0.6, metalness: 0.2 });
  const matMonitor = new THREE.MeshStandardMaterial({ color: cores.monitor, roughness: 0.4, metalness: 0.3 });
  const matPele = new THREE.MeshStandardMaterial({ color: cores.pele, roughness: 0.8 });
  const matCadeira = new THREE.MeshStandardMaterial({ color: cores.monitor, roughness: 0.6 });

  const estacoes = new Map(); // id -> { grupo, avatar, tela, anel, etiqueta, ... }
  let selecionado = null;
  const clicaveis = [];

  function criarEstacao(agente) {
    const grupo = new THREE.Group();
    grupo.userData.id = agente.id;
    const cor = new THREE.Color(agente.cor || cores.acento);

    const tampo = new THREE.Mesh(geo.tampo, matMesa);
    tampo.position.y = 0.76; tampo.castShadow = true; tampo.receiveShadow = true;
    grupo.add(tampo);
    for (const [x, z] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) {
      const p = new THREE.Mesh(geo.perna, matPerna); p.position.set(x, 0.36, z); p.castShadow = true; grupo.add(p);
    }
    // O fundo do monitor (virado para quem olha) acende na cor do agente.
    const matTela = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.55, roughness: 0.35 });
    const monitor = new THREE.Mesh(geo.monitor, [matMonitor, matMonitor, matMonitor, matMonitor, matTela, matMonitor]);
    monitor.position.set(0, 1.1, -0.12); monitor.castShadow = true;
    const tela = new THREE.Mesh(geo.tela, new THREE.MeshBasicMaterial({ color: cor.clone().lerp(new THREE.Color('#ffffff'), 0.55) }));
    tela.position.set(0, 1.1, -0.146); tela.rotation.y = Math.PI;
    const haste = new THREE.Mesh(geo.haste, matPerna); haste.position.set(0, 0.85, -0.14);
    const pe = new THREE.Mesh(geo.pe, matPerna); pe.position.set(0, 0.805, -0.14);
    grupo.add(monitor, tela, haste, pe);

    // Avatar atrás da mesa, de frente para quem olha.
    const avatar = new THREE.Group();
    const matCorpo = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55 });
    const corpo = new THREE.Mesh(geo.corpo, matCorpo); corpo.position.y = 0.78; corpo.castShadow = true;
    const cabeca = new THREE.Mesh(geo.cabeca, matPele); cabeca.position.y = 1.42; cabeca.castShadow = true;
    const cadeira = new THREE.Mesh(geo.cadeira, matCadeira); cadeira.position.y = 0.42; cadeira.castShadow = true;
    avatar.add(cadeira, corpo, cabeca);
    avatar.position.set(0, 0, -0.85);
    grupo.add(avatar);

    const anel = new THREE.Mesh(geo.anelSel, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
    anel.rotation.x = -Math.PI / 2; anel.position.set(0, 0.012, -0.35);
    grupo.add(anel);

    const div = document.createElement('div');
    div.className = 'etiqueta';
    div.style.setProperty('--cor', agente.cor || cores.acento);
    const nome = document.createElement('strong'); nome.textContent = agente.nome;
    const funcao = document.createElement('span'); funcao.textContent = agente.funcao || '';
    div.append(nome, funcao);
    div.tabIndex = -1;
    div.addEventListener('click', (e) => { e.stopPropagation(); aoEscolher?.(agente.id); });
    const etiqueta = new CSS2DObject(div);
    etiqueta.position.set(0, 2.05, -0.85);
    grupo.add(etiqueta);

    grupo.traverse((o) => { if (o.isMesh) { o.userData.id = agente.id; clicaveis.push(o); } });
    return { grupo, avatar, corpo, tela, matTela, anel, div, trabalhando: false, fase: Math.random() * 6 };
  }

  function criarVaga() {
    const grupo = new THREE.Group();
    const disco = new THREE.Mesh(geo.disco, new THREE.MeshStandardMaterial({ color: cores.acento, transparent: true, opacity: 0.18, roughness: 0.8 }));
    disco.position.y = 0.02; disco.userData.id = '__novo__';
    grupo.add(disco); clicaveis.push(disco);
    const div = document.createElement('div');
    div.className = 'etiqueta nova';
    div.innerHTML = '<strong>Novo agente</strong><span>Crie descrevendo</span>';
    div.addEventListener('click', (e) => { e.stopPropagation(); aoNovo?.(); });
    const obj = new CSS2DObject(div); obj.position.set(0, 0.6, 0);
    grupo.add(obj);
    return { grupo, disco, div };
  }

  let vaga = null;
  let raio = 5;

  function limpar() {
    for (const e of estacoes.values()) {
      e.grupo.traverse((o) => { if (o.isCSS2DObject) o.element.remove(); });
      cena.remove(e.grupo);
      e.matTela.dispose(); e.tela.material.dispose(); e.corpo.material.dispose(); e.anel.material.dispose();
    }
    estacoes.clear(); clicaveis.length = 0;
    if (vaga) { vaga.div.remove(); cena.remove(vaga.grupo); vaga.disco.material.dispose(); vaga = null; }
  }

  // Distribui as mesas num arco voltado para a câmera.
  function definirAgentes(agentes) {
    limpar();
    const total = agentes.length + 1; // +1 vaga "Novo agente"
    raio = Math.max(4.6, total * 0.78);
    const abertura = Math.min(Math.PI * 1.15, 0.5 + total * 0.27);
    meiaLargura = Math.sin(Math.min(abertura / 2, Math.PI / 2)) * raio;
    const lista = [...agentes.map((a) => ({ a })), { vaga: true }];
    lista.forEach((item, i) => {
      const t = total === 1 ? 0.5 : i / (total - 1);
      const ang = -abertura / 2 + t * abertura;
      const x = Math.sin(ang) * raio;
      const z = -Math.cos(ang) * raio * 0.72 + raio * 0.25;
      if (item.vaga) {
        vaga = criarVaga(); vaga.grupo.position.set(x, 0, z); cena.add(vaga.grupo); return;
      }
      const est = criarEstacao(item.a);
      est.grupo.position.set(x, 0, z);
      est.grupo.lookAt(0, 0, raio * 1.4);
      cena.add(est.grupo);
      estacoes.set(item.a.id, est);
    });
    piso.scale.set(raio + 2.2, 1, raio + 2.2);
    if (grade) { cena.remove(grade); grade.geometry.dispose(); grade.material.dispose(); }
    grade = new THREE.PolarGridHelper(raio + 2, 16, 6, 96, cores.grade, cores.grade);
    grade.position.y = 0.006; grade.material.transparent = true; grade.material.opacity = 0.5;
    cena.add(grade);
    nucleo.position.set(0, 0, raio * 0.25 + 0.6);
    enquadrar();
    if (selecionado) selecionar(selecionado);
  }

  let meiaLargura = 5;
  function enquadrar() {
    const largura = recipiente.clientWidth || 1, altura = recipiente.clientHeight || 1;
    const aspecto = largura / altura;
    // Distância para caber a largura do arco (mais margem para as etiquetas) e a profundidade.
    const fovH = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspecto);
    const porLargura = (meiaLargura + (aspecto < 1 ? 1.0 : 2.6)) / Math.tan(fovH / 2);
    const dist = Math.max(raio * 1.45 + 3.5, porLargura);
    controles.target.set(0, 0.9, raio * 0.05);
    camera.position.set(0, dist * 0.62, controles.target.z + dist * 0.85);
    controles.minDistance = Math.max(5, dist * 0.45);
    controles.maxDistance = dist * 1.6;
    controles.update();
  }

  function selecionar(id) {
    selecionado = id;
    for (const [chave, e] of estacoes) {
      const ativo = chave === id;
      e.div.classList.toggle('ativa', ativo);
      e.anel.material.opacity = ativo ? 0.85 : 0;
    }
  }

  function trabalhando(id, sim) {
    const e = estacoes.get(id);
    if (!e) return;
    e.trabalhando = sim;
    e.div.classList.toggle('trabalhando', sim);
  }

  // Clique e passar o mouse sobre as mesas.
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let inicioToque = null;
  let sobre = null;
  function idSob(ev) {
    const r = renderizador.domElement.getBoundingClientRect();
    ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ponteiro, camera);
    const hit = raycaster.intersectObjects(clicaveis, false)[0];
    return hit?.object.userData.id || null;
  }
  renderizador.domElement.addEventListener('pointerdown', (ev) => { inicioToque = { x: ev.clientX, y: ev.clientY }; });
  renderizador.domElement.addEventListener('pointerup', (ev) => {
    if (!inicioToque || Math.hypot(ev.clientX - inicioToque.x, ev.clientY - inicioToque.y) > 6) return;
    const id = idSob(ev);
    if (id === '__novo__') aoNovo?.();
    else if (id) aoEscolher?.(id);
  });
  renderizador.domElement.addEventListener('pointermove', (ev) => {
    if (ev.buttons) return;
    sobre = idSob(ev);
    renderizador.domElement.style.cursor = sobre ? 'pointer' : 'grab';
  });
  renderizador.domElement.addEventListener('pointerleave', () => { sobre = null; });

  // Tamanho
  function redimensionar() {
    const w = recipiente.clientWidth, h = recipiente.clientHeight;
    if (!w || !h) return;
    renderizador.setSize(w, h);
    etiquetas.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(() => { const antes = camera.aspect; redimensionar(); if (Math.abs(antes - camera.aspect) > 0.15) enquadrar(); });
  observador.observe(recipiente);
  redimensionar();

  // Tema claro/escuro
  function aplicarTema() {
    cores = paleta();
    matPiso.color.set(cores.piso); matBorda.color.set(cores.borda); base.material.color.set(cores.borda);
    matMesa.color.set(cores.mesa); matPerna.color.set(cores.perna); matMonitor.color.set(cores.monitor);
    matPele.color.set(cores.pele); matCadeira.color.set(cores.monitor);
    matCristal.color.set(cores.acento); matCristal.emissive.set(cores.acento); anel.material.color.set(cores.acento); luzNucleo.color.set(cores.acento);
    etqNucleo.style.setProperty('--cor', cores.acento);
    if (vaga) vaga.disco.material.color.set(cores.acento);
    if (grade) { grade.material.color?.set?.(cores.grade); }
    hemi.intensity = cores.escuro ? 0.9 : 1.4;
    sol.intensity = cores.escuro ? 1.4 : 2.2;
  }
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', aplicarTema);
  new MutationObserver(aplicarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  aplicarTema();

  // Animação
  const relogio = new THREE.Clock();
  let rodando = true;
  function quadro() {
    if (!rodando) return;
    requestAnimationFrame(quadro);
    if (!recipiente.clientWidth || !recipiente.clientHeight) return; // aba escondida: não desenha
    const t = relogio.getElapsedTime();
    const algumTrabalhando = [...estacoes.values()].some((e) => e.trabalhando);
    if (!reduzMovimento) {
      cristal.rotation.y += algumTrabalhando ? 0.035 : 0.006;
      cristal.position.y = 1.05 + Math.sin(t * 1.4) * 0.06;
      anel.rotation.z += algumTrabalhando ? 0.03 : 0.004;
    }
    matCristal.emissiveIntensity = algumTrabalhando ? 0.7 + Math.sin(t * 8) * 0.2 : 0.35;
    luzNucleo.intensity = algumTrabalhando ? 6 : 3;
    for (const [id, e] of estacoes) {
      const alvoY = (id === sobre || id === selecionado) ? 0.06 : 0;
      e.avatar.position.y += (alvoY - e.avatar.position.y) * 0.15;
      if (e.trabalhando) {
        if (!reduzMovimento) { e.corpo.rotation.z = Math.sin(t * 9 + e.fase) * 0.05; e.avatar.rotation.y = Math.sin(t * 2 + e.fase) * 0.15; }
        e.matTela.emissiveIntensity = 0.8 + Math.sin(t * 14 + e.fase) * 0.25;
      } else {
        e.corpo.rotation.z *= 0.9; e.avatar.rotation.y *= 0.9;
        e.matTela.emissiveIntensity = id === selecionado ? 0.75 : 0.5;
        if (!reduzMovimento) e.avatar.position.y += Math.sin(t * 1.2 + e.fase) * 0.0008;
      }
    }
    controles.update();
    renderizador.render(cena, camera);
    etiquetas.render(cena, camera);
  }
  quadro();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) rodando = false;
    else if (!rodando) { rodando = true; quadro(); }
  });

  return { definirAgentes, selecionar, trabalhando, redimensionar, enquadrar };
}

export function webglDisponivel() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
