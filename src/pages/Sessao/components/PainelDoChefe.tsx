import React, { useState } from 'react';
import { Crown, Flame, Shield, Undo2, Zap } from 'lucide-react';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import type { AcaoDeChefe, MotivoDaGuarda } from '../../../services/sessaoApi';
import { avisar } from '../../../components/avisos/avisos';

const MOTIVOS: Array<{ valor: MotivoDaGuarda; rotulo: string; dica: string }> = [
  { valor: 'critico', rotulo: 'Crítico', dica: 'Um crítico contra ele' },
  { valor: 'ousada', rotulo: 'Ousado', dica: 'Acerto de quem declarou Coreografia Ousada ou acima' },
  { valor: 'combinado', rotulo: 'Combinado', dica: 'Um ataque combinado que o acertou' },
  { valor: 'fraqueza', rotulo: 'Fraqueza', dica: 'Alguém explorou a fraqueza dele' },
  { valor: 'outro', rotulo: 'Outro', dica: 'Outra jogada que mereça' },
];

/** O recado do servidor vem sem acento, pensado para log. Aqui vira frase de mesa. */
function recadoDoErro(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : '';
  if (texto.includes('neste turno')) return 'Já saiu um ponto de Ímpeto neste turno.';
  if (texto.includes('turno de um jogador')) return 'O Ímpeto só se gasta no fim do turno de um jogador.';
  if (texto.includes('acabou')) return 'O Ímpeto acabou. Ele volta inteiro no próximo turno do chefe.';
  if (texto.includes('em combate')) return 'O Ímpeto só se gasta com o combate em andamento.';
  if (texto.includes('Determinacao')) return 'Não sobrou Determinação nesta fase.';
  if (texto.includes('Guarda')) return 'A Guarda não mudou: confira o editor da criatura.';
  return 'Não deu para usar a regra de chefe. Tente de novo.';
}

/** Pontos em fila: cheios os que ainda valem, vazados os já gastos. */
const Pontos: React.FC<{ total: number; cheios: number; rotulo: string; tom: 'impeto' | 'guarda' }> = ({ total, cheios, rotulo, tom }) => (
  <span className={`painel-chefe__pontos painel-chefe__pontos--${tom}`} role="img" aria-label={`${rotulo}: ${cheios} de ${total}`}>
    {Array.from({ length: total }, (_, indice) => (
      <i key={indice} data-cheio={indice < cheios ? 'sim' : 'nao'} />
    ))}
  </span>
);

/**
 * Ímpeto, Determinação e Guarda do chefe em foco (Guia do Mestre, "O chefe contra o grupo inteiro").
 * A mesa vê o Ímpeto e a Guarda; quem comanda vê também a Determinação e tem os botões.
 */
export const PainelDoChefe: React.FC<{ entidade: EntidadeIniciativa; comando: boolean }> = ({ entidade, comando }) => {
  const acaoDeChefe = useSessaoStore((estado) => estado.acaoDeChefe);
  const emCombate = useSessaoStore((estado) => estado.emCombate);
  // O Ímpeto sai no fim do turno de um jogador: na vez de outro, o botão fica parado.
  const vezDeJogador = useSessaoStore((estado) => estado.iniciativa.find((item) => item.id === estado.turnoAtualId)?.tipo === 'jogador');
  const [ocupado, setOcupado] = useState(false);
  const chefe = entidade.chefe;
  if (!chefe) return null;

  const temImpeto = chefe.impeto_maximo != null;
  const temGuarda = !!chefe.guarda_partes;
  const temDeterminacao = comando && chefe.determinacao != null;
  if (!temImpeto && !temGuarda && !temDeterminacao) return null;

  const agir = async (acao: AcaoDeChefe, motivo?: MotivoDaGuarda) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const quebrou = await acaoDeChefe(entidade.id, acao, motivo);
      if (quebrou) avisar.sucesso(`A Guarda de ${entidade.nome} quebrou: Exposto, sem reação e o próximo ataque contra ele tem vantagem.`);
    } catch (erro) {
      avisar.erro(recadoDoErro(erro));
    } finally {
      setOcupado(false);
    }
  };

  const impetoMaximo = chefe.impeto_maximo ?? 0;
  const impetoRestante = chefe.impeto_restante ?? 0;
  const guardaPartes = chefe.guarda_partes ?? 0;
  const guarda = chefe.guarda ?? 0;
  const determinacao = chefe.determinacao ?? 0;

  return (
    <div className="painel-chefe" aria-label={`Regras de chefe de ${entidade.nome}`}>
      <span className="painel-chefe__titulo"><Crown size={13} /> Chefe</span>
      <div className="painel-chefe__grade">
        {temImpeto ? (
          <div className="painel-chefe__regra">
            <div className="painel-chefe__linha">
              <strong><Zap size={14} /> Ímpeto</strong>
              <em>{impetoRestante} de {impetoMaximo}</em>
            </div>
            {impetoMaximo > 0 ? (
              <Pontos total={impetoMaximo} cheios={impetoRestante} rotulo="Ímpeto" tom="impeto" />
            ) : (
              <p className="painel-chefe__nota">Sem Ímpeto: o lado dele já tem gente que chegue.</p>
            )}
            {comando && impetoMaximo > 0 ? (
              <div className="painel-chefe__botoes">
                <button
                  type="button"
                  onClick={() => void agir('gastar_impeto')}
                  disabled={ocupado || !emCombate || !vezDeJogador || impetoRestante <= 0 || !!chefe.impeto_neste_turno}
                  title={!emCombate ? 'Só com o combate em andamento' : !vezDeJogador ? 'Só no fim do turno de um jogador' : chefe.impeto_neste_turno ? 'Já saiu um ponto neste turno' : 'No fim do turno de um jogador: andar metade, atacar com −5 ou ganhar uma reação extra'}
                >
                  Gastar 1
                </button>
                {impetoRestante < impetoMaximo ? (
                  <button type="button" className="painel-chefe__desfazer" onClick={() => void agir('devolver_impeto')} disabled={ocupado} title="Devolver o último ponto (clique errado)">
                    <Undo2 size={13} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {temGuarda ? (
          <div className="painel-chefe__regra">
            <div className="painel-chefe__linha">
              <strong><Shield size={14} /> Guarda</strong>
              <em>{guarda} de {guardaPartes}</em>
            </div>
            <Pontos total={guardaPartes} cheios={guarda} rotulo="Guarda" tom="guarda" />
            {comando ? (
              <div className="painel-chefe__botoes" role="group" aria-label="O que encheu a Guarda">
                {MOTIVOS.map((motivo) => (
                  <button key={motivo.valor} type="button" onClick={() => void agir('encher_guarda', motivo.valor)} disabled={ocupado} title={motivo.dica}>
                    {motivo.rotulo}
                  </button>
                ))}
                {guarda > 0 ? (
                  <button type="button" className="painel-chefe__desfazer" onClick={() => void agir('esvaziar_guarda')} disabled={ocupado} title="Tirar uma parte (clique errado)">
                    <Undo2 size={13} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {temDeterminacao ? (
          <div className="painel-chefe__regra">
            <div className="painel-chefe__linha">
              <strong><Flame size={14} /> Determinação</strong>
              <em>{determinacao}</em>
            </div>
            <p className="painel-chefe__nota">Passa num teste contra condição média. Custa: fica Exposto{temGuarda ? ' e a Guarda enche uma parte' : ''}. Volta a 1 a cada fase nova.</p>
            <div className="painel-chefe__botoes">
              <button type="button" onClick={() => void agir('gastar_determinacao')} disabled={ocupado || determinacao <= 0}>
                Gastar e passar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
