import { useState } from 'react';
import { CalendarClock, Minus, Pencil, Plus, Siren, Sparkles, Star, Trash2, Users } from 'lucide-react';
import {
  PROCURA_MAXIMA,
  PROCURA_QUE_O_TEMPO_APAGA,
  limitarFama,
  limitarPrestigio,
  limitarProcura,
  obterFaixaFama,
  obterFaixaPrestigio,
  obterFaixaProcura,
} from '../../../../data/regras/faccoes';
import { DEVOCAO_MAXIMA, TABELA_DEVOCAO } from '../../../../data/regras/devocao';
import {
  normalizarDevocao,
  normalizarProcuras,
  novoIdProcura,
  passarMesQuieto,
  type IDevocaoFicha,
  type IProcuraFicha,
} from '../../../services/reputacaoFichaService';
import { LinkDaRegra } from '../../../components/ui/LinkDaRegra';
import { Select } from '../../../components/ui/Select';
import { FichaModal } from './FichaModal';
import { LabeledInput } from './SharedFichaComponents';
import { EstrelasFama } from './EstrelasFama';
import { excluirDaFichaComDesfazer } from '../desfazerNaFicha';

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

export const FamaPrestigioSection = ({ ficha, onUpdate, personagemId }: { ficha: any; onUpdate: any; personagemId: string }) => {
  const fama = limitarFama(numeroFinito(ficha?.fama));
  const faixaFama = obterFaixaFama(fama);
  const prestigios = normalizarPrestigios(ficha?.prestigios);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(PRESTIGIO_VAZIO);
  const procuras = normalizarProcuras(ficha?.procuras);
  const devocao = normalizarDevocao(ficha?.devocao);
  const divindade = String(ficha?.escolhaRacial?.divindade || '').trim();
  const [novoLugar, setNovoLugar] = useState('');

  const salvarLista = (proximos: IPrestigioFicha[]) => onUpdate(['ficha', 'prestigios'], proximos);
  const salvarProcuras = (proximas: IProcuraFicha[]) => onUpdate(['ficha', 'procuras'], proximas);
  const salvarDevocao = (parcial: Partial<IDevocaoFicha>) => onUpdate(['ficha', 'devocao'], { ...devocao, ...parcial });

  const adicionarLugar = () => {
    const lugar = novoLugar.trim().slice(0, 80);
    if (!lugar) return;
    salvarProcuras([...procuras, { id: novoIdProcura(), lugar, valor: 1 }]);
    setNovoLugar('');
  };
  const mudarProcura = (procura: IProcuraFicha, delta: number) => salvarProcuras(
    procuras.map((item) => (item.id === procura.id ? { ...item, valor: limitarProcura(item.valor + delta) } : item)),
  );
  const removerProcura = (procura: IProcuraFicha) => {
    excluirDaFichaComDesfazer<IProcuraFicha>({
      personagemId,
      lista: (personagem) => normalizarProcuras(personagem.ficha?.procuras),
      id: procura.id,
      gravar: salvarProcuras,
      texto: `Procura em "${procura.lugar}" removida.`,
    });
  };

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
    excluirDaFichaComDesfazer<IPrestigioFicha>({
      personagemId,
      lista: (personagem) => normalizarPrestigios(personagem.ficha?.prestigios),
      id: prestigio.id,
      gravar: salvarLista,
      texto: `Prestígio com "${prestigio.faccao}" removido.`,
    });
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
            <div className="flex items-center gap-2">
              <LinkDaRegra topico="mundo-faccoes" secao="Fama" />
              <span className="rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-1.5 font-mono text-lg font-black text-[#c7a44c]">{fama}</span>
            </div>
          </div>
          <EstrelasFama
            fama={fama}
            titulo={faixaFama.titulo}
            onChange={(nivel) => onUpdate(['ficha', 'fama'], limitarFama(nivel))}
          />
          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <strong className="text-xs text-white">Fama {fama}: {faixaFama.titulo}</strong>
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
            <div className="flex items-center gap-2">
              <LinkDaRegra topico="mundo-faccoes" secao="Prestígio" />
              <button type="button" onClick={abrirNovo} className="rounded-md border border-violet-500/30 bg-violet-500/10 p-1.5 text-violet-300 transition-colors hover:bg-violet-500/20" aria-label="Adicionar Prestígio">
                <Plus size={16} />
              </button>
            </div>
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

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2" data-tour="ficha-procura-devocao">
        <div className="rounded-2xl border border-white/5 bg-[#0f0e15] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                <Siren size={16} className="text-red-300" /> Procura
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">Quanto a lei de cada lugar está atrás de você, de 0 a {PROCURA_MAXIMA}.</p>
            </div>
            <LinkDaRegra topico="mundo-faccoes" secao="Procura" />
          </div>
          <div className="space-y-2">
            {procuras.map((procura) => {
              const faixa = obterFaixaProcura(procura.valor);
              return (
                <div key={procura.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-white">{procura.lugar}</strong>
                      <span className="text-xs text-red-200">{faixa.nivel} · {faixa.titulo}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => mudarProcura(procura, -1)} disabled={procura.valor <= 0} className="p-1.5 text-gray-500 hover:text-emerald-300 disabled:opacity-30" aria-label={`Baixar Procura em ${procura.lugar}`}><Minus size={14} /></button>
                      <button type="button" onClick={() => mudarProcura(procura, 1)} disabled={procura.valor >= PROCURA_MAXIMA} className="p-1.5 text-gray-500 hover:text-red-300 disabled:opacity-30" aria-label={`Subir Procura em ${procura.lugar}`}><Plus size={14} /></button>
                      <button type="button" onClick={() => removerProcura(procura)} className="p-1.5 text-gray-500 hover:text-red-300" aria-label={`Remover Procura em ${procura.lugar}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{faixa.efeito}{faixa.ajusteComALei ? ` Com a lei: ${textoComSinal(faixa.ajusteComALei)}.` : ''}</p>
                </div>
              );
            })}
            {procuras.length === 0 && <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-[10px] uppercase tracking-widest text-gray-600">Ninguém procura você</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={novoLugar}
              maxLength={80}
              onChange={(evento) => setNovoLugar(evento.target.value)}
              onKeyDown={(evento) => { if (evento.key === 'Enter') adicionarLugar(); }}
              placeholder="Lugar: uma cidade, um porto, um reino"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#121118] px-3 py-2 text-xs text-white outline-none focus:border-red-300/40"
              aria-label="Lugar da nova Procura"
            />
            <button type="button" onClick={adicionarLugar} disabled={!novoLugar.trim()} className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 text-xs font-bold text-red-100 disabled:opacity-40">Anotar</button>
          </div>
          {procuras.some((procura) => procura.valor > 0) ? (
            <button
              type="button"
              onClick={() => salvarProcuras(passarMesQuieto(procuras))}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-white"
              title={`Desce 1 onde a Procura é ${PROCURA_QUE_O_TEMPO_APAGA} ou menos`}
            >
              <CalendarClock size={13} /> Passou um mês quieto (o tempo só apaga até {PROCURA_QUE_O_TEMPO_APAGA})
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0f0e15] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                <Sparkles size={16} className="text-amber-200" /> Devoção
              </h2>
              <p className="mt-0.5 truncate text-xs text-gray-500">{divindade ? `Fé em ${divindade}` : 'Escolha a divindade nos dados de identidade.'}</p>
            </div>
            <LinkDaRegra topico="frutos-implantes" secao="Devoção" />
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Devoção">
            {TABELA_DEVOCAO.map((faixa) => (
              <button
                key={faixa.nivel}
                type="button"
                role="radio"
                aria-checked={devocao.nivel === faixa.nivel}
                onClick={() => salvarDevocao({ nivel: faixa.nivel })}
                className={`min-w-0 flex-1 rounded-lg border px-1 py-2 text-center text-[10px] font-bold leading-tight transition-colors ${devocao.nivel === faixa.nivel ? 'border-amber-200/50 bg-amber-200/15 text-amber-100' : 'border-white/10 bg-black/20 text-gray-500 hover:text-white'}`}
              >
                <span className="block font-mono text-base">{faixa.nivel}</span>
                {faixa.titulo}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {TABELA_DEVOCAO.filter((faixa) => faixa.nivel > 0).map((faixa) => (
              <li key={faixa.nivel} className={`text-xs leading-relaxed ${devocao.nivel >= faixa.nivel ? 'text-amber-100/90' : 'text-gray-600'}`}>
                <strong>{faixa.titulo}:</strong> {faixa.efeito}
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">A fé pede</span>
              <input value={devocao.pede} maxLength={240} onChange={(evento) => salvarDevocao({ pede: evento.target.value })} placeholder="Nunca deixar um morto sem nome" className="w-full rounded-lg border border-white/10 bg-[#121118] px-3 py-2 text-xs text-white outline-none focus:border-amber-200/40" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">A fé proíbe</span>
              <input value={devocao.proibe} maxLength={240} onChange={(evento) => salvarDevocao({ proibe: evento.target.value })} placeholder="Mentir diante de um altar" className="w-full rounded-lg border border-white/10 bg-[#121118] px-3 py-2 text-xs text-white outline-none focus:border-amber-200/40" />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-gray-600">Sobe no máximo um degrau por arco, até {DEVOCAO_MAXIMA}. Ter Devoção não garante resposta: quem decide é o Mestre.</p>
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
