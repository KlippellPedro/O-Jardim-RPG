/** "Hoje", "Ontem" ou "21 de set.": o rótulo do dia de cada grupo. */
export function rotuloDoDia(iso: string, agora: Date = new Date()): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dias = Math.round((inicioHoje.getTime() - data.getTime()) / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias < 0) return 'Em breve';
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(dias > 300 ? { year: 'numeric' } : {}) });
}

/** Junta as novidades por dia, mantendo a ordem (mais novo primeiro). */
export function agruparPorDia<T extends { data: string }>(itens: T[]): Array<{ data: string; itens: T[] }> {
  const grupos: Array<{ data: string; itens: T[] }> = [];
  itens.forEach((item) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === item.data) ultimo.itens.push(item);
    else grupos.push({ data: item.data, itens: [item] });
  });
  return grupos;
}
