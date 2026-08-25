import { ChevronRight, Cog } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ROTULO_RARIDADE_RECURSO,
  SUCATA_POR_NIVEL_PROJETO,
  raridadeSucataPorNivelProjeto,
} from '../../../data/regras/recursos-materiais';
import { RECEITAS_CATALOGO } from '../../services/materialsCatalogService';

interface EngineeringProjectMaterialsProps {
  projectId: string;
  compact?: boolean;
  projectLevel?: number;
}

export function EngineeringProjectMaterials({ projectId, compact = false, projectLevel }: EngineeringProjectMaterialsProps) {
  const project = RECEITAS_CATALOGO.find((item) => item.classe === 'engenheiro' && item.id === projectId);
  if (!project) return null;
  const currentRarity = projectLevel ? raridadeSucataPorNivelProjeto(projectLevel) : null;

  return (
    <section className={`mt-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.055] ${compact ? 'p-3' : 'p-4'}`} aria-label={`Custo de montagem de ${project.titulo}`}>
      <div className="flex items-center justify-between gap-3">
        <h5 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-sky-200/85">
          <Cog className="h-4 w-4" /> Sucata
        </h5>
        <Link to="/materiais?recurso=sucata" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-sky-300/70 hover:text-sky-100">
          Ver exemplos <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-sky-100/55">
        Depois de um descanso, gaste <strong className="text-sky-100">1 lote da raridade do nível atual dos seus projetos</strong>. Esse gasto prepara todas as Engenhocas escolhidas. Você não gasta um lote para cada projeto ou unidade.
      </p>
      {currentRarity && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-sky-300/15 bg-black/20 px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-sky-100/50">Exigência atual</span><strong className="text-xs text-sky-100">Nível {projectLevel} · {ROTULO_RARIDADE_RECURSO[currentRarity]}</strong></div>}
      <div className={`mt-3 grid gap-1.5 ${compact ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 lg:grid-cols-5'}`} aria-label="Progressão da raridade da Sucata">
        {SUCATA_POR_NIVEL_PROJETO.map((range) => {
          const active = projectLevel === range.nivelProjeto;
          return <div key={range.nivelProjeto} className={`rounded-lg border px-2 py-2 text-center ${active ? 'border-sky-300/45 bg-sky-300/15' : 'border-white/[0.07] bg-black/15'}`}><strong className={`block text-[10px] ${active ? 'text-sky-100' : 'text-white/65'}`}>Projeto N{range.nivelProjeto}</strong><span className="mt-0.5 block text-[10px] font-bold text-sky-200/75">{ROTULO_RARIDADE_RECURSO[range.raridade]}</span><span className="mt-0.5 block text-[9px] text-white/30">Engenheiro {range.niveisEngenheiro}</span></div>;
        })}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-sky-100/45">
        Sucata superior pode substituir uma inferior. Lotes inferiores não podem ser somados para criar uma raridade maior.
      </p>
    </section>
  );
}
