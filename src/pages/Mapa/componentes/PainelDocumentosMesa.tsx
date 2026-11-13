import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { documentosApi, type IDocumentoUniversal, type IResumoDocumento } from '../../../services/documentosApi';
import { mapaRecursosApi } from '../../../services/mapaRecursosApi';

/** Agrupa na ordem em que cada tema aparece (a ordem do arquivo é a curadoria). Não importa o módulo da Oficina: ele puxa todos os modelos para o mapa. */
function porTema(documentos: IDocumentoUniversal[]): Array<{ tema: string; itens: IDocumentoUniversal[] }> {
  const grupos = new Map<string, IDocumentoUniversal[]>();
  for (const documento of documentos) {
    const tema = documento.tema.trim() || 'Outros';
    grupos.set(tema, [...(grupos.get(tema) ?? []), documento]);
  }
  return [...grupos].map(([tema, itens]) => ({ tema, itens }));
}

interface JogadorAlvo {
  personagemId: string;
  nome: string;
}

export const PainelDocumentosMesa = ({
  aberto, campanhaId, jogadores, onFechar,
}: { aberto: boolean; campanhaId: string; jogadores: JogadorAlvo[]; onFechar: () => void }) => {
  const [documentos, setDocumentos] = useState<IResumoDocumento[]>([]);
  const [universais, setUniversais] = useState<IDocumentoUniversal[]>([]);
  const [escolhido, setEscolhido] = useState('');
  const [destino, setDestino] = useState('todos');
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const alvos = useMemo(() => {
    const vistos = new Set<string>();
    return jogadores.filter((jogador) => {
      if (!jogador.personagemId || vistos.has(jogador.personagemId)) return false;
      vistos.add(jogador.personagemId);
      return true;
    });
  }, [jogadores]);

  useEffect(() => {
    if (!aberto || !campanhaId) return;
    let vivo = true;
    setCarregando(true);
    // Os salvos da mesa e os universais vêm de rotas separadas: se uma falha, a outra lista continua valendo.
    void Promise.allSettled([documentosApi.listar(campanhaId), documentosApi.universais(campanhaId)]).then(([salvos, prontos]) => {
      if (!vivo) return;
      const listaSalvos = salvos.status === 'fulfilled' ? salvos.value.documentos : [];
      const listaProntos = prontos.status === 'fulfilled' ? prontos.value.documentos : [];
      setDocumentos(listaSalvos);
      setUniversais(listaProntos);
      const valores = [...listaSalvos.map((d) => `salvo:${d.id}`), ...listaProntos.map((d) => `universal:${d.id}`)];
      setEscolhido((atual) => valores.includes(atual) ? atual : valores[0] ?? '');
      if (salvos.status === 'rejected') avisarErro(salvos.reason, 'Não foi possível carregar os documentos salvos da mesa.');
      if (prontos.status === 'rejected') avisarErro(prontos.reason, 'Não foi possível carregar os documentos universais.');
    }).finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [aberto, campanhaId]);

  if (!aberto) return null;

  const mostrar = async () => {
    if (!escolhido) return;
    setEnviando(true);
    try {
      const para = destino === 'todos' ? null : [destino];
      const [tipo, id] = [escolhido.slice(0, escolhido.indexOf(':')), escolhido.slice(escolhido.indexOf(':') + 1)];
      if (tipo === 'universal') await mapaRecursosApi.mostrarDocumentoUniversal(campanhaId, id, para);
      else await mapaRecursosApi.mostrarDocumento(campanhaId, id, para);
      avisar.sucesso(destino === 'todos' ? 'Documento enviado para a mesa.' : 'Documento enviado ao jogador escolhido.');
    } catch (falha) {
      avisarErro(falha, 'Não foi possível mostrar o documento.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mapa-recurso-painel" aria-label="Documentos na mesa">
      <header>
        <strong>Mostrar um documento</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar documentos" onClick={onFechar}><X size={16} /></button>
      </header>
      {carregando
        ? <p className="mapa-dica"><Loader2 size={14} className="girando" /> Abrindo documentos...</p>
        : documentos.length || universais.length
          ? <>
            <label className="mapa-menu-linha">Documento
              <select value={escolhido} onChange={(evento) => setEscolhido(evento.target.value)}>
                {documentos.length > 0 && (
                  <optgroup label="Salvos nesta mesa">
                    {documentos.map((documento) => <option key={documento.id} value={`salvo:${documento.id}`}>{documento.titulo}</option>)}
                  </optgroup>
                )}
                {porTema(universais).map((grupo) => (
                  <optgroup key={grupo.tema} label={`Universais: ${grupo.tema}`}>
                    {grupo.itens.map((documento) => <option key={documento.id} value={`universal:${documento.id}`}>{documento.titulo}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="mapa-menu-linha">Mostrar para
              <select value={destino} onChange={(evento) => setDestino(evento.target.value)}>
                <option value="todos">Todos os jogadores</option>
                {alvos.map((jogador) => <option key={jogador.personagemId} value={jogador.personagemId}>{jogador.nome}</option>)}
              </select>
            </label>
            <button type="button" className="mapa-botao destaque" disabled={enviando || !escolhido} onClick={() => void mostrar()}>
              {enviando ? <Loader2 size={14} className="girando" /> : <Send size={14} />} Mostrar na mesa
            </button>
          </>
          : <p className="mapa-dica">Não há documentos salvos nesta mesa nem universais para mostrar.</p>}
      <p className="mapa-dica">O documento aparece para quem recebeu e pode ser fechado em cada aparelho.</p>
    </section>
  );
};
