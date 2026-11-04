import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Crown, Shield, Trash2, UserRound, Users, X } from 'lucide-react';
import { avisar } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import {
  campanhasApi,
  type IConviteCampanha,
  type IDetalheCampanha,
  type IMembroCampanha,
  type PapelCampanha,
} from '../../../services/campanhasApi';
import type { CamadaMapaId, IPermissoesMesa } from '../../../services/mapaApi';

interface PessoaOnline {
  usuario_id: string;
  nome: string;
  cor: string;
  gestor: boolean;
  papel?: PapelCampanha;
}

interface Props {
  aberto: boolean;
  campanhaId: string;
  usuarioId: string | null;
  gestor: boolean;
  online: PessoaOnline[];
  onFechar: () => void;
}

const CAMADAS: Array<{ id: CamadaMapaId; nome: string }> = [
  { id: 'mapa', nome: 'Mapa' },
  { id: 'props', nome: 'Itens e props' },
  { id: 'montarias', nome: 'Montarias' },
  { id: 'personagens', nome: 'Personagens e tokens' },
  { id: 'anotacoes', nome: 'Anotações' },
];

const ROTULO_PAPEL: Record<PapelCampanha, string> = {
  mestre: 'Mestre',
  assistente: 'Assistente',
  jogador: 'Jogador',
  observador: 'Observador',
};

const PERMISSOES_PADRAO = (papel: PapelCampanha): IPermissoesMesa => ({
  mover_tokens: papel !== 'observador',
  usar_ping: papel !== 'observador',
  usar_regua: papel !== 'observador',
  usar_magia: papel !== 'observador',
  camadas: { mapa: true, props: true, montarias: true, personagens: true, anotacoes: true },
});

function permissoesDo(membro: IMembroCampanha): IPermissoesMesa {
  const padrao = PERMISSOES_PADRAO(membro.papel);
  const guardadas = membro.permissoes_mesa && typeof membro.permissoes_mesa === 'object'
    ? membro.permissoes_mesa as Record<string, unknown>
    : {};
  const camadasGuardadas = guardadas.camadas && typeof guardadas.camadas === 'object'
    ? guardadas.camadas as Record<string, unknown>
    : {};
  const acao = (chave: keyof Omit<IPermissoesMesa, 'camadas'>) =>
    typeof guardadas[chave] === 'boolean' ? guardadas[chave] as boolean : padrao[chave];
  return {
    mover_tokens: acao('mover_tokens'),
    usar_ping: acao('usar_ping'),
    usar_regua: acao('usar_regua'),
    usar_magia: acao('usar_magia'),
    camadas: Object.fromEntries(CAMADAS.map(({ id }) => [
      id,
      typeof camadasGuardadas[id] === 'boolean' ? camadasGuardadas[id] : padrao.camadas[id],
    ])) as IPermissoesMesa['camadas'],
  };
}

function dataCurta(valor: string): string {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'data desconhecida' : data.toLocaleDateString('pt-BR');
}

function membroDaPresenca(pessoa: PessoaOnline): IMembroCampanha {
  return {
    id: pessoa.usuario_id,
    nome_exibicao: pessoa.nome,
    papel: pessoa.papel ?? (pessoa.gestor ? 'assistente' : 'jogador'),
    status: 'ativo',
    nome_mesa: null,
    cor_mesa: pessoa.cor,
    permissoes_mesa: {},
    externo: true,
  };
}

interface LinhaProps {
  membro: IMembroCampanha;
  online: PessoaOnline | undefined;
  gestor: boolean;
  mestre: boolean;
  donoId: string | undefined;
  propria: boolean;
  ocupado: boolean;
  onSalvarIdentidade: (membro: IMembroCampanha, nome: string | null, cor: string | null) => void;
  onAlterarPapel: (membro: IMembroCampanha, papel: PapelCampanha) => void;
  onRemover: (membro: IMembroCampanha) => void;
  onPermissao: (membro: IMembroCampanha, parcial: Partial<IPermissoesMesa>) => void;
}

const LinhaJogador = ({
  membro, online, gestor, mestre, donoId, propria, ocupado,
  onSalvarIdentidade, onAlterarPapel, onRemover, onPermissao,
}: LinhaProps) => {
  const [nome, setNome] = useState(membro.nome_mesa ?? membro.nome_exibicao);
  const [cor, setCor] = useState(membro.cor_mesa ?? online?.cor ?? '#8b5cf6');
  const permissoes = permissoesDo(membro);
  const podeEditarIdentidade = (gestor && !membro.externo) || propria;
  const criador = membro.papel_plataforma === 'criador';
  const podeGerenciar = gestor && !['mestre', 'assistente'].includes(membro.papel);

  useEffect(() => {
    setNome(membro.nome_mesa ?? membro.nome_exibicao);
    setCor(membro.cor_mesa ?? online?.cor ?? '#8b5cf6');
  }, [membro.id, membro.nome_mesa, membro.nome_exibicao, membro.cor_mesa, online?.cor]);

  const salvar = () => {
    const nomeLimpo = nome.trim();
    onSalvarIdentidade(
      membro,
      nomeLimpo && nomeLimpo !== membro.nome_exibicao ? nomeLimpo : null,
      cor === (online?.cor ?? '#8b5cf6') ? null : cor,
    );
  };

  const restaurar = () => {
    setNome(membro.nome_exibicao);
    setCor(online?.cor ?? '#8b5cf6');
    onSalvarIdentidade(membro, null, null);
  };

  return (
    <article className="mapa-jogador">
      <div className="mapa-jogador-topo">
        <span className="mapa-jogador-icone" style={{ backgroundColor: `${membro.cor_mesa ?? online?.cor ?? '#8b5cf6'}30`, borderColor: membro.cor_mesa ?? online?.cor ?? '#8b5cf6', color: membro.cor_mesa ?? online?.cor ?? '#8b5cf6' }}>
          {membro.papel === 'mestre' || criador ? <Crown size={17} /> : membro.papel === 'assistente' ? <Shield size={16} /> : (membro.nome_mesa ?? membro.nome_exibicao).slice(0, 1).toUpperCase()}
        </span>
        <span className="mapa-jogador-titulo">
          <strong>{membro.nome_mesa ?? membro.nome_exibicao}</strong>
          <small>{criador ? 'Criador' : ROTULO_PAPEL[membro.papel]} · {online ? 'Na mesa agora' : 'Desconectado'}</small>
        </span>
        {mestre && !propria && !membro.externo && membro.id !== donoId && (
          <select aria-label={`Papel de ${membro.nome_exibicao}`} value={membro.papel} disabled={ocupado} onChange={(evento) => onAlterarPapel(membro, evento.target.value as PapelCampanha)}>
            <option value="mestre">Mestre</option>
            <option value="assistente">Assistente</option>
            <option value="jogador">Jogador</option>
            <option value="observador">Observador</option>
          </select>
        )}
        {mestre && membro.id === donoId && <span className="mapa-jogador-dono">Dono</span>}
      </div>

      {podeEditarIdentidade && (
        <div className="mapa-jogador-identidade">
          <label>
            Nome na mesa
            <input value={nome} maxLength={32} onChange={(evento) => setNome(evento.target.value)} />
          </label>
          <label className="mapa-jogador-cor">
            Cor
            <input type="color" value={cor} onChange={(evento) => setCor(evento.target.value)} aria-label={`Cor de ${membro.nome_exibicao}`} />
          </label>
          <button type="button" className="mapa-botao" disabled={ocupado || (nome.trim() === (membro.nome_mesa ?? membro.nome_exibicao) && cor === (membro.cor_mesa ?? online?.cor ?? '#8b5cf6'))} onClick={salvar}>
            <Check size={13} /> Salvar
          </button>
          {(membro.nome_mesa || membro.cor_mesa) && <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={restaurar}>Restaurar</button>}
        </div>
      )}

      {podeGerenciar && (
        <details className="mapa-jogador-permissoes">
          <summary>Permissões</summary>
          <label><input type="checkbox" checked={permissoes.mover_tokens} disabled={ocupado} onChange={(evento) => onPermissao(membro, { mover_tokens: evento.target.checked })} /> Mover tokens</label>
          <label><input type="checkbox" checked={permissoes.usar_ping} disabled={ocupado} onChange={(evento) => onPermissao(membro, { usar_ping: evento.target.checked })} /> Usar ping</label>
          <label><input type="checkbox" checked={permissoes.usar_regua} disabled={ocupado} onChange={(evento) => onPermissao(membro, { usar_regua: evento.target.checked })} /> Usar régua</label>
          <label><input type="checkbox" checked={permissoes.usar_magia} disabled={ocupado} onChange={(evento) => onPermissao(membro, { usar_magia: evento.target.checked })} /> Lançar efeitos de magia</label>
          <span className="mapa-jogador-permissoes-rotulo">Pode ver</span>
          {CAMADAS.map((camada) => (
            <label key={camada.id}><input type="checkbox" checked={permissoes.camadas[camada.id]} disabled={ocupado} onChange={(evento) => onPermissao(membro, { camadas: { ...permissoes.camadas, [camada.id]: evento.target.checked } })} /> {camada.nome}</label>
          ))}
        </details>
      )}

      {mestre && !propria && !membro.externo && membro.id !== donoId && (
        <button type="button" className="mapa-jogador-remover" disabled={ocupado} onClick={() => onRemover(membro)}>
          <Trash2 size={13} /> Remover da campanha
        </button>
      )}
    </article>
  );
};

export const PainelJogadores = ({ aberto, campanhaId, usuarioId, gestor, online, onFechar }: Props) => {
  const [detalhe, setDetalhe] = useState<IDetalheCampanha | null>(null);
  const [convites, setConvites] = useState<IConviteCampanha[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [papelConvite, setPapelConvite] = useState<'jogador' | 'assistente' | 'observador'>('jogador');
  const [codigoGerado, setCodigoGerado] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [novoDetalhe, listaConvites] = await Promise.all([
        campanhasApi.obter(campanhaId),
        gestor ? campanhasApi.listarConvites(campanhaId) : Promise.resolve({ convites: [] }),
      ]);
      setDetalhe(novoDetalhe);
      setConvites(listaConvites.convites);
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível carregar os jogadores.');
    } finally {
      setCarregando(false);
    }
  }, [campanhaId, gestor]);

  useEffect(() => {
    if (aberto) void carregar();
  }, [aberto, carregar]);

  if (!aberto) return null;

  // O Mestre e o Criador também aparecem aqui: quem está conectado e não é membro entra pela presença.
  const membrosDaCampanha = detalhe?.membros ?? [];
  const membros = gestor
    ? [
      ...membrosDaCampanha,
      ...online.filter((pessoa) => !membrosDaCampanha.some((membro) => membro.id === pessoa.usuario_id)).map(membroDaPresenca),
    ]
    : online.map(membroDaPresenca);
  const mestre = detalhe?.meu_papel === 'mestre';

  const salvarIdentidade = async (membro: IMembroCampanha, nome: string | null, cor: string | null) => {
    setOcupado(membro.id);
    try {
      await campanhasApi.atualizarIdentidadeMesa(campanhaId, membro.id, { nome_mesa: nome, cor_mesa: cor });
      avisar.sucesso('Identidade da mesa salva.');
      await carregar();
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível salvar a identidade.');
    } finally {
      setOcupado(null);
    }
  };

  const mudarPapel = async (membro: IMembroCampanha, papel: PapelCampanha) => {
    if (!(await confirmar({ mensagem: `Mudar ${membro.nome_exibicao} para ${ROTULO_PAPEL[papel]}?`, rotuloConfirmar: 'Mudar papel' }))) return;
    setOcupado(membro.id);
    try {
      await campanhasApi.alterarPapel(campanhaId, membro.id, papel);
      avisar.sucesso('Papel atualizado.');
      await carregar();
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível mudar o papel.');
    } finally {
      setOcupado(null);
    }
  };

  const removerMembro = async (membro: IMembroCampanha) => {
    if (!(await confirmar({ mensagem: `Remover ${membro.nome_exibicao} da campanha? As fichas e o histórico continuam salvos.`, rotuloConfirmar: 'Remover', tom: 'perigo' }))) return;
    setOcupado(membro.id);
    try {
      await campanhasApi.removerMembro(campanhaId, membro.id);
      avisar.sucesso('Acesso removido.');
      await carregar();
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível remover esta pessoa.');
    } finally {
      setOcupado(null);
    }
  };

  const salvarPermissao = async (membro: IMembroCampanha, parcial: Partial<IPermissoesMesa>) => {
    const atual = permissoesDo(membro);
    const nova = {
      ...atual,
      ...parcial,
      camadas: { ...atual.camadas, ...(parcial.camadas ?? {}) },
    };
    setOcupado(membro.id);
    setDetalhe((valor) => valor ? {
      ...valor,
      membros: valor.membros.map((item) => item.id === membro.id ? { ...item, permissoes_mesa: nova } : item),
    } : valor);
    try {
      await campanhasApi.atualizarPermissoesMesa(campanhaId, membro.id, nova as unknown as Record<string, unknown>);
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível salvar as permissões.');
      await carregar();
    } finally {
      setOcupado(null);
    }
  };

  const criarConvite = async () => {
    setOcupado('convite');
    setCodigoGerado('');
    try {
      const resposta = await campanhasApi.criarConvite(campanhaId, { papel: papelConvite, expira_em_dias: 7, max_usos: 1 });
      setCodigoGerado(resposta.codigo);
      avisar.sucesso('Convite criado. Copie o código e envie para a pessoa.');
      await carregar();
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível criar o convite.');
    } finally {
      setOcupado(null);
    }
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigoGerado);
      avisar.sucesso('Código copiado.');
    } catch {
      avisar.info('Selecione e copie o código do convite.');
    }
  };

  const revogarConvite = async (convite: IConviteCampanha) => {
    if (!(await confirmar({ mensagem: 'Revogar este convite? O código deixa de funcionar.', rotuloConfirmar: 'Revogar', tom: 'perigo' }))) return;
    setOcupado(convite.id);
    try {
      await campanhasApi.revogarConvite(campanhaId, convite.id);
      setConvites((lista) => lista.filter((item) => item.id !== convite.id));
      avisar.sucesso('Convite revogado.');
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível revogar o convite.');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <section className="mapa-config mapa-jogadores" aria-label="Jogadores e permissões">
      <header>
        <div className="mapa-jogadores-titulo"><Users size={17} /><strong>Jogadores</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar jogadores" onClick={onFechar}><X size={16} /></button>
      </header>
      {carregando && <p className="mapa-dica">Carregando a mesa...</p>}
      {!carregando && membros.length === 0 && <p className="mapa-dica">Ninguém está conectado no momento.</p>}
      <div className="mapa-jogadores-lista">
        {membros.map((membro) => (
          <LinhaJogador
            key={membro.id}
            membro={membro}
            online={online.find((pessoa) => pessoa.usuario_id === membro.id)}
            gestor={gestor}
            mestre={Boolean(mestre)}
            donoId={detalhe?.campanha.dono_id}
            propria={membro.id === usuarioId}
            ocupado={ocupado === membro.id}
            onSalvarIdentidade={(item, nome, cor) => void salvarIdentidade(item, nome, cor)}
            onAlterarPapel={(item, papel) => void mudarPapel(item, papel)}
            onRemover={(item) => void removerMembro(item)}
            onPermissao={(item, parcial) => void salvarPermissao(item, parcial)}
          />
        ))}
      </div>

      {gestor && (
        <>
          <section className="mapa-jogadores-convites" aria-label="Convidar jogadores">
            <strong>Convidar para a campanha</strong>
            <div className="mapa-jogadores-convite-novo">
              <select value={papelConvite} onChange={(evento) => setPapelConvite(evento.target.value as typeof papelConvite)}>
                <option value="jogador">Jogador</option>
                <option value="observador">Observador</option>
                <option value="assistente">Assistente</option>
              </select>
              <button type="button" className="mapa-botao" disabled={ocupado === 'convite'} onClick={() => void criarConvite()}><UserRound size={13} /> Criar convite</button>
            </div>
            {codigoGerado && (
              <div className="mapa-jogadores-codigo">
                <input readOnly value={codigoGerado} aria-label="Código do convite" onFocus={(evento) => evento.currentTarget.select()} />
                <button type="button" className="mapa-icone" aria-label="Copiar código do convite" onClick={() => void copiarCodigo()}><Copy size={14} /></button>
              </div>
            )}
          </section>
          {convites.length > 0 && (
            <section className="mapa-jogadores-convites" aria-label="Convites ativos">
              <strong>Convites ativos</strong>
              {convites.map((convite) => (
                <div className="mapa-jogadores-convite" key={convite.id}>
                  <span>{ROTULO_PAPEL[convite.papel]} · vence {dataCurta(convite.expira_em)}</span>
                  <button type="button" className="mapa-icone" aria-label="Revogar convite" disabled={ocupado === convite.id} onClick={() => void revogarConvite(convite)}><Trash2 size={13} /></button>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {!gestor && <p className="mapa-dica">Você pode ajustar como seu nome e sua cor aparecem nesta mesa.</p>}
    </section>
  );
};
