import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Dices,
  Flame,
  LockKeyhole,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { registrosApi } from '../../../services/registrosApi';
import {
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  FLUXOS_POR_ID,
  circuloRotulo,
  dtConjuracaoPorCirculo,
  magiaElegivelParaAprender,
  ritualElegivelParaAprender,
  seloElegivelParaAprender,
  encantamentoElegivelParaAprender,
  podeRealizarRitual,
  cicatrizesDaFicha,
  cicatrizesDevidas,
  efeitoDaMagia,
  magiaEhUniversal,
  marcasDaFicha,
  simboloDaFicha,
  sortearCicatriz,
  magiasDaFicha,
  rituaisDaFicha,
  selosDaFicha,
  encantamentosDaFicha,
  obterPerfilMagico,
  podeConjurarMagia,
  temaDoFluxo,
  type FluxoDeMagia,
  type FluxoMagicoId,
  type IMagiaCatalogo,
  type IRitualCatalogo,
  type ISeloCatalogo,
  type IEncantamentoCatalogo,
} from '../../../services/magiaService';
import { obterStatusFicha, penalidadeCansacoTeste } from '../../../services/statusService';
import { resumirEquipamentos } from '../../../services/equipamentoService';
import { useAuthStore } from '../../../store/useAuthStore';

interface IMagiaAntiga {
  id?: string;
  nome?: string;
  circulo?: string;
  escola?: string;
  efeito?: string;
}

const CIRCULO_CORES: Record<string, string> = {
  '1': 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  '2': 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  '3': 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  '4': 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  '5': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  '6': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  '7': 'border-red-500/30 bg-red-500/10 text-red-300',
  '8': 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  '9': 'border-white/30 bg-white/10 text-white',
  '10': 'border-cyan-200/40 bg-cyan-100/10 text-cyan-100',
  ritual: 'border-red-500/30 bg-red-500/10 text-red-300',
};

const formatarBonus = (valor: number) => valor >= 0 ? `+${valor}` : String(valor);

const CIRCULOS_DISPONIVEIS = Array.from({ length: 10 }, (_, indice) => indice + 1);

type TipoManifestacao = 'magia' | 'ritual' | 'selo' | 'encantamento';

const ROTULO_TIPO: Record<TipoManifestacao, string> = {
  magia: 'Magias',
  ritual: 'Rituais',
  selo: 'Selos',
  encantamento: 'Encantamentos',
};

const ROTULO_TIPO_SINGULAR: Record<TipoManifestacao, string> = {
  magia: 'magia',
  ritual: 'ritual',
  selo: 'selo',
  encantamento: 'encantamento',
};

export const AbaMagias = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [filtroFluxo, setFiltroFluxo] = useState<FluxoDeMagia | 'nativo' | 'todos'>('nativo');
  const [filtroCirculo, setFiltroCirculo] = useState<'alcancaveis' | 'todos' | number>('alcancaveis');
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [tipoAtivo, setTipoAtivo] = useState<TipoManifestacao>('magia');
  const [defesasAlvo, setDefesasAlvo] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [conjurandoId, setConjurandoId] = useState<string | null>(null);

  const campanha = useAuthStore((state) => state.campanhaAtiva);
  const usuario = useAuthStore((state) => state.usuario);
  const ficha = character.ficha || {};
  const inventarioCentral = character.inventarioCentral || [];
  const status = obterStatusFicha(ficha);
  const perfil = useMemo(() => obterPerfilMagico(ficha, inventarioCentral), [ficha, inventarioCentral]);
  const resumoEquipamento = useMemo(() => resumirEquipamentos(inventarioCentral, ficha), [ficha, inventarioCentral]);
  const magiasConhecidas = useMemo(() => magiasDaFicha(ficha, inventarioCentral), [ficha, inventarioCentral]);
  const rituaisConhecidos = useMemo(() => rituaisDaFicha(ficha, inventarioCentral), [ficha, inventarioCentral]);
  const selosConhecidos = useMemo(() => selosDaFicha(ficha, inventarioCentral), [ficha, inventarioCentral]);
  const encantamentosConhecidos = useMemo(() => encantamentosDaFicha(ficha, inventarioCentral), [ficha, inventarioCentral]);
  const magiasAntigas: IMagiaAntiga[] = Array.isArray(ficha.magias) ? ficha.magias : [];
  const marcas = useMemo(() => marcasDaFicha(ficha, inventarioCentral), [ficha, inventarioCentral]);
  const cicatrizes = useMemo(() => cicatrizesDaFicha(ficha), [ficha]);
  const cicatrizesPendentes = Math.max(0, cicatrizesDevidas(ficha, inventarioCentral) - cicatrizes.length);
  const simbolo = useMemo(() => simboloDaFicha(ficha), [ficha]);
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanha?.papel === 'mestre'
    || campanha?.papel === 'assistente';
  const manaMaxima = Math.max(0, (Number(ficha.derivados?.mana || character.derivados?.mana) || 0) + (resumoEquipamento.bonusRecursos.manaMaxima || 0));
  const manaAtual = Math.max(0, Number(status.manaAtual ?? manaMaxima));
  const concentracaoAtiva = status.concentracaoAtiva as { magiaId?: string; titulo?: string } | null | undefined;
  const bonusConjuracaoFinal = perfil.bonusConjuracao + penalidadeCansacoTeste(status.cansacoAtual, false);
  const temaFluxoNativo = perfil.fluxoNativoId ? temaDoFluxo(perfil.fluxoNativoId) : null;

  useEffect(() => {
    if (!mensagem) return undefined;
    const timer = window.setTimeout(() => setMensagem(null), 5000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  const catalogoVisivel = useMemo(() => {
    const fluxoEscolhido = filtroFluxo === 'nativo' ? perfil.fluxoNativoId : filtroFluxo;
    const tetoAlcancavel = perfil.circuloMaximo || 1;
    return MAGIAS_CATALOGO.filter((magia) => {
      // Universal atravessa o filtro de Fluxo: ela é aprendível por todos.
      const passaNoFluxo = !fluxoEscolhido || fluxoEscolhido === 'todos'
        || magia.fluxo === fluxoEscolhido || magiaEhUniversal(magia);
      if (!passaNoFluxo) return false;
      if (typeof magia.circulo === 'number') {
        if (filtroCirculo === 'alcancaveis' && magia.circulo > tetoAlcancavel) return false;
        if (typeof filtroCirculo === 'number' && magia.circulo !== filtroCirculo) return false;
      }
      const termo = busca.trim().toLocaleLowerCase('pt-BR');
      if (!termo) return true;
      return [magia.titulo, magia.tradicao, magia.papel, magia.efeito, circuloRotulo(magia.circulo)]
        .some((valor) => valor.toLocaleLowerCase('pt-BR').includes(termo));
    });
  }, [busca, filtroCirculo, filtroFluxo, perfil.circuloMaximo, perfil.fluxoNativoId]);

  /** Rituais/Selos/Encantamentos não têm círculo pra filtrar - só Fluxo e
   * busca por texto, igual ao catálogo de magia sem a parte de círculo. */
  const catalogoManifestacaoVisivel = useMemo(() => {
    if (tipoAtivo === 'magia') return [];
    const catalogo = tipoAtivo === 'ritual' ? RITUAIS_CATALOGO : tipoAtivo === 'selo' ? SELOS_CATALOGO : ENCANTAMENTOS_CATALOGO;
    const fluxoEscolhido = filtroFluxo === 'nativo' ? perfil.fluxoNativoId : filtroFluxo;
    return catalogo.filter((item) => {
      const passaNoFluxo = !fluxoEscolhido || fluxoEscolhido === 'todos' || fluxoEscolhido === 'universal' || item.fluxo === fluxoEscolhido;
      if (!passaNoFluxo) return false;
      const termo = busca.trim().toLocaleLowerCase('pt-BR');
      if (!termo) return true;
      return [item.titulo, item.efeito].some((valor) => valor.toLocaleLowerCase('pt-BR').includes(termo));
    });
  }, [busca, filtroFluxo, perfil.fluxoNativoId, tipoAtivo]);

  const aprenderOuConceder = (magia: IMagiaCatalogo) => {
    if (isMestre) {
      const atuais = perfil.concedidasIds;
      const jaConcedida = atuais.includes(magia.id);
      onUpdate(
        ['ficha', 'magiasConcedidasIds'],
        jaConcedida ? atuais.filter((id) => id !== magia.id) : [...atuais, magia.id],
      );
      setMensagem({
        tipo: 'sucesso',
        texto: jaConcedida ? `${magia.titulo} removida das concessões.` : `${magia.titulo} concedida pelo Mestre.`,
      });
      return;
    }

    const avaliacao = magiaElegivelParaAprender(ficha, magia, inventarioCentral);
    if (!avaliacao.permitido) {
      setMensagem({ tipo: 'erro', texto: avaliacao.motivo || 'Esta magia ainda não pode ser aprendida.' });
      return;
    }
    if (!window.confirm(`Aprender ${magia.titulo}? A escolha só poderá ser removida pelo Mestre.`)) return;
    onUpdate(['ficha', 'magiasConhecidasIds'], [...perfil.conhecidasIds, magia.id]);
    setMensagem({ tipo: 'sucesso', texto: `${magia.titulo} foi aprendida.` });
  };

  const CAMPOS_MANIFESTACAO = {
    ritual: {
      campoConhecidos: 'rituaisConhecidosIds', conhecidosIds: perfil.rituaisConhecidosIds, concedidosIds: perfil.rituaisConcedidosIds,
      campoConcedidos: 'rituaisConcedidosIds', rotulo: 'Ritual', elegivel: ritualElegivelParaAprender,
    },
    selo: {
      campoConhecidos: 'selosConhecidosIds', conhecidosIds: perfil.selosConhecidosIds, concedidosIds: perfil.selosConcedidosIds,
      campoConcedidos: 'selosConcedidosIds', rotulo: 'Selo', elegivel: seloElegivelParaAprender,
    },
    encantamento: {
      campoConhecidos: 'encantamentosConhecidosIds', conhecidosIds: perfil.encantamentosConhecidosIds, concedidosIds: perfil.encantamentosConcedidosIds,
      campoConcedidos: 'encantamentosConcedidosIds', rotulo: 'Encantamento', elegivel: encantamentoElegivelParaAprender,
    },
  } as const;

  const aprenderOuConcederManifestacao = (
    tipo: 'ritual' | 'selo' | 'encantamento',
    item: IRitualCatalogo | ISeloCatalogo | IEncantamentoCatalogo,
  ) => {
    const config = CAMPOS_MANIFESTACAO[tipo];
    if (isMestre) {
      const jaConcedido = config.concedidosIds.includes(item.id);
      onUpdate(
        ['ficha', config.campoConcedidos],
        jaConcedido ? config.concedidosIds.filter((id) => id !== item.id) : [...config.concedidosIds, item.id],
      );
      setMensagem({
        tipo: 'sucesso',
        texto: jaConcedido ? `${item.titulo} removido(a) das concessões.` : `${item.titulo} concedido(a) pelo Mestre.`,
      });
      return;
    }

    const avaliacao = config.elegivel(ficha, item as any, inventarioCentral);
    if (!avaliacao.permitido) {
      setMensagem({ tipo: 'erro', texto: avaliacao.motivo || `Este(a) ${config.rotulo.toLowerCase()} ainda não pode ser aprendido(a).` });
      return;
    }
    if (!window.confirm(`Aprender ${item.titulo}? A escolha só poderá ser removida pelo Mestre.`)) return;
    onUpdate(['ficha', config.campoConhecidos], [...config.conhecidosIds, item.id]);
    setMensagem({ tipo: 'sucesso', texto: `${item.titulo} foi aprendido(a).` });
  };

  const realizarRitual = async (ritual: IRitualCatalogo) => {
    const avaliacao = podeRealizarRitual(ficha, ritual, inventarioCentral);
    if (!avaliacao.permitido) {
      setMensagem({ tipo: 'erro', texto: avaliacao.motivo || 'Não é possível realizar este ritual.' });
      return;
    }
    if (manaAtual < ritual.custo_mana) {
      setMensagem({ tipo: 'erro', texto: `Mana insuficiente. ${ritual.titulo} custa ${ritual.custo_mana}.` });
      return;
    }

    setConjurandoId(ritual.id);
    onUpdate(['ficha', 'status', 'manaAtual'], manaAtual - ritual.custo_mana);

    try {
      if (campanha?.id) {
        const resposta = await registrosApi.rolar({
          campanhaId: campanha.id,
          personagemId: character.id,
          titulo: `Ritual: ${ritual.titulo}`,
          bonus: bonusConjuracaoFinal,
          vantagens: perfil.vantagensConjuracao,
          desvantagens: perfil.desvantagensConjuracao,
          dt: ritual.dt,
          origem: {
            tipo: 'ritual',
            ritual_id: ritual.id,
            dt_ritual: ritual.dt,
            custo_mana: ritual.custo_mana,
            tempo: ritual.tempo,
          },
        });
        const resultado = resposta.registro.resultado;
        setMensagem({
          tipo: 'sucesso',
          texto: resultado === null
            ? `${ritual.titulo} realizado.`
            : `${ritual.titulo}: resultado ${resultado}. DT ${ritual.dt}.`,
        });
      } else {
        setMensagem({ tipo: 'sucesso', texto: `${ritual.titulo}: custo aplicado. Faça o teste de Misticismo contra DT ${ritual.dt}.` });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'O custo foi aplicado, mas o servidor não registrou o ritual.' });
    } finally {
      setConjurandoId(null);
    }
  };

  const sortearProximaCicatriz = () => {
    const cicatriz = sortearCicatriz(ficha);
    if (!cicatriz) {
      setMensagem({ tipo: 'erro', texto: 'A tabela de cicatrizes já se esgotou para esta ficha.' });
      return;
    }
    onUpdate(['ficha', 'cicatrizesIds'], [...cicatrizes.map((item) => item.id), cicatriz.id]);
    setMensagem({ tipo: 'sucesso', texto: `O Fluxo cobrou: ${cicatriz.titulo}.` });
  };

  const encerrarConcentracao = () => {
    onUpdate(['ficha', 'status', 'concentracaoAtiva'], null);
    setMensagem({ tipo: 'sucesso', texto: 'Concentração encerrada.' });
  };

  const conjurar = async (magia: IMagiaCatalogo) => {
    const avaliacao = podeConjurarMagia(ficha, magia, inventarioCentral);
    if (!avaliacao.permitido) {
      setMensagem({ tipo: 'erro', texto: avaliacao.motivo || 'Não é possível conjurar esta magia.' });
      return;
    }
    if (manaAtual < magia.custo_mana) {
      setMensagem({ tipo: 'erro', texto: `Mana insuficiente. ${magia.titulo} custa ${magia.custo_mana}.` });
      return;
    }
    if (magia.circulo === 'ritual') {
      setMensagem({ tipo: 'erro', texto: 'Rituais não são conjurados por esta ação e não podem ser usados em combate.' });
      return;
    }
    if (
      magia.concentracao
      && concentracaoAtiva?.magiaId
      && concentracaoAtiva.magiaId !== magia.id
      && !window.confirm(`Conjurar ${magia.titulo} encerrará ${concentracaoAtiva.titulo || 'a concentração atual'}. Continuar?`)
    ) return;

    setConjurandoId(magia.id);
    onUpdate(['ficha', 'status', 'manaAtual'], manaAtual - magia.custo_mana);
    if (magia.concentracao) {
      onUpdate(['ficha', 'status', 'concentracaoAtiva'], { magiaId: magia.id, titulo: magia.titulo });
    }

    try {
      if (campanha?.id) {
        const defesaInformada = Number(defesasAlvo[magia.id]);
        const dtCirculo = dtConjuracaoPorCirculo(magia.circulo);
        const dtAlvo = Number.isFinite(defesaInformada) && defesaInformada > 0 ? defesaInformada : 0;
        const resposta = await registrosApi.rolar({
          campanhaId: campanha.id,
          personagemId: character.id,
          titulo: `Conjuração: ${magia.titulo}`,
          bonus: bonusConjuracaoFinal,
          vantagens: perfil.vantagensConjuracao,
          desvantagens: perfil.desvantagensConjuracao,
          dt: Math.max(dtCirculo, dtAlvo),
          origem: {
            tipo: 'magia',
            magia_id: magia.id,
            circulo: magia.circulo,
            defesa: magia.defesa,
            dt_magia: dtCirculo,
            custo_mana: magia.custo_mana,
            concentracao: magia.concentracao,
          },
        });
        const resultado = resposta.registro.resultado;
        setMensagem({
          tipo: 'sucesso',
          texto: resultado === null
            ? `${magia.titulo} conjurada.`
            : `${magia.titulo}: resultado ${resultado}. DT do círculo ${dtCirculo}${magia.defesa ? `; compare também com ${magia.defesa}${dtAlvo > 0 ? ` ${dtAlvo}` : ''}` : ''}.`,
        });
      } else {
        setMensagem({ tipo: 'sucesso', texto: `${magia.titulo}: custo aplicado. Faça o teste de conjuração contra DT ${dtConjuracaoPorCirculo(magia.circulo)}.` });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'O custo foi aplicado, mas o servidor não registrou a conjuração.' });
    } finally {
      setConjurandoId(null);
    }
  };

  const renderMagia = (magia: IMagiaCatalogo, modoCatalogo = false) => {
    const conhecida = perfil.conhecidasIds.includes(magia.id);
    const concedida = perfil.concedidasIds.includes(magia.id);
    const avaliacao = magiaElegivelParaAprender(ficha, magia, inventarioCentral);
    const podeAprender = isMestre || avaliacao.permitido;
    const cor = CIRCULO_CORES[String(magia.circulo)] || CIRCULO_CORES.ritual;
    const tema = temaDoFluxo(magia.fluxo);
    const universal = magiaEhUniversal(magia);
    const fluxoTitulo = universal ? 'Universal' : (FLUXOS_POR_ID.get(magia.fluxo as FluxoMagicoId)?.titulo || magia.tradicao);
    // Universal só ganha texto definitivo quando um Fluxo a canaliza.
    const efeitoNaFicha = efeitoDaMagia(magia, perfil.fluxoNativoId);

    return (
      <article
        key={`${modoCatalogo ? 'catalogo' : 'ficha'}:${magia.id}`}
        className="rounded-2xl border p-5"
        style={{
          borderColor: tema.borda,
          background: `linear-gradient(135deg, ${tema.fundo}, #121118 38%)`,
          boxShadow: `0 0 18px ${tema.brilho}`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{magia.titulo}</h3>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cor}`}>
                {circuloRotulo(magia.circulo)}
              </span>
              <span
                className="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: tema.fundo, borderColor: tema.borda, color: tema.texto }}
                title={`${fluxoTitulo} · ${tema.arvore}`}
              >
                {fluxoTitulo}
              </span>
              {universal && perfil.fluxoNativoTitulo && (
                <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                  Canalizada por {perfil.fluxoNativoTitulo}
                </span>
              )}
              {magia.concentracao && <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-300">Concentração</span>}
              {concedida && <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Concedida</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span><strong className="text-gray-400">Custo:</strong> {magia.custo_mana} Mana</span>
              <span><strong className="text-gray-400">Execução:</strong> {magia.execucao}</span>
              <span><strong className="text-gray-400">Alcance:</strong> {magia.alcance}</span>
              <span><strong className="text-gray-400">Duração:</strong> {magia.duracao}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{efeitoNaFicha}</p>
            {(magia.dano || magia.defesa) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {magia.dano && <span className="rounded-lg bg-red-500/10 px-2.5 py-1 text-red-300">Dano {magia.dano}</span>}
                {magia.defesa && <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-sky-300">Contra {magia.defesa}</span>}
                {magia.ataque && <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-300">Crítico no 20 natural</span>}
              </div>
            )}
          </div>

          {modoCatalogo ? (
            <div className="w-full md:w-48">
              <button
                type="button"
                onClick={() => aprenderOuConceder(magia)}
                disabled={!isMestre && (conhecida || !podeAprender)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 py-2.5 text-xs font-bold text-[#d7bb72] transition-colors hover:bg-[#c7a44c]/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-gray-600"
              >
                {!podeAprender && !conhecida ? <LockKeyhole size={14} /> : <BookOpen size={14} />}
                {isMestre ? (concedida ? 'Remover concessão' : 'Conceder') : (conhecida ? 'Já conhecida' : 'Aprender')}
              </button>
              {!isMestre && !avaliacao.permitido && !conhecida && <p className="mt-2 text-center text-[10px] leading-relaxed text-gray-600">{avaliacao.motivo}</p>}
            </div>
          ) : (
            <div className="w-full space-y-2 md:w-48">
              {magia.defesa && (
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Defesa do alvo, opcional
                  <input
                    type="number"
                    min="1"
                    value={defesasAlvo[magia.id] || ''}
                    onChange={(event) => setDefesasAlvo((atual) => ({ ...atual, [magia.id]: event.target.value }))}
                    placeholder={magia.defesa}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => void conjurar(magia)}
                disabled={conjurandoId === magia.id}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Dices size={14} /> {conjurandoId === magia.id ? 'Conjurando...' : 'Conjurar'}
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  const renderRitual = (ritual: IRitualCatalogo, modoCatalogo = false) => {
    const conhecido = perfil.rituaisConhecidosIds.includes(ritual.id);
    const concedido = perfil.rituaisConcedidosIds.includes(ritual.id);
    const avaliacao = ritualElegivelParaAprender(ficha, ritual, inventarioCentral);
    const podeAprender = isMestre || avaliacao.permitido;
    const tema = temaDoFluxo(ritual.fluxo);
    const fluxoTitulo = FLUXOS_POR_ID.get(ritual.fluxo)?.titulo || ritual.fluxo;

    return (
      <article
        key={`${modoCatalogo ? 'catalogo' : 'ficha'}:ritual:${ritual.id}`}
        className="rounded-2xl border p-5"
        style={{
          borderColor: tema.borda,
          background: `linear-gradient(135deg, ${tema.fundo}, #121118 38%)`,
          boxShadow: `0 0 18px ${tema.brilho}`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{ritual.titulo}</h3>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CIRCULO_CORES.ritual}`}>Ritual</span>
              <span
                className="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: tema.fundo, borderColor: tema.borda, color: tema.texto }}
                title={`${fluxoTitulo} · ${tema.arvore}`}
              >
                {fluxoTitulo}
              </span>
              <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{ritual.complexidade}</span>
              {concedido && <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Concedido</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span><strong className="text-gray-400">Custo:</strong> {ritual.custo_mana} Mana</span>
              <span><strong className="text-gray-400">Tempo:</strong> {ritual.tempo}</span>
              <span><strong className="text-gray-400">DT:</strong> {ritual.dt}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{ritual.efeito}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500"><strong className="text-gray-400">Requisito:</strong> {ritual.requisito}</p>
            <p className="mt-1 text-xs leading-relaxed text-red-300/80"><strong className="text-red-300">Em falha:</strong> {ritual.falha}</p>
          </div>

          {modoCatalogo ? (
            <div className="w-full md:w-48">
              <button
                type="button"
                onClick={() => aprenderOuConcederManifestacao('ritual', ritual)}
                disabled={!isMestre && (conhecido || !podeAprender)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 py-2.5 text-xs font-bold text-[#d7bb72] transition-colors hover:bg-[#c7a44c]/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-gray-600"
              >
                {!podeAprender && !conhecido ? <LockKeyhole size={14} /> : <BookOpen size={14} />}
                {isMestre ? (concedido ? 'Remover concessão' : 'Conceder') : (conhecido ? 'Já conhecido' : 'Aprender')}
              </button>
              {!isMestre && !avaliacao.permitido && !conhecido && <p className="mt-2 text-center text-[10px] leading-relaxed text-gray-600">{avaliacao.motivo}</p>}
            </div>
          ) : (
            <div className="w-full space-y-2 md:w-48">
              <button
                type="button"
                onClick={() => void realizarRitual(ritual)}
                disabled={conjurandoId === ritual.id}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Dices size={14} /> {conjurandoId === ritual.id ? 'Realizando...' : 'Realizar'}
              </button>
              <p className="text-center text-[10px] leading-relaxed text-gray-600">Fora de combate, sem círculo.</p>
            </div>
          )}
        </div>
      </article>
    );
  };

  const renderSeloOuEncantamento = (tipo: 'selo' | 'encantamento', item: ISeloCatalogo | IEncantamentoCatalogo, modoCatalogo = false) => {
    const conhecidosIds = tipo === 'selo' ? perfil.selosConhecidosIds : perfil.encantamentosConhecidosIds;
    const concedidosIds = tipo === 'selo' ? perfil.selosConcedidosIds : perfil.encantamentosConcedidosIds;
    const conhecido = conhecidosIds.includes(item.id);
    const concedido = concedidosIds.includes(item.id);
    const avaliacao = tipo === 'selo'
      ? seloElegivelParaAprender(ficha, item as ISeloCatalogo, inventarioCentral)
      : encantamentoElegivelParaAprender(ficha, item as IEncantamentoCatalogo, inventarioCentral);
    const podeAprender = isMestre || avaliacao.permitido;
    const tema = temaDoFluxo(item.fluxo);
    const fluxoTitulo = FLUXOS_POR_ID.get(item.fluxo)?.titulo || item.fluxo;
    const dt = tipo === 'selo' ? (item as ISeloCatalogo).dt_inscricao : (item as IEncantamentoCatalogo).dt;
    const aplicacaoOuAtivacao = tipo === 'selo' ? (item as ISeloCatalogo).ativacao : (item as IEncantamentoCatalogo).aplicacao;
    const rotuloDt = tipo === 'selo' ? 'DT de inscrição' : 'DT';
    const rotuloUso = tipo === 'selo' ? 'Ativação' : 'Aplicação';
    const rotuloTipo = tipo === 'selo' ? 'Selo' : 'Encantamento';

    return (
      <article
        key={`${modoCatalogo ? 'catalogo' : 'ficha'}:${tipo}:${item.id}`}
        className="rounded-2xl border p-5"
        style={{
          borderColor: tema.borda,
          background: `linear-gradient(135deg, ${tema.fundo}, #121118 38%)`,
          boxShadow: `0 0 18px ${tema.brilho}`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{item.titulo}</h3>
              <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{rotuloTipo} · Grau {item.grau}</span>
              <span
                className="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: tema.fundo, borderColor: tema.borda, color: tema.texto }}
                title={`${fluxoTitulo} · ${tema.arvore}`}
              >
                {fluxoTitulo}
              </span>
              {concedido && <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Concedido</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span><strong className="text-gray-400">Custo pra fazer:</strong> {item.custo_mana} Mana</span>
              <span><strong className="text-gray-400">Tempo:</strong> {item.tempo}</span>
              <span><strong className="text-gray-400">{rotuloDt}:</strong> {dt}</span>
              <span><strong className="text-gray-400">{rotuloUso}:</strong> {aplicacaoOuAtivacao}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{item.efeito}</p>
            {!modoCatalogo && conhecido && (
              <p className="mt-2 text-[11px] leading-relaxed text-gray-600">Técnica conhecida. A aplicação num item, criatura ou lugar acontece na mesa, com o Mestre.</p>
            )}
          </div>

          {modoCatalogo && (
            <div className="w-full md:w-48">
              <button
                type="button"
                onClick={() => aprenderOuConcederManifestacao(tipo, item)}
                disabled={!isMestre && (conhecido || !podeAprender)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 py-2.5 text-xs font-bold text-[#d7bb72] transition-colors hover:bg-[#c7a44c]/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-gray-600"
              >
                {!podeAprender && !conhecido ? <LockKeyhole size={14} /> : <BookOpen size={14} />}
                {isMestre ? (concedido ? 'Remover concessão' : 'Conceder') : (conhecido ? 'Já conhecido' : 'Aprender')}
              </button>
              {!isMestre && !avaliacao.permitido && !conhecido && <p className="mt-2 text-center text-[10px] leading-relaxed text-gray-600">{avaliacao.motivo}</p>}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              <Sparkles className="text-sky-300" /> Magia e Fluxo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
              Fluxo mede sua capacidade de canalização. A fonte libera círculos e vagas; Misticismo acrescenta treinamento ao teste.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarCatalogo((valor) => !valor)}
            className="rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-5 py-3 text-sm font-bold text-[#d7bb72] hover:bg-[#c7a44c]/20"
          >
            {mostrarCatalogo ? 'Voltar às conhecidas' : isMestre ? 'Abrir catálogo e concessões' : `Aprender ${ROTULO_TIPO_SINGULAR[tipoAtivo]}`}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['magia', 'ritual', 'selo', 'encantamento'] as TipoManifestacao[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoAtivo(tipo)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${tipoAtivo === tipo
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                : 'border-white/10 bg-black/20 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
            >
              {ROTULO_TIPO[tipo]}
            </button>
          ))}
        </div>

        {tipoAtivo === 'magia' && (
        <>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Fonte</span><strong className="mt-1 block text-sm text-white">{perfil.fontes.join(', ') || 'Nenhuma'}</strong></div>
          <div
            className="rounded-xl border bg-black/20 p-3"
            style={{
              borderColor: temaFluxoNativo?.borda || 'rgba(255,255,255,.05)',
              background: temaFluxoNativo ? `linear-gradient(135deg, ${temaFluxoNativo.fundo}, rgba(0,0,0,.2))` : undefined,
            }}
          >
            <span className="text-[10px] font-bold uppercase text-gray-500">Fluxo nativo</span>
            <strong className="mt-1 block text-sm" style={{ color: temaFluxoNativo?.texto || '#d1d5db' }}>{perfil.fluxoNativoTitulo || 'Escolha uma Árvore'}</strong>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Fluxo</span><strong className="mt-1 block text-sm text-white">{perfil.fluxo} ({formatarBonus(perfil.modificadorFluxo)})</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Teste</span><strong className="mt-1 block text-sm text-sky-300">d20 {formatarBonus(bonusConjuracaoFinal)}</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">DT do maior círculo</span><strong className="mt-1 block text-sm text-sky-300">{perfil.dtMagia || 'Indisponível'}</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Círculo e vagas</span><strong className="mt-1 block text-sm text-white">{perfil.circuloMaximo || 0}º, {perfil.conhecidasIds.length}/{perfil.vagasConhecidas}</strong></div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-xs text-gray-400">
          <Shield size={15} className="text-emerald-300" />
          <span>Mana {manaAtual}/{manaMaxima}</span>
          <span>Fluxo libera até o {perfil.circuloDoFluxo || 0}º círculo.</span>
          <span>Sua fonte libera até o {perfil.circuloDaFonte || 0}º.</span>
        </div>
        {perfil.avisoFluxo && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{perfil.avisoFluxo}</span>
          </div>
        )}
        </>
        )}

        {tipoAtivo !== 'magia' && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Fluxo nativo</span><strong className="mt-1 block text-sm" style={{ color: temaFluxoNativo?.texto || '#d1d5db' }}>{perfil.fluxoNativoTitulo || 'Escolha uma Árvore'}</strong></div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Mana</span><strong className="mt-1 block text-sm text-white">{manaAtual}/{manaMaxima}</strong></div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[10px] font-bold uppercase text-gray-500">Vagas de {ROTULO_TIPO[tipoAtivo].toLowerCase()}</span>
              <strong className="mt-1 block text-sm text-white">
                {tipoAtivo === 'ritual' && `${perfil.rituaisConhecidosIds.length}/${perfil.vagasRituais}`}
                {tipoAtivo === 'selo' && `${perfil.selosConhecidosIds.length}/${perfil.vagasSelos}`}
                {tipoAtivo === 'encantamento' && `${perfil.encantamentosConhecidosIds.length}/${perfil.vagasEncantamentos}`}
              </strong>
            </div>
          </div>
        )}
      </header>

      {simbolo && (
        <section
          className={`rounded-2xl border p-5 ${simbolo.natureza === 'pecado'
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-emerald-500/30 bg-emerald-500/5'}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-white">{simbolo.titulo}</h3>
            <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${simbolo.natureza === 'pecado'
              ? 'border-red-500/40 text-red-300'
              : 'border-emerald-500/40 text-emerald-300'}`}
            >
              {simbolo.natureza === 'pecado' ? 'Pecado' : 'Virtude'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Símbolo dos Sete</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">O que dá</span>
              <ul className="mt-2 space-y-1.5">
                {simbolo.bonus.map((texto) => (
                  <li key={texto} className="text-xs leading-relaxed text-emerald-200">{texto}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">O que cobra</span>
              <ul className="mt-2 space-y-1.5">
                {simbolo.onus.map((texto) => (
                  <li key={texto} className="text-xs leading-relaxed text-red-200">{texto}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
            Só o Mestre troca o Símbolo, porque o rito exige sete pessoas e acontece na mesa.
          </p>
        </section>
      )}

      {(marcas.length > 0 || cicatrizes.length > 0 || cicatrizesPendentes > 0) && (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold text-white">
              <Sparkles size={16} className="text-[#c7a44c]" /> O que a magia cobrou
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {marcas.length} marca(s) · {cicatrizes.length} cicatriz(es)
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Marca vem sozinha do teu Fluxo a cada círculo do 5º ao 9º, e some se você perder o círculo.
            Cicatriz é sorteada a cada magia de 10º círculo aprendida.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[...marcas.map((marca) => ({ chave: marca.id, etiqueta: `${marca.circulo}º círculo`, ...marca })),
              ...cicatrizes.map((cicatriz) => ({ chave: cicatriz.id, etiqueta: 'Cicatriz', ...cicatriz }))]
              .map((item) => (
                <article key={item.chave} className="rounded-xl border border-white/5 bg-[#0f0e15] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-white">{item.titulo}</strong>
                    <span className="rounded border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      {item.etiqueta}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-300">{item.bonus}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-red-300">{item.onus}</p>
                </article>
              ))}
          </div>

          {cicatrizesPendentes > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="text-xs leading-relaxed text-amber-200">
                {cicatrizesPendentes === 1
                  ? 'Uma magia de 10º círculo ainda não cobrou o preço dela.'
                  : `${cicatrizesPendentes} magias de 10º círculo ainda não cobraram o preço delas.`}
              </span>
              <button
                type="button"
                onClick={sortearProximaCicatriz}
                className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-100"
              >
                Sortear cicatriz
              </button>
            </div>
          )}
        </section>
      )}

      {mensagem && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${mensagem.tipo === 'sucesso' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {mensagem.texto}
        </motion.div>
      )}

      {concentracaoAtiva?.magiaId && (
        <section className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Concentração ativa</span><strong className="mt-1 block text-white">{concentracaoAtiva.titulo}</strong><p className="mt-1 text-xs text-gray-400">Ao sofrer dano, teste Vontade contra DT 10 ou metade do dano, o que for maior.</p></div>
          <button type="button" onClick={encerrarConcentracao} className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 px-4 py-2 text-xs font-bold text-violet-200"><X size={14} /> Encerrar</button>
        </section>
      )}

      {tipoAtivo === 'magia' && (mostrarCatalogo ? (
        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="search" aria-label="Buscar no catálogo de magias" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por nome, círculo, Fluxo ou efeito" className="w-full rounded-xl border border-white/5 bg-[#0f0e15] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-sky-500/40" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Fluxo</span>
              <select
                value={filtroFluxo}
                onChange={(event) => setFiltroFluxo(event.target.value as FluxoDeMagia | 'nativo' | 'todos')}
                className="w-full rounded-xl border border-white/5 bg-[#0f0e15] px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-sky-500/40"
              >
                <option value="nativo">{perfil.fluxoNativoTitulo ? `Fluxo nativo (${perfil.fluxoNativoTitulo})` : 'Fluxo nativo (não definido)'}</option>
                <option value="todos">Todos os Fluxos</option>
                <option value="universal">Só as universais</option>
                {FLUXOS_CATALOGO.map((fluxo) => <option key={fluxo.id} value={fluxo.id}>{fluxo.titulo}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Círculo</span>
              <select
                value={String(filtroCirculo)}
                onChange={(event) => {
                  const valor = event.target.value;
                  setFiltroCirculo(valor === 'alcancaveis' || valor === 'todos' ? valor : Number(valor));
                }}
                className="w-full rounded-xl border border-white/5 bg-[#0f0e15] px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-sky-500/40"
              >
                <option value="alcancaveis">Até o {perfil.circuloMaximo || 1}º círculo (alcançáveis)</option>
                <option value="todos">Todos os círculos</option>
                {CIRCULOS_DISPONIVEIS.map((circulo) => <option key={circulo} value={circulo}>{circuloRotulo(circulo as IMagiaCatalogo['circulo'])}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{catalogoVisivel.length} de {MAGIAS_CATALOGO.length} magias</p>
          <div className="space-y-3">{catalogoVisivel.map((magia) => renderMagia(magia, true))}</div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-white">Magias conhecidas</h3><span className="text-xs text-gray-500">{magiasConhecidas.length} oficiais</span></div>
          {magiasConhecidas.length > 0 ? <div className="space-y-3">{magiasConhecidas.map((magia) => renderMagia(magia))}</div> : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0e15] py-14 text-center"><Flame size={42} className="mx-auto mb-3 text-gray-700" /><p className="font-bold text-gray-500">Nenhuma magia oficial conhecida</p><p className="mt-2 text-xs text-gray-600">{perfil.possuiFonte ? 'Use Aprender magia para preencher as vagas liberadas.' : 'Uma classe, habilidade ou concessão do Mestre precisa fornecer acesso.'}</p></div>
          )}
        </section>
      ))}

      {tipoAtivo !== 'magia' && (() => {
        const rotulo = ROTULO_TIPO[tipoAtivo];
        const rotuloSingular = ROTULO_TIPO_SINGULAR[tipoAtivo];
        const conhecidosAtivos = tipoAtivo === 'ritual' ? rituaisConhecidos : tipoAtivo === 'selo' ? selosConhecidos : encantamentosConhecidos;
        const renderItem = (item: IRitualCatalogo | ISeloCatalogo | IEncantamentoCatalogo, modoCatalogo = false) => (
          tipoAtivo === 'ritual'
            ? renderRitual(item as IRitualCatalogo, modoCatalogo)
            : renderSeloOuEncantamento(tipoAtivo, item as ISeloCatalogo | IEncantamentoCatalogo, modoCatalogo)
        );
        return mostrarCatalogo ? (
          <section className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="search"
                aria-label={`Buscar no catálogo de ${rotulo.toLowerCase()}`}
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, Fluxo ou efeito"
                className="w-full rounded-xl border border-white/5 bg-[#0f0e15] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-sky-500/40"
              />
            </div>
            <label className="block sm:max-w-xs">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Fluxo</span>
              <select
                value={filtroFluxo}
                onChange={(event) => setFiltroFluxo(event.target.value as FluxoDeMagia | 'nativo' | 'todos')}
                className="w-full rounded-xl border border-white/5 bg-[#0f0e15] px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-sky-500/40"
              >
                <option value="nativo">{perfil.fluxoNativoTitulo ? `Fluxo nativo (${perfil.fluxoNativoTitulo})` : 'Fluxo nativo (não definido)'}</option>
                <option value="todos">Todos os Fluxos</option>
                {FLUXOS_CATALOGO.map((fluxo) => <option key={fluxo.id} value={fluxo.id}>{fluxo.titulo}</option>)}
              </select>
            </label>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{catalogoManifestacaoVisivel.length} {rotulo.toLowerCase()}</p>
            <div className="space-y-3">{catalogoManifestacaoVisivel.map((item) => renderItem(item, true))}</div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-white">{rotulo} conhecidos</h3><span className="text-xs text-gray-500">{conhecidosAtivos.length} conhecidos</span></div>
            {conhecidosAtivos.length > 0 ? <div className="space-y-3">{conhecidosAtivos.map((item) => renderItem(item))}</div> : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0e15] py-14 text-center">
                <Flame size={42} className="mx-auto mb-3 text-gray-700" />
                <p className="font-bold text-gray-500">Nenhum(a) {rotuloSingular} conhecido(a)</p>
                <p className="mt-2 text-xs text-gray-600">Use Aprender {rotuloSingular} para preencher as vagas liberadas pela classe.</p>
              </div>
            )}
          </section>
        );
      })()}

      {tipoAtivo === 'magia' && magiasAntigas.length > 0 && !mostrarCatalogo && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="flex items-center gap-2 font-bold text-amber-200"><AlertCircle size={17} /> Registros anteriores</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">Estas anotações foram preservadas, mas não usam custos, círculos ou testes oficiais. O Mestre pode conceder a versão correspondente pelo catálogo.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {magiasAntigas.map((magia, indice) => <article key={magia.id || `${magia.nome}:${indice}`} className="rounded-xl border border-white/5 bg-black/20 p-4"><strong className="text-white">{magia.nome || 'Magia sem nome'}</strong><p className="mt-1 text-[11px] text-gray-500">{magia.circulo || 'Sem círculo'} | {magia.escola || 'Sem tradição'}</p><p className="mt-2 text-xs text-gray-400">{magia.efeito || 'Sem efeito registrado.'}</p></article>)}
          </div>
        </section>
      )}
    </div>
  );
};
