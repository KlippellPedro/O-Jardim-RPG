import { Link } from 'react-router-dom';
import { ConstelacaoClasse } from './ConstelacaoClasse';
import type { IClasse } from '../../../types/catalogo';
import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE } from '../../../services/progressaoNiveis';
import {
  MARCOS_MAESTRIA,
  descreverMarcoMaestria,
  grausDeMaestria,
  proximoMarcoMaestria,
} from '../../../services/maestriaClasse';
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
    <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6" data-tour="progressao-classes">
      <div className="mb-5">
        <h2 className="text-lg font-bold uppercase tracking-widest text-[#c7a44c]">Progressão das Classes</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          A tabela registra as recompensas conquistadas. Quando receber um Poder de classe, escolha uma opção e cadastre-a na aba Poderes.
        </p>
      </div>

      <div className="space-y-5">
        {classesPublicadas.map(({ slot, classe }) => {
          // A tabela de recompensas termina no nível 20; acima dele o nível real
          // continua contando (o crachá mostra), mas a consulta usa o 20.
          const nivelReal = Math.max(1, Math.trunc(Number(slot.nivel) || 1));
          const nivel = Math.min(nivelReal, NIVEL_CONTEUDO_CLASSE);
          const acimaDoConteudo = nivelReal > NIVEL_CONTEUDO_CLASSE;
          const atual = classe.progressao?.find(item => item.nivel === nivel);
          const proxima = obterProximaProgressao(classe, nivel);
          const poderes = contarRecompensasPorTipo(classe, nivel, 'poder');
          const graus = contarRecompensasPorTipo(classe, nivel, 'grau_pericia') + grausDeMaestria(nivelReal);
          const proximaMaestria = proximoMarcoMaestria(nivelReal);
          const eventos = contarRecompensasPorTipo(classe, nivel, 'evento');

          return (
            <article key={classe.id} className="rounded-xl border border-white/10 bg-[#121118] p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{classe.titulo}</h3>
                    <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c7a44c]">
                      Nível {nivelReal}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">
                    {acimaDoConteudo
                      ? `Todas as recompensas escritas desta classe já foram conquistadas. Do nível ${NIVEL_CONTEUDO_CLASSE + 1} ao ${NIVEL_MAXIMO_CLASSE} ela segue somando Vida, Mana e Estamina e ganha a Maestria de 5 em 5 níveis.`
                      : `Neste nível: ${atual?.recompensas.map(formatarRecompensaClasse).join(', ') || 'Sem recompensa registrada'}`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {proxima
                      ? `Próxima recompensa no nível ${proxima.nivel}: ${proxima.recompensas.map(formatarRecompensaClasse).join(', ')}`
                      : proximaMaestria
                        ? `Próxima Maestria no nível ${proximaMaestria.nivel}: ${descreverMarcoMaestria(proximaMaestria)}`
                        : nivelReal >= NIVEL_MAXIMO_CLASSE
                          ? 'Maestria completa. A próxima subida é em outra classe.'
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

              <div className="mt-4">
                <ConstelacaoClasse classe={classe} nivel={nivel} />
              </div>

              {nivelReal >= NIVEL_CONTEUDO_CLASSE && (
                <div className="mt-4" role="group" aria-label={`Maestria de ${classe.titulo}`}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Maestria · níveis {NIVEL_CONTEUDO_CLASSE + 1} a {NIVEL_MAXIMO_CLASSE}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MARCOS_MAESTRIA.map((marco) => {
                      const alcancado = nivelReal >= marco.nivel;
                      return (
                        <span
                          key={marco.nivel}
                          data-alcancado={alcancado}
                          title={descreverMarcoMaestria(marco)}
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold ${alcancado ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-gray-500'}`}
                        >
                          Nv {marco.nivel} · {marco.tipo === 'grau_pericia' ? 'Grau de perícia' : 'Reforço de recursos'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
