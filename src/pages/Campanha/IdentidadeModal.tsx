import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { campanhaPainelApi } from '../../services/campanhaPainelApi';
import { COR_PADRAO_CAMPANHA, corDaCampanha, urlDaCapa, type IIdentidade } from './campanha';
import { reduzirCapa } from './reduzirCapa';

interface IIdentidadeModalProps {
  campanhaId: string;
  identidade: IIdentidade;
  onSalvo: (identidade: IIdentidade) => void;
  onFechar: () => void;
}

const CORES_SUGERIDAS = ['#c7a44c', '#ef4444', '#f97316', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899', '#94a3b8'];

/** O Mestre escolhe capa, cor e a frase de abertura da campanha. */
export const IdentidadeModal = ({ campanhaId, identidade, onSalvo, onFechar }: IIdentidadeModalProps) => {
  const [cor, setCor] = useState(corDaCampanha(identidade));
  const [frase, setFrase] = useState(identidade.frase);
  const [capa, setCapa] = useState<string | null | undefined>(undefined); // undefined = não mexeu
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const capaAtual = capa === undefined ? urlDaCapa(campanhaId, identidade) : capa;

  const escolher = async (evento: ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';
    if (!escolhido) return;
    setErro('');
    try {
      setCapa(await reduzirCapa(escolhido));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível preparar a imagem.');
    }
  };

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const dados: { cor: string | null; frase: string; capa?: string | null } = {
        cor: cor === COR_PADRAO_CAMPANHA && !identidade.cor ? null : cor,
        frase,
      };
      if (capa !== undefined) dados.capa = capa;
      const resposta = await campanhaPainelApi.identidade(campanhaId, dados);
      onSalvo(resposta.identidade);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Personalizar a campanha" onClick={onFechar}>
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0c12] p-6 shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Personalizar a campanha</h2>
            <p className="mt-1 text-sm text-gray-400">A capa, a cor e a frase aparecem para todos os jogadores.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        <section className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Capa</p>
          <div className="relative flex aspect-[3/1] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/40">
            {capaAtual ? <img src={capaAtual} alt="Capa da campanha" className="h-full w-full object-cover" /> : <span className="text-sm text-gray-500">Sem capa</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(evento) => void escolher(evento)} />
            <button type="button" onClick={() => arquivo.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-200 hover:bg-white/5"><ImagePlus size={14} /> Escolher imagem</button>
            {capaAtual ? <button type="button" onClick={() => setCapa(null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-400 hover:text-red-300"><Trash2 size={14} /> Tirar capa</button> : null}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">A imagem é cortada em faixa (3 por 1) e reduzida sozinha.</p>
        </section>

        <section className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Cor de destaque</p>
          <div className="flex flex-wrap items-center gap-2">
            {CORES_SUGERIDAS.map((opcao) => (
              <button key={opcao} type="button" aria-label={`Cor ${opcao}`} aria-pressed={cor === opcao} onClick={() => setCor(opcao)} className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: opcao, borderColor: cor === opcao ? '#fff' : 'transparent' }} />
            ))}
            <input type="color" value={cor} onChange={(evento) => setCor(evento.target.value)} aria-label="Escolher outra cor" className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
          </div>
        </section>

        <section className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500" htmlFor="frase-campanha">Frase de abertura</label>
          <input id="frase-campanha" value={frase} maxLength={140} onChange={(evento) => setFrase(evento.target.value)} placeholder="Ex.: O reino cai em silêncio, e alguém precisa acender a luz." className="w-full min-h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-white/30" />
          <p className="mt-1 text-right text-[11px] text-gray-600">{frase.length}/140</p>
        </section>

        {erro ? <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="min-h-11 rounded-xl px-4 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => void salvar()} disabled={salvando} className="min-h-11 rounded-xl border px-5 text-sm font-bold text-white disabled:opacity-50" style={{ borderColor: cor, backgroundColor: `${cor}33` }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};
