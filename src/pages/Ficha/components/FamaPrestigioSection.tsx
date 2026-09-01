import { useState } from 'react';
import { Pencil, Plus, Star, Trash2, Users } from 'lucide-react';
import {
  limitarFama,
  limitarPrestigio,
  obterFaixaFama,
  obterFaixaPrestigio,
} from '../../../../data/regras/faccoes';
import { Select } from '../../../components/ui/Select';
import { FichaModal } from './FichaModal';
import { LabeledInput } from './SharedFichaComponents';

interface IPrestigioFicha {
  id: string;
  faccao: string;
  valor: number;
  notas: string;
}

const PRESTIGIO_VAZIO: Omit<IPrestigioFicha, 'id'> = {
  faccao: '',
  valor: 0,
  notas: '',
};

const novoId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `prestigio-${crypto.randomUUID()}`
    : `prestigio-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const numeroFinito = (valor: unknown, padrao = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
};

const textoSeguro = (valor: unknown) => (
  typeof valor === 'string' ? valor : valor == null ? '' : String(valor)
);

const normalizarPrestigios = (valor: unknown): IPrestigioFicha[] => {
  if (!Array.isArray(valor)) return [];
  const idsUsados = new Set<string>();
  return valor.map((item, index) => {
    const dados = item && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};
    const idBase = textoSeguro(dados.id).trim() || `prestigio-legado-${index}`;
    const id = idsUsados.has(idBase) ? `${idBase}-${index}` : idBase;
    idsUsados.add(id);
    return {
      id,
      faccao: textoSeguro(dados.faccao),
      valor: limitarPrestigio(numeroFinito(dados.valor)),
      notas: textoSeguro(dados.notas),
    };
  });
};

const textoComSinal = (valor: number) => valor > 0 ? `+${valor}` : String(valor);

export const FamaPrestigioSection = ({ ficha, onUpdate }: { ficha: any; onUpdate: any }) => {
  const fama = limitarFama(numeroFinito(ficha?.fama));
  const faixaFama = obterFaixaFama(fama);
  const prestigios = normalizarPrestigios(ficha?.prestigios);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(PRESTIGIO_VAZIO);

  const salvarLista = (proximos: IPrestigioFicha[]) => onUpdate(['ficha', 'prestigios'], proximos);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(PRESTIGIO_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (prestigio: IPrestigioFicha) => {
    const { id, ...dados } = prestigio;
    setEditandoId(id);
    setForm({ ...PRESTIGIO_VAZIO, ...dados, valor: limitarPrestigio(numeroFinito(dados.valor)) });
    setModalAberto(true);
  };

  const salvar = () => {
    const faccao = form.faccao.trim();
    if (!faccao) return;
    const registro: IPrestigioFicha = {
      id: editandoId || novoId(),
      faccao,
      valor: limitarPrestigio(numeroFinito(form.valor)),
      notas: form.notas.trim(),
    };
    salvarLista(editandoId
      ? prestigios.map((item) => item.id === editandoId ? registro : item)
      : [...prestigios, registro]);
    setModalAberto(false);
  };

  const remover = (prestigio: IPrestigioFicha) => {
    if (window.confirm(`Remover o Prestígio com "${prestigio.faccao}"?`)) {
      salvarLista(prestigios.filter((item) => item.id !== prestigio.id));
    }
  };

  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-tour="ficha-reputacao">
        <div className="rounded-2xl border border-white/5 bg-[#0f0e15] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                <Star size={16} className="text-[#c7a44c]" /> Fama
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">Visibilidade pública geral, de 0 a 5.</p>
            </div>
            <span className="rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-1.5 font-mono text-lg font-black text-[#c7a44c]">{fama}</span>
          </div>
          <div className="mb-3 grid grid-cols-6 gap-1.5" aria-label="Nível de Fama">
            {[0, 1, 2, 3, 4, 5].map((nivel) => (
              <button
                key={nivel}
                type="button"
                aria-pressed={fama === nivel}
                onClick={() => onUpdate(['ficha', 'fama'], nivel)}
                className={`rounded-md border py-1.5 font-mono text-xs font-bold transition-colors ${fama === nivel ? 'border-[#c7a44c] bg-[#c7a44c]/20 text-[#c7a44c]' : 'border-white/10 bg-black/20 text-gray-500 hover:border-white/25 hover:text-white'}`}
              >
                {nivel}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <strong className="text-xs text-white">{faixaFama.titulo}</strong>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{faixaFama.alcance}</p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">Anonimato: {textoComSinal(faixaFama.ajusteAnonimato)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0f0e15] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                <Users size={16} className="text-violet-400" /> Prestígio
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">Relação separada com cada facção, de −3 a +3.</p>
            </div>
            <button type="button" onClick={abrirNovo} className="rounded-md border border-violet-500/30 bg-violet-500/10 p-1.5 text-violet-300 transition-colors hover:bg-violet-500/20" aria-label="Adicionar Prestígio">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {prestigios.map((prestigio) => {
              const faixa = obterFaixaPrestigio(numeroFinito(prestigio.valor));
              return (
                <div key={prestigio.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-white">{prestigio.faccao}</strong>
                      <span className="text-xs text-violet-300">{textoComSinal(faixa.nivel)} · {faixa.titulo}</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => abrirEdicao(prestigio)} className="p-1.5 text-gray-500 hover:text-blue-300" aria-label={`Editar Prestígio de ${prestigio.faccao}`}><Pencil size={14} /></button>
                      <button type="button" onClick={() => remover(prestigio)} className="p-1.5 text-gray-500 hover:text-red-300" aria-label={`Remover Prestígio de ${prestigio.faccao}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Acesso: {faixa.acesso} · Social: {textoComSinal(faixa.ajusteTesteSocial)} · Desconto: {faixa.descontoPercentual}%</p>
                  {prestigio.notas && <p className="mt-2 text-xs italic text-gray-600">{prestigio.notas}</p>}
                </div>
              );
            })}
            {prestigios.length === 0 && <p className="rounded-lg border border-dashed border-white/10 py-5 text-center text-[10px] uppercase tracking-widest text-gray-600">Nenhuma facção registrada</p>}
          </div>
        </div>
      </section>

      <FichaModal isOpen={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar Prestígio' : 'Novo Prestígio'}>
        <div className="space-y-4">
          <LabeledInput label="Facção" value={form.faccao} placeholder="Ex.: Guilda dos Caçadores" onChange={(valor: string) => setForm((atual) => ({ ...atual, faccao: valor }))} />
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Prestígio (−3 a +3)</label>
            <Select value={String(form.valor)} onChange={(valor) => setForm((atual) => ({ ...atual, valor: limitarPrestigio(Number(valor)) }))} options={[-3, -2, -1, 0, 1, 2, 3].map((valor) => ({ value: String(valor), label: textoComSinal(valor) }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Notas</label>
            <textarea value={form.notas} onChange={(event) => setForm((atual) => ({ ...atual, notas: event.target.value }))} rows={3} className="resize-none rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-[#c7a44c]/50" />
          </div>
          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button type="button" onClick={() => setModalAberto(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={salvar} disabled={!form.faccao.trim()} className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-bold text-violet-300 disabled:opacity-40">Salvar</button>
          </div>
        </div>
      </FichaModal>
    </>
  );
};
