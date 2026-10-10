import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Swords } from 'lucide-react';
import { sfx } from '../utils/audioSynth';
import { textoDeInicio } from '../services/situacaoDaMesa';
import { recordarUltimaFicha } from '../services/ultimaFicha';
import { useAuthStore } from '../store/useAuthStore';
import { useSituacaoDaMesaStore } from '../store/useSituacaoDaMesaStore';
import '../components/sessao/situacaoDaMesa.css';

/** O "Continuar" da Home: a mesa ao vivo (ou, para o Mestre, a que está em preparação) e a última ficha aberta. */
export function ContinuarDeOndeParou() {
  const navigate = useNavigate();
  const usuarioId = useAuthStore((estado) => estado.usuario?.id ?? null);
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id ?? null);
  const mesaDaCampanha = useSituacaoDaMesaStore((estado) => estado.campanhaId);
  const situacao = useSituacaoDaMesaStore((estado) => estado.situacao);
  const titulo = useSituacaoDaMesaStore((estado) => estado.titulo);
  const iniciadaEm = useSituacaoDaMesaStore((estado) => estado.iniciadaEm);
  const [agora, setAgora] = useState(() => Date.now());

  // "Começou há 12 min" acompanha o relógio sem pedir nada ao servidor.
  useEffect(() => {
    if (situacao !== 'aberta') return undefined;
    const timer = window.setInterval(() => setAgora(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [situacao]);

  const ficha = usuarioId && campanhaId ? recordarUltimaFicha(usuarioId, campanhaId) : null;
  const mesa = campanhaId && mesaDaCampanha === campanhaId && situacao !== 'nenhuma' ? situacao : null;
  if (!mesa && !ficha) return null;

  const ir = (caminho: string) => {
    sfx.play('click');
    navigate(caminho);
  };

  return (
    <section className="continuar" aria-label="Continuar de onde você parou">
      {mesa ? (
        <button
          type="button"
          className={`continuar__cartao continuar__cartao--${mesa}`}
          onClick={() => ir('/sessao')}
          aria-label={mesa === 'aberta' ? 'Entrar na sessão ao vivo' : 'Continuar a preparar a sessão'}
        >
          <span className="continuar__icone"><Swords size={20} /></span>
          <span className="continuar__texto">
            <span className="continuar__selo">
              <span className="continuar__ponto" aria-hidden="true" />
              {mesa === 'aberta' ? 'Ao vivo agora' : 'Em preparação'}
            </span>
            <span className="continuar__titulo block">{titulo || 'Sessão sem título'}</span>
            <span className="continuar__detalhe block">
              {mesa === 'aberta' ? (textoDeInicio(iniciadaEm, agora) || 'A mesa está aberta') : 'Só você vê esta mesa até liberá-la'}
            </span>
          </span>
          <ArrowRight size={18} className="continuar__seta" aria-hidden="true" />
        </button>
      ) : null}

      {ficha ? (
        <button
          type="button"
          className="continuar__cartao"
          onClick={() => ir(`/ficha/${ficha.id}`)}
          aria-label={`Voltar para a ficha de ${ficha.nome}`}
        >
          <span className="continuar__icone"><Shield size={20} /></span>
          <span className="continuar__texto">
            <span className="continuar__selo">Continuar</span>
            <span className="continuar__titulo block">{ficha.nome}</span>
            <span className="continuar__detalhe block">Voltar para a última ficha aberta</span>
          </span>
          <ArrowRight size={18} className="continuar__seta" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
