import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import {
  carregarNotasEditoriaisMestre,
  type NotasEditoriaisMestre,
} from '../../../services/regrasMestreApi';

export function NotasInternasMestre({ campanhaId }: { campanhaId?: string }) {
  const [notas, setNotas] = useState<NotasEditoriaisMestre | null>(null);
  const [carregando, setCarregando] = useState(Boolean(campanhaId));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!campanhaId) {
      setNotas(null);
      setCarregando(false);
      setErro('Selecione uma campanha para consultar as notas internas.');
      return undefined;
    }

    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    void carregarNotasEditoriaisMestre(campanhaId, controller.signal)
      .then((resultado) => {
        setNotas(resultado);
        if (!resultado) setErro('As notas internas ainda não foram carregadas na biblioteca protegida.');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setNotas(null);
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar as notas internas.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [campanhaId]);

  return (
    <section className="mt-12 border-t border-amber-500/20 pt-9" aria-labelledby="notas-internas-mestre-titulo">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-amber-300"><LockKeyhole size={19} /></span>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-500/70">Conteúdo protegido</span>
          <h2 id="notas-internas-mestre-titulo" className="mt-1 text-2xl font-bold text-[#f2ead7]" style={{ fontFamily: 'Cinzel, serif' }}>
            {notas?.titulo || 'Notas editoriais do Mestre'}
          </h2>
        </div>
      </div>

      {carregando ? <p className="text-sm text-gray-500">Carregando notas protegidas…</p> : null}
      {!carregando && erro ? <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{erro}</p> : null}
      {!carregando && notas ? (
        <ul className="space-y-3">
          {notas.itens.map((nota) => (
            <li key={nota} className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-7 text-gray-300">{nota}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
