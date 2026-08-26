import { motion } from 'framer-motion';
import { Baby, Crown, Eye, HandHeart, HeartHandshake, Landmark, Sparkles, Users } from 'lucide-react';
import type { ICaracteristicaRacial, IOpcaoRacial, IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface DivinoProps {
  raca: IRaca;
}

const ICONE_TRACO = {
  'sangue-divino': Sparkles,
  'bencao-concedida': HandHeart,
  'nome-que-se-invoca': Landmark,
  'presenca-que-pesa': Eye,
} as const;

const ICONE_ORIGEM = [Users, Baby, HeartHandshake];

function bonusComSinal(valor: unknown, rotulo: string) {
  const numero = Number(valor) || 0;
  return numero ? `${rotulo} ${numero > 0 ? '+' : ''}${numero}` : null;
}

function defesaDaNatureza(natureza: IOpcaoRacial) {
  return (natureza.caracteristicas || []).reduce((total, traco) => total + (Number(traco.defesa) || 0), 0);
}

export const Divino = ({ raca }: DivinoProps) => {
  const tema = obterTemaPorId(raca.id);
  const naturezas = (raca.naturezas_divinas || []) as IOpcaoRacial[];
  const formasDeus = (raca.formas_deus || []) as Array<{ id: string; titulo: string; descricao: string }>;
  const regraFe = raca.regra_fe as {
    descricao?: string;
    patamares?: Array<{ id: string; titulo: string; quantidade: string; efeito: string }>;
  } | undefined;
  const tracosDestaque = (raca.caracteristicas || []).filter((traco: ICaracteristicaRacial) => traco.id in ICONE_TRACO);
  const racaSomenteComDominios = { ...raca, naturezas_divinas: [] };
  const imagemFundo = typeof raca.imagem_fundo === 'string' && raca.imagem_fundo
    ? raca.imagem_fundo
    : '/assets/img/deus_bg.webp';
  const fundoDaPagina = `linear-gradient(180deg, rgba(55,31,0,0.42), rgba(37,20,0,0.82)), url('${imagemFundo}'), radial-gradient(circle at 50% 8%, #9a6700 0%, #5b3500 40%, #2b1900 82%)`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#2b1900] px-4 py-8 text-yellow-50 selection:bg-yellow-300/40 sm:px-8">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundColor: '#2b1900',
          backgroundImage: fundoDaPagina,
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,232,133,0.32),transparent_34%),radial-gradient(circle_at_12%_72%,rgba(250,190,30,0.18),transparent_40%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-25 [background-image:linear-gradient(rgba(255,238,180,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,238,180,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

      <main className="relative z-10 mx-auto max-w-6xl pb-20 pt-10 sm:pt-16">
        <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="mx-auto mb-16 max-w-4xl text-center">
          <div className={`mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-3xl border ${tema.border} ${tema.bg} backdrop-blur-md`} style={{ boxShadow: `0 0 40px ${tema.glow}` }}>
            <Crown size={44} className={tema.icon} strokeWidth={1.5} />
          </div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-amber-400/70">Raça especial · autorização do mestre</p>
          <h1 className={`mb-6 text-5xl font-bold tracking-tight ${tema.text} sm:text-7xl`} style={{ fontFamily: 'Cinzel, serif' }}>Divino</h1>
          <p className="mx-auto max-w-3xl text-base leading-8 text-yellow-50/75 sm:text-lg">{raca.descricao}</p>
        </motion.header>

        <section className="mb-20">
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-amber-400/70">A escolha mais importante</p>
            <h2 className={`mb-3 text-3xl font-bold ${tema.text} sm:text-4xl`} style={{ fontFamily: 'Cinzel, serif' }}>Deus e Semideus não são a mesma coisa</h2>
            <p className="text-base leading-7 text-yellow-50/70">{raca.descricao_naturezas_divinas}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {naturezas.map((natureza, indice) => (
              <PremiumCard key={natureza.id} glowColor={tema.glow} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: indice * 0.1 }} className={`relative overflow-hidden rounded-2xl border ${tema.border} bg-[#4a2c05]/75 p-7 backdrop-blur-md sm:p-9`}>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tema.bg} ${tema.icon}`}>
                    {natureza.id === 'deus' ? <Crown size={23} /> : <HeartHandshake size={23} />}
                  </div>
                  <h3 className={`text-2xl font-bold ${tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>{natureza.titulo}</h3>
                  <div className="ml-auto flex gap-2">
                    {[bonusComSinal(natureza.vida, 'Vida'), bonusComSinal(natureza.mana, 'Mana'), bonusComSinal(defesaDaNatureza(natureza), 'Defesa')].filter(Boolean).map(bonus => (
                      <span key={bonus} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-bold text-amber-200">{bonus}</span>
                    ))}
                  </div>
                </div>
                <p className="leading-7 text-yellow-50/80">{natureza.descricao}</p>
                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  {(natureza.caracteristicas || []).map(traco => (
                    <div key={traco.id}>
                      <h4 className="mb-1 text-sm font-bold text-amber-100">{traco.titulo}</h4>
                      <p className="text-sm leading-6 text-yellow-50/65">{traco.descricao}</p>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section className="mb-20 rounded-3xl border border-amber-200/20 bg-[#5a3708]/55 p-6 backdrop-blur-md sm:p-10">
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-amber-400/70">Somente para Deus</p>
            <h2 className={`mb-3 text-3xl font-bold ${tema.text} sm:text-4xl`} style={{ fontFamily: 'Cinzel, serif' }}>Como um Deus nasce</h2>
            <p className="leading-7 text-yellow-50/70">Existem três caminhos. Eles mudam a história do personagem, mas nenhum libera um segundo Domínio.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {formasDeus.map((forma, indice) => {
              const Icone = ICONE_ORIGEM[indice] || Sparkles;
              return (
                <article key={forma.id} className="rounded-2xl border border-amber-100/15 bg-[#3b2304]/75 p-6">
                  <Icone size={26} className="mb-5 text-amber-300" strokeWidth={1.6} />
                  <h3 className="mb-3 text-lg font-bold text-amber-100">{forma.titulo}</h3>
                  <p className="text-sm leading-6 text-yellow-50/65">{forma.descricao}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-8 max-w-4xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-amber-400/70">Somente para Deus</p>
            <h2 className={`mb-3 text-3xl font-bold ${tema.text} sm:text-4xl`} style={{ fontFamily: 'Cinzel, serif' }}>A fé aumenta seu poder, mas você não depende dela para existir</h2>
            <p className="leading-7 text-yellow-50/70">{regraFe?.descricao}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(regraFe?.patamares || []).map((patamar, indice) => (
              <article key={patamar.id} className={`rounded-2xl border p-6 backdrop-blur-md ${indice === 0 ? 'border-amber-100/15 bg-[#3b2304]/75' : `${tema.border} bg-[#5a3708]/65`}`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/55">Nível da fé {indice}</span>
                    <h3 className="mt-1 text-xl font-bold text-amber-100">{patamar.titulo}</h3>
                  </div>
                  <span className="rounded-full border border-amber-200/25 bg-[#2c1902]/60 px-3 py-1.5 text-xs font-bold text-amber-100">{patamar.quantidade}</span>
                </div>
                <p className="text-sm leading-6 text-yellow-50/75">{patamar.efeito}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-amber-400/70">Vale para os dois</p>
            <h2 className={`text-3xl font-bold ${tema.text} sm:text-4xl`} style={{ fontFamily: 'Cinzel, serif' }}>Força que todo Divino carrega</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {tracosDestaque.map((traco: ICaracteristicaRacial, indice: number) => {
              const Icone = ICONE_TRACO[traco.id as keyof typeof ICONE_TRACO];
              return (
                <PremiumCard key={traco.id} glowColor={tema.glow} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (indice % 2) * 0.08 }} className={`flex gap-5 rounded-2xl border ${tema.border} bg-[#4a2c05]/70 p-6 backdrop-blur-md`}>
                  <Icone size={30} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-amber-100">{traco.titulo}</h3>
                    <p className="text-sm leading-6 text-yellow-50/65">{traco.descricao}</p>
                  </div>
                </PremiumCard>
              );
            })}
          </div>
        </section>

        <EstagiosRaciais raca={raca} tema={tema} titulo="Crescimento Divino" descricao="Deus e Semideus usam a mesma progressão por nível total. Os nomes abaixo mostram quanto o poder está desperto; eles não mudam a natureza escolhida na criação." />
        <EscolhaRacialCards raca={racaSomenteComDominios} tema={tema} fundoCards="bg-[#4a2c05]/75" />
      </main>
    </div>
  );
};

export default Divino;
