import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Settings, FileClock, BarChart3, Bell, UserPlus, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { personagensApi, PersonagemApiRecord } from '../../services/personagensApi';
import { campanhasApi } from '../../services/campanhasApi';
import { ConfiguracaoCampanha } from '../../components/Settings/ConfiguracaoCampanha';
import { ConvitesCampanha } from '../../components/Settings/ConvitesCampanha';
import { MembrosCampanha } from '../../components/Settings/MembrosCampanha';
import { ConcederItemModal } from '../../components/Settings/ConcederItemModal';
import { LogsMestrePanel } from '../../components/Settings/LogsMestrePanel';
import { EstatisticasCampanha } from '../../components/Settings/EstatisticasCampanha';
import { PersonagensPainel } from '../../components/Settings/PersonagensPainel';
import { CaixaDeAvisos } from '../../components/caixaDeAvisos/CaixaDeAvisos';
import { PainelCartao, PainelShell, type IAbaDoPainel } from '../../components/painel/PainelShell';
import { useAbaNaUrl } from '../../components/painel/useAbaNaUrl';
import { SeletorDeCampanha } from '../Campanha/SeletorDeCampanha';

interface MembroCampanha {
  id: string;
  nome_exibicao: string;
}

const ABAS_DO_MESTRE = ['personagens', 'mesa', 'avisos', 'estatisticas', 'logs', 'configuracoes'] as const;
type AbaDoMestre = typeof ABAS_DO_MESTRE[number];

export const MasterPage = () => {
  const { campanhaAtiva, usuario } = useAuthStore();
  const avisosDaMesa = useAuthStore((estado) => estado.avisos.mestre);
  const [aba, trocarAba] = useAbaNaUrl<AbaDoMestre>(ABAS_DO_MESTRE, 'personagens');
  const [personagens, setPersonagens] = useState<PersonagemApiRecord[]>([]);
  const [membros, setMembros] = useState<MembroCampanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [transferindoId, setTransferindoId] = useState<string | null>(null);
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null);
  const [concedendoParaId, setConcedendoParaId] = useState<string | null>(null);

  // Assistente também gerencia conteúdo da campanha (convites, auditoria) -
  // só ações mais sensíveis (arquivar, trocar papel, transferir dono) ficam
  // reservadas ao mestre de verdade, gated dentro de cada painel. Editar
  // lore/regras/loja/visibilidade não é mais coisa deste painel - isso é
  // exclusivo do criador da plataforma, em /criador.
  const isMestre = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente'
    || usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador';
  const campanhaId = campanhaAtiva?.id;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!campanhaId || !isMestre) {
      setLoading(false);
      return undefined;
    }
    // Trocou de mesa: a lista da anterior não pode aparecer enquanto a nova carrega.
    let valido = true;
    setLoading(true);
    setPersonagens([]);
    setMembros([]);
    Promise.all([
      personagensApi.listar(campanhaId, true),
      campanhasApi.obter(campanhaId) as Promise<{ membros?: MembroCampanha[] }>,
    ])
      .then(([personagensRes, campanhaRes]) => {
        if (!valido) return;
        setPersonagens(personagensRes.personagens || []);
        setMembros(campanhaRes.membros || []);
      })
      .catch(err => console.error("Erro ao listar personagens", err))
      .finally(() => { if (valido) setLoading(false); });
    return () => { valido = false; };
  }, [campanhaId, isMestre]);

  const abas = useMemo<IAbaDoPainel<AbaDoMestre>[]>(() => [
    { id: 'personagens', rotulo: 'Personagens', icone: Users },
    { id: 'mesa', rotulo: 'Membros e Convites', icone: UserPlus },
    { id: 'avisos', rotulo: 'Avisos', icone: Bell, contagem: avisosDaMesa },
    { id: 'estatisticas', rotulo: 'Estatísticas', icone: BarChart3 },
    { id: 'logs', rotulo: 'Logs', icone: FileClock },
    { id: 'configuracoes', rotulo: 'Configurações', icone: Settings },
  ], [avisosDaMesa]);

  const handleTransferirDono = async (personagemId: string, novoDonoUsuarioId: string) => {
    if (!novoDonoUsuarioId) return;
    setTransferindoId(personagemId);
    setErroTransferencia(null);
    try {
      const resultado = await personagensApi.transferirDono(personagemId, novoDonoUsuarioId);
      setPersonagens(prev => prev.map(p => (
        p.id === personagemId
          ? { ...p, dono_usuario_id: resultado.dono_usuario_id, dono_nome: resultado.dono_nome }
          : p
      )));
    } catch (err: any) {
      setErroTransferencia(err?.message || 'Nao foi possivel transferir o personagem.');
    } finally {
      setTransferindoId(null);
    }
  };

  if (!isMestre) {
    return (
      <div className="app-page flex flex-col items-center justify-center gap-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center">
          <Shield size={48} className="mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-sm">Apenas o mestre da campanha tem acesso a este painel.</p>
        </div>
        {/* Quem chegou aqui trocando de mesa pelo seletor precisa poder voltar para uma mesa onde comanda. */}
        <SeletorDeCampanha />
      </div>
    );
  }

  return (
    <PainelShell
      icone={LayoutDashboard}
      titulo="Painel do Mestre"
      subtitulo={<>Visão geral da campanha <span className="font-bold text-primary">{campanhaAtiva?.nome}</span></>}
      acoes={<SeletorDeCampanha />}
      abas={abas}
      abaAtiva={aba}
      aoTrocarAba={trocarAba}
    >
      <motion.div key={aba} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {aba === 'personagens' && (
          <PersonagensPainel
            personagens={personagens}
            membros={membros}
            loading={loading}
            busca={busca}
            onBuscaChange={setBusca}
            transferindoId={transferindoId}
            erroTransferencia={erroTransferencia}
            onTransferir={handleTransferirDono}
            onConcederNovo={() => setConcedendoParaId('')}
            onConcederPara={(personagemId) => setConcedendoParaId(personagemId)}
          />
        )}

        {aba === 'mesa' && (
          <PainelCartao>
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <MembrosCampanha />
              <ConvitesCampanha />
            </div>
          </PainelCartao>
        )}

        {aba === 'avisos' && campanhaId && (
          <PainelCartao>
            <CaixaDeAvisos
              painel="mestre"
              campanhaId={campanhaId}
              mostrarMesa={false}
              textoVazio="Nenhum aviso da mesa por enquanto. Quem entrar, mudar de classe ou salvar uma ficha fora das regras aparece aqui."
            />
          </PainelCartao>
        )}

        {aba === 'estatisticas' && (
          <PainelCartao>
            <EstatisticasCampanha personagens={personagens} loading={loading} />
          </PainelCartao>
        )}

        {aba === 'logs' && campanhaId && (
          <LogsMestrePanel
            campanhaId={campanhaId}
            personagens={personagens.map((personagem) => ({ id: personagem.id, nome: personagem.nome }))}
            membros={membros.map((membro) => ({ id: membro.id, nome: membro.nome_exibicao }))}
          />
        )}

        {aba === 'configuracoes' && (
          <PainelCartao>
            <ConfiguracaoCampanha />
          </PainelCartao>
        )}
      </motion.div>

      {campanhaAtiva && (
        <ConcederItemModal
          isOpen={concedendoParaId !== null}
          onClose={() => setConcedendoParaId(null)}
          campanhaId={campanhaAtiva.id}
          personagens={personagens.map((p) => ({ id: p.id, nome: p.nome }))}
          personagemInicialId={concedendoParaId || undefined}
        />
      )}
    </PainelShell>
  );
};

export default MasterPage;
