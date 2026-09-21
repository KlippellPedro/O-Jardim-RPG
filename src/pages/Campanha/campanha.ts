export const COR_PADRAO_CAMPANHA = '#c7a44c';

export interface IIdentidade {
  cor: string | null;
  frase: string;
  tem_capa: boolean;
  capa_em: string | null;
}

/** A cor de destaque da campanha (a dourada do Jardim quando o Mestre não escolheu). */
export function corDaCampanha(identidade?: Partial<IIdentidade> | null): string {
  const cor = identidade?.cor;
  return typeof cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cor) ? cor.toLowerCase() : COR_PADRAO_CAMPANHA;
}

/** URL da capa; `capa_em` muda a cada troca e fura o cache do navegador. */
export function urlDaCapa(campanhaId: string, identidade?: Partial<IIdentidade> | null): string | null {
  if (!identidade?.tem_capa) return null;
  return `/api/v1/campanhas/${encodeURIComponent(campanhaId)}/capa?v=${encodeURIComponent(String(identidade.capa_em ?? '0'))}`;
}

/** "aqui agora há pouco", "visto há 3 h", "visto há 2 dias" ou "ainda não entrou". */
export function textoDeVisita(iso: string | null | undefined, agora: number = Date.now()): string {
  if (!iso) return 'ainda não entrou';
  const tempo = new Date(iso).getTime();
  if (Number.isNaN(tempo)) return 'ainda não entrou';
  const minutos = Math.max(0, Math.floor((agora - tempo) / 60_000));
  if (minutos < 10) return 'aqui agora há pouco';
  if (minutos < 60) return `visto há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `visto há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'visto ontem' : `visto há ${dias} dias`;
}

/** "2 h 05 min" ou "45 min". */
export function textoDeDuracao(minutos: number | null | undefined): string {
  if (!minutos || minutos <= 0) return '';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas > 0 ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${resto} min`;
}

export const ROTULO_PAPEL: Record<string, string> = {
  mestre: 'Mestre',
  assistente: 'Assistente',
  jogador: 'Jogador',
  observador: 'Observador',
};

/** Recorte de capa em faixa 3:1: onde cortar a imagem original (centralizado). */
export function recorteDaCapa(largura: number, altura: number, proporcao = 3): { x: number; y: number; w: number; h: number } {
  if (largura <= 0 || altura <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  const alvoAltura = largura / proporcao;
  if (altura >= alvoAltura) {
    return { x: 0, y: Math.round((altura - alvoAltura) / 2), w: largura, h: Math.round(alvoAltura) };
  }
  const alvoLargura = altura * proporcao;
  return { x: Math.round((largura - alvoLargura) / 2), y: 0, w: Math.round(alvoLargura), h: altura };
}
