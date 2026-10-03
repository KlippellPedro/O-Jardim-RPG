import React, { useState } from 'react';
import { ChevronDown, FlaskConical, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { CATALOGO_AFLICOES, REGIOES_AFLICAO } from '../../../../data/regras/aflicoes';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { aflicaoPorId, cansacoAoEntrar, estagioMaximo, textoDoPeriodo } from '../../../services/aflicoesFichaService';

const OPCOES_AFLICAO: SelectOption[] = REGIOES_AFLICAO.flatMap((regiao) => {
  const daRegiao = CATALOGO_AFLICOES.filter((aflicao) => aflicao.regiao === regiao);
  return daRegiao.length
    ? [
      { value: `regiao:${regiao}`, label: regiao, disabled: true, labelClassName: 'text-[10px] font-bold uppercase tracking-widest text-lime-300/70' },
      ...daRegiao.map((aflicao) => ({ value: aflicao.id, label: `${aflicao.titulo} (DT ${aflicao.dtFortitude})` })),
    ]
    : [];
});

/**
 * O Mestre mexe nas aflições de um personagem sem sair da Sessão: aplica uma
 * nova, sobe ou desce o estágio, tira. Vai direto para a ficha, onde o jogador
 * continua rolando os testes de intervalo. O Cansaço de entrar num estágio é
 * somado junto.
 */
export const AflicoesSessaoPanel: React.FC<{ entity: EntidadeIniciativa }> = ({ entity }) => {
  const mexerNaAflicao = useSessaoStore((estado) => estado.mexerNaAflicao);
  const [aberto, setAberto] = useState(false);
  const [escolhida, setEscolhida] = useState('');
  const [estagioInicial, setEstagioInicial] = useState(1);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const executar = async (acao: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setAviso(null);
    try {
      setAviso({ tipo: 'ok', texto: await acao() });
    } catch (error) {
      setAviso({ tipo: 'erro', texto: error instanceof Error && error.message ? error.message : 'Não foi possível mexer na aflição.' });
    } finally {
      setBusy(false);
    }
  };

  const avisoCansaco = (cansaco: number, atual: number | null) => (
    cansaco > 0 ? ` +${cansaco} de Cansaço (agora ${atual ?? '?'}).` : ''
  );

  const aplicar = () => void executar(async () => {
    const aflicao = aflicaoPorId(escolhida);
    if (!aflicao) throw new Error('Escolha uma aflição.');
    const existente = entity.aflicoes.find((item) => item.aflicaoId === aflicao.id);
    const de = existente?.estagio ?? 0;
    const para = Math.max(de, Math.min(estagioInicial, estagioMaximo(aflicao)));
    const cansaco = cansacoAoEntrar(aflicao, de, para);
    const atual = await mexerNaAflicao(entity.id, {
      acao: 'aplicar',
      aflicao_id: aflicao.id,
      estagio: para,
      incubando: !existente && aflicao.incubacao.quantidade > 0,
      cansaco,
    });
    setEscolhida('');
    setEstagioInicial(1);
    const incubacao = !existente && aflicao.incubacao.quantidade > 0 ? ` Incubando por ${textoDoPeriodo(aflicao.incubacao)}.` : '';
    return `${entity.nome} pegou ${aflicao.titulo}, estágio ${para}.${incubacao}${avisoCansaco(cansaco, atual)}`;
  });

  const mudar = (aflicaoId: string, de: number, delta: number) => void executar(async () => {
    const aflicao = aflicaoPorId(aflicaoId);
    if (!aflicao) throw new Error('Aflição desconhecida.');
    const para = Math.min(estagioMaximo(aflicao), de + delta);
    if (para <= 0) {
      await mexerNaAflicao(entity.id, { acao: 'remover', aflicao_id: aflicaoId });
      return `${aflicao.titulo} saiu da ficha de ${entity.nome}.`;
    }
    const cansaco = cansacoAoEntrar(aflicao, de, para);
    const atual = await mexerNaAflicao(entity.id, { acao: 'estagio', aflicao_id: aflicaoId, estagio: para, cansaco });
    return `${aflicao.titulo} foi para o estágio ${para}.${avisoCansaco(cansaco, atual)}`;
  });

  const tirar = (aflicaoId: string) => void executar(async () => {
    await mexerNaAflicao(entity.id, { acao: 'remover', aflicao_id: aflicaoId });
    return `${aflicaoPorId(aflicaoId)?.titulo ?? 'A aflição'} saiu da ficha de ${entity.nome}.`;
  });

  const escolhidaInfo = escolhida ? aflicaoPorId(escolhida) : undefined;

  return (
    <div className="border-t border-white/[0.06]">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-lime-200/70 hover:text-lime-200"
      >
        <FlaskConical size={12} />
        <span className="flex-1">Aflições{entity.aflicoes.length ? ` · ${entity.aflicoes.length}` : ''}</span>
        <ChevronDown size={13} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto ? (
        <div className="space-y-2 px-3 pb-3">
          {entity.aflicoes.length ? (
            <ul className="space-y-1">
              {entity.aflicoes.map((item) => {
                const aflicao = aflicaoPorId(item.aflicaoId);
                if (!aflicao) return null;
                const maximo = estagioMaximo(aflicao);
                return (
                  <li key={item.aflicaoId} className="flex items-center gap-2 rounded-md bg-lime-300/[0.05] px-2 py-1.5 text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-lime-100/85" title={`Fortitude DT ${aflicao.dtFortitude}`}>
                      {aflicao.titulo}{item.incubando ? <span className="text-amber-200/70"> · incubando</span> : null}
                    </span>
                    <div className="flex items-center rounded-md border border-white/10">
                      <button type="button" disabled={busy} aria-label={`Descer o estágio de ${aflicao.titulo}`} onClick={() => mudar(item.aflicaoId, item.estagio, -1)} className="flex h-6 w-6 items-center justify-center text-white/45 hover:text-white disabled:opacity-30"><Minus size={10} /></button>
                      <span className="w-8 text-center font-bold tabular-nums text-white">{item.estagio}/{maximo}</span>
                      <button type="button" disabled={busy || item.estagio >= maximo} aria-label={`Subir o estágio de ${aflicao.titulo}`} onClick={() => mudar(item.aflicaoId, item.estagio, 1)} className="flex h-6 w-6 items-center justify-center text-white/45 hover:text-white disabled:opacity-30"><Plus size={10} /></button>
                    </div>
                    <button type="button" disabled={busy} aria-label={`Tirar ${aflicao.titulo}`} onClick={() => tirar(item.aflicaoId)} className="rounded p-1 text-white/35 hover:text-red-300 disabled:opacity-30"><X size={12} /></button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-[11px] text-white/35">Nenhuma aflição na ficha.</p>}

          <div className="space-y-1.5 rounded-lg border border-white/[0.07] bg-black/20 p-2">
            <Select
              value={escolhida}
              onChange={setEscolhida}
              ariaLabel={`Aflição para ${entity.nome}`}
              placeholder="Aplicar aflição..."
              options={OPCOES_AFLICAO}
              menuMinWidth={240}
              className="!h-8 !min-h-0 w-full !py-0 px-2 text-[11px]"
            />
            {escolhidaInfo ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Entra no estágio</span>
                {Array.from({ length: Math.min(3, estagioMaximo(escolhidaInfo)) }, (_, indice) => indice + 1).map((numero) => (
                  <button
                    key={numero}
                    type="button"
                    aria-pressed={estagioInicial === numero}
                    onClick={() => setEstagioInicial(numero)}
                    className={`h-6 w-6 rounded-md border text-[11px] font-bold ${estagioInicial === numero ? 'border-lime-300 bg-lime-300 text-black' : 'border-white/10 text-white/55 hover:text-white'}`}
                  >
                    {numero}
                  </button>
                ))}
                <button type="button" disabled={busy} onClick={aplicar} className="ml-auto flex items-center gap-1.5 rounded-md bg-lime-500 px-2.5 py-1 text-[11px] font-bold text-black hover:bg-lime-400 disabled:opacity-40">
                  {busy ? <RefreshCw size={11} className="animate-spin" /> : <FlaskConical size={11} />} Aplicar
                </button>
              </div>
            ) : null}
            <p className="text-[10px] leading-4 text-white/30">Falha na exposição entra no 1; falha crítica, no 2. O jogador rola os testes de intervalo na ficha.</p>
          </div>

          {aviso ? <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-md px-2 py-1.5 text-[11px] ${aviso.tipo === 'erro' ? 'bg-red-400/10 text-red-200' : 'bg-lime-300/[0.07] text-lime-100'}`}>{aviso.texto}</p> : null}
        </div>
      ) : null}
    </div>
  );
};
