import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Cloud, CloudFog, CloudLightning, CloudOff, CloudRain, Flame, Leaf, Moon, Orbit, Snowflake, Sparkles, Wind, X,
} from 'lucide-react';
import type { IAreaClima, IClima, IEfeitoClima, TipoEfeitoClima } from '../../../services/mapaApi';
import { MOLDURAS } from '../motor/molduras';
import { EFEITOS_CLIMA, MAX_EFEITOS_CLIMA } from '../motor/climaCatalogo';

const ICONES: Record<TipoEfeitoClima, typeof Cloud> = {
  chuva: CloudRain,
  tempestade: CloudLightning,
  neve: Snowflake,
  neblina: CloudFog,
  areia: Wind,
  cinzas: Flame,
  folhas: Leaf,
  escuridao: Moon,
  vazio: Orbit,
  fluxo: Sparkles,
};

const EFEITOS = EFEITOS_CLIMA.map((e) => ({ ...e, Icone: ICONES[e.id] }));

const FLUXOS = MOLDURAS.filter((m) => m.grupo === 'fluxo').map((m) => ({ id: m.id.slice('fluxo-'.length), rotulo: m.rotulo }));

const RUMOS = ['para a direita', 'para baixo e à direita', 'para baixo', 'para baixo e à esquerda', 'para a esquerda', 'para cima e à esquerda', 'para cima', 'para cima e à direita'];

function rumo(graus: number): string {
  return RUMOS[Math.round((((graus % 360) + 360) % 360) / 45) % 8];
}

function efeitoNovo(tipo: TipoEfeitoClima): IEfeitoClima {
  const efeito: IEfeitoClima = { tipo, intensidade: 0.5, area: null };
  if (tipo === 'fluxo') efeito.fluxo = 'essencia';
  if (tipo === 'escuridao') efeito.luz = 4;
  return efeito;
}

interface Props {
  clima: IClima;
  ligadoLocal: boolean;
  marcandoArea: boolean;
  onLigadoLocal: (ligado: boolean) => void;
  /** Mostra na tela na hora; o pedido ao servidor vai quando a mão para. */
  onPrevia: (clima: IClima) => void;
  onSalvar: (clima: IClima) => void;
  onMarcarArea: (aplicar: (area: IAreaClima) => void) => void;
  onFechar: () => void;
}

/** Clima da cena: até quatro efeitos juntos, cada um no mapa inteiro ou numa área, e o vento. */
export const PainelClima = ({ clima: doServidor, ligadoLocal, marcandoArea, onLigadoLocal, onPrevia, onSalvar, onMarcarArea, onFechar }: Props) => {
  const [clima, setClima] = useState<IClima>(doServidor);
  const espera = useRef<number | null>(null);

  // O que veio do servidor vale, menos enquanto um controle ainda vai mandar o seu.
  useEffect(() => {
    if (espera.current === null) setClima(doServidor);
  }, [doServidor]);

  useEffect(() => () => {
    if (espera.current !== null) window.clearTimeout(espera.current);
  }, []);

  const mudar = (novo: IClima, imediato = false) => {
    setClima(novo);
    onPrevia(novo);
    if (espera.current !== null) window.clearTimeout(espera.current);
    const salvar = () => {
      espera.current = null;
      onSalvar(novo);
    };
    if (imediato) salvar();
    else espera.current = window.setTimeout(salvar, 400);
  };

  const mudarEfeito = (indice: number, parcial: Partial<IEfeitoClima>, imediato = false) => {
    mudar({ ...clima, efeitos: clima.efeitos.map((e, i) => (i === indice ? { ...e, ...parcial } : e)) }, imediato);
  };

  return (
    <section className="mapa-config mapa-clima" aria-label="Clima da cena">
      <header>
        <strong>Clima</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      {clima.efeitos.length === 0 && <p className="mapa-dica">Céu limpo. Escolha um efeito abaixo; todos na mesa veem o mesmo.</p>}
      {clima.efeitos.map((efeito, indice) => {
        const info = EFEITOS.find((e) => e.id === efeito.tipo);
        const Icone = info?.Icone ?? Cloud;
        return (
          <div key={`${efeito.tipo}-${indice}`} className="mapa-clima-efeito">
            <div className="mapa-clima-topo">
              <Icone size={15} />
              <strong>{info?.rotulo ?? efeito.tipo}</strong>
              <button type="button" className="mapa-icone" aria-label={`Tirar ${info?.rotulo ?? 'efeito'}`} onClick={() => mudar({ ...clima, efeitos: clima.efeitos.filter((_, i) => i !== indice) }, true)}>
                <X size={14} />
              </button>
            </div>
            <label className="mapa-menu-linha">
              Intensidade <span>{Math.round(efeito.intensidade * 100)}%</span>
              <input type="range" min={0.05} max={1} step={0.05} value={efeito.intensidade} onChange={(e) => mudarEfeito(indice, { intensidade: Number(e.target.value) })} />
            </label>
            {efeito.tipo === 'escuridao' && (
              <label className="mapa-menu-linha">
                Luz em volta dos personagens <span>{(efeito.luz ?? 4).toLocaleString('pt-BR')} casas</span>
                <input type="range" min={0} max={15} step={0.5} value={efeito.luz ?? 4} onChange={(e) => mudarEfeito(indice, { luz: Number(e.target.value) })} />
              </label>
            )}
            {efeito.tipo === 'fluxo' && (
              <label className="mapa-menu-linha">
                Fluxo
                <select value={efeito.fluxo ?? 'essencia'} onChange={(e) => mudarEfeito(indice, { fluxo: e.target.value }, true)}>
                  {FLUXOS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
                </select>
              </label>
            )}
            <div className="mapa-clima-area">
              <span>{efeito.area ? 'Só numa área' : 'Mapa inteiro'}</span>
              <button
                type="button"
                className="mapa-botao-leve"
                disabled={marcandoArea}
                onClick={() => onMarcarArea((area) => mudarEfeito(indice, { area }, true))}
              >
                {marcandoArea ? 'Arraste no mapa...' : efeito.area ? 'Marcar outra área' : 'Marcar uma área'}
              </button>
              {efeito.area && <button type="button" className="mapa-botao-leve" onClick={() => mudarEfeito(indice, { area: null }, true)}>Mapa inteiro</button>}
            </div>
          </div>
        );
      })}
      {clima.efeitos.length < MAX_EFEITOS_CLIMA && (
        <div className="mapa-clima-escolha" role="group" aria-label="Acrescentar efeito">
          {EFEITOS.map(({ id, rotulo, Icone }) => (
            <button key={id} type="button" onClick={() => mudar({ ...clima, efeitos: [...clima.efeitos, efeitoNovo(id)] }, true)}>
              <Icone size={14} /> {rotulo}
            </button>
          ))}
        </div>
      )}
      <label className="mapa-menu-linha">
        Vento <span className="mapa-clima-rumo"><ArrowRight size={14} style={{ transform: `rotate(${clima.vento.direcao}deg)` }} /> {rumo(clima.vento.direcao)}</span>
        <input type="range" min={0} max={355} step={5} value={clima.vento.direcao} onChange={(e) => mudar({ ...clima, vento: { ...clima.vento, direcao: Number(e.target.value) } })} />
      </label>
      <label className="mapa-menu-linha">
        Força do vento <span>{Math.round(clima.vento.forca * 100)}%</span>
        <input type="range" min={0} max={1} step={0.05} value={clima.vento.forca} onChange={(e) => mudar({ ...clima, vento: { ...clima.vento, forca: Number(e.target.value) } })} />
      </label>
      <button type="button" className="mapa-botao-leve" onClick={() => onLigadoLocal(!ligadoLocal)}>
        {ligadoLocal ? <CloudOff size={14} /> : <Cloud size={14} />} {ligadoLocal ? 'Desligar os efeitos só neste aparelho' : 'Ligar os efeitos neste aparelho'}
      </button>
    </section>
  );
};
