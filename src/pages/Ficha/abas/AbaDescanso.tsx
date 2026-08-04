import { useState } from 'react';
import { BedDouble, Brain, HeartPulse, ShieldAlert } from 'lucide-react';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../../../data/regras/condicoes';
import { aplicarDescansoCompleto, aplicarRelaxamento, descansoPermitido, REGRAS_DESCANSO, type QualidadeDescanso } from '../../../services/descansoService';
import { useAuthStore } from '../../../store/useAuthStore';
import { obterStatusFicha } from '../../../services/statusService';

export const AbaDescanso = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
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

  const descansar = () => {
    if (!descansoPermitido(qualidade, isMestre)) {
      setMensagem('Descanso Excelente exige que o Mestre aplique ou autorize o resultado pela ficha.');
      return;
    }
    if (status.morto) {
      setMensagem('Personagens mortos não podem receber descanso completo. Somente uma regra explícita de retorno pode alterar esse estado.');
      return;
    }
    const proximo = aplicarDescansoCompleto(status, {
      vida: Number(derivados.vida) || 10,
      mana: Number(derivados.mana) || 10,
      sanidade: Number(status.sanidadeMaxima) || 100,
    }, qualidade, tratamento);
    onUpdate(['ficha', 'status'], proximo);
    setMensagem(`Descanso ${REGRAS_DESCANSO.find((item) => item.id === qualidade)?.titulo.toLocaleLowerCase('pt-BR')} aplicado.`);
  };

  const relaxar = () => {
    const dado = Math.floor(Math.random() * 6) + 1;
    const resultado = aplicarRelaxamento(status, Number(derivados.mana) || 10, Number(atributos.sabedoria) || 10, Number(ficha.nivel) || Number(character.nivel) || 1, dado);
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

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}><BedDouble className="text-[#c7a44c]" />Descanso e condições</h2>
        <p className="mt-2 text-sm text-gray-400">Aplique recuperação com critérios fixos e consulte os efeitos oficiais sem depender de anotações soltas.</p>
      </header>

      <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-5">
        <h3 className="mb-4 font-bold text-white">Descanso completo</h3>
        <div className="grid gap-3 md:grid-cols-5">
          {REGRAS_DESCANSO.map((regra) => (
            <button key={regra.id} type="button" disabled={!descansoPermitido(regra.id, isMestre)} title={!descansoPermitido(regra.id, isMestre) ? 'Exige aplicação ou autorização do Mestre.' : undefined} onClick={() => setQualidade(regra.id)} className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${qualidade === regra.id ? 'border-[#c7a44c]/60 bg-[#c7a44c]/10' : 'border-white/5 bg-black/20'}`}>
              <strong className="text-sm text-white">{regra.titulo}</strong>
              <p className="mt-1 text-xs text-[#c7a44c]">{Math.round(regra.recuperacao * 100)}% de PV e Mana</p>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{regra.criterio}</p>
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={tratamento} onChange={(event) => setTratamento(event.target.checked)} />Recebeu tratamento durante o descanso. Em qualidade Boa ou superior, reduz Ferido em 1.</label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={descansar} className="rounded-xl bg-[#c7a44c] px-5 py-2.5 text-sm font-bold text-black">Aplicar descanso</button>
          <button type="button" onClick={relaxar} className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-2.5 text-sm font-bold text-sky-300">Relaxar por 1 hora</button>
          <button type="button" onClick={adicionarCansaco} className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-2.5 text-sm font-bold text-orange-300">Registrar combate intenso</button>
        </div>
        {mensagem && <p className="mt-3 text-sm font-bold text-emerald-300" aria-live="polite">{mensagem}</p>}
        <p className="mt-4 text-xs leading-relaxed text-gray-500">Combate intenso significa que o personagem chegou à metade dos PV, gastou metade da Mana ou entrou em Morrendo. A cena gera apenas 1 Cansaço, mesmo com mais de um gatilho.</p>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><ShieldAlert size={17} className="text-orange-300" />Condições oficiais</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {CONDICOES_OFICIAIS.map((item) => <article key={item.id} className="rounded-xl border border-white/5 bg-black/20 p-4"><div className="flex justify-between gap-3"><strong className="text-white">{item.titulo}</strong><span className="text-[10px] uppercase text-gray-500">{item.categoria}</span></div><p className="mt-1 text-xs text-[#c7a44c]">{item.duracao}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-400">{item.efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}</ul><p className="mt-2 text-xs text-emerald-300">Remoção: {item.remocao}</p></article>)}
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-5">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-white"><Brain size={17} className="text-fuchsia-300" />Crises de Sanidade</h3>
        <p className="mb-4 text-xs leading-relaxed text-gray-500">Em Ruptura, uma nova perda exige Vontade DT 15. Na Quebra, a crise é imediata. Perdas acumulam normalmente até o mínimo 0.</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {CRISES_SANIDADE.map((item) => <article key={item.id} className="rounded-xl border border-fuchsia-500/10 bg-fuchsia-500/5 p-4"><strong className="text-white">{item.titulo}</strong><p className="mt-1 text-xs text-fuchsia-300">{item.duracao}</p><p className="mt-2 text-xs text-gray-400">{item.efeitos.join(' ')}</p><p className="mt-2 text-xs text-emerald-300">{item.remocao}</p></article>)}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-gray-400"><HeartPulse size={16} className="shrink-0 text-emerald-300" />Tratamento em local seguro recupera Sanidade somente pelo descanso. Ajuda profissional pode conceder vantagem contra uma crise, mas não apaga uma condição permanente sem resolução narrativa.</div>
      </section>
    </div>
  );
};
