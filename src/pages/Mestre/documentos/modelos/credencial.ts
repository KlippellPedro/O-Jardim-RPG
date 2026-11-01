import { TEMAS_ASTRA, circuito, codigoQr, marcaAstraTech, rotuloDeTela } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  TINTA, TINTA_APAGADA, assinatura, chapado, escrever, escreverNoQuadro, espacamento, fonte, guilhoche, imagemCobrindo,
  linhaQueCabe, retanguloArredondado, seloRedondo, sementeDe, vulto, type Pincel,
} from '../pincel';

const LARGURA = 1050;
const ALTURA = 662;

const CORES: Record<string, string> = {
  azul: '#24407a',
  verde: '#2f5a3a',
  vinho: '#6b1f2a',
  grafite: '#33363d',
  areia: '#8a6a32',
};

export const credencial: IModeloDeDocumento = {
  id: 'credencial',
  nome: 'Credencial',
  categoria: 'Cartões',
  icone: 'credencial',
  descricao: 'Documento com foto: passe de viagem, licença, salvo-conduto ou identificação. Imprime oito por folha.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 85.6, altura: 54 },
  copiasNaFolha: true,
  campoDoTitulo: 'nome',
  campos: [
    {
      id: 'suporte', rotulo: 'Suporte', tipo: 'escolha', padrao: 'papel',
      opcoes: [{ valor: 'papel', rotulo: 'Cartão impresso' }, { valor: 'astratech', rotulo: 'Crachá AstraTech' }],
      dica: 'O crachá é a versão da AstraTech: vidro escuro, chip e código de leitura.',
    },
    { id: 'emissor', rotulo: 'Quem emite', tipo: 'texto', padrao: 'Caravana do Limiar', maximo: 40 },
    { id: 'tipo', rotulo: 'Tipo de documento', tipo: 'texto', padrao: 'Passe de viagem', maximo: 40 },
    { id: 'foto', rotulo: 'Foto', tipo: 'imagem', padrao: '' },
    { id: 'nome', rotulo: 'Nome', tipo: 'texto', padrao: 'Benedito Sarrafo', maximo: 40 },
    { id: 'funcao', rotulo: 'Função ou categoria', tipo: 'texto', padrao: 'Passageiro com carga', maximo: 40 },
    { id: 'detalhe', rotulo: 'Rota, área ou permissão', tipo: 'texto', padrao: 'Da Ponte Velha ao Posto da Encosta', maximo: 60 },
    { id: 'numero', rotulo: 'Número', tipo: 'texto', padrao: 'CL-0417-22', maximo: 20 },
    { id: 'validade', rotulo: 'Validade', tipo: 'texto', padrao: 'Até o fim do inverno', maximo: 30 },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', padrao: 'Carga declarada: dois baús lacrados.', maximo: 80 },
    {
      id: 'cor', rotulo: 'Cor', tipo: 'escolha', padrao: 'azul',
      opcoes: [
        { valor: 'azul', rotulo: 'Azul' },
        { valor: 'verde', rotulo: 'Verde' },
        { valor: 'vinho', rotulo: 'Vinho' },
        { valor: 'grafite', rotulo: 'Grafite' },
        { valor: 'areia', rotulo: 'Areia' },
      ],
    },
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'astratech') {
      crachaAstraTech(pincel, v);
      return;
    }
    const { ctx, imagem } = pincel;
    const cor = CORES[v.cor] ?? CORES.azul;
    const semente = sementeDe(v.numero + v.nome);
    ctx.save();
    retanguloArredondado(ctx, 0, 0, LARGURA, ALTURA, 38);
    ctx.clip();
    chapado(ctx, LARGURA, ALTURA, '#f2eee3', 0.5);
    ctx.save();
    ctx.globalAlpha = 0.14;
    guilhoche(ctx, 0, 130, LARGURA, ALTURA - 130, cor);
    ctx.restore();

    // Faixa de cima
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, LARGURA, 128);
    ctx.save();
    ctx.globalAlpha = 0.18;
    guilhoche(ctx, 0, 0, LARGURA, 128, '#ffffff');
    ctx.restore();
    linhaQueCabe(ctx, v.emissor, 44, 70, {
      largura: LARGURA - 220, maximo: 48, minimo: 26, alinhamento: 'esquerda', cor: '#fbf7ee',
      montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    fonte(ctx, 'sans', 22, 600);
    espacamento(ctx, 5);
    escrever(ctx, v.tipo.toUpperCase(), 46, 108, 'esquerda', 'rgba(251, 247, 238, 0.85)');
    espacamento(ctx, 0);
    seloRedondo(ctx, LARGURA - 92, 64, 50, { texto: v.emissor || 'selo', cor: '#fbf7ee', angulo: 0, semente, tintaClara: true });

    // Foto
    const fx = 44;
    const fy = 160;
    const fw = 262;
    const fh = 330;
    ctx.fillStyle = '#d9d3c4';
    ctx.fillRect(fx, fy, fw, fh);
    const foto = imagem('foto');
    if (foto) imagemCobrindo(ctx, foto, fx, fy, fw, fh, { foco: 'topo' });
    else vulto(ctx, fx, fy, fw, fh, 'rgba(60, 60, 70, 0.3)');
    ctx.strokeStyle = cor;
    ctx.lineWidth = 4;
    ctx.strokeRect(fx, fy, fw, fh);
    seloRedondo(ctx, fx + fw - 10, fy + fh - 42, 52, { texto: v.emissor || 'selo', cor, angulo: -0.3, semente: semente + 1 });

    // Campos
    const cx = 344;
    const larguraDoCampo = LARGURA - cx - 44;
    const campo = (rotulo: string, valor: string, x: number, y: number, largura: number, tamanho = 38) => {
      fonte(ctx, 'sans', 18, 600);
      espacamento(ctx, 3);
      escrever(ctx, rotulo, x, y, 'esquerda', TINTA_APAGADA);
      espacamento(ctx, 0);
      linhaQueCabe(ctx, valor, x, y + 42, {
        largura, maximo: tamanho, minimo: 20, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'antiga', t),
      });
    };
    campo('NOME', v.nome, cx, 186, larguraDoCampo, 44);
    campo('FUNÇÃO', v.funcao, cx, 270, larguraDoCampo);
    campo('ROTA OU PERMISSÃO', v.detalhe, cx, 354, larguraDoCampo, 32);
    campo('NÚMERO', v.numero, cx, 438, larguraDoCampo / 2 - 16, 32);
    campo('VALIDADE', v.validade, cx + larguraDoCampo / 2, 438, larguraDoCampo / 2, 32);

    escreverNoQuadro(ctx, v.observacao, {
      x: 44, topo: 516, largura: 540, altura: 96, maximo: 26, minimo: 18, cor: TINTA,
      montar: (t) => fonte(ctx, 'antiga', t, 400, true), entrelinha: 1.25,
    });
    assinatura(ctx, 640, 590, LARGURA - 640 - 44, { legenda: 'Assinatura do portador', nome: v.nome, cor: TINTA });
    ctx.restore();
  },
};

const NEON: Record<string, string> = { azul: '#38b6ff', verde: '#33d69f', vinho: '#ff4d7a', grafite: '#b8c6dc', areia: '#ffb020' };

/** O crachá da AstraTech: vidro escuro, trilhas de circuito, chip e código de leitura. */
function crachaAstraTech(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx, imagem } = pincel;
  const tema = TEMAS_ASTRA.escuro;
  const neon = NEON[v.cor] ?? NEON.azul;
  const semente = sementeDe(v.numero + v.nome);
  ctx.save();
  retanguloArredondado(ctx, 0, 0, LARGURA, ALTURA, 38);
  ctx.clip();
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, '#0a1222');
  fundo.addColorStop(1, '#14223a');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.save();
  ctx.globalAlpha = 0.16;
  circuito(ctx, { x: 0, y: 0, largura: LARGURA, altura: ALTURA }, neon, semente, 26);
  ctx.restore();
  // Faixa holográfica no pé
  const holo = ctx.createLinearGradient(0, 0, LARGURA, 0);
  ['#38b6ff', '#a77bff', '#ff4d7a', '#ffb020', '#33d69f', '#38b6ff'].forEach((cor, indice, lista) => holo.addColorStop(indice / (lista.length - 1), cor));
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = holo;
  ctx.fillRect(0, ALTURA - 18, LARGURA, 18);
  ctx.globalAlpha = 1;

  linhaQueCabe(ctx, v.emissor, 44, 74, {
    largura: LARGURA - 240, maximo: 40, minimo: 22, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  fonte(ctx, 'sans', 22, 600);
  espacamento(ctx, 5);
  escrever(ctx, v.tipo.toUpperCase(), 46, 112, 'esquerda', neon);
  espacamento(ctx, 0);

  // Chip
  const chip = { x: LARGURA - 44 - 96, y: 36, largura: 96, altura: 72 };
  retanguloArredondado(ctx, chip.x, chip.y, chip.largura, chip.altura, 12);
  const ouro = ctx.createLinearGradient(chip.x, chip.y, chip.x + chip.largura, chip.y + chip.altura);
  ouro.addColorStop(0, '#f3d27a');
  ouro.addColorStop(1, '#a8812e');
  ctx.fillStyle = ouro;
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 55, 10, 0.6)';
  ctx.lineWidth = 2;
  for (const y of [chip.y + 24, chip.y + 48]) {
    ctx.beginPath(); ctx.moveTo(chip.x, y); ctx.lineTo(chip.x + chip.largura, y); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(chip.x + 48, chip.y); ctx.lineTo(chip.x + 48, chip.y + chip.altura); ctx.stroke();

  // Foto com moldura neon
  const fx = 44;
  const fy = 160;
  const fw = 262;
  const fh = 330;
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = 22;
  retanguloArredondado(ctx, fx, fy, fw, fh, 18);
  ctx.fillStyle = '#1b2a44';
  ctx.fill();
  ctx.restore();
  ctx.save();
  retanguloArredondado(ctx, fx, fy, fw, fh, 18);
  ctx.clip();
  const foto = imagem('foto');
  if (foto) imagemCobrindo(ctx, foto, fx, fy, fw, fh, { foco: 'topo' });
  else vulto(ctx, fx, fy, fw, fh, 'rgba(140, 170, 220, 0.25)');
  ctx.restore();
  retanguloArredondado(ctx, fx, fy, fw, fh, 18);
  ctx.strokeStyle = neon;
  ctx.lineWidth = 3;
  ctx.stroke();

  const cx = 344;
  const larguraDoCampo = LARGURA - cx - 44;
  const campo = (rotulo: string, valor: string, x: number, y: number, largura: number, tamanho = 36, digital = false) => {
    rotuloDeTela(ctx, rotulo, x, y, tema);
    linhaQueCabe(ctx, valor, x, y + 40, {
      largura, maximo: tamanho, minimo: 18, alinhamento: 'esquerda', cor: '#ffffff',
      montar: (t) => fonte(ctx, digital ? 'digital' : 'sans', t, digital ? 400 : 600),
    });
  };
  campo('Nome', v.nome, cx, 186, larguraDoCampo, 42);
  campo('Função', v.funcao, cx, 270, larguraDoCampo, 32);
  campo('Rota ou permissão', v.detalhe, cx, 354, larguraDoCampo, 28);
  campo('Número', v.numero, cx, 438, larguraDoCampo / 2 - 16, 32, true);
  campo('Validade', v.validade, cx + larguraDoCampo / 2, 438, larguraDoCampo / 2, 28);

  escreverNoQuadro(ctx, v.observacao, {
    x: 44, topo: 516, largura: 600, altura: 100, maximo: 24, minimo: 16, cor: tema.fraco, entrelinha: 1.3,
    montar: (t) => fonte(ctx, 'sans', t, 400, true),
  });
  codigoQr(ctx, LARGURA - 44 - 112, 512, 112, semente, '#0a1222', '#ffffff');
  ctx.save();
  ctx.globalAlpha = 0.8;
  marcaAstraTech(ctx, 690, 600, 24, tema.fraco);
  ctx.restore();
  ctx.restore();
}
