/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Mundo — Cena 3D das Árvores
   Substitui o cluster de círculos DOM na tela de entrada (Árvores)
   por uma cena Three.js: cada Árvore é um modelo low-poly com um
   globo de vidro, gerado via tools/blender/generate_tree.py. Clicar
   numa Árvore dá zoom + acende o globo + partículas, e então navega
   pro mesmo destino que o cluster de círculos usava.
   ───────────────────────────────────────────────────────── */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';

const MODELOS_BASE = '../assets/3d/arvores/';
const gltfCache = new Map();

function carregarModelo(id) {
  const url = `${MODELOS_BASE}${id}.glb`;
  if (!gltfCache.has(url)) {
    gltfCache.set(url, new GLTFLoader().loadAsync(url));
  }
  return gltfCache.get(url);
}

const placeholderGeoTronco = new THREE.ConeGeometry(0.1, 1, 6);
const placeholderGeoCopa = new THREE.IcosahedronGeometry(0.35, 0);

// Cor cinza usada nos placeholders bloqueados em todo o app (mesma de
// desenharGalhoMini) — reaproveitada aqui pro glow de hover não entregar
// a cor real de uma Árvore ainda não descoberta.
const RGB_BLOQUEADA = '90,94,122';

// Textura de brilho compartilhada (gerada uma vez via canvas 2D) — tingida
// por instância através da cor do SpriteMaterial, então não precisa de uma
// textura por Árvore.
let glowTextureCompartilhada = null;
function getGlowTexture() {
  if (glowTextureCompartilhada) return glowTextureCompartilhada;
  const tam = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tam;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, tam, tam);
  glowTextureCompartilhada = new THREE.CanvasTexture(canvas);
  return glowTextureCompartilhada;
}

function criarGlow(corRgbString) {
  const [r, g, b] = corRgbString.split(',').map(n => parseInt(n, 10) / 255);
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: new THREE.Color(r, g, b),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  // Tamanho provisório (domes bloqueados/placeholder não têm raio real) —
  // reescalado pra caber certinho assim que o modelo real carrega, em
  // montarCena3DArvores.
  sprite.scale.setScalar(2.9);
  sprite.position.y = 1.2;
  return sprite;
}

function criarPlaceholderBloqueado() {
  const grupo = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a3d4a, roughness: 0.95, transparent: true, opacity: 0.5,
  });
  const tronco = new THREE.Mesh(placeholderGeoTronco, mat);
  tronco.position.y = 0.5;
  const copa = new THREE.Mesh(placeholderGeoCopa, mat);
  copa.position.y = 1.15;
  grupo.add(tronco, copa);
  grupo.userData.placeholderMat = mat;
  return grupo;
}

function criarParticulas(raio) {
  const n = 90;
  const positions = new Float32Array(n * 3);
  const speeds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = raio * 0.85 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = Math.random() * raio * 1.1;
    positions[i * 3 + 2] = Math.sin(theta) * r;
    speeds[i] = 0.05 + Math.random() * 0.1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.02, transparent: true, opacity: 0, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.speeds = speeds;
  pts.userData.raio = raio;
  pts.visible = false;
  return pts;
}

// itens: [{ id, titulo, rgb, catId, bloqueada }]
// callbacks: { resolverDestino(item)->path, aoEntrar(path), aoBloqueada(item) }
export function montarCena3DArvores(host, itens, callbacks) {
  const { resolverDestino, aoEntrar, aoBloqueada } = callbacks;

  const stage = document.createElement('div');
  stage.className = 'arvores-stage arvores-stage-3d';
  host.appendChild(stage);

  const labelLayer = document.createElement('div');
  labelLayer.className = 'arvores-3d-labels';
  stage.appendChild(labelLayer);

  // Reduzida em relação à versão anterior porque os domes agora são bem
  // maiores (ver generate_tree.py — precisam de folga pra conter a árvore
  // inteira). Isso preserva o mesmo tamanho aparente/espaçamento no arco.
  const ESCALA_VISAO_GERAL = 0.3;
  const ARCO_RAIO = 6.6;
  const ARCO_ABERTURA = Math.PI * 0.6;
  const ARCO_PROFUNDIDADE = 1.6; // recuo sutil das pontas do arco, pra não ficar uma linha reta
  const ARCO_MEIA_LARGURA = ARCO_RAIO * Math.sin(ARCO_ABERTURA / 2);
  const VFOV_GRAUS = 48;
  const VFOV_RAD = (VFOV_GRAUS * Math.PI) / 180;

  // ── Anti-sobreposição ────────────────────────────────────────────────
  // Raio visual aproximado de um dome já escalado pro mundo (raio típico
  // gerado em generate_tree.py, ~1.5, vezes ESCALA_VISAO_GERAL) — usado só
  // pra calcular distâncias mínimas de segurança, não precisa ser exato
  // (o raio real varia um pouco por Árvore e só é conhecido depois que o
  // .glb carrega, tarde demais pro layout inicial).
  const RAIO_VISUAL_ESTIMADO = 1.5 * ESCALA_VISAO_GERAL;
  // Distância mínima entre os centros de duas cúpulas "normais" — folga
  // generosa (bem mais que a soma dos raios) pra sobrar um vão nítido entre
  // elas, não só evitar encostar.
  const DIST_MINIMA_CENTROS = RAIO_VISUAL_ESTIMADO * 2 + 1.0;
  // A Limiar precisa de um vazio bem maior em volta dela (ver POSICAO_LIMIAR).
  const DIST_MINIMA_LIMIAR = DIST_MINIMA_CENTROS * 2.3;

  // ── A Limiar (Fim) — canto isolado fixo, fora do espalhamento comum ──
  // Ela "é e não é uma Árvore" (lore) — por isso não participa do
  // relaxamento com as demais: fica plantada num canto extremo, bem além da
  // abertura horizontal do arco e bem acima da faixa vertical comum.
  // IMPORTANTE: de propósito NÃO empurramos ela também pra bem longe no
  // eixo Z (profundidade) — numa câmera em perspectiva o deslocamento
  // angular na tela é ~x/profundidade, então uma profundidade muito maior
  // ENCOLHE de volta o deslocamento horizontal, cancelando o isolamento em
  // vez de reforçar (testado: com z bem negativo o rótulo dela acabava
  // caindo colado no de Abismo/Matriz na tela, mesmo estando a >8 unidades
  // de distância no mundo 3D). Por isso a profundidade fica rasa — perto do
  // resto do grupo —, deixando x/y fazerem o trabalho de isolar de verdade.
  const POSICAO_LIMIAR = {
    x: ARCO_MEIA_LARGURA * 1.9,
    y: 3.6,
    z: 1.2,
  };

  // ── A A.X.I.S — patrulha contínua, nunca estática ────────────────────
  // Subjugou Keryx e intercepta a comunicação das outras deidades — não faz
  // sentido ela ficar parada num slot fixo do arquipélago como as demais.
  // Percorre uma trajetória tipo Lissajous (cada eixo com seu próprio
  // período, todos bem lentos) que varre boa parte do mesmo volume onde as
  // outras Árvores vivem — de propósito: ela invade o espaço delas, não
  // respeita o vão que as outras mantêm entre si (ver animate()).
  const AXIS_PATRULHA_X_AMPL = ARCO_MEIA_LARGURA * 0.85;
  const AXIS_PATRULHA_Y_BASE = 0.6;
  const AXIS_PATRULHA_Y_AMPL = 1.8;
  const AXIS_PATRULHA_Z_OFFSET = -1.5;
  const AXIS_PATRULHA_Z_AMPL = 4.5;
  const AXIS_PATRULHA_PERIODO_X = 42; // segundos por ciclo — bem devagar
  const AXIS_PATRULHA_PERIODO_Y = 23;
  const AXIS_PATRULHA_PERIODO_Z = 31;

  function posicaoPatrulhaAxis(tempo) {
    const x = Math.sin((tempo / AXIS_PATRULHA_PERIODO_X) * Math.PI * 2) * AXIS_PATRULHA_X_AMPL;
    const y = AXIS_PATRULHA_Y_BASE + Math.sin((tempo / AXIS_PATRULHA_PERIODO_Y) * Math.PI * 2) * AXIS_PATRULHA_Y_AMPL;
    const z = AXIS_PATRULHA_Z_OFFSET + Math.cos((tempo / AXIS_PATRULHA_PERIODO_Z) * Math.PI * 2) * AXIS_PATRULHA_Z_AMPL;
    return { x, y, z };
  }

  // As 8 "pontas" do paralelepípedo que contém toda a trajetória de
  // patrulha — usadas só pro cálculo de enquadramento da câmera (garante
  // que a A.X.I.S nunca escapa da viewport, mesmo no pior caso da varredura).
  function pontosLimitesPatrulhaAxis() {
    const xs = [-AXIS_PATRULHA_X_AMPL, AXIS_PATRULHA_X_AMPL];
    const ys = [AXIS_PATRULHA_Y_BASE - AXIS_PATRULHA_Y_AMPL, AXIS_PATRULHA_Y_BASE + AXIS_PATRULHA_Y_AMPL];
    const zs = [AXIS_PATRULHA_Z_OFFSET - AXIS_PATRULHA_Z_AMPL, AXIS_PATRULHA_Z_OFFSET + AXIS_PATRULHA_Z_AMPL];
    const pontos = [];
    xs.forEach(x => ys.forEach(y => zs.forEach(z => pontos.push(new THREE.Vector3(x, y, z)))));
    return pontos;
  }

  // Empurra pares mais próximos que DIST_MINIMA_CENTROS pra longe um do
  // outro (metade pra cada lado), e empurra qualquer candidato que invada o
  // vazio reservado da Limiar (obstaculo) — sempre determinístico: mesma
  // entrada sempre produz a mesma saída, sem Math.random() em lugar nenhum,
  // então o layout continua estável entre visitas.
  function aplicarAntiSobreposicao(candidatos, obstaculo) {
    const MAX_ITER = 200;
    for (let iter = 0; iter < MAX_ITER; iter++) {
      let ajustou = false;
      for (let i = 0; i < candidatos.length; i++) {
        const a = candidatos[i];
        for (let j = i + 1; j < candidatos.length; j++) {
          const b = candidatos[j];
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < DIST_MINIMA_CENTROS) {
            if (dist < 1e-4) dist = 1e-4;
            const falta = (DIST_MINIMA_CENTROS - dist) / 2;
            const nx = dx / dist, ny = dy / dist, nz = dz / dist;
            a.x -= nx * falta; a.y -= ny * falta; a.z -= nz * falta;
            b.x += nx * falta; b.y += ny * falta; b.z += nz * falta;
            ajustou = true;
          }
        }
        if (obstaculo) {
          const dx = a.x - obstaculo.x, dy = a.y - obstaculo.y, dz = a.z - obstaculo.z;
          let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < DIST_MINIMA_LIMIAR) {
            if (dist < 1e-4) dist = 1e-4;
            const falta = DIST_MINIMA_LIMIAR - dist;
            const nx = dx / dist, ny = dy / dist, nz = dz / dist;
            a.x += nx * falta; a.y += ny * falta; a.z += nz * falta;
            ajustou = true;
          }
        }
      }
      if (!ajustou) break;
    }
  }

  // Hash determinístico (não é Math.random() — o layout precisa ser sempre
  // o mesmo entre visitas, senão o player perde a memória espacial de onde
  // cada Árvore fica) — dá uma variação "orgânica" estável por índice.
  function hash01(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  let estado = 'geral'; // 'geral' | 'animando' | 'entrando'

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(VFOV_GRAUS, 1, 0.1, 60);
  const HOME_CAM_Y = 2.7;
  const HOME_TARGET = new THREE.Vector3(0, 1.1, 0);

  // Preenchido depois que o layout (com anti-sobreposição) e a patrulha da
  // A.X.I.S já têm suas posições/limites definidos — ver final do bloco de
  // criação dos itens, mais abaixo. Vazio aqui só serve de valor inicial de
  // segurança pra o primeiro resize() (chamado antes disso existir).
  let pontosParaEnquadrar = [];

  // Busca exata (não aproximada) da menor distância de câmera que ainda
  // enquadra todos os pontos dados, usando a câmera/projeção reais — evita
  // erro de aproximação analítica (ângulo horizontal vs. vertical, câmera
  // inclinada olhando pra HOME_TARGET) que causava corte nas bordas antes.
  function distanciaParaEnquadrar(aspect) {
    if (pontosParaEnquadrar.length === 0) return 10; // bootstrap, antes do layout existir
    const MARGEM_NDC = 0.14; // fração da tela reservada pro raio do dome + label
    const PASSO = 0.35;
    const MAX_ITER = 80;
    let dist = 6;
    camera.aspect = aspect;
    for (let iter = 0; iter < MAX_ITER; iter++) {
      camera.position.set(0, HOME_CAM_Y, dist);
      camera.lookAt(HOME_TARGET);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      let cabeTudo = true;
      for (const p of pontosParaEnquadrar) {
        const proj = p.clone().project(camera);
        if (proj.z > 1 || proj.z < -1 || Math.abs(proj.x) > 1 - MARGEM_NDC || Math.abs(proj.y) > 1 - MARGEM_NDC) {
          cabeTudo = false;
          break;
        }
      }
      if (cabeTudo) return dist;
      dist += PASSO;
    }
    return dist; // não convergiu em MAX_ITER passos — melhor esforço
  }

  camera.position.set(0, HOME_CAM_Y, Math.max(8, distanciaParaEnquadrar(1)));
  camera.lookAt(HOME_TARGET);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.domElement.className = 'arvores-3d-canvas';
  stage.appendChild(renderer.domElement);

  // Clearcoat e transmission (vidro dos domes) quase não aparecem sem um
  // environment map — são camadas baseadas em IBL, não em luzes diretas.
  // RoomEnvironment é o ambiente procedural padrão que os próprios exemplos
  // oficiais do Three.js usam pra isso, sem precisar de um HDRI externo.
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  // Preenche exatamente o espaço que sobra da viewport abaixo do cabeçalho
  // — usar min-height em vh/dvh no CSS soma com a altura do cabeçalho (que
  // varia por página/breakpoint) e deixa a página mais alta que uma
  // viewport inteira, sobrando um trecho vazio (mas com estrelas) no fim,
  // exigindo rolagem à toa. Medir e fixar a altura via JS evita isso sem
  // precisar reestruturar o layout flex compartilhado com as outras
  // páginas do Mundo (que não são de tela única).
  function ajustarAlturaStage() {
    const topo = stage.getBoundingClientRect().top;
    const alturaDisponivel = window.innerHeight - topo;
    stage.style.height = `${Math.max(alturaDisponivel, 320)}px`;
  }

  function resize() {
    ajustarAlturaStage();
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (estado === 'geral') {
      camera.position.set(0, HOME_CAM_Y, Math.max(8, distanciaParaEnquadrar(w / h)));
      camera.lookAt(HOME_TARGET);
    }
  }
  resize();
  window.addEventListener('resize', resize);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fc6ff, 0.35);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd8e6ff, 0.5);
  rim.position.set(-1, 3, -5);
  scene.add(rim);

  const registros = [];
  // Candidatos ao relaxamento de anti-sobreposição — só as Árvores
  // "normais" (nem a Limiar isolada, nem a A.X.I.S em patrulha contínua)
  // entram nessa lista. Guarda o índice (não a referência do registro
  // ainda, que só existe depois de criado) pra escrever de volta depois.
  const candidatosRelaxar = [];

  itens.forEach((item, i) => {
    const t = itens.length > 1 ? i / (itens.length - 1) : 0.5;
    const angle = (t - 0.5) * ARCO_ABERTURA;

    // O arco é só o "esqueleto" pra manter alguma ordem esquerda→direita
    // (senão vira sopa de letrinha sem organização nenhuma) — X/Y/Z ganham
    // uma variação orgânica bem agressiva por cima, principalmente Y/Z
    // (pedido explícito: "arquipélago cósmico", com mundos bem mais perto
    // ou bem mais longe da câmera, não uma faixa horizontal arrumadinha).
    // Calculada pra TODOS os itens (mesmo Limiar/A.X.I.S) só pra manter os
    // índices do hash estáveis — as duas exceções abaixo descartam esse
    // valor e usam posição própria.
    const xJitter = (hash01(i * 2.1 + 13) - 0.5) * 1.1;
    const alturaVariacao = (hash01(i * 3.7 + 1) - 0.5) * 5.0;
    const profundidadeVariacao = (hash01(i * 5.3 + 7) - 0.5) * 11.0;

    let x = Math.sin(angle) * ARCO_RAIO + xJitter;
    let z = -(1 - Math.cos(angle)) * ARCO_PROFUNDIDADE + profundidadeVariacao;
    let baseY = alturaVariacao;

    if (item.isolada) {
      // A Limiar "é e não é uma Árvore" — canto fixo e isolado, nunca
      // participa do relaxamento comum (ver POSICAO_LIMIAR).
      x = POSICAO_LIMIAR.x;
      baseY = POSICAO_LIMIAR.y;
      z = POSICAO_LIMIAR.z;
    } else if (!item.subjugada) {
      candidatosRelaxar.push({ i, x, y: baseY, z });
    }
    // Se for `item.subjugada` (A.X.I.S): x/z/baseY calculados acima nunca
    // chegam a ser usados de verdade — a posição inicial real vem de
    // posicaoPatrulhaAxis(0) logo abaixo, e depois é recalculada a cada
    // frame em animate().

    const holder = new THREE.Group();
    if (item.subjugada) {
      const p0 = posicaoPatrulhaAxis(0);
      holder.position.set(p0.x, p0.y, p0.z);
    } else {
      holder.position.set(x, baseY, z);
    }
    holder.scale.setScalar(ESCALA_VISAO_GERAL);
    scene.add(holder);

    const corAcento = item.bloqueada ? RGB_BLOQUEADA : item.rgb;

    const label = document.createElement('span');
    label.className = 'arvores-3d-label';
    if (item.bloqueada) label.classList.add('arvores-3d-label--bloqueada');
    label.textContent = item.bloqueada ? '??' : item.titulo;
    label.style.setProperty('--accent', `rgb(${corAcento})`);
    labelLayer.appendChild(label);

    const glow = criarGlow(corAcento);
    holder.add(glow);

    const registro = {
      holder, item, label, glow,
      domeGlass: null, particles: null,
      baseY, bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.45 + Math.random() * 0.3,
      baseScale: ESCALA_VISAO_GERAL,
      // A.X.I.S nunca fica parada — ver ramo `r.patrulha` em animate().
      patrulha: !!item.subjugada,
    };
    registros.push(registro);

    // Sinal de que uma identidade original foi subjugada (ex.: Parley sob a
    // A.X.I.S) — passar o mouse faz o rótulo "vazar" o nome/cor originais por
    // um instante antes de voltar à identidade dominante, como um sinal
    // fraco piscando por baixo do controle.
    if (item.subjugada && !item.bloqueada && item.tituloSubjugada) {
      label.classList.add('arvores-3d-label--subjugada');
      const corDominante = `rgb(${corAcento})`;
      const corOriginal = `rgb(${item.rgbSubjugada || '160,160,170'})`;
      registro.glitch = gsap.timeline({ paused: true })
        .call(() => { label.textContent = item.tituloSubjugada; label.style.setProperty('--accent', corOriginal); })
        .to({}, { duration: 0.07 })
        .call(() => { label.textContent = item.titulo; label.style.setProperty('--accent', corDominante); })
        .to({}, { duration: 0.05 })
        .call(() => { label.textContent = item.tituloSubjugada; label.style.setProperty('--accent', corOriginal); })
        .to({}, { duration: 0.09 })
        .call(() => { label.textContent = item.titulo; label.style.setProperty('--accent', corDominante); });
    }

    if (item.bloqueada) {
      const placeholder = criarPlaceholderBloqueado();
      holder.add(placeholder);
      holder.traverse(o => { o.userData.registroRef = registro; });
      holder.userData.placeholderMat = placeholder.userData.placeholderMat;
    } else {
      carregarModelo(item.modeloId || item.id).then(gltf => {
        const modelo = gltf.scene.clone(true);
        holder.add(modelo);
        holder.traverse(o => { o.userData.registroRef = registro; });
        registro.domeGlass = modelo.getObjectByName('Dome_Glass');
        if (registro.domeGlass && !registro.domeGlass.geometry.boundingSphere) {
          registro.domeGlass.geometry.computeBoundingSphere();
        }
        const raioDome = registro.domeGlass?.geometry?.boundingSphere?.radius || 1.3;
        registro.raioDome = raioDome;
        registro.glow.scale.setScalar(raioDome * 1.25);
        registro.glow.position.y = raioDome * 0.55;
        const particles = criarParticulas(raioDome);
        holder.add(particles);
        registro.particles = particles;
      }).catch(() => {
        const placeholder = criarPlaceholderBloqueado();
        holder.add(placeholder);
        holder.traverse(o => { o.userData.registroRef = registro; });
      });
    }
  });

  // Resolve a Limiar (se existir na lista) antes do relaxamento, pra ela
  // funcionar como obstáculo fixo que as demais Árvores precisam evitar.
  const registroLimiar = registros.find(r => r.item.isolada);
  const obstaculoLimiar = registroLimiar
    ? { x: POSICAO_LIMIAR.x, y: POSICAO_LIMIAR.y, z: POSICAO_LIMIAR.z }
    : null;

  // Anti-sobreposição: empurra as Árvores "normais" (nem isolada, nem em
  // patrulha) pra longe umas das outras e pra longe do vazio da Limiar, e
  // escreve as posições resolvidas de volta nos holders/baseY já criados.
  aplicarAntiSobreposicao(candidatosRelaxar, obstaculoLimiar);
  candidatosRelaxar.forEach(c => {
    const r = registros[c.i];
    r.holder.position.set(c.x, c.y, c.z);
    r.baseY = c.y;
  });

  // Pontos que a câmera "geral" precisa sempre enquadrar: todas as posições
  // finais já relaxadas, o canto fixo da Limiar (se houver) e as 8 pontas do
  // paralelepípedo que contém toda a trajetória de patrulha da A.X.I.S (se
  // houver) — assim o enquadramento nunca corta ninguém, incluindo o pior
  // caso da varredura contínua.
  pontosParaEnquadrar = [
    ...candidatosRelaxar.map(c => new THREE.Vector3(c.x, c.y, c.z)),
  ];
  if (obstaculoLimiar) {
    pontosParaEnquadrar.push(new THREE.Vector3(obstaculoLimiar.x, obstaculoLimiar.y, obstaculoLimiar.z));
  }
  if (registros.some(r => r.patrulha)) {
    pontosParaEnquadrar.push(...pontosLimitesPatrulhaAxis());
  }
  // Recalcula o enquadramento agora que existem pontos de verdade — a
  // primeira chamada de resize() (antes deste bloco existir) usou o
  // bootstrap de distanciaParaEnquadrar (retorno fixo, sem pontos).
  resize();

  function projetarLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    registros.forEach(r => {
      if (estado !== 'geral') { r.label.style.display = 'none'; return; }
      const alvo = r.holder.position.clone();
      // Placeholders bloqueados são bem menores que um dome de verdade —
      // cada um usa sua própria altura de referência pro label não flutuar
      // baixo demais (dentro do dome) nem alto demais (acima do placeholder).
      const raioEfetivo = r.item.bloqueada ? 1.5 : (r.raioDome || 1.4);
      alvo.y += raioEfetivo * r.baseScale * 1.1;
      alvo.project(camera);
      if (alvo.z > 1) { r.label.style.display = 'none'; return; }
      r.label.style.display = '';
      const px = (alvo.x * 0.5 + 0.5) * w;
      const py = (1 - (alvo.y * 0.5 + 0.5)) * h;
      // Margem bem maior que antes (8px) na horizontal — a Limiar agora fica
      // de propósito num canto bem extremo (ver POSICAO_LIMIAR), e o texto
      // do rótulo (centralizado no ponto via CSS transform) cortava na
      // borda da tela em janelas estreitas com só 8px de folga.
      const MARGEM_LABEL_X = 56;
      r.label.style.left = `${Math.min(w - MARGEM_LABEL_X, Math.max(MARGEM_LABEL_X, px))}px`;
      r.label.style.top = `${Math.min(h - 8, Math.max(8, py))}px`;
    });
  }

  function entrarNaArvore(registro) {
    if (estado !== 'geral') return;
    estado = 'animando';
    registros.forEach(r => {
      if (r !== registro) gsap.to(r.holder.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'power1.in' });
    });

    // Domes maiores (pra caber a árvore inteira, ver generate_tree.py) pedem
    // um enquadramento de câmera proporcionalmente mais recuado — sem isso,
    // árvores com dome bem acima da referência ficariam grudadas na câmera.
    const REFERENCIA_RAIO_DOME = 1.4;
    const fatorZoom = (registro.raioDome || REFERENCIA_RAIO_DOME) / REFERENCIA_RAIO_DOME;
    const alvo = registro.holder.position.clone().add(new THREE.Vector3(0, 1.1 * fatorZoom, 0));
    const camAlvo = registro.holder.position.clone().add(
      new THREE.Vector3(0.05 * fatorZoom, 1.35 * fatorZoom, 2.1 * fatorZoom)
    );

    gsap.to(registro.holder.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'power2.inOut' });
    gsap.to(camera.position, {
      x: camAlvo.x, y: camAlvo.y, z: camAlvo.z,
      duration: 1.5, ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(alvo),
    });
    if (registro.domeGlass) {
      gsap.to(registro.domeGlass.material, { opacity: 0.55, duration: 1.3, ease: 'power1.in' });
    }
    if (registro.particles) {
      registro.particles.visible = true;
      gsap.to(registro.particles.material, { opacity: 0.85, duration: 1.1, delay: 0.3 });
    }

    gsap.delayedCall(1.5, () => {
      estado = 'entrando';
      aoEntrar(resolverDestino(registro.item));
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function acharRegistro(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find(h => h.object.userData.registroRef);
    return hit ? hit.object.userData.registroRef : null;
  }

  function aoClicar(event) {
    if (estado !== 'geral') return;
    const registro = acharRegistro(event.clientX, event.clientY);
    if (!registro) return;
    if (registro.item.bloqueada) {
      aoBloqueada(registro.item);
      const mat = registro.holder.userData.placeholderMat;
      if (mat) {
        gsap.timeline()
          .to(mat.color, { r: 1, g: 0.25, b: 0.25, duration: 0.12 })
          .to(mat.color, { r: 0x3a / 0xff, g: 0x3d / 0xff, b: 0x4a / 0xff, duration: 0.4 });
      }
      return;
    }
    entrarNaArvore(registro);
  }

  // Hover — a árvore sob o mouse cresce levemente e acende um glow por
  // trás dela (cor real se descoberta, cinza neutro se ainda bloqueada,
  // pra não entregar de qual Árvore se trata antes da hora).
  let hoverAtual = null;

  function aplicarHover(registro, ligado) {
    const escalaAlvo = ligado ? registro.baseScale * 1.16 : registro.baseScale;
    gsap.to(registro.holder.scale, {
      x: escalaAlvo, y: escalaAlvo, z: escalaAlvo,
      duration: 0.35, ease: ligado ? 'back.out(1.7)' : 'power2.out',
    });
    gsap.to(registro.glow.material, { opacity: ligado ? 0.55 : 0, duration: 0.35 });
    if (ligado && registro.glitch) registro.glitch.restart(true);
    registro.label.classList.toggle('arvores-3d-label--hover', ligado);
  }

  function aoMover(event) {
    if (estado !== 'geral') { renderer.domElement.style.cursor = 'default'; return; }
    const registro = acharRegistro(event.clientX, event.clientY);
    renderer.domElement.style.cursor = registro ? 'pointer' : 'default';
    if (registro === hoverAtual) return;
    if (hoverAtual) aplicarHover(hoverAtual, false);
    if (registro) aplicarHover(registro, true);
    hoverAtual = registro;
  }

  function aoSairDoCanvas() {
    renderer.domElement.style.cursor = 'default';
    if (hoverAtual) aplicarHover(hoverAtual, false);
    hoverAtual = null;
  }

  renderer.domElement.addEventListener('click', aoClicar);
  renderer.domElement.addEventListener('pointermove', aoMover);
  renderer.domElement.addEventListener('pointerleave', aoSairDoCanvas);

  let rafId = null;
  function animate(t) {
    rafId = requestAnimationFrame(animate);
    const tempo = t * 0.001;

    if (estado === 'geral') {
      registros.forEach(r => {
        if (r.patrulha) {
          // A.X.I.S nunca ocupa um slot fixo do arquipélago — desliza numa
          // trajetória contínua e lenta (tipo Lissajous) que varre o mesmo
          // volume onde as outras Árvores vivem, de propósito invadindo o
          // espaço delas em vez de respeitar o vão que mantêm entre si.
          const p = posicaoPatrulhaAxis(tempo);
          r.holder.position.set(p.x, p.y, p.z);
          r.holder.rotation.z = Math.sin(tempo * 0.6) * 0.05;
          return;
        }
        r.holder.position.y = r.baseY + Math.sin(tempo * r.bobSpeed + r.bobPhase) * 0.11;
        r.holder.rotation.z = Math.sin(tempo * r.bobSpeed * 0.7 + r.bobPhase) * 0.035;
      });
    }

    registros.forEach(r => {
      if (!r.particles || !r.particles.visible) return;
      const pos = r.particles.geometry.attributes.position;
      const speeds = r.particles.userData.speeds;
      const raio = r.particles.userData.raio;
      for (let i = 0; i < speeds.length; i++) {
        let y = pos.array[i * 3 + 1] + speeds[i] * 0.01;
        if (y > raio * 1.1) y = 0;
        pos.array[i * 3 + 1] = y;
      }
      pos.needsUpdate = true;
    });

    projetarLabels();
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(animate);

  return function limpar() {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    renderer.domElement.removeEventListener('click', aoClicar);
    renderer.domElement.removeEventListener('pointermove', aoMover);
    renderer.domElement.removeEventListener('pointerleave', aoSairDoCanvas);
    gsap.killTweensOf(camera.position);
    registros.forEach(r => {
      gsap.killTweensOf(r.holder.scale);
      gsap.killTweensOf(r.glow.material);
      if (r.glitch) r.glitch.kill();
      r.glow.material.dispose();
      if (r.domeGlass) gsap.killTweensOf(r.domeGlass.material);
      if (r.particles) {
        gsap.killTweensOf(r.particles.material);
        r.particles.geometry.dispose();
        r.particles.material.dispose();
      }
      if (r.holder.userData.placeholderMat) r.holder.userData.placeholderMat.dispose();
    });
    scene.environment = null;
    envRT.dispose();
    pmremGenerator.dispose();
    renderer.dispose();
  };
}
