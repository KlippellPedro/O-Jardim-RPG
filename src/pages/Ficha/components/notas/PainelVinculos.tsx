import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Handshake,
  Heart,
  History,
  LayoutGrid,
  Link2,
  List,
  Minus,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { FichaModal } from '../FichaModal';
import { ModalPortal } from '../ModalPortal';
import { AjustarFotoModal } from '../AjustarFotoModal';
import { LabeledInput } from '../SharedFichaComponents';
import { Select } from '../../../../components/ui/Select';
import {
  AFINIDADE_MAX,
  AFINIDADE_MIN,
  LIMITE_FOTOS_VINCULO,
  LIMITE_NOS_TEIA,
  LIMITE_VINCULOS,
  RESOLUCAO_FOTO_VINCULO,
  fotoVinculoValida,
  TIPOS_VINCULO,
  agruparPorTipo,
  aliadosSemVinculo,
  aplicarAfinidade,
  corAfinidade,
  filtrarVinculos,
  gerarIdVinculo,
  limitarAfinidade,
  normalizarVinculos,
  ordenarVinculos,
  posicionarTeia,
  rotuloAfinidade,
  selecionarParaTeia,
  RAMOS_CONTATO,
  confiancaDoVinculo,
  cumprirDivida,
  favoresDoContato,
  recusarDivida,
  rotuloConfianca,
  rotuloRamo,
  PONTOS_DE_RELACAO_MAXIMOS,
  afinidadeDosPontos,
  aplicarPontos,
  devolverUsoDePonto,
  ehDoGrupo,
  gastarUsoDePonto,
  novaSessaoNosVinculos,
  pontosDoVinculo,
  sanidadeDoVinculo,
  usosDoVinculo,
  type IFiltroVinculos,
  type IVinculo,
  type TipoVinculo,
} from '../../utils/vinculos';
import { avisar } from '../../../../components/avisos/avisos';
import { excluirDaFichaComDesfazer } from '../../desfazerNaFicha';
import { LinkDaRegra } from '../../../../components/ui/LinkDaRegra';
import { modificador } from '../../../../services/calculoService';
import { nivelTotalFicha } from '../../../../services/progressaoFichaService';
import { FAVORES, LACOS_MAXIMOS, NIVEIS_DE_CONFIANCA, contatosMantidos } from '../../../../../data/regras/contatosELacos';
import { DEGRAUS_DE_RELACAO, USOS_DE_PONTO, tituloDoDegrau } from '../../../../../data/regras/pontosDeRelacao';

const COR_PONTOS = '#c4b5fd';
const PASSOS_PONTOS = Array.from({ length: PONTOS_DE_RELACAO_MAXIMOS }, (_, indice) => indice + 1);

interface IFormVinculo {
  nome: string;
  tipo: TipoVinculo;
  afinidade: number;
  nota: string;
  foto?: string;
  aliadoId?: string;
  /** Faz favores: vira contato, com ramo e Dívida. */
  contato: boolean;
  ramo: string;
  divida: string;
  laco: string;
  /** Personagem do grupo: mostra Pontos de Relação no lugar da afinidade. */
  grupo: boolean;
}

const FORM_VAZIO: IFormVinculo = { nome: '', tipo: 'amizade', afinidade: 1, nota: '', contato: false, ramo: RAMOS_CONTATO[0].valor, divida: '', laco: '', grupo: false };

const COR_TIPO: Record<TipoVinculo, string> = {
  amizade: '#6ee7b7',
  familia: '#fcd34d',
  amor: '#fda4af',
  mentor: '#c4b5fd',
  aliado: '#7dd3fc',
  contato: '#9ca3af',
  divida: '#fde047',
  rival: '#fdba74',
  inimigo: '#f87171',
};

const FAIXAS: { valor: IFiltroVinculos['faixa']; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'proximos', rotulo: 'Próximos' },
  { valor: 'neutros', rotulo: 'Neutros' },
  { valor: 'hostis', rotulo: 'Hostis' },
  { valor: 'fixados', rotulo: 'Fixados' },
  { valor: 'grupo', rotulo: 'Do grupo' },
];

const ESCALA = Array.from({ length: AFINIDADE_MAX - AFINIDADE_MIN + 1 }, (_, indice) => AFINIDADE_MIN + indice);
/** A partir daqui a lista abre no modo compacto. */
const LIMITE_CARTOES = 6;
const PAGINA = 24;

const rotuloTipo = (tipo: TipoVinculo) => TIPOS_VINCULO.find((item) => item.valor === tipo)?.rotulo || 'Contato';

const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toLocaleUpperCase('pt-BR')).join('') || '?';

const dataCurta = (ts: number) =>
  ts ? new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));

interface IAvatarProps {
  vinculo: Pick<IVinculo, 'nome' | 'foto' | 'afinidade'>;
  tamanho: number;
}

/** Retrato redondo com anel na cor da afinidade; sem foto, mostra as iniciais. */
const Avatar = ({ vinculo, tamanho }: IAvatarProps) => (
  <span
    className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-black/40 font-bold text-white"
    style={{ width: tamanho, height: tamanho, borderColor: corAfinidade(vinculo.afinidade), fontSize: tamanho * 0.34 }}
    aria-hidden="true"
  >
    {vinculo.foto ? (
      <img src={vinculo.foto} alt="" className="h-full w-full object-cover" draggable={false} />
    ) : (
      iniciais(vinculo.nome)
    )}
  </span>
);

interface IPainelVinculosProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
}

export const PainelVinculos = ({ character, onUpdate }: IPainelVinculosProps) => {
  const vinculos = useMemo(() => normalizarVinculos(character?.ficha?.vinculos), [character?.ficha?.vinculos]);
  const ordenados = useMemo(() => ordenarVinculos(vinculos), [vinculos]);
  const sugestoes = useMemo(
    () => aliadosSemVinculo(Array.isArray(character?.ficha?.aliados) ? character.ficha.aliados : [], vinculos),
    [character?.ficha?.aliados, vinculos],
  );
  const totalFotos = vinculos.filter((vinculo) => vinculo.foto).length;

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<IFormVinculo>(FORM_VAZIO);
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [ajuste, setAjuste] = useState<{ id: string; para: number; motivo: string } | null>(null);
  const [historicoAbertoId, setHistoricoAbertoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<IFiltroVinculos['tipo']>('todos');
  const [faixa, setFaixa] = useState<IFiltroVinculos['faixa']>('todos');
  const [visaoEscolhida, setVisaoEscolhida] = useState<'cartoes' | 'lista' | null>(null);
  const [agrupar, setAgrupar] = useState(false);
  const [teiaAberta, setTeiaAberta] = useState(true);
  const [limite, setLimite] = useState(PAGINA);
  const pendenteRolagem = useRef<string | null>(null);

  const visao = visaoEscolhida ?? (vinculos.length > LIMITE_CARTOES ? 'lista' : 'cartoes');
  const compacto = visao === 'lista';

  const commit = (lista: IVinculo[]) => onUpdate(['ficha', 'vinculos'], lista);
  const cheio = vinculos.length >= LIMITE_VINCULOS;

  const filtrados = useMemo(
    () => filtrarVinculos(ordenados, { busca, tipo: tipoFiltro, faixa }),
    [ordenados, busca, tipoFiltro, faixa],
  );
  const recorte = useMemo(() => filtrados.slice(0, limite), [filtrados, limite]);
  const grupos = useMemo(() => (agrupar ? agruparPorTipo(recorte) : null), [agrupar, recorte]);
  const filtrando = busca.trim() !== '' || tipoFiltro !== 'todos' || faixa !== 'todos';

  useEffect(() => { setLimite(PAGINA); }, [busca, tipoFiltro, faixa]);

  const { visiveis: naTeia, ocultos } = useMemo(
    () => selecionarParaTeia(filtrados, LIMITE_NOS_TEIA, selecionadoId),
    [filtrados, selecionadoId],
  );
  const posicoes = useMemo(() => posicionarTeia(naTeia, 118), [naTeia]);
  const posicaoDe = (id: string) => posicoes.find((posicao) => posicao.id === id);
  const denso = naTeia.length > 10;
  const raioNo = denso ? 15 : 17;

  const nomeCentro = String(character?.nome || 'Você');
  const fotoCentro = typeof character?.foto === 'string' && character.foto ? character.foto : null;
  const resumo = useMemo(() => {
    const proximos = vinculos.filter((vinculo) => vinculo.afinidade > 0).length;
    const hostis = vinculos.filter((vinculo) => vinculo.afinidade < 0).length;
    return [
      { rotulo: 'Vínculos', valor: vinculos.length, cor: '#e3c46f' },
      { rotulo: 'Próximos', valor: proximos, cor: '#4ade80' },
      { rotulo: 'Neutros', valor: vinculos.length - proximos - hostis, cor: '#c7a44c' },
      { rotulo: 'Hostis', valor: hostis, cor: '#f87171' },
    ];
  }, [vinculos]);

  const contatos = vinculos.filter((vinculo) => vinculo.ramo);
  const lacos = vinculos.filter((vinculo) => vinculo.laco);
  const lacosUsados = lacos.filter((vinculo) => vinculo.lacoUsado).length;
  const doGrupo = vinculos.filter(ehDoGrupo);
  const usosGastos = doGrupo.reduce((soma, vinculo) => soma + (vinculo.pontosUsados ?? 0), 0);
  const rotuloNovaSessao = [
    lacosUsados > 0 ? `${lacosUsados} laço${lacosUsados === 1 ? '' : 's'}` : '',
    usosGastos > 0 ? `${usosGastos} uso${usosGastos === 1 ? '' : 's'} de pontos` : '',
  ].filter(Boolean).join(' e ');
  const carisma = Number((character?.ficha?.atributosFinais || character?.atributosFinais || {}).carisma) || 10;
  const limiteContatos = contatosMantidos(modificador(carisma));
  const nivelDoPersonagem = Math.max(1, nivelTotalFicha(character?.ficha ?? {}) || 1);

  // Depois de escolher alguém na teia, leva o cartão até a tela quando ele já estiver desenhado.
  useEffect(() => {
    const id = pendenteRolagem.current;
    if (!id) return;
    pendenteRolagem.current = null;
    document.getElementById(`vinculo-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const escolherNaTeia = (vinculo: IVinculo) => {
    const ativo = selecionadoId === vinculo.id;
    setSelecionadoId(ativo ? null : vinculo.id);
    if (ativo) return;
    setExpandidoId(vinculo.id);
    const posicao = filtrados.findIndex((item) => item.id === vinculo.id);
    if (posicao >= limite) setLimite(posicao + 1);
    pendenteRolagem.current = vinculo.id;
  };

  const limparFiltros = () => {
    setBusca('');
    setTipoFiltro('todos');
    setFaixa('todos');
  };

  const abrirNovo = (parcial: Partial<IFormVinculo> = {}) => {
    setEditandoId(null);
    setForm({ ...FORM_VAZIO, ...parcial });
    setModalAberto(true);
  };

  const abrirEdicao = (vinculo: IVinculo) => {
    setEditandoId(vinculo.id);
    setForm({
      nome: vinculo.nome,
      tipo: vinculo.tipo,
      afinidade: vinculo.afinidade,
      nota: vinculo.nota,
      foto: vinculo.foto,
      aliadoId: vinculo.aliadoId,
      contato: !!vinculo.ramo,
      ramo: vinculo.ramo || RAMOS_CONTATO[0].valor,
      divida: vinculo.divida || '',
      laco: vinculo.laco || '',
      grupo: ehDoGrupo(vinculo),
    });
    setModalAberto(true);
  };

  const salvar = () => {
    const nome = form.nome.trim();
    if (!nome) return;
    const agora = Date.now();
    const laco = form.laco.trim().slice(0, 300);
    const mecanica = {
      ramo: form.contato ? form.ramo : undefined,
      divida: form.contato && form.divida.trim() ? form.divida.trim().slice(0, 300) : undefined,
      laco: laco || undefined,
      grupo: form.grupo || undefined,
    };
    if (editandoId) {
      commit(vinculos.map((vinculo) => {
        if (vinculo.id !== editandoId) return vinculo;
        const atualizado = form.grupo
          ? aplicarPontos(vinculo, pontosDoVinculo(form.afinidade), 'Ajustado na edição', agora)
          : aplicarAfinidade(vinculo, form.afinidade, 'Ajustado na edição', agora);
        return {
          ...atualizado,
          nome,
          tipo: form.tipo,
          nota: form.nota.trim().slice(0, 1200),
          foto: form.foto,
          atualizadoEm: agora,
          ...mecanica,
          lacoUsado: laco ? atualizado.lacoUsado : undefined,
          pontosUsados: form.grupo ? atualizado.pontosUsados : undefined,
        };
      }));
    } else {
      if (cheio) return;
      commit([
        ...vinculos,
        {
          id: gerarIdVinculo(),
          nome,
          tipo: form.tipo,
          afinidade: limitarAfinidade(form.afinidade),
          nota: form.nota.trim().slice(0, 1200),
          fixado: false,
          aliadoId: form.aliadoId,
          foto: form.foto,
          criadoEm: agora,
          atualizadoEm: agora,
          historico: [],
          ...mecanica,
        },
      ]);
    }
    setModalAberto(false);
  };

  const excluir = (vinculo: IVinculo) => {
    const saiu = excluirDaFichaComDesfazer<IVinculo>({
      personagemId: character.id,
      lista: (personagem) => normalizarVinculos(personagem.ficha?.vinculos),
      id: vinculo.id,
      gravar: commit,
      texto: `Vínculo com ${vinculo.nome} apagado.`,
    });
    if (!saiu) return;
    setSelecionadoId((atual) => (atual === vinculo.id ? null : atual));
    setExpandidoId((atual) => (atual === vinculo.id ? null : atual));
  };

  const alternarFixado = (vinculo: IVinculo) => {
    commit(vinculos.map((item) => (item.id === vinculo.id ? { ...item, fixado: !item.fixado } : item)));
  };

  const trocar = (id: string, mudar: (vinculo: IVinculo) => IVinculo) => commit(vinculos.map((item) => (item.id === id ? mudar(item) : item)));

  const alternarLacoUsado = (vinculo: IVinculo) => trocar(vinculo.id, (item) => {
    if (item.lacoUsado) {
      const { lacoUsado: _usado, ...resto } = item;
      return resto;
    }
    return { ...item, lacoUsado: true };
  });

  const romperLaco = (vinculo: IVinculo) => {
    trocar(vinculo.id, (item) => {
      const { laco: _laco, lacoUsado: _usado, ...resto } = item;
      return { ...resto, atualizadoEm: Date.now() };
    });
    const teste = sanidadeDoVinculo(vinculo, 'perde', nivelDoPersonagem);
    avisar.aviso(`Laço com ${vinculo.nome} rompido: teste Sanidade DT ${teste?.dt ?? 15}, com perda de ${teste?.perda ?? '1d6'}. A mesa pode aplicar Luto Profundo, na aba Condições.`);
  };

  const iniciarAjuste = (vinculo: IVinculo, delta: number) => {
    const base = ajuste?.id === vinculo.id ? ajuste.para : vinculo.afinidade;
    setAjuste({
      id: vinculo.id,
      para: ehDoGrupo(vinculo) ? afinidadeDosPontos(base, pontosDoVinculo(base) + delta) : limitarAfinidade(base + delta),
      motivo: ajuste?.id === vinculo.id ? ajuste.motivo : '',
    });
  };

  const confirmarAjuste = () => {
    if (!ajuste) return;
    commit(vinculos.map((vinculo) => {
      if (vinculo.id !== ajuste.id) return vinculo;
      return ehDoGrupo(vinculo)
        ? aplicarPontos(vinculo, pontosDoVinculo(ajuste.para), ajuste.motivo)
        : aplicarAfinidade(vinculo, ajuste.para, ajuste.motivo);
    }));
    setAjuste(null);
  };

  const podeAdicionarFoto = !!form.foto || totalFotos < LIMITE_FOTOS_VINCULO;

  const renderVinculo = (vinculo: IVinculo) => {
    const cor = corAfinidade(vinculo.afinidade);
    const ajustando = ajuste?.id === vinculo.id ? ajuste : null;
    const atual = ajustando?.para ?? vinculo.afinidade;
    const historicoAberto = historicoAbertoId === vinculo.id;
    const aberto = !compacto || expandidoId === vinculo.id;
    const grupo = ehDoGrupo(vinculo);
    const pontos = pontosDoVinculo(vinculo.afinidade);
    const pontosAtuais = pontosDoVinculo(atual);
    const usos = usosDoVinculo(vinculo);
    const seCair = sanidadeDoVinculo(vinculo, 'cai', nivelDoPersonagem);
    const sePerder = sanidadeDoVinculo(vinculo, 'perde', nivelDoPersonagem);

    return (
      <article
        key={vinculo.id}
        id={`vinculo-${vinculo.id}`}
        className={`rounded-xl border bg-[#121118] transition-colors ${selecionadoId === vinculo.id ? 'border-[#c7a44c]/60' : 'border-white/5 hover:border-white/15'}`}
      >
        <div
          className={`flex items-center justify-between gap-3 ${compacto ? 'cursor-pointer px-3 py-2.5' : 'p-5 pb-0'}`}
          onClick={compacto ? () => {
            setSelecionadoId(vinculo.id);
            setExpandidoId(aberto ? null : vinculo.id);
          } : () => setSelecionadoId(vinculo.id)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar vinculo={vinculo} tamanho={compacto ? 38 : 48} />
            <div className="min-w-0">
              <h3 className={`truncate font-bold text-white ${compacto ? 'text-sm' : 'text-lg'}`}>
                {vinculo.fixado ? <Pin size={11} className="mr-1 inline text-[#c7a44c]" fill="currentColor" /> : null}
                {vinculo.nome}
              </h3>
              <span className="flex flex-wrap gap-1">
                <span className="inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: COR_TIPO[vinculo.tipo], borderColor: `${COR_TIPO[vinculo.tipo]}55` }}>
                  {rotuloTipo(vinculo.tipo)}
                </span>
                {vinculo.ramo ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#c7a44c]/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e3c46f]">
                    <Handshake size={10} aria-hidden="true" /> {rotuloConfianca(confiancaDoVinculo(vinculo.afinidade))}{vinculo.divida ? ' · Dívida' : ''}
                  </span>
                ) : null}
                {grupo ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-200">
                    <Users size={10} aria-hidden="true" /> Grupo · {tituloDoDegrau(pontos)}
                  </span>
                ) : null}
                {vinculo.laco ? (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${vinculo.lacoUsado ? 'border-white/10 text-gray-500' : 'border-sky-300/35 text-sky-200'}`}>
                    <Link2 size={10} aria-hidden="true" /> Laço
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          {compacto ? (
            <div className="flex shrink-0 items-center gap-3">
              {grupo ? (
                <span className="flex items-center gap-1" aria-label={`${pontos} de ${PONTOS_DE_RELACAO_MAXIMOS} Pontos de Relação`}>
                  {PASSOS_PONTOS.map((passo) => (
                    <span key={passo} className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: `${COR_PONTOS}80`, backgroundColor: passo <= pontos ? COR_PONTOS : 'transparent' }} />
                  ))}
                </span>
              ) : (
                <>
                  <span className="hidden text-xs font-bold sm:inline" style={{ color: cor }}>{rotuloAfinidade(vinculo.afinidade)}</span>
                  <span className="w-8 rounded-md border px-1.5 py-0.5 text-center text-xs font-bold" style={{ color: cor, borderColor: `${cor}55` }}>{sinal(vinculo.afinidade)}</span>
                </>
              )}
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${aberto ? 'rotate-180' : ''}`} />
            </div>
          ) : (
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label={vinculo.fixado ? 'Desafixar vínculo' : 'Fixar vínculo'} aria-pressed={vinculo.fixado} onClick={(e) => { e.stopPropagation(); alternarFixado(vinculo); }} className={`flex h-8 w-8 items-center justify-center rounded border border-white/5 bg-black/30 ${vinculo.fixado ? 'text-[#c7a44c]' : 'text-gray-500 hover:text-white'}`}>
                <Pin size={13} fill={vinculo.fixado ? 'currentColor' : 'none'} />
              </button>
              <button type="button" aria-label={`Editar ${vinculo.nome}`} onClick={(e) => { e.stopPropagation(); abrirEdicao(vinculo); }} className="flex h-8 w-8 items-center justify-center rounded border border-white/5 bg-black/30 text-gray-500 hover:text-white">
                <Pencil size={13} />
              </button>
              <button type="button" aria-label={`Apagar ${vinculo.nome}`} onClick={(e) => { e.stopPropagation(); excluir(vinculo); }} className="flex h-8 w-8 items-center justify-center rounded border border-white/5 bg-black/30 text-gray-500 hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {aberto ? (
          <div className={compacto ? 'space-y-3 border-t border-white/5 px-4 pb-4 pt-3' : 'space-y-3 p-5 pt-4'}>
            {grupo ? (
              <div className="space-y-3 rounded-lg border border-violet-300/15 bg-violet-300/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-violet-200">
                    <Users size={13} aria-hidden="true" /> Pontos de Relação · {tituloDoDegrau(pontosAtuais)}
                  </span>
                  <LinkDaRegra topico="pontos-de-relacao" rotulo="Regra" />
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label={`Tirar um ponto com ${vinculo.nome}`} disabled={pontosAtuais <= 0} onClick={() => iniciarAjuste(vinculo, -1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-300 hover:text-white disabled:opacity-30">
                    <Minus size={15} />
                  </button>
                  <div className="flex flex-1 justify-center gap-2" role="group" aria-label={`Pontos de Relação com ${vinculo.nome}`}>
                    {PASSOS_PONTOS.map((passo) => (
                      <button
                        key={passo}
                        type="button"
                        aria-label={`Definir ${passo} ponto${passo === 1 ? '' : 's'}`}
                        aria-pressed={passo <= pontosAtuais}
                        onClick={() => setAjuste({ id: vinculo.id, para: afinidadeDosPontos(atual, passo === pontosAtuais ? passo - 1 : passo), motivo: ajustando?.motivo ?? '' })}
                        className="h-7 w-7 rounded-full border-2 transition-colors"
                        style={{ borderColor: COR_PONTOS, backgroundColor: passo <= pontosAtuais ? COR_PONTOS : 'transparent', boxShadow: passo <= pontosAtuais ? `0 0 10px ${COR_PONTOS}55` : undefined }}
                      />
                    ))}
                  </div>
                  <button type="button" aria-label={`Dar um ponto com ${vinculo.nome}`} disabled={pontosAtuais >= PONTOS_DE_RELACAO_MAXIMOS} onClick={() => iniciarAjuste(vinculo, 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-300 hover:text-white disabled:opacity-30">
                    <Plus size={15} />
                  </button>
                </div>
                <p className="text-center text-xs leading-5 text-gray-400">
                  {DEGRAUS_DE_RELACAO[pontosAtuais].como}
                  {atual < 0 ? <span className="ml-1 font-bold text-orange-300">Há atrito entre os dois ({sinal(atual)}).</span> : null}
                </p>
                {pontos > 0 ? (
                  <div className="space-y-2 border-t border-white/5 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">Usos nesta sessão: <strong className="text-white">{usos.restantes}</strong> de {usos.total}</span>
                      <div className="flex gap-2">
                        {(vinculo.pontosUsados ?? 0) > 0 ? (
                          <button type="button" onClick={() => trocar(vinculo.id, (item) => devolverUsoDePonto(item))} className="min-h-8 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-500 hover:text-gray-200">Devolver</button>
                        ) : null}
                        <button type="button" disabled={usos.restantes <= 0} onClick={() => trocar(vinculo.id, (item) => gastarUsoDePonto(item))} className="min-h-8 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 text-xs font-bold text-violet-100 hover:border-violet-300/50 disabled:opacity-40">Gastar um uso</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {USOS_DE_PONTO.map((uso) => (
                        <span key={uso.id} title={`${uso.quando} ${uso.efeito}`} className="cursor-help rounded-full border border-violet-300/20 px-2 py-0.5 text-[10px] font-bold text-violet-200/90">{uso.titulo}</span>
                      ))}
                    </div>
                    {seCair && sePerder ? (
                      <p className="text-[11px] leading-4 text-gray-500">Se cair à sua vista: Sanidade DT {seCair.dt}, perda {seCair.perda}. Se morrer, sumir ou trair: DT {sePerder.dt}, perda {sePerder.perda}.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {grupo ? null : (
            <div className="flex items-center gap-3">
              <button type="button" aria-label={`Diminuir afinidade com ${vinculo.nome}`} disabled={atual <= AFINIDADE_MIN} onClick={() => iniciarAjuste(vinculo, -1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-300 hover:text-white disabled:opacity-30">
                <Minus size={15} />
              </button>
              <div className="flex-1">
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-bold" style={{ color: corAfinidade(atual) }}>{rotuloAfinidade(atual)}</span>
                  <span className="font-bold text-gray-500">{sinal(atual)}</span>
                </div>
                <div className="flex gap-[3px]" role="group" aria-label={`Afinidade com ${vinculo.nome}`}>
                  {ESCALA.map((passo) => {
                    const aceso = passo === 0 ? atual === 0 : atual > 0 ? passo > 0 && passo <= atual : atual < 0 && passo < 0 && passo >= atual;
                    return (
                      <button
                        key={passo}
                        type="button"
                        aria-label={`Definir afinidade ${sinal(passo)}`}
                        onClick={() => setAjuste({ id: vinculo.id, para: passo, motivo: ajustando?.motivo ?? '' })}
                        className="h-3 flex-1 rounded-sm transition-colors"
                        style={{
                          backgroundColor: aceso ? corAfinidade(atual) : 'rgba(255,255,255,0.07)',
                          outline: passo === 0 ? '1px solid rgba(255,255,255,0.25)' : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <button type="button" aria-label={`Aumentar afinidade com ${vinculo.nome}`} disabled={atual >= AFINIDADE_MAX} onClick={() => iniciarAjuste(vinculo, 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-300 hover:text-white disabled:opacity-30">
                <Plus size={15} />
              </button>
            </div>
            )}

            {ajustando ? (
              <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
                <input
                  autoFocus
                  value={ajustando.motivo}
                  maxLength={200}
                  onChange={(e) => setAjuste({ ...ajustando, motivo: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmarAjuste(); }}
                  placeholder="O que aconteceu? (opcional)"
                  className="w-full rounded-lg border border-white/10 bg-[#0b0a10] px-3 py-2 text-sm text-white outline-none focus:border-[#c7a44c]/50"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAjuste(null)} className="rounded border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white">Cancelar</button>
                  <button type="button" onClick={confirmarAjuste} disabled={grupo ? pontosAtuais === pontos : ajustando.para === vinculo.afinidade} className="rounded border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-1.5 text-xs font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20 disabled:opacity-40">Confirmar</button>
                </div>
              </div>
            ) : null}

            {vinculo.ramo ? (() => {
              const confianca = confiancaDoVinculo(vinculo.afinidade);
              const aceitos = new Set(favoresDoContato(vinculo.afinidade).map((favor) => favor.id));
              return (
                <div className="space-y-2 rounded-lg border border-[#c7a44c]/15 bg-[#c7a44c]/[0.04] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#e3c46f]">
                      <Handshake size={13} aria-hidden="true" /> Contato · {rotuloRamo(vinculo.ramo)} · {rotuloConfianca(confianca)}
                    </span>
                    <LinkDaRegra topico="contatos-lacos" secao="Favores" rotulo="Favores" />
                  </div>
                  <p className="text-xs leading-5 text-gray-400">
                    {NIVEIS_DE_CONFIANCA.find((nivel) => nivel.nivel === confianca)?.postura || 'Com afinidade 0 ou menos, o contato se perdeu e não faz favores.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {FAVORES.map((favor) => (
                      <span key={favor.id} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${aceitos.has(favor.id) ? 'border-emerald-400/30 text-emerald-200' : 'border-white/10 text-gray-600 line-through'}`}>
                        {favor.titulo}{aceitos.has(favor.id) && favor.id === 'grande' && confianca < 3 ? ' · Diplomacia' : ''}
                      </span>
                    ))}
                  </div>
                  {vinculo.divida ? (
                    <div className="space-y-2 border-t border-white/5 pt-2">
                      <p className="text-xs leading-5 text-amber-200/90"><strong>Dívida:</strong> {vinculo.divida}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => trocar(vinculo.id, (item) => cumprirDivida(item))} className="min-h-8 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-100 hover:border-emerald-400/45">Cumprir (Confiança sobe)</button>
                        <button type="button" onClick={() => trocar(vinculo.id, (item) => recusarDivida(item))} className="min-h-8 rounded-lg border border-red-400/25 bg-red-400/10 px-3 text-xs font-bold text-red-100 hover:border-red-400/45">Recusar (Confiança cai)</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })() : null}

            {vinculo.laco ? (
              <div className="space-y-2 rounded-lg border border-sky-300/15 bg-sky-300/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-200"><Link2 size={13} aria-hidden="true" /> Laço</span>
                  <LinkDaRegra topico="contatos-lacos" secao="Laços" rotulo="Laços" />
                </div>
                <p className="text-sm italic leading-6 text-gray-300">"{vinculo.laco}"</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={!!vinculo.lacoUsado} onClick={() => alternarLacoUsado(vinculo)} className={`min-h-8 rounded-lg border px-3 text-xs font-bold ${vinculo.lacoUsado ? 'border-white/10 bg-black/20 text-gray-500 hover:text-gray-300' : 'border-sky-300/30 bg-sky-300/10 text-sky-100 hover:border-sky-300/50'}`}>
                    {vinculo.lacoUsado ? 'Vantagem usada nesta sessão' : 'Usar a vantagem (1 por sessão)'}
                  </button>
                  <button type="button" onClick={() => romperLaco(vinculo)} className="min-h-8 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-500 hover:border-red-400/30 hover:text-red-200">Laço rompido</button>
                </div>
              </div>
            ) : null}

            {vinculo.nota ? <p className="whitespace-pre-wrap text-sm leading-6 text-gray-400">{vinculo.nota}</p> : null}

            {vinculo.historico.length > 0 ? (
              <div className="border-t border-white/5 pt-3">
                <button type="button" aria-expanded={historicoAberto} onClick={() => setHistoricoAbertoId(historicoAberto ? null : vinculo.id)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-white">
                  <History size={13} /> {vinculo.historico.length} mudança{vinculo.historico.length === 1 ? '' : 's'}
                </button>
                {historicoAberto ? (
                  <ul className="mt-2 space-y-1.5">
                    {[...vinculo.historico].reverse().map((mudanca, indice) => (
                      <li key={`${mudanca.em}-${indice}`} className="text-xs leading-5 text-gray-400">
                        {grupo ? (
                          <span className="font-bold" style={{ color: COR_PONTOS }}>{pontosDoVinculo(mudanca.de)} → {pontosDoVinculo(mudanca.para)} ponto{pontosDoVinculo(mudanca.para) === 1 ? '' : 's'}</span>
                        ) : (
                          <span className="font-bold" style={{ color: corAfinidade(mudanca.para) }}>{sinal(mudanca.de)} → {sinal(mudanca.para)}</span>
                        )}
                        {mudanca.motivo ? ` · ${mudanca.motivo}` : ''}
                        <span className="ml-1 text-gray-600">{dataCurta(mudanca.em)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {compacto ? (
              <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                <button type="button" onClick={() => alternarFixado(vinculo)} aria-pressed={vinculo.fixado} className={`flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold ${vinculo.fixado ? 'text-[#c7a44c]' : 'text-gray-400 hover:text-white'}`}>
                  <Pin size={12} fill={vinculo.fixado ? 'currentColor' : 'none'} /> {vinculo.fixado ? 'Fixado' : 'Fixar'}
                </button>
                <button type="button" onClick={() => abrirEdicao(vinculo)} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-400 hover:text-white">
                  <Pencil size={12} /> Editar
                </button>
                <button type="button" onClick={() => excluir(vinculo)} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-400 hover:text-red-400">
                  <Trash2 size={12} /> Apagar
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  };

  const classeGrade = compacto ? 'grid grid-cols-1 gap-2 xl:grid-cols-2' : 'grid grid-cols-1 gap-4 lg:grid-cols-2';

  return (
    <div className="space-y-5" data-tour="vinculos-teia">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#0f0e15] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-gray-400">
          Quem importa para o seu personagem. A afinidade vai de {AFINIDADE_MIN} a +{AFINIDADE_MAX}: quanto
          mais perto do centro da teia, mais o personagem confia. Com quem é do grupo, a ficha mostra os
          Pontos de Relação, de 0 a {PONTOS_DE_RELACAO_MAXIMOS}. Cada mudança fica no histórico.
        </p>
        <button
          type="button"
          disabled={cheio}
          onClick={() => abrirNovo()}
          className="min-h-11 shrink-0 rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-5 text-sm font-bold text-[#c7a44c] transition-colors hover:bg-[#c7a44c]/20 disabled:opacity-40"
        >
          + Novo vínculo
        </button>
      </div>

      {vinculos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {resumo.map((item) => (
            <div key={item.rotulo} className="rounded-xl border border-white/5 bg-[#0f0e15] px-4 py-3">
              <div className="text-2xl font-bold" style={{ color: item.cor, fontFamily: 'Cinzel, serif' }}>{item.valor}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.rotulo}</div>
            </div>
          ))}
        </div>
      ) : null}

      {vinculos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/5 bg-[#0f0e15] px-4 py-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><Handshake size={14} className="text-[#c7a44c]" aria-hidden="true" /> Contatos <strong className={contatos.length > limiteContatos ? 'text-amber-300' : 'text-white'}>{contatos.length}</strong> de {limiteContatos}</span>
          <span className="flex items-center gap-1.5"><Link2 size={14} className="text-sky-300" aria-hidden="true" /> Laços <strong className={lacos.length > LACOS_MAXIMOS ? 'text-amber-300' : 'text-white'}>{lacos.length}</strong> de {LACOS_MAXIMOS}</span>
          <span className="flex items-center gap-1.5"><Users size={14} className="text-violet-300" aria-hidden="true" /> Do grupo <strong className="text-white">{doGrupo.length}</strong></span>
          {rotuloNovaSessao ? (
            <button type="button" onClick={() => commit(novaSessaoNosVinculos(vinculos))} className="min-h-8 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 font-bold text-sky-100 hover:border-sky-300/45">
              Nova sessão: liberar {rotuloNovaSessao}
            </button>
          ) : null}
          <span className="flex flex-wrap gap-3 sm:ml-auto">
            <LinkDaRegra topico="pontos-de-relacao" rotulo="Pontos de Relação" />
            <LinkDaRegra topico="contatos-lacos" rotulo="Contatos e Laços" />
          </span>
          {contatos.length > limiteContatos ? <p className="w-full text-[11px] text-amber-200/80">Acima do limite de 2 + Mod.Carisma: um dos contatos esfria e fica sem favores até sobrar vaga.</p> : null}
          {lacos.length > LACOS_MAXIMOS ? <p className="w-full text-[11px] text-amber-200/80">A regra pede no máximo {LACOS_MAXIMOS} laços. Escolha quais continuam.</p> : null}
        </div>
      ) : null}

      {sugestoes.length > 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#0f0e15] p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Da aba Aliados, ainda sem vínculo</p>
          <div className="flex flex-wrap gap-2">
            {sugestoes.slice(0, 8).map((aliado) => (
              <button
                key={aliado.id}
                type="button"
                disabled={cheio}
                onClick={() => abrirNovo({ nome: aliado.nome, tipo: 'aliado', afinidade: 2, aliadoId: aliado.id, grupo: true })}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-[#121118] px-3 text-xs font-bold text-gray-300 transition-colors hover:border-[#c7a44c]/40 hover:text-white disabled:opacity-40"
              >
                <UserPlus size={13} /> {aliado.nome}
              </button>
            ))}
            {sugestoes.length > 8 ? <span className="self-center text-xs text-gray-600">+{sugestoes.length - 8}</span> : null}
          </div>
        </div>
      ) : null}

      {vinculos.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#0f0e15] py-12 text-center">
          <Heart size={44} className="mx-auto mb-4 text-gray-700" />
          <p className="font-bold uppercase tracking-widest text-gray-500">Nenhum vínculo ainda</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Registre família, amores, mentores, rivais e dívidas. O Mestre também pode mexer na afinidade quando a história pedir.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0b0a10]">
            <button
              type="button"
              aria-expanded={teiaAberta}
              onClick={() => setTeiaAberta(!teiaAberta)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                Teia de vínculos
                {ocultos > 0 ? <span className="ml-2 normal-case tracking-normal text-gray-600">mostrando os {naTeia.length} mais relevantes de {filtrados.length}</span> : null}
              </span>
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${teiaAberta ? 'rotate-180' : ''}`} />
            </button>
            {teiaAberta ? (
              <>
                {naTeia.length === 0 ? (
                  <p className="px-4 pb-6 text-center text-sm text-gray-500">Ninguém para mostrar com esses filtros.</p>
                ) : (
                  <svg viewBox="-190 -165 380 330" role="img" aria-label={`Teia de vínculos de ${nomeCentro}`} className="mx-auto block h-auto w-full max-w-2xl">
                    <defs>
                      <radialGradient id="teia-brilho" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#c7a44c" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#c7a44c" stopOpacity="0" />
                      </radialGradient>
                      <clipPath id="teia-foto-centro"><circle r={26} /></clipPath>
                      {naTeia.filter((vinculo) => vinculo.foto).map((vinculo) => (
                        <clipPath key={vinculo.id} id={`teia-foto-${vinculo.id}`}><circle r={raioNo - 2} /></clipPath>
                      ))}
                    </defs>
                    <circle r={150} fill="url(#teia-brilho)" />
                    {[{ raio: 118, rotulo: 'Hostil' }, { raio: 79, rotulo: 'Neutro' }, { raio: 45, rotulo: 'Próximo' }].map(({ raio, rotulo }) => (
                      <g key={raio}>
                        <circle r={raio} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 5" />
                        <text x={0} y={-raio - 3} textAnchor="middle" fontSize={7} letterSpacing={1.5} fill="rgba(255,255,255,0.22)">{rotulo.toUpperCase()}</text>
                      </g>
                    ))}
                    {naTeia.map((vinculo) => {
                      const posicao = posicaoDe(vinculo.id);
                      if (!posicao) return null;
                      return (
                        <line
                          key={`linha-${vinculo.id}`}
                          x1={0}
                          y1={0}
                          x2={posicao.x}
                          y2={posicao.y}
                          stroke={corAfinidade(vinculo.afinidade)}
                          strokeOpacity={selecionadoId && selecionadoId !== vinculo.id ? 0.12 : denso ? 0.4 : 0.65}
                          strokeWidth={1 + Math.abs(vinculo.afinidade) * 0.4}
                          strokeDasharray={vinculo.afinidade < 0 ? '4 3' : undefined}
                        />
                      );
                    })}
                    <circle r={29} fill="#1a1824" stroke="#c7a44c" strokeWidth={2.5} />
                    {fotoCentro ? (
                      <image href={fotoCentro} x={-26} y={-26} width={52} height={52} preserveAspectRatio="xMidYMid slice" clipPath="url(#teia-foto-centro)" />
                    ) : (
                      <text y={5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#e3c46f">{iniciais(nomeCentro)}</text>
                    )}
                    {naTeia.map((vinculo) => {
                      const posicao = posicaoDe(vinculo.id);
                      if (!posicao) return null;
                      const cor = corAfinidade(vinculo.afinidade);
                      const ativo = selecionadoId === vinculo.id;
                      const apagado = !!selecionadoId && !ativo;
                      const mostrarNome = !denso || ativo || vinculo.fixado;
                      return (
                        <g
                          key={vinculo.id}
                          transform={`translate(${posicao.x} ${posicao.y})`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${vinculo.nome}, ${rotuloAfinidade(vinculo.afinidade)}`}
                          opacity={apagado ? 0.4 : 1}
                          onClick={() => escolherNaTeia(vinculo)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              escolherNaTeia(vinculo);
                            }
                          }}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          <title>{ehDoGrupo(vinculo)
                            ? `${vinculo.nome} · Grupo · ${pontosDoVinculo(vinculo.afinidade)} de ${PONTOS_DE_RELACAO_MAXIMOS} Pontos de Relação`
                            : `${vinculo.nome} · ${rotuloTipo(vinculo.tipo)} · ${rotuloAfinidade(vinculo.afinidade)} (${sinal(vinculo.afinidade)})`}</title>
                          {ativo ? <circle r={raioNo + 7} fill="none" stroke={cor} strokeOpacity={0.35} strokeWidth={4} /> : null}
                          {vinculo.laco ? <circle r={raioNo + 4} fill="none" stroke="#7dd3fc" strokeOpacity={vinculo.lacoUsado ? 0.25 : 0.7} strokeWidth={1.2} strokeDasharray="2 2" /> : null}
                          <circle r={ativo ? raioNo + 2 : raioNo} fill="#121118" stroke={cor} strokeWidth={ativo ? 3 : 2} />
                          {vinculo.foto ? (
                            <image href={vinculo.foto} x={-(raioNo - 2)} y={-(raioNo - 2)} width={(raioNo - 2) * 2} height={(raioNo - 2) * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#teia-foto-${vinculo.id})`} />
                          ) : (
                            <text y={3.5} textAnchor="middle" fontSize={denso ? 8.5 : 10} fontWeight={700} fill="#fff">{iniciais(vinculo.nome)}</text>
                          )}
                          <circle cx={raioNo * 0.78} cy={-raioNo * 0.78} r={3.5} fill={COR_TIPO[vinculo.tipo]} stroke="#0b0a10" strokeWidth={1.5} />
                          {mostrarNome ? (
                            <text y={raioNo + 13} textAnchor="middle" fontSize={9} fontWeight={600} fill="#d1d5db" stroke="#0b0a10" strokeWidth={3} paintOrder="stroke">
                              {vinculo.nome.length > 14 ? `${vinculo.nome.slice(0, 13)}…` : vinculo.nome}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>
                )}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {(Object.keys(COR_TIPO) as TipoVinculo[]).filter((tipo) => vinculos.some((vinculo) => vinculo.tipo === tipo)).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      aria-pressed={tipoFiltro === tipo}
                      onClick={() => setTipoFiltro(tipoFiltro === tipo ? 'todos' : tipo)}
                      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors hover:text-white ${tipoFiltro === tipo ? 'bg-white/10 text-white' : ''}`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_TIPO[tipo] }} />
                      {rotuloTipo(tipo)}
                    </button>
                  ))}
                </div>
                {denso ? (
                  <p className="border-t border-white/5 px-4 py-2 text-center text-[11px] text-gray-600">
                    Com muita gente, os nomes aparecem ao passar o mouse. Clique num nó para abrir o cartão.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou anotação..."
                  aria-label="Buscar vínculos"
                  className="w-full rounded-xl border border-white/5 bg-[#0f0e15] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#c7a44c]/50"
                />
              </div>
              <Select
                ariaLabel="Filtrar por tipo de relação"
                value={tipoFiltro}
                onChange={(valor) => setTipoFiltro(valor as IFiltroVinculos['tipo'])}
                options={[{ value: 'todos', label: 'Todos os tipos' }, ...TIPOS_VINCULO.map((tipo) => ({ value: tipo.valor, label: tipo.rotulo }))]}
                className="w-full rounded-xl border-white/5 bg-[#0f0e15] px-4 py-3 text-sm text-gray-300"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por afinidade">
                {FAIXAS.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    aria-pressed={faixa === opcao.valor}
                    onClick={() => setFaixa(opcao.valor)}
                    className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors ${faixa === opcao.valor
                      ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e3c46f]'
                      : 'border-white/10 bg-[#0f0e15] text-gray-400 hover:text-white'}`}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={agrupar}
                  onClick={() => setAgrupar(!agrupar)}
                  className={`min-h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${agrupar ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e3c46f]' : 'border-white/10 bg-[#0f0e15] text-gray-400 hover:text-white'}`}
                >
                  Agrupar por tipo
                </button>
                <div className="flex overflow-hidden rounded-lg border border-white/10" role="group" aria-label="Modo de exibição">
                  {([['cartoes', 'Cartões', LayoutGrid], ['lista', 'Lista compacta', List]] as const).map(([valor, rotulo, Icone]) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={visao === valor}
                      aria-label={rotulo}
                      title={rotulo}
                      onClick={() => setVisaoEscolhida(valor)}
                      className={`flex h-9 w-10 items-center justify-center transition-colors ${visao === valor ? 'bg-[#c7a44c]/15 text-[#e3c46f]' : 'bg-[#0f0e15] text-gray-500 hover:text-white'}`}
                    >
                      <Icone size={15} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{filtrando ? `${filtrados.length} de ${vinculos.length} vínculos` : `${vinculos.length} vínculo${vinculos.length === 1 ? '' : 's'}`}</span>
              {filtrando ? (
                <button type="button" onClick={limparFiltros} className="flex items-center gap-1 font-bold text-[#c7a44c] hover:text-[#e3c46f]">
                  <X size={12} /> Limpar filtros
                </button>
              ) : null}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-[#0f0e15] py-10 text-center text-sm text-gray-500">
              Ninguém se encaixa nesses filtros.
            </p>
          ) : grupos ? (
            <div className="space-y-6">
              {grupos.map((grupo) => (
                <section key={grupo.tipo} aria-label={grupo.rotulo}>
                  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_TIPO[grupo.tipo] }} />
                    {grupo.rotulo}
                    <span className="text-gray-600">{grupo.itens.length}</span>
                    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </h3>
                  <div className={classeGrade}>{grupo.itens.map(renderVinculo)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className={classeGrade}>{recorte.map(renderVinculo)}</div>
          )}

          {filtrados.length > recorte.length ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setLimite((valor) => valor + PAGINA)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#0f0e15] px-6 text-sm font-bold text-gray-300 hover:text-white"
              >
                Mostrar mais ({filtrados.length - recorte.length})
              </button>
            </div>
          ) : null}
        </>
      )}

      <FichaModal isOpen={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar vínculo' : 'Novo vínculo'} eyebrow="Relações" size="lg">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditandoFoto(true)}
                disabled={!podeAdicionarFoto}
                aria-label={form.foto ? 'Trocar retrato' : 'Adicionar retrato'}
                className="group relative shrink-0 rounded-full disabled:opacity-40"
              >
                <Avatar vinculo={{ nome: form.nome || '?', foto: form.foto, afinidade: form.afinidade }} tamanho={72} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera size={20} />
                </span>
              </button>
              <div className="text-xs leading-5 text-gray-500">
                <button type="button" onClick={() => setEditandoFoto(true)} disabled={!podeAdicionarFoto} className="block font-bold text-[#c7a44c] hover:text-[#e3c46f] disabled:opacity-40">
                  {form.foto ? 'Trocar retrato' : 'Adicionar retrato'}
                </button>
                {form.foto ? (
                  <button type="button" onClick={() => setForm({ ...form, foto: undefined })} className="block font-bold text-gray-500 hover:text-red-400">
                    Remover
                  </button>
                ) : (
                  <span>{podeAdicionarFoto ? 'Opcional' : `Limite de ${LIMITE_FOTOS_VINCULO} retratos`}</span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <LabeledInput label="Nome" value={form.nome} placeholder="Ex.: Mira, a ferreira" onChange={(v: string) => setForm({ ...form, nome: v })} />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo de relação</span>
            <Select
              ariaLabel="Tipo de relação"
              value={form.tipo}
              onChange={(valor) => setForm({ ...form, tipo: valor as TipoVinculo, contato: form.contato || valor === 'contato' })}
              options={TIPOS_VINCULO.map((tipo) => ({ value: tipo.valor, label: tipo.rotulo }))}
              className="w-full rounded-xl border-white/5 bg-[#0f0e15] px-4 py-3 text-sm text-gray-300"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-4 text-sm text-gray-300">
            <input type="checkbox" checked={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.checked })} className="mt-1 h-4 w-4 accent-violet-300" />
            <span>
              <strong className="text-white">Personagem do grupo</strong>
              <span className="block text-xs leading-5 text-gray-500">Outro personagem de jogador, ou um Aliado que anda com vocês. A ficha mostra os Pontos de Relação no lugar da afinidade, com os usos da sessão.</span>
            </span>
          </label>

          {form.grupo ? (
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pontos de Relação</span>
                <span className="rounded-full border px-3 py-1 text-xs font-bold" style={{ color: COR_PONTOS, borderColor: `${COR_PONTOS}55`, backgroundColor: `${COR_PONTOS}14` }}>
                  {tituloDoDegrau(pontosDoVinculo(form.afinidade))} · {pontosDoVinculo(form.afinidade)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pontos de Relação">
                {DEGRAUS_DE_RELACAO.map((degrau) => {
                  const marcado = pontosDoVinculo(form.afinidade) === degrau.pontos;
                  return (
                    <button
                      key={degrau.pontos}
                      type="button"
                      role="radio"
                      aria-checked={marcado}
                      aria-label={`${degrau.pontos} ponto${degrau.pontos === 1 ? '' : 's'}, ${degrau.titulo}`}
                      onClick={() => setForm({ ...form, afinidade: afinidadeDosPontos(form.afinidade, degrau.pontos) })}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-lg border px-1 text-center transition-colors ${marcado ? 'border-violet-300/60 bg-violet-300/15 text-white' : 'border-white/10 text-gray-500 hover:text-gray-200'}`}
                    >
                      <span className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif' }}>{degrau.pontos}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{degrau.titulo}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-500">{DEGRAUS_DE_RELACAO[pontosDoVinculo(form.afinidade)].como} Cada ponto é um uso por sessão: Ajuda certa, Segurar a mão ou entrar junto num Ataque Combinado.</p>
            </div>
          ) : (
          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Afinidade</span>
              <span
                className="rounded-full border px-3 py-1 text-xs font-bold"
                style={{ color: corAfinidade(form.afinidade), borderColor: `${corAfinidade(form.afinidade)}55`, backgroundColor: `${corAfinidade(form.afinidade)}14` }}
              >
                {rotuloAfinidade(form.afinidade)} · {sinal(form.afinidade)}
              </span>
            </div>
            <div className="flex gap-1" role="radiogroup" aria-label="Afinidade">
              {ESCALA.map((passo) => {
                const marcado = passo === form.afinidade;
                const cor = corAfinidade(passo);
                return (
                  <button
                    key={passo}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    aria-label={`${sinal(passo)}, ${rotuloAfinidade(passo)}`}
                    onClick={() => setForm({ ...form, afinidade: passo })}
                    className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 outline-none"
                  >
                    <span
                      className="h-9 w-full rounded-md border transition-all group-focus-visible:ring-2 group-focus-visible:ring-[#c7a44c]"
                      style={{
                        backgroundColor: marcado ? cor : `${cor}22`,
                        borderColor: marcado ? cor : `${cor}40`,
                        boxShadow: marcado ? `0 0 12px ${cor}66` : undefined,
                        transform: marcado ? 'translateY(-2px)' : undefined,
                      }}
                    />
                    <span className={`text-[10px] font-bold ${marcado ? 'text-white' : 'text-gray-600'}`}>{sinal(passo)}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-600">
              <span>Hostil</span>
              <span>Neutro</span>
              <span>Confiança</span>
            </div>
          </div>
          )}

          <div className="space-y-3 rounded-xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Na mesa</span>
              <LinkDaRegra topico="contatos-lacos" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-300">
              <input type="checkbox" checked={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.checked })} className="mt-1 h-4 w-4 accent-[#c7a44c]" />
              <span>
                <strong className="text-white">Faz favores (contato)</strong>
                <span className="block text-xs leading-5 text-gray-500">A Confiança sai da afinidade: 1 ou 2 é Conhecido, 3 ou 4 é Amigo, 5 é Leal. Agora: {rotuloConfianca(confiancaDoVinculo(form.afinidade))}.</span>
              </span>
            </label>
            {form.contato ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Ramo</span>
                  <Select
                    ariaLabel="Ramo do contato"
                    value={form.ramo}
                    onChange={(valor) => setForm({ ...form, ramo: valor })}
                    options={RAMOS_CONTATO.map((ramo) => ({ value: ramo.valor, label: ramo.rotulo }))}
                    className="w-full rounded-xl border-white/5 bg-[#0f0e15] px-4 py-3 text-sm text-gray-300"
                  />
                  <span className="mt-1 block text-[11px] leading-4 text-gray-600">{RAMOS_CONTATO.find((ramo) => ramo.valor === form.ramo)?.exemplo}</span>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Dívida que ele guarda</span>
                  <input
                    value={form.divida}
                    maxLength={300}
                    onChange={(e) => setForm({ ...form, divida: e.target.value })}
                    placeholder="Vazio quando não há Dívida"
                    className="w-full rounded-xl border border-white/10 bg-[#0f0e15] px-3 py-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
                  />
                </label>
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Laço (opcional)</span>
              <input
                value={form.laco}
                maxLength={300}
                onChange={(e) => setForm({ ...form, laco: e.target.value })}
                placeholder="Devo a vida a ela, e ela nunca cobrou."
                className="w-full rounded-xl border border-white/10 bg-[#0f0e15] px-3 py-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
              />
              <span className="mt-1 block text-[11px] leading-4 text-gray-600">Uma frase na voz do personagem. Uma vez por sessão, um teste feito por causa dela tem vantagem. Laços: {lacos.length} de {LACOS_MAXIMOS}.</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Anotação</span>
            <textarea
              value={form.nota}
              maxLength={1200}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
              placeholder="Como se conheceram, o que ela quer, o que você deve a ela..."
              className="min-h-28 w-full rounded-xl border border-white/10 bg-[#0f0e15] p-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
            <button type="button" onClick={() => setModalAberto(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={salvar} disabled={!form.nome.trim()} className="rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-5 py-2.5 text-sm font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20 disabled:opacity-40">
              {editandoId ? 'Salvar alterações' : 'Criar vínculo'}
            </button>
          </div>
        </div>
      </FichaModal>

      <AnimatePresence>
        {editandoFoto ? (
          <ModalPortal manageFocus={false} onClose={() => setEditandoFoto(false)}>
            <AjustarFotoModal
              nome={form.nome || 'vínculo'}
              titulo="Retrato do vínculo"
              fotoAtual={form.foto ?? null}
              resolucao={RESOLUCAO_FOTO_VINCULO}
              qualidade={0.7}
              onCancelar={() => setEditandoFoto(false)}
              onConfirmar={(dataUrl) => {
                if (!fotoVinculoValida(dataUrl)) {
                  avisar.aviso('Essa imagem ficou pesada demais para um retrato. Tente outra, mais simples.');
                  return;
                }
                setForm((atual) => ({ ...atual, foto: dataUrl }));
                setEditandoFoto(false);
              }}
            />
          </ModalPortal>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
