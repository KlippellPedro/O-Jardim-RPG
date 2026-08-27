import { useMemo } from 'react';
import { Users, Shield, Coins, Sparkles, Loader2 } from 'lucide-react';
import { PersonagemApiRecord } from '../../services/personagensApi';
import { RACAS_CATALOGO, CLASSES_CATALOGO } from '../../services/catalogoService';
import { getCurrencySymbol, getCurrencyTheme, MoedaTipo } from '../../services/lojaCatalogService';

interface EstatisticasCampanhaProps {
  personagens: PersonagemApiRecord[];
  loading: boolean;
}

const MOEDAS_ORDEM: MoedaTipo[] = ['Lunaris', 'Solares', 'Fragmentos de Estrela', 'Créditos Sombrios'];

function BarraContagem({ titulo, total, maximo }: { titulo: string; total: number; maximo: number }) {
  const largura = maximo > 0 ? Math.max(4, Math.round((total / maximo) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-sm text-gray-300" title={titulo}>{titulo}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${largura}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-bold text-white">{total}</span>
    </div>
  );
}

export const EstatisticasCampanha: React.FC<EstatisticasCampanhaProps> = ({ personagens, loading }) => {
  const totalJogadores = useMemo(
    () => new Set(personagens.map((p) => p.dono_usuario_id).filter(Boolean)).size,
    [personagens],
  );

  const moedasPorTipo = useMemo(() => {
    const mapa: Record<string, number> = {};
    personagens.forEach((p) => (p.carteira || []).forEach((c) => {
      mapa[c.moeda] = (mapa[c.moeda] || 0) + c.saldo;
    }));
    return mapa;
  }, [personagens]);
  const totalMoedas = Object.values(moedasPorTipo).reduce((acc, valor) => acc + valor, 0);

  const racasContagem = useMemo(() => {
    const mapa: Record<string, number> = {};
    personagens.forEach((p) => {
      const racaId = (p.ficha as any)?.racaId;
      if (!racaId) return;
      mapa[racaId] = (mapa[racaId] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([id, total]) => ({ id, total, titulo: (RACAS_CATALOGO as any[]).find((r) => r.id === id)?.titulo || id }))
      .sort((a, b) => b.total - a.total);
  }, [personagens]);

  const classesContagem = useMemo(() => {
    const mapa: Record<string, number> = {};
    personagens.forEach((p) => {
      const classes = Array.isArray((p.ficha as any)?.classes) ? (p.ficha as any).classes : [];
      classes.forEach((c: any) => {
        const id = c?.classeId;
        if (!id) return;
        mapa[id] = (mapa[id] || 0) + 1;
      });
    });
    return Object.entries(mapa)
      .map(([id, total]) => ({ id, total, titulo: (CLASSES_CATALOGO as any[]).find((c) => c.id === id)?.titulo || id }))
      .sort((a, b) => b.total - a.total);
  }, [personagens]);

  const maiorContagemRaca = racasContagem[0]?.total || 0;
  const maiorContagemClasse = classesContagem[0]?.total || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-primary">
        <Loader2 size={28} className="animate-spin" /> Carregando estatísticas...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* RESUMO */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 sm:gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Total de Personagens</p>
            <p className="text-3xl font-bold text-white mt-1">{personagens.length}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Jogadores</p>
            <p className="text-3xl font-bold text-white mt-1">{totalJogadores}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Moedas em Circulação</p>
            <p className="text-3xl font-bold text-white mt-1">{totalMoedas}</p>
          </div>
        </div>
      </div>

      {/* MOEDAS POR TIPO */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="text-yellow-400" size={20} />
          <h3 className="text-lg font-bold text-white">Moedas por Tipo</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {MOEDAS_ORDEM.map((moeda) => {
            const tema = getCurrencyTheme(moeda);
            const valor = moedasPorTipo[moeda] || 0;
            return (
              <div key={moeda} className={`rounded-2xl border ${tema.borda} ${tema.fundo} p-4`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${tema.texto}`}>{getCurrencySymbol(moeda)} · {moeda}</p>
                <p className="text-2xl font-bold text-white mt-1">{valor}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* RAÇAS ESCOLHIDAS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-emerald-400" size={20} />
          <h3 className="text-lg font-bold text-white">Raças Escolhidas</h3>
        </div>
        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 space-y-3">
          {racasContagem.length === 0 ? (
            <p className="text-xs text-gray-600 italic">Nenhum personagem com raça registrada ainda.</p>
          ) : racasContagem.map((raca) => (
            <BarraContagem key={raca.id} titulo={raca.titulo} total={raca.total} maximo={maiorContagemRaca} />
          ))}
        </div>
      </section>

      {/* CLASSES ESCOLHIDAS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">Classes Escolhidas</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">Personagem com multiclasse conta uma vez pra cada classe que tem.</p>
        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 space-y-3">
          {classesContagem.length === 0 ? (
            <p className="text-xs text-gray-600 italic">Nenhum personagem com classe registrada ainda.</p>
          ) : classesContagem.map((classe) => (
            <BarraContagem key={classe.id} titulo={classe.titulo} total={classe.total} maximo={maiorContagemClasse} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default EstatisticasCampanha;
