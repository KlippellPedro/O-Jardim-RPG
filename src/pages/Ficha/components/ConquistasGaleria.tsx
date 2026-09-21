import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { conquistasApi, type IConquista, type IConquistasResposta } from '../../../services/conquistasApi';
import { dispararConquistas } from '../../../components/conquistas/conquistas';
import { SeloConquista } from '../../../components/conquistas/SeloConquista';

const ORDEM_RARIDADE = { lendaria: 0, rara: 1, comum: 2 } as const;

/** Galeria de selos do personagem: os desbloqueados brilham, os outros ficam
 * em silhueta com uma barra mostrando quanto falta. */
export const ConquistasGaleria = ({ personagemId }: { personagemId: string }) => {
  const [dados, setDados] = useState<IConquistasResposta | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setErro('');
    conquistasApi.listar(personagemId)
      .then((resposta) => {
        if (!ativo) return;
        setDados(resposta);
        dispararConquistas(resposta.catalogo.filter((item) => resposta.novas.includes(item.chave)), personagemId);
      })
      .catch(() => { if (ativo) setErro('Não foi possível carregar as conquistas agora.'); });
    return () => { ativo = false; };
  }, [personagemId]);

  const ordenadas = useMemo(() => {
    const lista = dados?.catalogo ?? [];
    // Desbloqueadas primeiro (raras antes), depois as mais próximas de sair.
    return [...lista].sort((a: IConquista, b: IConquista) => {
      if (a.desbloqueada !== b.desbloqueada) return a.desbloqueada ? -1 : 1;
      if (a.desbloqueada) return ORDEM_RARIDADE[a.raridade] - ORDEM_RARIDADE[b.raridade];
      return (b.progresso.atual / b.progresso.minimo) - (a.progresso.atual / a.progresso.minimo);
    });
  }, [dados]);

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#c7a44c]">
          <Award size={16} /> Conquistas
        </h3>
        {dados ? (
          <span className="rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 px-3 py-1 font-mono text-xs font-bold text-[#e3c363]">
            {dados.desbloqueadas}/{dados.total}
          </span>
        ) : null}
      </div>

      {erro ? <p className="text-xs text-amber-300">{erro}</p> : null}
      {!dados && !erro ? <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={13} className="animate-spin" /> Carregando selos...</p> : null}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {ordenadas.map((conquista) => {
          const pct = Math.min(100, Math.round((conquista.progresso.atual / conquista.progresso.minimo) * 100));
          return (
            <article
              key={conquista.chave}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                conquista.desbloqueada
                  ? 'border-white/10 bg-white/[0.035]'
                  : 'border-white/[0.04] bg-black/20'
              }`}
              title={conquista.desbloqueada ? undefined : `Progresso: ${conquista.progresso.atual}/${conquista.progresso.minimo}`}
            >
              <SeloConquista raridade={conquista.raridade} icone={conquista.icone} tamanho={52} bloqueada={!conquista.desbloqueada} />
              <div className="min-w-0 flex-1">
                <strong className={`block truncate text-sm ${conquista.desbloqueada ? 'text-white' : 'text-gray-500'}`}>{conquista.nome}</strong>
                <p className="text-[11px] leading-snug text-gray-500">{conquista.descricao}</p>
                {!conquista.desbloqueada ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <span className="block h-full rounded-full bg-[#c7a44c]/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-gray-600">{conquista.progresso.atual}/{conquista.progresso.minimo}</span>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
