export function iniciarAtmosfera() {
  const canvas = document.getElementById('mundo-tree-canvas');
  if (!canvas) return;

  const contexto = canvas.getContext('2d');
  if (!contexto) return;

  const paleta = [
    '201,162,39',
    '124,69,204',
    '210,195,168',
  ];

  let largura;
  let altura;
  let segmentos = [];
  let animacaoId = null;
  let inicioPulso = null;

  function crescer(x, y, angulo, comprimento, profundidade, profundidadeMaxima, corIndice) {
    if (profundidade > profundidadeMaxima || comprimento < 5) return;

    const oscilacao = (Math.random() - 0.5) * 0.30;
    const fimX = x + Math.cos(angulo + oscilacao) * comprimento;
    const fimY = y + Math.sin(angulo + oscilacao) * comprimento;
    const alpha = Math.max(0.007, 0.085 - profundidade * 0.014);
    const espessura = Math.max(0.2, 0.75 - profundidade * 0.13);

    segmentos.push({
      x1: x,
      y1: y,
      x2: fimX,
      y2: fimY,
      alpha,
      espessura,
      profundidade,
      corIndice,
    });

    const abertura = 0.28 + Math.random() * 0.22;
    const proximoComprimento = comprimento * 0.68;
    crescer(fimX, fimY, angulo - abertura, proximoComprimento, profundidade + 1, profundidadeMaxima, corIndice);
    crescer(fimX, fimY, angulo + abertura, proximoComprimento, profundidade + 1, profundidadeMaxima, corIndice);
  }

  function pulsar(agora) {
    if (!inicioPulso) inicioPulso = agora;

    const pulso = 0.78 + 0.22 * Math.sin(((agora - inicioPulso) / 8000) * Math.PI * 2);
    contexto.clearRect(0, 0, largura, altura);

    segmentos.forEach(segmento => {
      contexto.beginPath();
      contexto.moveTo(segmento.x1, segmento.y1);
      contexto.lineTo(segmento.x2, segmento.y2);
      contexto.strokeStyle = `rgba(${paleta[segmento.corIndice % paleta.length]},${(segmento.alpha * pulso).toFixed(3)})`;
      contexto.lineWidth = segmento.espessura;
      contexto.lineCap = 'round';
      contexto.stroke();
    });

    animacaoId = requestAnimationFrame(pulsar);
  }

  function reconstruir() {
    segmentos = [];
    largura = canvas.width = window.innerWidth;
    altura = canvas.height = window.innerHeight;
    crescer(largura * 0.02, altura, -Math.PI * 0.42, altura * 0.44, 0, 4, 0);
    crescer(largura * 0.98, altura, -Math.PI * 0.58, altura * 0.44, 0, 4, 1);
    segmentos.sort((a, b) => a.profundidade - b.profundidade);

    if (animacaoId) cancelAnimationFrame(animacaoId);
    inicioPulso = null;
    animacaoId = requestAnimationFrame(pulsar);
  }

  reconstruir();
  window.addEventListener('resize', reconstruir);
}
