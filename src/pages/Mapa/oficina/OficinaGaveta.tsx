// Oficina do Mestre: transforma uma imagem em token (ou num mapa melhor).
// Remover fundo e melhorar qualidade rodam no PC de quem usa; o resultado
// vai para o Acervo e, se quiser, direto para a cena e a iniciativa.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brush, Eraser, ImagePlus, Loader2, Move, Sparkles, Wand2, X } from 'lucide-react';
import { acervoApi, type IItemAcervo } from '../../../services/acervoApi';
import { mapaApi, urlPedaco, type IEstadoMapa, type LadoToken } from '../../../services/mapaApi';
import { sessaoApi } from '../../../services/sessaoApi';
import { LADO_LADRILHO, type IPonto } from '../motor/geometria';
import {
  carregarMolduraDeArte, desenharMoldura, desenharRetrato, ehMolduraDeArte, ENQUADRAMENTO_PADRAO, MOLDURAS, RAIO_RETRATO, type Enquadramento,
} from '../motor/molduras';
import { subirParaOAcervo } from '../acervo/subirImagem';
import { melhorarQualidade, removerFundo } from './processar';
import { ComDica } from '../componentes/BotaoFerramenta';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  campanhaId: string;
  cenaId: string | null;
  sessaoId: string | null;
  /** Onde o token novo nasce (meio da tela, já encaixado na grade). */
  centro: () => IPonto | null;
  onCena: (estado: IEstadoMapa) => void;
}

type Ferramenta = 'mover' | 'apagar' | 'restaurar';
type Modo = 'token' | 'imagem';

const LADO_PALCO = 520;
const LADO_TOKEN = 512;

function xadrez(ctx: CanvasRenderingContext2D, lado: number) {
  const passo = 16;
  for (let y = 0; y < lado; y += passo) {
    for (let x = 0; x < lado; x += passo) {
      ctx.fillStyle = (x / passo + y / passo) % 2 === 0 ? '#24212c' : '#2e2a38';
      ctx.fillRect(x, y, passo, passo);
    }
  }
}

/** A imagem com a transparência aplicada (o recorte do fundo e o que o pincel mexeu). */
function comporImagem(fonte: OffscreenCanvas, alfa: Uint8ClampedArray | null): OffscreenCanvas {
  const tela = new OffscreenCanvas(fonte.width, fonte.height);
  const ctx = tela.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(fonte, 0, 0);
  if (alfa) {
    const dados = ctx.getImageData(0, 0, fonte.width, fonte.height);
    for (let i = 0; i < alfa.length; i++) dados.data[i * 4 + 3] = alfa[i];
    ctx.putImageData(dados, 0, 0);
  }
  return tela;
}

async function imagemDoAcervo(item: IItemAcervo): Promise<OffscreenCanvas> {
  const tela = new OffscreenCanvas(item.largura, item.altura);
  const ctx = tela.getContext('2d')!;
  await Promise.all(item.chaves.filter((c) => c.startsWith('n0/')).map(async (chave) => {
    const [, coluna, linha] = chave.split('/').map(Number);
    const resposta = await fetch(urlPedaco(item.id, chave), { credentials: 'same-origin' });
    const pedaco = await createImageBitmap(await resposta.blob());
    ctx.drawImage(pedaco, coluna * LADO_LADRILHO, linha * LADO_LADRILHO);
    pedaco.close();
  }));
  return tela;
}

export const OficinaGaveta = ({ aberto, onFechar, campanhaId, cenaId, sessaoId, centro, onCena }: Props) => {
  const [fonte, setFonte] = useState<OffscreenCanvas | null>(null);
  const [alfa, setAlfa] = useState<Uint8ClampedArray | null>(null);
  const [nome, setNome] = useState('');
  const [modo, setModo] = useState<Modo>('token');
  const [tipoImagem, setTipoImagem] = useState<'mapa' | 'objeto'>('mapa');
  const [enquadramento, setEnquadramento] = useState<Enquadramento>(ENQUADRAMENTO_PADRAO);
  const [fundo, setFundo] = useState<string>('transparente');
  const [moldura, setMoldura] = useState('lado');
  const [arteChegou, setArteChegou] = useState(0);
  const [lado, setLado] = useState<LadoToken>('inimigo');
  const [naIniciativa, setNaIniciativa] = useState(true);
  const [vida, setVida] = useState(20);
  const [iniciativa, setIniciativa] = useState(10);
  const [ferramenta, setFerramenta] = useState<Ferramenta>('mover');
  const [pincel, setPincel] = useState(24);
  const [ocupado, setOcupado] = useState<{ texto: string; fracao?: number } | null>(null);
  const [erro, setErro] = useState('');
  const [acervo, setAcervo] = useState<IItemAcervo[]>([]);
  const [versao, setVersao] = useState(0);
  const palcoRef = useRef<HTMLCanvasElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const fonteRef = useRef<OffscreenCanvas | null>(null);
  fonteRef.current = fonte;
  const ocupadoRef = useRef(false);
  const cursor = useRef<IPonto | null>(null);
  const arrasto = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!aberto) return;
    acervoApi.listar().then((a) => setAcervo(a.itens.filter((i) => i.estado === 'pronto'))).catch(() => setAcervo([]));
  }, [aberto]);

  // `versao` muda a cada pincelada: o recorte é refeito sem copiar a máscara inteira no estado.
  const composta = useMemo(() => (fonte ? comporImagem(fonte, alfa) : null), [fonte, alfa, versao]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Onde a imagem fica no palco: escala e canto, nos dois modos. */
  const posicao = useMemo(() => {
    if (!fonte) return null;
    if (modo === 'token') {
      const raio = LADO_PALCO * RAIO_RETRATO;
      const escala = ((raio * 2) / Math.min(fonte.width, fonte.height)) * enquadramento.zoom;
      const w = fonte.width * escala;
      const h = fonte.height * escala;
      return { escala, x: LADO_PALCO / 2 - w / 2 + enquadramento.x * raio, y: LADO_PALCO / 2 - h / 2 + enquadramento.y * raio, raio };
    }
    const escala = Math.min(LADO_PALCO / fonte.width, LADO_PALCO / fonte.height);
    return { escala, x: (LADO_PALCO - fonte.width * escala) / 2, y: (LADO_PALCO - fonte.height * escala) / 2, raio: 0 };
  }, [fonte, modo, enquadramento]);

  const desenhar = useCallback(() => {
    const ctx = palcoRef.current?.getContext('2d');
    if (!ctx) return;
    xadrez(ctx, LADO_PALCO);
    if (!composta || !posicao) return;
    if (modo === 'token') {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(composta, posicao.x, posicao.y, composta.width * posicao.escala, composta.height * posicao.escala);
      ctx.globalAlpha = 1;
      if (fundo !== 'transparente') {
        ctx.beginPath();
        ctx.arc(LADO_PALCO / 2, LADO_PALCO / 2, posicao.raio, 0, Math.PI * 2);
        ctx.fillStyle = fundo;
        ctx.fill();
      }
      desenharRetrato(ctx, LADO_PALCO, composta, enquadramento, posicao.raio);
      desenharMoldura(ctx, LADO_PALCO, { id: moldura, lado });
    } else {
      ctx.drawImage(composta, posicao.x, posicao.y, composta.width * posicao.escala, composta.height * posicao.escala);
    }
    if (cursor.current && ferramenta !== 'mover') {
      ctx.beginPath();
      ctx.arc(cursor.current.x, cursor.current.y, pincel * posicao.escala, 0, Math.PI * 2);
      ctx.strokeStyle = ferramenta === 'apagar' ? '#f87171' : '#6ee7b7';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [composta, posicao, modo, fundo, enquadramento, moldura, lado, ferramenta, pincel, arteChegou]);

  useEffect(() => {
    desenhar();
  }, [desenhar]);

  // Moldura ilustrada: a imagem vem da rede, então a prévia se refaz quando ela chega.
  useEffect(() => {
    if (!ehMolduraDeArte(moldura)) return;
    let vivo = true;
    void carregarMolduraDeArte(moldura).then(() => {
      if (vivo) setArteChegou((n) => n + 1);
    });
    return () => {
      vivo = false;
    };
  }, [moldura]);

  const carregar = (tela: OffscreenCanvas, nomeBase: string) => {
    setFonte(tela);
    setAlfa(null);
    setEnquadramento(ENQUADRAMENTO_PADRAO);
    setNome(nomeBase);
    setFerramenta('mover');
    setErro('');
  };

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const imagem = await createImageBitmap(arquivo);
      const tela = new OffscreenCanvas(imagem.width, imagem.height);
      tela.getContext('2d')!.drawImage(imagem, 0, 0);
      imagem.close();
      carregar(tela, arquivo.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim());
    } catch {
      setErro('Este arquivo não abriu como imagem.');
    }
  };

  const escolherDoAcervo = async (id: string) => {
    const item = acervo.find((i) => i.id === id);
    if (!item) return;
    setOcupado({ texto: 'Abrindo a imagem do Acervo...' });
    try {
      carregar(await imagemDoAcervo(item), item.nome);
      if (item.tipo !== 'token') setModo('imagem');
    } catch {
      setErro('Não deu para abrir esta imagem do Acervo.');
    } finally {
      setOcupado(null);
    }
  };

  // Uma ação por vez: os botões travam no clique, antes de a biblioteca terminar de carregar.
  const executar = async (textoInicial: string, acao: () => Promise<void>) => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setErro('');
    setOcupado({ texto: textoInicial });
    try {
      await acao();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Algo não deu certo.');
    } finally {
      ocupadoRef.current = false;
      setOcupado(null);
    }
  };

  const fazerRemoverFundo = () => executar('Preparando o recorte...', async () => {
    const alvo = fonteRef.current;
    if (!alvo) return;
    const recorte = await removerFundo(alvo, (texto, fracao) => setOcupado({ texto, fracao }));
    // A imagem pode ter sido trocada no meio do caminho; o recorte só vale para a mesma.
    if (fonteRef.current !== alvo) return;
    setAlfa(recorte);
    setFerramenta('apagar');
  });

  const fazerMelhorar = (escala: 2 | 4) => executar('Preparando o melhorador...', async () => {
    const fonte = fonteRef.current;
    if (!fonte) return;
    const melhor = await melhorarQualidade(fonte, escala, (texto, fracao) => setOcupado({ texto, fracao }));
    if (fonteRef.current !== fonte) return;
    if (alfa) {
      // O recorte acompanha: a máscara é ampliada pelo navegador.
      const mascara = new OffscreenCanvas(fonte.width, fonte.height);
      const ctx = mascara.getContext('2d', { willReadFrequently: true })!;
      const dados = new ImageData(fonte.width, fonte.height);
      for (let i = 0; i < alfa.length; i++) dados.data[i * 4 + 3] = alfa[i];
      ctx.putImageData(dados, 0, 0);
      const grande = new OffscreenCanvas(melhor.width, melhor.height);
      const ctxGrande = grande.getContext('2d', { willReadFrequently: true })!;
      ctxGrande.imageSmoothingQuality = 'high';
      ctxGrande.drawImage(mascara, 0, 0, melhor.width, melhor.height);
      const ampliada = ctxGrande.getImageData(0, 0, melhor.width, melhor.height).data;
      const novoAlfa = new Uint8ClampedArray(melhor.width * melhor.height);
      for (let i = 0; i < novoAlfa.length; i++) novoAlfa[i] = ampliada[i * 4 + 3];
      setAlfa(novoAlfa);
    }
    setFonte(melhor);
    setPincel((p) => p * escala);
  });

  // ------------------------------------------------------------- palco

  const pontoNaImagem = (x: number, y: number) =>
    posicao ? { x: (x - posicao.x) / posicao.escala, y: (y - posicao.y) / posicao.escala } : null;

  const pintar = (x: number, y: number) => {
    if (!fonte || !posicao) return;
    const ponto = pontoNaImagem(x, y);
    if (!ponto) return;
    const mascara = alfa ?? new Uint8ClampedArray(fonte.width * fonte.height).fill(255);
    const valor = ferramenta === 'apagar' ? 0 : 255;
    const r = pincel;
    for (let yy = Math.max(0, Math.floor(ponto.y - r)); yy < Math.min(fonte.height, Math.ceil(ponto.y + r)); yy++) {
      for (let xx = Math.max(0, Math.floor(ponto.x - r)); xx < Math.min(fonte.width, Math.ceil(ponto.x + r)); xx++) {
        if ((xx - ponto.x) ** 2 + (yy - ponto.y) ** 2 <= r * r) mascara[yy * fonte.width + xx] = valor;
      }
    }
    if (!alfa) setAlfa(mascara);
    else setVersao((v) => v + 1);
  };

  const local = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const caixa = evento.currentTarget.getBoundingClientRect();
    return { x: ((evento.clientX - caixa.left) / caixa.width) * LADO_PALCO, y: ((evento.clientY - caixa.top) / caixa.height) * LADO_PALCO };
  };

  const aoApertar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const p = local(evento);
    arrasto.current = p;
    if (ferramenta !== 'mover') pintar(p.x, p.y);
  };

  const aoMover = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(evento);
    cursor.current = p;
    if (arrasto.current) {
      if (ferramenta === 'mover' && modo === 'token' && posicao) {
        const dx = (p.x - arrasto.current.x) / posicao.raio;
        const dy = (p.y - arrasto.current.y) / posicao.raio;
        setEnquadramento((e) => ({ ...e, x: Math.max(-1, Math.min(1, e.x + dx)), y: Math.max(-1, Math.min(1, e.y + dy)) }));
      } else if (ferramenta !== 'mover') {
        pintar(p.x, p.y);
      }
      arrasto.current = p;
    }
    desenhar();
  };

  const aoRodinha = (evento: React.WheelEvent<HTMLCanvasElement>) => {
    if (modo !== 'token') return;
    setEnquadramento((e) => ({ ...e, zoom: Math.max(1, Math.min(4, e.zoom * (evento.deltaY < 0 ? 1.08 : 1 / 1.08))) }));
  };

  // ------------------------------------------------------------ salvar

  const arquivoDoResultado = async (): Promise<File | null> => {
    if (!composta) return null;
    if (modo === 'token') {
      const tela = new OffscreenCanvas(LADO_TOKEN, LADO_TOKEN);
      const ctx = tela.getContext('2d')!;
      if (fundo !== 'transparente') {
        ctx.beginPath();
        ctx.arc(LADO_TOKEN / 2, LADO_TOKEN / 2, LADO_TOKEN / 2, 0, Math.PI * 2);
        ctx.fillStyle = fundo;
        ctx.fill();
      }
      desenharRetrato(ctx, LADO_TOKEN, composta, enquadramento);
      return new File([await tela.convertToBlob({ type: 'image/png' })], `${nome || 'token'}.png`, { type: 'image/png' });
    }
    return new File([await composta.convertToBlob({ type: 'image/png' })], `${nome || 'imagem'}.png`, { type: 'image/png' });
  };

  const salvarNoAcervo = async (): Promise<IItemAcervo | null> => {
    const arquivo = await arquivoDoResultado();
    if (!arquivo) return null;
    return subirParaOAcervo(arquivo, {
      tipo: modo === 'token' ? 'token' : tipoImagem,
      pastaId: null,
      aoProgresso: (p) => setOcupado({ texto: `Guardando no Acervo: ${p.feitos} de ${p.total}`, fracao: p.feitos / p.total }),
    });
  };

  const fazerSalvar = () => executar('Guardando no Acervo...', async () => {
    const item = await salvarNoAcervo();
    if (item) setOcupado({ texto: `"${item.nome}" está no Acervo.`, fracao: 1 });
    await new Promise((r) => setTimeout(r, 900));
  });

  const fazerPorNaCena = () => executar('Guardando no Acervo...', async () => {
    const ponto = centro();
    if (!cenaId || !ponto) throw new Error('Abra uma cena para pôr o token.');
    const item = await salvarNoAcervo();
    if (!item) return;
    const nomeFinal = nome.trim() || item.nome;
    let participanteId: string | undefined;
    if (naIniciativa) {
      if (!sessaoId) throw new Error('Abra uma sessão para pôr o inimigo na iniciativa.');
      setOcupado({ texto: 'Entrando na iniciativa...' });
      const criado = await sessaoApi.adicionarParticipante(sessaoId, {
        nome: nomeFinal,
        tipo: lado === 'aliado' ? 'aliado' : 'inimigo',
        iniciativa,
        vida_atual: vida,
        vida_maxima: vida,
        visibilidade: 'parcial',
      }) as { id: string };
      participanteId = criado.id;
    }
    const estado = await mapaApi.criarToken(campanhaId, cenaId, {
      imagem_id: item.id,
      participante_id: participanteId,
      nome: nomeFinal,
      x: ponto.x,
      y: ponto.y,
      lado,
      moldura,
    });
    onCena(estado);
    onFechar();
  });

  if (!aberto) return null;

  return (
    <aside className="mapa-oficina" aria-label="Oficina">
      <header>
        <strong><Wand2 size={16} /> Oficina</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar a Oficina" onClick={onFechar}><X size={18} /></button>
      </header>
      <div className="mapa-oficina-corpo">
        <div className="mapa-oficina-palco">
          <canvas
            ref={palcoRef}
            width={LADO_PALCO}
            height={LADO_PALCO}
            onPointerDown={aoApertar}
            onPointerMove={aoMover}
            onPointerUp={() => { arrasto.current = null; }}
            onPointerLeave={() => { cursor.current = null; desenhar(); }}
            onWheel={aoRodinha}
            style={{ cursor: ferramenta === 'mover' ? 'grab' : 'crosshair' }}
          />
          {!fonte && <p className="mapa-oficina-vazio">Escolha uma imagem do seu PC ou do Acervo.</p>}
          {ocupado && (
            <div className="mapa-oficina-progresso">
              <span><Loader2 size={14} className="girando" /> {ocupado.texto}</span>
              {ocupado.fracao !== undefined && <i style={{ width: `${Math.round(ocupado.fracao * 100)}%` }} />}
            </div>
          )}
        </div>

        <div className="mapa-oficina-controles">
          <fieldset>
            <legend>Imagem</legend>
            <div className="mapa-menu-botoes">
              <button type="button" className="mapa-botao" onClick={() => arquivoRef.current?.click()}><ImagePlus size={14} /> Do PC</button>
              <select aria-label="Imagem do Acervo" value="" onChange={(e) => void escolherDoAcervo(e.target.value)}>
                <option value="">Do Acervo...</option>
                {acervo.map((item) => <option key={item.id} value={item.id}>{item.nome} ({item.tipo})</option>)}
              </select>
              <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={(e) => void escolherArquivo(e.target.files?.[0])} />
            </div>
            <div className="mapa-abas" role="tablist">
              <button type="button" role="tab" aria-selected={modo === 'token'} className={modo === 'token' ? 'ativo' : ''} onClick={() => setModo('token')}>Token</button>
              <button type="button" role="tab" aria-selected={modo === 'imagem'} className={modo === 'imagem' ? 'ativo' : ''} onClick={() => setModo('imagem')}>Mapa ou objeto</button>
            </div>
            {fonte && <small className="mapa-dica">{fonte.width} x {fonte.height} px</small>}
          </fieldset>

          <fieldset disabled={!fonte || Boolean(ocupado)}>
            <legend>Ajustes</legend>
            <div className="mapa-menu-botoes">
              <button type="button" className="mapa-botao" onClick={() => void fazerRemoverFundo()}><Sparkles size={14} /> Remover fundo</button>
              <button type="button" className="mapa-botao" onClick={() => void fazerMelhorar(2)}>Melhorar 2x</button>
              <button type="button" className="mapa-botao" onClick={() => void fazerMelhorar(4)}>Melhorar 4x</button>
            </div>
            <small className="mapa-dica">A ampliação por IA recria detalhes plausíveis e pode alterar texturas. Confira o resultado antes de salvar; detalhes ausentes na imagem original não podem ser recuperados.</small>
            <div className="mapa-ferramentas-oficina" role="radiogroup" aria-label="Ferramenta">
              <ComDica lado="cima" dica="Arrastar a foto dentro do círculo">
                <button type="button" className={ferramenta === 'mover' ? 'ativo' : ''} aria-label="Arrastar a foto" onClick={() => setFerramenta('mover')}><Move size={15} /></button>
              </ComDica>
              <ComDica lado="cima" dica="Pincel que apaga">
                <button type="button" className={ferramenta === 'apagar' ? 'ativo' : ''} aria-label="Pincel que apaga" onClick={() => setFerramenta('apagar')}><Eraser size={15} /></button>
              </ComDica>
              <ComDica lado="cima" dica="Pincel que restaura">
                <button type="button" className={ferramenta === 'restaurar' ? 'ativo' : ''} aria-label="Pincel que restaura" onClick={() => setFerramenta('restaurar')}><Brush size={15} /></button>
              </ComDica>
              <label>Pincel <input type="range" min={2} max={200} value={pincel} onChange={(e) => setPincel(Number(e.target.value))} /></label>
            </div>
            {alfa && <button type="button" className="mapa-botao-leve" onClick={() => setAlfa(null)}>Desfazer o recorte</button>}
          </fieldset>

          {modo === 'token' ? (
            <fieldset disabled={!fonte}>
              <legend>Token</legend>
              <label className="mapa-menu-linha">Zoom <input type="range" min={1} max={4} step={0.02} value={enquadramento.zoom} onChange={(e) => setEnquadramento({ ...enquadramento, zoom: Number(e.target.value) })} /></label>
              <label className="mapa-menu-linha">
                Fundo do círculo
                <span className="mapa-menu-botoes">
                  <button type="button" className={fundo === 'transparente' ? 'mapa-botao' : 'mapa-botao-leve'} onClick={() => setFundo('transparente')}>Transparente</button>
                  <input type="color" value={fundo === 'transparente' ? '#2a2333' : fundo} onChange={(e) => setFundo(e.target.value)} />
                </span>
              </label>
              <SeletorDeMoldura valor={moldura} lado={lado} onEscolher={setMoldura} />
              <label className="mapa-menu-linha">
                Lado
                <select value={lado} onChange={(e) => setLado(e.target.value as LadoToken)}>
                  <option value="inimigo">Inimigo</option>
                  <option value="aliado">Aliado</option>
                  <option value="neutro">Neutro</option>
                </select>
              </label>
            </fieldset>
          ) : (
            <fieldset disabled={!fonte}>
              <legend>Guardar como</legend>
              <select value={tipoImagem} onChange={(e) => setTipoImagem(e.target.value as 'mapa' | 'objeto')} aria-label="Tipo">
                <option value="mapa">Mapa</option>
                <option value="objeto">Objeto</option>
              </select>
            </fieldset>
          )}

          <fieldset disabled={!fonte || Boolean(ocupado)}>
            <legend>Guardar</legend>
            <label className="mapa-menu-linha">Nome <input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} /></label>
            {modo === 'token' && cenaId && (
              <>
                <label className="mapa-menu-linha">
                  <span><input type="checkbox" checked={naIniciativa} onChange={(e) => setNaIniciativa(e.target.checked)} /> Entrar na iniciativa</span>
                </label>
                {naIniciativa && (
                  <div className="mapa-menu-opcoes">
                    <label className="mapa-menu-linha">Vida <input type="number" min={1} max={99999} value={vida} onChange={(e) => setVida(Math.max(1, Number(e.target.value) || 1))} /></label>
                    <label className="mapa-menu-linha">Iniciativa <input type="number" min={-50} max={200} value={iniciativa} onChange={(e) => setIniciativa(Number(e.target.value) || 0)} /></label>
                  </div>
                )}
              </>
            )}
            <div className="mapa-menu-botoes">
              <button type="button" className="mapa-botao" onClick={() => void fazerSalvar()}>Salvar no Acervo</button>
              {modo === 'token' && cenaId && <button type="button" className="mapa-botao" onClick={() => void fazerPorNaCena()}>Pôr na cena</button>}
            </div>
          </fieldset>
          {erro && <p className="mapa-erro">{erro}</p>}
        </div>
      </div>
    </aside>
  );
};

/** Grade de molduras com prévia de cada uma, desenhada pelo mesmo código do mapa. */
export const SeletorDeMoldura = ({ valor, lado, onEscolher }: {
  valor: string;
  lado: LadoToken;
  onEscolher: (id: string) => void;
}) => {
  const botao = (m: (typeof MOLDURAS)[number]) => (
    <button key={m.id} type="button" role="radio" aria-checked={valor === m.id} className={valor === m.id ? 'ativo' : ''} onClick={() => onEscolher(m.id)}>
      <PreviaMoldura id={m.id} lado={lado} />
      <small>{m.rotulo}</small>
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Moldura">
      <div className="mapa-molduras">{MOLDURAS.map(botao)}</div>
    </div>
  );
};

const PreviaMoldura = ({ id, lado }: { id: string; lado: LadoToken }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [chegou, setChegou] = useState(0);
  useEffect(() => {
    if (!ehMolduraDeArte(id)) return;
    let vivo = true;
    void carregarMolduraDeArte(id).then(() => {
      if (vivo) setChegou((n) => n + 1);
    });
    return () => {
      vivo = false;
    };
  }, [id]);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 64 * RAIO_RETRATO, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2333';
    ctx.fill();
    desenharMoldura(ctx, 64, { id, lado });
  }, [id, lado, chegou]);
  return <canvas ref={ref} width={64} height={64} />;
};
