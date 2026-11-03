import { RotateCcw, X } from 'lucide-react';
import type { TipoBarra } from '../../../services/mapaApi';
import {
  PREFERENCIAS_BARRAS_PADRAO,
  type EscolhaEnergia,
  type IPreferenciasBarrasMapa,
  type ModoVisualBarra,
} from '../motor/barrasToken';

interface Props {
  aberto: boolean;
  preferencias: IPreferenciasBarrasMapa;
  onMudar: (preferencias: IPreferenciasBarrasMapa) => void;
  onFechar: () => void;
}

const TIPOS: Array<{ id: TipoBarra; rotulo: string }> = [
  { id: 'vida', rotulo: 'Vida' },
  { id: 'mana', rotulo: 'Mana' },
  { id: 'estamina', rotulo: 'Estamina' },
  { id: 'sanidade', rotulo: 'Sanidade' },
];

const MODOS: Array<{ id: ModoVisualBarra; rotulo: string }> = [
  { id: 'barra', rotulo: 'Barra' },
  { id: 'anel', rotulo: 'Anel' },
  { id: 'numero', rotulo: 'Número' },
  { id: 'oculta', rotulo: 'Oculta' },
];

const ENERGIAS: Array<{ id: EscolhaEnergia; rotulo: string }> = [
  { id: 'automatico', rotulo: 'Automático' },
  { id: 'mana', rotulo: 'Mana' },
  { id: 'estamina', rotulo: 'Estamina' },
  { id: 'ambas', rotulo: 'Mana e Estamina' },
  { id: 'nenhuma', rotulo: 'Nenhuma' },
];

export const PreferenciasBarras = ({ aberto, preferencias, onMudar, onFechar }: Props) => {
  if (!aberto) return null;

  const mudarEnergia = (energia: EscolhaEnergia) => onMudar({ ...preferencias, energia });
  const mudarBarra = (tipo: TipoBarra, mudanca: Partial<IPreferenciasBarrasMapa['porTipo'][TipoBarra]>) => onMudar({
    ...preferencias,
    porTipo: { ...preferencias.porTipo, [tipo]: { ...preferencias.porTipo[tipo], ...mudanca } },
  });

  return (
    <aside className="mapa-config mapa-config-barras" aria-label="Aparência das barras">
      <header>
        <strong>Aparência das barras</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      <p className="mapa-dica">Estas escolhas valem só para você neste aparelho. O que aparece continua seguindo as permissões do token.</p>

      <fieldset>
        <legend>Recurso de energia</legend>
        <label className="mapa-menu-linha">
          Mostrar
          <select value={preferencias.energia} onChange={(evento) => mudarEnergia(evento.target.value as EscolhaEnergia)}>
            {ENERGIAS.map((energia) => <option key={energia.id} value={energia.id}>{energia.rotulo}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Formato e cor</legend>
        <div className="mapa-preferencias-barras-lista">
          {TIPOS.map((tipo) => {
            const visual = preferencias.porTipo[tipo.id];
            return (
              <div className="mapa-preferencia-barra" key={tipo.id}>
                <strong>{tipo.rotulo}</strong>
                <select aria-label={`Formato de ${tipo.rotulo}`} value={visual.modo} onChange={(evento) => mudarBarra(tipo.id, { modo: evento.target.value as ModoVisualBarra })}>
                  {MODOS.map((modo) => <option key={modo.id} value={modo.id}>{modo.rotulo}</option>)}
                </select>
                <label className="mapa-preferencia-cor">
                  Cor
                  <input
                    type="color"
                    aria-label={`Cor de ${tipo.rotulo}`}
                    value={visual.cor}
                    disabled={visual.modo === 'oculta'}
                    onChange={(evento) => mudarBarra(tipo.id, { cor: evento.target.value })}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <button type="button" className="mapa-botao-leve mapa-barras-restaurar" onClick={() => onMudar(PREFERENCIAS_BARRAS_PADRAO)}>
        <RotateCcw size={14} /> Restaurar padrão
      </button>
    </aside>
  );
};
