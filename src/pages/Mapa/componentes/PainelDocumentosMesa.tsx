import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { documentosApi, type IResumoDocumento } from '../../../services/documentosApi';
import { mapaRecursosApi } from '../../../services/mapaRecursosApi';

interface JogadorAlvo {
  personagemId: string;
  nome: string;
}

export const PainelDocumentosMesa = ({
  aberto, campanhaId, jogadores, onFechar,
}: { aberto: boolean; campanhaId: string; jogadores: JogadorAlvo[]; onFechar: () => void }) => {
  const [documentos, setDocumentos] = useState<IResumoDocumento[]>([]);
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
    void documentosApi.listar(campanhaId).then((resposta) => {
      if (!vivo) return;
      setDocumentos(resposta.documentos);
      setEscolhido((atual) => resposta.documentos.some((documento) => documento.id === atual) ? atual : resposta.documentos[0]?.id ?? '');
    }).catch((falha) => avisarErro(falha, 'Não foi possível carregar os documentos do Mestre.'))
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [aberto, campanhaId]);

  if (!aberto) return null;

  const mostrar = async () => {
    if (!escolhido) return;
    setEnviando(true);
    try {
      await mapaRecursosApi.mostrarDocumento(campanhaId, escolhido, destino === 'todos' ? null : [destino]);
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
        : documentos.length
          ? <>
            <label className="mapa-menu-linha">Documento
              <select value={escolhido} onChange={(evento) => setEscolhido(evento.target.value)}>
                {documentos.map((documento) => <option key={documento.id} value={documento.id}>{documento.titulo}</option>)}
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
          : <p className="mapa-dica">Ainda não há documentos salvos no Painel do Mestre.</p>}
      <p className="mapa-dica">O documento aparece para quem recebeu e pode ser fechado em cada aparelho.</p>
    </section>
  );
};
