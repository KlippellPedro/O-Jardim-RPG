import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookText, Feather, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { engajamentoApi, type IEntradaCronica } from '../../services/engajamentoApi';
import { confirmar } from '../../components/avisos/confirmacao';

interface CronicaCampanhaProps {
  campanhaId: string;
}

const LIMITE = 4000;
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Crônica coletiva: o que o grupo viveu, escrito à mão pelos próprios
 * jogadores e pelo Mestre. Complementa o "Anteriormente" automático, que só
 * resume números da sessão. Qualquer membro (menos observador) publica; cada
 * um edita ou apaga o que escreveu, e o Mestre modera tudo. */
export function CronicaCampanha({ campanhaId }: CronicaCampanhaProps) {
  const [entradas, setEntradas] = useState<IEntradaCronica[] | null>(null);
  const [erro, setErro] = useState('');
  const [escrevendo, setEscrevendo] = useState(false);
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
      setEscrevendo(false);
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
    if (!(await confirmar({ titulo: 'Apagar a entrada', mensagem: 'Apagar esta entrada da crônica?', rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    setErro('');
    try {
      await engajamentoApi.apagarCronica(campanhaId, id);
      carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível apagar.');
    }
  };

  // Sem nenhuma entrada, o campo já aparece aberto para a primeira.
  const formAberto = escrevendo || (entradas !== null && entradas.length === 0);

  return (
    <section className="cp-cartao" aria-label="Crônica da campanha">
      <div className="cp-cartao__cabeca">
        <h2 className="cp-cartao__titulo"><BookText size={17} aria-hidden="true" /> Crônica da campanha {entradas?.length ? <small>{entradas.length} {entradas.length === 1 ? 'página' : 'páginas'}</small> : null}</h2>
        {entradas?.length ? (
          <button type="button" onClick={() => setEscrevendo((atual) => !atual)} aria-expanded={escrevendo} className="cp-botao cp-botao--fantasma cp-botao--mini">
            {escrevendo ? <><X size={13} aria-hidden="true" /> Fechar</> : <><Feather size={13} aria-hidden="true" /> Escrever</>}
          </button>
        ) : null}
      </div>
      <p className="cp-cartao__sub">O que o grupo viveu, contado por vocês. O "Anteriormente" guarda os números; aqui fica a história.</p>

      {erro ? <p role="alert" className="cp-erro mb-3">{erro}</p> : null}

      {formAberto ? (
        <form onSubmit={publicar} className="cp-cronica__form">
          <input type="text" value={tituloNovo} onChange={(evento) => setTituloNovo(evento.target.value)} placeholder="Título (opcional)" aria-label="Título da página" maxLength={120} className="cp-campo" />
          <textarea value={textoNovo} onChange={(evento) => setTextoNovo(evento.target.value)} placeholder="O que aconteceu..." aria-label="Texto da página" maxLength={LIMITE} rows={4} className="cp-campo" />
          <div className="cp-cronica__acoes">
            <span className="cp-cronica__contador" aria-hidden="true">{textoNovo.length}/{LIMITE}</span>
            <button type="submit" disabled={!textoNovo.trim() || publicando} className="cp-botao">
              {publicando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Feather size={14} aria-hidden="true" />}
              Publicar na crônica
            </button>
          </div>
        </form>
      ) : null}

      {entradas === null ? (
        <p className="cp-vazio" aria-busy="true">Abrindo a crônica...</p>
      ) : entradas.length === 0 ? (
        <p className="cp-vazio">Ninguém escreveu nada ainda. A primeira página é sua.</p>
      ) : (
        <div className="cp-paginas">
          {entradas.map((entrada) => (
            <article key={entrada.id} className="cp-pagina">
              {editandoId === entrada.id ? (
                <div className="grid gap-2">
                  <input type="text" value={tituloEdicao} onChange={(evento) => setTituloEdicao(evento.target.value)} aria-label="Título da página" maxLength={120} className="cp-campo" />
                  <textarea value={textoEdicao} onChange={(evento) => setTextoEdicao(evento.target.value)} aria-label="Texto da página" maxLength={LIMITE} rows={4} className="cp-campo" />
                  <div className="cp-cronica__acoes">
                    <button type="button" onClick={() => setEditandoId(null)} className="cp-botao cp-botao--fantasma cp-botao--mini">Cancelar</button>
                    <button type="button" onClick={() => void salvarEdicao(entrada.id)} disabled={!textoEdicao.trim() || salvandoEdicao} className="cp-botao cp-botao--mini">
                      {salvandoEdicao ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : null} Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="cp-pagina__cabeca">
                    <div className="min-w-0">
                      {entrada.titulo ? <h3 className="cp-pagina__titulo">{entrada.titulo}</h3> : null}
                      <p className="cp-pagina__meta">Por {entrada.publicado_por} · {dataCurta(entrada.criado_em)}</p>
                    </div>
                    {entrada.pode_editar ? (
                      <span className="cp-pagina__acoes">
                        <button type="button" onClick={() => iniciarEdicao(entrada)} aria-label="Editar entrada" className="cp-botao-icone"><Pencil size={13} /></button>
                        <button type="button" onClick={() => void apagar(entrada.id)} aria-label="Apagar entrada" className="cp-botao-icone cp-botao-icone--perigo"><Trash2 size={13} /></button>
                      </span>
                    ) : null}
                  </div>
                  <p className="cp-pagina__texto">{entrada.texto}</p>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
