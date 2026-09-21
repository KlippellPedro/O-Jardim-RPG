import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  Coins,
  Dices,
  Flame,
  MessageSquare,
  Pin,
  RefreshCw,
  Skull,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { diarioApi, type IEventoDiario, type TipoEventoDiario } from '../../../../services/diarioApi';
import {
  FILTROS_DIARIO,
  LIMITE_COMENTARIO_DIARIO,
  agruparPorDia,
  alterarMarca,
  filtrarEventos,
  normalizarMarcas,
  type FiltroDiario,
} from '../../utils/diario';

const PAGINA = 40;

interface IEstiloEvento {
  icone: LucideIcon;
  /** Cor do ícone e do trilho da linha do tempo. */
  cor: string;
  /** Tom do cartão. */
  fundo: string;
  borda: string;
}

const ESTILOS: Record<TipoEventoDiario, IEstiloEvento> = {
  sessao: { icone: Users, cor: '#7dd3fc', fundo: 'rgba(56,189,248,0.07)', borda: 'rgba(56,189,248,0.28)' },
  critico: { icone: Dices, cor: '#6ee7b7', fundo: 'rgba(16,185,129,0.07)', borda: 'rgba(16,185,129,0.28)' },
  falha: { icone: Skull, cor: '#fda4af', fundo: 'rgba(244,63,94,0.07)', borda: 'rgba(244,63,94,0.28)' },
  dano: { icone: Swords, cor: '#fdba74', fundo: 'rgba(249,115,22,0.07)', borda: 'rgba(249,115,22,0.28)' },
  uso: { icone: Sparkles, cor: '#f0abfc', fundo: 'rgba(217,70,239,0.07)', borda: 'rgba(217,70,239,0.28)' },
  conquista: { icone: Award, cor: '#e3c46f', fundo: 'rgba(199,164,76,0.10)', borda: 'rgba(199,164,76,0.4)' },
  ganho: { icone: Coins, cor: '#bef264', fundo: 'rgba(132,204,22,0.06)', borda: 'rgba(132,204,22,0.25)' },
  gasto: { icone: Flame, cor: '#fcd34d', fundo: 'rgba(245,158,11,0.06)', borda: 'rgba(245,158,11,0.25)' },
};

const hora = (iso: string) => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? ''
    : data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/** O servidor às vezes devolve só "Not Found" ou "nao autenticado"; a tela traduz. */
const mensagemAmigavel = (falha: unknown) => {
  const texto = falha instanceof Error ? falha.message : '';
  if (/not found|nao encontrado/i.test(texto)) {
    return 'O diário ainda não está disponível neste servidor. Se você acabou de atualizar o site, reinicie a API e recarregue a página.';
  }
  if (/autenticado|sessao|sessão/i.test(texto)) return 'Sua sessão expirou. Entre de novo para folhear o diário.';
  return texto || 'Não foi possível abrir o diário agora.';
};

interface IPainelDiarioProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
}

export const PainelDiario = ({ character, onUpdate }: IPainelDiarioProps) => {
  const [eventos, setEventos] = useState<IEventoDiario[] | null>(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [filtro, setFiltro] = useState<FiltroDiario>('todos');
  const [comentando, setComentando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState('');
  const [limite, setLimite] = useState(PAGINA);

  const personagemId: string | undefined = character?.id;
  const marcasBrutas = character?.ficha?.diario?.marcas;
  const marcas = useMemo(() => normalizarMarcas(marcasBrutas), [marcasBrutas]);

  useEffect(() => {
    if (!personagemId) return undefined;
    let ativo = true;
    setEventos(null);
    setErro('');
    diarioApi.obter(personagemId)
      .then((resposta) => { if (ativo) setEventos(resposta.eventos); })
      .catch((falha) => { if (ativo) setErro(mensagemAmigavel(falha)); });
    return () => { ativo = false; };
  }, [personagemId, tentativa]);

  useEffect(() => { setLimite(PAGINA); }, [filtro]);

  const salvarMarcas = useCallback((proximas: ReturnType<typeof normalizarMarcas>) => {
    onUpdate(['ficha', 'diario'], { ...(character?.ficha?.diario || {}), marcas: proximas });
  }, [character?.ficha?.diario, onUpdate]);

  const alternarFixado = (chave: string) => {
    salvarMarcas(alterarMarca(marcas, chave, { fixado: !marcas[chave]?.fixado }));
  };

  const abrirComentario = (chave: string) => {
    setComentando(chave);
    setRascunho(marcas[chave]?.comentario || '');
  };

  const salvarComentario = (chave: string) => {
    salvarMarcas(alterarMarca(marcas, chave, { comentario: rascunho }));
    setComentando(null);
  };

  const visiveis = useMemo(
    () => (eventos ? filtrarEventos(eventos, filtro, marcas) : []),
    [eventos, filtro, marcas],
  );
  const recorte = useMemo(() => visiveis.slice(0, limite), [visiveis, limite]);
  const dias = useMemo(() => agruparPorDia(recorte), [recorte]);
  const fixados = useMemo(
    () => (eventos || []).filter((evento) => marcas[evento.chave]?.fixado),
    [eventos, marcas],
  );
  const resumo = useMemo(() => {
    const lista = eventos || [];
    const contar = (...tipos: TipoEventoDiario[]) => lista.filter((evento) => tipos.includes(evento.tipo)).length;
    return [
      { rotulo: 'Momentos', valor: lista.length, cor: '#e3c46f' },
      { rotulo: 'Sessões', valor: lista.filter((evento) => evento.tipo === 'sessao' && evento.chave.startsWith('sessao:')).length, cor: '#7dd3fc' },
      { rotulo: 'Críticos', valor: contar('critico'), cor: '#6ee7b7' },
      { rotulo: 'Selos', valor: contar('conquista'), cor: '#f0abfc' },
    ];
  }, [eventos]);

  if (erro) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#0f0e15] p-8 text-center" role="alert">
        <BookOpen size={40} className="mx-auto mb-3 text-gray-700" />
        <p className="mx-auto max-w-md text-sm leading-6 text-gray-400">{erro}</p>
        <button
          type="button"
          onClick={() => setTentativa((valor) => valor + 1)}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 text-sm font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20"
        >
          <RefreshCw size={14} /> Tentar de novo
        </button>
      </div>
    );
  }

  if (eventos === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Folheando as páginas">
        {[0, 1, 2].map((indice) => (
          <div key={indice} className="h-20 animate-pulse rounded-xl border border-white/5 bg-[#0f0e15]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="diario-linha">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {resumo.map((item) => (
          <div key={item.rotulo} className="rounded-xl border border-white/5 bg-[#0f0e15] px-4 py-3">
            <div className="text-2xl font-bold" style={{ color: item.cor, fontFamily: 'Cinzel, serif' }}>{item.valor}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.rotulo}</div>
          </div>
        ))}
      </div>

      {fixados.length > 0 && filtro !== 'fixados' ? (
        <div className="rounded-2xl border border-[#c7a44c]/25 bg-gradient-to-br from-[#c7a44c]/10 to-transparent p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#c7a44c]">
            <Pin size={14} /> Momentos guardados
          </h3>
          <ul className="space-y-3">
            {fixados.slice(0, 5).map((evento) => (
              <li key={evento.chave} className="text-[15px] leading-6 text-gray-100" style={{ fontFamily: 'Georgia, serif' }}>
                {evento.texto}
                {marcas[evento.chave]?.comentario ? (
                  <span className="mt-0.5 block text-sm italic text-[#c7a44c]/80">“{marcas[evento.chave].comentario}”</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar o diário">
        {FILTROS_DIARIO.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={filtro === opcao.valor}
            onClick={() => setFiltro(opcao.valor)}
            className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors ${filtro === opcao.valor
              ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e3c46f]'
              : 'border-white/10 bg-[#0f0e15] text-gray-400 hover:text-white'}`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {dias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0e15] px-6 py-14 text-center">
          <BookOpen size={44} className="mx-auto mb-4 text-gray-700" />
          <p className="font-bold uppercase tracking-widest text-gray-500">
            {eventos.length === 0 ? 'As páginas ainda estão em branco' : 'Nada com esse filtro'}
          </p>
          {eventos.length === 0 ? (
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              O diário se escreve sozinho. Entre numa sessão, role os dados, use um poder ou ganhe um selo, e a primeira linha aparece aqui.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          {dias.map((dia) => (
            <section key={dia.dia} aria-label={dia.rotulo}>
              <h3 className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                <span>{dia.rotulo}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
                <span className="text-gray-600">{dia.eventos.length}</span>
              </h3>
              <ol className="relative space-y-3 border-l border-white/10 pl-6">
                {dia.eventos.map((evento, posicao) => {
                  const estilo = ESTILOS[evento.tipo] || ESTILOS.sessao;
                  const Icone = estilo.icone;
                  const marca = marcas[evento.chave];
                  const editando = comentando === evento.chave;
                  const capitulo = evento.tipo === 'sessao' && evento.chave.startsWith('sessao:');
                  return (
                    <motion.li
                      key={evento.chave}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(posicao, 8) * 0.03 }}
                      className="relative"
                    >
                      <span
                        className="absolute -left-[37px] top-3.5 flex h-6 w-6 items-center justify-center rounded-full border bg-[#0b0a10]"
                        style={{ color: estilo.cor, borderColor: estilo.borda }}
                      >
                        <Icone size={12} />
                      </span>
                      <div
                        className="rounded-xl border p-4"
                        style={{
                          background: marca?.fixado ? 'rgba(199,164,76,0.10)' : estilo.fundo,
                          borderColor: marca?.fixado ? 'rgba(199,164,76,0.5)' : estilo.borda,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {capitulo && evento.titulo ? (
                              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: estilo.cor }}>
                                {evento.titulo}
                              </span>
                            ) : null}
                            <p
                              className={`leading-7 text-gray-100 ${capitulo ? 'text-lg' : 'text-[15px]'}`}
                              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                            >
                              {evento.texto}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="mr-1 hidden text-[10px] font-bold text-gray-600 sm:inline">{hora(evento.quando)}</span>
                            <button
                              type="button"
                              aria-label={marca?.fixado ? 'Desafixar momento' : 'Fixar momento'}
                              aria-pressed={!!marca?.fixado}
                              onClick={() => alternarFixado(evento.chave)}
                              className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-black/30 transition-colors ${marca?.fixado ? 'text-[#c7a44c]' : 'text-gray-500 hover:text-white'}`}
                            >
                              <Pin size={14} fill={marca?.fixado ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              type="button"
                              aria-label="Comentar momento"
                              onClick={() => (editando ? setComentando(null) : abrirComentario(evento.chave))}
                              className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-black/30 transition-colors ${marca?.comentario ? 'text-[#c7a44c]' : 'text-gray-500 hover:text-white'}`}
                            >
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        </div>
                        {marca?.comentario && !editando ? (
                          <p
                            className="mt-3 border-l-2 border-[#c7a44c]/50 pl-3 text-sm italic leading-6 text-[#e3c46f]/85"
                            style={{ fontFamily: 'Georgia, serif' }}
                          >
                            {marca.comentario}
                          </p>
                        ) : null}
                        {editando ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              autoFocus
                              value={rascunho}
                              maxLength={LIMITE_COMENTARIO_DIARIO}
                              onChange={(e) => setRascunho(e.target.value)}
                              placeholder="O que você sentiu naquele momento?"
                              className="min-h-20 w-full rounded-lg border border-white/10 bg-[#0b0a10] p-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-gray-600">{rascunho.length}/{LIMITE_COMENTARIO_DIARIO}</span>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setComentando(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white">
                                  Cancelar
                                </button>
                                <button type="button" onClick={() => salvarComentario(evento.chave)} className="rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-1.5 text-xs font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20">
                                  Guardar
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </section>
          ))}
          {visiveis.length > recorte.length ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setLimite((valor) => valor + PAGINA)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#0f0e15] px-6 text-sm font-bold text-gray-300 hover:text-white"
              >
                Mostrar mais ({visiveis.length - recorte.length})
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
