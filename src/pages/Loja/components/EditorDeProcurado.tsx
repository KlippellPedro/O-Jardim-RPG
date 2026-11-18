import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Images, Loader2, Search, Trash2, Upload, X } from 'lucide-react';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { acervoApi, type IItemAcervo } from '../../../services/acervoApi';
import {
  AMEACAS_PROCURADO,
  chaveDoRetrato,
  CONDICOES_PROCURADO,
  MOEDAS_RECOMPENSA,
  procuradosApi,
  STATUS_PROCURADO,
  type AmeacaProcurado,
  type CondicaoProcurado,
  type DadosProcurado,
  type IImagemProcurado,
  type IProcurado,
  type StatusProcurado,
} from '../../../services/procuradosApi';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import { CartazProcurado } from './CartazProcurado';

interface EditorDeProcuradoProps {
  campanhaId: string;
  /** Nulo para um cartaz novo. */
  procurado: IProcurado | null;
  onFechar: () => void;
  onSalvo: (procurado: IProcurado) => void;
  onApagado: (id: string) => void;
}

interface Formulario {
  nome: string;
  especie: string;
  local: string;
  descricao: string;
  condicao: CondicaoProcurado;
  ameaca: AmeacaProcurado;
  vd: string;
  recompensa_valor: string;
  recompensa_moeda: string;
  imagem: IImagemProcurado | null;
  imagem_foco: number;
  status: StatusProcurado;
  notas_mestre: string;
}

const PASTA_DOS_CARTAZES = 'Procurados';

function formularioDe(procurado: IProcurado | null): Formulario {
  return {
    nome: procurado?.nome ?? '',
    especie: procurado?.especie ?? '',
    local: procurado?.local ?? '',
    descricao: procurado?.descricao ?? '',
    condicao: procurado?.condicao ?? 'vivo-ou-morto',
    ameaca: procurado?.ameaca ?? 'desconhecida',
    vd: procurado?.vd !== null && procurado?.vd !== undefined ? String(procurado.vd) : '',
    recompensa_valor: procurado ? String(procurado.recompensa_valor) : '500',
    recompensa_moeda: procurado?.recompensa_moeda ?? 'Lunaris',
    imagem: procurado?.imagem ?? null,
    imagem_foco: procurado?.imagem_foco ?? 35,
    status: procurado?.status ?? 'aberto',
    notas_mestre: procurado?.notas_mestre ?? '',
  };
}

function imagemDoAcervo(item: IItemAcervo): IImagemProcurado {
  return { id: item.id, chave: chaveDoRetrato(item.largura, item.altura), largura: item.largura, altura: item.altura };
}

// Editor do Mestre: o cartaz à esquerda muda junto com o formulário à direita.
export const EditorDeProcurado: React.FC<EditorDeProcuradoProps> = ({ campanhaId, procurado, onFechar, onSalvo, onApagado }) => {
  const [form, setForm] = useState<Formulario>(() => formularioDe(procurado));
  const [salvando, setSalvando] = useState(false);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [acervo, setAcervo] = useState<IItemAcervo[] | null>(null);
  const [buscaAcervo, setBuscaAcervo] = useState('');
  const [enviando, setEnviando] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const pago = Boolean(procurado?.pagamento);

  useDialogAccessibility({ open: true, dialogRef, onClose: () => { if (!salvando) onFechar(); } });

  const mudar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setForm((atual) => ({ ...atual, [campo]: valor }));

  useEffect(() => {
    if (!galeriaAberta || acervo !== null) return;
    acervoApi.listar()
      .then((resposta) => setAcervo(
        resposta.itens
          .filter((item) => item.estado === 'pronto')
          .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
      ))
      .catch((erro: unknown) => {
        setAcervo([]);
        avisarErro(erro, 'Não foi possível abrir o acervo.');
      });
  }, [acervo, galeriaAberta]);

  const acervoFiltrado = useMemo(() => {
    const termo = buscaAcervo.trim().toLocaleLowerCase('pt-BR');
    return (acervo ?? []).filter((item) => !termo || item.nome.toLocaleLowerCase('pt-BR').includes(termo)).slice(0, 120);
  }, [acervo, buscaAcervo]);

  const enviarArquivo = async (arquivo: File) => {
    if (!/^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(arquivo.type)) {
      avisar.erro('Escolha uma imagem (PNG, JPG ou WebP).');
      return;
    }
    setEnviando('Preparando a imagem...');
    try {
      const { subirParaOAcervo } = await import('../../Mapa/acervo/subirImagem');
      const pasta = await acervoApi.garantirCaminho(PASTA_DOS_CARTAZES);
      const item = await subirParaOAcervo(arquivo, {
        tipo: 'token',
        pastaId: pasta.id,
        etiquetas: ['procurado'],
        aoProgresso: ({ feitos, total }) => setEnviando(`Enviando ${feitos} de ${total}...`),
      });
      mudar('imagem', imagemDoAcervo(item));
      setAcervo((atual) => (atual ? [item, ...atual] : atual));
      setGaleriaAberta(false);
    } catch (erro) {
      avisarErro(erro, 'Não foi possível enviar a imagem.');
    } finally {
      setEnviando(null);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  };

  const dados = (publicado: boolean): DadosProcurado | null => {
    const nome = form.nome.trim();
    if (!nome) {
      avisar.erro('Dê um nome ao procurado.');
      return null;
    }
    const valor = Number(form.recompensa_valor || 0);
    if (!Number.isInteger(valor) || valor < 0) {
      avisar.erro('A recompensa precisa ser um número inteiro.');
      return null;
    }
    const vd = form.vd.trim() === '' ? null : Number(form.vd);
    if (vd !== null && (!Number.isInteger(vd) || vd < 0 || vd > 999)) {
      avisar.erro('O VD vai de 0 a 999.');
      return null;
    }
    return {
      nome,
      especie: form.especie,
      local: form.local,
      descricao: form.descricao,
      condicao: form.condicao,
      ameaca: form.ameaca,
      vd,
      recompensa_valor: valor,
      recompensa_moeda: form.recompensa_moeda,
      imagem_id: form.imagem?.id ?? null,
      imagem_foco: form.imagem_foco,
      ...(pago ? {} : { status: form.status }),
      publicado,
      notas_mestre: form.notas_mestre,
    };
  };

  const salvar = async (publicado: boolean) => {
    const corpo = dados(publicado);
    if (!corpo || salvando) return;
    setSalvando(true);
    try {
      const resposta = procurado
        ? await procuradosApi.editar(campanhaId, procurado.id, corpo)
        : await procuradosApi.criar(campanhaId, corpo);
      avisar.sucesso(publicado ? `${corpo.nome} está no quadro.` : 'Rascunho guardado. Só quem comanda a mesa vê.');
      onSalvo(resposta.procurado);
    } catch (erro) {
      avisarErro(erro, 'Não foi possível salvar o cartaz.');
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async () => {
    if (!procurado || salvando) return;
    const ok = await confirmar({
      titulo: 'Arrancar o cartaz?',
      mensagem: `O cartaz de ${procurado.nome} sai do quadro e some para todo mundo. A imagem continua no seu acervo.`,
      rotuloConfirmar: 'Arrancar',
      tom: 'perigo',
    });
    if (!ok) return;
    setSalvando(true);
    try {
      await procuradosApi.apagar(campanhaId, procurado.id);
      onApagado(procurado.id);
    } catch (erro) {
      avisarErro(erro, 'Não foi possível apagar o cartaz.');
    } finally {
      setSalvando(false);
    }
  };

  const previa = {
    nome: form.nome.trim() || 'Nome do procurado',
    especie: form.especie,
    local: form.local,
    condicao: form.condicao,
    ameaca: form.ameaca,
    vd: form.vd.trim() === '' ? null : Number(form.vd) || 0,
    recompensa_valor: Number(form.recompensa_valor) || 0,
    recompensa_moeda: form.recompensa_moeda,
    imagem: form.imagem,
    imagem_foco: form.imagem_foco,
    status: form.status,
    publicado: procurado?.publicado ?? true,
    cacadores: procurado?.cacadores ?? [],
  };

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-viewport fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-procurado-titulo"
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        className="modal-surface loja-modal loja-modal--largo custom-scrollbar"
      >
        <header className="loja-modal__cabeca">
          <div>
            <span className="loja-eyebrow">Quadro dos Caçadores</span>
            <h2 id="editor-procurado-titulo">{procurado ? 'Editar cartaz' : 'Pregar um cartaz novo'}</h2>
          </div>
          <button type="button" className="loja-botao-icone" onClick={onFechar} disabled={salvando} aria-label="Fechar o editor"><X size={18} /></button>
        </header>

        <div className="editor-procurado">
          <div className="editor-procurado__previa">
            <CartazProcurado procurado={previa} destaque />
            {form.imagem ? (
              <label className="loja-campo">
                <span>Enquadrar o retrato</span>
                <input type="range" min={0} max={100} value={form.imagem_foco} onChange={(event) => mudar('imagem_foco', Number(event.target.value))} aria-label="Subir ou descer o retrato no cartaz" />
                <small>Arraste para mostrar mais o topo ou a base da imagem.</small>
              </label>
            ) : null}
          </div>

          <div className="editor-procurado__campos">
            <label className="loja-campo">
              <span>Nome ou apelido *</span>
              <input value={form.nome} maxLength={80} onChange={(event) => mudar('nome', event.target.value)} placeholder="O Lobo de Cinza" autoFocus />
            </label>
            <div className="loja-campos-duplos">
              <label className="loja-campo">
                <span>Que ser é</span>
                <input value={form.especie} maxLength={80} onChange={(event) => mudar('especie', event.target.value)} placeholder="Lobo das Brasas, bandido, espírito..." />
              </label>
              <label className="loja-campo">
                <span>Onde foi visto</span>
                <input value={form.local} maxLength={120} onChange={(event) => mudar('local', event.target.value)} placeholder="Estrada Norte, perto do moinho" />
              </label>
            </div>
            <label className="loja-campo">
              <span>O que fez e o que se sabe</span>
              <textarea value={form.descricao} maxLength={1200} rows={4} onChange={(event) => mudar('descricao', event.target.value)} placeholder="Atacou três carroças na última lua. Foge da luz e deixa pegadas queimadas." />
            </label>

            <fieldset className="loja-campo">
              <legend>Imagem do cartaz</legend>
              <div className="editor-procurado__imagem">
                <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => setGaleriaAberta((aberta) => !aberta)} aria-expanded={galeriaAberta}>
                  <Images size={15} /> {galeriaAberta ? 'Fechar o acervo' : 'Escolher do acervo'}
                </button>
                <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => arquivoRef.current?.click()} disabled={Boolean(enviando)}>
                  {enviando ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {enviando ?? 'Enviar do computador'}
                </button>
                {form.imagem ? (
                  <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => mudar('imagem', null)}>
                    <Trash2 size={15} /> Tirar imagem
                  </button>
                ) : null}
                <input ref={arquivoRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={(event) => { const arquivo = event.target.files?.[0]; if (arquivo) void enviarArquivo(arquivo); }} />
              </div>
              <small>A imagem enviada vai para a pasta “{PASTA_DOS_CARTAZES}” do seu acervo. Os jogadores só veem enquanto o cartaz estiver no quadro.</small>
              {galeriaAberta ? (
                <div className="editor-procurado__galeria">
                  <label className="loja-busca">
                    <Search size={15} aria-hidden="true" />
                    <input type="search" value={buscaAcervo} onChange={(event) => setBuscaAcervo(event.target.value)} placeholder="Procurar no acervo..." aria-label="Procurar imagem no acervo" />
                  </label>
                  {acervo === null ? (
                    <p className="loja-apagado"><Loader2 size={14} className="mr-1 inline animate-spin" /> Abrindo o acervo...</p>
                  ) : acervoFiltrado.length ? (
                    <ul className="editor-procurado__miniaturas">
                      {acervoFiltrado.map((item) => (
                        <li key={item.id}>
                          <button type="button" onClick={() => { mudar('imagem', imagemDoAcervo(item)); setGaleriaAberta(false); }} className={form.imagem?.id === item.id ? 'is-escolhida' : ''} title={item.nome}>
                            <img src={`/api/v1/acervo/itens/${item.id}/arquivos/mini`} alt="" loading="lazy" decoding="async" />
                            <span>{item.nome}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="loja-apagado"><ImagePlus size={14} className="mr-1 inline" /> Nenhuma imagem pronta no acervo. Envie uma do computador.</p>
                  )}
                </div>
              ) : null}
            </fieldset>

            <fieldset className="loja-campo">
              <legend>Como entregar</legend>
              <div className="loja-segmentos" role="radiogroup" aria-label="Condição da entrega">
                {CONDICOES_PROCURADO.map((opcao) => (
                  <button key={opcao.id} type="button" role="radio" aria-checked={form.condicao === opcao.id} className={form.condicao === opcao.id ? 'is-ativo' : ''} onClick={() => mudar('condicao', opcao.id)}>{opcao.rotulo}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="loja-campo">
              <legend>Ameaça</legend>
              <div className="loja-segmentos" role="radiogroup" aria-label="Nível de ameaça">
                {AMEACAS_PROCURADO.map((opcao) => (
                  <button key={opcao.id} type="button" role="radio" aria-checked={form.ameaca === opcao.id} className={form.ameaca === opcao.id ? 'is-ativo' : ''} style={{ '--segmento-cor': opcao.cor } as React.CSSProperties} onClick={() => mudar('ameaca', opcao.id)}>{opcao.rotulo}</button>
                ))}
              </div>
            </fieldset>

            <div className="loja-campos-triplos">
              <label className="loja-campo">
                <span>Recompensa</span>
                <input inputMode="numeric" value={form.recompensa_valor} onChange={(event) => mudar('recompensa_valor', event.target.value.replace(/\D+/g, ''))} placeholder="0 = a combinar" />
              </label>
              <label className="loja-campo">
                <span>Moeda</span>
                <select value={form.recompensa_moeda} onChange={(event) => mudar('recompensa_moeda', event.target.value)}>
                  {MOEDAS_RECOMPENSA.map((moeda) => <option key={moeda} value={moeda}>{moeda}</option>)}
                </select>
              </label>
              <label className="loja-campo">
                <span>VD (opcional)</span>
                <input inputMode="numeric" value={form.vd} onChange={(event) => mudar('vd', event.target.value.replace(/\D+/g, '').slice(0, 3))} placeholder="Ex.: 6" />
              </label>
            </div>

            {procurado ? (
              <label className="loja-campo">
                <span>Situação</span>
                <select value={form.status} onChange={(event) => mudar('status', event.target.value as StatusProcurado)} disabled={pago}>
                  {(Object.keys(STATUS_PROCURADO) as StatusProcurado[]).map((status) => <option key={status} value={status}>{STATUS_PROCURADO[status].rotulo}</option>)}
                </select>
                {pago ? <small>A recompensa já foi paga, então a situação não muda mais.</small> : <small>Para pagar a recompensa, use “Encerrar caçada” no cartaz.</small>}
              </label>
            ) : null}

            <label className="loja-campo loja-campo--segredo">
              <span>Notas do Mestre (só você vê)</span>
              <textarea value={form.notas_mestre} maxLength={2000} rows={3} onChange={(event) => mudar('notas_mestre', event.target.value)} placeholder="O que os jogadores ainda não sabem sobre este ser." />
            </label>
          </div>
        </div>

        <footer className="loja-modal__pe">
          {procurado ? (
            <button type="button" className="loja-botao loja-botao--perigo" onClick={() => void apagar()} disabled={salvando}><Trash2 size={15} /> Arrancar cartaz</button>
          ) : <span />}
          <div className="loja-modal__pe-acoes">
            <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => void salvar(false)} disabled={salvando}>
              {procurado?.publicado ? 'Tirar do quadro' : 'Guardar rascunho'}
            </button>
            <button type="button" className="loja-botao" onClick={() => void salvar(true)} disabled={salvando}>
              {salvando ? <Loader2 size={15} className="animate-spin" /> : null}
              {procurado?.publicado ? 'Salvar no quadro' : 'Pregar no quadro'}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
};
