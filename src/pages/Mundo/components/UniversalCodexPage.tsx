import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Building2,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  ExternalLink,
  Gem,
  Ghost,
  Globe2,
  History,
  Landmark,
  Lock,
  MessagesSquare,
  Pencil,
  Plus,
  Search,
  Skull,
  Sparkles,
  Sun,
  UserRound,
  Languages,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import type { EntidadeCatalogo } from '../../../../data/mundo/entidades';
import type { FaccaoDocumentada } from '../../../../data/regras/faccoes';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  registrosUniversaisApi,
  type IDadosRegistro,
  type IRegistroDoServidor,
  type RevelacaoRegistro,
  type SecaoUniversal,
} from '../../../services/registrosUniversaisApi';
import { CarimboRetido, RasuraTexto, RasuraTitulo } from '../../../components/ui/Rasura';
import { SeletorDeVisibilidade, type IOpcaoDeVisibilidade } from '../../../components/ui/SeletorDeVisibilidade';
import { EditorDeLoreModal } from '../../../components/conteudo/EditorEmModal';
import { loreVisivelParaJogadores, salvarVisibilidadeDeLore } from '../visibilidadeRapida';
import { GRUPOS_DE_SERES, registrosDeFabrica } from '../universais/dadosPadrao';
import { EditorDeRegistro } from '../universais/EditorDeRegistro';
import { FichaArtefato } from '../universais/FichaArtefato';
import { FichaCriatura } from '../universais/FichaCriatura';
import { Brasao } from '../universais/Brasao';
import { FichaFaccao } from '../universais/FichaFaccao';
import { identidadeDe } from '../universais/identidadesFaccao';
import { ICONES_DE_LOCAL } from '../universais/iconesDeLocal';
import { identidadeDeLocal } from '../universais/identidadesLocal';
import { FichaIdioma } from '../universais/FichaIdioma';
import { FichaLocal } from '../universais/FichaLocal';
import { raridadeDe } from '../universais/artefatos';
import { DEGRAUS, degrauDoVd, faixaDoDegrau, rgbDoDegrau, type DegrauId } from '../universais/bestiario';
import {
  ROTULO_REVELACAO,
  SECOES_UNIVERSAIS,
  etiquetasDaLista,
  filtrarRegistros,
  gruposDaLista,
  mesclarRegistros,
  tiposDeCriatura,
  secaoNaTela,
  type IRegistro,
  type ISecaoUniversal,
} from '../universais/registros';
import { TEMAS, estiloDaSecao, rgbValido } from '../universais/temas';
import '../universais/universais.css';

interface IUniversalRecordsPageProps {
  catalog: LoreEntry[];
  factions: FaccaoDocumentada[];
  /** As Entidades publicadas e a visibilidade delas na campanha (alimentam o grupo Entidades de Seres). */
  entities?: EntidadeCatalogo[];
  entidadesRevelado?: string[];
  entidadesOculto?: string[];
  /** Árvores trancadas para esta pessoa: a Deidade dela não entra em Seres. */
  arvoresTrancadas?: string[];
  /** Seções que o criador escondeu dos jogadores. O Mestre continua vendo, com a marca de oculta. */
  secoesOcultas?: string[];
  isMestre: boolean;
  loreRevelado: string[];
  loreOculto: string[];
  /** Só o criador edita o texto e a visibilidade de seres e locais da lore (o conteúdo é global). */
  podeEditarConteudo?: boolean;
  onBack: () => void;
  onOpenGlobalTimeline?: () => void;
}

const OPCOES_DE_REGISTRO: IOpcaoDeVisibilidade<RevelacaoRegistro>[] = [
  { id: 'aberto', rotulo: 'Aberto', icone: Eye, tom: 'aberto', ajuda: 'Os jogadores leem tudo.' },
  { id: 'rasurado', rotulo: 'Rasurado', icone: Lock, tom: 'retido', ajuda: 'Os jogadores veem que existe, mas só faixas de tinta.' },
  { id: 'oculto', rotulo: 'Oculto', icone: EyeOff, tom: 'oculto', ajuda: 'Os jogadores nem sabem que existe.' },
];

const OPCOES_DE_LORE: IOpcaoDeVisibilidade<'visivel' | 'retido'>[] = [
  { id: 'visivel', rotulo: 'Visível', icone: Eye, tom: 'aberto', ajuda: 'Os jogadores leem este registro.' },
  { id: 'retido', rotulo: 'Retido', icone: Lock, tom: 'retido', ajuda: 'Os jogadores veem que ele existe, mas só faixas de tinta.' },
];

const ICONE_SECAO: Record<SecaoUniversal, LucideIcon> = {
  bestiario: Skull,
  seres: Sparkles,
  faccoes: Building2,
  locais: Landmark,
  artefatos: Gem,
  personagens: UserRound,
  glossario: Languages,
  rumores: MessagesSquare,
};

const ICONE_GRUPO_DE_SER: Record<string, LucideIcon> = {
  Deidades: Sun,
  Entidades: Ghost,
  Soberanos: Crown,
  Espíritos: Flame,
};

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

type Ordem = 'nome' | 'vd';

/** Rasurados vão para o fim da lista. Em Seres os grupos seguem a ordem de importância; no Bestiário o Mestre pode ordenar por VD. */
const ordenar = (lista: IRegistro[], secao: SecaoUniversal, ordem: Ordem): IRegistro[] => [...lista].sort((a, b) => {
  const retidoA = a.revelacao === 'rasurado' ? 1 : 0;
  const retidoB = b.revelacao === 'rasurado' ? 1 : 0;
  if (retidoA !== retidoB) return retidoA - retidoB;
  if (secao === 'bestiario' && ordem === 'vd') {
    const diferenca = (b.vd ?? 0) - (a.vd ?? 0);
    if (diferenca) return diferenca;
  }
  if (secao === 'seres') {
    const posicao = (registro: IRegistro) => {
      const indice = (GRUPOS_DE_SERES as readonly string[]).indexOf(registro.grupo ?? '');
      return indice === -1 ? GRUPOS_DE_SERES.length : indice;
    };
    const diferenca = posicao(a) - posicao(b);
    if (diferenca) return diferenca;
  }
  return a.titulo.localeCompare(b.titulo, 'pt-BR');
});

/** Marcas e botões do Mestre no topo de uma ficha. */
const Acoes = ({ registro, gestor, onEditar, onEditarLore, visibilidade }: { registro: IRegistro; gestor: boolean; onEditar: () => void; onEditarLore?: () => void; visibilidade?: React.ReactNode }) => (
  <>
    {registro.editado && registro.secao !== 'faccoes' ? <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200">ajustado pelo Mestre</span> : null}
    {gestor && !visibilidade && registro.revelacao !== 'aberto' ? <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200"><EyeOff size={11} /> {ROTULO_REVELACAO[registro.revelacao]}</span> : null}
    {gestor ? visibilidade : null}
    {gestor && registro.editor === 'servidor' ? (
      <button type="button" onClick={onEditar} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-300 transition hover:border-white/40 hover:text-white"><Pencil size={12} /> Editar</button>
    ) : null}
    {gestor && registro.editor === 'lore' && onEditarLore ? (
      <button type="button" onClick={onEditarLore} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-300 transition hover:border-white/40 hover:text-white"><Pencil size={12} /> Editar</button>
    ) : null}
  </>
);

const Detalhe = ({
  registro, retido, secao, acoes,
}: { registro: IRegistro; retido: boolean; secao: ISecaoUniversal; acoes: React.ReactNode }) => {
  const GrupoIcone = registro.grupo ? ICONE_GRUPO_DE_SER[registro.grupo] : undefined;
  const ehSer = registro.secao === 'seres' || registro.secao === 'personagens';
  const rotulo = registro.grupo && ehSer ? `${secao.rotulo} · ${registro.grupo}` : secao.rotulo;
  const Sigilo = GrupoIcone ?? (ehSer ? UserRound : null);
  return (
    <article className={`ru-ficha lg:sticky lg:top-5 ${ehSer ? 'ru-ficha--ser' : ''}`}>
      <header className="ru-ficha__cabeca p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--sec)', filter: 'brightness(1.3)' }}>{rotulo}</span>
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        </div>
        {retido ? (
          <div className="mt-4 space-y-4"><RasuraTitulo semente={registro.chave} className="text-4xl" /><CarimboRetido texto="Informação retida" /></div>
        ) : (
          <div className="mt-4 flex items-center gap-5">
            {ehSer && Sigilo ? <div className="ru-sigilo hidden sm:flex" aria-hidden="true"><Sigilo size={34} strokeWidth={1.4} /></div> : null}
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-bold text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
              {registro.subtitulo ? <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-500">{registro.subtitulo}</p> : null}
            </div>
          </div>
        )}
        {!retido && registro.grupo === 'Soberanos' ? (
          <p className="ru-faixa mt-5"><Crown size={16} aria-hidden="true" /> <span><small>Soberano</small>Um dos dez seres mais fortes do Jardim, fora as Deidades</span></p>
        ) : null}
        {!retido && registro.etiquetas.length ? <ul className="mt-4 flex flex-wrap gap-2">{registro.etiquetas.map((etiqueta) => <li key={etiqueta} className="ru-etiqueta">{etiqueta}</li>)}</ul> : null}
      </header>

      <div className="space-y-6 p-6 text-base leading-8 text-gray-300 sm:p-9 sm:text-lg sm:leading-9">
        {retido ? (
          <div className="space-y-5"><RasuraTexto semente={registro.chave} linhas={5} className="text-lg" /><RasuraTexto semente={`${registro.chave}:b`} linhas={3} className="text-lg" /><p className="text-sm text-gray-500">Este registro existe, mas o Mestre ainda não o liberou.</p></div>
        ) : (
          <>
            {paragrafos(registro.descricao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
            {registro.campos.length > 0 ? (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {registro.campos.map(([nome, valor]) => (
                  <div key={nome} className="rounded-xl border border-white/10 bg-[#0b0f14] p-4">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{nome}</dt>
                    <dd className="mt-1 text-sm leading-6 text-gray-200">{valor}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {registro.blocos.map((bloco) => (
              <section key={bloco.titulo} className="ru-bloco">
                <h3>{bloco.titulo}</h3>
                <ul className="space-y-1.5 text-sm leading-7 text-gray-300 sm:text-base">{bloco.itens.map((item, indice) => <li key={indice}>{item}</li>)}</ul>
              </section>
            ))}
            {registro.href ? (
              <Link to={registro.href.para} className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/5" style={{ borderColor: 'rgba(var(--sec-rgb), 0.55)' }}>
                {registro.href.rotulo} <ExternalLink size={14} />
              </Link>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
};

/** O que cada linha da lista mostra sob o nome. */
const legendaDaLinha = (registro: IRegistro, retido: boolean): string => {
  if (retido) return 'Retido';
  if (registro.secao === 'bestiario' && registro.criatura) {
    return [registro.grupo, registro.criatura.unico ? 'Única' : degrauDoVd(registro.criatura.vd).rotulo].filter(Boolean).join(' · ');
  }
  if (registro.artefato) {
    // A raridade das Relíquias ("Relíquia da Criação") repete o grupo ("Relíquias da Criação"): mostra uma vez só.
    const base = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/s\b/g, '');
    const raridade = raridadeDe(registro.artefato.raridade).rotulo;
    const partes = [registro.grupo ?? '', raridade].filter(Boolean);
    return partes.filter((parte, indice) => partes.findIndex((outra) => base(outra) === base(parte)) === indice).join(' · ');
  }
  return registro.grupo && registro.subtitulo ? `${registro.grupo} · ${registro.subtitulo}` : registro.grupo || registro.subtitulo || registro.etiquetas[0] || ' ';
};

export const UniversalCodexPage: React.FC<IUniversalRecordsPageProps> = ({
  catalog, factions, entities = [], entidadesRevelado = [], entidadesOculto = [], arvoresTrancadas = [],
  secoesOcultas = [], isMestre, loreRevelado, loreOculto, podeEditarConteudo = false, onBack, onOpenGlobalTimeline,
}) => {
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  // A Busca do Jardim chega aqui com `?secao=...&registro=...` e o registro já abre selecionado.
  const [parametros] = useSearchParams();
  const secaoDaUrl = SECOES_UNIVERSAIS.find((item) => item.id === parametros.get('secao'))?.id;
  const secaoInicial = secaoDaUrl ? secaoNaTela(secaoDaUrl) : undefined;
  const registroDaUrl = parametros.get('registro') ?? '';
  const [secaoId, setSecaoId] = useState<SecaoUniversal>(secaoInicial ?? 'bestiario');
  const [selecionada, setSelecionada] = useState(secaoInicial ? registroDaUrl : '');
  const [busca, setBusca] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [grupo, setGrupo] = useState('');
  const [faixa, setFaixa] = useState<DegrauId | ''>('');
  const [tipo, setTipo] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('nome');
  const [doServidor, setDoServidor] = useState<IRegistroDoServidor[]>([]);
  const [aviso, setAviso] = useState('');
  const [editor, setEditor] = useState<{ registro: IRegistro | null; destino: ISecaoUniversal } | null>(null);
  const [editandoLore, setEditandoLore] = useState<{ tipo: string; id: string; titulo: string } | null>(null);
  const listaRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!secaoInicial) return;
    setSecaoId(secaoInicial);
    setSelecionada(registroDaUrl);
    setBusca('');
    setEtiqueta('');
    setGrupo('');
    setFaixa('');
    setTipo('');
  }, [secaoInicial, registroDaUrl]);

  useEffect(() => {
    if (!campanhaId) return undefined;
    let ativo = true;
    registrosUniversaisApi.obter(campanhaId)
      .then((resposta) => { if (ativo) setDoServidor(resposta.registros); })
      .catch(() => { if (ativo) setAviso('Não foi possível carregar os ajustes do Mestre; mostrando os registros originais.'); });
    return () => { ativo = false; };
  }, [campanhaId]);

  const fabrica = useMemo(
    () => registrosDeFabrica({ catalog, factions, isMestre, loreRevelado, loreOculto, entities, entidadesRevelado, entidadesOculto, arvoresTrancadas }),
    [catalog, factions, isMestre, loreOculto, loreRevelado, entities, entidadesRevelado, entidadesOculto, arvoresTrancadas],
  );
  const todos = useMemo(() => {
    const juntos = mesclarRegistros(fabrica, doServidor, isMestre);
    // Seção escondida pelo criador: o servidor já corta os registros do Mestre, aqui saem os de fábrica.
    return isMestre ? juntos : juntos.filter((registro) => !secoesOcultas.includes(registro.secao));
  }, [fabrica, doServidor, isMestre, secoesOcultas]);
  // Para quem comanda a página mostra tudo; esta conta diz quais seres e locais da lore os jogadores não leem.
  const configDeLore = useMemo(() => ({ lore_revelado: loreRevelado, lore_oculto: loreOculto }), [loreRevelado, loreOculto]);
  const entradaDeLore = useCallback(
    (registro: IRegistro) => (registro.editor === 'lore' && registro.loreRef
      ? catalog.find((entrada) => entrada.tipo === registro.loreRef?.tipo && entrada.id === registro.loreRef?.id)
      : undefined),
    [catalog],
  );
  const retidosDeLore = useMemo(() => {
    const retidos = new Set<string>();
    if (!isMestre) return retidos;
    todos.forEach((registro) => {
      const entrada = entradaDeLore(registro);
      if (entrada && !loreVisivelParaJogadores(entrada, configDeLore)) retidos.add(registro.chave);
    });
    return retidos;
  }, [todos, isMestre, entradaDeLore, configDeLore]);
  const porSecao = useMemo(() => {
    const mapa = new Map<SecaoUniversal, IRegistro[]>();
    SECOES_UNIVERSAIS.forEach((item) => mapa.set(item.id, []));
    todos.forEach((registro) => mapa.get(secaoNaTela(registro.secao))?.push(registro));
    return mapa;
  }, [todos]);

  // O jogador só vê as abas que têm alguma coisa; o Mestre vê todas, para poder preencher.
  const abas = SECOES_UNIVERSAIS.filter((item) => !item.vivEm);
  const abaEscondida = (item: ISecaoUniversal) => SECOES_UNIVERSAIS.filter((outra) => secaoNaTela(outra.id) === item.id).every((outra) => secoesOcultas.includes(outra.id));
  const abasVisiveis = abas.filter((item) => isMestre || (!abaEscondida(item) && (porSecao.get(item.id)?.length ?? 0) > 0));
  const secao = abas.find((item) => item.id === secaoId) ?? abas[0];
  const daSecao = porSecao.get(secao.id) ?? [];
  const ehBestiario = secao.id === 'bestiario';
  const grupos = useMemo(() => gruposDaLista(daSecao, secao.id === 'seres' ? GRUPOS_DE_SERES : []), [daSecao, secao.id]);
  const nomesDeGrupo = useMemo(() => new Set(grupos.map((item) => item.grupo)), [grupos]);
  // No Bestiário as marcas são poucas e escolhidas, então aparecem todas; nas outras seções ficam as 14 mais comuns.
  const etiquetas = useMemo(() => etiquetasDaLista(daSecao).filter((item) => !nomesDeGrupo.has(item)).slice(0, ehBestiario ? undefined : 14), [daSecao, nomesDeGrupo, ehBestiario]);
  const tipos = useMemo(() => (ehBestiario ? tiposDeCriatura(daSecao) : []), [daSecao, ehBestiario]);
  const totalDaMarca = useMemo(() => {
    const mapa = new Map<string, number>();
    daSecao.forEach((registro) => registro.etiquetas.forEach((marca) => mapa.set(marca, (mapa.get(marca) ?? 0) + 1)));
    return mapa;
  }, [daSecao]);
  const faixas = useMemo(() => DEGRAUS.map((degrau) => ({ degrau, total: daSecao.filter((registro) => degrauDoVd(registro.vd).id === degrau.id).length })).filter((item) => item.total > 0), [daSecao]);
  const lista = useMemo(() => {
    const filtrada = filtrarRegistros(daSecao, busca, etiqueta, isMestre, grupo)
      .filter((registro) => !ehBestiario || !tipo || registro.criatura?.classe === tipo);
    return ordenar(ehBestiario && faixa ? filtrada.filter((registro) => degrauDoVd(registro.vd).id === faixa) : filtrada, secao.id, ordem);
  }, [daSecao, busca, etiqueta, grupo, faixa, tipo, ordem, isMestre, secao.id, ehBestiario]);
  const atual = lista.find((registro) => registro.chave === selecionada) ?? lista[0];
  const ehRetido = (registro: IRegistro) => registro.revelacao === 'rasurado' && !isMestre;
  const temaDaSecao = TEMAS[secao.id];
  const IconeDaSecao = ICONE_SECAO[secao.id];

  // Quem chega pela Busca com um registro escolhido: a lista rola até ele, só dentro dela (a página não se mexe).
  useEffect(() => {
    const lista_ = listaRef.current;
    const marcado = lista_?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!lista_ || !marcado) return;
    const topo = marcado.offsetTop;
    if (topo < lista_.scrollTop || topo + marcado.offsetHeight > lista_.scrollTop + lista_.clientHeight) {
      lista_.scrollTop = Math.max(0, topo - lista_.clientHeight / 3);
    }
  }, [atual?.chave, secao.id]);

  const trocarSecao = (id: SecaoUniversal) => {
    setSecaoId(id); setSelecionada(''); setBusca(''); setEtiqueta(''); setGrupo(''); setFaixa(''); setTipo(''); setOrdem('nome');
  };

  const salvar = useCallback(async (registro: IRegistro | null, destino: ISecaoUniversal, dados: IDadosRegistro, revelacao: RevelacaoRegistro) => {
    if (!campanhaId) throw new Error('Escolha uma campanha primeiro.');
    // Nada mudou num registro de fábrica que o Mestre ainda não tinha ajustado: não vale gravar uma linha vazia.
    if (registro && !registro.serverId && registro.origemId && revelacao === 'aberto' && Object.keys(dados).length === 0) { setEditor(null); return; }
    const secaoDoRegistro = registro?.secao ?? destino.id;
    const resposta = registro?.serverId
      ? await registrosUniversaisApi.editar(campanhaId, registro.serverId, { secao: secaoDoRegistro, revelacao, dados })
      : await registrosUniversaisApi.salvar(campanhaId, { secao: secaoDoRegistro, origem_id: registro?.origemId ?? null, revelacao, dados });
    setDoServidor(resposta.registros);
    setEditor(null);
    setAviso('');
    if (resposta.id) setSelecionada(registro?.origemId ? registro.chave : `proprio:${resposta.id}`);
  }, [campanhaId]);

  /** Só a visibilidade muda: o texto que o Mestre já tinha escrito segue como está. */
  const mudarRevelacao = async (registro: IRegistro, revelacao: RevelacaoRegistro) => {
    const dadosAtuais = doServidor.find((item) => item.id === registro.serverId)?.dados ?? {};
    // Voltar a "aberto" num registro de fábrica sem nenhum texto ajustado desfaz o ajuste, em vez de deixar uma linha vazia
    // que o marcaria como "ajustado pelo Mestre".
    if (revelacao === 'aberto' && registro.origemId && registro.serverId && Object.keys(dadosAtuais).length === 0) {
      if (!campanhaId) throw new Error('Escolha uma campanha primeiro.');
      // Sem passar por `desfazer`: ele limpa a seleção, e a ficha aberta tem que continuar aberta.
      setDoServidor((await registrosUniversaisApi.apagar(campanhaId, registro.serverId)).registros);
      return;
    }
    const destino = SECOES_UNIVERSAIS.find((item) => item.id === registro.secao) ?? secao;
    await salvar(registro, destino, dadosAtuais, revelacao);
  };

  /** O controle de visibilidade de uma ficha: da lore (campanha ativa) ou do registro (ajuste do Mestre). */
  const visibilidadeDe = (registro: IRegistro): React.ReactNode => {
    if (!isMestre) return null;
    if (registro.editor === 'lore') {
      const entrada = entradaDeLore(registro);
      if (!podeEditarConteudo || !entrada) return null;
      return (
        <SeletorDeVisibilidade
          opcoes={OPCOES_DE_LORE}
          valor={loreVisivelParaJogadores(entrada, configDeLore) ? 'visivel' : 'retido'}
          onChange={(proximo) => salvarVisibilidadeDeLore(entrada, proximo === 'visivel')}
        />
      );
    }
    return <SeletorDeVisibilidade opcoes={OPCOES_DE_REGISTRO} valor={registro.revelacao} onChange={(proximo) => mudarRevelacao(registro, proximo)} />;
  };

  const desfazer = useCallback(async (registro: IRegistro) => {
    if (!campanhaId || !registro.serverId) return;
    const resposta = await registrosUniversaisApi.apagar(campanhaId, registro.serverId);
    setDoServidor(resposta.registros);
    setEditor(null);
    setSelecionada('');
  }, [campanhaId]);

  const novosDaSecao = secao.id === 'seres' ? [secao, SECOES_UNIVERSAIS.find((item) => item.id === 'personagens') as ISecaoUniversal] : [secao];
  const corDaLinha = (registro: IRegistro): string => {
    if (registro.secao === 'bestiario') return rgbDoDegrau(degrauDoVd(registro.vd));
    return rgbValido(registro.corRgb) ?? temaDaSecao.rgb;
  };

  return (
    <main className="ru-pagina app-detail-page relative z-10 min-h-screen overflow-x-hidden pb-20" style={estiloDaSecao(secao.id) as React.CSSProperties}>
      <div className="ru-fundo" />
      <header className="relative mx-auto max-w-[90rem] px-4 pb-5 pt-4 sm:px-5 sm:pb-8 sm:pt-7 md:px-10 md:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 pr-24 sm:mb-10">
          <button type="button" onClick={onBack} className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300 transition hover:border-white/30 hover:text-white"><ArrowLeft size={16} /> Voltar ao Mundo</button>
          {onOpenGlobalTimeline ? (
            <button type="button" onClick={onOpenGlobalTimeline} className="inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition hover:bg-white/5" style={{ borderColor: 'rgba(var(--sec-rgb), 0.4)', color: 'var(--sec)' }}><History size={15} /> Linha do tempo</button>
          ) : null}
        </div>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--sec)', filter: 'brightness(1.25)' }}><Globe2 size={16} /> Fora de todas as Árvores · {temaDaSecao.chamada}</p>
        <h1 className="mt-3 text-[clamp(2.45rem,12vw,4.5rem)] font-bold leading-[1.02] tracking-wide text-white sm:mt-4" style={{ fontFamily: 'Cinzel, serif' }}>Registros Universais</h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-400 sm:mt-5 sm:text-lg sm:leading-8">O arquivo geral do Jardim: criaturas, seres, facções, lugares, artefatos, termos e rumores. O Mestre pode ajustar qualquer registro e decidir o que os jogadores já podem ler.</p>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 sm:mt-9 lg:flex-wrap lg:overflow-visible" aria-label="Seções dos Registros Universais">
          {abasVisiveis.map((item) => {
            const Icone = ICONE_SECAO[item.id];
            return (
              <button key={item.id} type="button" onClick={() => trocarSecao(item.id)} aria-pressed={item.id === secao.id} className="ru-aba" style={{ '--aba-rgb': TEMAS[item.id].rgb } as React.CSSProperties}>
                <Icone size={18} className="ru-aba__icone" aria-hidden="true" />
                <span><strong className="block text-sm text-white">{item.rotulo}</strong><small className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">{porSecao.get(item.id)?.length ?? 0} registro(s){isMestre && abaEscondida(item) ? ' · oculta' : ''}</small></span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="relative mx-auto max-w-[90rem] px-4 sm:px-5 md:px-10">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <p className="mr-auto flex max-w-3xl items-start gap-2 text-sm text-gray-400"><IconeDaSecao size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--sec)' }} aria-hidden="true" />{secao.descricao}</p>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Buscar nos registros</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar..." className="ru-busca min-h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white outline-none" />
          </label>
          {isMestre ? novosDaSecao.map((destino) => (
            <button key={destino.id} type="button" onClick={() => setEditor({ registro: null, destino })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-bold text-white transition hover:bg-white/10" style={{ borderColor: 'rgba(var(--sec-rgb), 0.55)', background: 'rgba(var(--sec-rgb), 0.14)' }}><Plus size={15} /> {destino.novo}</button>
          )) : null}
        </div>

        {grupos.length > 1 ? (
          <div className="ru-fileira mb-3 items-center" role="group" aria-label="Filtrar por grupo">
            {ehBestiario ? <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Categoria</span> : null}
            <button type="button" className="ru-filtro" aria-pressed={grupo === ''} onClick={() => setGrupo('')}>Todos<small>{daSecao.length}</small></button>
            {grupos.map((item) => <button key={item.grupo} type="button" className="ru-filtro" aria-pressed={grupo === item.grupo} onClick={() => setGrupo(grupo === item.grupo ? '' : item.grupo)}>{item.grupo}<small>{item.total}</small></button>)}
          </div>
        ) : null}
        {ehBestiario && faixas.length > 1 ? (
          <div className="ru-fileira mb-3 items-center" role="group" aria-label="Filtrar por peso da criatura">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Peso</span>
            {faixas.map(({ degrau, total }) => (
              <button key={degrau.id} type="button" className="ru-filtro" aria-pressed={faixa === degrau.id} onClick={() => setFaixa(faixa === degrau.id ? '' : degrau.id)} style={{ '--sec-rgb': rgbDoDegrau(degrau) } as React.CSSProperties}>
                {degrau.rotulo} <small>{faixaDoDegrau(degrau)} · {total}</small>
              </button>
            ))}
            <button type="button" onClick={() => setOrdem(ordem === 'nome' ? 'vd' : 'nome')} className="ru-filtro ml-auto inline-flex items-center gap-1.5" aria-label={ordem === 'nome' ? 'Ordenar do mais forte para o mais fraco' : 'Ordenar de A a Z'}>
              <ArrowUpDown size={12} /> {ordem === 'nome' ? 'A a Z' : 'Mais fortes primeiro'}
            </button>
          </div>
        ) : null}
        {tipos.length > 1 ? (
          <div className="ru-fileira mb-3 items-center" role="group" aria-label="Filtrar pelo que a criatura é na mesa">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Tipo</span>
            {tipos.map((item) => <button key={item.tipo} type="button" className="ru-filtro" aria-pressed={tipo === item.tipo} onClick={() => setTipo(tipo === item.tipo ? '' : item.tipo)}>{item.tipo}<small>{item.total}</small></button>)}
          </div>
        ) : null}
        {etiquetas.length > 1 ? (
          <div className="ru-fileira mb-5 items-center" role="group" aria-label="Filtrar por marca">
            {ehBestiario ? <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Marcas</span> : null}
            {etiquetas.map((item) => <button key={item} type="button" className="ru-filtro" aria-pressed={etiqueta === item} onClick={() => setEtiqueta(etiqueta === item ? '' : item)}>{item}{ehBestiario ? <small>{totalDaMarca.get(item)}</small> : null}</button>)}
          </div>
        ) : <div className="mb-2" />}
        {aviso ? <p role="status" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{aviso}</p> : null}

        {lista.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-gray-500">
            {daSecao.length === 0
              ? (isMestre ? `Nada registrado ainda. Use “${secao.novo}” para começar.` : 'Nada foi registrado nesta seção ainda.')
              : 'Nenhum registro com esse filtro.'}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <label className="rounded-2xl border border-white/10 bg-[#0b0e13]/90 p-3 lg:hidden">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--sec)' }}>Escolher registro ({lista.length})</span>
              <select value={atual?.chave ?? ''} onChange={(evento) => setSelecionada(evento.target.value)} className="w-full rounded-xl border border-white/10 bg-[#090c10] px-3 py-3 text-sm text-white outline-none">
                {lista.map((registro) => <option key={registro.chave} value={registro.chave}>{ehRetido(registro) ? 'Registro retido' : `${registro.titulo}${registro.secao === 'bestiario' && registro.vd != null ? ` · VD ${registro.vd}` : registro.grupo ? ` · ${registro.grupo}` : ''}`}</option>)}
              </select>
            </label>
            <aside ref={listaRef} className="ru-lista custom-scrollbar hidden lg:sticky lg:top-5 lg:block">
              <div className="border-b border-white/10 px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">{lista.length} de {daSecao.length}</div>
              {lista.map((registro) => {
                const ativo = registro.chave === atual?.chave;
                const retido = ehRetido(registro);
                return (
                  <button key={registro.chave} type="button" onClick={() => setSelecionada(registro.chave)} aria-pressed={ativo} className="ru-item group" style={{ '--item-rgb': corDaLinha(registro) } as React.CSSProperties}>
                    {registro.secao === 'bestiario' && !retido ? (
                      <span className="ru-vd-mini" aria-hidden="true"><small>VD</small><strong>{registro.vd ?? '-'}</strong></span>
                    ) : !retido && registro.secao === 'locais' && registro.origemId && identidadeDeLocal(registro.origemId) ? (
                      <span className="ru-icone-mini" aria-hidden="true">{React.createElement(ICONES_DE_LOCAL[identidadeDeLocal(registro.origemId)!.icone], { size: 16 })}</span>
                    ) : !retido && registro.secao === 'faccoes' && registro.origemId && identidadeDe(registro.origemId) ? (
                      <Brasao forma={identidadeDe(registro.origemId)?.forma} className="ru-brasao-mini" mini />
                    ) : !retido && (registro.secao === 'seres' || registro.secao === 'artefatos') ? <span className="ru-ponto" aria-hidden="true" /> : null}
                    <span className="min-w-0 flex-1">
                      {retido ? <RasuraTitulo semente={registro.chave} className="text-sm" /> : <strong className={`block truncate text-sm ${ativo ? 'text-white' : 'text-gray-200'}`}>{registro.titulo}</strong>}
                      <small className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-widest text-gray-500">{legendaDaLinha(registro, retido)}{gestorMarca(registro, isMestre)}{retidosDeLore.has(registro.chave) ? ' · retido' : ''}</small>
                    </span>
                    <ChevronRight size={14} className="text-gray-700 transition group-hover:text-gray-300" />
                  </button>
                );
              })}
            </aside>
            <div className="min-w-0 scroll-mt-4" style={atual?.corRgb && rgbValido(atual.corRgb) ? estiloDaSecao(secao.id, rgbValido(atual.corRgb)) as React.CSSProperties : undefined}>
              {atual ? (() => {
                const retido = ehRetido(atual);
                const acoes = (
                  <Acoes
                    registro={atual}
                    gestor={isMestre}
                    onEditar={() => setEditor({ registro: atual, destino: SECOES_UNIVERSAIS.find((item) => item.id === atual.secao) ?? secao })}
                    onEditarLore={podeEditarConteudo && atual.loreRef ? () => setEditandoLore({ ...atual.loreRef!, titulo: atual.titulo }) : undefined}
                    visibilidade={visibilidadeDe(atual)}
                  />
                );
                if (!retido && atual.criatura) return <FichaCriatura registro={atual} gestor={isMestre} campanhaId={campanhaId} acoes={acoes} rotuloDaSecao={secao.rotulo} />;
                if (!retido && atual.artefato) return <FichaArtefato registro={atual} acoes={acoes} rotuloDaSecao={secao.rotulo} />;
                if (!retido && atual.faccao) return <FichaFaccao registro={atual} acoes={acoes} rotuloDaSecao={secao.rotulo} />;
                if (!retido && atual.idioma) return <FichaIdioma registro={atual} acoes={acoes} rotuloDaSecao={secao.rotulo} />;
                if (!retido && atual.local) return <FichaLocal registro={atual} acoes={acoes} rotuloDaSecao={secao.rotulo} />;
                return <Detalhe registro={atual} retido={retido} secao={secao} acoes={acoes} />;
              })() : null}
            </div>
          </div>
        )}
      </div>

      {editor ? (
        <EditorDeRegistro
          secao={editor.registro ? SECOES_UNIVERSAIS.find((item) => item.id === editor.registro?.secao) ?? editor.destino : editor.destino}
          registro={editor.registro}
          onSalvar={(dados, revelacao) => salvar(editor.registro, editor.destino, dados, revelacao)}
          onDesfazer={editor.registro?.serverId ? () => desfazer(editor.registro as IRegistro) : undefined}
          onFechar={() => setEditor(null)}
        />
      ) : null}
      {editandoLore ? <EditorDeLoreModal tipo={editandoLore.tipo} id={editandoLore.id} titulo={editandoLore.titulo} onFechar={() => setEditandoLore(null)} /> : null}
    </main>
  );
};

/** Pequena marca para o Mestre ver de relance o que foi mexido ou está fechado. */
function gestorMarca(registro: IRegistro, gestor: boolean): string {
  if (!gestor) return '';
  const marcas = [registro.proprio ? 'do Mestre' : registro.editado ? 'ajustado' : '', registro.revelacao !== 'aberto' ? registro.revelacao : ''].filter(Boolean);
  return marcas.length ? ` · ${marcas.join(' · ')}` : '';
}
