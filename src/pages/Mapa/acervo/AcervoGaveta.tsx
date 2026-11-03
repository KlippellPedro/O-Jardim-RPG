import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Folder, FolderPlus, FolderUp, ImagePlus, Info, Loader2, Map as MapaIcone, Search, Trash2, User, X } from 'lucide-react';
import { acervoApi, LICENCAS_ACERVO, type IAcervo, type IItemAcervo, type LicencaAcervo, type TipoItemAcervo } from '../../../services/acervoApi';
import { urlPedaco } from '../../../services/mapaApi';
import { confirmar, pedirTexto } from '../../../components/avisos/confirmacao';
import { imagensDaSelecao, pastaDoArquivo, subirParaOAcervo, type ProgressoEnvio } from './subirImagem';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  /** Há uma cena aberta para receber o mapa ou o token. */
  temCena: boolean;
  onUsarComoMapa: (item: IItemAcervo) => void;
  onNovaCena: (item: IItemAcervo) => void;
  onPorNaCena: (item: IItemAcervo) => void;
}

const TIPOS: Array<{ id: TipoItemAcervo; rotulo: string }> = [
  { id: 'mapa', rotulo: 'Mapas' },
  { id: 'token', rotulo: 'Tokens' },
  { id: 'objeto', rotulo: 'Objetos' },
];

function tamanhoLegivel(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2)).toLocaleString('pt-BR')} MB`;
}

/** Autoria, origem e licença de uma imagem: o Mestre anota para saber se pode usar e a quem dar crédito. */
const InfoDaImagem = ({ item, onSalvo, onFechar }: { item: IItemAcervo; onSalvo: (item: IItemAcervo) => void; onFechar: () => void }) => {
  const [autoria, setAutoria] = useState(item.autoria ?? '');
  const [origem, setOrigem] = useState(item.origem ?? '');
  const [licenca, setLicenca] = useState<LicencaAcervo | ''>(item.licenca ?? '');
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState('');
  const dica = LICENCAS_ACERVO.find((l) => l.id === licenca)?.dica;
  const salvar = async () => {
    setSalvando(true);
    setFalha('');
    try {
      onSalvo(await acervoApi.editarItem(item.id, { autoria, origem, licenca }));
    } catch (erro) {
      setFalha(erro instanceof Error ? erro.message : 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };
  return (
    <section className="mapa-acervo-info" aria-label={`Origem de ${item.nome}`}>
      <header>
        <strong>{item.nome}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={15} /></button>
      </header>
      <label className="mapa-menu-linha">Autoria <input value={autoria} maxLength={120} placeholder="Quem fez a imagem" onChange={(e) => setAutoria(e.target.value)} /></label>
      <label className="mapa-menu-linha">Origem <input value={origem} maxLength={300} placeholder="Endereço ou de onde veio" onChange={(e) => setOrigem(e.target.value)} /></label>
      <label className="mapa-menu-linha">
        Licença
        <select value={licenca} onChange={(e) => setLicenca(e.target.value as LicencaAcervo | '')}>
          <option value="">Não anotada</option>
          {LICENCAS_ACERVO.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </label>
      {dica && <p className="mapa-dica">{dica}</p>}
      {falha && <p className="mapa-erro">{falha}</p>}
      <button type="button" className="mapa-botao" disabled={salvando} onClick={() => void salvar()}>Salvar</button>
    </section>
  );
};

export const AcervoGaveta = ({ aberto, onFechar, temCena, onUsarComoMapa, onNovaCena, onPorNaCena }: Props) => {
  const [acervo, setAcervo] = useState<IAcervo | null>(null);
  const [erro, setErro] = useState('');
  const [pasta, setPasta] = useState<string | null | 'todas'>('todas');
  const [tipo, setTipo] = useState<TipoItemAcervo>('mapa');
  const [busca, setBusca] = useState('');
  const [envios, setEnvios] = useState<ProgressoEnvio[]>([]);
  const [infoDe, setInfoDe] = useState<IItemAcervo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivosRef = useRef<HTMLInputElement>(null);
  const pastaRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      setAcervo(await acervoApi.listar());
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir o acervo.');
    }
  }, []);

  useEffect(() => {
    if (aberto) void carregar();
  }, [aberto, carregar]);

  useEffect(() => {
    // O seletor de pasta do navegador só existe com o atributo fora do padrão do React.
    pastaRef.current?.setAttribute('webkitdirectory', '');
  }, [aberto]);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (acervo?.itens ?? []).filter((item) =>
      item.tipo === tipo
      && item.estado === 'pronto'
      && (pasta === 'todas' || item.pasta_id === pasta)
      && (!termo || item.nome.toLowerCase().includes(termo) || item.etiquetas.some((e) => e.includes(termo))));
  }, [acervo, busca, pasta, tipo]);

  const subir = async (lista: FileList | null, comPastas: boolean) => {
    const arquivos = lista ? imagensDaSelecao(lista) : [];
    if (!arquivos.length) return;
    setEnviando(true);
    setEnvios([]);
    const pastasCriadas = new Map<string, string>();
    try {
      for (const arquivo of arquivos) {
        let destino: string | null = pasta === 'todas' ? null : pasta;
        const caminho = comPastas ? pastaDoArquivo(arquivo) : null;
        if (caminho) {
          if (!pastasCriadas.has(caminho)) pastasCriadas.set(caminho, (await acervoApi.garantirCaminho(caminho)).id);
          destino = pastasCriadas.get(caminho)!;
        }
        await subirParaOAcervo(arquivo, {
          tipo,
          pastaId: destino,
          aoProgresso: (progresso) => setEnvios((atual) => [progresso, ...atual.filter((p) => p.arquivo !== progresso.arquivo)].slice(0, 6)),
        });
      }
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Uma imagem não subiu.');
    } finally {
      setEnviando(false);
      if (arquivosRef.current) arquivosRef.current.value = '';
      if (pastaRef.current) pastaRef.current.value = '';
    }
  };

  const novaPasta = async () => {
    const nome = await pedirTexto({ titulo: 'Nova pasta', campo: { rotulo: 'Nome da pasta', maximo: 80 }, rotuloConfirmar: 'Criar pasta' });
    if (!nome) return;
    try {
      const { id } = await acervoApi.criarPasta(nome, pasta === 'todas' ? null : pasta);
      await carregar();
      setPasta(id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para criar a pasta.');
    }
  };

  const apagarPasta = async (id: string, nome: string) => {
    if (!(await confirmar({ titulo: `Apagar a pasta "${nome}"?`, mensagem: 'As imagens de dentro vão para a raiz do acervo.', rotuloConfirmar: 'Apagar pasta', tom: 'perigo' }))) return;
    await acervoApi.apagarPasta(id);
    setPasta('todas');
    await carregar();
  };

  const apagarItem = async (item: IItemAcervo) => {
    if (!(await confirmar({ titulo: `Apagar "${item.nome}"?`, mensagem: 'Cena que usa este mapa fica sem imagem.', rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    try {
      await acervoApi.apagarItem(item.id);
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para apagar a imagem.');
    }
  };

  if (!aberto) return null;

  const pastasDe = (pai: string | null) => (acervo?.pastas ?? []).filter((p) => p.pai_id === pai);
  const arvore = (pai: string | null, nivel: number): JSX.Element[] => pastasDe(pai).flatMap((p) => [
    <li key={p.id} style={{ paddingLeft: `${nivel * 12}px` }}>
      <button type="button" className={pasta === p.id ? 'ativo' : ''} onClick={() => setPasta(p.id)}>
        <Folder size={14} /> {p.nome}
      </button>
      <button type="button" className="mapa-icone-mini" aria-label={`Apagar a pasta ${p.nome}`} onClick={() => void apagarPasta(p.id, p.nome)}>
        <Trash2 size={12} />
      </button>
    </li>,
    ...arvore(p.id, nivel + 1),
  ]);

  const uso = acervo?.uso_bytes ?? 0;

  return (
    <aside className="mapa-acervo" aria-label="Acervo">
      <header>
        <strong>Acervo</strong>
        <span className={uso > (acervo?.aviso_bytes ?? Infinity) ? 'mapa-acervo-uso alerta' : 'mapa-acervo-uso'}>
          {acervo ? `ocupa ${tamanhoLegivel(uso)}` : ''}
        </span>
        <button type="button" className="mapa-icone" aria-label="Fechar o acervo" onClick={onFechar}><X size={18} /></button>
      </header>

      <div className="mapa-acervo-corpo">
        <nav className="mapa-acervo-pastas">
          <ul>
            <li><button type="button" className={pasta === 'todas' ? 'ativo' : ''} onClick={() => setPasta('todas')}>Tudo</button></li>
            <li><button type="button" className={pasta === null ? 'ativo' : ''} onClick={() => setPasta(null)}>Fora de pasta</button></li>
            {arvore(null, 0)}
          </ul>
          <button type="button" className="mapa-botao-leve" onClick={() => void novaPasta()}><FolderPlus size={14} /> Nova pasta</button>
        </nav>

        <section className="mapa-acervo-itens">
          <div className="mapa-acervo-barra">
            <div className="mapa-abas" role="tablist">
              {TIPOS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tipo === t.id} className={tipo === t.id ? 'ativo' : ''} onClick={() => setTipo(t.id)}>{t.rotulo}</button>
              ))}
            </div>
            <label className="mapa-busca">
              <Search size={14} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" />
            </label>
            <button type="button" className="mapa-botao" disabled={enviando} onClick={() => arquivosRef.current?.click()}>
              <ImagePlus size={15} /> Subir imagens
            </button>
            <button type="button" className="mapa-botao" disabled={enviando} onClick={() => pastaRef.current?.click()}>
              <FolderUp size={15} /> Subir pasta
            </button>
            <input ref={arquivosRef} type="file" accept="image/*" multiple hidden onChange={(e) => void subir(e.target.files, false)} />
            <input ref={pastaRef} type="file" multiple hidden onChange={(e) => void subir(e.target.files, true)} />
          </div>

          {erro && <p className="mapa-erro">{erro}</p>}
          {envios.length > 0 && (
            <ul className="mapa-envios">
              {envios.map((p) => (
                <li key={p.arquivo}>
                  {enviando && p.feitos < p.total ? <Loader2 size={12} className="girando" /> : '✓'} {p.arquivo}: {p.feitos}/{p.total} pedaços
                </li>
              ))}
            </ul>
          )}

          <div className="mapa-acervo-grade">
            {itens.map((item) => (
              <figure key={item.id} className="mapa-acervo-item">
                <img src={urlPedaco(item.id, 'mini')} alt="" loading="lazy" />
                <figcaption>{item.nome}</figcaption>
                <small>
                  {item.largura} x {item.altura}
                  {(!item.licenca || item.licenca === 'desconhecida') && <span className="mapa-acervo-sem-licenca">sem licença</span>}
                </small>
                <div className="mapa-acervo-acoes">
                  {item.tipo === 'mapa' ? (
                    <>
                      {temCena && <button type="button" onClick={() => onUsarComoMapa(item)}><MapaIcone size={13} /> Nesta cena</button>}
                      <button type="button" onClick={() => onNovaCena(item)}>Nova cena</button>
                    </>
                  ) : (
                    temCena && <button type="button" onClick={() => onPorNaCena(item)}><User size={13} /> Pôr na cena</button>
                  )}
                  <button type="button" aria-label={`Origem e licença de ${item.nome}`} onClick={() => setInfoDe(item)}><Info size={13} /></button>
                  <button type="button" aria-label={`Apagar ${item.nome}`} onClick={() => void apagarItem(item)}><Trash2 size={13} /></button>
                </div>
              </figure>
            ))}
            {acervo && !itens.length && (
              <p className="mapa-vazio">
                Nada aqui ainda. Suba imagens ou uma pasta inteira do seu PC; as subpastas viram pastas do acervo.
              </p>
            )}
          </div>
        </section>
      </div>
      {infoDe && (
        <InfoDaImagem
          key={infoDe.id}
          item={infoDe}
          onSalvo={(salvo) => {
            setAcervo((atual) => atual && { ...atual, itens: atual.itens.map((i) => (i.id === salvo.id ? salvo : i)) });
            setInfoDe(null);
          }}
          onFechar={() => setInfoDe(null)}
        />
      )}
    </aside>
  );
};
