import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BedDouble,
  Check,
  Moon,
  ShieldAlert,
  Sparkles,
  Swords,
} from 'lucide-react';
import {
  aplicarDescansoCompleto,
  aplicarRelaxamento,
  descansoPermitido,
  FATORES_DESCANSO,
  REGRAS_DESCANSO,
  resolverQualidadeDescanso,
  type QualidadeDescanso,
} from '../../../services/descansoService';
import { useAuthStore } from '../../../store/useAuthStore';
import { obterStatusFicha, obterTemporario } from '../../../services/statusService';
import { dispararDescanso } from '../components/descansoCena';
import { LotesDoDescanso } from '../components/LotesDoDescanso';
import { classesDaFicha } from '../../../services/progressaoFichaService';

interface AbaDescansoProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
  /** Abre outra aba da ficha (usado para levar às Condições). */
  onAbrirAba?: (aba: string) => void;
}

const formatarReducaoCansaco = (valor: number) => (valor >= 99 ? 'remove tudo' : `−${valor}`);

const COR_RECURSO = {
  Vida: { barra: 'bg-red-400', ganho: 'bg-red-300/45', texto: 'text-red-200' },
  Mana: { barra: 'bg-sky-400', ganho: 'bg-sky-300/45', texto: 'text-sky-200' },
  Estamina: { barra: 'bg-emerald-400', ganho: 'bg-emerald-300/45', texto: 'text-emerald-200' },
  Sanidade: { barra: 'bg-violet-400', ganho: 'bg-violet-300/45', texto: 'text-violet-200' },
  Cansaço: { barra: 'bg-slate-300', ganho: 'bg-slate-200/35', texto: 'text-slate-200' },
} as const;

const Passo = ({ numero, titulo, apoio, children, dataTour }: {
  numero: number;
  titulo: string;
  apoio: string;
  children: ReactNode;
  dataTour?: string;
}) => (
  <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0f0e15]" data-tour={dataTour}>
    <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c7a44c]/40 bg-[#c7a44c]/10 text-sm font-black text-[#e1c76f]">{numero}</span>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-white sm:text-lg">{titulo}</h3>
        <p className="text-xs text-gray-500">{apoio}</p>
      </div>
    </div>
    <div className="p-5 sm:p-6">{children}</div>
  </section>
);

export const AbaDescanso = ({ character, onUpdate, onAbrirAba }: AbaDescansoProps) => {
  const ficha = character.ficha || {};
  const status = obterStatusFicha(ficha);
  const usuario = useAuthStore((state) => state.usuario);
  const campanha = useAuthStore((state) => state.campanhaAtiva);
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador'
    || campanha?.papel === 'mestre' || campanha?.papel === 'assistente';
  const atributos = ficha.atributosFinais || character.atributosFinais || {};
  const derivados = character.derivados || ficha.derivados || {};
  const [qualidade, setQualidade] = useState<QualidadeDescanso>('boa');
  const [tratamento, setTratamento] = useState(false);
  const [fatores, setFatores] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState('');
  const resolucao = useMemo(
    () => resolverQualidadeDescanso(qualidade, fatores, isMestre),
    [qualidade, fatores, isMestre],
  );
  // A regra que vale é a da qualidade final, depois das circunstâncias.
  const regraSelecionada = useMemo(
    () => REGRAS_DESCANSO.find((item) => item.id === resolucao.qualidade) || REGRAS_DESCANSO[2],
    [resolucao.qualidade],
  );
  const regraBase = useMemo(
    () => REGRAS_DESCANSO.find((item) => item.id === qualidade) || REGRAS_DESCANSO[2],
    [qualidade],
  );
  const alternarFator = (id: string) => setFatores((atuais) => (
    atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]
  ));
  const maximos = {
    vida: Math.max(1, Number(derivados.vida) || 10),
    mana: Math.max(0, Number(derivados.mana) || 10),
    estamina: Math.max(1, Number(derivados.estamina) || 1),
    sanidade: Math.max(1, Number(status.sanidadeMaxima) || 100),
  };
  const condicoesAtivas = Array.isArray(ficha.condicoesAtivas) ? ficha.condicoesAtivas.length : 0;
  const aflicoesAtivas = Array.isArray(ficha.aflicoesAtivas) ? ficha.aflicoesAtivas.length : 0;

  // Mesma conta do botão "Aplicar": a prévia nunca promete o que o descanso não entrega.
  const previa = useMemo(
    () => aplicarDescansoCompleto(status, maximos, resolucao.qualidade, tratamento),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, maximos.vida, maximos.mana, maximos.estamina, maximos.sanidade, resolucao.qualidade, tratamento],
  );
  const recursos = [
    { rotulo: 'Vida', antes: Number(status.vidaAtual ?? maximos.vida), depois: Number(previa.vidaAtual), maximo: maximos.vida, cor: 'linear-gradient(90deg,#b91c1c,#f87171)' },
    { rotulo: 'Mana', antes: Number(status.manaAtual ?? maximos.mana), depois: Number(previa.manaAtual), maximo: maximos.mana, cor: 'linear-gradient(90deg,#0369a1,#7dd3fc)' },
    { rotulo: 'Estamina', antes: Number(status.estaminaAtual ?? maximos.estamina), depois: Number(previa.estaminaAtual), maximo: maximos.estamina, cor: 'linear-gradient(90deg,#047857,#6ee7b7)' },
    { rotulo: 'Sanidade', antes: Number(status.sanidadeAtual ?? maximos.sanidade), depois: Number(previa.sanidadeAtual), maximo: maximos.sanidade, cor: 'linear-gradient(90deg,#6d28d9,#c4b5fd)' },
    { rotulo: 'Cansaço', antes: Number(status.cansacoAtual ?? 0), depois: Number(previa.cansacoAtual), maximo: 6, cor: 'linear-gradient(90deg,#475569,#cbd5e1)', inverso: true },
  ] as const;

  const descansar = () => {
    if (!descansoPermitido(qualidade, isMestre)) {
      setMensagem('Descanso Excelente exige que o Mestre aplique ou autorize o resultado pela ficha.');
      return;
    }
    if (status.morto) {
      setMensagem('Personagens mortos não podem receber descanso completo. Somente uma regra explícita de retorno pode alterar esse estado.');
      return;
    }
    const extrasPerdidos = (['vidaAtual', 'manaAtual', 'estaminaAtual', 'sanidadeAtual'] as const)
      .map((campo) => ({ campo, valor: obterTemporario(status, campo) }))
      .filter((item) => item.valor > 0);
    dispararDescanso({
      qualidade: resolucao.qualidade,
      titulo: regraSelecionada.titulo,
      recursos: recursos.map((recurso) => ({ ...recurso })),
    });
    onUpdate(['ficha', 'status'], previa);
    // Cada descanso completo reabre o pagamento do lote de Alquimia, Engenharia e Cozinha.
    onUpdate(['ficha', 'contadorDescansos'], Math.max(0, Math.trunc(Number(ficha.contadorDescansos) || 0)) + 1);
    const rotuloExtra: Record<string, string> = { vidaAtual: 'Vida', manaAtual: 'Mana', estaminaAtual: 'Estamina', sanidadeAtual: 'Sanidade' };
    const partes = [`Descanso ${regraSelecionada.titulo.toLocaleLowerCase('pt-BR')} aplicado.`];
    if (resolucao.ajustes.length) {
      partes.push(`Base ${regraBase.titulo.toLocaleLowerCase('pt-BR')}, ${resolucao.passos > 0 ? '+' : ''}${resolucao.passos} pelas circunstâncias.`);
    }
    if (extrasPerdidos.length) {
      partes.push(`Extra temporário acabou: ${extrasPerdidos.map((item) => `${rotuloExtra[item.campo]} +${item.valor}`).join(', ')}.`);
    }
    setMensagem(partes.join(' '));
    setFatores([]);
  };

  const relaxar = () => {
    const dado = Math.floor(Math.random() * 6) + 1;
    const resultado = aplicarRelaxamento(
      status,
      maximos.mana,
      Number(atributos.sabedoria) || 10,
      Number(ficha.nivel) || Number(character.nivel) || 1,
      dado,
      maximos.estamina,
    );
    if (resultado.erro) setMensagem(resultado.erro);
    else {
      onUpdate(['ficha', 'status'], resultado.status);
      setMensagem(`Relaxamento: d6 = ${dado}; ${resultado.recuperado} Mana e ${resultado.recuperadoEstamina} Estamina recuperadas.`);
    }
  };

  const adicionarCansaco = () => {
    onUpdate(['ficha', 'status', 'cansacoAtual'], Math.min(6, Number(status.cansacoAtual || 0) + 1));
    setMensagem('Combate intenso registrado: +1 Cansaço. Use no máximo uma vez por cena.');
  };

  const porcento = (valor: number, maximo: number) => Math.max(0, Math.min(100, (valor / Math.max(1, maximo)) * 100));

  return (
    <div className="space-y-6">
      <header
        className="relative overflow-hidden rounded-3xl border border-[#c7a44c]/15 bg-[#0f0e15] p-5 sm:p-7"
        data-tour="descanso-resumo"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(199,164,76,0.13),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.07),transparent_38%)]" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c7a44c]">Recuperação do personagem</p>
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>
              <BedDouble className="text-[#c7a44c]" />Descanso
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Siga os três passos: diga como foi a pausa, marque o que aconteceu e confira o que volta antes de aplicar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:min-w-[520px]">
            {recursos.map((recurso) => (
              <div key={recurso.rotulo} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">{recurso.rotulo}</span>
                <strong className="mt-1 block text-sm text-white">{recurso.antes} <span className="font-normal text-gray-600">/ {recurso.maximo}</span></strong>
              </div>
            ))}
          </div>
        </div>
      </header>

      <Passo numero={1} titulo="Como foi a pausa?" apoio="Escolha a qualidade que mais se parece com o que o grupo viveu." dataTour="descanso-completo">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {REGRAS_DESCANSO.map((regra) => {
            const selecionada = qualidade === regra.id;
            const permitida = descansoPermitido(regra.id, isMestre);
            return (
              <button
                key={regra.id}
                type="button"
                disabled={!permitida}
                aria-pressed={selecionada}
                title={!permitida ? 'Exige aplicação ou autorização do Mestre.' : undefined}
                onClick={() => setQualidade(regra.id)}
                className={`relative rounded-2xl border p-4 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                  selecionada
                    ? 'border-[#c7a44c]/60 bg-[#c7a44c]/10 shadow-[0_0_24px_rgba(199,164,76,0.07)]'
                    : 'border-white/[0.07] bg-black/20 hover:border-white/15 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className={selecionada ? 'text-[#e1c76f]' : 'text-white'}>{regra.titulo}</strong>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selecionada ? 'border-[#c7a44c] bg-[#c7a44c] text-black' : 'border-white/15 text-transparent'}`}>
                    <Check size={12} />
                  </span>
                </div>
                <p className="mt-2 text-xl font-black text-white">{Math.round(regra.recuperacao * 100)}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">de Vida, Mana e Estamina</p>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{regra.criterio}</p>
              </button>
            );
          })}
        </div>
      </Passo>

      <Passo numero={2} titulo="O que aconteceu durante o descanso?" apoio="Opcional. Cada item marcado move a qualidade um degrau. O Mestre pode negar qualquer um." dataTour="descanso-circunstancias">
        <div className="grid gap-4 md:grid-cols-2">
          {([-1, 1] as const).map((lado) => (
            <div key={lado}>
              <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.2em] ${lado < 0 ? 'text-red-300/80' : 'text-emerald-300/80'}`}>
                {lado < 0 ? 'Deixa pior' : 'Deixa melhor'}
              </p>
              <div className="flex flex-col gap-1.5">
                {FATORES_DESCANSO.filter((fator) => fator.efeito === lado).map((fator) => {
                  const marcado = fatores.includes(fator.id);
                  return (
                    <button
                      key={fator.id}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => alternarFator(fator.id)}
                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                        marcado
                          ? (lado < 0 ? 'border-red-400/40 bg-red-400/10' : 'border-emerald-400/40 bg-emerald-400/10')
                          : 'border-white/[0.06] bg-black/20 hover:border-white/15 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        marcado
                          ? (lado < 0 ? 'border-red-300 bg-red-300 text-black' : 'border-emerald-300 bg-emerald-300 text-black')
                          : 'border-white/20 text-transparent'
                      }`}>
                        <Check size={11} />
                      </span>
                      <span>
                        <strong className={`block text-xs ${marcado ? 'text-white' : 'text-gray-200'}`}>{fator.titulo}</strong>
                        <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{fator.descricao}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {fatores.length > 0 && (
          <button type="button" onClick={() => setFatores([])} className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-white">
            Limpar circunstâncias
          </button>
        )}
      </Passo>

      <Passo numero={3} titulo="Confira e aplique" apoio="A prévia usa a mesma conta do botão: o que você vê é o que volta." dataTour="descanso-resultado">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a44c]/35 bg-[#c7a44c]/10 px-3 py-1.5 text-sm font-bold text-[#e1c76f]">
            <Moon size={14} /> Descanso {regraSelecionada.titulo.toLocaleLowerCase('pt-BR')}
          </span>
          {resolucao.ajustes.length > 0 && (
            <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${resolucao.passos < 0 ? 'bg-red-400/10 text-red-200' : resolucao.passos > 0 ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/5 text-gray-300'}`}>
              {regraBase.titulo} {resolucao.passos > 0 ? '+' : ''}{resolucao.passos} degrau(s)
              {resolucao.limitada ? ' · limite da qualidade' : ''}
            </span>
          )}
          <span className="text-xs text-gray-400">Sanidade +{Math.round(regraSelecionada.recuperacaoSanidade * 100)}%</span>
          <span className="text-xs text-gray-400">Cansaço {formatarReducaoCansaco(regraSelecionada.reduzCansaco)}</span>
        </div>

        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {recursos.map((recurso) => {
            const cor = COR_RECURSO[recurso.rotulo];
            const inverso = 'inverso' in recurso && recurso.inverso;
            const base = porcento(inverso ? recurso.depois : recurso.antes, recurso.maximo);
            const topo = porcento(inverso ? recurso.antes : recurso.depois, recurso.maximo);
            const mudou = recurso.depois !== recurso.antes;
            return (
              <li key={recurso.rotulo} className="rounded-2xl border border-white/[0.07] bg-black/20 p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${cor.texto}`}>{recurso.rotulo}</span>
                  <span className="text-[10px] text-gray-600">máx. {recurso.maximo}</span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-white">
                  {recurso.antes}
                  <ArrowRight size={12} className="mx-1.5 inline text-gray-600" aria-hidden="true" />
                  <span className={mudou ? cor.texto : 'text-gray-400'}>{recurso.depois}</span>
                </p>
                <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                  <span className={`absolute inset-y-0 left-0 rounded-full ${cor.ganho}`} style={{ width: `${Math.max(base, topo)}%` }} />
                  <span className={`absolute inset-y-0 left-0 rounded-full ${cor.barra}`} style={{ width: `${Math.min(base, topo)}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] text-gray-600">
                  {mudou
                    ? (inverso ? `−${recurso.antes - recurso.depois}` : `+${recurso.depois - recurso.antes}`)
                    : 'sem mudança'}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 grid gap-4 rounded-2xl border border-[#c7a44c]/15 bg-[#c7a44c]/[0.045] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-gray-300">
              <input
                type="checkbox"
                checked={tratamento}
                onChange={(event) => setTratamento(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#c7a44c]"
              />
              <span>Recebeu tratamento. Em descanso de qualidade Boa ou superior, reduz Ferido em 1 se o personagem voltar a ter Vida.</span>
            </label>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
              O extra temporário de Vida, Mana, Estamina e Sanidade acaba com o descanso.
            </p>
          </div>
          <button type="button" onClick={descansar} className="rounded-xl bg-[#c7a44c] px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-[#ddbf67]">
            Aplicar descanso
          </button>
        </div>

        {mensagem && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm font-bold text-emerald-200" aria-live="polite">{mensagem}</p>}
      </Passo>

      <section className="rounded-3xl border border-white/[0.07] bg-[#0f0e15] p-5 sm:p-6" data-tour="descanso-pausas">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Fora do descanso completo</p>
        <h3 className="mt-1 text-lg font-bold text-white">Pausas rápidas</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button type="button" onClick={relaxar} className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4 text-left transition-colors hover:bg-sky-400/10">
            <Sparkles className="shrink-0 text-sky-300" size={20} />
            <span><strong className="block text-sm text-sky-100">Relaxar por 1 hora</strong><span className="mt-1 block text-xs text-gray-500">Recupera Mana e Estamina uma vez entre descansos completos.</span></span>
          </button>
          <button type="button" onClick={adicionarCansaco} className="flex items-center gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-4 text-left transition-colors hover:bg-orange-400/10">
            <Swords className="shrink-0 text-orange-300" size={20} />
            <span><strong className="block text-sm text-orange-100">Registrar combate intenso</strong><span className="mt-1 block text-xs text-gray-500">Adiciona 1 Cansaço, no máximo uma vez por cena. Na Sessão ao Vivo isso acontece sozinho quando o combate termina; use o botão só fora dela.</span></span>
          </button>
        </div>
      </section>

      <LotesDoDescanso
        ficha={ficha}
        classes={classesDaFicha(ficha).map((item) => ({ classeId: String(item.classe.id), nivel: item.nivel }))}
        onUpdate={onUpdate}
      />

      {onAbrirAba && (
        <button
          type="button"
          onClick={() => onAbrirAba('Condições')}
          className="group flex w-full items-center gap-4 rounded-3xl border border-red-400/15 bg-red-400/[0.035] p-5 text-left transition-colors hover:border-red-400/30 hover:bg-red-400/[0.06]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/25 bg-black/25 text-red-300"><ShieldAlert size={20} /></span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm text-white">Lesões, venenos ou crises de Sanidade?</strong>
            <span className="mt-0.5 block text-xs text-gray-500">
              {condicoesAtivas + aflicoesAtivas > 0
                ? `Há ${condicoesAtivas} condição(ões) e ${aflicoesAtivas} aflição(ões) em curso. O descanso não as remove sozinho: veja como tratar na aba Condições.`
                : 'Condições e aflições têm aba própria, com catálogo para aplicar e tratar.'}
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-gray-600 transition-colors group-hover:text-red-300" />
        </button>
      )}
    </div>
  );
};
