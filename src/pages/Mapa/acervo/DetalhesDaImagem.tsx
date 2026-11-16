import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { acervoApi, LICENCAS_ACERVO, type IItemAcervo, type IPastaAcervo, type LicencaAcervo, type TipoItemAcervo } from '../../../services/acervoApi';
import {
  etiquetasComFormato, etiquetasDoTexto, formatoDasEtiquetas, FORMATOS_DO_TOKEN, separarEtiquetas, type FormatoDoToken,
} from '../motor/formatoToken';
import { opcoesDePasta } from './organizacao';

interface Props {
  item: IItemAcervo;
  pastas: readonly IPastaAcervo[];
  onSalvo: (item: IItemAcervo) => void;
  onFechar: () => void;
}

const TIPOS: Array<{ id: TipoItemAcervo; rotulo: string }> = [
  { id: 'mapa', rotulo: 'Mapa' },
  { id: 'token', rotulo: 'Token' },
  { id: 'objeto', rotulo: 'Objeto' },
];

/**
 * Tudo o que se sabe e se muda de uma imagem do Acervo: nome, tipo, pasta, etiquetas, o formato que o token ganha
 * ao entrar na cena (redondo ou corpo inteiro) e a origem (autoria, endereço e licença).
 */
export const DetalhesDaImagem = ({ item, pastas, onSalvo, onFechar }: Props) => {
  const separadas = useMemo(() => separarEtiquetas(item.etiquetas), [item.etiquetas]);
  const [nome, setNome] = useState(item.nome);
  const [tipo, setTipo] = useState<TipoItemAcervo>(item.tipo);
  const [pastaId, setPastaId] = useState(item.pasta_id ?? '');
  const [etiquetas, setEtiquetas] = useState(separadas.visiveis.join(', '));
  const [formato, setFormato] = useState<FormatoDoToken>(formatoDasEtiquetas(item.etiquetas));
  const [autoria, setAutoria] = useState(item.autoria ?? '');
  const [origem, setOrigem] = useState(item.origem ?? '');
  const [licenca, setLicenca] = useState<LicencaAcervo | ''>(item.licenca ?? '');
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState('');
  const opcoes = useMemo(() => opcoesDePasta(pastas), [pastas]);
  const dicaDaLicenca = LICENCAS_ACERVO.find((l) => l.id === licenca)?.dica;
  const usaFormato = tipo === 'token' || tipo === 'objeto';

  const salvar = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setFalha('A imagem precisa de um nome.');
      return;
    }
    setSalvando(true);
    setFalha('');
    try {
      const novasEtiquetas = etiquetasComFormato([...etiquetasDoTexto(etiquetas), ...separadas.doSistema], usaFormato ? formato : 'redondo');
      const salvo = await acervoApi.editarItem(item.id, {
        nome: nomeLimpo,
        ...(tipo !== item.tipo ? { tipo } : {}),
        ...(pastaId !== (item.pasta_id ?? '') ? (pastaId ? { pasta_id: pastaId } : { mover_para_raiz: true }) : {}),
        etiquetas: novasEtiquetas,
        autoria,
        origem,
        licenca,
      });
      onSalvo(salvo);
    } catch (erro) {
      setFalha(erro instanceof Error ? erro.message : 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="mapa-acervo-info acervo-detalhes" aria-label={`Detalhes de ${item.nome}`}>
      <header>
        <strong>{item.nome}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={15} /></button>
      </header>
      <small className="mapa-dica">{item.largura} x {item.altura} px</small>
      <label className="mapa-menu-linha">Nome <input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} /></label>
      <label className="mapa-menu-linha">
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoItemAcervo)}>
          {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
        </select>
      </label>
      <label className="mapa-menu-linha">
        Pasta
        <select value={pastaId} onChange={(e) => setPastaId(e.target.value)}>
          <option value="">Fora de pasta</option>
          {opcoes.map((o) => <option key={o.id} value={o.id}>{`${'  '.repeat(o.nivel)}${o.nome}`}</option>)}
        </select>
      </label>
      <label className="mapa-menu-linha">Etiquetas <input value={etiquetas} placeholder="lobo, floresta, inimigo" onChange={(e) => setEtiquetas(e.target.value)} /></label>

      {usaFormato && (
        <fieldset className="acervo-formato">
          <legend>Ao pôr na cena</legend>
          <div role="radiogroup" aria-label="Formato do token" className="mapa-menu-botoes">
            {FORMATOS_DO_TOKEN.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={formato === f.id} className={formato === f.id ? 'mapa-botao ativo' : 'mapa-botao-leve'} title={f.dica} onClick={() => setFormato(f.id)}>
                {f.rotulo}
              </button>
            ))}
          </div>
          <small className="mapa-dica">{FORMATOS_DO_TOKEN.find((f) => f.id === formato)?.dica} Vale para os tokens novos feitos desta imagem; cada token pode mudar pelo próprio menu.</small>
        </fieldset>
      )}

      <label className="mapa-menu-linha">Autoria <input value={autoria} maxLength={120} placeholder="Quem fez a imagem" onChange={(e) => setAutoria(e.target.value)} /></label>
      <label className="mapa-menu-linha">Origem <input value={origem} maxLength={300} placeholder="Endereço ou de onde veio" onChange={(e) => setOrigem(e.target.value)} /></label>
      <label className="mapa-menu-linha">
        Licença
        <select value={licenca} onChange={(e) => setLicenca(e.target.value as LicencaAcervo | '')}>
          <option value="">Não anotada</option>
          {LICENCAS_ACERVO.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </label>
      {dicaDaLicenca && <p className="mapa-dica">{dicaDaLicenca}</p>}
      {falha && <p className="mapa-erro">{falha}</p>}
      <button type="button" className="mapa-botao" disabled={salvando} onClick={() => void salvar()}>Salvar</button>
    </section>
  );
};
