import { useEffect, useState } from 'react';
import { FichaModal } from './FichaModal';
import type { IPersonalizacaoAutomatica } from '../../../services/personalizacaoAutomaticaService';

interface PersonalizacaoAutomaticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tituloOriginal: string;
  textoOriginal: string;
  personalizacao?: IPersonalizacaoAutomatica;
  onSalvar: (valores: IPersonalizacaoAutomatica) => void;
  onRestaurar: () => void;
}

export const PersonalizacaoAutomaticaModal = ({
  isOpen,
  onClose,
  tituloOriginal,
  textoOriginal,
  personalizacao,
  onSalvar,
  onRestaurar,
}: PersonalizacaoAutomaticaModalProps) => {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitulo(personalizacao?.titulo || tituloOriginal);
    setTexto(personalizacao?.texto || textoOriginal);
  }, [isOpen, personalizacao, tituloOriginal, textoOriginal]);

  const foiPersonalizado = Boolean(personalizacao?.titulo || personalizacao?.texto);

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title="Personalizar texto" size="lg" nested>
      <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-gray-500">
          Esse item vem automaticamente da raça, classe ou Fruto do Éden. Ajuste o nome e a descrição só
          para esta ficha: o conteúdo oficial do catálogo não muda.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nome</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={onRestaurar}
            disabled={!foiPersonalizado}
            className="text-xs font-bold text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
          >
            Restaurar texto original
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:text-white hover:border-white/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSalvar({ titulo, texto })}
              className="px-6 py-2.5 rounded-xl bg-[#c7a44c] text-black text-sm font-bold hover:bg-[#d4af37] transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </FichaModal>
  );
};
