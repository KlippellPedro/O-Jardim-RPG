/** Os guias das páginas abrem sozinhos na primeira visita. Quem não quer nenhum liga o "pular todos":
 * a preferência vale para todas as páginas e o botão "Guia" de cada uma continua abrindo o seu. */

import { avisar } from '../components/avisos/avisos';
import { usePerformanceStore } from '../store/usePerformanceStore';

/** A ficha embutida no painel do mapa (`?embutida=1`) nunca abre guia sozinha: o espaço é pequeno e a mesa está jogando. */
const paginaEmbutida = (): boolean => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('embutida');

export const guiasAutomaticosLigados = (): boolean => !paginaEmbutida() && usePerformanceStore.getState().guiasAutomaticos !== false;

export function pularTodosOsGuias(): void {
  usePerformanceStore.getState().setEfeito('guiasAutomaticos', false);
  avisar.info('Os guias não abrem mais sozinhos. O botão de guia de cada página continua lá, e dá para religar em Configurações, Preferências.', {
    titulo: 'Guias desligados',
    chave: 'guias-desligados',
  });
}
