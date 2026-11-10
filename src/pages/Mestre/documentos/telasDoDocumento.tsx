/**
 * O que a Oficina e os Documentos universais dividem: a miniatura, a prévia grande e a
 * exportação (baixar, copiar para o Discord, imprimir). O desenho em si mora em render.ts.
 */

import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck, BellRing, Camera, CassetteTape, Contact, Crosshair, FileLock2, FlaskConical, Handshake, KeyRound, Mail, MailOpen,
  Megaphone, MessagesSquare, Newspaper, NotebookPen, Receipt, Smartphone, StickyNote, Ticket, type LucideIcon,
} from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { valoresComPadrao, type IconeDeModelo, type IModeloDeDocumento, type ValoresDoDocumento } from './modelo';
import { baixarPng, carregarImagens, copiarPng, garantirFontes, imprimir, renderizar } from './render';

export const BOTAO = 'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-gray-200 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40';

export type Exportacao = 'baixar' | 'copiar' | 'imprimir';

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
