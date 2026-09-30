/**
 * Tabela de magia de uma classe por nível: círculo liberado, vagas de magia, teto
 * por círculo e vagas de Selo, Encantamento e Ritual. Sai dos marcos de
 * data/ficha/classes.json (`progressao_magia`, `progressao_selos`,
 * `progressao_encantamentos` e `progressao_rituais`), os mesmos que a ficha e o
 * servidor leem. O livro e a página da classe usam esta função para o jogador ler
 * a grade sem abrir a ficha.
 */

interface IMarcoBruto { nivel: number; circulo?: number; vagas?: number; teto_por_circulo?: number }
interface IFonteBruta { marcos?: IMarcoBruto[] }
interface IClasseComMagia {
  progressao_magia?: IFonteBruta;
  progressao_selos?: IFonteBruta;
  progressao_encantamentos?: IFonteBruta;
  progressao_rituais?: IFonteBruta;
}

export interface ILinhaMagiaDaClasse {
  nivel: number;
  circulo: number | null;
  vagasMagia: number | null;
  tetoPorCirculo: number | null;
  vagasSelos: number | null;
  vagasEncantamentos: number | null;
  vagasRituais: number | null;
}

const marcosDe = (fonte?: IFonteBruta): IMarcoBruto[] => (
  (Array.isArray(fonte?.marcos) ? fonte!.marcos! : []).map((marco) => ({ ...marco, nivel: Number(marco.nivel) }))
    .sort((a, b) => a.nivel - b.nivel)
);

/** Marco vigente no nível: o último cujo nível já foi alcançado. */
const vigente = (marcos: IMarcoBruto[], nivel: number): IMarcoBruto | null => (
  [...marcos].reverse().find((marco) => nivel >= marco.nivel) ?? null
);

/** Uma linha por nível em que qualquer fonte da classe ganha algo. */
export function linhasDeMagiaDaClasse(entrada: object): ILinhaMagiaDaClasse[] {
  const classe = entrada as IClasseComMagia;
  const magia = marcosDe(classe.progressao_magia);
  const selos = marcosDe(classe.progressao_selos);
  const encantamentos = marcosDe(classe.progressao_encantamentos);
  const rituais = marcosDe(classe.progressao_rituais);
  const niveis = [...new Set([...magia, ...selos, ...encantamentos, ...rituais].map((marco) => marco.nivel))].sort((a, b) => a - b);
  return niveis.map((nivel) => {
    const daMagia = vigente(magia, nivel);
    return {
      nivel,
      circulo: daMagia?.circulo ?? null,
      vagasMagia: daMagia ? Number(daMagia.vagas) || 0 : null,
      tetoPorCirculo: daMagia && Number(daMagia.teto_por_circulo) > 0 ? Number(daMagia.teto_por_circulo) : null,
      vagasSelos: vigente(selos, nivel) ? Number(vigente(selos, nivel)!.vagas) || 0 : null,
      vagasEncantamentos: vigente(encantamentos, nivel) ? Number(vigente(encantamentos, nivel)!.vagas) || 0 : null,
      vagasRituais: vigente(rituais, nivel) ? Number(vigente(rituais, nivel)!.vagas) || 0 : null,
    };
  });
}

/** A classe tem alguma fonte de magia, selo, encantamento ou ritual? */
export const classeTemMagia = (classe: object): boolean => linhasDeMagiaDaClasse(classe).length > 0;
