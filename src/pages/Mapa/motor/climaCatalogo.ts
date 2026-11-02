// Os efeitos de clima que o Mestre escolhe. A lista é a mesma do servidor
// (EFEITOS_CLIMA em plataforma/core/mapa.py); um teste trava as duas.

import type { TipoEfeitoClima } from '../../../services/mapaApi';

export const MAX_EFEITOS_CLIMA = 4;

export const EFEITOS_CLIMA: Array<{ id: TipoEfeitoClima; rotulo: string }> = [
  { id: 'chuva', rotulo: 'Chuva' },
  { id: 'tempestade', rotulo: 'Tempestade' },
  { id: 'neve', rotulo: 'Neve' },
  { id: 'neblina', rotulo: 'Neblina' },
  { id: 'areia', rotulo: 'Tempestade de areia' },
  { id: 'cinzas', rotulo: 'Cinzas e brasas' },
  { id: 'folhas', rotulo: 'Folhas' },
  { id: 'escuridao', rotulo: 'Escuridão' },
  { id: 'vazio', rotulo: 'Véu do Vazio' },
  { id: 'fluxo', rotulo: 'Partículas de Fluxo' },
];
