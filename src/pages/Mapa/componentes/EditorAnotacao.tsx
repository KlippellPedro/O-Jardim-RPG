import { Trash2, X } from 'lucide-react';
import type { IAnotacaoMapa } from '../../../services/mapaApi';

interface Props {
  anotacao: IAnotacaoMapa;
  existente: boolean;
  onMudar: (anotacao: IAnotacaoMapa) => void;
  onSalvar: () => void;
  onApagar: () => void;
  onFechar: () => void;
}

export const EditorAnotacao = ({ anotacao, existente, onMudar, onSalvar, onApagar, onFechar }: Props) => (
  <section className="mapa-config mapa-editor-anotacao" aria-label="Editar anotação">
    <header>
      <strong>{existente ? 'Editar anotação' : 'Nova anotação'}</strong>
      <button type="button" className="mapa-icone" aria-label="Fechar editor de anotação" onClick={onFechar}><X size={16} /></button>
    </header>
    <label className="mapa-menu-linha">
      Texto
      <textarea autoFocus value={anotacao.texto} maxLength={320} rows={4} onChange={(evento) => onMudar({ ...anotacao, texto: evento.target.value })} placeholder="Escreva uma plaquinha ou uma nota..." />
    </label>
    <div className="mapa-editor-anotacao-opcoes">
      <label className="mapa-menu-linha">
        Letra
        <select value={anotacao.fonte} onChange={(evento) => onMudar({ ...anotacao, fonte: evento.target.value as IAnotacaoMapa['fonte'] })}>
          <option value="sans">Simples</option>
          <option value="serif">Serifada</option>
          <option value="fantasia">Fantasia</option>
          <option value="mono">Máquina</option>
        </select>
      </label>
      <label className="mapa-menu-linha">
        Tamanho <span>{anotacao.tamanho}px</span>
        <input type="range" min={12} max={72} step={1} value={anotacao.tamanho} onChange={(evento) => onMudar({ ...anotacao, tamanho: Number(evento.target.value) })} />
      </label>
      <label className="mapa-menu-linha">
        Cor da letra
        <input type="color" value={anotacao.cor} onChange={(evento) => onMudar({ ...anotacao, cor: evento.target.value })} />
      </label>
      <label className="mapa-editor-anotacao-placa">
        <input type="checkbox" checked={anotacao.placa} onChange={(evento) => onMudar({ ...anotacao, placa: evento.target.checked })} /> Usar fundo de plaquinha
      </label>
      <label className="mapa-editor-anotacao-placa">
        <input type="checkbox" checked={Boolean(anotacao.secreta)} onChange={(evento) => onMudar({ ...anotacao, secreta: evento.target.checked })} /> Nota secreta (só você vê)
      </label>
      {anotacao.placa && (
        <label className="mapa-menu-linha">
          Cor da placa
          <input type="color" value={anotacao.fundo} onChange={(evento) => onMudar({ ...anotacao, fundo: evento.target.value })} />
        </label>
      )}
    </div>
    <div className="mapa-editor-anotacao-acoes">
      {existente && <button type="button" className="mapa-botao perigo" onClick={onApagar}><Trash2 size={14} /> Apagar</button>}
      <button type="button" className="mapa-botao-leve" onClick={onFechar}>Cancelar</button>
      <button type="button" className="mapa-botao" disabled={!anotacao.texto.trim()} onClick={onSalvar}>Salvar</button>
    </div>
  </section>
);
