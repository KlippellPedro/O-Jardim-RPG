/**
 * O que a Oficina e os Documentos universais dividem: a miniatura, a prévia grande e a
 * exportação (baixar, copiar para o Discord, imprimir). O desenho em si mora em render.ts.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  BadgeCheck, BellRing, Camera, CassetteTape, Contact, Crosshair, FileLock2, FlaskConical, Handshake, KeyRound, Mail, MailOpen,
  ImagePlus, Loader2, Megaphone, MessagesSquare, Newspaper, NotebookPen, Receipt, Smartphone, StickyNote, Ticket, X, type LucideIcon,
} from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { valoresComPadrao, type ICampoDoModelo, type IconeDeModelo, type IModeloDeDocumento, type ValoresDoDocumento } from './modelo';
import { baixarPng, carregarImagens, copiarPng, garantirFontes, imprimir, reduzirImagem, renderizar } from './render';

export const BOTAO = 'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-gray-200 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40';

export type Exportacao = 'baixar' | 'copiar' | 'imprimir';

export const ENTRADA = 'w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/50';

export const ICONES: Record<IconeDeModelo, LucideIcon> = {
  procurado: Crosshair,
  carta: Mail,
  bilhete: StickyNote,
  cartao: Contact,
  credencial: BadgeCheck,
  edital: Megaphone,
  contrato: Handshake,
  jornal: Newspaper,
  relatorio: FileLock2,
  chave: KeyRound,
  fita: CassetteTape,
  foto: Camera,
  frasco: FlaskConical,
  passagem: Ticket,
  recibo: Receipt,
  diario: NotebookPen,
  convite: MailOpen,
  post: Smartphone,
  conversa: MessagesSquare,
  bloqueio: BellRing,
};

/** Miniatura para as galerias. Sem `valores`, sai com os textos de exemplo do modelo. */
export function Miniatura({ modelo, largura, valores }: { modelo: IModeloDeDocumento; largura: number; valores?: ValoresDoDocumento }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let vivo = true;
    const preenchidos = valores ?? valoresComPadrao(modelo);
    const desenhar = () => {
      if (vivo && canvas.current) renderizar(canvas.current, modelo, preenchidos, {}, (largura * 2) / modelo.largura);
    };
    desenhar();
    void garantirFontes().then(desenhar);
    return () => { vivo = false; };
  }, [modelo, largura, valores]);
  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="mx-auto block h-auto max-h-full w-auto max-w-full drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)]"
      style={{ width: largura }}
    />
  );
}

/** A prévia grande, redesenhada a cada mudança (no máximo uma vez por quadro). */
export function Previa({ modelo, valores, titulo }: { modelo: IModeloDeDocumento; valores: ValoresDoDocumento; titulo: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fontesProntas, setFontesProntas] = useState(false);
  useEffect(() => {
    let vivo = true;
    void garantirFontes().then(() => { if (vivo) setFontesProntas(true); });
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    let vivo = true;
    let quadro = 0;
    void carregarImagens(modelo, valores).then((imagens) => {
      if (!vivo) return;
      quadro = window.requestAnimationFrame(() => {
        if (vivo && canvas.current) renderizar(canvas.current, modelo, valores, imagens);
      });
    });
    return () => {
      vivo = false;
      window.cancelAnimationFrame(quadro);
    };
  }, [modelo, valores, fontesProntas]);
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={`Prévia: ${titulo}`}
      className="mx-auto block h-auto max-h-[78vh] w-auto max-w-full drop-shadow-[0_16px_28px_rgba(0,0,0,0.6)]"
    />
  );
}

/** Baixa, copia ou imprime. Se o navegador não deixar copiar, baixa a imagem e avisa. */
export async function exportarDocumento(tipo: Exportacao, modelo: IModeloDeDocumento, valores: ValoresDoDocumento, titulo: string) {
  try {
    if (tipo === 'baixar') {
      await baixarPng(modelo, valores, titulo);
    } else if (tipo === 'copiar') {
      if (await copiarPng(modelo, valores)) avisar.sucesso('Imagem copiada. É só colar no Discord.');
      else {
        await baixarPng(modelo, valores, titulo);
        avisar.info('Este navegador não deixou copiar, então a imagem foi baixada.');
      }
    } else {
      await imprimir(modelo, valores, titulo);
    }
  } catch (erro) {
    avisarErro(erro, 'Não foi possível gerar o documento.');
  }
}

// ---------------------------------------------------------------- campos do formulário

function CampoDeImagem({ campo, valor, aoMudar }: { campo: ICampoDoModelo; valor: string; aoMudar: (valor: string) => void }) {
  const arquivo = useRef<HTMLInputElement>(null);
  const [preparando, setPreparando] = useState(false);
  const escolher = async (evento: ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';
    if (!escolhido) return;
    setPreparando(true);
    try {
      aoMudar(await reduzirImagem(escolhido));
    } catch (erro) {
      avisarErro(erro, 'Não foi possível usar essa imagem.');
    } finally {
      setPreparando(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
        {valor ? <img src={valor} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} className="text-gray-600" aria-hidden="true" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Escolher imagem: ${campo.rotulo}`} onChange={(evento) => void escolher(evento)} />
        <button type="button" className={BOTAO} disabled={preparando} onClick={() => arquivo.current?.click()}>
          {preparando ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {valor ? 'Trocar imagem' : 'Escolher imagem'}
        </button>
        {valor ? (
          <button type="button" className={BOTAO} onClick={() => aoMudar('')}>
            <X size={14} /> Tirar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CampoDoDocumento({ campo, valor, aoMudar }: { campo: ICampoDoModelo; valor: string; aoMudar: (valor: string) => void }) {
  const id = `documento-campo-${campo.id}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        {campo.tipo === 'escolha' || campo.tipo === 'imagem'
          ? <span id={id} className="text-xs font-bold uppercase tracking-widest text-gray-400">{campo.rotulo}</span>
          : <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-gray-400">{campo.rotulo}</label>}
        {campo.tipo === 'paragrafo' && campo.maximo ? (
          <span className={`text-[11px] tabular-nums ${valor.length > campo.maximo * 0.9 ? 'text-amber-400' : 'text-gray-600'}`}>{valor.length}/{campo.maximo}</span>
        ) : null}
      </div>
      {campo.tipo === 'texto' && (
        <input id={id} type="text" value={valor} maxLength={campo.maximo} onChange={(evento) => aoMudar(evento.target.value)} className={ENTRADA} />
      )}
      {campo.tipo === 'paragrafo' && (
        <textarea
          id={id}
          value={valor}
          maxLength={campo.maximo}
          rows={campo.linhas ?? 4}
          onChange={(evento) => aoMudar(evento.target.value)}
          className={`${ENTRADA} resize-y leading-6`}
        />
      )}
      {campo.tipo === 'escolha' && (
        <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1.5">
          {(campo.opcoes ?? []).map((opcao) => {
            const ativa = opcao.valor === valor;
            return (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={ativa}
                onClick={() => aoMudar(opcao.valor)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${ativa ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-black/30 text-gray-400 hover:text-gray-200'}`}
              >
                {opcao.rotulo}
              </button>
            );
          })}
        </div>
      )}
      {campo.tipo === 'imagem' && <CampoDeImagem campo={campo} valor={valor} aoMudar={aoMudar} />}
      {campo.dica ? <p className="text-xs text-gray-500">{campo.dica}</p> : null}
    </div>
  );
}

