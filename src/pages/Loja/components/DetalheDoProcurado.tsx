import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crosshair, Eye, Loader2, LogOut, Pencil, ScrollText, X } from 'lucide-react';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import {
  dadosAmeaca,
  dividirRecompensa,
  procuradosApi,
  rotuloCondicao,
  STATUS_PROCURADO,
  type DesfechoProcurado,
  type IProcurado,
} from '../../../services/procuradosApi';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { CartazProcurado, textoRecompensa } from './CartazProcurado';

interface PersonagemSimples {
  id: string;
  nome: string;
}

interface DetalheDoProcuradoProps {
  campanhaId: string;
  procurado: IProcurado;
  gestor: boolean;
  /** Personagem escolhido no topo da Loja: é com ele que se entra na caçada. */
  personagemAtivo: PersonagemSimples | undefined;
  /** Todos os personagens ativos da campanha, para o Mestre escolher quem recebe. */
  personagensDaCampanha: PersonagemSimples[];
  onFechar: () => void;
  onAtualizado: (procurado: IProcurado) => void;
  onEditar: () => void;
  /** A recompensa caiu em alguma carteira: a ficha precisa recarregar o saldo. */
  onEconomiaMudou: () => void;
}

const DESFECHOS: Array<{ id: DesfechoProcurado; rotulo: string; dica: string }> = [
  { id: 'capturado', rotulo: 'Capturado', dica: 'Entregue vivo. Paga a recompensa.' },
  { id: 'abatido', rotulo: 'Abatido', dica: 'Morto em combate. Paga a recompensa.' },
  { id: 'cancelado', rotulo: 'Cancelado', dica: 'O contrato caiu. Ninguém recebe.' },
];

export const DetalheDoProcurado: React.FC<DetalheDoProcuradoProps> = ({
  campanhaId, procurado, gestor, personagemAtivo, personagensDaCampanha, onFechar, onAtualizado, onEditar, onEconomiaMudou,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [desfecho, setDesfecho] = useState<DesfechoProcurado>(procurado.condicao === 'morto' ? 'abatido' : 'capturado');
  const [escolhidos, setEscolhidos] = useState<string[]>(() => procurado.cacadores.map((cacador) => cacador.personagem_id));
  const ameaca = dadosAmeaca(procurado.ameaca);
  const aberto = procurado.status === 'aberto';
  const meuNaCacada = personagemAtivo ? procurado.cacadores.some((cacador) => cacador.personagem_id === personagemAtivo.id) : false;
  const paga = desfecho !== 'cancelado';

  useDialogAccessibility({ open: true, dialogRef, onClose: () => { if (!ocupado) onFechar(); } });

  // Quem já está no rastro aparece primeiro na lista do pagamento.
  const candidatos = useMemo(() => {
    const ids = new Set(procurado.cacadores.map((cacador) => cacador.personagem_id));
    return [...personagensDaCampanha].sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [personagensDaCampanha, procurado.cacadores]);
  const divisao = dividirRecompensa(procurado.recompensa_valor, escolhidos.length);

  const executar = async (acao: () => Promise<{ procurado: IProcurado }>, sucesso: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const resposta = await acao();
      onAtualizado(resposta.procurado);
      avisar.sucesso(sucesso);
      return resposta.procurado;
    } catch (erro) {
      avisarErro(erro, 'Não foi possível concluir agora.');
      return null;
    } finally {
      setOcupado(false);
    }
  };

  const entrarOuSair = () => {
    if (!personagemAtivo) return;
    if (meuNaCacada) {
      void executar(() => procuradosApi.sair(campanhaId, procurado.id, personagemAtivo.id), `${personagemAtivo.nome} saiu da caçada.`);
    } else {
      void executar(() => procuradosApi.entrar(campanhaId, procurado.id, personagemAtivo.id), `${personagemAtivo.nome} está no rastro de ${procurado.nome}.`);
    }
  };

  const encerrar = async () => {
    if (paga && !escolhidos.length) {
      avisar.erro('Marque quem recebe a recompensa.');
      return;
    }
    const resultado = await executar(
      () => procuradosApi.encerrar(campanhaId, procurado.id, desfecho, paga ? escolhidos : []),
      paga ? 'Caçada encerrada e recompensa paga.' : 'Caçada cancelada.',
    );
    if (resultado) {
      setEncerrando(false);
      if (paga) onEconomiaMudou();
    }
  };

  const alternar = (id: string) => setEscolhidos((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-viewport fixed inset-0 z-[115] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalhe-procurado-titulo"
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        className="modal-surface loja-modal loja-modal--largo custom-scrollbar"
      >
        <button type="button" className="loja-botao-icone loja-modal__fechar" onClick={onFechar} disabled={ocupado} aria-label="Fechar o cartaz"><X size={18} /></button>
        <div className="detalhe-procurado">
          <div className="detalhe-procurado__cartaz">
            <CartazProcurado procurado={procurado} destaque />
          </div>

          <div className="detalhe-procurado__dossie">
            <span className="loja-eyebrow">
              {STATUS_PROCURADO[procurado.status].rotulo}{!procurado.publicado ? ' · rascunho, os jogadores não veem' : ''}
            </span>
            <h2 id="detalhe-procurado-titulo">{procurado.nome}</h2>
            {procurado.especie ? <p className="detalhe-procurado__especie">{procurado.especie}</p> : null}

            <dl className="detalhe-procurado__fatos">
              <div><dt>Recompensa</dt><dd className="detalhe-procurado__recompensa">{procurado.recompensa_valor > 0 ? textoRecompensa(procurado.recompensa_valor, procurado.recompensa_moeda) : 'A combinar com quem contrata'}</dd></div>
              <div><dt>Entrega</dt><dd>{rotuloCondicao(procurado.condicao)}</dd></div>
              <div><dt>Ameaça</dt><dd><span className="detalhe-procurado__ameaca" style={{ '--ameaca': ameaca.cor } as React.CSSProperties}><i aria-hidden="true" />{ameaca.rotulo}</span>{procurado.vd !== null ? ` · VD ${procurado.vd}` : ''}</dd></div>
              {procurado.local ? <div><dt>Visto por último</dt><dd>{procurado.local}</dd></div> : null}
            </dl>

            {procurado.descricao ? (
              <section className="detalhe-procurado__bloco">
                <h3><ScrollText size={14} /> O que se sabe</h3>
                <p>{procurado.descricao}</p>
              </section>
            ) : null}

            {gestor && procurado.notas_mestre ? (
              <section className="detalhe-procurado__bloco detalhe-procurado__bloco--segredo">
                <h3><Eye size={14} /> Notas do Mestre</h3>
                <p>{procurado.notas_mestre}</p>
              </section>
            ) : null}

            <section className="detalhe-procurado__bloco">
              <h3><Crosshair size={14} /> No rastro</h3>
              {procurado.cacadores.length ? (
                <ul className="detalhe-procurado__cacadores">
                  {procurado.cacadores.map((cacador) => (
                    <li key={cacador.personagem_id} className={cacador.meu ? 'is-meu' : ''}>{cacador.nome}{cacador.meu ? ' (seu)' : ''}</li>
                  ))}
                </ul>
              ) : (
                <p className="loja-apagado">{aberto ? 'Ninguém aceitou este contrato ainda.' : 'Ninguém entrou nesta caçada.'}</p>
              )}
            </section>

            {procurado.pagamento ? (
              <section className="detalhe-procurado__bloco detalhe-procurado__bloco--pago">
                <h3><Check size={14} /> Recompensa paga</h3>
                <ul className="detalhe-procurado__pagos">
                  {procurado.pagamento.personagens.map((pago) => (
                    <li key={pago.id}><span>{pago.nome}</span><strong>{textoRecompensa(pago.valor, procurado.pagamento!.moeda)}</strong></li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="detalhe-procurado__acoes">
              {aberto && procurado.publicado ? (
                personagemAtivo ? (
                  <button type="button" className={`loja-botao ${meuNaCacada ? 'loja-botao--fantasma' : ''}`} onClick={entrarOuSair} disabled={ocupado}>
                    {ocupado ? <Loader2 size={15} className="animate-spin" /> : meuNaCacada ? <LogOut size={15} /> : <Crosshair size={15} />}
                    {meuNaCacada ? `Tirar ${personagemAtivo.nome} da caçada` : `Aceitar o contrato com ${personagemAtivo.nome}`}
                  </button>
                ) : (
                  <p className="loja-apagado">Escolha um personagem seu no topo da Loja para aceitar o contrato.</p>
                )
              ) : null}
              {gestor ? (
                <>
                  <button type="button" className="loja-botao loja-botao--fantasma" onClick={onEditar} disabled={ocupado}><Pencil size={15} /> Editar cartaz</button>
                  {!procurado.pagamento ? (
                    <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => setEncerrando((atual) => !atual)} aria-expanded={encerrando} disabled={ocupado}>
                      <Check size={15} /> Encerrar caçada
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>

            {gestor && encerrando && !procurado.pagamento ? (
              <section className="detalhe-procurado__encerrar" aria-label="Encerrar a caçada">
                <div className="loja-segmentos" role="radiogroup" aria-label="Como a caçada terminou">
                  {DESFECHOS.map((opcao) => (
                    <button key={opcao.id} type="button" role="radio" aria-checked={desfecho === opcao.id} className={desfecho === opcao.id ? 'is-ativo' : ''} onClick={() => setDesfecho(opcao.id)} title={opcao.dica}>{opcao.rotulo}</button>
                  ))}
                </div>
                <p className="loja-apagado">{DESFECHOS.find((opcao) => opcao.id === desfecho)?.dica}</p>
                {paga ? (
                  <>
                    <p className="detalhe-procurado__instrucao">Quem recebe? A recompensa se divide igual entre os marcados.</p>
                    {candidatos.length ? (
                      <ul className="detalhe-procurado__escolha">
                        {candidatos.map((personagem) => {
                          const marcado = escolhidos.includes(personagem.id);
                          const parte = marcado ? divisao[escolhidos.indexOf(personagem.id)] ?? 0 : 0;
                          return (
                            <li key={personagem.id}>
                              <label>
                                <input type="checkbox" checked={marcado} onChange={() => alternar(personagem.id)} />
                                <span>{personagem.nome}</span>
                                {procurado.cacadores.some((cacador) => cacador.personagem_id === personagem.id) ? <em>no rastro</em> : null}
                                {marcado && procurado.recompensa_valor > 0 ? <strong>{textoRecompensa(parte, procurado.recompensa_moeda)}</strong> : null}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="loja-apagado">Nenhum personagem ativo na campanha.</p>
                    )}
                  </>
                ) : null}
                <div className="detalhe-procurado__confirmar">
                  <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => setEncerrando(false)} disabled={ocupado}>Voltar</button>
                  <button type="button" className={`loja-botao ${paga ? '' : 'loja-botao--perigo'}`} onClick={() => void encerrar()} disabled={ocupado || (paga && !escolhidos.length)}>
                    {ocupado ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {paga ? (procurado.recompensa_valor > 0 ? 'Pagar e encerrar' : 'Encerrar') : 'Cancelar o contrato'}
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
