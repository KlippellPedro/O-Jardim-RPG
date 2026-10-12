/** Regras puras das fichas de Artefato, Fruto do Éden e Facção. Sem React, para ser testável. */

export interface IRaridade {
  rotulo: string;
  /** Cor em `r,g,b` (variável `--deg-rgb` da ficha). */
  rgb: string;
  /** 0 a 4: quanto a moldura cresce, a mesma escala do peso das criaturas. */
  peso: number;
}

export const RARIDADES: Record<string, IRaridade> = {
  comum: { rotulo: 'Comum', rgb: '139,143,152', peso: 0 },
  incomum: { rotulo: 'Incomum', rgb: '110,200,120', peso: 0 },
  raro: { rotulo: 'Raro', rgb: '90,160,255', peso: 1 },
  epico: { rotulo: 'Épico', rgb: '200,100,230', peso: 2 },
  lendario: { rotulo: 'Lendário', rgb: '235,170,60', peso: 3 },
  'reliquia da criacao': { rotulo: 'Relíquia da Criação', rgb: '244,114,182', peso: 3 },
  mitico: { rotulo: 'Mítico', rgb: '230,80,90', peso: 4 },
};

export const raridadeDe = (chave: string): IRaridade =>
  RARIDADES[chave] ?? { rotulo: chave ? chave.charAt(0).toLocaleUpperCase('pt-BR') + chave.slice(1) : 'Sem raridade', rgb: '139,143,152', peso: 0 };

/** "Corpo Ígneo: Resistência 15 contra Fogo" vira nome e texto. Sem ":" curto, tudo é texto. */
export function nomeETexto(linha: string): { nome: string; texto: string } {
  const casamento = String(linha ?? '').match(/^([^:]{2,48}):\s+([\s\S]+)$/);
  return casamento ? { nome: casamento[1].trim(), texto: casamento[2].trim() } : { nome: '', texto: String(linha ?? '').trim() };
}

/** As duas letras do brasão de uma facção: "Banco Lunar" vira BL, "AstraTech" vira AS. */
export function monograma(titulo: string): string {
  const palavras = String(titulo ?? '')
    .split(/[\s-]+/)
    .filter((palavra) => palavra.length > 0 && !/^(d[aeo]s?|e|o|a|os|as|of|the)$/i.test(palavra));
  if (palavras.length >= 2) return `${palavras[0].charAt(0)}${palavras[1].charAt(0)}`.toLocaleUpperCase('pt-BR');
  return (palavras[0] ?? '?').slice(0, 2).toLocaleUpperCase('pt-BR');
}

/** O tipo da facção vem do arquivo sem acento ("instituicao-financeira"); na tela leva acento e maiúscula. */
const TIPO_DE_FACCAO: Record<string, string> = {
  'instituicao-financeira': 'Instituição financeira',
  'corporacao-tecnologica': 'Corporação tecnológica',
  'rede-de-transporte': 'Rede de transporte',
  'ordem-de-contencao': 'Ordem de contenção',
  'instituicao-de-pesquisa': 'Instituição de pesquisa',
  'guilda-de-cacadores': 'Guilda de caçadores',
  'casa-de-traducao': 'Casa de tradução',
  'sociedade-de-registro': 'Sociedade de registro',
  'ordem-de-socorro': 'Ordem de socorro',
  'rede-de-contrabando': 'Rede de contrabando',
  'culto-sanguinario': 'Culto sanguinário',
  'organizacao-criminosa': 'Organização criminosa',
};

export const tipoLegivel = (tipo: string): string => {
  const chave = String(tipo ?? '').trim();
  if (TIPO_DE_FACCAO[chave]) return TIPO_DE_FACCAO[chave];
  const texto = chave.replace(/-/g, ' ');
  return texto ? texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1) : '';
};
