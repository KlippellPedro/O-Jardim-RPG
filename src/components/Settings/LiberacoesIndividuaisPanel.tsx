import { useEffect, useState } from 'react';
import { Loader2, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Select } from '../ui/Select';
import {
  conhecimentoApi,
  type ConhecimentoAdministravel,
  type DestinatarioTipo,
  type NivelAcesso,
} from '../../services/conhecimentoApi';

interface Membro {
  id: string;
  nome_exibicao: string;
  papel: string;
}

interface Personagem {
  id: string;
  nome: string;
}

interface LiberacoesIndividuaisPanelProps {
  campanhaId: string;
  membros: Membro[];
  personagens: Personagem[];
}

const ROTULOS_PAPEL: Record<string, string> = {
  mestre: 'Mestre',
  assistente: 'Assistente',
  jogador: 'Jogador',
  observador: 'Observador',
};

const NIVEIS: Array<{ value: Exclude<NivelAcesso, 'oculto'>; label: string }> = [
  { value: 'rumor', label: 'Rumor' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'completo', label: 'Completo' },
];

function NovaLiberacaoForm({
  membros,
  personagens,
  submitting,
  onSubmit,
  onCancel,
}: {
  membros: Membro[];
  personagens: Personagem[];
  submitting: boolean;
  onSubmit: (destinatarioTipo: DestinatarioTipo, destinatarioId: string, acesso: Exclude<NivelAcesso, 'oculto'>) => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<DestinatarioTipo>('usuario');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [acesso, setAcesso] = useState<Exclude<NivelAcesso, 'oculto'>>('completo');

  const opcoesDestinatario = tipo === 'usuario'
    ? membros.map((membro) => ({ value: membro.id, label: `${membro.nome_exibicao} (${ROTULOS_PAPEL[membro.papel] || membro.papel})` }))
    : tipo === 'personagem'
      ? personagens.map((personagem) => ({ value: personagem.id, label: personagem.nome }))
      : Object.entries(ROTULOS_PAPEL).map(([value, label]) => ({ value, label }));

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center">
      <Select
        value={tipo}
        onChange={(value) => { setTipo(value as DestinatarioTipo); setDestinatarioId(''); }}
        options={[
          { value: 'usuario', label: 'Jogador' },
          { value: 'personagem', label: 'Personagem' },
          { value: 'papel', label: 'Papel na campanha' },
        ]}
        className="w-full sm:w-40"
      />
      <Select
        value={destinatarioId}
        onChange={setDestinatarioId}
        options={opcoesDestinatario}
        placeholder="Selecione..."
        className="w-full sm:flex-1"
      />
      <Select
        value={acesso}
        onChange={(value) => setAcesso(value as Exclude<NivelAcesso, 'oculto'>)}
        options={NIVEIS}
        className="w-full sm:w-36"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!destinatarioId || submitting}
          onClick={() => onSubmit(tipo, destinatarioId, acesso)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Liberar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Painel do Criador: liberação fina de uma informação já publicada (lore,
 * regras, itens da loja) pra um jogador, personagem ou papel específico.
 * Expõe o backend de `routers/knowledge.py`, que já existia mas nunca teve
 * UI - a liberação por raça/classe (aba Visibilidade) é um mecanismo
 * separado, com granularidade diferente (disponibilidade vs. revelação de
 * lore), então as duas telas ficam lado a lado em vez de se fundir. */
export function LiberacoesIndividuaisPanel({ campanhaId, membros, personagens }: LiberacoesIndividuaisPanelProps) {
  const [dados, setDados] = useState<ConhecimentoAdministravel | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formAbertoId, setFormAbertoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(null);
    conhecimentoApi.listarAdministravel(campanhaId)
      .then((resposta) => { if (!cancelado) setDados(resposta); })
      .catch((error: any) => { if (!cancelado) setErro(error?.message || 'Não foi possível carregar as informações.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [campanhaId]);

  const rotularDestinatario = (tipo: DestinatarioTipo, id: string) => {
    if (tipo === 'papel') return ROTULOS_PAPEL[id] || id;
    if (tipo === 'usuario') return membros.find((membro) => membro.id === id)?.nome_exibicao || 'Jogador removido';
    return personagens.find((personagem) => personagem.id === id)?.nome || 'Personagem removido';
  };

  const criarLiberacao = async (
    informacaoId: string,
    destinatarioTipo: DestinatarioTipo,
    destinatarioId: string,
    acesso: Exclude<NivelAcesso, 'oculto'>,
  ) => {
    setEnviando(true);
    try {
      const liberacao = await conhecimentoApi.liberar(informacaoId, { destinatario_tipo: destinatarioTipo, destinatario_id: destinatarioId, acesso });
      setDados((atual) => atual && {
        ...atual,
        liberacoes: [
          liberacao,
          ...atual.liberacoes.filter((item) => !(
            item.informacao_id === informacaoId
            && item.destinatario_tipo === destinatarioTipo
            && item.destinatario_id === destinatarioId
          )),
        ],
      });
      setFormAbertoId(null);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível liberar esta informação.');
    } finally {
      setEnviando(false);
    }
  };

  const revogarLiberacao = async (liberacao: ConhecimentoAdministravel['liberacoes'][number]) => {
    try {
      await conhecimentoApi.revogar(liberacao.informacao_id, liberacao.destinatario_tipo, liberacao.destinatario_id);
      setDados((atual) => atual && { ...atual, liberacoes: atual.liberacoes.filter((item) => item.id !== liberacao.id) });
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível revogar esta liberação.');
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-10 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Carregando informações da campanha...</div>;
  }

  if (!dados || dados.informacoes.length === 0) {
    return <p className="py-10 text-center text-sm italic text-gray-600">Nenhuma informação publicada nesta campanha ainda. Publique conteúdo na aba Conteúdo para liberar aqui.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Libere uma informação já publicada (lore, regra ou item) pra um jogador, personagem ou papel específico -
        útil pra revelar um segredo antes da hora combinada pra mesa inteira. O nível de acesso liberado aqui vence o
        padrão da campanha, mas nunca reduz o que já é público.
      </p>
      {erro && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{erro}</div>}

      <div className="flex flex-col gap-2">
        {dados.informacoes.map((informacao) => {
          const liberacoes = dados.liberacoes.filter((item) => item.informacao_id === informacao.id);
          return (
            <div key={informacao.id} className="rounded-2xl border border-white/5 bg-black/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{informacao.tipo}</span>
                  <h4 className="truncate text-sm font-bold text-white">{informacao.titulo}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Padrão: {informacao.acesso_padrao}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormAbertoId(formAbertoId === informacao.id ? null : informacao.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20"
                  >
                    <Plus size={12} /> Liberar
                  </button>
                </div>
              </div>

              {liberacoes.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3">
                  {liberacoes.map((liberacao) => (
                    <div key={liberacao.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-gray-300">
                        <UserRound size={13} className="shrink-0 text-gray-500" />
                        <span className="truncate">{rotularDestinatario(liberacao.destinatario_tipo, liberacao.destinatario_id)}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                          <ShieldCheck size={10} /> {liberacao.acesso}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void revogarLiberacao(liberacao)}
                        aria-label="Revogar liberação"
                        className="shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formAbertoId === informacao.id && (
                <NovaLiberacaoForm
                  membros={membros}
                  personagens={personagens}
                  submitting={enviando}
                  onCancel={() => setFormAbertoId(null)}
                  onSubmit={(tipo, destinatarioId, acesso) => void criarLiberacao(informacao.id, tipo, destinatarioId, acesso)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
