import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  Droplets,
  Flame,
  RotateCcw,
  Snowflake,
  Thermometer,
  UtensilsCrossed,
  Wind,
} from 'lucide-react';
import { CONDICOES_OFICIAIS, type ICondicaoRegra } from '../../../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../../../data/regras/condicoes-longo-prazo';
import {
  DADOS_MAXIMOS_DE_QUEDA,
  DT_CAIR_DE_PE,
  GRAUS_DE_CLIMA,
  dadosDeQueda,
  diasDeFolgaSemComida,
  type GrauDeClima,
} from '../../../../data/regras/perigosAmbiente';
import {
  apagarSemAr,
  consequenciaDoClima,
  custoDaRodadaSemAr,
  dtDaRodadaSufocando,
  fimDoDiaSemBeber,
  fimDoDiaSemComer,
  fomeOuSedePesando,
  gastarFolego,
  morrendoSemAr,
  normalizarAmbiente,
  racoesNoInventario,
  resumoDoClima,
  type IAmbienteFicha,
  type RodadaSemAr,
} from '../../../services/ambienteFichaService';
import { modificador } from '../../../services/calculoService';
import { ajusteDeDtDoNivel } from '../../../services/curvaCriatura';
import { nivelTotalFicha } from '../../../services/progressaoFichaService';
import {
  adicionarCondicaoOficial,
  atualizarStatusVital,
  condicaoAtiva,
  obterStatusFicha,
  type IStatusVital,
} from '../../../services/statusService';
import { LinkDaRegra } from '../../../components/ui/LinkDaRegra';

interface AmbienteSectionProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
}

const CANSACO_MAXIMO = 6;

const Cartao = ({ icone, titulo, apoio, secao, children }: { icone: ReactNode; titulo: string; apoio: string; secao: string; children: ReactNode }) => (
  <section className="flex flex-col rounded-3xl border border-white/[0.07] bg-[#0f0e15] p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{icone}{titulo}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{apoio}</p>
      </div>
      <LinkDaRegra topico="perigos" secao={secao} />
    </div>
    <div className="flex flex-1 flex-col gap-3">{children}</div>
  </section>
);

const Botao = ({ onClick, children, tom = 'neutro', disabled }: { onClick: () => void; children: ReactNode; tom?: 'neutro' | 'perigo' | 'bom'; disabled?: boolean }) => {
  const estilo = {
    neutro: 'border-white/10 bg-black/25 text-gray-200 hover:border-[#c7a44c]/40 hover:text-white',
    perigo: 'border-red-400/25 bg-red-400/10 text-red-100 hover:border-red-400/45',
    bom: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:border-emerald-400/45',
  }[tom];
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 ${estilo}`}>
      {children}
    </button>
  );
};

const Alternar = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    aria-pressed={ativo}
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${ativo ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#f0d892]' : 'border-white/10 bg-black/20 text-gray-400 hover:text-white'}`}
  >
    {children}
  </button>
);

const Linha = ({ rotulo, valor }: { rotulo: string; valor: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2 text-xs">
    <span className="text-gray-500">{rotulo}</span>
    <strong className="text-right text-gray-100">{valor}</strong>
  </div>
);

export const AmbienteSection = ({ character, onUpdate }: AmbienteSectionProps) => {
  const ficha = character.ficha || {};
  // As DTs de perigo do livro são do nível 1; a ficha soma o ajuste do nível.
  const ajusteDeDt = ajusteDeDtDoNivel(Math.max(1, nivelTotalFicha(ficha)));
  const status = obterStatusFicha(ficha);
  const ambiente = useMemo(() => normalizarAmbiente(ficha.ambiente), [ficha.ambiente]);
  const derivados = character.derivados || ficha.derivados || {};
  const atributos = ficha.atributosFinais || character.atributosFinais || {};
  const vidaMaxima = Math.max(1, Number(derivados.vida) || 10);
  const estaminaMaxima = Math.max(1, Number(derivados.estamina) || 1);
  const constituicao = Number(atributos.constituicao) || 10;
  const modConstituicao = modificador(constituicao);
  const cansaco = Math.max(0, Math.min(CANSACO_MAXIMO, Number(status.cansacoAtual) || 0));
  const estamina = Math.max(0, Number(status.estaminaAtual ?? estaminaMaxima) || 0);
  const condicoesAtivas = Array.isArray(ficha.condicoesAtivas) ? ficha.condicoesAtivas : [];
  const [mensagem, setMensagem] = useState('');
  const [altura, setAltura] = useState(6);
  const [danoQueda, setDanoQueda] = useState('');

  const salvarAmbiente = (proximo: IAmbienteFicha) => onUpdate(['ficha', 'ambiente'], proximo);
  const salvarStatus = (proximo: IStatusVital, texto: string) => {
    onUpdate(['ficha', 'status'], proximo);
    setMensagem(texto);
  };
  const comCansaco = (base: IStatusVital, quanto: number): IStatusVital => (
    quanto > 0 ? { ...base, cansacoAtual: Math.min(CANSACO_MAXIMO, (Number(base.cansacoAtual) || 0) + quanto) } : base
  );
  const comDano = (base: IStatusVital, dano: number): IStatusVital => (
    dano > 0 ? atualizarStatusVital(base, 'vidaAtual', -dano, vidaMaxima, constituicao) : base
  );
  const aplicarCondicao = (lista: readonly ICondicaoRegra[], id: string) => {
    const regra = lista.find((item) => item.id === id);
    if (!regra) return;
    const resultado = adicionarCondicaoOficial(condicoesAtivas, regra);
    if (resultado.adicionada) onUpdate(['ficha', 'condicoesAtivas'], resultado.condicoes);
  };

  // ---------------------------------------------------------------- clima
  const clima = ambiente.clima;
  const resumoClima = resumoDoClima(clima, vidaMaxima);
  const mudarClima = (parcial: Partial<IAmbienteFicha['clima']>) => salvarAmbiente({ ...ambiente, clima: { ...clima, ...parcial } });
  const falhaNoClima = (critica: boolean) => {
    const consequencia = consequenciaDoClima(clima, vidaMaxima, { critica });
    const partes = [
      consequencia.cansaco ? `+${consequencia.cansaco} Cansaço` : '',
      consequencia.dano ? `${consequencia.dano} de dano de ${clima.tipo === 'frio' ? 'Frio' : 'Calor'}` : '',
      consequencia.condicao ? 'Congelamento' : '',
    ].filter(Boolean);
    if (consequencia.condicao) aplicarCondicao(CONDICOES_LONGO_PRAZO, consequencia.condicao);
    salvarStatus(comDano(comCansaco(status, consequencia.cansaco), consequencia.dano), partes.length ? `Clima: ${partes.join(', ')}.` : 'O clima não cobrou nada agora.');
  };

  // ---------------------------------------------------------- fome e sede
  const fome = ambiente.fome;
  const folga = diasDeFolgaSemComida(modConstituicao);
  const racoes = racoesNoInventario(character.inventarioCentral);
  const pesando = fomeOuSedePesando(fome, modConstituicao);
  const diaSemComer = () => {
    const resultado = fimDoDiaSemComer(fome, modConstituicao);
    salvarAmbiente({ ...ambiente, fome: resultado.fome });
    salvarStatus(comCansaco(status, resultado.cansaco), resultado.cansaco
      ? `Mais um dia sem comer (${resultado.fome.diasSemComer}): +1 Cansaço.`
      : `Dia ${resultado.fome.diasSemComer} sem comer. O corpo ainda aguenta ${folga - resultado.fome.diasSemComer} dia(s) sem efeito.`);
  };
  const diaSemBeber = () => {
    const resultado = fimDoDiaSemBeber(fome);
    salvarAmbiente({ ...ambiente, fome: resultado.fome });
    salvarStatus(comCansaco(status, resultado.cansaco), `Mais um dia sem água (${resultado.fome.diasSemBeber}): +1 Cansaço.`);
  };
  const comeu = () => {
    salvarAmbiente({ ...ambiente, fome: { ...fome, diasSemComer: 0 } });
    setMensagem('Comeu. O Cansaço da fome sai no próximo descanso, como qualquer outro.');
  };
  const bebeu = () => {
    salvarAmbiente({ ...ambiente, fome: { ...fome, diasSemBeber: 0 } });
    setMensagem('Bebeu. O Cansaço da sede sai no próximo descanso, como qualquer outro.');
  };

  // ---------------------------------------------------------------- fôlego
  const folego = ambiente.folego;
  const sufocando = folego.semAr && estamina <= 0;
  const pulmoes = condicaoAtiva(condicoesAtivas, 'pulmoes-danificados');
  const rodadaSemAr = (tipo: RodadaSemAr) => {
    const resultado = gastarFolego(status, estaminaMaxima, tipo);
    salvarAmbiente({ ...ambiente, folego: { ...folego, semAr: true } });
    if (resultado.sufocando) {
      setMensagem('A Estamina acabou: agora cada rodada pede Fortitude.');
      return;
    }
    const custo = Number(status.estaminaAtual ?? estaminaMaxima) - Number(resultado.status.estaminaAtual);
    salvarStatus(resultado.status, `Rodada sem ar: −${custo} Estamina.${Number(resultado.status.estaminaAtual) <= 0 ? ' Acabou o fôlego.' : ''}`);
  };
  const passouFortitude = () => {
    salvarAmbiente({ ...ambiente, folego: { semAr: true, rodadasSufocando: folego.rodadasSufocando + 1 } });
    setMensagem(`Aguentou mais uma rodada. A próxima pede DT ${dtDaRodadaSufocando(folego.rodadasSufocando + 1, ajusteDeDt)}.`);
  };
  const falhouFortitude = () => {
    aplicarCondicao(CONDICOES_OFICIAIS, 'inconsciente');
    salvarAmbiente({ ...ambiente, folego: { semAr: true, rodadasSufocando: folego.rodadasSufocando + 1 } });
    salvarStatus(apagarSemAr(status, vidaMaxima, constituicao), 'Apagou: Inconsciente, Vida a 0 e Morrendo 1. Enquanto continuar sem ar, o Morrendo sobe sozinho.');
  };
  const fimDeTurnoApagado = () => salvarStatus(morrendoSemAr(status, constituicao), 'Mais um turno sem ar: Morrendo +1, sem teste.');
  const voltouARespirar = () => {
    salvarAmbiente({ ...ambiente, folego: { semAr: false, rodadasSufocando: 0 } });
    setMensagem('Voltou a respirar. Se apagou, segue a regra normal de Morrendo; a Estamina volta no descanso.');
  };

  // ----------------------------------------------------------------- queda
  const dadosQueda = dadosDeQueda(altura);
  const aplicarQueda = () => {
    const dano = Math.max(0, Math.trunc(Number(danoQueda) || 0));
    if (!dano) return;
    const trauma = dano >= vidaMaxima / 2 ? ' Tirou metade da Vida ou mais: role na tabela de trauma.' : '';
    salvarStatus(comDano(status, dano), `Queda: ${dano} de impacto.${trauma}`);
    setDanoQueda('');
  };

  const nomeDoGrau = (id: GrauDeClima | null) => (id ? GRAUS_DE_CLIMA.find((grau) => grau.id === id)?.titulo : 'Ameno');

  return (
    <div className="space-y-4" data-tour="condicoes-ambiente">
      <div className="flex flex-col gap-2 rounded-2xl border border-sky-300/10 bg-sky-300/[0.04] p-4 text-xs leading-relaxed text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>O que o lugar cobra de quem passa por ele. Marque o que está acontecendo e use os botões quando o teste falhar: a ficha aplica o Cansaço, o dano e a condição que a regra manda.</p>
        <LinkDaRegra topico="perigos" rotulo="Perigos do Ambiente" />
      </div>
      {mensagem ? <p role="status" className="rounded-xl border border-[#c7a44c]/20 bg-[#c7a44c]/[0.06] px-4 py-2.5 text-xs text-[#f0d892]">{mensagem}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao icone={<Thermometer size={18} className="text-sky-300" />} titulo="Clima" apoio="Frio e calor de ambiente, pelo grau do lugar." secao="Clima">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Grau do clima">
            {[null, ...GRAUS_DE_CLIMA.map((grau) => grau.id)].map((id) => (
              <Alternar key={id ?? 'ameno'} ativo={clima.grau === id} onClick={() => mudarClima({ grau: id })}>{nomeDoGrau(id)}</Alternar>
            ))}
          </div>
          {clima.grau ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Alternar ativo={clima.tipo === 'frio'} onClick={() => mudarClima({ tipo: 'frio' })}><Snowflake size={12} className="mr-1 inline" />Frio</Alternar>
                <Alternar ativo={clima.tipo === 'calor'} onClick={() => mudarClima({ tipo: 'calor' })}><Flame size={12} className="mr-1 inline" />Calor</Alternar>
                <span className="mx-1 w-px self-stretch bg-white/10" aria-hidden="true" />
                <Alternar ativo={clima.roupaCerta} onClick={() => mudarClima({ roupaCerta: !clima.roupaCerta })}>Roupa certa</Alternar>
                <Alternar ativo={clima.traje} onClick={() => mudarClima({ traje: !clima.traje })}>Traje</Alternar>
                <Alternar ativo={clima.abrigo} onClick={() => mudarClima({ abrigo: !clima.abrigo })}>Abrigo</Alternar>
              </div>
              <Linha rotulo="Vale agora" valor={resumoClima.efetivo ? resumoClima.efetivo.titulo : 'Sem efeito'} />
              {resumoClima.efetivo ? (
                <Linha
                  rotulo={resumoClima.efetivo.dt === null ? 'No fim de cada turno' : `Fortitude DT ${resumoClima.efetivo.dt + ajusteDeDt}`}
                  valor={resumoClima.efetivo.dt === null ? `${resumoClima.dano} de dano` : resumoClima.efetivo.intervalo}
                />
              ) : null}
              {resumoClima.protecao ? <p className="text-[11px] text-sky-200/70">{resumoClima.protecao}</p> : null}
              {resumoClima.efetivo ? (
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {resumoClima.efetivo.dt === null ? (
                    <Botao tom="perigo" onClick={() => falhaNoClima(false)}>Fim do turno: −{resumoClima.dano} Vida</Botao>
                  ) : (
                    <>
                      <Botao tom="perigo" onClick={() => falhaNoClima(false)}>Falhou no teste</Botao>
                      {resumoClima.efetivo.id === 'extremo' ? <Botao tom="perigo" onClick={() => falhaNoClima(true)}>Falha crítica</Botao> : null}
                    </>
                  )}
                </div>
              ) : null}
              {resumoClima.efetivo && !clima.abrigo ? <p className="text-[11px] text-gray-600">Dormir sem abrigo no Severo ou pior deixa o descanso Péssimo.</p> : null}
            </>
          ) : (
            <p className="text-xs text-gray-500">Tempo comum, sem teste. Escolha um grau quando o lugar castigar.</p>
          )}
        </Cartao>

        <Cartao icone={<UtensilsCrossed size={18} className="text-amber-300" />} titulo="Fome e sede" apoio="Uma porção de comida e uns 4 litros de água por dia." secao="Fome e sede">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Dias sem comer</span>
              <strong className="mt-1 block text-2xl text-white" style={{ fontFamily: 'Cinzel, serif' }}>{fome.diasSemComer}</strong>
              <span className="text-[10px] text-gray-600">aguenta {folga} sem efeito</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Dias sem beber</span>
              <strong className="mt-1 block text-2xl text-white" style={{ fontFamily: 'Cinzel, serif' }}>{fome.diasSemBeber}</strong>
              <span className="text-[10px] text-gray-600">cada dia, +1 Cansaço</span>
            </div>
          </div>
          <Linha rotulo="Rações de viagem no inventário" valor={racoes} />
          <div className="grid grid-cols-2 gap-2">
            <Botao tom="perigo" onClick={diaSemComer}><UtensilsCrossed size={12} className="mr-1 inline" />Dia sem comer</Botao>
            <Botao tom="bom" onClick={comeu} disabled={!fome.diasSemComer}>Comeu</Botao>
            <Botao tom="perigo" onClick={diaSemBeber}><Droplets size={12} className="mr-1 inline" />Dia sem beber</Botao>
            <Botao tom="bom" onClick={bebeu} disabled={!fome.diasSemBeber}>Bebeu</Botao>
          </div>
          {pesando ? <p className="text-[11px] text-amber-200/80">Enquanto a fome ou a sede continuam, o Cansaço delas não sai no descanso.</p> : null}
          {pesando && cansaco >= CANSACO_MAXIMO ? <p className="text-[11px] font-bold text-red-300">Colapso por fome ou sede: sem comida e água até o fim do dia seguinte, o personagem morre.</p> : null}
        </Cartao>

        <Cartao icone={<Wind size={18} className="text-cyan-300" />} titulo="Fôlego" apoio="Sem ar, o corpo paga com a Estamina." secao="Fôlego">
          <div className="grid grid-cols-3 gap-2 text-center">
            {([['Normal', 'normal'], ['Com esforço', 'esforco'], ['De surpresa', 'surpresa']] as const).map(([rotulo, tipo]) => (
              <div key={tipo} className="rounded-xl border border-white/[0.06] bg-black/20 px-2 py-2.5">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">{rotulo}</span>
                <strong className="mt-1 block text-base text-white">−{custoDaRodadaSemAr(estaminaMaxima, tipo)}</strong>
              </div>
            ))}
          </div>
          <Linha rotulo="Estamina agora" valor={`${estamina} de ${estaminaMaxima}`} />
          {!sufocando ? (
            <div className="grid grid-cols-3 gap-2">
              <Botao onClick={() => rodadaSemAr('normal')} disabled={estamina <= 0 && folego.semAr}>Rodada sem ar</Botao>
              <Botao onClick={() => rodadaSemAr('esforco')} disabled={estamina <= 0 && folego.semAr}>Com esforço</Botao>
              <Botao onClick={() => rodadaSemAr('surpresa')} disabled={estamina <= 0 && folego.semAr}>De surpresa</Botao>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3">
              <p className="text-xs font-bold text-red-100">Sufocando: Fortitude DT {dtDaRodadaSufocando(folego.rodadasSufocando, ajusteDeDt)} no fim do turno{pulmoes ? ', com desvantagem (Pulmões Danificados)' : ''}.</p>
              <div className="flex flex-wrap gap-2">
                <Botao tom="bom" onClick={passouFortitude}>Passou</Botao>
                <Botao tom="perigo" onClick={falhouFortitude}>Falhou: apagou</Botao>
                <Botao tom="perigo" onClick={fimDeTurnoApagado} disabled={!(Number(status.morrendo) > 0)}>Turno apagado: Morrendo +1</Botao>
              </div>
            </div>
          )}
          {folego.semAr ? (
            <div className="mt-auto pt-1">
              <Botao tom="bom" onClick={voltouARespirar}><RotateCcw size={12} className="mr-1 inline" />Voltou a respirar</Botao>
            </div>
          ) : null}
        </Cartao>

        <Cartao icone={<ArrowDownToLine size={18} className="text-rose-300" />} titulo="Queda" apoio="1d6 de impacto a cada 3 m, até 20d6." secao="Queda">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-gray-400">
            Altura da queda (m)
            <input
              type="number"
              min={0}
              max={999}
              value={altura}
              onChange={(evento) => setAltura(Math.max(0, Number(evento.target.value) || 0))}
              className="w-20 rounded-lg border border-white/10 bg-[#0b0a10] px-2 py-1 text-right text-sm font-bold text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <Linha rotulo="Dano" valor={dadosQueda ? `${dadosQueda}d6 de impacto${dadosQueda >= DADOS_MAXIMOS_DE_QUEDA ? ' (teto)' : ''}` : 'Nenhum (fica Caído se não quis cair)'} />
          <p className="text-[11px] leading-relaxed text-gray-500">Chão macio corta pela metade. Quem pulou por vontade própria testa Acrobacia DT {DT_CAIR_DE_PE + ajusteDeDt}: o sucesso tira 1d6 e cai de pé.</p>
          <div className="mt-auto flex gap-2 pt-1">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Dano rolado"
              value={danoQueda}
              onChange={(evento) => setDanoQueda(evento.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b0a10] px-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
              aria-label="Dano da queda já rolado"
            />
            <Botao tom="perigo" onClick={aplicarQueda} disabled={!Number(danoQueda)}>Aplicar dano</Botao>
          </div>
        </Cartao>
      </div>
    </div>
  );
};
