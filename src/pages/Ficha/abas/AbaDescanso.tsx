import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  Brain,
  Check,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  Swords,
} from 'lucide-react';
import {
  CONDICOES_OFICIAIS,
  CRISES_SANIDADE,
  type ICondicaoRegra,
} from '../../../../data/regras/condicoes';
import {
  aplicarDescansoCompleto,
  aplicarRelaxamento,
  descansoPermitido,
  REGRAS_DESCANSO,
  type QualidadeDescanso,
} from '../../../services/descansoService';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  adicionarCondicaoOficial,
  condicaoAtiva,
  obterStatusFicha,
} from '../../../services/statusService';

interface AbaDescansoProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
  onOpenConditions?: () => void;
}

const ESTILO_CATEGORIA: Record<ICondicaoRegra['categoria'], string> = {
  física: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  mental: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200',
  combate: 'border-red-400/20 bg-red-400/10 text-red-200',
};

const formatarReducaoCansaco = (valor: number) => (valor >= 99 ? 'remove tudo' : `−${valor}`);

export const AbaDescanso = ({ character, onUpdate, onOpenConditions }: AbaDescansoProps) => {
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
  const [mensagem, setMensagem] = useState('');
  const regraSelecionada = useMemo(
    () => REGRAS_DESCANSO.find((item) => item.id === qualidade) || REGRAS_DESCANSO[2],
    [qualidade],
  );
  const condicoesAtivas = Array.isArray(ficha.condicoesAtivas) ? ficha.condicoesAtivas : [];
  const maximos = {
    vida: Math.max(1, Number(derivados.vida) || 10),
    mana: Math.max(0, Number(derivados.mana) || 10),
    sanidade: Math.max(1, Number(status.sanidadeMaxima) || 100),
  };

  const descansar = () => {
    if (!descansoPermitido(qualidade, isMestre)) {
      setMensagem('Descanso Excelente exige que o Mestre aplique ou autorize o resultado pela ficha.');
      return;
    }
    if (status.morto) {
      setMensagem('Personagens mortos não podem receber descanso completo. Somente uma regra explícita de retorno pode alterar esse estado.');
      return;
    }
    const proximo = aplicarDescansoCompleto(status, maximos, qualidade, tratamento);
    onUpdate(['ficha', 'status'], proximo);
    setMensagem(`Descanso ${regraSelecionada.titulo.toLocaleLowerCase('pt-BR')} aplicado.`);
  };

  const relaxar = () => {
    const dado = Math.floor(Math.random() * 6) + 1;
    const resultado = aplicarRelaxamento(
      status,
      maximos.mana,
      Number(atributos.sabedoria) || 10,
      Number(ficha.nivel) || Number(character.nivel) || 1,
      dado,
    );
    if (resultado.erro) setMensagem(resultado.erro);
    else {
      onUpdate(['ficha', 'status'], resultado.status);
      setMensagem(`Relaxamento: d6 = ${dado}; ${resultado.recuperado} Mana recuperada.`);
    }
  };

  const adicionarCansaco = () => {
    onUpdate(['ficha', 'status', 'cansacoAtual'], Math.min(6, Number(status.cansacoAtual || 0) + 1));
    setMensagem('Combate intenso registrado: +1 Cansaço. Use no máximo uma vez por cena.');
  };

  const aplicarCondicao = (regra: ICondicaoRegra) => {
    const resultado = adicionarCondicaoOficial(condicoesAtivas, regra);
    if (resultado.adicionada) {
      onUpdate(['ficha', 'condicoesAtivas'], resultado.condicoes);
      setMensagem(`${regra.titulo} foi adicionada às condições ativas.`);
    } else {
      setMensagem(`${regra.titulo} já está nas condições ativas.`);
    }
    onOpenConditions?.();
  };

  const renderCondicao = (item: ICondicaoRegra, crise = false) => {
    const ativa = condicaoAtiva(condicoesAtivas, item.id);
    return (
      <article
        key={item.id}
        className={`group flex min-h-full flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
          ativa
            ? 'border-emerald-400/30 bg-emerald-400/[0.06] shadow-[0_0_24px_rgba(52,211,153,0.06)]'
            : crise
              ? 'border-fuchsia-400/15 bg-fuchsia-400/[0.035] hover:border-fuchsia-400/30'
              : 'border-white/[0.07] bg-black/20 hover:-translate-y-0.5 hover:border-[#c7a44c]/25'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <strong className="text-sm text-white">{item.titulo}</strong>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.duracao}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${ESTILO_CATEGORIA[item.categoria]}`}>
            {item.categoria}
          </span>
        </div>

        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-gray-300">
          {item.efeitos.map((efeito) => (
            <li key={efeito} className="flex gap-2">
              <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[#c7a44c]" aria-hidden="true" />
              <span>{efeito}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <p className="border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-emerald-200/75">
            <span className="font-bold text-emerald-200">Como remover:</span> {item.remocao}
          </p>
          <button
            type="button"
            onClick={() => aplicarCondicao(item)}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
              ativa
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
                : 'border-[#c7a44c]/25 bg-[#c7a44c]/10 text-[#e1c76f] hover:border-[#c7a44c]/45 hover:bg-[#c7a44c]/15'
            }`}
          >
            {ativa ? <Check size={14} /> : <ArrowRight size={14} />}
            {ativa ? 'Ver nas condições ativas' : 'Aplicar e abrir na Ficha'}
          </button>
        </div>
      </article>
    );
  };

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
              <BedDouble className="text-[#c7a44c]" />Descanso e condições
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Recupere recursos, registre o desgaste da sessão e aplique condições oficiais diretamente na ficha.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[440px]">
            {[
              ['Vida', status.vidaAtual ?? maximos.vida, maximos.vida],
              ['Mana', status.manaAtual ?? maximos.mana, maximos.mana],
              ['Sanidade', status.sanidadeAtual ?? maximos.sanidade, maximos.sanidade],
              ['Cansaço', status.cansacoAtual ?? 0, 6],
            ].map(([label, atual, maximo]) => (
              <div key={String(label)} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
                <strong className="mt-1 block text-sm text-white">{String(atual)} <span className="font-normal text-gray-600">/ {String(maximo)}</span></strong>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0f0e15]" data-tour="descanso-completo">
        <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Escolha como foi a pausa</p>
          <h3 className="mt-1 text-lg font-bold text-white">Descanso completo</h3>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {REGRAS_DESCANSO.map((regra) => {
              const selecionada = qualidade === regra.id;
              const permitida = descansoPermitido(regra.id, isMestre);
              return (
                <button
                  key={regra.id}
                  type="button"
                  disabled={!permitida}
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
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-md bg-red-400/10 px-2 py-1 text-red-200">PV {Math.round(regra.recuperacao * 100)}%</span>
                    <span className="rounded-md bg-sky-400/10 px-2 py-1 text-sky-200">Mana {Math.round(regra.recuperacao * 100)}%</span>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-gray-500">{regra.criterio}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 rounded-2xl border border-[#c7a44c]/15 bg-[#c7a44c]/[0.045] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <strong className="text-sm text-white">Resultado de {regraSelecionada.titulo}</strong>
                <span className="text-xs text-gray-400">Sanidade +{Math.round(regraSelecionada.recuperacaoSanidade * 100)}%</span>
                <span className="text-xs text-gray-400">Cansaço {formatarReducaoCansaco(regraSelecionada.reduzCansaco)}</span>
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-gray-300">
                <input
                  type="checkbox"
                  checked={tratamento}
                  onChange={(event) => setTratamento(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#c7a44c]"
                />
                <span>Recebeu tratamento. Em descanso de qualidade Boa ou superior, reduz Ferido em 1 se o personagem voltar a ter Vida.</span>
              </label>
            </div>
            <button type="button" onClick={descansar} className="rounded-xl bg-[#c7a44c] px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-[#ddbf67]">
              Aplicar descanso
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button type="button" onClick={relaxar} className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4 text-left transition-colors hover:bg-sky-400/10">
              <Sparkles className="shrink-0 text-sky-300" size={20} />
              <span><strong className="block text-sm text-sky-100">Relaxar por 1 hora</strong><span className="mt-1 block text-xs text-gray-500">Recupera Mana uma vez entre descansos completos.</span></span>
            </button>
            <button type="button" onClick={adicionarCansaco} className="flex items-center gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-4 text-left transition-colors hover:bg-orange-400/10">
              <Swords className="shrink-0 text-orange-300" size={20} />
              <span><strong className="block text-sm text-orange-100">Registrar combate intenso</strong><span className="mt-1 block text-xs text-gray-500">Adiciona 1 Cansaço, no máximo uma vez por cena.</span></span>
            </button>
          </div>

          {mensagem && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm font-bold text-emerald-200" aria-live="polite">{mensagem}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.07] bg-[#0f0e15] p-5 sm:p-6" data-tour="descanso-condicoes">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white"><ShieldAlert size={19} className="text-orange-300" />Condições oficiais</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">Consulte o efeito e aplique a condição. O botão leva você ao painel de Condições Ativas para revisar ou editar o registro.</p>
          </div>
          <span className="self-start rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:self-auto">
            {condicoesAtivas.length} ativa(s)
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">{CONDICOES_OFICIAIS.map((item) => renderCondicao(item))}</div>
      </section>

      <section className="rounded-3xl border border-fuchsia-400/10 bg-[#0f0e15] p-5 sm:p-6" data-tour="descanso-sanidade">
        <div className="mb-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Brain size={19} className="text-fuchsia-300" />Crises de Sanidade</h3>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-500">Em Ruptura, uma nova perda exige Vontade DT 15. Na Quebra, a crise é imediata. As crises também podem ser aplicadas diretamente às condições ativas.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">{CRISES_SANIDADE.map((item) => renderCondicao(item, true))}</div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4 text-xs leading-relaxed text-gray-400">
          <HeartPulse size={17} className="mt-0.5 shrink-0 text-emerald-300" />
          Tratamento em local seguro recupera Sanidade somente pelo descanso. Ajuda profissional pode conceder vantagem contra uma crise, mas não apaga uma condição permanente sem resolução narrativa.
        </div>
      </section>
    </div>
  );
};
