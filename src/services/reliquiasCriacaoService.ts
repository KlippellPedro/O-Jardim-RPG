export interface RessonanciaReliquia {
  nome: string;
  efeito: string;
}

const texto = (valor: unknown): string => typeof valor === 'string' ? valor.trim() : '';

const normalizar = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

export function ehReliquiaCriacao(dados: Record<string, unknown> | null | undefined): boolean {
  if (!dados) return false;
  return normalizar(dados.natureza) === 'reliquia-criacao'
    || (
      normalizar(dados.raridade) === 'reliquia da criacao'
      && normalizar(dados.tipo) !== 'fruto-eden'
    );
}

export function lerRessonanciaReliquia(
  dados: Record<string, unknown> | null | undefined,
): RessonanciaReliquia | null {
  const bruta = dados?.ressonancia;
  if (!bruta || typeof bruta !== 'object' || Array.isArray(bruta)) return null;
  const ressonancia = bruta as Record<string, unknown>;
  const nome = texto(ressonancia.nome);
  const efeito = texto(ressonancia.efeito);
  return nome && efeito ? { nome, efeito } : null;
}
