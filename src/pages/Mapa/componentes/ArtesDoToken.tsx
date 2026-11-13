import { useCallback, useEffect, useState } from 'react';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import { mapaApi, urlImagemDaArte, type IArtesDoPersonagem } from '../../../services/mapaApi';
import { AjustarFotoModal } from '../../Ficha/components/AjustarFotoModal';
import { ModalPortal } from '../../Ficha/components/ModalPortal';
import { confirmar } from '../../../components/avisos/confirmacao';
import './artesDoToken.css';

interface Props {
  campanhaId: string;
  personagemId: string;
  nome: string;
  /** Depois de trocar ou apagar a arte do token: quem chama recarrega o mapa para o token mudar na tela. */
  aoMudarToken?: () => void;
}

/**
 * As artes do token de um personagem: a foto da ficha e até 8 extras (o mesmo personagem com outra roupa, por exemplo).
 * Clicar numa arte põe ela no token, em todas as cenas; a mesa vê a troca na hora.
 */
export const ArtesDoToken = ({ campanhaId, personagemId, nome, aoMudarToken }: Props) => {
  const [dados, setDados] = useState<IArtesDoPersonagem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');

  const carregar = useCallback(async () => {
    try {
      setDados(await mapaApi.listarArtes(campanhaId, personagemId));
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir as artes.');
    }
  }, [campanhaId, personagemId]);

  useEffect(() => {
    setDados(null);
    void carregar();
  }, [carregar]);

  const comEspera = async (acao: () => Promise<void>) => {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Algo não deu certo.');
    } finally {
      setOcupado(false);
    }
  };

  const escolher = (arteId: string | null) => comEspera(async () => {
    await mapaApi.editarTokenDoPersonagem(campanhaId, personagemId, arteId ? { arte_id: arteId } : { sem_arte: true });
    await carregar();
    aoMudarToken?.();
  });

  const guardar = (imagem: string) => comEspera(async () => {
    setDados(await mapaApi.criarArte(campanhaId, personagemId, { nome: nomeNova.trim() || undefined, imagem }));
    setNomeNova('');
    setAdicionando(false);
  });

  const apagar = async (arteId: string, nomeDaArte: string) => {
    if (!(await confirmar({ mensagem: `Apagar a arte "${nomeDaArte}"? Se ela estiver no token, a foto da ficha volta.`, rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    await comEspera(async () => {
      const estavaNoToken = dados?.ativa === arteId;
      setDados(await mapaApi.apagarArte(campanhaId, personagemId, arteId));
      if (estavaNoToken) aoMudarToken?.();
    });
  };

  if (!dados) {
    return <p className="artes-token-dica" role={erro ? 'alert' : 'status'}>{erro ?? 'Abrindo as artes...'}</p>;
  }

  const cheio = dados.artes.length >= dados.maximo;
  return (
    <div className="artes-token">
      <ul className="artes-token-grade" aria-label={`Artes do token de ${nome}`}>
        {dados.tem_foto_ficha && (
          <li>
            <button
              type="button"
              className={`artes-token-item${dados.ativa === null ? ' ativa' : ''}`}
              aria-pressed={dados.ativa === null}
              disabled={ocupado}
              onClick={() => void escolher(null)}
            >
              <img src={urlImagemDaArte(campanhaId, personagemId, 'ficha', dados.versao_foto_ficha)} alt="" loading="lazy" />
              <span>Foto da ficha</span>
              {dados.ativa === null && <Check className="artes-token-marca" size={14} aria-hidden="true" />}
            </button>
          </li>
        )}
        {dados.artes.map((arte) => (
          <li key={arte.id}>
            <button
              type="button"
              className={`artes-token-item${dados.ativa === arte.id ? ' ativa' : ''}`}
              aria-pressed={dados.ativa === arte.id}
              disabled={ocupado}
              onClick={() => void escolher(arte.id)}
            >
              <img src={urlImagemDaArte(campanhaId, personagemId, arte.id)} alt="" loading="lazy" />
              <span>{arte.nome}</span>
              {dados.ativa === arte.id && <Check className="artes-token-marca" size={14} aria-hidden="true" />}
            </button>
            <button type="button" className="artes-token-apagar" aria-label={`Apagar a arte ${arte.nome}`} disabled={ocupado} onClick={() => void apagar(arte.id, arte.nome)}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      {erro && <p className="artes-token-dica erro" role="alert">{erro}</p>}

      <div className="artes-token-nova">
        <input
          type="text"
          value={nomeNova}
          maxLength={40}
          placeholder="Nome da nova arte (opcional)"
          aria-label="Nome da nova arte"
          disabled={cheio}
          onChange={(e) => setNomeNova(e.target.value)}
        />
        <button type="button" disabled={cheio || ocupado} onClick={() => setAdicionando(true)}>
          <ImagePlus size={14} /> Adicionar arte
        </button>
      </div>
      <p className="artes-token-dica">
        {cheio ? `Você chegou ao limite de ${dados.maximo} artes.` : `${dados.artes.length} de ${dados.maximo} artes extras. Só você e o Mestre veem esta lista; a mesa vê a arte que estiver no token.`}
      </p>

      {adicionando && (
        <ModalPortal manageFocus={false} onClose={() => setAdicionando(false)}>
          <AjustarFotoModal
            nome={nome}
            fotoAtual={null}
            titulo="Nova arte do token"
            salvando={ocupado}
            onCancelar={() => setAdicionando(false)}
            onConfirmar={(imagem) => void guardar(imagem)}
          />
        </ModalPortal>
      )}
    </div>
  );
};
