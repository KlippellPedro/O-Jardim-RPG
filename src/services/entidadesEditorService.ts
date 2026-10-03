import type {
  ClassificacaoEntidadeId,
  EntidadeCatalogo,
  RankPerigoId,
  SecaoContoEntidade,
  TemaEntidade,
} from '../../data/mundo/entidades';

/**
 * Peças puras do editor de Entidades do Painel do Criador. O servidor valida de
 * novo tudo isto (plataforma/routers/content.py, _validate_entity_content), mas
 * conferir aqui evita mandar um rascunho que vai voltar recusado.
 */

/** O que o Criador preenche no formulário. */
export interface FormularioEntidade {
  id: string;
  nome: string;
  epiteto: string;
  epigrafe: string;
  resumo: string;
  rankPerigo: RankPerigoId;
  classificacao: ClassificacaoEntidadeId[];
  cor: string;
  texto: string;
  revelado: boolean;
}

export const FORMULARIO_VAZIO: FormularioEntidade = {
  id: '',
  nome: '',
  epiteto: '',
  epigrafe: '',
  resumo: '',
  rankPerigo: 'azul',
  classificacao: [],
  cor: '#c9a227',
  texto: '',
  revelado: true,
};

/** "Colecionador de Sombras" vira "colecionador-de-sombras". */
export function idDaEntidade(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Texto corrido do formulário para as partes do conto. Parágrafos se separam
 * por linha em branco; uma linha que começa com "# " abre uma parte nova com
 * aquele título.
 */
export function textoParaConto(texto: string): SecaoContoEntidade[] {
  const secoes: SecaoContoEntidade[] = [];
  let atual: SecaoContoEntidade = { paragrafos: [] };
  let paragrafo: string[] = [];
  const fecharParagrafo = () => {
    const junto = paragrafo.join(' ').replace(/\s+/g, ' ').trim();
    if (junto) atual.paragrafos.push(junto);
    paragrafo = [];
  };
  const fecharSecao = () => {
    fecharParagrafo();
    if (atual.paragrafos.length > 0) secoes.push(atual);
  };
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    const titulo = linha.match(/^#\s+(.+)$/);
    if (titulo) {
      fecharSecao();
      atual = { titulo: titulo[1].trim(), paragrafos: [] };
    } else if (linha.trim() === '') {
      fecharParagrafo();
    } else {
      paragrafo.push(linha.trim());
    }
  }
  fecharSecao();
  return secoes;
}

/** O caminho de volta: partes do conto para o texto do formulário. */
export function contoParaTexto(conto: readonly SecaoContoEntidade[]): string {
  return conto
    .map((secao) => [secao.titulo ? `# ${secao.titulo}` : '', ...secao.paragrafos].filter(Boolean).join('\n\n'))
    .join('\n\n');
}

/** Tema do conto a partir de uma cor só: o resto segue o padrão escuro do Livro. */
export function temaDaCor(cor: string): TemaEntidade {
  const hex = /^#[0-9a-f]{6}$/i.test(cor) ? cor.toLowerCase() : FORMULARIO_VAZIO.cor;
  const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16));
  return {
    destaque: hex,
    destaqueSuave: `rgba(${r}, ${g}, ${b}, .15)`,
    fundo: '#05060a',
    superficie: 'rgba(13, 15, 20, .86)',
    texto: '#eef1f5',
    textoSuave: '#9da3ae',
  };
}

/** O documento do conto, no mesmo formato das Entidades oficiais. */
export function montarEntidade(formulario: FormularioEntidade): EntidadeCatalogo {
  const opcional = (valor: string) => (valor.trim() ? valor.trim() : undefined);
  const entidade: EntidadeCatalogo = {
    id: formulario.id,
    nome: formulario.nome.trim(),
    registroUniversal: true,
    epiteto: opcional(formulario.epiteto),
    epigrafe: opcional(formulario.epigrafe),
    resumo: opcional(formulario.resumo),
    rankPerigo: formulario.rankPerigo,
    classificacao: [...formulario.classificacao],
    tema: temaDaCor(formulario.cor),
    conto: textoParaConto(formulario.texto),
    revelado: formulario.revelado,
  };
  // Campo vazio sai do documento: o servidor recusa texto em branco.
  return Object.fromEntries(Object.entries(entidade).filter(([, valor]) => valor !== undefined)) as unknown as EntidadeCatalogo;
}

/** Formulário a partir de um conto já salvo no painel. */
export function formularioDaEntidade(entidade: Partial<EntidadeCatalogo>, revelado = true): FormularioEntidade {
  return {
    id: String(entidade.id || ''),
    nome: String(entidade.nome || ''),
    epiteto: String(entidade.epiteto || ''),
    epigrafe: String(entidade.epigrafe || ''),
    resumo: String(entidade.resumo || ''),
    rankPerigo: (entidade.rankPerigo || 'azul') as RankPerigoId,
    classificacao: Array.isArray(entidade.classificacao) ? [...entidade.classificacao] : [],
    cor: entidade.tema?.destaque && /^#[0-9a-f]{6}$/i.test(entidade.tema.destaque) ? entidade.tema.destaque : FORMULARIO_VAZIO.cor,
    texto: Array.isArray(entidade.conto) ? contoParaTexto(entidade.conto) : '',
    revelado,
  };
}

/** O que impede de salvar, em frase para o Criador. Lista vazia: pode salvar. */
export function problemasDoFormulario(formulario: FormularioEntidade): string[] {
  const problemas: string[] = [];
  if (!formulario.nome.trim()) problemas.push('Dê um nome à Entidade.');
  if (formulario.nome.trim().length > 120) problemas.push('O nome passou de 120 caracteres.');
  if (formulario.epiteto.trim().length > 160) problemas.push('O epíteto passou de 160 caracteres.');
  if (formulario.epigrafe.trim().length > 400) problemas.push('A epígrafe passou de 400 caracteres.');
  if (formulario.resumo.trim().length > 600) problemas.push('O resumo passou de 600 caracteres.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(formulario.id)) problemas.push('O identificador só pode ter letras minúsculas, números e hífen.');
  if (formulario.classificacao.length === 0) problemas.push('Escolha ao menos uma classificação.');
  const conto = textoParaConto(formulario.texto);
  if (conto.length === 0) problemas.push('Escreva o conto: é ele que faz a Entidade existir.');
  if (conto.some((secao) => secao.paragrafos.some((paragrafo) => paragrafo.length > 5000))) {
    problemas.push('Um parágrafo passou de 5000 caracteres. Quebre em parágrafos menores.');
  }
  if (conto.length > 30) problemas.push('O conto tem mais de 30 partes.');
  return problemas;
}
