import { faseDaLua, INDICE_LUA_CARMESIM } from './calendarioMundo';

interface ILuaFaseProps {
  dia: number;
  /** O dia 29 do Limiar tem a Lua Carmesim. */
  carmesim?: boolean;
  tamanho?: number;
  className?: string;
  /** Sem título: quando a fase já está escrita ao lado. */
  decorativa?: boolean;
}

/** A Lua de um dia do mês, desenhada em SVG: a parte iluminada é o que sobra
 * entre a borda do disco e o terminador (uma elipse que muda de largura). */
export function LuaFase({ dia, carmesim: ehCarmesim = false, tamanho = 16, className, decorativa = false }: ILuaFaseProps) {
  const fase = faseDaLua(dia, ehCarmesim);
  const raio = 10;
  const centro = 12;
  const crescendo = fase.ciclo < 0.5;
  const p = crescendo ? fase.ciclo : 1 - fase.ciclo;
  const largura = raio * Math.abs(Math.cos(2 * Math.PI * p));
  const gibosa = p > 0.25;
  const cheia = fase.indice === 4;
  const carmesim = fase.indice === INDICE_LUA_CARMESIM;
  const nova = fase.indice === 0;
  const caminho = `M ${centro} ${centro - raio} A ${raio} ${raio} 0 0 1 ${centro} ${centro + raio} A ${largura.toFixed(2)} ${raio} 0 0 ${gibosa ? 1 : 0} ${centro} ${centro - raio} Z`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      className={className}
      role={decorativa ? undefined : 'img'}
      aria-hidden={decorativa ? true : undefined}
      aria-label={decorativa ? undefined : fase.nome}
    >
      {decorativa ? null : <title>{fase.nome}</title>}
      <circle cx={centro} cy={centro} r={raio} fill="#1b1a26" stroke="rgba(226,232,240,0.28)" strokeWidth="1" />
      {carmesim ? <circle cx={centro} cy={centro} r={raio + 1} fill="#b3122f" opacity="0.35" /> : null}
      {carmesim
        ? <circle cx={centro} cy={centro} r={raio} fill="#e11d48" />
        : nova ? null : cheia
        ? <circle cx={centro} cy={centro} r={raio} fill="#f1e9c8" />
        : <path d={caminho} fill="#f1e9c8" transform={crescendo ? undefined : `translate(${centro * 2} 0) scale(-1 1)`} />}
    </svg>
  );
}
