import { ChevronDown } from 'lucide-react';
import type { IClasse, IFichaTecnicaClasse, IOpcaoHabilidadeClasse } from '../../../types/catalogo';
import { classeTemProgressaoPublicada, formatarRecompensaClasse } from '../../../services/classeService';
import { ARVORES } from '../../../../data/mundo/arvoresCatalog';
import { FormulaIngredients } from '../../../components/materials/FormulaIngredients';
import { ChemicalMaterialsCatalog } from '../../../components/materials/ChemicalMaterialsCatalog';
import { CookingIngredients } from '../../../components/materials/CookingIngredients';
import { CookingMaterialsCatalog } from '../../../components/materials/CookingMaterialsCatalog';
import { EngineeringProjectMaterials } from '../../../components/materials/EngineeringProjectMaterials';
import { EngineeringMaterialsCatalog } from '../../../components/materials/EngineeringMaterialsCatalog';
import { RitualCatalog } from '../../../components/materials/RitualCatalog';
import { RitualMaterialsCatalog } from '../../../components/materials/RitualMaterialsCatalog';

interface DetalhesClasseProps {
  classe: IClasse;
}

const formatarNiveis = (niveis: number[]) => niveis.join(', ');

/** Classes do Tailwind escritas por extenso de propósito: o scanner do JIT lê o
 * código-fonte, então cor montada em template (`border-${cor}-400/20`) não entra
 * no CSS gerado e o bloco sai sem estilo. */
interface ICorCatalogo {
  caixa: string;
  botao: string;
  dica: string;
  divisor: string;
}

const CORES_CATALOGO: Record<string, ICorCatalogo> = {
  amarelo: {
    caixa: 'border-yellow-400/20 bg-yellow-400/[0.045]',
    botao: 'text-yellow-100 hover:bg-yellow-400/10 focus-visible:ring-yellow-300/50',
    dica: 'text-yellow-200/45',
    divisor: 'border-yellow-300/10',
  },
  ambar: {
    caixa: 'border-amber-400/20 bg-amber-400/[0.045]',
    botao: 'text-amber-100 hover:bg-amber-400/10 focus-visible:ring-amber-300/50',
    dica: 'text-amber-200/45',
    divisor: 'border-amber-300/10',
  },
  esmeralda: {
    caixa: 'border-emerald-400/20 bg-emerald-400/[0.045]',
    botao: 'text-emerald-100 hover:bg-emerald-400/10 focus-visible:ring-emerald-300/50',
    dica: 'text-emerald-200/45',
    divisor: 'border-emerald-300/10',
  },
  ceu: {
    caixa: 'border-sky-400/20 bg-sky-400/[0.045]',
    botao: 'text-sky-100 hover:bg-sky-400/10 focus-visible:ring-sky-300/50',
    dica: 'text-sky-200/45',
    divisor: 'border-sky-300/10',
  },
  violeta: {
    caixa: 'border-violet-400/20 bg-violet-400/[0.045]',
    botao: 'text-violet-100 hover:bg-violet-400/10 focus-visible:ring-violet-300/50',
    dica: 'text-violet-200/45',
    divisor: 'border-violet-300/10',
  },
  rosa: {
    caixa: 'border-rose-400/20 bg-rose-400/[0.045]',
    botao: 'text-rose-100 hover:bg-rose-400/10 focus-visible:ring-rose-300/50',
    dica: 'text-rose-200/45',
    divisor: 'border-rose-300/10',
  },
  vermelho: {
    caixa: 'border-red-400/20 bg-red-400/[0.045]',
    botao: 'text-red-100 hover:bg-red-400/10 focus-visible:ring-red-300/50',
    dica: 'text-red-200/45',
    divisor: 'border-red-300/10',
  },
  laranja: {
    caixa: 'border-orange-400/20 bg-orange-400/[0.045]',
    botao: 'text-orange-100 hover:bg-orange-400/10 focus-visible:ring-orange-300/50',
    dica: 'text-orange-200/45',
    divisor: 'border-orange-300/10',
  },
  azul: {
    caixa: 'border-blue-400/20 bg-blue-400/[0.045]',
    botao: 'text-blue-100 hover:bg-blue-400/10 focus-visible:ring-blue-300/50',
    dica: 'text-blue-200/45',
    divisor: 'border-blue-300/10',
  },
  ardosia: {
    caixa: 'border-slate-400/20 bg-slate-400/[0.045]',
    botao: 'text-slate-100 hover:bg-slate-400/10 focus-visible:ring-slate-300/50',
    dica: 'text-slate-200/45',
    divisor: 'border-slate-300/10',
  },
  turquesa: {
    caixa: 'border-teal-400/20 bg-teal-400/[0.045]',
    botao: 'text-teal-100 hover:bg-teal-400/10 focus-visible:ring-teal-300/50',
    dica: 'text-teal-200/45',
    divisor: 'border-teal-300/10',
  },
  lima: {
    caixa: 'border-lime-400/20 bg-lime-400/[0.045]',
    botao: 'text-lime-100 hover:bg-lime-400/10 focus-visible:ring-lime-300/50',
    dica: 'text-lime-200/45',
    divisor: 'border-lime-300/10',
  },
  ciano: {
    caixa: 'border-cyan-400/20 bg-cyan-400/[0.045]',
    botao: 'text-cyan-100 hover:bg-cyan-400/10 focus-visible:ring-cyan-300/50',
    dica: 'text-cyan-200/45',
    divisor: 'border-cyan-300/10',
  },
};

/** Cor e substantivo de cada catálogo, para o botão falar a língua da
 * habilidade ("Mostrar 12 melhorias") em vez de um "opções" genérico. Catálogo
 * que não estiver aqui ainda recolhe, só que com o texto padrão: assim
 * habilidade nova nunca nasce despejando a lista inteira na página. */
const CATALOGOS_RECOLHIVEIS: Record<string, { cor: string; substantivo: string }> = {
  'alquimista:formulas': { cor: 'esmeralda', substantivo: 'fórmulas' },
  'atirador:tiro-de-impulso': { cor: 'ambar', substantivo: 'benefícios' },
  'detetive:perfil-do-suspeito': { cor: 'ambar', substantivo: 'especialidades' },
  'devorador:instintos-do-devorador': { cor: 'vermelho', substantivo: 'instintos' },
  'cacador:especializacao': { cor: 'lima', substantivo: 'raças' },
  'cacador:agencia-dos-cacadores': { cor: 'lima', substantivo: 'benefícios' },
  'cacador-das-almas:zanpakuto': { cor: 'rosa', substantivo: 'aspectos' },
  'canalizador:canalizacao-nativa': { cor: 'ciano', substantivo: 'fluxos' },
  'comerciante:estoque': { cor: 'ambar', substantivo: 'linhas' },
  'comerciante:rede-de-negocios': { cor: 'ambar', substantivo: 'praças' },
  'cozinheiro:cardapio': { cor: 'ambar', substantivo: 'receitas' },
  'engenheiro:engenhocas': { cor: 'ceu', substantivo: 'projetos' },
  'engenheiro:meus-filhos': { cor: 'ceu', substantivo: 'especialidades' },
  'espadachim:talento-de-combate': { cor: 'azul', substantivo: 'posturas' },
  'guardiao:protegido': { cor: 'ceu', substantivo: 'juramentos' },
  'guerreiro:batalhao': { cor: 'vermelho', substantivo: 'ordens' },
  'interceptador:hackear-fluxo': { cor: 'vermelho', substantivo: 'técnicas' },
  'invocador:formas-vinculadas': { cor: 'violeta', substantivo: 'formas' },
  'lutador:estilo-de-combate': { cor: 'laranja', substantivo: 'estilos' },
  'lutador:punhos-de-ferro': { cor: 'laranja', substantivo: 'técnicas' },
  'medico:medicina': { cor: 'rosa', substantivo: 'tratamentos' },
  'medico:socorro-de-emergencia': { cor: 'vermelho', substantivo: 'protocolos' },
  'ninja:arma-ninja': { cor: 'ardosia', substantivo: 'melhorias' },
  'pirata-amaldicoado:evolucao-abissal': { cor: 'turquesa', substantivo: 'mutações' },
  'piloto:tuning': { cor: 'ceu', substantivo: 'modificações' },
  'pop-star:publi': { cor: 'violeta', substantivo: 'contratos' },
  'ritualista:circulo-preparado': { cor: 'violeta', substantivo: 'preparos' },
  'sintonizador:fusao-controlada': { cor: 'turquesa', substantivo: 'fusões' },
  'viajante-classe:licoes-da-estrada': { cor: 'esmeralda', substantivo: 'lições' },
};

const CATALOGO_PADRAO = { cor: 'amarelo', substantivo: 'opções' };

/** Daqui para cima a lista atrapalha a leitura da página e passa a vir
 * fechada. Abaixo disso ela cabe aberta e não custa um clique ao jogador. */
const MINIMO_PARA_RECOLHER = 6;

const CAMPOS_FICHA_TECNICA: Array<[keyof IFichaTecnicaClasse, string]> = [
  ['acao', 'Execução'],
  ['alcance', 'Alcance'],
  ['duracao', 'Duração'],
  ['defesa', 'Defesa'],
  ['dano', 'Dano'],
  ['usos', 'Usos'],
];

/** Ação, alcance, duração e companhia em etiquetas, no mesmo formato que a
 * página de magias usa. O que o efeito não define fica fora. */
const FichaTecnica = ({ efeito }: { efeito: IFichaTecnicaClasse }) => {
  const campos = CAMPOS_FICHA_TECNICA.filter(([chave]) => Boolean(efeito[chave]));
  if (!campos.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {campos.map(([chave, rotulo]) => (
        <span key={chave} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300">
          <span className="font-bold uppercase tracking-wider text-gray-500">{rotulo}</span> {efeito[chave]}
        </span>
      ))}
    </div>
  );
};

const GradeOpcoes = ({
  classeId,
  habilidadeId,
  opcoes,
}: {
  classeId: string;
  habilidadeId: string;
  opcoes: IOpcaoHabilidadeClasse[];
}) => (
  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
    {opcoes.map(opcao => (
      <div key={opcao.id} className="rounded-xl border border-white/5 bg-black/30 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-sm text-white">{opcao.titulo}</strong>
          {opcao.acao && <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300/80">{opcao.acao}</span>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{opcao.descricao}</p>
        {classeId === 'alquimista' && habilidadeId === 'formulas' && <FormulaIngredients formulaId={opcao.id} />}
        {classeId === 'cozinheiro' && habilidadeId === 'cardapio' && <CookingIngredients recipeId={opcao.id} />}
        {classeId === 'engenheiro' && habilidadeId === 'engenhocas' && <EngineeringProjectMaterials projectId={opcao.id} />}
        <FichaTecnica efeito={{ ...opcao, acao: undefined }} />
        {opcao.escalonamento && <p className="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-sky-200/70">{opcao.escalonamento}</p>}
      </div>
    ))}
  </div>
);

/** Lista longa dentro de um `<details>`, para a página de classe continuar
 * legível de cima a baixo. Fechado por padrão: quem quer o catálogo abre. */
const CatalogoRecolhivel = ({
  classeId,
  habilidadeId,
  opcoes,
}: {
  classeId: string;
  habilidadeId: string;
  opcoes: IOpcaoHabilidadeClasse[];
}) => {
  const { cor, substantivo } = CATALOGOS_RECOLHIVEIS[`${classeId}:${habilidadeId}`] || CATALOGO_PADRAO;
  const paleta = CORES_CATALOGO[cor] || CORES_CATALOGO[CATALOGO_PADRAO.cor];

  return (
    <details className={`group mt-4 rounded-xl border p-2 ${paleta.caixa}`}>
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden ${paleta.botao}`}
      >
        <span>
          <span className="group-open:hidden">Mostrar {opcoes.length} {substantivo}</span>
          <span className="hidden group-open:inline">Esconder {substantivo}</span>
          <span className={`ml-2 text-xs font-normal ${paleta.dica}`}>clique para abrir</span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className={`border-t px-2 pb-2 ${paleta.divisor}`}>
        <GradeOpcoes classeId={classeId} habilidadeId={habilidadeId} opcoes={opcoes} />
      </div>
    </details>
  );
};

export const DetalhesClasse = ({ classe }: DetalhesClasseProps) => {
  if (!classeTemProgressaoPublicada(classe)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-gray-400">
        A progressão específica desta classe ainda não foi publicada.
      </div>
    );
  }

  const progressao = classe.progressao || [];
  const especial = classe.categoria !== 'padrao';
  const idsArvores = classe.arvores?.length ? classe.arvores : (classe.arvore ? [classe.arvore] : []);
  const arvores = idsArvores
    .map(id => ARVORES.find(arvore => arvore.id === id)?.nome)
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-12">
      <div className={`rounded-2xl border p-5 text-sm leading-relaxed ${especial ? 'border-violet-500/20 bg-violet-500/5 text-violet-100' : 'border-white/10 bg-black/30 text-gray-300'}`}>
        <p className="font-bold uppercase tracking-wider">{especial ? 'Classe especial' : 'Classe comum'}</p>
        <p className="mt-1">
          {especial
            ? `Não se escolhe na criação: se conquista. Mais forte que o patamar-base, presa às Árvores ${arvores || 'que o Mestre definir'}, e o Mestre precisa liberar antes.`
            : 'É o patamar-base. Serve a personagem de qualquer Árvore, sem depender de ninguém liberar.'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-relaxed text-gray-300">
        <p className="font-bold uppercase tracking-wider text-gray-400">Nível 20 exige uma segunda classe</p>
        <p className="mt-1">
          Não dá para maximizar {classe.titulo} sozinho: uma classe só chega ao nível 20 se outra classe da ficha já tiver nível 10 ou mais. Os níveis podem ser intercalados como o jogador preferir, contanto que essa segunda classe chegue lá primeiro.
        </p>
      </div>

      {((classe.pericias_concedidas || []).length > 0 || classe.dt_efeitos || classe.tarefas_bancada) && (
        <section>
          <h2 className="mb-5 text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>O Que a Classe Entrega de Saída</h2>
          <div className="space-y-5">
            {(classe.pericias_concedidas || []).map(pericia => (
              <article key={pericia.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-xl font-bold text-emerald-300">{pericia.titulo}</h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/70">
                    Perícia da classe{pericia.grau_inicial ? ` · ${pericia.grau_inicial}` : ''}
                  </span>
                </div>
                {pericia.descricao && <p className="text-sm leading-relaxed text-gray-300">{pericia.descricao}</p>}
              </article>
            ))}

            {classe.dt_efeitos && (
              <article className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <h3 className="mb-2 text-xl font-bold text-amber-300">{classe.dt_efeitos.rotulo}</h3>
                <p className="text-sm leading-relaxed text-gray-300">{classe.dt_efeitos.descricao}</p>
              </article>
            )}

            {classe.tarefas_bancada && (
              <article className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <h3 className="mb-2 text-xl font-bold text-white">{classe.tarefas_bancada.rotulo}</h3>
                {classe.tarefas_bancada.resumo_no_topo ? (
                  <p className="text-sm leading-relaxed text-gray-400">{classe.tarefas_bancada.resumo_no_topo}</p>
                ) : (
                  <>
                    {classe.tarefas_bancada.descricao && (
                      <p className="mb-4 text-sm leading-relaxed text-gray-400">{classe.tarefas_bancada.descricao}</p>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                        <thead className="text-xs uppercase tracking-widest text-gray-500">
                          <tr>
                            {(classe.tarefas_bancada.colunas || ['Tarefa', 'DT', 'Custo']).map((coluna, indice) => (
                              <th key={coluna} className={indice < 2 ? 'pb-3 pr-4' : 'pb-3'}>{coluna}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {classe.tarefas_bancada.itens.map(item => (
                            <tr key={item.tarefa} className="border-t border-white/5 text-gray-300">
                              <td className="py-3 pr-4">{item.tarefa}</td>
                              <td className="py-3 pr-4 whitespace-nowrap text-yellow-500">{item.dt}</td>
                              <td className="py-3 text-gray-400">{item.nota}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </article>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-5 text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Progressão da Classe</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-black/50 text-xs uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-5 py-4">Nível</th>
                <th className="px-5 py-4">Recompensa</th>
                <th className="px-5 py-4">Nível</th>
                <th className="px-5 py-4">Recompensa</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, index) => {
                const esquerda = progressao.find(item => item.nivel === index + 1);
                const direita = progressao.find(item => item.nivel === index + 11);
                return (
                  <tr key={index + 1} className="border-t border-white/5 text-sm text-gray-300">
                    <td className="px-5 py-4 font-mono text-yellow-500">{esquerda?.nivel}</td>
                    <td className="px-5 py-4">{esquerda?.recompensas.map(formatarRecompensaClasse).join(', ')}</td>
                    <td className="px-5 py-4 font-mono text-yellow-500">{direita?.nivel}</td>
                    <td className="px-5 py-4">{direita?.recompensas.map(formatarRecompensaClasse).join(', ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {(classe.habilidades || []).length > 0 && (
        <section>
          <h2 className="mb-5 text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Habilidades de Classe</h2>
          <div className="space-y-5">
            {classe.habilidades?.map(habilidade => (
              <article id={`habilidade-${habilidade.id}`} key={habilidade.id} className="scroll-mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-yellow-500" style={{ fontFamily: 'Cinzel, serif' }}>{habilidade.titulo}</h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Níveis {formatarNiveis(habilidade.niveis)}</span>
                </div>
                {habilidade.descricao && <p className="leading-relaxed text-gray-300">{habilidade.descricao}</p>}
                <FichaTecnica efeito={habilidade} />
                {habilidade.escalonamento && (
                  <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-sky-300">{habilidade.escalonamento.rotulo}</h4>
                      <div className="flex flex-wrap gap-2">
                        {habilidade.escalonamento.marcos.map(marco => (
                          <span key={marco.nivel} className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] text-sky-100">
                            Nível {marco.nivel} <span className="text-sky-300/70">{marco.nivel_classe > 1 ? `aos ${marco.nivel_classe}` : 'de saída'}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    {habilidade.escalonamento.descricao && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">{habilidade.escalonamento.descricao}</p>
                    )}
                  </div>
                )}
                {habilidade.estagios && (
                  <div className="mt-5 space-y-4 border-t border-white/5 pt-5">
                    {habilidade.estagios.map(estagio => (
                      <div key={estagio.nivel}>
                        <h4 className="mb-1 text-sm font-bold text-gray-200">
                          Nível {estagio.nivel}{estagio.titulo ? `: ${estagio.titulo}` : ''}
                        </h4>
                        <p className="text-sm leading-relaxed text-gray-400">{estagio.descricao}</p>
                        <FichaTecnica efeito={estagio} />
                      </div>
                    ))}
                  </div>
                )}
                {(habilidade.opcoes || []).length > 0 && (
                  <div className="mt-5 border-t border-white/5 pt-5">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-yellow-500/80">
                      {habilidade.escolha_opcoes?.rotulo || 'Opções'}
                    </h4>
                    {habilidade.escolha_opcoes?.descricao && (
                      <p className="mt-1 text-sm leading-relaxed text-gray-400">{habilidade.escolha_opcoes.descricao}</p>
                    )}
                    {(habilidade.opcoes || []).length >= MINIMO_PARA_RECOLHER ? (
                      <CatalogoRecolhivel classeId={classe.id} habilidadeId={habilidade.id} opcoes={habilidade.opcoes || []} />
                    ) : (
                      <GradeOpcoes classeId={classe.id} habilidadeId={habilidade.id} opcoes={habilidade.opcoes || []} />
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {(classe.eventos || []).length > 0 && (
        <section>
          <h2 className="mb-5 text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Eventos da Classe</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {classe.eventos?.map(evento => (
              <article key={evento.id} className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6">
                <h3 className="mb-2 text-xl font-bold text-sky-300">{evento.titulo}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-300">{evento.descricao}</p>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400/70">Níveis {formatarNiveis(evento.niveis)}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {(classe.poderes || []).length > 0 && (
        <section>
          <h2 className="mb-2 text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Poderes da Classe</h2>
          <p className="mb-5 text-sm text-gray-400">Custo 0 indica um poder passivo.</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {classe.poderes?.map(poder => (
              <article key={poder.id} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-violet-300">{poder.titulo}</h3>
                  <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-200">
                    {poder.custo_mana} Mana
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">{poder.descricao}</p>
                <FichaTecnica efeito={poder} />
                {poder.pre_requisitos && poder.pre_requisitos.length > 0 && (
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-amber-400">Requisito: {poder.pre_requisitos.join(', ')}</p>
                )}
                {poder.repetivel && (
                  <p className="mt-2 text-xs text-gray-400">Pode ser escolhido novamente{poder.limite ? `, até ${poder.limite} vezes` : ''}.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {classe.id === 'alquimista' && <ChemicalMaterialsCatalog />}
      {classe.id === 'cozinheiro' && <CookingMaterialsCatalog />}
      {classe.id === 'engenheiro' && <EngineeringMaterialsCatalog />}
      {classe.id === 'ritualista' && <RitualCatalog classe={classe} />}
      {classe.id === 'ritualista' && <RitualMaterialsCatalog />}
    </div>
  );
};
