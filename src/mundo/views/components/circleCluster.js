import { limparCenas, registrarCena } from './cenaLifecycle.js';

function desenharGalhoMini(canvas, rgb, intensidade) {
  const contexto = canvas.getContext('2d');
  if (!contexto) return;

  const largura = canvas.width;
  const altura = canvas.height;
  contexto.clearRect(0, 0, largura, altura);

  function desenharRamo(x, y, angulo, comprimento, profundidade, profundidadeMaxima) {
    if (profundidade > profundidadeMaxima || comprimento < 3) return;

    const oscilacao = (Math.random() - 0.5) * 0.5;
    const fimX = x + Math.cos(angulo + oscilacao) * comprimento;
    const fimY = y + Math.sin(angulo + oscilacao) * comprimento;
    const alpha = Math.max(0.12, intensidade - profundidade * 0.16);
    const espessura = Math.max(0.5, 2.4 - profundidade * 0.45);

    contexto.beginPath();
    contexto.moveTo(x, y);
    contexto.lineTo(fimX, fimY);
    contexto.strokeStyle = `rgba(${rgb},${alpha.toFixed(2)})`;
    contexto.lineWidth = espessura;
    contexto.lineCap = 'round';
    contexto.stroke();

    const abertura = 0.35 + Math.random() * 0.3;
    desenharRamo(fimX, fimY, angulo - abertura, comprimento * 0.68, profundidade + 1, profundidadeMaxima);
    desenharRamo(fimX, fimY, angulo + abertura, comprimento * 0.68, profundidade + 1, profundidadeMaxima);
  }

  desenharRamo(largura / 2, altura * 0.9, -Math.PI / 2, altura * 0.32, 0, 3);
}

function abrirPortal(circulo, rgb, aoCobrir) {
  const retangulo = circulo.getBoundingClientRect();
  const centroX = retangulo.left + retangulo.width / 2;
  const centroY = retangulo.top + retangulo.height / 2;
  const diametroInicial = retangulo.width;
  const diagonalTela = Math.hypot(window.innerWidth, window.innerHeight);
  const escala = (diagonalTela * 1.15) / diametroInicial;

  const portal = document.createElement('div');
  portal.className = 'arvore-portal';
  portal.style.left = `${centroX}px`;
  portal.style.top = `${centroY}px`;
  portal.style.width = `${diametroInicial}px`;
  portal.style.height = `${diametroInicial}px`;
  portal.style.background = `radial-gradient(circle, rgba(${rgb},1) 0%, rgba(${rgb},0.92) 65%, rgba(${rgb},0.75) 100%)`;
  document.body.appendChild(portal);

  void portal.offsetWidth;
  portal.style.setProperty('--portal-escala', escala.toFixed(2));
  portal.classList.add('arvore-portal--crescendo');

  setTimeout(() => {
    aoCobrir();
    setTimeout(() => {
      portal.classList.add('arvore-portal--revelando');
      setTimeout(() => portal.remove(), 400);
    }, 120);
  }, 600);
}

export function montarClusterCirculos(host, itens, callbacks, opcoes = {}) {
  const {
    resolverDestino,
    aoEntrar,
    aoBloqueada = () => {},
  } = callbacks;
  const { stageClass = 'arvore-cluster-stage' } = opcoes;

  const stage = document.createElement('div');
  stage.className = stageClass;
  host.appendChild(stage);

  const circulos = itens.map(item => {
    const bloqueada = Boolean(item.bloqueada);
    const elemento = document.createElement('button');
    elemento.type = 'button';
    elemento.className = 'arvore-circulo';

    if (bloqueada) elemento.classList.add('arvore-circulo--bloqueada');
    else elemento.style.setProperty('--accent', `rgb(${item.rgb})`);

    elemento.setAttribute('aria-label', bloqueada ? 'Ainda não descoberta' : item.titulo);

    const canvas = document.createElement('canvas');
    canvas.className = 'arvore-circulo-canvas';
    canvas.width = 108;
    canvas.height = 108;
    elemento.appendChild(canvas);

    const label = document.createElement('span');
    label.className = 'arvore-circulo-label';
    label.textContent = bloqueada ? '??' : item.titulo;
    elemento.appendChild(label);

    stage.appendChild(elemento);
    desenharGalhoMini(canvas, bloqueada ? '90,94,122' : item.rgb, bloqueada ? 0.35 : 0.9);

    const circulo = {
      elemento,
      item,
      x: 12 + Math.random() * 76,
      y: 18 + Math.random() * 64,
      velocidadeX: (Math.random() - 0.5) * 0.06,
      velocidadeY: (Math.random() - 0.5) * 0.06,
      pausado: false,
      saindo: false,
    };

    elemento.style.left = `${circulo.x}%`;
    elemento.style.top = `${circulo.y}%`;
    return circulo;
  });

  let navegacaoEmAndamento = false;

  circulos.forEach(circulo => {
    circulo.elemento.addEventListener('mouseenter', () => {
      circulo.pausado = true;
      circulo.elemento.style.zIndex = '5';
    });

    circulo.elemento.addEventListener('mouseleave', () => {
      circulo.pausado = false;
      circulo.elemento.style.zIndex = '';
    });

    circulo.elemento.addEventListener('click', () => {
      if (navegacaoEmAndamento) return;

      if (circulo.item.bloqueada) {
        circulo.elemento.classList.remove('arvore-circulo--negada');
        void circulo.elemento.offsetWidth;
        circulo.elemento.classList.add('arvore-circulo--negada');
        aoBloqueada(circulo.item);
        return;
      }

      navegacaoEmAndamento = true;
      circulo.saindo = true;
      circulos.forEach(outro => outro.elemento.classList.add('arvore-circulo--esmaecendo'));

      abrirPortal(circulo.elemento, circulo.item.rgb, () => {
        limparCenas();
        aoEntrar(resolverDestino(circulo.item));
      });
    });
  });

  const separacaoMinima = 16;
  let animacaoId = null;

  function animar() {
    circulos.forEach(circulo => {
      if (circulo.pausado || circulo.saindo) return;

      circulo.x += circulo.velocidadeX;
      circulo.y += circulo.velocidadeY;

      if (circulo.x < 6 || circulo.x > 94) {
        circulo.velocidadeX *= -1;
        circulo.x = Math.min(94, Math.max(6, circulo.x));
      }

      if (circulo.y < 6 || circulo.y > 94) {
        circulo.velocidadeY *= -1;
        circulo.y = Math.min(94, Math.max(6, circulo.y));
      }
    });

    for (let indiceA = 0; indiceA < circulos.length; indiceA += 1) {
      for (let indiceB = indiceA + 1; indiceB < circulos.length; indiceB += 1) {
        const circuloA = circulos[indiceA];
        const circuloB = circulos[indiceB];
        const distanciaX = circuloB.x - circuloA.x;
        const distanciaY = circuloB.y - circuloA.y;
        const distancia = Math.hypot(distanciaX, distanciaY) || 0.001;

        if (distancia >= separacaoMinima) continue;

        const deslocamento = (separacaoMinima - distancia) / 2;
        const normalX = distanciaX / distancia;
        const normalY = distanciaY / distancia;

        if (!circuloA.pausado && !circuloA.saindo) {
          circuloA.x -= normalX * deslocamento;
          circuloA.y -= normalY * deslocamento;
        }

        if (!circuloB.pausado && !circuloB.saindo) {
          circuloB.x += normalX * deslocamento;
          circuloB.y += normalY * deslocamento;
        }
      }
    }

    circulos.forEach(circulo => {
      circulo.x = Math.min(94, Math.max(6, circulo.x));
      circulo.y = Math.min(94, Math.max(6, circulo.y));
      circulo.elemento.style.left = `${circulo.x}%`;
      circulo.elemento.style.top = `${circulo.y}%`;
    });

    animacaoId = requestAnimationFrame(animar);
  }

  animacaoId = requestAnimationFrame(animar);

  return registrarCena(() => {
    if (animacaoId) cancelAnimationFrame(animacaoId);
  });
}
