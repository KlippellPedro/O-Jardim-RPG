import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useMesaStore } from '../../../store/useMesaStore';
import { sfx } from '../../../utils/audioSynth';
import type { IEstadoMesa } from '../../../services/mesaApi';
import { cronometrosQueZeraram } from './cronometros';
import { detectarNovidades, type AbaMesa, type IAvisoMesa } from './avisos';

interface IMesaAvisosProps {
  onAbrir: (aba: AbaMesa) => void;
}

/** Avisos em cima da tela quando algo acontece na mesa: bilhete novo, votação
 * aberta, relógio completo. Não fica na frente do que a
 * pessoa está fazendo: some sozinho em poucos segundos. */
export const MesaAvisos = ({ onAbrir }: IMesaAvisosProps) => {
  const dados = useMesaStore((estado) => estado.dados);
  const anterior = useRef<IEstadoMesa | null>(null);
  const [avisos, setAvisos] = useState<IAvisoMesa[]>([]);

  useEffect(() => {
    if (!dados || !dados.estado) {
      anterior.current = null;
      return;
    }
    const novos = detectarNovidades(anterior.current, dados.estado, dados.gestor);
    anterior.current = dados.estado;
    if (!novos.length) return;
    if (novos.some((aviso) => aviso.gongo)) sfx.play('gongo');
    else sfx.play('notification');
    setAvisos((atuais) => [...atuais, ...novos.filter((novo) => !atuais.some((aviso) => aviso.chave === novo.chave))].slice(-4));
    novos.forEach((novo) => {
      window.setTimeout(() => setAvisos((atuais) => atuais.filter((aviso) => aviso.chave !== novo.chave)), 7000);
    });
  }, [dados]);

  // Cronômetro que chega a zero: cada tela percebe sozinha, sem depender do servidor.
  useEffect(() => {
    const jaAvisados = new Set<string>();
    const timer = window.setInterval(() => {
      const { dados: atual, recebidoEm } = useMesaStore.getState();
      const zerados = cronometrosQueZeraram(atual?.estado?.cronometros ?? [], recebidoEm, Date.now(), jaAvisados);
      if (!zerados.length) return;
      sfx.play('gongo');
      const novos: IAvisoMesa[] = zerados.map((cronometro) => ({
        chave: `cronometro:${cronometro.id}:${recebidoEm}`,
        texto: `Acabou o tempo: ${cronometro.titulo}!`,
        aba: 'relogios',
      }));
      setAvisos((atuais) => [...atuais, ...novos].slice(-4));
      novos.forEach((novo) => window.setTimeout(() => setAvisos((atuais) => atuais.filter((aviso) => aviso.chave !== novo.chave)), 7000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!avisos.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[75] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {avisos.map((aviso) => (
        <div key={aviso.chave} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#c7a44c]/35 bg-[#15120b]/95 p-3 text-sm text-[#f3ead7] shadow-2xl backdrop-blur-xl">
          <Bell size={16} className="mt-0.5 shrink-0 text-[#c7a44c]" aria-hidden="true" />
          <button type="button" className="flex-1 text-left" onClick={() => { onAbrir(aviso.aba); setAvisos((atuais) => atuais.filter((item) => item.chave !== aviso.chave)); }}>
            {aviso.texto}
            <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-widest text-[#c7a44c]">Abrir</span>
          </button>
          <button type="button" aria-label="Dispensar aviso" onClick={() => setAvisos((atuais) => atuais.filter((item) => item.chave !== aviso.chave))} className="text-white/40 hover:text-white"><X size={15} /></button>
        </div>
      ))}
    </div>
  );
};
