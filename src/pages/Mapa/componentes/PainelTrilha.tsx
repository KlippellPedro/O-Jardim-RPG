import { useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Pause, Play, Trash2, Upload, X } from 'lucide-react';
import { avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import { mapaRecursosApi, type IFaixaMesa, type ITrilhaMesa } from '../../../services/mapaRecursosApi';

const FORMATOS = 'audio/mpeg,audio/ogg,audio/wav,audio/webm';

export const PainelTrilha = ({
  aberto, campanhaId, gestor, estado, onEstado, onTocar, onFechar,
}: {
  aberto: boolean;
  campanhaId: string;
  gestor: boolean;
  estado: ITrilhaMesa | null;
  onEstado: (estado: ITrilhaMesa) => void;
  onTocar: (reproduzir: boolean, estado: ITrilhaMesa) => void;
  onFechar: () => void;
}) => {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [faixas, setFaixas] = useState<IFaixaMesa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const atualizar = async () => {
    setCarregando(true);
    try {
      const resposta = await mapaRecursosApi.listarTrilhas(campanhaId);
      setFaixas(resposta.faixas);
      onEstado(resposta.estado);
    } catch (falha) {
      avisarErro(falha, 'Não foi possível abrir a trilha da cena.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (aberto && campanhaId) void atualizar();
  }, [aberto, campanhaId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!aberto) return null;

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
  return (
    <section className="mapa-recurso-painel mapa-trilha-painel" aria-label="Trilha da cena">
      <header>
        <strong><Music2 size={15} /> Trilha da cena</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar trilha" onClick={onFechar}><X size={16} /></button>
      </header>
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
    </section>
  );
};
