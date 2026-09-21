import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Library } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { corDaCampanha, ROTULO_PAPEL } from './campanha';

/** Troca de campanha sem voltar à grade. Só aparece para quem participa de mais de uma. */
export const SeletorDeCampanha = () => {
  const navigate = useNavigate();
  const campanhas = useAuthStore((estado) => estado.campanhas);
  const ativa = useAuthStore((estado) => estado.campanhaAtiva);
  const setCampanhaAtiva = useAuthStore((estado) => estado.setCampanhaAtiva);
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);

  if (!ativa) return null;

  const trocar = async (id: string) => {
    if (id === ativa.id) { setAberto(false); return; }
    setTrocando(true);
    try {
      await setCampanhaAtiva(id);
      setAberto(false);
    } finally {
      setTrocando(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="inline-flex min-h-10 max-w-[16rem] items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-bold text-gray-200 hover:bg-white/5"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corDaCampanha(ativa.identidade) }} aria-hidden="true" />
        <span className="truncate">{ativa.nome}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {aberto ? (
        <ul role="listbox" aria-label="Suas campanhas" className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12] py-1 shadow-2xl">
          {campanhas.map((campanha) => (
            <li key={campanha.id} role="option" aria-selected={campanha.id === ativa.id}>
              <button type="button" disabled={trocando} onClick={() => void trocar(campanha.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 disabled:opacity-50">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corDaCampanha(campanha.identidade) }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{campanha.nome}</span>
                  <span className="text-[11px] text-gray-500">{ROTULO_PAPEL[campanha.papel] ?? campanha.papel}</span>
                </span>
                {campanha.id === ativa.id ? <Check size={14} className="text-emerald-300" aria-label="Campanha atual" /> : null}
              </button>
            </li>
          ))}
          <li className="border-t border-white/10">
            <button type="button" onClick={() => { setAberto(false); navigate('/campanhas'); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Library size={14} /> Ver todas as campanhas</button>
          </li>
        </ul>
      ) : null}
    </div>
  );
};
