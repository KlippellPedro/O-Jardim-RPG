import { ATRIBUTOS, ROTULOS_ATRIBUTOS, modificador } from '../../../services/calculoService';
import { CLASSES_CATALOGO, PERICIAS_CATALOGO, RACAS_CATALOGO } from '../../../services/catalogoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from '../../../services/ajustesFichaService';
import { GRAUS_PERICIA, grausComConcedidos } from '../../../services/periciasFichaService';
import { habilidadesAutomaticas, poderesSelecionados } from '../../../services/progressaoFichaService';
import { nomeExibicaoRaca } from '../../../services/racaService';
import { obterStatusFicha } from '../../../services/statusService';
import { calcularRecompensa, molduraDoCartaz } from './cartaz';

/** Tudo que a ficha impressa e o cartão precisam, já pronto para desenhar. Os
 * dois formatos leem a mesma coisa, então nunca mostram números diferentes. */
export interface IResumoFicha {
  nome: string;
  titulo: string;
  raca: string;
  /** "Guerreiro 5 · Ladino 3" */
  classes: string;
  nivel: number;
  foto: string | null;
  fama: number;
  xp: number;
  recompensa: number;
  /** Chave da moldura na escada do retrato/cartaz ('comum', 'bronze', ..., 'lenda'). */
  tier: string;
  atributos: Array<{ chave: string; rotulo: string; valor: number; mod: number }>;
  recursos: {
    vida: { atual: number | null; maximo: number };
    mana: { atual: number | null; maximo: number };
    estamina: { atual: number | null; maximo: number };
    sanidade: number | null;
    defesa: number;
    iniciativa: number;
    movimento: number;
  };
  pericias: Array<{ titulo: string; grau: string }>;
  poderes: Array<{ titulo: string; custoMana: number; custoEstamina: number; descricao: string }>;
  habilidades: Array<{ titulo: string; origem: string }>;
  inventario: Array<{ titulo: string; quantidade: number; equipado: boolean }>;
  carteira: Array<{ moeda: string; saldo: number }>;
  aliados: string[];
  geradoEm: string;
}

const LIMITE_INVENTARIO = 40;
const LIMITE_PERICIAS = 24;
const GRAU_MINIMO_IMPRESSO = GRAUS_PERICIA.indexOf('treinado');

const capitalizar = (texto: string) => (texto ? texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1) : texto);

const numeroOuNulo = (valor: unknown): number | null => (
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null
);

/** Lê o personagem carregado (ficha, carteira, inventário) e devolve o resumo
 * para impressão. Não grava nada e tolera ficha incompleta. */
export function montarResumoFicha(character: any, agora: Date = new Date()): IResumoFicha {
  const ficha = character?.ficha && typeof character.ficha === 'object' ? character.ficha : {};
  const racaCatalogo = RACAS_CATALOGO.find((raca) => raca.id === ficha.racaId);
  const raca = ficha.racaId
    ? nomeExibicaoRaca(ficha.racaId, ficha.racaNomePersonalizado, racaCatalogo?.titulo) || 'Sem raça'
    : 'Sem raça';

  const slots: Array<{ classeId?: string; id?: string; nivel?: number }> = Array.isArray(ficha.classes) && ficha.classes.length
    ? ficha.classes
    : ficha.classeId ? [{ classeId: ficha.classeId, nivel: ficha.nivel }] : [];
  const classes = slots
    .map((slot) => {
      const classe = CLASSES_CATALOGO.find((item) => item.id === String(slot.classeId || slot.id || ''));
      return classe ? `${classe.titulo} ${Math.max(1, Math.trunc(Number(slot.nivel) || 1))}` : '';
    })
    .filter(Boolean)
    .join(' · ') || 'Sem classe';

  const nivel = Math.max(1, Math.trunc(Number(character?.nivel ?? ficha.nivel) || 1));
  const atributosBase = ficha.atributosFinais && typeof ficha.atributosFinais === 'object' ? ficha.atributosFinais : {};
  const atributos = ATRIBUTOS.map((chave) => {
    const valor = Number(atributosBase[chave] ?? 10)
      + ajusteOrigem(ficha, 'atributo', chave)
      + totalAjustesManuais(ficha, chaveAjuste('atributo', chave));
    return { chave, rotulo: ROTULOS_ATRIBUTOS[chave], valor, mod: modificador(valor) };
  });

  const derivados = ficha.derivados ?? character?.derivados ?? {};
  const status = obterStatusFicha(ficha);
  const vidaMaxima = Number(derivados.vida) || 0;
  const manaMaxima = Number(derivados.mana) || 0;
  const estaminaMaxima = Number(derivados.estamina) || 0;

  const graus = grausComConcedidos(ficha);
  const pericias = PERICIAS_CATALOGO
    .map((pericia) => ({ titulo: pericia.titulo || pericia.id, grau: graus[pericia.id] || 'iniciante' }))
    .filter((pericia) => GRAUS_PERICIA.indexOf(pericia.grau) >= GRAU_MINIMO_IMPRESSO)
    .sort((a, b) => GRAUS_PERICIA.indexOf(b.grau) - GRAUS_PERICIA.indexOf(a.grau) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .slice(0, LIMITE_PERICIAS)
    .map((pericia) => ({ titulo: pericia.titulo, grau: capitalizar(pericia.grau) }));

  const poderes = poderesSelecionados(ficha).map((poder) => ({
    titulo: poder.titulo,
    custoMana: poder.custoMana ?? 0,
    custoEstamina: poder.custoEstamina ?? 0,
    descricao: poder.descricao,
  }));
  const habilidades = habilidadesAutomaticas(ficha)
    .filter((habilidade) => habilidade.subtipo !== 'escolha')
    .map((habilidade) => ({ titulo: habilidade.titulo, origem: habilidade.origem }));

  const inventario = (Array.isArray(character?.inventarioCentral) ? character.inventarioCentral : [])
    .filter((item: any) => item && item.titulo)
    .map((item: any) => ({
      titulo: String(item.titulo),
      quantidade: Math.max(1, Math.trunc(Number(item.quantidade) || 1)),
      equipado: Boolean(item.dados?.equipado),
    }))
    .sort((a: { equipado: boolean; titulo: string }, b: { equipado: boolean; titulo: string }) =>
      Number(b.equipado) - Number(a.equipado) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .slice(0, LIMITE_INVENTARIO);

  const carteira = (Array.isArray(character?.carteira) ? character.carteira : [])
    .filter((moeda: any) => moeda && moeda.moeda && Number(moeda.saldo) !== 0)
    .map((moeda: any) => ({ moeda: String(moeda.moeda), saldo: Number(moeda.saldo) || 0 }));

  const aliados = [
    ...(Array.isArray(ficha.aliados) ? ficha.aliados : []),
    ...(Array.isArray(character?.aliadosCompartilhados) ? character.aliadosCompartilhados : []),
  ]
    .map((aliado: any) => String(aliado?.nome || '').trim())
    .filter(Boolean);

  const fama = Math.max(0, Math.min(5, Math.trunc(Number(ficha.fama) || 0)));
  const foto = typeof (character?.foto ?? ficha.foto) === 'string' && (character?.foto ?? ficha.foto)
    ? String(character?.foto ?? ficha.foto)
    : null;

  return {
    nome: String(character?.nome || 'Desconhecido'),
    titulo: typeof ficha.titulo === 'string' ? ficha.titulo.trim() : '',
    raca,
    classes,
    nivel,
    foto,
    fama,
    xp: Math.max(0, Number(ficha.xp) || 0),
    recompensa: calcularRecompensa(nivel, fama),
    tier: molduraDoCartaz(nivel).chave,
    atributos,
    recursos: {
      vida: { atual: numeroOuNulo(status.vidaAtual), maximo: vidaMaxima },
      mana: { atual: numeroOuNulo(status.manaAtual), maximo: manaMaxima },
      estamina: { atual: numeroOuNulo(status.estaminaAtual), maximo: estaminaMaxima },
      sanidade: numeroOuNulo(status.sanidadeAtual),
      defesa: Number(derivados.defesaNatural) || 0,
      iniciativa: Number(derivados.iniciativa) || 0,
      movimento: Number(derivados.movimento) || 0,
    },
    pericias,
    poderes,
    habilidades,
    inventario,
    carteira,
    aliados,
    geradoEm: agora.toLocaleDateString('pt-BR'),
  };
}

/** Nome de arquivo seguro: sem acento, sem espaço, sem caractere especial. */
export function nomeDeArquivo(nome: string, prefixo: string, extensao: string): string {
  const limpo = String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${prefixo}-${limpo || 'personagem'}.${extensao}`;
}

export const formatarModificador = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));
