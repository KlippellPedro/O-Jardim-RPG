import { useEffect, useMemo, useRef, useState } from 'react';
import { Bird, Castle, CloudRain, Flame, Loader2, Music2, Pause, Play, Search, Square, Trash2, Trees, Upload, Volume2, VolumeX, Wind, X, type LucideIcon } from 'lucide-react';
import { avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import { mapaRecursosApi, type IFaixaMesa, type ITrilhaMesa } from '../../../services/mapaRecursosApi';
import {
  CATEGORIAS_DE_SOM,
  FONTE_DOS_SONS,
  MAXIMO_DE_CAMADAS,
  alternarCamada,
  estaLigado,
  filtrarSons,
  mudarVolumeDaCamada,
  somPorId,
  type IAjusteLocalDoAmbiente,
  type ICamadaAmbiente,
} from '../motor/sonsAmbiente';
import '../trilhaMesa.css';

const FORMATOS = 'audio/mpeg,audio/ogg,audio/wav,audio/webm';

const ICONE_DA_CATEGORIA: Record<string, LucideIcon> = {
  chuva: CloudRain,
  vento: Wind,
  'fogo-e-agua': Flame,
  natureza: Trees,
  animais: Bird,
  lugares: Castle,
};

type Aba = 'ambiente' | 'musica';

export const PainelTrilha = ({
  aberto, campanhaId, gestor, estado, onEstado, onTocar, onFechar, ambiente, onAmbiente, ajuste, onAjuste, falhas,
}: {
  aberto: boolean;
  campanhaId: string;
  gestor: boolean;
  estado: ITrilhaMesa | null;
  onEstado: (estado: ITrilhaMesa) => void;
  onTocar: (reproduzir: boolean, estado: ITrilhaMesa) => void;
  onFechar: () => void;
  /** Os sons de ambiente que estão tocando para a mesa. */
  ambiente: ICamadaAmbiente[];
  onAmbiente: (camadas: ICamadaAmbiente[]) => void;
  /** Quanto este aparelho ouve dos sons de ambiente (só vale aqui, não vai para a mesa). */
  ajuste: IAjusteLocalDoAmbiente;
  onAjuste: (ajuste: IAjusteLocalDoAmbiente) => void;
  /** Sons que não carregaram. */
  falhas: string[];
}) => {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const envioDoAmbiente = useRef<number | null>(null);
  const [aba, setAba] = useState<Aba>('ambiente');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [faixas, setFaixas] = useState<IFaixaMesa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const atualizar = async () => {
    setCarregando(true);
    try {
      const resposta = await mapaRecursosApi.listarTrilhas(campanhaId);
      setFaixas(resposta.faixas);
      onEstado(resposta.estado);
      if (resposta.ambiente) onAmbiente(resposta.ambiente);
    } catch (falha) {
      avisarErro(falha, 'Não foi possível abrir a trilha da cena.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (aberto && campanhaId) void atualizar();
  }, [aberto, campanhaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sons = useMemo(() => filtrarSons(categoria, busca), [categoria, busca]);

  if (!aberto) return null;

  // Os sons mudam na hora aqui (o volume acompanha o dedo) e vão para a mesa logo em seguida: de uma vez ao
  // ligar e desligar, e esperando o dedo parar quando é o controle de volume.
  const mandarAmbiente = (camadas: ICamadaAmbiente[], esperar: boolean) => {
    onAmbiente(camadas);
    if (envioDoAmbiente.current !== null) window.clearTimeout(envioDoAmbiente.current);
    const enviar = async () => {
      envioDoAmbiente.current = null;
      try {
        const resposta = await mapaRecursosApi.definirAmbiente(campanhaId, camadas);
        onAmbiente(resposta.camadas);
      } catch (falha) {
        avisarErro(falha, 'Não foi possível mudar os sons de ambiente.');
        void atualizar();
      }
    };
    if (esperar) envioDoAmbiente.current = window.setTimeout(() => void enviar(), 350);
    else void enviar();
  };

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (arquivo.size > 20 * 1024 * 1024) {
      avisarErro(new Error('A trilha pode ter no máximo 20 MB.'), 'Não foi possível enviar a trilha.');
      return;
    }
    setEnviando(true);
    try {
      await mapaRecursosApi.enviarTrilha(campanhaId, arquivo);
      await atualizar();
    } catch (falha) {
      avisarErro(falha, 'Não foi possível enviar essa trilha.');
    } finally {
      setEnviando(false);
    }
  };

  const selecionar = async (faixa: IFaixaMesa) => {
    try {
      onEstado(await mapaRecursosApi.definirTrilha(campanhaId, { faixa_id: faixa.id, reproduzindo: false, posicao_ms: 0 }));
    } catch (falha) {
      avisarErro(falha, 'Não foi possível selecionar essa trilha.');
    }
  };

  const apagar = async (faixa: IFaixaMesa) => {
    if (!(await confirmar({ mensagem: `Apagar a trilha "${faixa.nome}"?`, rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    try {
      await mapaRecursosApi.apagarTrilha(campanhaId, faixa.id);
      await atualizar();
    } catch (falha) {
      avisarErro(falha, 'Não foi possível apagar essa trilha.');
    }
  };

  const tamanho = (bytes: number) => `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  const cheio = ambiente.length >= MAXIMO_DE_CAMADAS;
  const comFalha = new Set(falhas);

  return (
    <section className="mapa-recurso-painel mapa-trilha-painel" aria-label="Trilha sonora">
      <header>
        <strong><Music2 size={15} /> Trilha sonora</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar trilha" onClick={onFechar}><X size={16} /></button>
      </header>

      <div className="mapa-trilha-abas" role="tablist" aria-label="Tipo de som">
        <button type="button" role="tab" aria-selected={aba === 'ambiente'} className={aba === 'ambiente' ? 'ativo' : ''} onClick={() => setAba('ambiente')}>
          Sons de ambiente{ambiente.length > 0 && <small>{ambiente.length}</small>}
        </button>
        <button type="button" role="tab" aria-selected={aba === 'musica'} className={aba === 'musica' ? 'ativo' : ''} onClick={() => setAba('musica')}>
          Músicas{estado?.reproduzindo && <small>tocando</small>}
        </button>
      </div>

      {aba === 'ambiente' && (
        <div className="mapa-ambiente" role="tabpanel">
          <div className="mapa-ambiente-local">
            <button
              type="button"
              className={`mapa-icone${ajuste.mudo ? ' ativo' : ''}`}
              aria-pressed={ajuste.mudo}
              aria-label={ajuste.mudo ? 'Ouvir os sons de ambiente neste aparelho' : 'Silenciar os sons de ambiente neste aparelho'}
              onClick={() => onAjuste({ ...ajuste, mudo: !ajuste.mudo })}
            >
              {ajuste.mudo ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <label>
              Neste aparelho
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ajuste.volume}
                aria-label="Volume dos sons de ambiente neste aparelho"
                onChange={(evento) => onAjuste({ mudo: false, volume: Number(evento.target.value) })}
              />
            </label>
            <span>{Math.round((ajuste.mudo ? 0 : ajuste.volume) * 100)}%</span>
          </div>

          <div className="mapa-ambiente-agora">
            <div className="mapa-ambiente-titulo">
              <strong>Tocando agora</strong>
              {gestor && ambiente.length > 0 && (
                <button type="button" className="mapa-botao-leve" onClick={() => mandarAmbiente([], false)}><Square size={12} /> Parar tudo</button>
              )}
            </div>
            {ambiente.length === 0
              ? <p className="mapa-dica">{gestor ? 'Nada tocando. Escolha um som abaixo.' : 'O Mestre ainda não ligou nenhum som de ambiente.'}</p>
              : (
                <ul>
                  {ambiente.map((camada) => {
                    const som = somPorId(camada.id);
                    if (!som) return null;
                    const Icone = ICONE_DA_CATEGORIA[som.categoria] ?? Music2;
                    return (
                      <li key={camada.id} className={comFalha.has(camada.id) ? 'falhou' : ''}>
                        <Icone size={15} aria-hidden="true" />
                        <span title={comFalha.has(camada.id) ? 'Este som não carregou' : undefined}>{som.nome}</span>
                        {gestor ? (
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={camada.volume}
                            aria-label={`Volume: ${som.nome}`}
                            onChange={(evento) => mandarAmbiente(mudarVolumeDaCamada(ambiente, camada.id, Number(evento.target.value)), true)}
                          />
                        ) : (
                          <meter min={0} max={1} value={camada.volume} aria-label={`Volume: ${som.nome}`} />
                        )}
                        {gestor && (
                          <button type="button" className="mapa-icone" aria-label={`Desligar ${som.nome}`} onClick={() => mandarAmbiente(alternarCamada(ambiente, camada.id), false)}><X size={14} /></button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            {falhas.length > 0 && <p className="mapa-dica mapa-ambiente-aviso">Alguns sons não carregaram. Confira a internet deste aparelho.</p>}
          </div>

          {gestor && (
            <div className="mapa-ambiente-catalogo">
              <label className="mapa-ambiente-busca">
                <Search size={14} aria-hidden="true" />
                <input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar som" aria-label="Buscar som de ambiente" autoComplete="off" />
              </label>
              <div className="mapa-ambiente-categorias" role="group" aria-label="Categoria">
                <button type="button" className={categoria === null ? 'ativo' : ''} aria-pressed={categoria === null} onClick={() => setCategoria(null)}>Todos</button>
                {CATEGORIAS_DE_SOM.map((item) => {
                  const Icone = ICONE_DA_CATEGORIA[item.id] ?? Music2;
                  return (
                    <button key={item.id} type="button" className={categoria === item.id ? 'ativo' : ''} aria-pressed={categoria === item.id} onClick={() => setCategoria(item.id)}>
                      <Icone size={13} aria-hidden="true" /> {item.nome}
                    </button>
                  );
                })}
              </div>
              <div className="mapa-ambiente-sons custom-scrollbar">
                {sons.map((som) => {
                  const ligado = estaLigado(ambiente, som.id);
                  const Icone = ICONE_DA_CATEGORIA[som.categoria] ?? Music2;
                  return (
                    <button
                      key={som.id}
                      type="button"
                      className={ligado ? 'ativo' : ''}
                      aria-pressed={ligado}
                      disabled={!ligado && cheio}
                      title={!ligado && cheio ? `A mesa toca até ${MAXIMO_DE_CAMADAS} sons ao mesmo tempo` : undefined}
                      onClick={() => mandarAmbiente(alternarCamada(ambiente, som.id), false)}
                    >
                      <Icone size={14} aria-hidden="true" />
                      <span>{som.nome}</span>
                    </button>
                  );
                })}
                {sons.length === 0 && <p className="mapa-dica">Nenhum som com esse nome.</p>}
              </div>
              {cheio && <p className="mapa-dica">A mesa toca até {MAXIMO_DE_CAMADAS} sons ao mesmo tempo. Desligue um para ligar outro.</p>}
            </div>
          )}

          <p className="mapa-dica mapa-ambiente-credito">
            Os sons tocam de fora do site, do repositório{' '}
            <a href={FONTE_DOS_SONS.repositorio} target="_blank" rel="noreferrer noopener">{FONTE_DOS_SONS.nome}</a> no GitHub, e precisam de internet. Licença: {FONTE_DOS_SONS.licenca}.
          </p>
        </div>
      )}

      {aba === 'musica' && (
        <div className="mapa-trilha-musica" role="tabpanel">
          {carregando && <p className="mapa-dica"><Loader2 size={14} className="girando" /> Sincronizando...</p>}
          {estado?.nome && (
            <div className="mapa-trilha-atual">
              <span>{estado.nome}</span>
              {gestor && <button type="button" className="mapa-botao-leve" onClick={() => onTocar(!estado.reproduzindo, estado)}>
                {estado.reproduzindo ? <Pause size={14} /> : <Play size={14} />}{estado.reproduzindo ? 'Pausar' : 'Tocar'}
              </button>}
            </div>
          )}
          {gestor ? <>
            <input ref={arquivoRef} className="sr-only" type="file" accept={FORMATOS} aria-label="Escolher arquivo de áudio" onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              evento.target.value = '';
              void escolher(arquivo);
            }} />
            <button type="button" className="mapa-botao" disabled={enviando} onClick={() => arquivoRef.current?.click()}>
              {enviando ? <Loader2 size={14} className="girando" /> : <Upload size={14} />} Enviar áudio (até 20 MB)
            </button>
            <ul className="mapa-trilhas-lista">
              {faixas.map((faixa) => (
                <li key={faixa.id} className={estado?.faixa_id === faixa.id ? 'ativa' : ''}>
                  <button type="button" className="mapa-trilha-selecionar" onClick={() => void selecionar(faixa)}>
                    <span>{faixa.nome}</span><small>{tamanho(faixa.bytes)}</small>
                  </button>
                  <button type="button" className="mapa-icone" aria-label={`Apagar ${faixa.nome}`} onClick={() => void apagar(faixa)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
            {!faixas.length && !carregando && <p className="mapa-dica">Envie uma faixa para começar. MP3, Ogg, WAV e WebM são aceitos.</p>}
          </> : <p className="mapa-dica">O Mestre controla a trilha. Se o navegador bloquear o som, use o botão “Ativar áudio da mesa”.</p>}
          <p className="mapa-dica">O áudio e a posição de reprodução são sincronizados com quem está na sessão.</p>
        </div>
      )}
    </section>
  );
};
