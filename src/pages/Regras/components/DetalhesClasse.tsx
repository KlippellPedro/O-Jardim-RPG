import type { IClasse } from '../../../types/catalogo';
import { classeTemProgressaoPublicada, formatarRecompensaClasse } from '../../../services/classeService';
import { ARVORES } from '../../../data/arvoresCatalog';

interface DetalhesClasseProps {
  classe: IClasse;
}

const formatarNiveis = (niveis: number[]) => niveis.join(', ');

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
            ? `Patamar de conquista, mais forte por natureza e restrito às Árvores: ${arvores || 'não publicadas'}. Exige liberação do Mestre.`
            : 'Patamar-base disponível para personagens de qualquer Árvore.'}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {classe.origem_conteudo === 'proposta_original_balanceada'
            ? 'Conteúdo proposto para completar uma classe sem documento próprio no material enviado.'
            : 'Conteúdo preservado do material enviado, com limites, custos e linguagem revisados para o sistema atual.'}
        </p>
      </div>

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
              <article key={habilidade.id} className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-yellow-500" style={{ fontFamily: 'Cinzel, serif' }}>{habilidade.titulo}</h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Níveis {formatarNiveis(habilidade.niveis)}</span>
                </div>
                {habilidade.descricao && <p className="leading-relaxed text-gray-300">{habilidade.descricao}</p>}
                {habilidade.estagios && (
                  <div className="mt-5 space-y-4 border-t border-white/5 pt-5">
                    {habilidade.estagios.map(estagio => (
                      <div key={estagio.nivel}>
                        <h4 className="mb-1 text-sm font-bold text-gray-200">
                          Nível {estagio.nivel}{estagio.titulo ? `: ${estagio.titulo}` : ''}
                        </h4>
                        <p className="text-sm leading-relaxed text-gray-400">{estagio.descricao}</p>
                      </div>
                    ))}
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
          <p className="mb-5 text-sm text-gray-400">Os custos foram publicados em Mana e revisados pelo impacto do efeito. Custo 0 indica um poder passivo.</p>
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
    </div>
  );
};
