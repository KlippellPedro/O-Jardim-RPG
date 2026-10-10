/** Os guias das páginas abrem sozinhos na primeira visita. Quem não quer nenhum liga o "pular todos":
 * a preferência vale para todas as páginas e o botão "Guia" de cada uma continua abrindo o seu. */

import { avisar } from '../components/avisos/avisos';
import { usePerformanceStore } from '../store/usePerformanceStore';

export const guiasAutomaticosLigados = (): boolean => usePerformanceStore.getState().guiasAutomaticos !== false;

export function pularTodosOsGuias(): void {
  usePerformanceStore.getState().setEfeito('guiasAutomaticos', false);
  avisar.info('Os guias não abrem mais sozinhos. O botão de guia de cada página continua lá, e dá para religar em Configurações, Preferências.', {
    titulo: 'Guias desligados',
    chave: 'guias-desligados',
  });
}
