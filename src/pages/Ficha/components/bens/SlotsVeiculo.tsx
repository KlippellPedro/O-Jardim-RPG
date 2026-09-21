import { useState, type ReactNode } from 'react';
import { Plus, Power, Trash2, X } from 'lucide-react';
import {
  podeLigarMais,
  resumirSlots,
  sugestoesQueCabem,
  type ModuloSlot,
  type SugestaoModulo,
} from '../../utils/slotsVeiculo';

const COLUNAS = 4;

interface SlotsVeiculoProps {
  espacosMaximos: number;
  sistemasAtivosMaximos: number;
  modulos: ModuloSlot[];
  podeUtilizar: boolean;
  podeGerenciar: boolean;
  onAlternar: (id: string, ativo: boolean) => void;
  onRemover: (id: string) => void;
  /** Um clique numa sugestão instala direto, sem passar pelo formulário. */
  onInstalar: (sugestao: SugestaoModulo) => void;
  /** O que aparece nas vagas livres. Padrão: atalhos do catálogo (frota); no veículo
   * pessoal são as peças guardadas do inventário. */
  sugestoes?: SugestaoModulo[];
  titulo?: string;
  /** Texto quando nenhuma sugestão cabe nas vagas livres. */
  semSugestoes?: string;
  /** Texto do botão de tirar o módulo. "Desinstalar" não apaga nada: só solta a peça. */
  onDesinstalarRotulo?: string;
  /** Formulário de módulo personalizado, mostrado só para quem gerencia. */
  formulario?: ReactNode;
}

/** Módulos do veículo como encaixes: cada módulo ocupa as vagas que custa, o
 * que está ligado acende, vaga livre é tracejada e oferece o que cabe nela.
 * Só apresenta: os limites de vaga e de sistemas ativos vêm do veículo e o
 * servidor continua sendo quem confere. */
export const SlotsVeiculo = ({
  espacosMaximos,
  sistemasAtivosMaximos,
  modulos,
  podeUtilizar,
  podeGerenciar,
  onAlternar,
  onRemover,
  onInstalar,
  sugestoes,
  titulo = 'Módulos de utilidade',
  semSugestoes = 'Nada cabe nas vagas livres agora.',
  onDesinstalarRotulo = 'Remover',
  formulario,
}: SlotsVeiculoProps) => {
  const resumo = resumirSlots(modulos, espacosMaximos);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const cabem = sugestoesQueCabem(modulos, resumo.livres, sugestoes);
  const limiteAtingido = !podeLigarMais(resumo.ativos, sistemasAtivosMaximos);

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
          <span className="font-bold uppercase tracking-widest text-cyan-400/80">{titulo}</span>
          <span className={resumo.estourou ? 'font-bold text-red-300' : 'text-gray-400'}>
            {resumo.usados}/{resumo.maximos} vagas
            <span className="text-gray-600"> · {resumo.ativos}/{sistemasAtivosMaximos} ligados</span>
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-black/40"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={resumo.maximos}
          aria-valuenow={Math.min(resumo.usados, resumo.maximos)}
          aria-label="Vagas de módulo ocupadas"
        >
          <div className={`h-full ${resumo.estourou ? 'bg-red-400' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, (resumo.usados / Math.max(1, resumo.maximos)) * 100)}%` }} />
        </div>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))` }}>
        {modulos.map((modulo) => {
          const bloqueadoLigar = !modulo.ativo && limiteAtingido;
          return (
            <div
              key={modulo.id}
              style={{ gridColumn: `span ${Math.min(COLUNAS, Math.max(1, modulo.espacos))}` }}
              className={`relative flex min-h-[3.5rem] flex-col justify-between rounded-lg border px-2 py-1.5 transition-colors ${
                modulo.ativo ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.15)]' : 'border-white/10 bg-black/30 text-gray-400'
              }`}
            >
              <button
                type="button"
                onClick={() => onAlternar(modulo.id, !modulo.ativo)}
                disabled={!podeUtilizar || bloqueadoLigar}
                aria-pressed={modulo.ativo}
                title={bloqueadoLigar ? 'Limite de sistemas ligados atingido. Desligue outro módulo antes.' : modulo.ativo ? 'Desligar' : 'Ligar'}
                className="flex min-w-0 items-start gap-1.5 text-left disabled:cursor-default"
              >
                <Power size={12} className={`mt-0.5 shrink-0 ${modulo.ativo ? 'text-cyan-300' : 'text-gray-600'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{modulo.nome}</span>
                  <span className="block text-[10px] opacity-70">{modulo.espacos} vaga(s) · {modulo.ativo ? 'ligado' : 'desligado'}</span>
                </span>
              </button>
              {podeGerenciar ? (
                <button
                  type="button"
                  onClick={() => onRemover(modulo.id)}
                  aria-label={`${onDesinstalarRotulo} ${modulo.nome}`}
                  title={`${onDesinstalarRotulo} ${modulo.nome}`}
                  className="absolute right-1 top-1 rounded p-1 text-gray-500 hover:text-red-300"
                >
                  {onDesinstalarRotulo === 'Remover' ? <Trash2 size={11} /> : <X size={11} />}
                </button>
              ) : null}
            </div>
          );
        })}
        {Array.from({ length: resumo.livres }).map((_, indice) => (
          <button
            key={`livre-${indice}`}
            type="button"
            onClick={() => setSeletorAberto((aberto) => !aberto)}
            disabled={!podeGerenciar}
            aria-label="Vaga livre: escolher módulo"
            aria-expanded={seletorAberto}
            className="flex min-h-[3.5rem] items-center justify-center rounded-lg border border-dashed border-white/15 text-white/25 transition-colors enabled:hover:border-cyan-400/50 enabled:hover:text-cyan-300 disabled:cursor-default"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        ))}
      </div>

      {resumo.estourou ? <p className="text-xs text-red-300">Os módulos ocupam mais vagas do que o veículo tem. Remova um ou aumente as vagas do veículo.</p> : null}
      {modulos.length === 0 && resumo.maximos > 0 ? <p className="text-[11px] text-gray-600">Nenhum módulo instalado.</p> : null}
      {resumo.maximos === 0 ? <p className="text-[11px] text-gray-600">Este veículo não tem vagas de módulo.</p> : null}

      {podeGerenciar && (seletorAberto || (resumo.livres > 0 && modulos.length === 0)) && resumo.livres > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70">Instalar com um clique ({resumo.livres} vaga(s) livre(s))</p>
          {cabem.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {cabem.map((sugestao) => (
                <button
                  key={sugestao.id ?? sugestao.nome}
                  type="button"
                  onClick={() => { onInstalar(sugestao); setSeletorAberto(false); }}
                  className="rounded-full border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/15"
                >
                  + {sugestao.nome} · {sugestao.espacos} vaga(s)
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-600">{semSugestoes}</p>
          )}
        </div>
      ) : null}

      {podeGerenciar ? formulario : null}
    </div>
  );
};
