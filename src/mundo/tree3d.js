/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Mundo — cena 3D das Árvores
   Substitui o cluster de círculos DOM na tela de entrada (Árvores)
   por uma cena Three.js: cada Árvore é um modelo low-poly com um
   globo de vidro, gerado via tools/blender/generate_tree.py. Clicar
   numa Árvore dá zoom + acende o globo + partículas, e então navega
   pro mesmo destino que o cluster de círculos usava.
   ───────────────────────────────────────────────────────── */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

  const hint = document.createElement('p');
  hint.className = 'arvores-3d-hint';
  hint.textContent = 'clique em uma árvore para entrar';
  stage.appendChild(hint);

  const ESCALA_VISAO_GERAL = 0.62;
  const ARCO_RAIO = 5.4;
  const ARCO_ABERTURA = Math.PI * 0.6;
  const ARCO_MEIA_LARGURA = ARCO_RAIO * Math.sin(ARCO_ABERTURA / 2);
  const VFOV_GRAUS = 48;
  const VFOV_RAD = (VFOV_GRAUS * Math.PI) / 180;

  // Distância de câmera necessária pra caber o arco inteiro no FOV
  // horizontal — em telas estreitas/retrato o FOV horizontal fica bem menor
  // que o vertical, então a câmera precisa recuar proporcionalmente.
  function distanciaParaCaberArco(aspect) {
    const hfovMeio = Math.atan(Math.tan(VFOV_RAD / 2) * aspect);
    return (ARCO_MEIA_LARGURA * 1.2) / Math.tan(hfovMeio);
  }

  let estado = 'geral'; // 'geral' | 'animando' | 'entrando'

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(VFOV_GRAUS, 1, 0.1, 60);
  const HOME_CAM_Y = 2.7;
  const HOME_TARGET = new THREE.Vector3(0, 1.1, 0);
  camera.position.set(0, HOME_CAM_Y, Math.max(9.2, distanciaParaCaberArco(1)));
  camera.lookAt(HOME_TARGET);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.domElement.className = 'arvores-3d-canvas';
  stage.appendChild(renderer.domElement);

  function resize() {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (estado === 'geral') {
      camera.position.set(0, HOME_CAM_Y, Math.max(9.2, distanciaParaCaberArco(w / h)));
      camera.lookAt(HOME_TARGET);
    }
  }
  resize();
  window.addEventListener('resize', resize);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fc6ff, 0.35);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const registros = [];

  itens.forEach((item, i) => {
    const t = itens.length > 1 ? i / (itens.length - 1) : 0.5;
    const angle = (t - 0.5) * ARCO_ABERTURA;
    const x = Math.sin(angle) * ARCO_RAIO;
    const z = 0;

    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.scale.setScalar(ESCALA_VISAO_GERAL);
    scene.add(holder);

    const label = document.createElement('span');
    label.className = 'arvores-3d-label';
    if (item.bloqueada) label.classList.add('arvores-3d-label--bloqueada');
    label.textContent = item.bloqueada ? '??' : item.titulo;
    labelLayer.appendChild(label);

    const registro = {
      holder, item, label,
      domeGlass: null, particles: null,
      baseY: 0, bobPhase: Math.random() * Math.PI * 2,
      baseScale: ESCALA_VISAO_GERAL,
    };
    registros.push(registro);

    if (item.bloqueada) {
      const placeholder = criarPlaceholderBloqueado();
      holder.add(placeholder);
      holder.traverse(o => { o.userData.registroRef = registro; });
      holder.userData.placeholderMat = placeholder.userData.placeholderMat;
    } else {
      carregarModelo(item.id).then(gltf => {
        const modelo = gltf.scene.clone(true);
        holder.add(modelo);
        holder.traverse(o => { o.userData.registroRef = registro; });
        registro.domeGlass = modelo.getObjectByName('Dome_Glass');
        if (registro.domeGlass && !registro.domeGlass.geometry.boundingSphere) {
          registro.domeGlass.geometry.computeBoundingSphere();
        }
        const raioDome = registro.domeGlass?.geometry?.boundingSphere?.radius || 1.3;
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

  function projetarLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    registros.forEach(r => {
      if (estado !== 'geral') { r.label.style.display = 'none'; return; }
      const alvo = r.holder.position.clone();
      alvo.y += 1.05 * r.baseScale;
      alvo.project(camera);
      if (alvo.z > 1) { r.label.style.display = 'none'; return; }
      r.label.style.display = '';
      const px = (alvo.x * 0.5 + 0.5) * w;
      const py = (1 - (alvo.y * 0.5 + 0.5)) * h;
      r.label.style.left = `${Math.min(w - 8, Math.max(8, px))}px`;
      r.label.style.top = `${Math.min(h - 8, Math.max(8, py))}px`;
    });
  }

  function entrarNaArvore(registro) {
    if (estado !== 'geral') return;
    estado = 'animando';
    hint.classList.add('arvores-3d-hint--oculto');
    registros.forEach(r => {
      if (r !== registro) gsap.to(r.holder.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'power1.in' });
    });

    const alvo = registro.holder.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    const camAlvo = registro.holder.position.clone().add(new THREE.Vector3(0.05, 1.35, 2.1));

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

  function aoMover(event) {
    if (estado !== 'geral') { renderer.domElement.style.cursor = 'default'; return; }
    const registro = acharRegistro(event.clientX, event.clientY);
    renderer.domElement.style.cursor = registro ? 'pointer' : 'default';
  }

  renderer.domElement.addEventListener('click', aoClicar);
  renderer.domElement.addEventListener('pointermove', aoMover);

  let rafId = null;
  function animate(t) {
    rafId = requestAnimationFrame(animate);
    const tempo = t * 0.001;

    if (estado === 'geral') {
      registros.forEach(r => {
        r.holder.position.y = r.baseY + Math.sin(tempo * 0.6 + r.bobPhase) * 0.08;
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
    gsap.killTweensOf(camera.position);
    registros.forEach(r => {
      gsap.killTweensOf(r.holder.scale);
      if (r.domeGlass) gsap.killTweensOf(r.domeGlass.material);
      if (r.particles) {
        gsap.killTweensOf(r.particles.material);
        r.particles.geometry.dispose();
        r.particles.material.dispose();
      }
      if (r.holder.userData.placeholderMat) r.holder.userData.placeholderMat.dispose();
    });
    renderer.dispose();
  };
}
