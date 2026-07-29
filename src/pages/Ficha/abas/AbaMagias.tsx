import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Dices,
  Flame,
  LockKeyhole,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { registrosApi } from '../../../services/registrosApi';
import {
  MAGIAS_CATALOGO,
  circuloRotulo,
  magiaElegivelParaAprender,
  magiasDaFicha,
  obterPerfilMagico,
  podeConjurarMagia,
  type IMagiaCatalogo,
} from '../../../services/magiaService';
import { useAuthStore } from '../../../store/useAuthStore';

interface IMagiaAntiga {
  id?: string;
  nome?: string;
  circulo?: string;
  escola?: string;
  efeito?: string;
}

const CIRCULO_CORES: Record<string, string> = {
  '1': 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  '2': 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  '3': 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  '4': 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  '5': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  ritual: 'border-red-500/30 bg-red-500/10 text-red-300',
};

const formatarBonus = (valor: number) => valor >= 0 ? `+${valor}` : String(valor);

export const AbaMagias = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [defesasAlvo, setDefesasAlvo] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [conjurandoId, setConjurandoId] = useState<string | null>(null);

  const campanha = useAuthStore((state) => state.campanhaAtiva);
  const usuario = useAuthStore((state) => state.usuario);
  const ficha = character.ficha || {};
  const status = ficha.status || {};
  const perfil = useMemo(() => obterPerfilMagico(ficha), [ficha]);
  const magiasConhecidas = useMemo(() => magiasDaFicha(ficha), [ficha]);
  const magiasAntigas: IMagiaAntiga[] = Array.isArray(ficha.magias) ? ficha.magias : [];
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanha?.papel === 'mestre'
    || campanha?.papel === 'assistente';
  const manaMaxima = Math.max(0, Number(character.derivados?.mana || ficha.derivados?.mana) || 0);
  const manaAtual = Math.max(0, Number(status.manaAtual ?? manaMaxima));
  const concentracaoAtiva = status.concentracaoAtiva as { magiaId?: string; titulo?: string } | null | undefined;

  useEffect(() => {
    if (!mensagem) return undefined;
    const timer = window.setTimeout(() => setMensagem(null), 5000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  const catalogoVisivel = MAGIAS_CATALOGO.filter((magia) => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return true;
    return [magia.titulo, magia.tradicao, magia.efeito, circuloRotulo(magia.circulo)]
      .some((valor) => valor.toLocaleLowerCase('pt-BR').includes(termo));
  });

  const aprenderOuConceder = (magia: IMagiaCatalogo) => {
    if (isMestre) {
      const atuais = perfil.concedidasIds;
      const jaConcedida = atuais.includes(magia.id);
      onUpdate(
        ['ficha', 'magiasConcedidasIds'],
        jaConcedida ? atuais.filter((id) => id !== magia.id) : [...atuais, magia.id],
      );
      setMensagem({
        tipo: 'sucesso',
        texto: jaConcedida ? `${magia.titulo} removida das concessões.` : `${magia.titulo} concedida pelo Mestre.`,
      });
      return;
    }

    const avaliacao = magiaElegivelParaAprender(ficha, magia);
    if (!avaliacao.permitido) {
      setMensagem({ tipo: 'erro', texto: avaliacao.motivo || 'Esta magia ainda não pode ser aprendida.' });
      return;
    }
    if (!window.confirm(`Aprender ${magia.titulo}? A escolha só poderá ser removida pelo Mestre.`)) return;
    onUpdate(['ficha', 'magiasConhecidasIds'], [...perfil.conhecidasIds, magia.id]);
    setMensagem({ tipo: 'sucesso', texto: `${magia.titulo} foi aprendida.` });
  };

  const encerrarConcentracao = () => {
    onUpdate(['ficha', 'status', 'concentracaoAtiva'], null);
    setMensagem({ tipo: 'sucesso', texto: 'Concentração encerrada.' });
  };

  const conjurar = async (magia: IMagiaCatalogo) => {
    const avaliacao = podeConjurarMagia(ficha, magia);
    if (!avaliacao.permitido) {
      setMensagem({ tipo: 'erro', texto: avaliacao.motivo || 'Não é possível conjurar esta magia.' });
      return;
    }
    if (manaAtual < magia.custo_mana) {
      setMensagem({ tipo: 'erro', texto: `Mana insuficiente. ${magia.titulo} custa ${magia.custo_mana}.` });
      return;
    }
    if (magia.defesa && !campanha?.id) {
      setMensagem({ tipo: 'erro', texto: 'Ative uma campanha para realizar o teste de conjuração no servidor.' });
      return;
    }
    if (
      magia.concentracao
      && concentracaoAtiva?.magiaId
      && concentracaoAtiva.magiaId !== magia.id
      && !window.confirm(`Conjurar ${magia.titulo} encerrará ${concentracaoAtiva.titulo || 'a concentração atual'}. Continuar?`)
    ) return;

    setConjurandoId(magia.id);
    onUpdate(['ficha', 'status', 'manaAtual'], manaAtual - magia.custo_mana);
    if (magia.concentracao) {
      onUpdate(['ficha', 'status', 'concentracaoAtiva'], { magiaId: magia.id, titulo: magia.titulo });
    }

    try {
      if (campanha?.id && magia.defesa) {
        const defesaInformada = Number(defesasAlvo[magia.id]);
        const resposta = await registrosApi.rolar({
          campanhaId: campanha.id,
          personagemId: character.id,
          titulo: `Conjuração: ${magia.titulo}`,
          bonus: perfil.bonusConjuracao,
          dt: Number.isFinite(defesaInformada) && defesaInformada > 0 ? defesaInformada : null,
          origem: {
            tipo: 'magia',
            magia_id: magia.id,
            circulo: magia.circulo,
            defesa: magia.defesa,
            dt_magia: perfil.dtMagia,
            custo_mana: magia.custo_mana,
            concentracao: magia.concentracao,
          },
        });
        const resultado = resposta.registro.resultado;
        setMensagem({
          tipo: 'sucesso',
          texto: resultado === null
            ? `${magia.titulo} conjurada.`
            : `${magia.titulo}: resultado ${resultado}. Compare com ${magia.defesa}${defesaInformada > 0 ? ` ${defesaInformada}` : ''}.`,
        });
      } else if (campanha?.id) {
        await registrosApi.registrarUso({
          campanhaId: campanha.id,
          personagemId: character.id,
          tipo: 'magia',
          titulo: magia.titulo,
          detalhes: {
            magia_id: magia.id,
            circulo: magia.circulo,
            custo_mana: magia.custo_mana,
            dt_magia: perfil.dtMagia,
            concentracao: magia.concentracao,
          },
        });
        setMensagem({ tipo: 'sucesso', texto: `${magia.titulo} conjurada e registrada.` });
      } else {
        setMensagem({ tipo: 'sucesso', texto: `${magia.titulo} conjurada. Custo aplicado à ficha.` });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'O custo foi aplicado, mas o servidor não registrou a conjuração.' });
    } finally {
      setConjurandoId(null);
    }
  };

  const renderMagia = (magia: IMagiaCatalogo, modoCatalogo = false) => {
    const conhecida = perfil.conhecidasIds.includes(magia.id);
    const concedida = perfil.concedidasIds.includes(magia.id);
    const avaliacao = magiaElegivelParaAprender(ficha, magia);
    const podeAprender = isMestre || avaliacao.permitido;
    const cor = CIRCULO_CORES[String(magia.circulo)] || CIRCULO_CORES.ritual;

    return (
      <article key={`${modoCatalogo ? 'catalogo' : 'ficha'}:${magia.id}`} className="rounded-2xl border border-white/5 bg-[#121118] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{magia.titulo}</h3>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cor}`}>
                {circuloRotulo(magia.circulo)}
              </span>
              <span className="rounded border border-white/5 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {magia.tradicao}
              </span>
              {magia.concentracao && <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-300">Concentração</span>}
              {concedida && <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Concedida</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span><strong className="text-gray-400">Custo:</strong> {magia.custo_mana} Mana</span>
              <span><strong className="text-gray-400">Execução:</strong> {magia.execucao}</span>
              <span><strong className="text-gray-400">Alcance:</strong> {magia.alcance}</span>
              <span><strong className="text-gray-400">Duração:</strong> {magia.duracao}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{magia.efeito}</p>
            {(magia.dano || magia.defesa) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {magia.dano && <span className="rounded-lg bg-red-500/10 px-2.5 py-1 text-red-300">Dano {magia.dano}</span>}
                {magia.defesa && <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-sky-300">Contra {magia.defesa}</span>}
                {magia.ataque && <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-300">Crítico no 20 natural</span>}
              </div>
            )}
          </div>

          {modoCatalogo ? (
            <div className="w-full md:w-48">
              <button
                type="button"
                onClick={() => aprenderOuConceder(magia)}
                disabled={!isMestre && (conhecida || !podeAprender)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 py-2.5 text-xs font-bold text-[#d7bb72] transition-colors hover:bg-[#c7a44c]/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-gray-600"
              >
                {!podeAprender && !conhecida ? <LockKeyhole size={14} /> : <BookOpen size={14} />}
                {isMestre ? (concedida ? 'Remover concessão' : 'Conceder') : (conhecida ? 'Já conhecida' : 'Aprender')}
              </button>
              {!isMestre && !avaliacao.permitido && !conhecida && <p className="mt-2 text-center text-[10px] leading-relaxed text-gray-600">{avaliacao.motivo}</p>}
            </div>
          ) : (
            <div className="w-full space-y-2 md:w-48">
              {magia.defesa && (
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Defesa do alvo, opcional
                  <input
                    type="number"
                    min="1"
                    value={defesasAlvo[magia.id] || ''}
                    onChange={(event) => setDefesasAlvo((atual) => ({ ...atual, [magia.id]: event.target.value }))}
                    placeholder={magia.defesa}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => void conjurar(magia)}
                disabled={conjurandoId === magia.id}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Dices size={14} /> {conjurandoId === magia.id ? 'Conjurando...' : 'Conjurar'}
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              <Sparkles className="text-sky-300" /> Magia e Fluxo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
              Fluxo mede sua capacidade de canalização. A fonte libera círculos e vagas; Misticismo acrescenta treinamento ao teste.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarCatalogo((valor) => !valor)}
            className="rounded-xl border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-5 py-3 text-sm font-bold text-[#d7bb72] hover:bg-[#c7a44c]/20"
          >
            {mostrarCatalogo ? 'Voltar às conhecidas' : isMestre ? 'Abrir catálogo e concessões' : 'Aprender magia'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Fonte</span><strong className="mt-1 block text-sm text-white">{perfil.fontes.join(', ') || 'Nenhuma'}</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Fluxo</span><strong className="mt-1 block text-sm text-white">{perfil.fluxo} ({formatarBonus(perfil.modificadorFluxo)})</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Teste</span><strong className="mt-1 block text-sm text-sky-300">d20 {formatarBonus(perfil.bonusConjuracao)}</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">DT de magia</span><strong className="mt-1 block text-sm text-sky-300">{perfil.dtMagia}</strong></div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-[10px] font-bold uppercase text-gray-500">Círculo e vagas</span><strong className="mt-1 block text-sm text-white">{perfil.circuloMaximo || 0}º, {perfil.conhecidasIds.length}/{perfil.vagasConhecidas}</strong></div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-xs text-gray-400">
          <Shield size={15} className="text-emerald-300" />
          <span>Mana {manaAtual}/{manaMaxima}</span>
          <span>Fluxo libera até o {perfil.circuloDoFluxo || 0}º círculo.</span>
          <span>Sua fonte libera até o {perfil.circuloDaFonte || 0}º.</span>
        </div>
      </header>

      {mensagem && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${mensagem.tipo === 'sucesso' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {mensagem.texto}
        </motion.div>
      )}

      {concentracaoAtiva?.magiaId && (
        <section className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Concentração ativa</span><strong className="mt-1 block text-white">{concentracaoAtiva.titulo}</strong><p className="mt-1 text-xs text-gray-400">Ao sofrer dano, teste Vontade contra DT 10 ou metade do dano, o que for maior.</p></div>
          <button type="button" onClick={encerrarConcentracao} className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 px-4 py-2 text-xs font-bold text-violet-200"><X size={14} /> Encerrar</button>
        </section>
      )}

      {mostrarCatalogo ? (
        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por nome, círculo, tradição ou efeito" className="w-full rounded-xl border border-white/5 bg-[#0f0e15] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-sky-500/40" />
          </div>
          <div className="space-y-3">{catalogoVisivel.map((magia) => renderMagia(magia, true))}</div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-white">Magias conhecidas</h3><span className="text-xs text-gray-500">{magiasConhecidas.length} oficiais</span></div>
          {magiasConhecidas.length > 0 ? <div className="space-y-3">{magiasConhecidas.map((magia) => renderMagia(magia))}</div> : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0e15] py-14 text-center"><Flame size={42} className="mx-auto mb-3 text-gray-700" /><p className="font-bold text-gray-500">Nenhuma magia oficial conhecida</p><p className="mt-2 text-xs text-gray-600">{perfil.possuiFonte ? 'Use Aprender magia para preencher as vagas liberadas.' : 'Uma classe, habilidade ou concessão do Mestre precisa fornecer acesso.'}</p></div>
          )}
        </section>
      )}

      {magiasAntigas.length > 0 && !mostrarCatalogo && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="flex items-center gap-2 font-bold text-amber-200"><AlertCircle size={17} /> Registros anteriores</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">Estas anotações foram preservadas, mas não usam custos, círculos ou testes oficiais. O Mestre pode conceder a versão correspondente pelo catálogo.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {magiasAntigas.map((magia, indice) => <article key={magia.id || `${magia.nome}:${indice}`} className="rounded-xl border border-white/5 bg-black/20 p-4"><strong className="text-white">{magia.nome || 'Magia sem nome'}</strong><p className="mt-1 text-[11px] text-gray-500">{magia.circulo || 'Sem círculo'} | {magia.escola || 'Sem tradição'}</p><p className="mt-2 text-xs text-gray-400">{magia.efeito || 'Sem efeito registrado.'}</p></article>)}
          </div>
        </section>
      )}
    </div>
  );
};
