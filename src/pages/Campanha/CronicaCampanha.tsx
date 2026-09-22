import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookText, Loader2, Pencil, Trash2 } from 'lucide-react';
import { engajamentoApi, type IEntradaCronica } from '../../services/engajamentoApi';

const cartao = 'rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-5';
const tituloSecao = 'mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500';
const campoTexto = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm leading-6 text-white placeholder:text-gray-600 focus:border-primary/50 focus:outline-none';

interface CronicaCampanhaProps {
  campanhaId: string;
  cor: string;
}

/** Crônica coletiva: o que o grupo viveu, escrito à mão pelos próprios
 * jogadores e pelo Mestre - complementa o "Anteriormente" automático, que só
 * resume números da sessão. Qualquer membro (menos observador) publica; cada
 * um edita ou apaga o que escreveu, e o Mestre modera tudo. */
export function CronicaCampanha({ campanhaId, cor }: CronicaCampanhaProps) {
  const [entradas, setEntradas] = useState<IEntradaCronica[] | null>(null);
  const [erro, setErro] = useState('');
  const [tituloNovo, setTituloNovo] = useState('');
  const [textoNovo, setTextoNovo] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tituloEdicao, setTituloEdicao] = useState('');
  const [textoEdicao, setTextoEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregar = useCallback(() => {
    engajamentoApi.cronica(campanhaId)
      .then((resposta) => setEntradas(resposta.entradas))
      .catch(() => setEntradas([]));
  }, [campanhaId]);

  useEffect(() => { setEntradas(null); carregar(); }, [carregar]);

  const publicar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!textoNovo.trim() || publicando) return;
    setPublicando(true);
    setErro('');
    try {
      await engajamentoApi.publicarCronica(campanhaId, tituloNovo.trim(), textoNovo.trim());
      setTituloNovo('');
      setTextoNovo('');
      carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível publicar.');
    } finally {
      setPublicando(false);
    }
  };

  const iniciarEdicao = (entrada: IEntradaCronica) => {
    setEditandoId(entrada.id);
    setTituloEdicao(entrada.titulo);
    setTextoEdicao(entrada.texto);
  };

  const salvarEdicao = async (id: string) => {
    if (!textoEdicao.trim() || salvandoEdicao) return;
    setSalvandoEdicao(true);
    setErro('');
    try {
      await engajamentoApi.editarCronica(campanhaId, id, tituloEdicao.trim(), textoEdicao.trim());
      setEditandoId(null);
      carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a edição.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const apagar = async (id: string) => {
    if (!window.confirm('Apagar esta entrada da crônica?')) return;
    setErro('');
    try {
      await engajamentoApi.apagarCronica(campanhaId, id);
      carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível apagar.');
    }
  };

  return (
    <section className={cartao} aria-label="Crônica da campanha">
      <h2 className={tituloSecao}><BookText size={14} style={{ color: cor }} /> Crônica da campanha</h2>
      <p className="mb-4 text-xs leading-5 text-gray-500">
        O que o grupo viveu, escrito por vocês - diferente do resumo automático de "Anteriormente".
      </p>

      {erro ? <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200">{erro}</p> : null}

      <form onSubmit={publicar} className="mb-5 space-y-2 rounded-2xl border border-white/[0.07] bg-black/25 p-3">
        <input
          type="text"
          value={tituloNovo}
          onChange={(evento) => setTituloNovo(evento.target.value)}
          placeholder="Título (opcional)"
          maxLength={120}
          className={campoTexto}
        />
        <textarea
          value={textoNovo}
          onChange={(evento) => setTextoNovo(evento.target.value)}
          placeholder="O que aconteceu..."
          maxLength={4000}
          rows={3}
          className={`resize-y ${campoTexto}`}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!textoNovo.trim() || publicando}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: cor }}
          >
            {publicando ? <Loader2 size={14} className="animate-spin" /> : null}
            Publicar na crônica
          </button>
        </div>
      </form>

      {entradas === null ? (
        <p className="text-sm text-gray-500" aria-busy="true">Abrindo a crônica...</p>
      ) : entradas.length === 0 ? (
        <p className="text-sm text-gray-500">Ninguém escreveu nada ainda. Seja a primeira entrada.</p>
      ) : (
        <ul className="space-y-3">
          {entradas.map((entrada) => (
            <li key={entrada.id} className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
              {editandoId === entrada.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tituloEdicao}
                    onChange={(evento) => setTituloEdicao(evento.target.value)}
                    maxLength={120}
                    className={campoTexto}
                  />
                  <textarea
                    value={textoEdicao}
                    onChange={(evento) => setTextoEdicao(evento.target.value)}
                    maxLength={4000}
                    rows={3}
                    className={`resize-y ${campoTexto}`}
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditandoId(null)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void salvarEdicao(entrada.id)}
                      disabled={!textoEdicao.trim() || salvandoEdicao}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ backgroundColor: cor }}
                    >
                      {salvandoEdicao ? <Loader2 size={12} className="animate-spin" /> : null} Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      {entrada.titulo ? <span className="block font-bold text-white">{entrada.titulo}</span> : null}
                      <span className="text-[11px] text-gray-500">
                        {entrada.publicado_por} · {new Date(entrada.criado_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                    {entrada.pode_editar ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => iniciarEdicao(entrada)} aria-label="Editar entrada" className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white">
                          <Pencil size={13} />
                        </button>
                        <button type="button" onClick={() => void apagar(entrada.id)} aria-label="Apagar entrada" className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-gray-300">{entrada.texto}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
