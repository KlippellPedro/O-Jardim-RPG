export interface AvisoSuaVez {
  chave: number;
  nome: string;
  rodada: number;
}

type Ouvinte = (aviso: AvisoSuaVez) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;
let ultimo = { chave: '', quando: 0 };

/** "É a sua vez!" no combate. A mesma vez pode chegar por duas telas (o evento
 * da ficha e o estado da sessão); repetições em menos de 2 s são ignoradas. */
export const dispararSuaVez = (dados: { nome: string; rodada: number }) => {
  const chave = `${dados.nome}|${dados.rodada}`;
  const agora = Date.now();
  if (ultimo.chave === chave && agora - ultimo.quando < 2000) return;
  ultimo = { chave, quando: agora };
  contador += 1;
  const aviso = { chave: contador, nome: dados.nome, rodada: dados.rodada };
  ouvintes.forEach((ouvinte) => ouvinte(aviso));
};

export const inscreverSuaVez = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
