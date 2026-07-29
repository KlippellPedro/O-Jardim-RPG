export interface IResumoEquipamento {
  defesaEquipamento: number;
  penalidadeArmadura: number;
  espacosUsados: number;
  capacidade: number;
  sobrecarregado: boolean;
  conflitos: string[];
}

const numero = (valor: unknown) => {
  const encontrado = String(valor ?? '').match(/[+-]?\d+(?:[.,]\d+)?/);
  return encontrado ? Number(encontrado[0].replace(',', '.')) : 0;
};

export function capacidadeCarga(forca: number, nivel: number): number {
  const modificador = Math.floor((Number(forca || 10) - 10) / 2);
  return Math.max(5, 10 + Math.max(0, modificador) * 2 + Math.floor(Math.max(1, Number(nivel) || 1) / 2));
}

export function resumirEquipamentos(inventarioCentral: any[], ficha: any): IResumoEquipamento {
  const itens = Array.isArray(inventarioCentral) ? inventarioCentral : [];
  const equipados = itens.filter((item) => item?.dados?.equipado);
  const armaduras = equipados.filter((item) => item?.dados?.categoria === 'armadura');
  const escudos = armaduras.filter((item) => String(item?.dados?.subtipo || item?.titulo || '').toLowerCase().includes('escudo'));
  const malhas = armaduras.filter((item) => String(item?.dados?.material || item?.titulo || '').toLowerCase().includes('malha'));
  const principais = armaduras.filter((item) => !escudos.includes(item) && !malhas.includes(item));
  const conflitos: string[] = [];
  if (principais.length > 1) conflitos.push('Equipe no máximo uma armadura principal.');
  if (escudos.length > 1) conflitos.push('Equipe no máximo um escudo.');
  if (malhas.length > 1) conflitos.push('Equipe no máximo uma malha sob a armadura.');
  const validas = [principais[0], malhas[0], escudos[0]].filter(Boolean);
  const defesaEquipamento = validas.reduce((total, item) => total + numero(item?.dados?.defesa ?? item?.dados?.bonus), 0);
  const penalidadeArmadura = validas.reduce((total, item) => total + Math.abs(numero(item?.dados?.penalidade)), 0);
  const espacosUsados = itens.reduce((total, item) => total + Math.max(0, numero(item?.dados?.espacos ?? 1)) * Math.max(1, numero(item?.quantidade ?? 1)), 0);
  const capacidade = capacidadeCarga(Number(ficha?.atributosFinais?.forca) || 10, Number(ficha?.nivel) || 1);
  return { defesaEquipamento, penalidadeArmadura, espacosUsados, capacidade, sobrecarregado: espacosUsados > capacidade, conflitos };
}

export function aplicarResistencia(dano: number, resistencia: number): number {
  return Math.max(0, Math.trunc(Number(dano) || 0) - Math.max(0, Math.trunc(Number(resistencia) || 0)));
}
