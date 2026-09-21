import { useEffect, useState } from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';
import { descobertasApi, type IDescobertasDaCampanha } from '../../services/descobertasApi';

/** As coisas escondidas do site: mostra quem achou cada uma, nunca onde ela está. */
export const AbaDescobertas = ({ campanhaId }: { campanhaId: string }) => {
  const [dados, setDados] = useState<IDescobertasDaCampanha | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    descobertasApi.daCampanha(campanhaId)
      .then((resposta) => { if (ativo) setDados(resposta); })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir as descobertas.'); });
    return () => { ativo = false; };
  }, [campanhaId]);

  if (erro) return <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</p>;
  if (!dados) return <p className="py-10 text-center text-sm text-gray-500" aria-busy="true">Procurando...</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-gray-400">
        O Jardim guarda coisas escondidas. Aqui aparece quem já achou cada uma, mas não onde estão. Você achou <strong className="text-[#f3dc8f]">{dados.achadas_por_mim}</strong> de {dados.total}.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dados.itens.map((item) => {
          const conhecida = item.nome !== '???';
          return (
            <li key={item.chave} className={`rounded-2xl border p-4 ${item.achei ? 'border-violet-400/40 bg-violet-400/10' : 'border-white/10 bg-[#0f0e15]'}`}>
              <div className="flex items-start gap-3">
                {item.achei ? <Sparkles size={18} className="mt-0.5 shrink-0 text-violet-300" aria-hidden="true" /> : <HelpCircle size={18} className="mt-0.5 shrink-0 text-gray-600" aria-hidden="true" />}
                <div className="min-w-0">
                  <h3 className={`text-sm font-bold ${conhecida ? 'text-white' : 'text-gray-500'}`}>{item.nome}</h3>
                  {item.raridade === 'rara' ? <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Rara</span> : null}
                </div>
              </div>
              {item.dica ? <p className="mt-2 text-xs italic leading-5 text-gray-500">{item.dica}</p> : null}
              <p className="mt-2 text-xs leading-5 text-gray-400">
                {item.descobridores.length ? <>Achada por {item.descobridores.join(', ')}</> : 'Ninguém achou ainda.'}
              </p>
            </li>
          );
        })}
      </ul>

      {dados.ranking.length ? (
        <section aria-label="Quem mais achou" className="rounded-2xl border border-white/10 bg-[#0f0e15] p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Quem mais achou</h3>
          <ol className="space-y-1.5">
            {dados.ranking.map((linha, indice) => (
              <li key={linha.nome} className="flex items-center justify-between text-sm text-gray-200">
                <span>{indice + 1}. {linha.nome}</span>
                <span className="font-bold text-[#f3dc8f]">{linha.total}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
};
