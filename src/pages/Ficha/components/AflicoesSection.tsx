import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Dices, FlaskConical, Minus, Plus, RefreshCw, ShieldCheck, Skull, X } from 'lucide-react';
import { CATALOGO_AFLICOES, REGIOES_AFLICAO, type IAflicao } from '../../../../data/regras/aflicoes';
import { carregarCatalogo } from '../../../services/catalogoService';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { calcularTestePericia } from '../../../services/testePericiaService';
import type { IRaca } from '../../../types/catalogo';
import {
  aflicaoPorId,
  avisoDeImunidade,
  efeitosDoEstagio,
  estagioDaExposicao,
  estagioDaNovaExposicao,
  estagioDoIntervalo,
  estagioMaximo,
  grauValido,
  normalizarAflicoesAtivas,
  novaAflicaoAtiva,
  textoDoPeriodo,
  type GrauTeste,
  type IAflicaoAtiva,
  type ITesteAflicao,
} from '../../../services/aflicoesFichaService';

interface IAflicoesSectionProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
}

const ROTULO_TIPO: Record<IAflicao['tipo'], string> = { veneno: 'Veneno', doenca: 'Doença', vicio: 'Vício' };
const ROTULO_GRAU: Record<GrauTeste, string> = {
  'sucesso critico': 'sucesso crítico',
  sucesso: 'sucesso',
  falha: 'falha',
  'falha critica': 'falha crítica',
};

/**
 * Venenos, doenças e vícios que o personagem carrega. O teste de Fortitude
 * sai do servidor (vale como prova no log da mesa) e o estágio anda sozinho
 * conforme o grau: crítico desce, sucesso segura, falha sobe.
 */
export const AflicoesSection = ({ character, onUpdate }: IAflicoesSectionProps) => {
  const campanhaAtiva = useAuthStore((state) => state.campanhaAtiva);
  const f = character.ficha || {};
  const ativas = useMemo(() => normalizarAflicoesAtivas(f.aflicoesAtivas), [f.aflicoesAtivas]);
  const [racas, setRacas] = useState<IRaca[]>([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [escolhida, setEscolhida] = useState('');
  const [rolando, setRolando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    carregarCatalogo().then((dados) => { if (!cancelado) setRacas(dados.racas || []); }).catch(() => undefined);
    return () => { cancelado = true; };
  }, []);

  const raca = racas.find((item) => item.id === f.racaId) || null;
  const salvar = (proximas: IAflicaoAtiva[]) => onUpdate(['ficha', 'aflicoesAtivas'], proximas);

  const rolarFortitude = async (aflicao: IAflicao, motivo: ITesteAflicao['motivo']): Promise<{ grau: GrauTeste; natural: number; total: number } | null> => {
    if (!campanhaAtiva?.id) {
      setAviso({ tipo: 'erro', texto: 'Escolha uma campanha para rolar o teste.' });
      return null;
    }
    const teste = calcularTestePericia(character, 'fortitude', 'constituicao', raca, 'Fortitude');
    const titulos = { exposicao: 'exposição a', intervalo: 'intervalo de', 'nova-exposicao': 'nova exposição a' } as const;
    const { registro } = await registrosApi.rolar({
      campanhaId: campanhaAtiva.id,
      personagemId: character.id,
      titulo: `Fortitude: ${titulos[motivo]} ${aflicao.titulo}`,
      bonus: teste.bonus,
      vantagens: teste.vantagens,
      desvantagens: teste.desvantagens,
      dt: aflicao.dtFortitude,
      origem: { tipo: 'aflicao', aflicaoId: aflicao.id, motivo },
    });
    const grau = grauValido(registro.detalhes?.grau);
    if (!grau) throw new Error('O servidor não classificou o teste.');
    return { grau, natural: Number(registro.detalhes?.natural) || 0, total: Number(registro.resultado) || 0 };
  };

  const textoAoEntrar = (aflicao: IAflicao, de: number, para: number) => {
    if (para <= de) return '';
    const notas = aflicao.estagios.filter((estagio) => estagio.numero > de && estagio.numero <= para).flatMap((estagio) => estagio.aoEntrar ?? []);
    return notas.length ? ` Ao entrar: ${notas.join(' ')}` : '';
  };

  const executar = async (chave: string, acao: () => Promise<void>) => {
    if (rolando) return;
    setRolando(chave);
    setAviso(null);
    try {
      await acao();
    } catch (error) {
      setAviso({ tipo: 'erro', texto: error instanceof Error && error.message ? error.message : 'Não foi possível rolar o teste.' });
    } finally {
      setRolando(null);
    }
  };

  const expor = (aflicao: IAflicao, comTeste: boolean) => void executar(`expor-${aflicao.id}`, async () => {
    const existente = ativas.find((ativa) => ativa.aflicaoId === aflicao.id);
    if (existente) {
      // Mesma aflição de novo: falha sobe 1 estágio na hora.
      const resultado = comTeste ? await rolarFortitude(aflicao, 'nova-exposicao') : { grau: 'falha' as GrauTeste, natural: 0, total: 0 };
      if (!resultado) return;
      const para = estagioDaNovaExposicao(aflicao, existente.estagio, resultado.grau);
      const teste: ITesteAflicao | null = comTeste ? { quando: new Date().toISOString(), motivo: 'nova-exposicao', ...resultado, de: existente.estagio, para } : existente.ultimoTeste ?? null;
      salvar(ativas.map((ativa) => (ativa.id === existente.id ? { ...ativa, estagio: para, ultimoTeste: teste } : ativa)));
      setAviso({ tipo: 'ok', texto: para > existente.estagio ? `${aflicao.titulo} piorou para o estágio ${para}.${textoAoEntrar(aflicao, existente.estagio, para)}` : `${aflicao.titulo} não piorou desta vez.` });
    } else {
      const resultado = comTeste ? await rolarFortitude(aflicao, 'exposicao') : { grau: 'falha' as GrauTeste, natural: 0, total: 0 };
      if (!resultado) return;
      const estagio = estagioDaExposicao(aflicao, resultado.grau);
      if (estagio === 0) {
        setAviso({ tipo: 'ok', texto: `Resistiu a ${aflicao.titulo} (${ROTULO_GRAU[resultado.grau]}, ${resultado.total}).` });
      } else {
        const teste: ITesteAflicao | null = comTeste ? { quando: new Date().toISOString(), motivo: 'exposicao', ...resultado, de: 0, para: estagio } : null;
        salvar([...ativas, novaAflicaoAtiva(aflicao, estagio, teste)]);
        const incubacao = aflicao.incubacao.quantidade > 0 ? ` Começa depois de ${textoDoPeriodo(aflicao.incubacao)} de incubação.` : '';
        setAviso({ tipo: 'ok', texto: `Pegou ${aflicao.titulo}, estágio ${estagio}.${incubacao}${textoAoEntrar(aflicao, 0, estagio)}` });
      }
    }
    setEscolhendo(false);
    setEscolhida('');
  });

  const testarIntervalo = (ativa: IAflicaoAtiva, aflicao: IAflicao) => void executar(ativa.id, async () => {
    const resultado = await rolarFortitude(aflicao, 'intervalo');
    if (!resultado) return;
    const para = estagioDoIntervalo(aflicao, ativa.estagio, resultado.grau);
    if (para === 0) {
      salvar(ativas.filter((item) => item.id !== ativa.id));
      setAviso({ tipo: 'ok', texto: `${aflicao.titulo} passou (${ROTULO_GRAU[resultado.grau]}). Atributo drenado volta conforme a recuperação.` });
      return;
    }
    const teste: ITesteAflicao = { quando: new Date().toISOString(), motivo: 'intervalo', ...resultado, de: ativa.estagio, para };
    salvar(ativas.map((item) => (item.id === ativa.id ? { ...item, estagio: para, ultimoTeste: teste, incubando: false } : item)));
    setAviso({
      tipo: 'ok',
      texto: `${ROTULO_GRAU[resultado.grau][0].toUpperCase()}${ROTULO_GRAU[resultado.grau].slice(1)} (${resultado.total}): ${para === ativa.estagio ? `segue no estágio ${para}` : `vai para o estágio ${para}`}.${textoAoEntrar(aflicao, ativa.estagio, para)}`,
    });
  });

  const mudarEstagio = (ativa: IAflicaoAtiva, aflicao: IAflicao, delta: number) => {
    const para = Math.min(estagioMaximo(aflicao), ativa.estagio + delta);
    if (para <= 0) {
      salvar(ativas.filter((item) => item.id !== ativa.id));
      setAviso({ tipo: 'ok', texto: `${aflicao.titulo} saiu da ficha.` });
      return;
    }
    salvar(ativas.map((item) => (item.id === ativa.id ? { ...item, estagio: para } : item)));
  };

  const encerrar = (ativa: IAflicaoAtiva, aflicao: IAflicao) => {
    if (!window.confirm(`Encerrar ${aflicao.titulo}? Use quando um antídoto ou tratamento acabou com ela.`)) return;
    salvar(ativas.filter((item) => item.id !== ativa.id));
    setAviso({ tipo: 'ok', texto: `${aflicao.titulo} foi encerrada.` });
  };

  const aflicaoEscolhida = escolhida ? aflicaoPorId(escolhida) : undefined;
  const imunidade = aflicaoEscolhida ? avisoDeImunidade(f.racaId, aflicaoEscolhida) : null;
  const botao = 'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-40';

  return (
    <section className="rounded-2xl border border-lime-300/10 bg-[#0f0e15] p-4" data-tour="ficha-aflicoes">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            <FlaskConical size={16} className="text-lime-300" /> Aflições
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">Venenos, doenças e vícios. Fortitude contra a DT a cada intervalo.</p>
        </div>
        <Link to="/regras?topico=aflicoes" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-lime-300/80 hover:text-lime-200"><BookOpen size={13} /> Regra</Link>
      </div>

      <div className="space-y-2">
        {ativas.map((ativa) => {
          const aflicao = aflicaoPorId(ativa.aflicaoId)!;
          const maximo = estagioMaximo(aflicao);
          const estagio = efeitosDoEstagio(aflicao, ativa.estagio);
          return (
            <article key={ativa.id} className="rounded-xl border border-lime-300/15 bg-black/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block text-sm text-lime-100">{aflicao.titulo}</strong>
                  <span className="text-[11px] text-gray-500">
                    {ROTULO_TIPO[aflicao.tipo]}{aflicao.classificacao === 'sobrenatural' ? ' sobrenatural' : ''} · DT {aflicao.dtFortitude} · teste a cada {textoDoPeriodo(aflicao.intervalo)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1" aria-label={`Estágio ${ativa.estagio} de ${maximo}`}>
                  {Array.from({ length: maximo }, (_, indice) => (
                    <span key={indice} className={`h-2 w-5 rounded-full ${indice < ativa.estagio ? 'bg-lime-300' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>

              {ativa.incubando ? (
                <p className="mt-2 rounded-md bg-amber-300/[0.07] px-2 py-1.5 text-[11px] text-amber-100/80">
                  Incubando ({textoDoPeriodo(aflicao.incubacao)}). Os efeitos começam no fim da incubação; o primeiro teste do intervalo já conta a partir dali.
                </p>
              ) : null}

              <ul className="mt-2 space-y-0.5 text-xs leading-5 text-gray-300">
                <li className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Estágio {ativa.estagio}</li>
                {estagio.efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}
                {estagio.drenagemAtributo ? <li>{estagio.drenagemAtributo.atributo} −{estagio.drenagemAtributo.valor} (temporário)</li> : null}
              </ul>

              {ativa.ultimoTeste ? (
                <p className="mt-2 text-[11px] text-gray-500">
                  Último teste: {ativa.ultimoTeste.total} ({ROTULO_GRAU[ativa.ultimoTeste.grau]}), estágio {ativa.ultimoTeste.de} → {ativa.ultimoTeste.para}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button type="button" disabled={!!rolando} onClick={() => testarIntervalo(ativa, aflicao)} className={`${botao} border-lime-300/30 bg-lime-300/10 text-lime-200 hover:bg-lime-300/20`}>
                  {rolando === ativa.id ? <RefreshCw size={12} className="animate-spin" /> : <Dices size={12} />} Teste do intervalo
                </button>
                <button type="button" onClick={() => mudarEstagio(ativa, aflicao, -1)} title={`Cura DT ${aflicao.tratamento.dt} (${aflicao.tratamento.tempo.replace(/\.$/, '')}). ${aflicao.tratamento.limite}`} className={`${botao} border-white/10 text-gray-300 hover:text-white`}>
                  <ShieldCheck size={12} /> Tratou (−1)
                </button>
                <div className="flex items-center rounded-lg border border-white/10">
                  <button type="button" aria-label="Descer um estágio" onClick={() => mudarEstagio(ativa, aflicao, -1)} className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-white"><Minus size={11} /></button>
                  <button type="button" aria-label="Subir um estágio" disabled={ativa.estagio >= maximo} onClick={() => mudarEstagio(ativa, aflicao, 1)} className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-white disabled:opacity-30"><Plus size={11} /></button>
                </div>
                <button type="button" onClick={() => encerrar(ativa, aflicao)} className={`${botao} ml-auto border-white/10 text-gray-500 hover:text-red-300`}>
                  <X size={12} /> Encerrar
                </button>
              </div>
            </article>
          );
        })}

        {ativas.length === 0 && !escolhendo ? <p className="rounded-xl border border-white/5 bg-black/20 px-3 py-4 text-center text-xs text-gray-500">Nenhuma aflição. Que continue assim.</p> : null}

        {escolhendo ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500" htmlFor="aflicao-escolhida">Exposição a</label>
            <select id="aflicao-escolhida" value={escolhida} onChange={(evento) => setEscolhida(evento.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-[#121118] px-3 text-sm text-white outline-none focus:border-lime-300/40">
              <option value="">Escolha a aflição...</option>
              {REGIOES_AFLICAO.map((regiao) => {
                const daRegiao = CATALOGO_AFLICOES.filter((aflicao) => aflicao.regiao === regiao);
                return daRegiao.length ? (
                  <optgroup key={regiao} label={regiao}>
                    {daRegiao.map((aflicao) => <option key={aflicao.id} value={aflicao.id}>{aflicao.titulo} (DT {aflicao.dtFortitude})</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
            {aflicaoEscolhida ? (
              <>
                <p className="text-xs leading-5 text-gray-400">{aflicaoEscolhida.exposicao.gatilho}</p>
                {ativas.some((ativa) => ativa.aflicaoId === aflicaoEscolhida.id) ? <p className="text-[11px] text-amber-200/80">Já está na ficha: uma falha agora sobe 1 estágio (no máximo uma vez por cena).</p> : null}
                {imunidade ? <p className="text-[11px] text-sky-200/80">{imunidade}</p> : null}
              </>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={!aflicaoEscolhida || !!rolando} onClick={() => aflicaoEscolhida && expor(aflicaoEscolhida, true)} className={`${botao} border-lime-300/30 bg-lime-300/10 text-lime-200 hover:bg-lime-300/20`}>
                {rolando?.startsWith('expor-') ? <RefreshCw size={12} className="animate-spin" /> : <Dices size={12} />} Rolar Fortitude
              </button>
              <button type="button" disabled={!aflicaoEscolhida || !!rolando} onClick={() => aflicaoEscolhida && expor(aflicaoEscolhida, false)} title="Quando o Mestre já decidiu que pegou" className={`${botao} border-white/10 text-gray-300 hover:text-white`}>
                <Skull size={12} /> Aplicar sem teste
              </button>
              <button type="button" onClick={() => { setEscolhendo(false); setEscolhida(''); }} className={`${botao} ml-auto border-transparent text-gray-500 hover:text-white`}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEscolhendo(true)} className="w-full rounded-lg border border-dashed border-lime-300/25 py-2.5 text-xs font-bold text-lime-300/80 transition-colors hover:bg-lime-300/[0.06] hover:text-lime-200">
            + Exposição a uma aflição
          </button>
        )}

        {aviso ? (
          <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-xs ${aviso.tipo === 'erro' ? 'bg-red-400/10 text-red-200' : 'bg-lime-300/[0.07] text-lime-100/90'}`}>{aviso.texto}</p>
        ) : null}
      </div>
    </section>
  );
};
