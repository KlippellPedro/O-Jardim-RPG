import { useEffect, useState } from 'react';
import { Copy, X } from 'lucide-react';
import type { Medidor, ResumoMedidor } from '../medidor';
import type { Interpolador } from '../tempoReal';
import { agoraLocal } from '../tempoReal';
import { avisar } from '../../../components/avisos/avisos';

interface Props {
  medidor: Medidor;
  interpolador: Interpolador;
  onFechar: () => void;
}

const NOMES_CONEXAO: Record<string, string> = {
  ws: 'WebSocket',
  sse: 'Plano B (SSE e POST)',
  offline: 'Reconectando',
  conectando: 'Conectando',
};

const ms = (valor: number | null) => (valor === null ? '—' : `${valor.toLocaleString('pt-BR')} ms`);

function relogio(valor: number | null): string {
  if (valor === null) return '—';
  if (Math.abs(valor) < 500) return 'acertado com o servidor';
  const segundos = (Math.abs(valor) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return valor > 0 ? `${segundos} s atrás do servidor` : `${segundos} s à frente do servidor`;
}

/** Painel do Ctrl+Shift+D: o que o tempo real está fazendo agora, para achar de onde vem um atraso. */
export const MedidorPainel = ({ medidor, interpolador, onFechar }: Props) => {
  const [resumo, setResumo] = useState<ResumoMedidor | null>(null);
  // Quando o navegador não deixa copiar, o resumo aparece num campo para a pessoa selecionar.
  const [paraCopiar, setParaCopiar] = useState<string | null>(null);

  useEffect(() => {
    let quadros = 0;
    let quadro = 0;
    let inicio = performance.now();
    let porSegundo: number | null = null;
    const contar = () => {
      quadros++;
      quadro = requestAnimationFrame(contar);
    };
    quadro = requestAnimationFrame(contar);
    const atualizar = () => {
      const agora = performance.now();
      if (agora - inicio >= 1000) {
        porSegundo = Math.round((quadros * 1000) / (agora - inicio));
        quadros = 0;
        inicio = agora;
      }
      setResumo(medidor.resumo(agoraLocal(), interpolador.atraso, porSegundo, document.visibilityState === 'visible'));
    };
    atualizar();
    const intervalo = window.setInterval(atualizar, 500);
    return () => {
      cancelAnimationFrame(quadro);
      window.clearInterval(intervalo);
    };
  }, [medidor, interpolador]);

  const copiar = async () => {
    if (!resumo) return;
    const texto = JSON.stringify({ ...resumo, quando: new Date().toISOString(), navegador: navigator.userAgent }, null, 2);
    try {
      await navigator.clipboard.writeText(texto);
      setParaCopiar(null);
      avisar.sucesso('Resumo do medidor copiado.');
    } catch {
      setParaCopiar(texto);
      avisar.aviso('O navegador não deixou copiar. O resumo ficou no medidor para você selecionar e copiar.');
    }
  };

  if (!resumo) return null;
  const linhas: Array<[string, string]> = [
    ['Conexão', NOMES_CONEXAO[resumo.conexao] ?? resumo.conexao],
    ['Ida e volta até o servidor', resumo.idaEVolta === null ? '—' : `${ms(resumo.idaEVolta)} (pior ${ms(resumo.idaEVoltaPior)})`],
    ['Relógio deste aparelho', relogio(resumo.relogio)],
    ['Arrasto dos outros, do gesto até a sua tela', ms(resumo.atrasoTotal)],
    ['De quem arrasta até o servidor', ms(resumo.quemMexeAteServidor)],
    ['Do servidor até você', ms(resumo.redeAteVoce)],
    ['Suavização do movimento', ms(resumo.suavizacao)],
    ['Movimentos recebidos', `${resumo.movimentosPorSegundo} por segundo`],
    ['Mudanças prontas do servidor', resumo.mudancasPorMinuto ? `${resumo.mudancasPorMinuto} no último minuto, chegam em ${ms(resumo.mudancaChegaEm)}` : 'nenhuma no último minuto'],
    ['Recarga do mapa inteiro', resumo.ultimaRecarga === null ? 'nenhuma no último minuto' : `${ms(resumo.ultimaRecarga)}, ${resumo.recargasPorMinuto} no último minuto`],
    ['Quadros por segundo', resumo.quadrosPorSegundo === null ? '—' : String(resumo.quadrosPorSegundo)],
    ['Aba', resumo.abaVisivel ? 'na frente' : 'em segundo plano'],
  ];

  return (
    <section className="mapa-medidor" aria-label="Medidor do tempo real">
      <header>
        <strong>Medidor do tempo real</strong>
        <button type="button" className="mapa-icone" aria-label="Copiar o resumo" onClick={() => void copiar()}><Copy size={14} /></button>
        <button type="button" className="mapa-icone" aria-label="Fechar o medidor" onClick={onFechar}><X size={14} /></button>
      </header>
      <dl>
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {paraCopiar && (
        <textarea
          className="mapa-medidor-copia"
          readOnly
          value={paraCopiar}
          aria-label="Resumo do medidor"
          onFocus={(evento) => evento.currentTarget.select()}
        />
      )}
      {resumo.abaEscondidaNoMinuto > 0 && (
        <p className="mapa-dica">A aba foi para o segundo plano {resumo.abaEscondidaNoMinuto}x no último minuto. Nesse tempo o navegador para de desenhar o mapa, e os tokens pulam quando ela volta.</p>
      )}
    </section>
  );
};
