import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { IAuraToken, IEstadoMapa, ILuzToken, ITokenMapa, LadoToken, ParaQuem, TipoBarra, ITokenEdicao } from '../../../services/mapaApi';
import { SeletorDeMoldura } from '../oficina/OficinaGaveta';
import type { Enquadramento } from '../motor/molduras';
import { NotaDoMestre } from './NotaDoMestre';
import { ArtesDoToken } from './ArtesDoToken';
import { LootDoRecipiente } from './LootDoRecipiente';
import '../efeitosMapa.css';

interface Props {
  token: ITokenMapa;
  gestor: boolean;
  /** O Mestre travou uma moldura para todos: a escolha de cada um fica guardada, mas não aparece. */
  molduraMesa: string | null;
  onEditar: (dados: ITokenEdicao) => void;
  /** Guarda a nota do Mestre deste token (a função já leva o id do token, porque ela também roda ao fechar o menu). */
  onNota: (texto: string) => void;
  onMoldura: (id: string | null) => void;
  onEnquadramento: (enquadramento: Enquadramento) => void;
  onFechar: () => void;
  /** Campanha aberta: as artes extras do personagem moram nela. */
  campanhaId?: string | null;
  /** A arte do token mudou: recarrega o mapa para o token mostrar a nova. */
  onArteMudou?: () => void;
  /** Aplica o estado do mapa que o servidor devolve depois de mexer no loot do token. */
  onEstado?: (estado: IEstadoMapa) => void;
  /** Abre já nesta aba (o botão de baú da barra do token pede a aba Loot). */
  abaInicial?: Aba;
}

export type Aba = 'geral' | 'barras' | 'visual' | 'luz' | 'loot';

/** Atalhos de aura, em casas; a cor muda depois. */
const AURAS: Array<{ rotulo: string; aura: IAuraToken }> = [
  { rotulo: '1 casa', aura: { raio: 1, cor: '#facc15', visivel: true } },
  { rotulo: '2 casas', aura: { raio: 2, cor: '#7dd3fc', visivel: true } },
  { rotulo: '3 casas', aura: { raio: 3, cor: '#a78bfa', visivel: true } },
  { rotulo: '6 casas', aura: { raio: 6, cor: '#f87171', visivel: true } },
];

const BARRAS: Array<{ id: TipoBarra; rotulo: string }> = [
  { id: 'vida', rotulo: 'Vida' },
  { id: 'mana', rotulo: 'Mana' },
  { id: 'estamina', rotulo: 'Estamina' },
  { id: 'sanidade', rotulo: 'Sanidade' },
];

const PARA: Array<{ id: ParaQuem; rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'dono', rotulo: 'Só o dono e o Mestre' },
  { id: 'ninguem', rotulo: 'Ninguém' },
];

/** Atalhos de luz: o Mestre ou o jogador ajusta depois o alcance e a cor. */
const LUZES: Array<{ rotulo: string; luz: ILuzToken }> = [
  { rotulo: 'Vela', luz: { raio: 1.5, cor: '#ffc46b', tremula: true } },
  { rotulo: 'Tocha', luz: { raio: 4, cor: '#ff9a3c', tremula: true } },
  { rotulo: 'Lanterna', luz: { raio: 6, cor: '#ffe2a8', tremula: false } },
  { rotulo: 'Luz mágica', luz: { raio: 3, cor: '#9ecbff', tremula: false } },
];

const LADOS: Array<{ id: LadoToken; rotulo: string }> = [
  { id: 'jogador', rotulo: 'Jogador' },
  { id: 'aliado', rotulo: 'Aliado' },
  { id: 'inimigo', rotulo: 'Inimigo' },
  { id: 'neutro', rotulo: 'Neutro' },
];

const ROTULO_DA_ABA: Record<Aba, string> = { geral: 'Geral', barras: 'Barras', visual: 'Visual', luz: 'Luz e aura', loot: 'Loot' };

/**
 * As opções do token, em abas (antes era uma coluna só, com quase 1000 px de altura). O que se faz a toda hora
 * (esconder, falar como, tirar do mapa) está na barra colada no token (BarraToken); aqui ficam os ajustes.
 */
export const MenuToken = ({ token, gestor, molduraMesa, onEditar, onNota, onMoldura, onEnquadramento, onFechar, campanhaId, onArteMudou, onEstado, abaInicial }: Props) => {
  const config = token.config_barras;
  const podeVisual = gestor || token.e_meu;
  // Enquadramento só para a foto da ficha (imagem do Acervo já vem recortada pela Oficina).
  const temFotoDaFicha = Boolean(token.personagem_id && /^[fr]/.test(token.imagem ?? ''));
  const abas: Aba[] = ['geral', ...(config ? ['barras' as const] : []), ...(podeVisual ? ['visual' as const, 'luz' as const] : []), ...(gestor && campanhaId && onEstado ? ['loot' as const] : [])];
  const [aba, setAba] = useState<Aba>(abaInicial ?? 'geral');
  const abaAtual = abas.includes(aba) ? aba : 'geral';
  const [enquadramento, setEnquadramento] = useState<Enquadramento>(token.enquadramento);
  const espera = useRef<number | null>(null);
  const [luz, setLuz] = useState<ILuzToken | null>(token.luz);
  const esperaLuz = useRef<number | null>(null);
  const [aura, setAura] = useState<IAuraToken | null>(token.aura ?? null);
  const esperaAura = useRef<number | null>(null);

  useEffect(() => {
    setEnquadramento(token.enquadramento);
    setAba(abaInicial ?? 'geral');
  }, [token.id, abaInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  // A luz que vem do servidor vale, menos enquanto um controle ainda vai mandar a sua.
  useEffect(() => {
    if (esperaLuz.current === null) setLuz(token.luz);
  }, [token.id, token.luz]);

  useEffect(() => {
    if (esperaAura.current === null) setAura(token.aura ?? null);
  }, [token.id, token.aura]);

  const mudarAura = (parcial: Partial<IAuraToken>) => {
    if (!aura) return;
    const nova = { ...aura, ...parcial };
    setAura(nova);
    if (esperaAura.current !== null) window.clearTimeout(esperaAura.current);
    esperaAura.current = window.setTimeout(() => {
      esperaAura.current = null;
      onEditar({ aura: nova });
    }, 300);
  };

  const mudarLuz = (parcial: Partial<ILuzToken>) => {
    if (!luz) return;
    const nova = { ...luz, ...parcial };
    setLuz(nova);
    if (esperaLuz.current !== null) window.clearTimeout(esperaLuz.current);
    esperaLuz.current = window.setTimeout(() => {
      esperaLuz.current = null;
      onEditar({ luz: nova });
    }, 300);
  };

  const mudarEnquadramento = (parcial: Partial<Enquadramento>) => {
    const novo = { ...enquadramento, ...parcial };
    setEnquadramento(novo);
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => onEnquadramento(novo), 300);
  };

  const alternarBarra = (tipo: TipoBarra) => {
    if (!config) return;
    const mostrar = config.mostrar.includes(tipo) ? config.mostrar.filter((b) => b !== tipo) : [...config.mostrar, tipo];
    onEditar({ barras: { mostrar } });
  };

  return (
    <section className="mapa-menu-token" aria-label={`Opções do token ${token.nome}`}>
      <header>
        <strong>{token.nome}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar as opções" onClick={onFechar}><X size={16} /></button>
      </header>

      {abas.length > 1 && (
        <div className="mapa-menu-token-abas" role="tablist" aria-label="Opções do token">
          {abas.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={abaAtual === id} className={abaAtual === id ? 'ativo' : ''} onClick={() => setAba(id)}>{ROTULO_DA_ABA[id]}</button>
          ))}
        </div>
      )}

      {abaAtual === 'geral' && (
        <div className="mapa-menu-token-aba" role="tabpanel">
          {token.barras.length > 0 && (
            <ul className="mapa-menu-numeros">
              {token.barras.map((barra) => (
                <li key={barra.tipo} className={`barra-${barra.tipo}`}>
                  <span>{BARRAS.find((b) => b.id === barra.tipo)?.rotulo}</span>
                  <strong>{barra.maximo ? `${barra.atual} / ${barra.maximo}` : barra.rotulo}</strong>
                </li>
              ))}
            </ul>
          )}
          {token.condicoes.length > 0 && <p className="mapa-menu-condicoes">{token.condicoes.join(' · ')}</p>}
          {!token.barras.length && !token.condicoes.length && !gestor && <p className="mapa-dica">Este token não mostra números para você.</p>}
          {gestor && (
            <>
              <label className="mapa-menu-linha">
                Camada
                <select value={token.camada ?? 'personagens'} onChange={(e) => onEditar({ camada: e.target.value as ITokenEdicao['camada'] })}>
                  <option value="personagens">Personagens e tokens</option>
                  <option value="props">Itens e props</option>
                  <option value="montarias">Montarias</option>
                </select>
              </label>
              <label className="mapa-menu-linha">
                Tamanho
                <select value={token.porte} onChange={(e) => onEditar({ porte: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} x {n} quadrados</option>)}
                </select>
              </label>
              <label className="mapa-menu-linha">
                Lado
                <select value={token.lado} onChange={(e) => onEditar({ lado: e.target.value as LadoToken })}>
                  {LADOS.map((l) => <option key={l.id} value={l.id}>{l.rotulo}</option>)}
                </select>
              </label>
              {token.visibilidade && token.visibilidade !== 'total' && (
                <p className="mapa-dica">Na Sessão este participante está como "{token.visibilidade}": os jogadores veem só o que esse degrau deixa.</p>
              )}
              <NotaDoMestre key={token.id} valor={token.nota_mestre ?? ''} onSalvar={onNota} />
            </>
          )}
        </div>
      )}

      {abaAtual === 'barras' && config && (
        <div className="mapa-menu-token-aba" role="tabpanel">
          <p className="mapa-dica">Escolha quais recursos podem aparecer para quem tem permissão de ver este token.</p>
          <div className="mapa-menu-opcoes">
            {BARRAS.map((barra) => (
              <label key={barra.id}>
                <input type="checkbox" checked={config.mostrar.includes(barra.id)} onChange={() => alternarBarra(barra.id)} /> {barra.rotulo}
              </label>
            ))}
          </div>
          <label className="mapa-menu-linha">
            Quem vê
            <select value={config.para} onChange={(e) => onEditar({ barras: { para: e.target.value as ParaQuem } })}>
              {PARA.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </select>
          </label>
        </div>
      )}

      {abaAtual === 'visual' && podeVisual && (
        <div className="mapa-menu-token-aba" role="tabpanel">
          <div className="mapa-menu-botoes">
            <button type="button" className={`mapa-botao${token.flip_x ? ' ativo' : ''}`} aria-pressed={token.flip_x} onClick={() => onEditar({ flip_x: !token.flip_x })}>Espelhar na horizontal</button>
            <button type="button" className={`mapa-botao${token.flip_y ? ' ativo' : ''}`} aria-pressed={token.flip_y} onClick={() => onEditar({ flip_y: !token.flip_y })}>Espelhar na vertical</button>
          </div>
          {molduraMesa ? (
            <p className="mapa-dica">O Mestre escolheu uma moldura única para a mesa. A sua escolha volta quando ele liberar.</p>
          ) : (
            <>
              <SeletorDeMoldura valor={token.moldura} lado={token.lado} nivel={token.nivel} incluirNivel={Boolean(token.personagem_id)} onEscolher={(id) => onMoldura(id)} />
              <button type="button" className="mapa-botao-leve" onClick={() => onMoldura(null)}>Voltar ao padrão</button>
            </>
          )}
          {token.personagem_id && campanhaId && !token.imagem_id && (
            <fieldset>
              <legend>Artes do personagem</legend>
              <ArtesDoToken campanhaId={campanhaId} personagemId={token.personagem_id} nome={token.nome} aoMudarToken={onArteMudou} />
            </fieldset>
          )}
          {temFotoDaFicha && (
            <>
              <label className="mapa-menu-linha">Zoom da foto <input type="range" min={1} max={4} step={0.02} value={enquadramento.zoom} onChange={(e) => mudarEnquadramento({ zoom: Number(e.target.value) })} /></label>
              <label className="mapa-menu-linha">Foto para os lados <input type="range" min={-1} max={1} step={0.01} value={enquadramento.x} onChange={(e) => mudarEnquadramento({ x: Number(e.target.value) })} /></label>
              <label className="mapa-menu-linha">Foto para cima ou baixo <input type="range" min={-1} max={1} step={0.01} value={enquadramento.y} onChange={(e) => mudarEnquadramento({ y: Number(e.target.value) })} /></label>
            </>
          )}
        </div>
      )}

      {abaAtual === 'loot' && gestor && campanhaId && onEstado && (
        <div className="mapa-menu-token-aba" role="tabpanel">
          <LootDoRecipiente campanhaId={campanhaId} token={token} onEstado={onEstado} />
        </div>
      )}

      {abaAtual === 'luz' && podeVisual && (
        <div className="mapa-menu-token-aba" role="tabpanel">
          <fieldset>
            <legend>Luz</legend>
            <div className="mapa-luz-atalhos">
              <button type="button" className={!luz ? 'ativo' : ''} onClick={() => { setLuz(null); onEditar({ sem_luz: true }); }}>Sem luz</button>
              {LUZES.map((atalho) => (
                <button
                  key={atalho.rotulo}
                  type="button"
                  className={luz && luz.cor === atalho.luz.cor && luz.raio === atalho.luz.raio ? 'ativo' : ''}
                  onClick={() => { setLuz(atalho.luz); onEditar({ luz: atalho.luz }); }}
                >
                  <span className="mapa-luz-ponto" style={{ background: atalho.luz.cor }} /> {atalho.rotulo}
                </button>
              ))}
            </div>
            {luz && (
              <>
                <label className="mapa-menu-linha">
                  Alcance <span>{luz.raio.toLocaleString('pt-BR')} {luz.raio === 1 ? 'casa' : 'casas'}</span>
                  <input type="range" min={0.5} max={15} step={0.5} value={luz.raio} onChange={(e) => mudarLuz({ raio: Number(e.target.value) })} />
                </label>
                <label className="mapa-menu-linha">
                  Cor <input type="color" value={luz.cor} onChange={(e) => mudarLuz({ cor: e.target.value })} />
                </label>
                <label className="mapa-menu-linha">
                  <span><input type="checkbox" checked={luz.tremula} onChange={(e) => mudarLuz({ tremula: e.target.checked })} /> Tremula como chama</span>
                </label>
              </>
            )}
            <p className="mapa-dica">A luz aparece para todos e abre caminho quando o Mestre deixa a cena escura.</p>
          </fieldset>

          <fieldset>
            <legend>Aura</legend>
            <div className="mapa-luz-atalhos">
              <button type="button" className={!aura ? 'ativo' : ''} onClick={() => { setAura(null); onEditar({ sem_aura: true }); }}>Sem aura</button>
              {AURAS.map((atalho) => (
                <button
                  key={atalho.rotulo}
                  type="button"
                  className={aura && aura.raio === atalho.aura.raio ? 'ativo' : ''}
                  onClick={() => {
                    const nova = { ...atalho.aura, cor: aura?.cor ?? atalho.aura.cor, visivel: aura?.visivel ?? true };
                    setAura(nova);
                    onEditar({ aura: nova });
                  }}
                >
                  <span className="mapa-luz-ponto" style={{ background: aura?.cor ?? atalho.aura.cor }} /> {atalho.rotulo}
                </button>
              ))}
            </div>
            {aura && (
              <>
                <label className="mapa-menu-linha">
                  Raio <span>{aura.raio.toLocaleString('pt-BR')} {aura.raio === 1 ? 'casa' : 'casas'}</span>
                  <input type="range" min={0.5} max={12} step={0.5} value={aura.raio} onChange={(e) => mudarAura({ raio: Number(e.target.value) })} />
                </label>
                <label className="mapa-menu-linha">
                  Cor <input type="color" value={aura.cor} onChange={(e) => mudarAura({ cor: e.target.value })} />
                </label>
                {gestor && (
                  <label className="mapa-menu-linha">
                    <span><input type="checkbox" checked={aura.visivel} onChange={(e) => mudarAura({ visivel: e.target.checked })} /> Os jogadores veem</span>
                  </label>
                )}
              </>
            )}
            <p className="mapa-dica">A aura anda com o token: aura de proteção, alcance de uma magia, área de controle.</p>
          </fieldset>
        </div>
      )}
    </section>
  );
};
