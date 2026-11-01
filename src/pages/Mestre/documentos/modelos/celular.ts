/**
 * Telas de celular da AstraTech: post de rede social, conversa e tela de bloqueio. As três dividem o
 * tamanho do aparelho e o jeito de ler as listas que o Mestre escreve, uma coisa por linha.
 */

import {
  CAMPO_DE_TEMA, avatar, emCelular, icone, painel, temaAstra, verificado, type Retangulo, type TemaAstra,
} from '../aparelho';
import { quebrarEmLinhas, type IModeloDeDocumento } from '../modelo';
import {
  desenharLinhas, escrever, escreverNoQuadro, fonte, imagemCobrindo, linhaQueCabe, retanguloArredondado, traco,
} from '../pincel';

const LARGURA = 880;
const ALTURA = 1800;
const IMPRESSAO = { largura: 70, altura: 143 };

// ---------------------------------------------------------------- listas escritas pelo Mestre

/** "Nome: texto" vira autor e texto; linha sem dois-pontos fica sem autor. */
export function respostasDoPost(texto: string): Array<{ autor: string; texto: string }> {
  return texto.split('\n').map((linha) => linha.trim()).filter(Boolean).map((linha) => {
    const separador = linha.indexOf(':');
    if (separador > 0 && separador < 40) return { autor: linha.slice(0, separador).trim(), texto: linha.slice(separador + 1).trim() };
    return { autor: '', texto: linha };
  });
}

/** Cada linha é uma mensagem; começando com ">" ela foi enviada pelo dono do celular. */
export function mensagensDaConversa(texto: string): Array<{ enviada: boolean; texto: string }> {
  return texto.split('\n').map((linha) => linha.trim()).filter(Boolean).map((linha) => (
    linha.startsWith('>') ? { enviada: true, texto: linha.slice(1).trim() } : { enviada: false, texto: linha }
  )).filter((mensagem) => mensagem.texto);
}

/** "App | Título | Texto" vira uma notificação. */
export function notificacoesDaTela(texto: string): Array<{ app: string; titulo: string; texto: string }> {
  return texto.split('\n').map((linha) => linha.trim()).filter(Boolean).map((linha) => {
    const partes = linha.split('|').map((parte) => parte.trim());
    if (partes.length >= 3) return { app: partes[0], titulo: partes[1], texto: partes.slice(2).join(' | ') };
    if (partes.length === 2) return { app: partes[0], titulo: '', texto: partes[1] };
    return { app: 'Aviso', titulo: '', texto: partes[0] };
  });
}

const CORES_DE_APP = ['#38b6ff', '#33d69f', '#ff4d5e', '#ffb020', '#a77bff', '#ff7ac6'];
const corDoApp = (nome: string) => CORES_DE_APP[[...nome].reduce((soma, letra) => soma + letra.charCodeAt(0), 0) % CORES_DE_APP.length];

function barraDoApp(ctx: CanvasRenderingContext2D, area: Retangulo, tema: TemaAstra, titulo: string): number {
  const altura = 96;
  icone(ctx, 'voltar', area.x + 52, area.y + 46, 36, tema.texto);
  linhaQueCabe(ctx, titulo, area.x + area.largura / 2, area.y + 58, {
    largura: area.largura - 220, maximo: 34, minimo: 20, cor: tema.texto, montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  icone(ctx, 'mais', area.x + area.largura - 52, area.y + 46, 36, tema.texto);
  traco(ctx, area.x, area.y + altura, area.x + area.largura, area.y + altura, tema.linha, 2);
  return area.y + altura;
}

// ---------------------------------------------------------------- post

export const postDeRede: IModeloDeDocumento = {
  id: 'post',
  nome: 'Post de rede social',
  categoria: 'AstraTech',
  icone: 'post',
  descricao: 'Publicação vista no celular da AstraTech, com foto, curtidas e respostas de outras pessoas.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: IMPRESSAO,
  campoDoTitulo: 'autor',
  campos: [
    CAMPO_DE_TEMA,
    { id: 'app', rotulo: 'Nome da rede', tipo: 'texto', padrao: 'AstraLink', maximo: 24 },
    { id: 'autor', rotulo: 'Quem postou', tipo: 'texto', padrao: 'Lia Moura', maximo: 40 },
    { id: 'usuario', rotulo: 'Usuário', tipo: 'texto', padrao: '@liamoura', maximo: 30 },
    { id: 'avatar', rotulo: 'Foto de perfil', tipo: 'imagem', padrao: '' },
    {
      id: 'verificado', rotulo: 'Conta verificada', tipo: 'escolha', padrao: 'nao',
      opcoes: [{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }],
    },
    {
      id: 'texto', rotulo: 'Texto do post', tipo: 'paragrafo', linhas: 4, maximo: 500,
      padrao: 'Alguém mais viu a luz verde em cima da torre do relógio ontem? Durou uns dez minutos e depois sumiu de uma vez. Ninguém da guarda quer falar sobre isso.',
    },
    { id: 'imagem', rotulo: 'Foto do post (opcional)', tipo: 'imagem', padrao: '' },
    { id: 'quando', rotulo: 'Quando', tipo: 'texto', padrao: 'há 2 h', maximo: 20 },
    { id: 'curtidas', rotulo: 'Curtidas', tipo: 'texto', padrao: '1.284', maximo: 12 },
    { id: 'comentarios', rotulo: 'Comentários', tipo: 'texto', padrao: '96', maximo: 12 },
    { id: 'compartilhamentos', rotulo: 'Compartilhamentos', tipo: 'texto', padrao: '31', maximo: 12 },
    {
      id: 'respostas', rotulo: 'Respostas', tipo: 'paragrafo', linhas: 4, maximo: 800,
      dica: 'Uma por linha, no formato Nome: texto.',
      padrao: 'Tomás Reis: eu vi. Meu cachorro não parou de latir.\nBenedito: apaga isso, Lia.\nGuarda da Cidade: nada de anormal foi registrado.',
    },
    { id: 'hora', rotulo: 'Hora no celular', tipo: 'texto', padrao: '07:12', maximo: 8 },
  ],
  desenhar: (pincel, v) => {
    const { ctx, imagem } = pincel;
    const tema = temaAstra(v.tema);
    emCelular(pincel, tema, { hora: v.hora, bateria: '58%' }, (area) => {
      let y = barraDoApp(ctx, area, tema, v.app || 'AstraLink');
      const x = area.x + 40;
      const largura = area.largura - 80;
      y += 30;
      avatar(ctx, x + 40, y + 40, 40, imagem('avatar'), v.autor, corDoApp(v.autor));
      fonte(ctx, 'sans', 30, 600);
      const nome = v.autor || 'Sem nome';
      linhaQueCabe(ctx, nome, x + 100, y + 32, { largura: largura - 200, maximo: 30, minimo: 18, alinhamento: 'esquerda', cor: tema.texto, montar: (t) => fonte(ctx, 'sans', t, 600) });
      if (v.verificado === 'sim') verificado(ctx, x + 100 + Math.min(ctx.measureText(nome).width, largura - 200) + 22, y + 22, 12, tema.acento);
      fonte(ctx, 'sans', 24, 400);
      escrever(ctx, `${v.usuario} · ${v.quando}`, x + 100, y + 70, 'esquerda', tema.fraco);
      y += 104;
      y = escreverNoQuadro(ctx, v.texto, {
        x, topo: y, largura, altura: 330, maximo: 32, minimo: 20, entrelinha: 1.4, cor: tema.texto, corDaTarja: tema.fraco,
        montar: (t) => fonte(ctx, 'sans', t, 400),
      }) + 20;
      const foto = imagem('imagem');
      if (foto) {
        ctx.save();
        retanguloArredondado(ctx, x, y, largura, 500, 24);
        ctx.clip();
        imagemCobrindo(ctx, foto, x, y, largura, 500);
        ctx.restore();
        y += 524;
      }
      // Reações
      const reacoes: Array<[Parameters<typeof icone>[1], string]> = [['coracao', v.curtidas], ['comentario', v.comentarios], ['compartilhar', v.compartilhamentos]];
      reacoes.forEach(([nomeDoIcone, numero], indice) => {
        const rx = x + indice * (largura / 3);
        icone(ctx, nomeDoIcone, rx + 20, y + 26, 36, indice === 0 ? tema.perigo : tema.fraco);
        fonte(ctx, 'sans', 26, 500);
        escrever(ctx, numero, rx + 52, y + 36, 'esquerda', tema.fraco);
      });
      y += 70;
      traco(ctx, area.x, y, area.x + area.largura, y, tema.linha, 2);
      y += 24;

      const limite = area.y + area.altura - 150;
      for (const resposta of respostasDoPost(v.respostas)) {
        if (y > limite - 90) break;
        avatar(ctx, x + 26, y + 30, 26, null, resposta.autor || '?', corDoApp(resposta.autor || '?'));
        fonte(ctx, 'sans', 24, 600);
        if (resposta.autor) escrever(ctx, resposta.autor, x + 70, y + 24, 'esquerda', tema.texto);
        fonte(ctx, 'sans', 25, 400);
        const linhas = quebrarEmLinhas(resposta.texto, largura - 70, (t) => ctx.measureText(t).width).slice(0, 3);
        y = desenharLinhas(ctx, linhas, { x: x + 70, y: y + (resposta.autor ? 60 : 30), largura: largura - 70, alturaDaLinha: 34, cor: tema.texto }) + 10;
      }
      // Campo de resposta
      const campo = { x, y: area.y + area.altura - 120, largura, altura: 70 };
      painel(ctx, campo, tema, { raio: 35, cor: tema.painel });
      fonte(ctx, 'sans', 24, 400);
      escrever(ctx, 'Escreva uma resposta', campo.x + 32, campo.y + 44, 'esquerda', tema.fraco);
    });
  },
};

// ---------------------------------------------------------------- conversa

export const conversa: IModeloDeDocumento = {
  id: 'conversa',
  nome: 'Conversa no celular',
  categoria: 'AstraTech',
  icone: 'conversa',
  descricao: 'Troca de mensagens aberta no celular da AstraTech. Boa para pista, ameaça ou último recado.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: IMPRESSAO,
  campoDoTitulo: 'contato',
  campos: [
    CAMPO_DE_TEMA,
    { id: 'contato', rotulo: 'Contato', tipo: 'texto', padrao: 'Mãe', maximo: 30 },
    { id: 'avatar', rotulo: 'Foto do contato', tipo: 'imagem', padrao: '' },
    { id: 'status', rotulo: 'Situação', tipo: 'texto', padrao: 'visto por último às 23:12', maximo: 40 },
    {
      id: 'mensagens', rotulo: 'Mensagens', tipo: 'paragrafo', linhas: 8, maximo: 1600,
      dica: 'Uma mensagem por linha. Comece com > a mensagem enviada pelo dono do celular.',
      padrao: 'Onde você está?\nJá passa da meia-noite.\n> Tô bem, mãe. Já tô voltando.\nTem um homem parado na frente de casa.\nEle disse que te conhece.\n> Não abre a porta.\n> Mãe?',
    },
    { id: 'digitando', rotulo: 'Digitando', tipo: 'escolha', padrao: 'nao', opcoes: [{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }] },
    { id: 'hora', rotulo: 'Hora no celular', tipo: 'texto', padrao: '23:47', maximo: 8 },
    { id: 'bateria', rotulo: 'Bateria', tipo: 'texto', padrao: '12%', maximo: 5 },
  ],
  desenhar: (pincel, v) => {
    const { ctx, imagem } = pincel;
    const tema = temaAstra(v.tema);
    emCelular(pincel, tema, { hora: v.hora, bateria: v.bateria }, (area) => {
      // Topo da conversa
      const topo = 120;
      ctx.fillStyle = tema.painel;
      ctx.fillRect(area.x, area.y, area.largura, topo);
      icone(ctx, 'voltar', area.x + 44, area.y + 60, 34, tema.acento);
      avatar(ctx, area.x + 118, area.y + 60, 38, imagem('avatar'), v.contato, corDoApp(v.contato));
      linhaQueCabe(ctx, v.contato, area.x + 172, area.y + 54, {
        largura: area.largura - 330, maximo: 32, minimo: 18, alinhamento: 'esquerda', cor: tema.texto, montar: (t) => fonte(ctx, 'sans', t, 600),
      });
      linhaQueCabe(ctx, v.status, area.x + 172, area.y + 90, {
        largura: area.largura - 330, maximo: 22, minimo: 14, alinhamento: 'esquerda', cor: tema.fraco, montar: (t) => fonte(ctx, 'sans', t, 400),
      });
      icone(ctx, 'chamada', area.x + area.largura - 120, area.y + 60, 34, tema.acento);
      icone(ctx, 'camera', area.x + area.largura - 54, area.y + 60, 34, tema.acento);
      traco(ctx, area.x, area.y + topo, area.x + area.largura, area.y + topo, tema.linha, 2);

      // Balões, de baixo para cima: as mais novas ficam perto do campo de digitar
      const pe = area.y + area.altura - 130;
      const larguraMaxima = area.largura * 0.72;
      const tamanho = 30;
      const alturaDaLinha = 40;
      fonte(ctx, 'sans', tamanho, 400);
      const baloes = mensagensDaConversa(v.mensagens).map((mensagem) => {
        const linhas = quebrarEmLinhas(mensagem.texto, larguraMaxima - 52, (t) => ctx.measureText(t).width);
        const larguraDoTexto = Math.max(...linhas.map((linha) => ctx.measureText(linha.palavras.map((p) => p.texto).join(' ')).width), 20);
        return { ...mensagem, linhas, largura: larguraDoTexto + 52, altura: linhas.length * alturaDaLinha + 30 };
      });
      if (v.digitando === 'sim') baloes.push({ enviada: false, texto: '', linhas: [], largura: 130, altura: 70 });
      let y = pe;
      for (let i = baloes.length - 1; i >= 0; i -= 1) {
        const balao = baloes[i];
        y -= balao.altura;
        if (y < area.y + topo + 20) break;
        const bx = balao.enviada ? area.x + area.largura - 36 - balao.largura : area.x + 36;
        ctx.save();
        retanguloArredondado(ctx, bx, y, balao.largura, balao.altura, 30);
        ctx.fillStyle = balao.enviada ? tema.acento : tema.painel2;
        ctx.fill();
        ctx.restore();
        if (!balao.linhas.length) {
          ctx.fillStyle = tema.fraco;
          for (let ponto = 0; ponto < 3; ponto += 1) {
            ctx.beginPath();
            ctx.arc(bx + 38 + ponto * 27, y + 35, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          fonte(ctx, 'sans', tamanho, 400);
          desenharLinhas(ctx, balao.linhas, {
            x: bx + 26, y: y + 15 + alturaDaLinha * 0.78, largura: balao.largura - 52, alturaDaLinha,
            cor: balao.enviada ? '#ffffff' : tema.texto, corDaTarja: tema.fraco,
          });
        }
        y -= 16;
      }

      // Campo de digitar
      const campo = { x: area.x + 32, y: area.y + area.altura - 110, largura: area.largura - 150, altura: 72 };
      painel(ctx, campo, tema, { raio: 36, cor: tema.painel });
      fonte(ctx, 'sans', 26, 400);
      escrever(ctx, 'Mensagem', campo.x + 32, campo.y + 46, 'esquerda', tema.fraco);
      ctx.fillStyle = tema.acento;
      ctx.beginPath();
      ctx.arc(area.x + area.largura - 70, campo.y + 36, 36, 0, Math.PI * 2);
      ctx.fill();
      icone(ctx, 'voltar', area.x + area.largura - 70, campo.y + 36, 30, '#ffffff');
    });
  },
};

// ---------------------------------------------------------------- tela de bloqueio

export const telaDeBloqueio: IModeloDeDocumento = {
  id: 'bloqueio',
  nome: 'Tela de bloqueio',
  categoria: 'AstraTech',
  icone: 'bloqueio',
  descricao: 'Celular bloqueado com hora, papel de parede e as notificações que chegaram. Ótimo para celular achado na cena.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: IMPRESSAO,
  campoDoTitulo: 'hora',
  campos: [
    { id: 'hora', rotulo: 'Hora', tipo: 'texto', padrao: '03:17', maximo: 8 },
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'quarta, 14 de outono', maximo: 40 },
    { id: 'fundo', rotulo: 'Papel de parede (opcional)', tipo: 'imagem', padrao: '' },
    {
      id: 'notificacoes', rotulo: 'Notificações', tipo: 'paragrafo', linhas: 5, maximo: 1000,
      dica: 'Uma por linha, no formato App | Título | Texto.',
      padrao: 'Mensagens | Mãe | Onde você está?\nChamadas | Número desconhecido | 12 chamadas perdidas\nAstraLink | Lia Moura | marcou você numa foto\nBanco Lunar | Saque aprovado | 2.000 Lunaris na agência da fronteira',
    },
    { id: 'bateria', rotulo: 'Bateria', tipo: 'texto', padrao: '7%', maximo: 5 },
  ],
  desenhar: (pincel, v) => {
    const { ctx, imagem } = pincel;
    const tema = temaAstra('escuro');
    // O papel de parede vai antes da barra de status, para ela ficar por cima dele.
    const papelDeParede = (tela: Retangulo) => {
      ctx.save();
      const fundo = imagem('fundo');
      if (fundo) {
        imagemCobrindo(ctx, fundo, tela.x, tela.y, tela.largura, tela.altura);
      } else {
        const ceu = ctx.createLinearGradient(0, tela.y, 0, tela.y + tela.altura);
        ceu.addColorStop(0, '#071022');
        ceu.addColorStop(0.6, '#13204a');
        ceu.addColorStop(1, '#2a1240');
        ctx.fillStyle = ceu;
        ctx.fillRect(tela.x, tela.y, tela.largura, tela.altura);
        const brilho = ctx.createRadialGradient(tela.x + tela.largura * 0.7, tela.y + tela.altura * 0.35, 10, tela.x + tela.largura * 0.7, tela.y + tela.altura * 0.35, 520);
        brilho.addColorStop(0, 'rgba(56, 182, 255, 0.45)');
        brilho.addColorStop(1, 'rgba(56, 182, 255, 0)');
        ctx.fillStyle = brilho;
        ctx.fillRect(tela.x, tela.y, tela.largura, tela.altura);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(tela.x, tela.y, tela.largura, tela.altura);
      ctx.restore();
    };
    emCelular(pincel, tema, { hora: 'AstraTech', bateria: v.bateria, fundo: papelDeParede }, (area) => {
      const meio = area.x + area.largura / 2;
      icone(ctx, 'cadeado', meio, area.y + 50, 40, '#ffffff');
      linhaQueCabe(ctx, v.hora, meio, area.y + 280, {
        largura: area.largura - 80, maximo: 190, minimo: 80, cor: '#ffffff', montar: (t) => fonte(ctx, 'sans', t, 300),
      });
      linhaQueCabe(ctx, v.data, meio, area.y + 346, {
        largura: area.largura - 80, maximo: 34, minimo: 20, cor: 'rgba(255, 255, 255, 0.85)', montar: (t) => fonte(ctx, 'sans', t, 500),
      });

      let y = area.y + 420;
      const x = area.x + 32;
      const largura = area.largura - 64;
      const limite = area.y + area.altura - 260;
      for (const aviso of notificacoesDaTela(v.notificacoes)) {
        fonte(ctx, 'sans', 25, 400);
        const linhas = quebrarEmLinhas(aviso.texto, largura - 136, (t) => ctx.measureText(t).width).slice(0, 2);
        const altura = 84 + (aviso.titulo ? 34 : 0) + linhas.length * 34;
        if (y + altura > limite) break;
        painel(ctx, { x, y, largura, altura }, tema, { raio: 30, cor: 'rgba(16, 26, 46, 0.72)', borda: 'rgba(255, 255, 255, 0.08)' });
        const cor = corDoApp(aviso.app);
        retanguloArredondado(ctx, x + 26, y + 26, 64, 64, 18);
        ctx.fillStyle = cor;
        ctx.fill();
        fonte(ctx, 'sans', 32, 600);
        escrever(ctx, (aviso.app.charAt(0) || '?').toUpperCase(), x + 58, y + 70, 'centro', '#ffffff');
        fonte(ctx, 'sans', 20, 600);
        escrever(ctx, aviso.app.toUpperCase(), x + 110, y + 46, 'esquerda', 'rgba(255, 255, 255, 0.65)');
        escrever(ctx, 'agora', x + largura - 28, y + 46, 'direita', 'rgba(255, 255, 255, 0.55)');
        let ty = y + 84;
        if (aviso.titulo) {
          linhaQueCabe(ctx, aviso.titulo, x + 110, ty, {
            largura: largura - 136, maximo: 27, minimo: 18, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'sans', t, 600),
          });
          ty += 34;
        }
        fonte(ctx, 'sans', 25, 400);
        desenharLinhas(ctx, linhas, { x: x + 110, y: ty, largura: largura - 136, alturaDaLinha: 34, cor: 'rgba(255, 255, 255, 0.85)' });
        y += altura + 18;
      }

      // Lanterna, câmera e o convite para deslizar
      const base = area.y + area.altura - 170;
      for (const [cx, nome] of [[area.x + 110, 'alerta'], [area.x + area.largura - 110, 'camera']] as const) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.arc(cx, base, 52, 0, Math.PI * 2);
        ctx.fill();
        icone(ctx, nome === 'alerta' ? 'sino' : 'camera', cx, base, 40, '#ffffff');
      }
      fonte(ctx, 'sans', 24, 500);
      escrever(ctx, 'Deslize para abrir', meio, area.y + area.altura - 60, 'centro', 'rgba(255, 255, 255, 0.75)');
    });
  },
};
