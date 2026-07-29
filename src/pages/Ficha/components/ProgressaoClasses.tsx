import { Link } from 'react-router-dom';
import type { IClasse } from '../../../types/catalogo';
import {
  classeTemProgressaoPublicada,
  contarRecompensasPorTipo,
  formatarRecompensaClasse,
  obterProximaProgressao,
} from '../../../services/classeService';

interface ClasseSlot {
  classeId: string;
  nivel: number;
}

interface ProgressaoClassesProps {
  classes: ClasseSlot[];
  catalogoClasses: IClasse[];
}

export const ProgressaoClasses = ({ classes, catalogoClasses }: ProgressaoClassesProps) => {
  const classesPublicadas = classes.flatMap(slot => {
    const classe = catalogoClasses.find(item => item.id === slot.classeId);
    return classe && classeTemProgressaoPublicada(classe) ? [{ slot, classe }] : [];
  });

  if (classesPublicadas.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold uppercase tracking-widest text-[#c7a44c]">Progressão das Classes</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          A tabela registra as recompensas conquistadas. Quando receber um Poder de classe, escolha uma opção e cadastre-a na aba Poderes.
        </p>
      </div>

      <div className="space-y-5">
        {classesPublicadas.map(({ slot, classe }) => {
          const nivel = Math.max(1, Math.min(20, Number(slot.nivel) || 1));
          const atual = classe.progressao?.find(item => item.nivel === nivel);
          const proxima = obterProximaProgressao(classe, nivel);
          const poderes = contarRecompensasPorTipo(classe, nivel, 'poder');
          const graus = contarRecompensasPorTipo(classe, nivel, 'grau_pericia');
          const eventos = contarRecompensasPorTipo(classe, nivel, 'evento');

          return (
            <article key={classe.id} className="rounded-xl border border-white/10 bg-[#121118] p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{classe.titulo}</h3>
                    <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c7a44c]">
                      Nível {nivel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">
                    Neste nível: {atual?.recompensas.map(formatarRecompensaClasse).join(', ') || 'Sem recompensa registrada'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {proxima
                      ? `Próxima recompensa no nível ${proxima.nivel}: ${proxima.recompensas.map(formatarRecompensaClasse).join(', ')}`
                      : 'Progressão concluída. A Habilidade Final foi alcançada.'}
                  </p>
                </div>
                <Link
                  to={`/regras/classes/${classe.id}`}
                  className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-[#c7a44c]/40 hover:text-[#c7a44c]"
                >
                  Ver regras da classe
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-black/30 p-3 text-center">
                  <div className="text-lg font-bold text-violet-300">{poderes}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Poderes</div>
                </div>
                <div className="rounded-lg bg-black/30 p-3 text-center">
                  <div className="text-lg font-bold text-emerald-300">{graus}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Graus</div>
                </div>
                <div className="rounded-lg bg-black/30 p-3 text-center">
                  <div className="text-lg font-bold text-sky-300">{eventos}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Eventos</div>
                </div>
              </div>

              <details className="mt-4 rounded-lg border border-white/5 bg-black/20 p-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white">
                  Ver todos os níveis
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {classe.progressao?.map(item => {
                    const conquistado = item.nivel <= nivel;
                    return (
                      <div
                        key={item.nivel}
                        className={`rounded-lg border p-3 text-xs ${
                          conquistado
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-gray-300'
                            : 'border-white/5 bg-black/20 text-gray-500'
                        }`}
                      >
                        <span className={conquistado ? 'font-bold text-emerald-400' : 'font-bold text-gray-500'}>Nível {item.nivel}: </span>
                        {item.recompensas.map(formatarRecompensaClasse).join(', ')}
                      </div>
                    );
                  })}
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
};
