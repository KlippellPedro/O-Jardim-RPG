import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Check, RefreshCw, X } from 'lucide-react';
import { resumoDoLado, trocasApi, type ItemTrocavel, type PropostaTroca } from '../../../services/trocasApi';
import { PropostaTrocaModal } from './PropostaTrocaModal';

interface ITrocasPanelProps {
  personagemId: string;
  meusItens: ItemTrocavel[];
  carteira: Array<{ moeda: string; saldo: number }>;
  /** Salva o que estiver pendente na ficha antes de a troca mexer no inventário. */
  antesDeTrocar: () => Promise<boolean>;
  /** Recarrega inventário e carteira depois que uma troca acontece. */
  onTrocou: () => void;
}

const ROTULO_STATUS: Record<PropostaTroca['status'], string> = {
  aberta: 'esperando',
  aceita: 'feita',
  recusada: 'recusada',
  cancelada: 'cancelada',
};

/** Trocas do personagem: as que chegaram, as que ele mandou e as da última semana. */
export const TrocasPanel = ({ personagemId, meusItens, carteira, antesDeTrocar, onTrocou }: ITrocasPanelProps) => {
  const [propostas, setPropostas] = useState<PropostaTroca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [propondo, setPropondo] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await trocasApi.listar(personagemId);
      setPropostas(resposta.propostas);
    } catch {
      // Sem a lista, o painel só fica vazio; o resto do Inventário segue.
    } finally {
      setCarregando(false);
    }
  }, [personagemId]);

  useEffect(() => {
    void carregar();
    // A outra pessoa pode aceitar enquanto esta aba está aberta: ao voltar
    // para ela, a lista (e o inventário, se algo mudou) se atualiza.
    const aoVoltar = () => { void carregar(); };
    window.addEventListener('focus', aoVoltar);
    return () => window.removeEventListener('focus', aoVoltar);
  }, [carregar]);

  const agir = async (proposta: PropostaTroca, acao: 'aceitar' | 'recusar' | 'cancelar') => {
    if (busy) return;
    if (acao === 'aceitar' && !window.confirm(`Aceitar a troca? Você dá ${resumoDoLado(proposta.pedido)} e recebe ${resumoDoLado(proposta.oferta)}.`)) return;
    setBusy(proposta.id);
    setAviso(null);
    try {
      if (acao === 'aceitar') {
        if (!(await antesDeTrocar())) throw new Error('Não foi possível salvar as alterações pendentes da ficha.');
        await trocasApi.aceitar(proposta.id);
        onTrocou();
        setAviso({ tipo: 'ok', texto: `Troca feita com ${proposta.de.nome}.` });
      } else if (acao === 'recusar') {
        await trocasApi.recusar(proposta.id);
        setAviso({ tipo: 'ok', texto: `Você recusou a proposta de ${proposta.de.nome}.` });
      } else {
        await trocasApi.cancelar(proposta.id);
        setAviso({ tipo: 'ok', texto: 'Proposta cancelada.' });
      }
      await carregar();
    } catch (error) {
      setAviso({ tipo: 'erro', texto: error instanceof Error && error.message ? error.message : 'Não foi possível concluir.' });
      await carregar();
    } finally {
      setBusy(null);
    }
  };

  const abertas = propostas.filter((proposta) => proposta.status === 'aberta');
  const recentes = propostas.filter((proposta) => proposta.status !== 'aberta').slice(0, 5);

  return (
    <section className="rounded-2xl border border-sky-300/10 bg-[#0f0e15] p-4" data-tour="inventario-trocas">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white"><ArrowLeftRight size={15} className="text-sky-300" /> Trocas</h3>
          <p className="mt-0.5 text-xs text-gray-500">Proponha uma troca com outro personagem. Só acontece quando os dois lados concordam.</p>
        </div>
        <button type="button" onClick={() => setPropondo(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-300/20">
          <ArrowLeftRight size={13} /> Propor troca
        </button>
      </div>

      {carregando ? (
        <p className="flex items-center gap-2 text-xs text-gray-500"><RefreshCw size={12} className="animate-spin" /> Carregando…</p>
      ) : abertas.length === 0 && recentes.length === 0 ? (
        <p className="text-xs text-gray-600">Nenhuma troca por enquanto.</p>
      ) : (
        <ul className="space-y-2">
          {abertas.map((proposta) => (
            <li key={proposta.id} className={`rounded-xl border p-3 ${proposta.recebida ? 'border-sky-300/30 bg-sky-300/[0.05]' : 'border-white/[0.07] bg-black/20'}`}>
              <p className="text-xs font-bold text-white">
                {proposta.recebida ? <>{proposta.de.nome} quer trocar com você</> : <>Você propôs a {proposta.para.nome}</>}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-300">
                {proposta.recebida ? (
                  <>Você recebe <strong className="text-emerald-200">{resumoDoLado(proposta.oferta)}</strong> e dá <strong className="text-amber-200">{resumoDoLado(proposta.pedido)}</strong>.</>
                ) : (
                  <>Você dá <strong className="text-amber-200">{resumoDoLado(proposta.oferta)}</strong> e recebe <strong className="text-emerald-200">{resumoDoLado(proposta.pedido)}</strong>.</>
                )}
              </p>
              {proposta.mensagem ? <p className="mt-1 text-xs italic text-gray-500">“{proposta.mensagem}”</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {proposta.recebida ? (
                  <>
                    <button type="button" disabled={!!busy} onClick={() => void agir(proposta, 'aceitar')} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40">
                      {busy === proposta.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Aceitar
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => void agir(proposta, 'recusar')} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white disabled:opacity-40">
                      <X size={12} /> Recusar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="self-center text-[11px] text-gray-500">esperando {proposta.para.nome}</span>
                    <button type="button" disabled={!!busy} onClick={() => void agir(proposta, 'cancelar')} className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-red-300 disabled:opacity-40">
                      <X size={12} /> Cancelar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          {recentes.map((proposta) => (
            <li key={proposta.id} className="flex items-center gap-2 rounded-lg px-1 text-[11px] text-gray-500">
              <span className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider ${proposta.status === 'aceita' ? 'bg-emerald-400/10 text-emerald-300/80' : 'bg-white/[0.04] text-gray-500'}`}>{ROTULO_STATUS[proposta.status]}</span>
              <span className="min-w-0 flex-1 truncate">
                {proposta.de.nome} ↔ {proposta.para.nome}: {resumoDoLado(proposta.oferta)} por {resumoDoLado(proposta.pedido)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {aviso ? <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`mt-2 rounded-lg px-3 py-2 text-xs ${aviso.tipo === 'erro' ? 'bg-red-400/10 text-red-200' : 'bg-sky-300/[0.07] text-sky-100'}`}>{aviso.texto}</p> : null}

      {propondo ? (
        <PropostaTrocaModal
          personagemId={personagemId}
          meusItens={meusItens}
          carteira={carteira}
          onEnviada={(texto) => {
            setPropondo(false);
            setAviso({ tipo: 'ok', texto });
            void carregar();
          }}
          onFechar={() => setPropondo(false)}
        />
      ) : null}
    </section>
  );
};
