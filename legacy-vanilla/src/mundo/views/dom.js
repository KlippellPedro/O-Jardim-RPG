export function obterElemento(id) {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`Elemento obrigatório não encontrado: #${id}`);
  return elemento;
}

export const content = obterElemento('mundo-content');
