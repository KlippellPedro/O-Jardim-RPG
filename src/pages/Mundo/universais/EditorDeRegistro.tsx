import { useState } from 'react';
import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { IBlocoRegistro, IDadosRegistro, RevelacaoRegistro } from '../../../services/registrosUniversaisApi';
import { ROTULO_REVELACAO, itensParaTexto, textoParaItens, type IRegistro, type ISecaoUniversal } from './registros';

interface IEditorProps {
  secao: ISecaoUniversal;
  /** Registro a editar; `null` cria um novo registro do Mestre. */
  registro: IRegistro | null;
  onSalvar: (dados: IDadosRegistro, revelacao: RevelacaoRegistro) => Promise<void>;
  /** Apaga o registro do Mestre, ou desfaz o ajuste de um de fábrica. */
  onDesfazer?: () => Promise<void>;
  onFechar: () => void;
}

const campo = 'w-full min-h-11 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50';
const rotulo = 'mb-1 block text-[11px] font-bold uppercase tracking-widest text-gray-500';

const REVELACOES: Array<{ id: RevelacaoRegistro; ajuda: string }> = [
  { id: 'aberto', ajuda: 'Todos leem tudo.' },
  { id: 'rasurado', ajuda: 'Os jogadores veem que existe, mas só faixas de tinta.' },
  { id: 'oculto', ajuda: 'Os jogadores nem sabem que existe.' },
];

/** O Mestre edita um registro: nome, texto, ficha (campos), listas e o quanto os jogadores enxergam. */
export const EditorDeRegistro = ({ secao, registro, onSalvar, onDesfazer, onFechar }: IEditorProps) => {
  const [titulo, setTitulo] = useState(registro?.titulo ?? '');
  const [subtitulo, setSubtitulo] = useState(registro?.subtitulo ?? '');
  const [descricao, setDescricao] = useState(registro?.descricao ?? '');
  const [etiquetas, setEtiquetas] = useState((registro?.etiquetas ?? []).join(', '));
  const [campos, setCampos] = useState<Array<[string, string]>>(registro?.campos ?? []);
  const [blocos, setBlocos] = useState<Array<{ titulo: string; texto: string }>>((registro?.blocos ?? []).map((bloco) => ({ titulo: bloco.titulo, texto: itensParaTexto(bloco.itens) })));
  const [revelacao, setRevelacao] = useState<RevelacaoRegistro>(registro?.revelacao ?? 'aberto');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const de = registro?.origemId ? 'Restaurar o original' : 'Apagar este registro';

  const salvar = async () => {
    if (!titulo.trim()) { setErro('Dê um nome ao registro.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const listaBlocos: IBlocoRegistro[] = blocos.map((bloco) => ({ titulo: bloco.titulo.trim(), itens: textoParaItens(bloco.texto) })).filter((bloco) => bloco.titulo && bloco.itens.length);
      await onSalvar({
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim(),
        descricao,
        campos: campos.map(([r, v]): [string, string] => [r.trim(), v.trim()]).filter(([r, v]) => r && v),
        blocos: listaBlocos,
        etiquetas: etiquetas.split(',').map((item) => item.trim()).filter(Boolean),
      }, revelacao);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  const desfazer = async () => {
    if (!onDesfazer) return;
    const aviso = registro?.origemId ? 'Voltar este registro ao texto original do site?' : 'Apagar este registro de vez?';
    if (!window.confirm(aviso)) return;
    setSalvando(true);
    try {
      await onDesfazer();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={registro ? `Editar ${registro.titulo}` : secao.novo} onClick={onFechar}>
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#0b0f14] shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">{secao.rotulo}</p>
            <h2 className="text-xl font-bold text-white">{registro ? 'Editar registro' : secao.novo}</h2>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={rotulo}>Nome</span><input className={campo} value={titulo} maxLength={120} onChange={(evento) => setTitulo(evento.target.value)} /></label>
            <label><span className={rotulo}>Subtítulo</span><input className={campo} value={subtitulo} maxLength={160} onChange={(evento) => setSubtitulo(evento.target.value)} placeholder="Epíteto, classe, alcance..." /></label>
          </div>

          <label className="block"><span className={rotulo}>Descrição (linha em branco separa parágrafos)</span>
            <textarea className={`${campo} min-h-40 leading-7`} value={descricao} maxLength={6000} onChange={(evento) => setDescricao(evento.target.value)} />
          </label>

          <label className="block"><span className={rotulo}>Etiquetas (separadas por vírgula)</span><input className={campo} value={etiquetas} onChange={(evento) => setEtiquetas(evento.target.value)} placeholder="Ex.: Animal, Contratável" /></label>

          <section>
            <span className={rotulo}>Ficha (rótulo e valor)</span>
            <div className="space-y-2">
              {campos.map(([nome, valor], indice) => (
                <div key={indice} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                  <input className={campo} value={nome} maxLength={40} aria-label={`Rótulo ${indice + 1}`} onChange={(evento) => setCampos((atual) => atual.map((item, i) => (i === indice ? [evento.target.value, item[1]] : item)))} placeholder="Ex.: Nível" />
                  <input className={campo} value={valor} maxLength={300} aria-label={`Valor ${indice + 1}`} onChange={(evento) => setCampos((atual) => atual.map((item, i) => (i === indice ? [item[0], evento.target.value] : item)))} placeholder="Ex.: 12" />
                  <button type="button" aria-label={`Remover linha ${indice + 1}`} onClick={() => setCampos((atual) => atual.filter((_, i) => i !== indice))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-gray-500 hover:text-red-300"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {campos.length < 20 ? <button type="button" onClick={() => setCampos((atual) => [...atual, ['', '']])} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-300 hover:text-white"><Plus size={14} /> Linha da ficha</button> : null}
          </section>

          <section>
            <span className={rotulo}>Listas (Habilidades, Ataques, Efeitos...): um item por linha</span>
            <div className="space-y-3">
              {blocos.map((bloco, indice) => (
                <div key={indice} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="mb-2 flex gap-2">
                    <input className={campo} value={bloco.titulo} maxLength={60} aria-label={`Título da lista ${indice + 1}`} onChange={(evento) => setBlocos((atual) => atual.map((item, i) => (i === indice ? { ...item, titulo: evento.target.value } : item)))} placeholder="Título da lista" />
                    <button type="button" aria-label={`Remover lista ${indice + 1}`} onClick={() => setBlocos((atual) => atual.filter((_, i) => i !== indice))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-gray-500 hover:text-red-300"><Trash2 size={15} /></button>
                  </div>
                  <textarea className={`${campo} min-h-24`} value={bloco.texto} aria-label={`Itens da lista ${indice + 1}`} onChange={(evento) => setBlocos((atual) => atual.map((item, i) => (i === indice ? { ...item, texto: evento.target.value } : item)))} />
                </div>
              ))}
            </div>
            {blocos.length < 12 ? <button type="button" onClick={() => setBlocos((atual) => [...atual, { titulo: '', texto: '' }])} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-300 hover:text-white"><Plus size={14} /> Lista</button> : null}
          </section>

          <fieldset>
            <legend className={rotulo}>Quanto os jogadores enxergam</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {REVELACOES.map((opcao) => (
                <button key={opcao.id} type="button" aria-pressed={revelacao === opcao.id} onClick={() => setRevelacao(opcao.id)} className="rounded-xl border p-3 text-left transition" style={{ borderColor: revelacao === opcao.id ? '#67e8f9' : 'rgba(255,255,255,0.1)', backgroundColor: revelacao === opcao.id ? 'rgba(103,232,249,0.1)' : 'transparent' }}>
                  <span className="block text-sm font-bold text-white">{ROTULO_REVELACAO[opcao.id]}</span>
                  <span className="block text-[11px] leading-4 text-gray-500">{opcao.ajuda}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 px-6 py-4">
          {erro ? <p role="alert" className="mr-auto text-sm text-red-300">{erro}</p> : onDesfazer ? (
            <button type="button" onClick={() => void desfazer()} disabled={salvando} className="mr-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-400 hover:text-red-300 disabled:opacity-50">
              {registro?.origemId ? <RotateCcw size={14} /> : <Trash2 size={14} />} {de}
            </button>
          ) : <span className="mr-auto" />}
          <button type="button" onClick={onFechar} className="min-h-11 rounded-xl px-4 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => void salvar()} disabled={salvando} className="min-h-11 rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-5 text-sm font-bold text-cyan-100 hover:bg-cyan-300/25 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
        </footer>
      </div>
    </div>
  );
};
