import { Fragment, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { useResolvedRules } from '../../hooks/useResolvedRules';
import { useResolvedWorld } from '../../hooks/useResolvedWorld';
import { registrosDeFabrica } from '../../pages/Mundo/universais/dadosPadrao';
import { mesclarRegistros } from '../../pages/Mundo/universais/registros';
import {
  GRUPOS_DA_BUSCA,
  buscar,
  destacarTermos,
  indexar,
  sugestoesIniciais,
  termosDaBusca,
  type ResultadoDaBusca,
} from '../../services/buscaDoJardim';
import {
  atalhosDaBusca,
  fichasDaBusca,
  itensDaBusca,
  mundoDaBusca,
  regrasDaBusca,
  registrosDaBusca,
  type ContextoDaBusca,
} from '../../services/buscaDoJardimFontes';
import { lojaApi } from '../../services/lojaApi';
import { mapearCatalogoLoja, type LojaItem } from '../../services/lojaCatalogService';
import { registrosUniversaisApi, type IRegistroDoServidor } from '../../services/registrosUniversaisApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import './busca.css';

interface BuscaDoJardimProps {
  aberta: boolean;
  onFechar: () => void;
}

const SEM_CONFIG: Record<string, unknown> = {};

function Destacado({ texto, termos }: { texto: string; termos: string[] }) {
  return (
    <>
      {destacarTermos(texto, termos).map((parte, indice) => (
        parte.marcado ? <mark key={indice}>{parte.texto}</mark> : <Fragment key={indice}>{parte.texto}</Fragment>
      ))}
    </>
  );
}

/** A caixa de busca do Jardim (Ctrl+K). Reúne atalhos, fichas, Livro, Mundo, Registros Universais e Loja, e cada
 * fonte entrega só o que esta pessoa pode ver (ver `buscaDoJardimFontes.ts`). Os dados chegam na primeira abertura
 * e ficam guardados enquanto o site estiver aberto. */
export function BuscaDoJardim({ aberta, onFechar }: BuscaDoJardimProps) {
  const navigate = useNavigate();
  const usuario = useAuthStore((estado) => estado.usuario);
  const campanha = useAuthStore((estado) => estado.campanhaAtiva);
  const campanhaId = campanha?.id;
  const personagens = useCharacterStore((estado) => estado.characters);
  const buscarPersonagens = useCharacterStore((estado) => estado.fetchCharacters);

  const regras = useResolvedRules(campanhaId);
  const mundo = useResolvedWorld(campanhaId);
  const [itensDaLoja, setItensDaLoja] = useState<LojaItem[]>([]);
  const [doServidor, setDoServidor] = useState<IRegistroDoServidor[]>([]);
  const [carregandoExtras, setCarregandoExtras] = useState(Boolean(campanhaId));

  const [consulta, setConsulta] = useState('');
  const consultaAdiada = useDeferredValue(consulta);
  const [ativo, setAtivo] = useState(0);

  const caixaRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const rolarAteOAtivo = useRef(false);
  const idBase = useId();

  useDialogAccessibility({ open: aberta, dialogRef: caixaRef, onClose: onFechar, initialFocusRef: entradaRef });

  // As fichas já costumam estar carregadas; se o site abriu direto numa tela sem elas, busca agora.
  useEffect(() => {
    if (aberta && campanhaId && personagens.length === 0) void buscarPersonagens();
  }, [aberta, buscarPersonagens, campanhaId, personagens.length]);

  // A Loja e os ajustes do Mestre nos Registros Universais: um pedido cada, na primeira abertura da busca.
  useEffect(() => {
    if (!campanhaId) {
      setItensDaLoja([]);
      setDoServidor([]);
      setCarregandoExtras(false);
      return undefined;
    }
    const controle = new AbortController();
    setCarregandoExtras(true);
    Promise.allSettled([
      lojaApi.listarCatalogo(campanhaId, controle.signal).then((resposta) => mapearCatalogoLoja(resposta.itens)),
      registrosUniversaisApi.obter(campanhaId).then((resposta) => resposta.registros),
    ]).then(([loja, registros]) => {
      if (controle.signal.aborted) return;
      setItensDaLoja(loja.status === 'fulfilled' ? loja.value : []);
      setDoServidor(registros.status === 'fulfilled' ? registros.value : []);
      setCarregandoExtras(false);
    });
    return () => controle.abort();
  }, [campanhaId]);

  // As mesmas contas de papel que as páginas fazem.
  const papelNaCampanha = campanha?.papel;
  const plataforma = usuario?.papel_plataforma;
  const configuracoes = (campanha?.configuracoes as Record<string, unknown> | undefined) ?? SEM_CONFIG;
  const contexto = useMemo<ContextoDaBusca>(() => ({
    isMestre: plataforma === 'admin' || plataforma === 'criador' || papelNaCampanha === 'mestre' || papelNaCampanha === 'assistente',
    gestorDaCampanha: papelNaCampanha === 'mestre' || papelNaCampanha === 'assistente',
    isCriador: plataforma === 'criador',
    isAdmin: plataforma === 'admin' || plataforma === 'criador',
    temCampanha: Boolean(campanhaId),
    usuarioId: usuario?.id,
    config: configuracoes,
  }), [campanhaId, configuracoes, papelNaCampanha, plataforma, usuario?.id]);

  const registros = useMemo(() => {
    const fabrica = registrosDeFabrica({
      catalog: mundo.catalog,
      factions: mundo.factions,
      isMestre: contexto.isMestre,
      loreRevelado: Array.isArray(configuracoes.lore_revelado) ? configuracoes.lore_revelado.map(String) : [],
      loreOculto: Array.isArray(configuracoes.lore_oculto) ? configuracoes.lore_oculto.map(String) : [],
    });
    return mesclarRegistros(fabrica, doServidor, contexto.isMestre);
  }, [configuracoes, contexto.isMestre, doServidor, mundo.catalog, mundo.factions]);

  const entradas = useMemo(() => [
    ...atalhosDaBusca(contexto),
    ...fichasDaBusca(personagens),
    ...regrasDaBusca(regras, contexto),
    ...mundoDaBusca(mundo.catalog, contexto),
    ...registrosDaBusca(registros, contexto),
    ...itensDaBusca(itensDaLoja, contexto),
  ], [contexto, itensDaLoja, mundo.catalog, personagens, regras, registros]);
  const indice = useMemo(() => indexar(entradas), [entradas]);

  const termos = useMemo(() => termosDaBusca(consultaAdiada), [consultaAdiada]);
  const resultados = useMemo<ResultadoDaBusca[]>(() => (
    termos.length
      ? buscar(indice, consultaAdiada)
      : sugestoesIniciais(entradas).map((entrada) => ({ entrada, pontos: 0 }))
  ), [consultaAdiada, entradas, indice, termos.length]);

  const carregando = regras.carregando || mundo.loading || carregandoExtras;

  // Nova consulta, de volta ao primeiro resultado; fechar limpa a caixa para a próxima vez.
  useEffect(() => {
    setAtivo(0);
    rolarAteOAtivo.current = true;
  }, [consultaAdiada]);
  useEffect(() => { if (!aberta) { setConsulta(''); setAtivo(0); } }, [aberta]);

  // A lista só rola quando a mudança veio do teclado ou de uma consulta nova. Com o mouse em cima, rolar também
  // faria o navegador soltar um mousemove no item que passou por baixo, e a lista correria sozinha até a borda.
  useEffect(() => {
    if (!aberta || !rolarAteOAtivo.current) return;
    rolarAteOAtivo.current = false;
    const lista = listaRef.current;
    if (!lista) return;
    if (ativo === 0) lista.scrollTop = 0;
    else lista.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [aberta, ativo, resultados]);

  if (!aberta) return null;

  const abrir = (resultado: ResultadoDaBusca | undefined) => {
    if (!resultado) return;
    onFechar();
    navigate(resultado.entrada.rota);
  };

  const aoTeclar = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      rolarAteOAtivo.current = true;
      setAtivo((atual) => (resultados.length ? (atual + 1) % resultados.length : 0));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      rolarAteOAtivo.current = true;
      setAtivo((atual) => (resultados.length ? (atual - 1 + resultados.length) % resultados.length : 0));
    } else if (evento.key === 'Home' && !consulta) {
      evento.preventDefault();
      rolarAteOAtivo.current = true;
      setAtivo(0);
    } else if (evento.key === 'End' && !consulta) {
      evento.preventDefault();
      rolarAteOAtivo.current = true;
      setAtivo(Math.max(0, resultados.length - 1));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      abrir(resultados[ativo]);
    }
  };

  const idDaOpcao = (indiceDaOpcao: number) => `${idBase}-opcao-${indiceDaOpcao}`;
  const semResultado = termos.length > 0 && resultados.length === 0;

  return (
    <div className="busca-fundo" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}>
      <div ref={caixaRef} className="busca" role="dialog" aria-modal="true" aria-label="Buscar no Jardim">
        <div className="busca__campo">
          <Search size={19} aria-hidden="true" />
          <input
            ref={entradaRef}
            className="busca__entrada"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${idBase}-lista`}
            aria-activedescendant={resultados.length ? idDaOpcao(ativo) : undefined}
            aria-autocomplete="list"
            aria-label="Buscar regras, itens, criaturas, Mundo e fichas"
            placeholder="Buscar regras, itens, criaturas, Mundo, fichas..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            onKeyDown={aoTeclar}
          />
          <button type="button" className="busca__fechar" onClick={onFechar} aria-label="Fechar a busca">Esc</button>
        </div>

        <div ref={listaRef} id={`${idBase}-lista`} className="busca__lista custom-scrollbar" role="listbox" aria-label="Resultados">
          {resultados.map((resultado, indiceDoResultado) => {
            const anterior = resultados[indiceDoResultado - 1];
            const novoGrupo = !anterior || anterior.entrada.grupo !== resultado.entrada.grupo;
            const { entrada } = resultado;
            return (
              <Fragment key={entrada.id}>
                {novoGrupo ? <div className="busca__grupo" role="presentation">{GRUPOS_DA_BUSCA[entrada.grupo].rotulo}</div> : null}
                <div
                  id={idDaOpcao(indiceDoResultado)}
                  role="option"
                  aria-selected={indiceDoResultado === ativo}
                  className="busca__item"
                  onMouseMove={() => { if (ativo !== indiceDoResultado) setAtivo(indiceDoResultado); }}
                  onClick={() => abrir(resultado)}
                >
                  <span className="busca__titulo"><Destacado texto={entrada.titulo} termos={termos} /></span>
                  {entrada.detalhe ? <span className="busca__detalhe">{entrada.detalhe}</span> : null}
                  {resultado.trecho ? <span className="busca__trecho"><Destacado texto={resultado.trecho} termos={termos} /></span> : null}
                </div>
              </Fragment>
            );
          })}
          {semResultado ? (
            <p className="busca__vazio">
              {carregando ? 'Procurando... o Mundo e a Loja ainda estão chegando.' : `Nada encontrado para “${consulta.trim()}”.`}
            </p>
          ) : null}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {termos.length ? `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}` : ''}
        </p>

        <div className="busca__rodape">
          <span className="busca__rodape-teclas">
            <kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd><CornerDownLeft size={10} className="inline" aria-hidden="true" /></kbd> abrir · <kbd>Esc</kbd> fechar
          </span>
          <span>{carregando ? 'Carregando o Mundo e a Loja...' : `${entradas.length.toLocaleString('pt-BR')} itens na busca`}</span>
        </div>
      </div>
    </div>
  );
}
