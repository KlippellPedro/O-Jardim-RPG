import { motion } from 'framer-motion';
import { CircleDot, Crown, Dices, GitBranch, Mountain, Sparkles } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterTemaPorId } from '../themeMap';

const ELEMENTOS = [
  { id: 'terra', nome: 'Terra', cor: '#d79216' },
  { id: 'agua', nome: 'Água', cor: '#38bdf8' },
  { id: 'fogo', nome: 'Fogo', cor: '#f97316' },
  { id: 'ar', nome: 'Ar', cor: '#cbd5e1' },
  { id: 'raio', nome: 'Raio', cor: '#facc15' },
  { id: 'luz', nome: 'Luz', cor: '#fef3c7' },
  { id: 'escuridao', nome: 'Escuridão', cor: '#8b5cf6' },
] as const;

type ConfrontoElemental = {
  regra: string;
  entradas: Array<{ elemento: string; vantagem_contra: string; desvantagem_contra: string }>;
};

export const Elementarista = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);
  const derivacoes = classe.habilidades?.find(habilidade => habilidade.id === 'derivacao-desperta')?.opcoes || [];
  const confrontos = classe.vantagens_elementais as ConfrontoElemental | undefined;

  return (
    <div className={`relative min-h-screen overflow-hidden p-5 sm:p-8 ${tema.text}`}>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(180,130,88,0.32),transparent_42%),linear-gradient(150deg,#080705_0%,#11100d_48%,#060608_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.14]" style={{ backgroundImage: "url('/assets/img/elementarista_class_fantasy_bg.webp')" }} />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 mx-auto max-w-6xl pt-10 sm:pt-16">
        <motion.header initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-14 text-center sm:mb-20">
          <div className={`relative mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full border-4 ${tema.border} ${tema.bg} backdrop-blur-md`} style={{ boxShadow: `0 0 70px ${tema.glow}` }}>
            {ELEMENTOS.map((elemento, indice) => {
              const angulo = (indice / ELEMENTOS.length) * Math.PI * 2;
              return <motion.span key={elemento.nome} title={elemento.nome} className="absolute h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: elemento.cor, x: Math.cos(angulo) * 53, y: Math.sin(angulo) * 53, boxShadow: `0 0 16px ${elemento.cor}` }} animate={{ opacity: [0.38, 1, 0.38], scale: [0.88, 1.16, 0.88] }} transition={{ duration: 2.8, repeat: Infinity, delay: indice * 0.18 }} />;
            })}
            <CircleDot size={54} className={`${tema.icon} relative z-10`} strokeWidth={1.35} />
          </div>
          <span className="mb-4 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">Um vínculo. Um elemento. Uma vida inteira de domínio.</span>
          <h1 className={`mb-6 text-4xl font-black uppercase tracking-tight sm:text-6xl lg:text-7xl ${tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>Elementarista</h1>
          <p className={`mx-auto max-w-3xl text-base font-medium leading-relaxed opacity-90 sm:text-lg ${tema.tag}`}>Escolha Terra, Água, Fogo, Ar, Raio, Luz ou Escuridão no primeiro nível. Esse elemento se torna sua assinatura e permanece com você até o fim, exceto se os Sete Salões revelarem algo muito mais raro.</p>
        </motion.header>

        <section className="mb-16" aria-labelledby="caminhos-elementarista">
          <div className="mb-6 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/70">A bifurcação do 5º nível</span>
            <h2 id="caminhos-elementarista" className="mt-2 text-2xl font-black uppercase text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Dois destinos possíveis</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <PremiumCard glowColor="rgba(245,158,11,.22)" className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] p-6 backdrop-blur-md sm:p-7">
              <Mountain size={34} className="mb-4 text-amber-300" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/60">Resultado comum</span>
              <h3 className="mt-2 text-xl font-bold uppercase text-amber-100" style={{ fontFamily: 'Cinzel, serif' }}>Afinidade única</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">Você conserva somente o elemento de origem, aprofunda sua derivação e chega ao Apogeu com maior eficiência. Esse caminho não é uma falha: ele recebe a versão mais intensa do domínio monoelemental.</p>
            </PremiumCard>
            <div className="flex items-center justify-center py-1 lg:py-0"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/50 text-slate-400"><GitBranch size={22} /></div></div>
            <PremiumCard glowColor="rgba(56,189,248,.26)" className="rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.07] p-6 backdrop-blur-md sm:p-7">
              <Crown size={34} className="mb-4 text-cyan-300" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300/60">20 natural ou decisão narrativa</span>
              <h3 className="mt-2 text-xl font-bold uppercase text-cyan-100" style={{ fontFamily: 'Cinzel, serif' }}>Avatar desperto</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">O Julgamento da Aptidão acontece uma vez no 5º nível. Um Avatar aprende um novo elemento nos níveis 5, 8, 11, 14, 17 e 20, até dominar os sete. Sua única derivação continua pertencendo ao elemento de origem.</p>
            </PremiumCard>
          </div>
          <div className="mx-auto mt-5 flex max-w-3xl items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left">
            <Dices size={22} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-6 text-slate-400"><strong className="text-slate-200">Regra:</strong> role 1d20 sem modificadores; apenas um 20 natural desperta o Avatar. O Mestre pode escolher um método narrativo antes da rolagem. O resultado é permanente e deve ser registrado na ficha.</p>
          </div>
        </section>

        <div className="mb-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          <PremiumCard glowColor={tema.glow} className={`rounded-2xl p-6 ${tema.bg} ${tema.border} backdrop-blur-md`}><Sparkles size={32} className={`mb-4 ${tema.icon}`} /><h2 className={`mb-2 text-lg font-bold uppercase ${tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>Polifonia Elemental</h2><p className="text-sm leading-relaxed text-slate-300">No nível 1, a habilidade fixa seu elemento de origem, libera o catálogo Elemental e concede sua primeira vaga de magia. Afinidade única sempre usa a origem; um Avatar declara qualquer elemento que já aprendeu.</p></PremiumCard>
          <PremiumCard glowColor={tema.glow} className={`rounded-2xl p-6 ${tema.bg} ${tema.border} backdrop-blur-md`}><Mountain size={32} className={`mb-4 ${tema.icon}`} /><h2 className={`mb-2 text-lg font-bold uppercase ${tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>Controle de Campo</h2><p className="text-sm leading-relaxed text-slate-300">Muralhas, prisões, deslocamentos e terreno difícil definem a luta. O papel da classe continua sendo controlar espaço, não apenas acumular dano.</p></PremiumCard>
          <PremiumCard glowColor={tema.glow} className={`rounded-2xl p-6 ${tema.bg} ${tema.border} backdrop-blur-md`}><Crown size={32} className={`mb-4 ${tema.icon}`} /><h2 className={`mb-2 text-lg font-bold uppercase ${tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>Apogeu Elemental</h2><p className="text-sm leading-relaxed text-slate-300">No nível 20, a afinidade única ganha mais potência e economia; o Avatar entra em seu Estado e alterna entre os elementos que conquistou.</p></PremiumCard>
        </div>

        <DetalhesClasse classe={classe} ocultarCatalogos={['afinidade-elemental', 'caminho-do-avatar', 'derivacao-desperta']} />

        <section className="mt-20" aria-labelledby="derivacoes-harmonicas">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/70">Elemento de origem → especialização</span><h2 id="derivacoes-harmonicas" className="mt-2 text-2xl font-black uppercase text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Derivações Harmônicas</h2></div>
            <span className="max-w-md text-xs leading-5 text-slate-400">No 12º nível, escolha uma derivação do seu elemento de origem. A comum é livre; a rara exige aprovação do Mestre após a Prova da Derivação.</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ELEMENTOS.map((elemento, indice) => {
              const opcoes = derivacoes.filter(opcao => opcao.id.startsWith(`${elemento.id}-`));
              return (
                <motion.article key={elemento.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: indice * 0.04 }} className="overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-sm" style={{ borderColor: `${elemento.cor}66`, boxShadow: `inset 0 1px 0 ${elemento.cor}25, 0 16px 45px ${elemento.cor}0d` }}>
                  <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: `${elemento.cor}35`, background: `linear-gradient(90deg, ${elemento.cor}20, transparent)` }}>
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: elemento.cor, boxShadow: `0 0 14px ${elemento.cor}` }} />
                    <strong className="text-lg text-white">{elemento.nome}</strong>
                  </div>
                  <div className="space-y-3 p-4">
                    {opcoes.map(opcao => {
                      const rara = opcao.titulo.toLocaleLowerCase('pt-BR').includes('· rara');
                      const nome = opcao.titulo.split('→')[1]?.split('·')[0]?.trim() || opcao.titulo;
                      return (
                        <div key={opcao.id} className="rounded-xl border p-4" style={{ borderColor: `${elemento.cor}${rara ? '66' : '35'}`, backgroundColor: `${elemento.cor}${rara ? '14' : '0a'}` }}>
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-sm" style={{ color: elemento.cor }}>{nome}</strong>
                            <span className="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ borderColor: `${elemento.cor}55`, color: elemento.cor }}>{rara ? 'Rara' : 'Comum'}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-400">{opcao.descricao}</p>
                        </div>
                      );
                    })}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {confrontos && (
          <section className="mt-20 pb-20" aria-labelledby="vantagens-elementais">
            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/70">Confronto direto</span>
              <h2 id="vantagens-elementais" className="mt-2 text-2xl font-black uppercase text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Vantagens e desvantagens elementais</h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">{confrontos.regra}</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="bg-white/[0.035] text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr><th className="px-5 py-4">Elemento</th><th className="px-5 py-4 text-emerald-300/70">Vantagem contra</th><th className="px-5 py-4 text-rose-300/70">Desvantagem contra</th></tr>
                </thead>
                <tbody>
                  {confrontos.entradas.map(entrada => {
                    const elemento = ELEMENTOS.find(item => item.nome === entrada.elemento);
                    const cor = elemento?.cor || '#e2e8f0';
                    return (
                      <tr key={entrada.elemento} className="border-t border-white/[0.07]">
                        <td className="px-5 py-4"><span className="inline-flex items-center gap-3 font-bold text-white"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: cor, boxShadow: `0 0 12px ${cor}` }} />{entrada.elemento}</span></td>
                        <td className="px-5 py-4 text-sm text-emerald-200">{entrada.vantagem_contra}</td>
                        <td className="px-5 py-4 text-sm text-rose-200">{entrada.desvantagem_contra}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Elementarista;
