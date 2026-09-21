import type * as ThreeTipos from 'three';

/** Cena 3D dos dados. O resultado NUNCA nasce aqui: o servidor já sorteou e
 * esta cena só faz o dado rolar e pousar exatamente na face que ele disse. */

export interface DadoCena {
  faces: number;
  valor: number;
  /** Dado descartado por vantagem/desvantagem: escurece depois de pousar. */
  ignorado: boolean;
}

export interface OpcoesCena {
  /** Todos os dados pousaram. */
  aoPousar: () => void;
  /** Rolou 20 natural (brilho dourado) ou 1 natural (tom de perigo). */
  destaque: 'critico' | 'falha' | null;
}

export interface ControleCena {
  parar: () => void;
}

export const FACES_SUPORTADAS = [4, 6, 8, 10, 12, 20];
export const MAX_DADOS_3D = 6;

const DURACAO_ROLAGEM_S = 1.55;
const COLUNAS_ATLAS = 5;
const TAMANHO_CELULA = 200;

type Tres = typeof ThreeTipos;

/** Pontos únicos de uma geometria; o casco convexo deles vira o dado. */
const pontosUnicos = (tres: Tres, geometria: ThreeTipos.BufferGeometry): ThreeTipos.Vector3[] => {
  const posicao = geometria.getAttribute('position');
  const vistos = new Map<string, ThreeTipos.Vector3>();
  for (let i = 0; i < posicao.count; i += 1) {
    const ponto = new tres.Vector3().fromBufferAttribute(posicao, i);
    vistos.set(`${ponto.x.toFixed(3)}|${ponto.y.toFixed(3)}|${ponto.z.toFixed(3)}`, ponto);
  }
  return [...vistos.values()];
};

/** Trapezoedro pentagonal (d10). Com o polo em 1 e o anel em ±0,1056 os
 * quatro pontos de cada face ficam no mesmo plano. */
const pontosD10 = (tres: Tres): ThreeTipos.Vector3[] => {
  const altura = 0.1056;
  const pontos = [new tres.Vector3(0, 1, 0), new tres.Vector3(0, -1, 0)];
  for (let i = 0; i < 10; i += 1) {
    const angulo = (i * Math.PI) / 5;
    pontos.push(new tres.Vector3(Math.cos(angulo), i % 2 === 0 ? altura : -altura, Math.sin(angulo)));
  }
  return pontos;
};

const pontosDoDado = (tres: Tres, faces: number): ThreeTipos.Vector3[] => {
  let pontos: ThreeTipos.Vector3[];
  switch (faces) {
    case 4: pontos = pontosUnicos(tres, new tres.TetrahedronGeometry(1)); break;
    case 6: pontos = pontosUnicos(tres, new tres.BoxGeometry(1.15, 1.15, 1.15)); break;
    case 8: pontos = pontosUnicos(tres, new tres.OctahedronGeometry(1)); break;
    case 10: pontos = pontosD10(tres); break;
    case 12: pontos = pontosUnicos(tres, new tres.DodecahedronGeometry(1)); break;
    default: pontos = pontosUnicos(tres, new tres.IcosahedronGeometry(1)); break;
  }
  return pontos;
};

interface FaceDado {
  normal: ThreeTipos.Vector3;
  centro: ThreeTipos.Vector3;
  triangulos: ThreeTipos.Vector3[][];
  numero: number;
}

/** Junta os triângulos coplanares do casco em faces de verdade. */
const agruparFaces = (tres: Tres, casco: ThreeTipos.BufferGeometry): FaceDado[] => {
  const posicao = casco.getAttribute('position');
  const faces: FaceDado[] = [];
  for (let i = 0; i < posicao.count; i += 3) {
    const a = new tres.Vector3().fromBufferAttribute(posicao, i);
    const b = new tres.Vector3().fromBufferAttribute(posicao, i + 1);
    const c = new tres.Vector3().fromBufferAttribute(posicao, i + 2);
    const normal = new tres.Vector3().subVectors(b, a).cross(new tres.Vector3().subVectors(c, a)).normalize();
    // O dado está centrado na origem: a normal sempre aponta para fora.
    if (normal.dot(a.clone().add(b).add(c)) < 0) normal.negate();
    const existente = faces.find((face) => face.normal.dot(normal) > 0.9995);
    if (existente) existente.triangulos.push([a, b, c]);
    else faces.push({ normal, centro: new tres.Vector3(), triangulos: [[a, b, c]], numero: 0 });
  }
  faces.forEach((face) => {
    const vertices = face.triangulos.flat();
    face.centro = vertices.reduce((soma, v) => soma.add(v), new tres.Vector3()).divideScalar(vertices.length);
  });
  return faces;
};

/** Faces opostas somam (N + 1), como num dado de verdade. */
const numerarFaces = (faces: FaceDado[]) => {
  const total = faces.length;
  let proximo = 1;
  faces.forEach((face, indice) => {
    if (face.numero) return;
    face.numero = proximo;
    const oposta = faces.findIndex((outra, j) => j !== indice && !outra.numero && outra.normal.dot(face.normal) < -0.999);
    if (oposta >= 0) faces[oposta].numero = total + 1 - proximo;
    proximo += 1;
    while (faces.some((f) => f.numero === proximo)) proximo += 1;
  });
};

const criarAtlas = (tres: Tres, quantidade: number, numeros: number[]): ThreeTipos.CanvasTexture => {
  const linhas = Math.ceil(quantidade / COLUNAS_ATLAS);
  const canvas = document.createElement('canvas');
  canvas.width = COLUNAS_ATLAS * TAMANHO_CELULA;
  canvas.height = linhas * TAMANHO_CELULA;
  const contexto = canvas.getContext('2d');
  if (contexto) {
    numeros.forEach((numero, indice) => {
      const x = (indice % COLUNAS_ATLAS) * TAMANHO_CELULA;
      const y = Math.floor(indice / COLUNAS_ATLAS) * TAMANHO_CELULA;
      const brilho = contexto.createRadialGradient(x + 100, y + 100, 10, x + 100, y + 100, 150);
      brilho.addColorStop(0, '#2a1f3d');
      brilho.addColorStop(1, '#0c0913');
      contexto.fillStyle = brilho;
      contexto.fillRect(x, y, TAMANHO_CELULA, TAMANHO_CELULA);
      contexto.font = `900 ${numero >= 10 ? 62 : 74}px Cinzel, Georgia, serif`;
      contexto.textAlign = 'center';
      contexto.textBaseline = 'middle';
      contexto.lineWidth = 6;
      contexto.strokeStyle = 'rgba(0,0,0,0.65)';
      contexto.strokeText(String(numero), x + 100, y + 100);
      contexto.fillStyle = '#f2d27a';
      contexto.fillText(String(numero), x + 100, y + 100);
      if (numero === 6 || numero === 9) contexto.fillRect(x + 84, y + 142, 32, 6);
    });
  }
  const textura = new tres.CanvasTexture(canvas);
  textura.colorSpace = tres.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
};

interface DadoPronto {
  malha: ThreeTipos.Mesh;
  faces: FaceDado[];
  numeros: number[];
}

const construirDado = (
  tres: Tres,
  ConvexGeometry: new (pontos: ThreeTipos.Vector3[]) => ThreeTipos.BufferGeometry,
  faces: number,
): DadoPronto => {
  const casco = new ConvexGeometry(pontosDoDado(tres, faces));
  // O dado tem raio 1: normaliza qualquer geometria para caber igual.
  const maior = Math.max(...pontosDoDado(tres, faces).map((p) => p.length()));
  casco.scale(1 / maior, 1 / maior, 1 / maior);

  const grupos = agruparFaces(tres, casco);
  numerarFaces(grupos);
  const linhas = Math.ceil(grupos.length / COLUNAS_ATLAS);

  const posicoes: number[] = [];
  const uvs: number[] = [];
  const normais: number[] = [];
  grupos.forEach((face, indice) => {
    const referencia = Math.abs(face.normal.y) < 0.9 ? new tres.Vector3(0, 1, 0) : new tres.Vector3(1, 0, 0);
    const u = new tres.Vector3().crossVectors(referencia, face.normal).normalize();
    const v = new tres.Vector3().crossVectors(face.normal, u).normalize();
    const vertices = face.triangulos.flat();
    const raio = Math.max(...vertices.map((p) => p.distanceTo(face.centro)));
    const escala = raio * 2.5;
    const celulaX = indice % COLUNAS_ATLAS;
    const celulaY = Math.floor(indice / COLUNAS_ATLAS);
    face.triangulos.forEach((triangulo) => {
      triangulo.forEach((p) => {
        const d = new tres.Vector3().subVectors(p, face.centro);
        posicoes.push(p.x, p.y, p.z);
        normais.push(face.normal.x, face.normal.y, face.normal.z);
        uvs.push(
          (celulaX + 0.5 + d.dot(u) / escala) / COLUNAS_ATLAS,
          1 - (celulaY + 0.5 - d.dot(v) / escala) / linhas,
        );
      });
    });
  });

  const geometria = new tres.BufferGeometry();
  geometria.setAttribute('position', new tres.Float32BufferAttribute(posicoes, 3));
  geometria.setAttribute('normal', new tres.Float32BufferAttribute(normais, 3));
  geometria.setAttribute('uv', new tres.Float32BufferAttribute(uvs, 2));

  const numeros = grupos.map((face) => face.numero);
  const material = new tres.MeshStandardMaterial({
    map: criarAtlas(tres, grupos.length, numeros),
    metalness: 0.5,
    roughness: 0.34,
    transparent: true,
    side: tres.DoubleSide,
  });
  const malha = new tres.Mesh(geometria, material);
  malha.add(new tres.LineSegments(
    new tres.EdgesGeometry(geometria, 12),
    new tres.LineBasicMaterial({ color: 0xc7a44c, transparent: true }),
  ));
  return { malha, faces: grupos, numeros };
};

const suavizar = (t: number) => t * t * (3 - 2 * t);
const desacelerar = (t: number) => 1 - (1 - t) ** 3;
const quicar = (t: number) => {
  if (t >= 1) return 0;
  return Math.abs(Math.cos(t * Math.PI * 2.5)) * (1 - t) ** 1.4 * 2.6;
};

interface Animacao {
  pronto: DadoPronto;
  eixo: ThreeTipos.Vector3;
  velocidade: number;
  inicio: ThreeTipos.Quaternion;
  alvo: ThreeTipos.Quaternion;
  base: ThreeTipos.Vector3;
  atraso: number;
  ignorado: boolean;
}

export async function iniciarCenaDados(
  canvas: HTMLCanvasElement,
  dados: DadoCena[],
  opcoes: OpcoesCena,
): Promise<ControleCena | null> {
  const tres = await import('three');
  const { ConvexGeometry } = await import('three/examples/jsm/geometries/ConvexGeometry.js');

  let renderizador: ThreeTipos.WebGLRenderer;
  try {
    renderizador = new tres.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderizador.setClearColor(0x000000, 0);

  const cena = new tres.Scene();
  const camera = new tres.PerspectiveCamera(36, 1, 0.1, 60);
  cena.add(new tres.AmbientLight(0xffffff, 0.75));
  const luzPrincipal = new tres.DirectionalLight(0xfff0d0, 2.4);
  luzPrincipal.position.set(3, 5, 6);
  cena.add(luzPrincipal);
  const luzContorno = new tres.DirectionalLight(0x7aa2ff, 1.3);
  luzContorno.position.set(-4, -2, 3);
  cena.add(luzContorno);

  const quantidade = dados.length;
  const porLinha = quantidade > 4 ? Math.ceil(quantidade / 2) : quantidade;
  const linhas = Math.ceil(quantidade / porLinha);
  const escala = quantidade === 1 ? 1.1 : quantidade <= 3 ? 0.95 : 0.8;
  const espacamento = 2.4 * escala;

  const animacoes: Animacao[] = dados.map((dado, indice) => {
    const pronto = construirDado(tres, ConvexGeometry, dado.faces);
    pronto.malha.scale.setScalar(escala);
    const face = pronto.faces.find((f) => f.numero === dado.valor) ?? pronto.faces[0];
    // A face sorteada vai para a câmera, com uma leve inclinação para mostrar volume.
    const alvo = new tres.Quaternion().setFromUnitVectors(face.normal.clone().normalize(), new tres.Vector3(0, 0.16, 1).normalize());
    alvo.premultiply(new tres.Quaternion().setFromAxisAngle(new tres.Vector3(0, 0, 1), (Math.random() - 0.5) * 0.9));

    const coluna = indice % porLinha;
    const linha = Math.floor(indice / porLinha);
    const naLinha = Math.min(porLinha, quantidade - linha * porLinha);
    const base = new tres.Vector3(
      (coluna - (naLinha - 1) / 2) * espacamento,
      ((linhas - 1) / 2 - linha) * espacamento,
      0,
    );
    cena.add(pronto.malha);
    return {
      pronto,
      eixo: new tres.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      velocidade: 11 + Math.random() * 5,
      inicio: new tres.Quaternion().setFromEuler(new tres.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)),
      alvo,
      base,
      atraso: indice * 0.09,
      ignorado: dado.ignorado,
    };
  });

  const largura = (porLinha - 1) * espacamento + 2.6 * escala;
  const altura = (linhas - 1) * espacamento + 2.6 * escala;

  const ajustarTamanho = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderizador.setSize(w, h, false);
    camera.aspect = w / h;
    const meioFov = Math.tan(tres.MathUtils.degToRad(camera.fov / 2));
    const distanciaLargura = (largura * 1.35) / (2 * meioFov * camera.aspect);
    const distanciaAltura = (altura * 1.5) / (2 * meioFov);
    camera.position.set(0, 0, Math.max(6, distanciaLargura, distanciaAltura));
    camera.updateProjectionMatrix();
  };
  ajustarTamanho();
  window.addEventListener('resize', ajustarTamanho);

  // Faíscas do 20 natural.
  let faiscas: ThreeTipos.Points | null = null;
  let velocidadesFaiscas: Float32Array | null = null;
  const criarFaiscas = () => {
    const total = 70;
    const posicoes = new Float32Array(total * 3);
    velocidadesFaiscas = new Float32Array(total * 3);
    for (let i = 0; i < total; i += 1) {
      const angulo = Math.random() * Math.PI * 2;
      const forca = 1.5 + Math.random() * 3.5;
      velocidadesFaiscas[i * 3] = Math.cos(angulo) * forca;
      velocidadesFaiscas[i * 3 + 1] = Math.sin(angulo) * forca;
      velocidadesFaiscas[i * 3 + 2] = (Math.random() - 0.2) * 2;
    }
    const geometria = new tres.BufferGeometry();
    geometria.setAttribute('position', new tres.BufferAttribute(posicoes, 3));
    // Bolinha macia (sem isso o ponto sai quadrado).
    const desenho = document.createElement('canvas');
    desenho.width = 64;
    desenho.height = 64;
    const pincel = desenho.getContext('2d');
    if (pincel) {
      const gradiente = pincel.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradiente.addColorStop(0, 'rgba(255,255,255,1)');
      gradiente.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      gradiente.addColorStop(1, 'rgba(255,255,255,0)');
      pincel.fillStyle = gradiente;
      pincel.fillRect(0, 0, 64, 64);
    }
    faiscas = new tres.Points(geometria, new tres.PointsMaterial({
      color: 0xffd76a, size: 0.32, map: new tres.CanvasTexture(desenho), transparent: true, opacity: 1, depthWrite: false, blending: tres.AdditiveBlending,
    }));
    cena.add(faiscas);
  };

  const relogio = new tres.Clock();
  let pousou = false;
  let pousouEm = 0;
  let parado = false;
  let quadro = 0;

  const desenhar = () => {
    if (parado) return;
    const t = relogio.getElapsedTime();

    animacoes.forEach((anim) => {
      const local = Math.max(0, t - anim.atraso);
      const u = Math.min(1, local / DURACAO_ROLAGEM_S);
      const giro = new tres.Quaternion().setFromAxisAngle(anim.eixo, anim.velocidade * DURACAO_ROLAGEM_S * desacelerar(u));
      const rotacao = anim.inicio.clone().multiply(giro);
      anim.pronto.malha.quaternion.copy(rotacao.slerp(anim.alvo, suavizar(Math.max(0, (u - 0.5) / 0.5))));
      anim.pronto.malha.position.set(
        anim.base.x + (1 - desacelerar(u)) * 0.8 * Math.sin(local * 7),
        anim.base.y + quicar(u),
        anim.base.z + (1 - u) * 2.5,
      );
      const material = anim.pronto.malha.material as ThreeTipos.MeshStandardMaterial;
      const linha = anim.pronto.malha.children[0] as ThreeTipos.LineSegments;
      const linhaMaterial = linha.material as ThreeTipos.LineBasicMaterial;
      if (u >= 1 && anim.ignorado) {
        const apagado = Math.max(0.28, 1 - (local - DURACAO_ROLAGEM_S) * 2.2);
        material.opacity = apagado;
        linhaMaterial.opacity = apagado;
      }
      if (u >= 1 && opcoes.destaque === 'critico' && !anim.ignorado) {
        material.emissive.setHex(0x6b4a00);
        material.emissiveIntensity = 0.6 + Math.sin(local * 6) * 0.25;
      }
      if (u >= 1 && opcoes.destaque === 'falha' && !anim.ignorado) {
        material.emissive.setHex(0x660000);
        material.emissiveIntensity = 0.7;
      }
    });

    const ultimo = DURACAO_ROLAGEM_S + (animacoes.length - 1) * 0.09;
    if (!pousou && t >= ultimo) {
      pousou = true;
      pousouEm = t;
      if (opcoes.destaque === 'critico') criarFaiscas();
      opcoes.aoPousar();
    }

    if (pousou && opcoes.destaque === 'falha') {
      const tremor = Math.max(0, 0.45 - (t - pousouEm)) * 0.35;
      camera.position.x = (Math.random() - 0.5) * tremor;
      camera.position.y = (Math.random() - 0.5) * tremor;
    }
    if (faiscas && velocidadesFaiscas) {
      const idade = t - pousouEm;
      const posicao = faiscas.geometry.getAttribute('position') as ThreeTipos.BufferAttribute;
      for (let i = 0; i < posicao.count; i += 1) {
        posicao.setXYZ(i, velocidadesFaiscas[i * 3] * idade, velocidadesFaiscas[i * 3 + 1] * idade - idade * idade * 0.6, velocidadesFaiscas[i * 3 + 2] * idade);
      }
      posicao.needsUpdate = true;
      (faiscas.material as ThreeTipos.PointsMaterial).opacity = Math.max(0, 1 - idade / 1.3);
    }

    renderizador.render(cena, camera);
    quadro = window.requestAnimationFrame(desenhar);
  };
  quadro = window.requestAnimationFrame(desenhar);

  return {
    parar: () => {
      if (parado) return;
      parado = true;
      window.cancelAnimationFrame(quadro);
      window.removeEventListener('resize', ajustarTamanho);
      animacoes.forEach((anim) => {
        anim.pronto.malha.geometry.dispose();
        const material = anim.pronto.malha.material as ThreeTipos.MeshStandardMaterial;
        material.map?.dispose();
        material.dispose();
        const linha = anim.pronto.malha.children[0] as ThreeTipos.LineSegments;
        linha.geometry.dispose();
        (linha.material as ThreeTipos.Material).dispose();
      });
      faiscas?.geometry.dispose();
      const materialFaiscas = faiscas?.material as ThreeTipos.PointsMaterial | undefined;
      materialFaiscas?.map?.dispose();
      materialFaiscas?.dispose();
      renderizador.dispose();
    },
  };
}
