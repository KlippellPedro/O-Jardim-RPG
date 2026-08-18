import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import {
  carregarFerramentasMestre,
  type FerramentasMestre as FerramentasMestreDados,
  type SecaoRegraMestre,
} from '../../../services/regrasMestreApi';

function TabelaSecao({ secao }: { secao: SecaoRegraMestre }) {
  if (!secao.colunas?.length || !secao.linhas?.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {secao.colunas.map((coluna) => (
              <th key={coluna} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {secao.linhas.map((linha, idx) => (
            <tr key={idx} className="border-b border-white/5 last:border-0">
              {linha.map((celula, celulaIdx) => (
                <td key={celulaIdx} className="px-4 py-3 text-gray-300">{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaSecao({ secao }: { secao: SecaoRegraMestre }) {
  if (!secao.itens?.length) return null;
  return (
    <ul className="space-y-2.5">
      {secao.itens.map((item) => (
        <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-gray-300">
          {item}
        </li>
      ))}
    </ul>
  );
}

function TextoSecao({ secao }: { secao: SecaoRegraMestre }) {
  if (!secao.paragrafos?.length) return null;
  return (
    <div className="space-y-3">
      {secao.paragrafos.map((paragrafo, idx) => (
        <p key={idx} className="text-sm leading-7 text-gray-300">{paragrafo}</p>
      ))}
    </div>
  );
}

export function FerramentasMestre({ campanhaId }: { campanhaId?: string }) {
  const [dados, setDados] = useState<FerramentasMestreDados | null>(null);
  const [carregando, setCarregando] = useState(Boolean(campanhaId));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!campanhaId) {
      setDados(null);
      setCarregando(false);
      setErro('Selecione uma campanha para consultar as ferramentas do mestre.');
      return undefined;
    }

    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    void carregarFerramentasMestre(campanhaId, controller.signal)
      .then((resultado) => {
        setDados(resultado);
        if (!resultado) setErro('As ferramentas do mestre ainda não foram carregadas na biblioteca protegida.');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDados(null);
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar as ferramentas do mestre.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [campanhaId]);

  return (
    <section className="mt-12 border-t border-amber-500/20 pt-9" aria-labelledby="ferramentas-mestre-titulo">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-amber-300"><ScrollText size={19} /></span>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-500/70">Conteúdo protegido</span>
          <h2 id="ferramentas-mestre-titulo" className="mt-1 text-2xl font-bold text-[#f2ead7]" style={{ fontFamily: 'Cinzel, serif' }}>
            {dados?.titulo || 'Ferramentas do Mestre'}
          </h2>
        </div>
      </div>

      {dados?.resumo ? <p className="mb-6 max-w-[70ch] text-sm leading-6 text-gray-400">{dados.resumo}</p> : null}

      {dados?.destaques?.length ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {dados.destaques.map(([rotulo, valor]) => (
            <span key={rotulo} className="rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-200">
              <strong className="font-bold">{rotulo}:</strong> {valor}
            </span>
          ))}
        </div>
      ) : null}

      {carregando ? <p className="text-sm text-gray-500">Carregando ferramentas protegidas…</p> : null}
      {!carregando && erro ? <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{erro}</p> : null}

      {!carregando && dados ? (
        <div className="space-y-10">
          {dados.secoes.map((secao, idx) => (
            <div key={secao.id || secao.titulo || idx}>
              <h3 className="mb-4 text-lg font-bold text-amber-200/90" style={{ fontFamily: 'Cinzel, serif' }}>
                {secao.titulo}
              </h3>
              {secao.tipo === 'tabela' ? <TabelaSecao secao={secao} /> : null}
              {secao.tipo === 'lista' ? <ListaSecao secao={secao} /> : null}
              {secao.tipo === 'texto' ? <TextoSecao secao={secao} /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default FerramentasMestre;
