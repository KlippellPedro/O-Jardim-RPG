import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsPanelStore } from '../../store/useSettingsPanelStore';
import { CaixaDeAvisos } from '../caixaDeAvisos/CaixaDeAvisos';
import { atalhosComRecado } from './menuDaEngrenagem';

/**
 * A caixa geral: o que é da pessoa (cofre, troca, XP, sessão). O que é de quem comanda a mesa mora no Painel do
 * Mestre, e o da administração na Administração; quando há recado novo lá, um atalho aparece aqui em cima.
 */
export const AvisosPanel: React.FC = () => {
  const navigate = useNavigate();
  const usuario = useAuthStore((estado) => estado.usuario);
  const campanhaAtiva = useAuthStore((estado) => estado.campanhaAtiva);
  const avisos = useAuthStore((estado) => estado.avisos);
  const fecharPainel = useSettingsPanelStore((estado) => estado.closePanel);

  const atalhos = usuario ? atalhosComRecado({ usuario, campanhaAtiva, avisos }) : [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
        {atalhos.length > 0 && (
          <nav aria-label="Avisos em outros painéis" className="space-y-2">
            {atalhos.map((atalho) => (
              <button
                key={atalho.id}
                type="button"
                onClick={() => { fecharPainel(); navigate(atalho.caminho); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.07] px-4 py-3 text-left transition-colors hover:bg-red-500/[0.12]"
              >
                <span className="min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">{atalho.quantidade}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{atalho.rotulo}</span>
                  <span className="block text-xs text-gray-400">
                    {atalho.quantidade === 1 ? 'aviso novo' : 'avisos novos'} {atalho.id === 'mestre' ? 'da mesa' : 'da administração'}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-gray-500" />
              </button>
            ))}
          </nav>
        )}

        <CaixaDeAvisos painel="geral" aoNavegar={fecharPainel} />
      </div>
    </div>
  );
};
