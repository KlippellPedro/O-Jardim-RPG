import React, { useState, useEffect, useMemo } from 'react';
import { MUNDO_CATALOG, type LoreEntry } from '../../../data/gerado/mundoCatalog';
import { ARVORES, ARVORES_REAIS, VAZIO_ID, arvoreInicialmenteRevelada, type ArvoreEntry } from '../../../data/mundo/arvoresCatalog';
import { ENTIDADES } from '../../../data/mundo/entidades';
import { carregarCatalogo } from '../../services/catalogoService';
import { ICatalogo } from '../../types/catalogo';
import { Select } from '../ui/Select';
import { WORLD_CHRONICLES, getTreeChronicle, type WorldChronicleCatalog } from '../../pages/Mundo/worldChronicles';
import { chaveSecaoCronica, type SecaoCronicaArvore } from '../../pages/Mundo/chronicleVisibility';
import { conteudoEditorialApi } from '../../services/conteudoEditorialApi';
import { Globe, ShoppingBag, Save, Eye, EyeOff, Loader2, TreePine, Sparkles, UserCog, BookOpen, History, ChevronDown, CircleOff } from 'lucide-react';

const SECOES_CRONICA: Array<{ chave: SecaoCronicaArvore; label: string }> = [
  { chave: 'tese', label: 'Essência' },
  { chave: 'atmosfera', label: 'Atmosfera' },
  { chave: 'historia', label: 'História' },
  { chave: 'cronologia', label: 'Linha do tempo (inteira)' },
];

/** Ordem em que os tipos aparecem dentro do Códice de uma Árvore: segue a
 * cascata do mundo, pra o Mestre ler de cima (a Deidade) pra baixo (os locais
 * e as pessoas) em vez de receber tudo embaralhado. */
const ORDEM_TIPOS = ['deidade', 'fluxo', 'galho', 'dimensao', 'reino', 'local', 'personagem', 'evento', 'conceito', 'cosmologia', 'idioma'];

const ROTULO_TIPO: Record<string, string> = {
  cosmologia: 'Cosmologia',
  conceito: 'Conceito',
  deidade: 'Deidade',
  fluxo: 'Fluxo',
  galho: 'Galho',
  dimensao: 'Dimensão',
  reino: 'Reino',
  personagem: 'Personagem',
  evento: 'Evento',
  idioma: 'Idioma',
  local: 'Local',
};

const ordenarPorTipo = (entradas: LoreEntry[]) => [...entradas].sort((a, b) => {
  const posicao = ORDEM_TIPOS.indexOf(a.tipo) - ORDEM_TIPOS.indexOf(b.tipo);
  return posicao !== 0 ? posicao : a.titulo.localeCompare(b.titulo, 'pt-BR');
});

type Tom = 'esmeralda' | 'azul' | 'ambar' | 'ciano';

const TONS: Record<Tom, string> = {
  esmeralda: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  azul: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ambar: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ciano: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const BotaoOlho: React.FC<{
  visivel: boolean;
  onClick: () => void;
  disabled?: boolean;
  tom?: Tom;
  rotuloVisivel?: string;
  rotuloOculto?: string;
}> = ({ visivel, onClick, disabled, tom = 'azul', rotuloVisivel = 'Visível', rotuloOculto = 'Oculto' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
      visivel ? TONS[tom] : 'bg-red-500/20 text-red-400 border-red-500/30'
    }`}
  >
    {visivel ? <Eye size={14} /> : <EyeOff size={14} />}
    {visivel ? rotuloVisivel : rotuloOculto}
  </button>
);

const LinhaEntrada: React.FC<{
  rotulo: string;
  titulo: string;
  trancadoPorPadrao?: boolean;
  visivel: boolean;
  onToggle: () => void;
  disabled?: boolean;
  tom?: Tom;
}> = ({ rotulo, titulo, trancadoPorPadrao, visivel, onToggle, disabled, tom }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-white/5 hover:bg-white/5">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{rotulo}</span>
        <span className="text-sm font-medium text-white">{titulo}</span>
      </div>
      {trancadoPorPadrao && (
        <span className="mt-1 inline-block rounded border border-yellow-500/20 bg-yellow-500/10 px-1.5 text-[10px] text-yellow-500/70">
          Trancado por padrão
        </span>
      )}
    </div>
    <BotaoOlho visivel={visivel} onClick={onToggle} disabled={disabled} tom={tom} />
  </div>
);

export interface VisibilidadeMembro {
  id: string;
  nome_exibicao: string;
  papel: string;
}

export interface VisibilidadeCampanhaProps {
  /** Id da campanha sendo editada - agora escolhida no Painel do Criador, não
   * mais lida de `campanhaAtiva` global (o criador edita campanhas alheias). */
  campanhaId: string;
  configuracoes: Record<string, any> | null | undefined;
  membros: VisibilidadeMembro[];
  onSalvar: (configuracoes: Record<string, any>) => Promise<void>;
  /** true quando quem está olhando não pode salvar (ex.: um dia isto reabrir
   * pro Painel do Mestre em modo leitura). Hoje só o criador monta este
   * componente, então o padrão já nasce editável. */
  somenteLeitura?: boolean;
}

export const VisibilidadeCampanha: React.FC<VisibilidadeCampanhaProps> = ({
  campanhaId,
  configuracoes,
  membros,
  onSalvar,
  somenteLeitura = false,
}) => {
  const config = configuracoes || {};
  const isMaster = !somenteLeitura;

  const [loreRevelado, setLoreRevelado] = useState<string[]>(config.lore_revelado || []);
  const [loreOculto, setLoreOculto] = useState<string[]>(config.lore_oculto || []);
  const [arvoresRevelado, setArvoresRevelado] = useState<string[]>(config.arvores_revelado || []);
  const [arvoresOculto, setArvoresOculto] = useState<string[]>(config.arvores_oculto || []);
  const [entidadesRevelado, setEntidadesRevelado] = useState<string[]>(config.entidades_revelado || []);
  const [entidadesOculto, setEntidadesOculto] = useState<string[]>(config.entidades_oculto || []);
  const [cronologiaGeralOculta, setCronologiaGeralOculta] = useState(config.cronologia_geral_oculta === true);
  const [registrosUniversaisOcultos, setRegistrosUniversaisOcultos] = useState(config.registros_universais_ocultos === true);
  const [cronicaSecoesOcultas, setCronicaSecoesOcultas] = useState<string[]>(config.cronica_secoes_ocultas || []);
  const [cronicaEventosOcultos, setCronicaEventosOcultos] = useState<string[]>(config.cronica_eventos_ocultos || []);
  const [arvoreAberta, setArvoreAberta] = useState<string | null>(null);
  const [locaisOcultos, setLocaisOcultos] = useState<number[]>(config.locais_ocultos || [3, 4]); // Padrão: Mercado Negro e Banco Lunar ocultos
  const [racasLiberadas, setRacasLiberadas] = useState<string[]>(config.racas_liberadas || []);
  const [classesLiberadas, setClassesLiberadas] = useState<string[]>(config.classes_liberadas || []);
  const [racasLiberadasMembros, setRacasLiberadasMembros] = useState<Record<string, string[]>>(config.racas_liberadas_membros || {});
  const [classesLiberadasMembros, setClassesLiberadasMembros] = useState<Record<string, string[]>>(config.classes_liberadas_membros || {});
  const [membroSelecionado, setMembroSelecionado] = useState<string>('');
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [mundoCatalog, setMundoCatalog] = useState<LoreEntry[]>(MUNDO_CATALOG);
  const [worldChronicles, setWorldChronicles] = useState<WorldChronicleCatalog>(WORLD_CHRONICLES);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cada Árvore leva o próprio pedaço do Códice, pela pasta de origem gravada
  // em `arvore_origem`. O que sobra é material do Jardim inteiro.
  const entradasPorArvore = useMemo(() => {
    const mapa = new Map<string, LoreEntry[]>();
    for (const entrada of mundoCatalog) {
      if (!entrada.arvore_origem) continue;
      const lista = mapa.get(entrada.arvore_origem) || [];
      lista.push(entrada);
      mapa.set(entrada.arvore_origem, lista);
    }
    return mapa;
  }, [mundoCatalog]);

  const entradasDoUniverso = useMemo(
    () => ordenarPorTipo(mundoCatalog.filter((entrada) => !entrada.arvore_origem)),
    [mundoCatalog],
  );

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    conteudoEditorialApi.carregarMundoResolvido(campanhaId, controller.signal)
      .then((response) => {
        const chronology = response.entradas.find((entry) => entry.tipo === 'cronologia');
        if (
          chronology?.conteudo
          && Array.isArray(chronology.conteudo.linha_tempo_geral)
          && Array.isArray(chronology.conteudo.arvores)
        ) {
          setWorldChronicles(chronology.conteudo as unknown as WorldChronicleCatalog);
        }
        const resolvedEntries = response.entradas.filter((entry) => entry.tipo !== 'cronologia');
        const resolvedByOrigin = new Map(resolvedEntries.map((entry) => [entry.chave_origem || `${entry.tipo}:${entry.id}`, entry]));
        const officialKeys = new Set(MUNDO_CATALOG.map((entry) => `${entry.tipo}:${entry.id}`));
        setMundoCatalog([
          ...MUNDO_CATALOG.map((official) => ({
            ...official,
            ...resolvedByOrigin.get(`${official.tipo}:${official.id}`),
            registro_universal: official.registro_universal,
            arvore_origem: official.arvore_origem,
          })),
          ...resolvedEntries.filter((entry) => !officialKeys.has(entry.chave_origem || `${entry.tipo}:${entry.id}`)),
        ] as unknown as LoreEntry[]);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Não foi possível carregar o Mundo global na visibilidade.', error);
          setMundoCatalog(MUNDO_CATALOG);
          setWorldChronicles(WORLD_CHRONICLES);
        }
      });
    return () => controller.abort();
  }, [campanhaId]);

  const todosOsLocais = [
    { id: 1, nome: 'Feira de Vila' },
    { id: 2, nome: 'Metrópole' },
    { id: 3, nome: 'Mercado Negro' },
    { id: 4, nome: 'Banco Lunar' },
  ];

  // Raças/classes "esquecidas" e disponíveis: novas entradas do catálogo
  // (ex.: Anomalia, Divino, Onírico, Devorador) aparecem aqui sozinhas, sem
  // precisar de código novo - a lista é lida direto de data/ficha/*.json.
  // Especiais indisponíveis (ex.: Entidade, que não é jogável por design) e
  // classes/raças comuns (ex.: Detetive) ficam de fora de propósito: comum
  // não precisa de liberação, e indisponível não é uma escolha de campanha.
  const racasEspeciais = (catalogo?.racas || []).filter((r: any) => r.categoria === 'esquecida' && !r.indisponivel);
  const classesEspeciais = (catalogo?.classes || []).filter((c: any) => c.categoria === 'esquecida' && !c.indisponivel);
  // Mestre/assistente já vê tudo (bypassa liberação): liberação individual
  // só faz sentido pra jogador comum.
  const jogadoresDaCampanha = membros.filter((membro) => membro.papel === 'jogador');

  const loreVisivel = (entrada: LoreEntry) => (
    entrada.revelado !== false ? !loreOculto.includes(entrada.id) : loreRevelado.includes(entrada.id)
  );

  const handleToggleLore = (id: string, initiallyRevealed: boolean) => {
    if (initiallyRevealed) {
      if (loreOculto.includes(id)) setLoreOculto(prev => prev.filter(i => i !== id));
      else setLoreOculto(prev => [...prev, id]);
    } else {
      if (loreRevelado.includes(id)) setLoreRevelado(prev => prev.filter(i => i !== id));
      else setLoreRevelado(prev => [...prev, id]);
    }
  };

  const handleToggleArvore = (id: string, initiallyRevealed: boolean) => {
    if (initiallyRevealed) {
      if (arvoresOculto.includes(id)) setArvoresOculto(prev => prev.filter(i => i !== id));
      else setArvoresOculto(prev => [...prev, id]);
    } else {
      if (arvoresRevelado.includes(id)) setArvoresRevelado(prev => prev.filter(i => i !== id));
      else setArvoresRevelado(prev => [...prev, id]);
    }
  };

  const handleToggleEntidade = (id: string, initiallyRevealed: boolean) => {
    if (initiallyRevealed) {
      if (entidadesOculto.includes(id)) setEntidadesOculto(prev => prev.filter(i => i !== id));
      else setEntidadesOculto(prev => [...prev, id]);
    } else {
      if (entidadesRevelado.includes(id)) setEntidadesRevelado(prev => prev.filter(i => i !== id));
      else setEntidadesRevelado(prev => [...prev, id]);
    }
  };

  const handleToggleCronicaSecao = (arvoreId: string, secao: SecaoCronicaArvore) => {
    const chave = chaveSecaoCronica(arvoreId, secao);
    setCronicaSecoesOcultas(prev => prev.includes(chave) ? prev.filter(i => i !== chave) : [...prev, chave]);
  };

  const handleToggleCronicaEvento = (eventoId: string) => {
    setCronicaEventosOcultos(prev => prev.includes(eventoId) ? prev.filter(i => i !== eventoId) : [...prev, eventoId]);
  };

  const handleToggleLocal = (localId: number) => {
    if (locaisOcultos.includes(localId)) {
      setLocaisOcultos(prev => prev.filter(l => l !== localId));
    } else {
      setLocaisOcultos(prev => [...prev, localId]);
    }
  };

  const handleToggleRaca = (id: string) => {
    setRacasLiberadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleClasse = (id: string) => {
    setClassesLiberadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleRacaMembro = (membroId: string, id: string) => {
    setRacasLiberadasMembros(prev => {
      const atual = prev[membroId] || [];
      const nova = atual.includes(id) ? atual.filter(i => i !== id) : [...atual, id];
      return { ...prev, [membroId]: nova };
    });
  };

  const handleToggleClasseMembro = (membroId: string, id: string) => {
    setClassesLiberadasMembros(prev => {
      const atual = prev[membroId] || [];
      const nova = atual.includes(id) ? atual.filter(i => i !== id) : [...atual, id];
      return { ...prev, [membroId]: nova };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSalvar({
      lore_revelado: loreRevelado,
      lore_oculto: loreOculto,
      arvores_revelado: arvoresRevelado,
      arvores_oculto: arvoresOculto,
      entidades_revelado: entidadesRevelado,
      entidades_oculto: entidadesOculto,
      cronologia_geral_oculta: cronologiaGeralOculta,
      registros_universais_ocultos: registrosUniversaisOcultos,
      cronica_secoes_ocultas: cronicaSecoesOcultas,
      cronica_eventos_ocultos: cronicaEventosOcultos,
      locais_ocultos: locaisOcultos,
      racas_liberadas: racasLiberadas,
      classes_liberadas: classesLiberadas,
      racas_liberadas_membros: racasLiberadasMembros,
      classes_liberadas_membros: classesLiberadasMembros,
    });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const vazio = ARVORES.find((entrada) => entrada.id === VAZIO_ID);

  const entidadeVisivel = (entidade: typeof ENTIDADES[number]) => (
    entidade.revelado !== false ? !entidadesOculto.includes(entidade.id) : entidadesRevelado.includes(entidade.id)
  );

  /** O bloco sanfonado de um escopo do mundo. Serve tanto pras Árvores quanto
   * pro Vazio, que tem exatamente a mesma estrutura (crônica + registros) sem
   * ser uma Árvore - por isso `ehVazio` só troca os rótulos. */
  const renderBlocoEscopo = (escopo: ArvoreEntry, ehVazio = false) => {
    const nasceRevelada = arvoreInicialmenteRevelada(escopo.id);
    const escopoVisivel = nasceRevelada ? !arvoresOculto.includes(escopo.id) : arvoresRevelado.includes(escopo.id);
    const aberta = arvoreAberta === escopo.id;
    const entradas = ordenarPorTipo(entradasPorArvore.get(escopo.id) || []);
    const visiveis = entradas.filter(loreVisivel).length;
    const chronicle = getTreeChronicle(escopo.id, worldChronicles);
    const eventos = chronicle?.cronologia || [];

    return (
      <div key={escopo.id} className="overflow-hidden rounded-2xl border border-white/5 bg-black/40">
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setArvoreAberta(aberta ? null : escopo.id)}
            aria-expanded={aberta}
            className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:text-white"
          >
            <ChevronDown size={16} className={`shrink-0 text-gray-500 transition-transform ${aberta ? 'rotate-180' : ''}`} />
            <span className="text-sm font-medium text-white">{escopo.nome}</span>
            <span className="text-xs text-gray-600">({escopo.deidadeTitulo})</span>
            {!nasceRevelada && (
              <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-1.5 text-[10px] text-yellow-500/70">
                {ehVazio ? 'Trancado por padrão' : 'Trancada por padrão'}
              </span>
            )}
            <span className="ml-auto shrink-0 pr-2 text-xs text-gray-500">{visiveis}/{entradas.length}</span>
          </button>
          <BotaoOlho
            visivel={escopoVisivel}
            onClick={() => handleToggleArvore(escopo.id, nasceRevelada)}
            disabled={!isMaster}
            tom="esmeralda"
            rotuloVisivel="Visível"
            rotuloOculto={ehVazio ? 'Oculto' : 'Oculta'}
          />
        </div>

        {aberta && (
          <div className="flex flex-col gap-5 border-t border-white/5 p-3">
            {chronicle && (
              <div>
                <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <History size={12} /> Crônica da página
                </h5>
                <div className="flex flex-wrap gap-2">
                  {SECOES_CRONICA.map(({ chave, label }) => {
                    const oculta = cronicaSecoesOcultas.includes(chaveSecaoCronica(escopo.id, chave));
                    return (
                      <BotaoOlho
                        key={chave}
                        visivel={!oculta}
                        onClick={() => handleToggleCronicaSecao(escopo.id, chave)}
                        disabled={!isMaster}
                        tom="ciano"
                        rotuloVisivel={label}
                        rotuloOculto={label}
                      />
                    );
                  })}
                </div>

                {eventos.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Eventos da linha do tempo</h5>
                    {eventos.map(evento => (
                      <LinhaEntrada
                        key={evento.id}
                        rotulo={evento.era}
                        titulo={evento.titulo}
                        visivel={!cronicaEventosOcultos.includes(evento.id)}
                        onToggle={() => handleToggleCronicaEvento(evento.id)}
                        disabled={!isMaster}
                        tom="ciano"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <BookOpen size={12} /> {ehVazio ? 'Registros do Vazio' : 'Códice desta Árvore'}
              </h5>
              {entradas.length === 0 ? (
                <p className="text-xs italic text-gray-600">
                  {ehVazio ? 'Nenhum registro escrito pro Vazio ainda.' : 'Nenhum registro escrito pra esta Árvore ainda.'}
                </p>
              ) : (
                <div className="custom-scrollbar flex max-h-[380px] flex-col gap-1 overflow-y-auto pr-1">
                  {entradas.map(entrada => (
                    <LinhaEntrada
                      key={entrada.id}
                      rotulo={ROTULO_TIPO[entrada.tipo] || entrada.tipo}
                      titulo={entrada.titulo}
                      trancadoPorPadrao={entrada.revelado === false}
                      visivel={loreVisivel(entrada)}
                      onToggle={() => handleToggleLore(entrada.id, entrada.revelado !== false)}
                      disabled={!isMaster}
                      tom="azul"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const universoVisiveis = entradasDoUniverso.filter(loreVisivel).length
    + ENTIDADES.filter(entidadeVisivel).length;
  const universoTotal = entradasDoUniverso.length + ENTIDADES.length;

  return (
    <div className="space-y-8">

      {!isMaster && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-500/90">
          Você está em modo leitura: pode conferir tudo abaixo, mas só o criador da plataforma pode salvar alterações de visibilidade e liberação.
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center gap-2">
          <History className="text-cyan-400" size={20} />
          <h3 className="text-lg font-bold text-white">Páginas gerais do Mundo</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Oculte os atalhos e bloqueie o acesso direto dos jogadores. Mestre e assistentes continuam com acesso.
        </p>
        <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-black/40 p-4">
          <LinhaEntrada
            rotulo="Página"
            titulo="Linha do tempo geral"
            visivel={!cronologiaGeralOculta}
            onToggle={() => setCronologiaGeralOculta((atual) => !atual)}
            disabled={!isMaster}
            tom="ambar"
          />
          <LinhaEntrada
            rotulo="Página"
            titulo="Registros Universais"
            visivel={!registrosUniversaisOcultos}
            onToggle={() => setRegistrosUniversaisOcultos((atual) => !atual)}
            disabled={!isMaster}
            tom="ciano"
          />
        </div>
      </section>

      {/* UNIVERSO: o que não pertence a nenhuma Árvore */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Globe className="text-blue-400" size={20} />
          <h3 className="text-lg font-bold text-white">Visibilidade do Universo</h3>
          <span className="ml-auto text-xs text-gray-500">{universoVisiveis} de {universoTotal} visíveis</span>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          O material que vale pro Jardim inteiro, sem dono: a cosmologia, os conceitos que atravessam todas as Árvores, os idiomas e os contos das Entidades.
        </p>

        <div className="custom-scrollbar flex max-h-[340px] flex-col gap-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4">
          {entradasDoUniverso.map(entrada => (
            <LinhaEntrada
              key={entrada.id}
              rotulo={ROTULO_TIPO[entrada.tipo] || entrada.tipo}
              titulo={entrada.titulo}
              trancadoPorPadrao={entrada.revelado === false}
              visivel={loreVisivel(entrada)}
              onToggle={() => handleToggleLore(entrada.id, entrada.revelado !== false)}
              disabled={!isMaster}
              tom="azul"
            />
          ))}

          <h4 className="mb-1 mt-4 border-t border-white/5 pt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Contos das Entidades
          </h4>
          <p className="mb-2 text-[11px] leading-5 text-gray-500">
            A raça Entidade não pode ser escolhida na ficha, mas o Livro das Entidades (<code>/entidades</code>) fica aberto pra qualquer jogador logado por padrão. Oculte um conto até a história da campanha realmente apresentar aquela Entidade.
          </p>
          {ENTIDADES.map(entidade => (
            <LinhaEntrada
              key={entidade.id}
              rotulo="Conto"
              titulo={entidade.nome}
              trancadoPorPadrao={entidade.revelado === false}
              visivel={entidadeVisivel(entidade)}
              onToggle={() => handleToggleEntidade(entidade.id, entidade.revelado !== false)}
              disabled={!isMaster}
              tom="ambar"
            />
          ))}
          {ENTIDADES.length === 0 && <p className="text-xs italic text-gray-600">Nenhum conto publicado ainda.</p>}
        </div>
      </section>

      {/* UMA ÁRVORE DE CADA VEZ: tudo dela reunido num bloco só */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <TreePine className="text-emerald-400" size={20} />
          <h3 className="text-lg font-bold text-white">Visibilidade por Árvore</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Abra uma Árvore pra decidir tudo que ela mostra: a Árvore em si, a crônica da página dela e cada registro do Códice. Uma Árvore oculta some do visualizador 3D e das opções da ficha.
        </p>

        <div className="flex flex-col gap-2">
          {ARVORES_REAIS.map(arvore => renderBlocoEscopo(arvore))}
        </div>
      </section>

      {/* O VAZIO: não é Árvore, é o espaço entre elas - por isso vem separado */}
      {vazio && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <CircleOff className="text-gray-400" size={20} />
            <h3 className="text-lg font-bold text-white">Visibilidade do Vazio</h3>
          </div>
          <p className="mb-4 text-xs text-gray-400">
            O Vazio é o espaço entre as Árvores e o resto do universo, governado por Erebus. Não é uma décima Árvore, então tem bloco próprio: aqui saem do ar a página dele, a crônica e os locais que existem lá dentro.
          </p>

          <div className="flex flex-col gap-2">
            {renderBlocoEscopo(vazio, true)}
          </div>
        </section>
      )}


      {/* SEÇÃO RAÇAS E CLASSES ESPECIAIS */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">Raças e Classes Especiais</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Raças e classes esquecidas são recompensas ou transformações acima da curva. Elas só aparecem na criação/edição de fichas depois de liberadas aqui.
        </p>

        {!catalogo ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando catálogo...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="custom-scrollbar flex max-h-[280px] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">Raças ({racasLiberadas.length}/{racasEspeciais.length} liberadas)</h4>
              {racasEspeciais.map((raca: any) => {
                const isLiberada = racasLiberadas.includes(raca.id);
                return (
                  <div key={raca.id} className="flex items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-white/5 hover:bg-white/5">
                    <span className="text-sm font-medium text-white">{raca.titulo}</span>
                    <button
                      onClick={() => handleToggleRaca(raca.id)}
                      disabled={!isMaster}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isLiberada
                          ? 'border border-purple-500/30 bg-purple-500/20 text-purple-300'
                          : 'border border-white/10 bg-white/5 text-gray-500'
                      }`}
                    >
                      {isLiberada ? 'Liberada' : 'Bloqueada'}
                    </button>
                  </div>
                );
              })}
              {racasEspeciais.length === 0 && <p className="text-xs italic text-gray-600">Nenhuma raça especial no catálogo.</p>}
            </div>

            <div className="custom-scrollbar flex max-h-[280px] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">Classes ({classesLiberadas.length}/{classesEspeciais.length} liberadas)</h4>
              {classesEspeciais.map((classe: any) => {
                const isLiberada = classesLiberadas.includes(classe.id);
                return (
                  <div key={classe.id} className="flex items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-white/5 hover:bg-white/5">
                    <span className="text-sm font-medium text-white">{classe.titulo}</span>
                    <button
                      onClick={() => handleToggleClasse(classe.id)}
                      disabled={!isMaster}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isLiberada
                          ? 'border border-purple-500/30 bg-purple-500/20 text-purple-300'
                          : 'border border-white/10 bg-white/5 text-gray-500'
                      }`}
                    >
                      {isLiberada ? 'Liberada' : 'Bloqueada'}
                    </button>
                  </div>
                );
              })}
              {classesEspeciais.length === 0 && <p className="text-xs italic text-gray-600">Nenhuma classe especial no catálogo.</p>}
            </div>
          </div>
        )}
      </section>

      {/* SEÇÃO LIBERAÇÃO INDIVIDUAL */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserCog className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">Liberação Individual</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Libere uma raça ou classe especial só pra um jogador específico - pra recompensas e transformações que não valem pra mesa inteira. Some com o que já está liberado pra campanha acima.
        </p>

        {jogadoresDaCampanha.length === 0 ? (
          <p className="text-xs italic text-gray-600">Nenhum jogador na campanha ainda.</p>
        ) : (
          <>
            <Select
              value={membroSelecionado}
              onChange={setMembroSelecionado}
              placeholder="Selecione um jogador"
              options={jogadoresDaCampanha.map((membro) => ({ value: membro.id, label: membro.nome_exibicao }))}
              className="mb-4 w-full md:w-72"
            />

            {!membroSelecionado ? (
              <p className="text-xs italic text-gray-600">Selecione um jogador acima pra liberar raças/classes só pra ele.</p>
            ) : !catalogo ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando catálogo...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="custom-scrollbar flex max-h-[280px] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4">
                  <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">
                    Raças ({(racasLiberadasMembros[membroSelecionado] || []).length}/{racasEspeciais.length} liberadas)
                  </h4>
                  {racasEspeciais.map((raca: any) => {
                    const isLiberada = (racasLiberadasMembros[membroSelecionado] || []).includes(raca.id);
                    return (
                      <div key={raca.id} className="flex items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-white/5 hover:bg-white/5">
                        <span className="text-sm font-medium text-white">{raca.titulo}</span>
                        <button
                          onClick={() => handleToggleRacaMembro(membroSelecionado, raca.id)}
                          disabled={!isMaster}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            isLiberada
                              ? 'border border-purple-500/30 bg-purple-500/20 text-purple-300'
                              : 'border border-white/10 bg-white/5 text-gray-500'
                          }`}
                        >
                          {isLiberada ? 'Liberada' : 'Bloqueada'}
                        </button>
                      </div>
                    );
                  })}
                  {racasEspeciais.length === 0 && <p className="text-xs italic text-gray-600">Nenhuma raça especial no catálogo.</p>}
                </div>

                <div className="custom-scrollbar flex max-h-[280px] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4">
                  <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">
                    Classes ({(classesLiberadasMembros[membroSelecionado] || []).length}/{classesEspeciais.length} liberadas)
                  </h4>
                  {classesEspeciais.map((classe: any) => {
                    const isLiberada = (classesLiberadasMembros[membroSelecionado] || []).includes(classe.id);
                    return (
                      <div key={classe.id} className="flex items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-white/5 hover:bg-white/5">
                        <span className="text-sm font-medium text-white">{classe.titulo}</span>
                        <button
                          onClick={() => handleToggleClasseMembro(membroSelecionado, classe.id)}
                          disabled={!isMaster}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            isLiberada
                              ? 'border border-purple-500/30 bg-purple-500/20 text-purple-300'
                              : 'border border-white/10 bg-white/5 text-gray-500'
                          }`}
                        >
                          {isLiberada ? 'Liberada' : 'Bloqueada'}
                        </button>
                      </div>
                    );
                  })}
                  {classesEspeciais.length === 0 && <p className="text-xs italic text-gray-600">Nenhuma classe especial no catálogo.</p>}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* SEÇÃO LOJA */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="text-[#c7a44c]" size={20} />
          <h3 className="text-lg font-bold text-white">Mercado e Economia</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">Selecione quais locais da loja estarão visíveis e liberados para os jogadores acessarem.</p>

        <div className="flex flex-wrap gap-2">
          {todosOsLocais.map(local => {
            const isHidden = locaisOcultos.includes(local.id);
            return (
              <button
                key={local.id}
                onClick={() => handleToggleLocal(local.id)}
                disabled={!isMaster}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed ${
                  isHidden
                    ? 'border-red-500/50 bg-red-500/20 text-red-400 opacity-70'
                    : 'border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50'
                }`}
              >
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                {local.nome}
              </button>
            );
          })}
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-end border-t border-white/10 pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !isMaster}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)] transition-all hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

    </div>
  );
};
