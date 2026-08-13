export interface TreeData {
  id: string;
  deidadeId: string;
  name: string;
  color: string;
  radius: number;
  speed: number;
  modelPath: string;
}

export const BANCO_LUNAR_MODEL_PATH = '/models/props/banco-lunar.glb';
export const BANCO_LUNAR_RADIUS = 50;
export const BANCO_LUNAR_SPEED = 0.025;
export const BANCO_LUNAR_HEIGHT = 6;

/** Metadados leves compartilhados pelas rotas textuais e pelo visualizador 3D. */
export const COSMIC_TREES: readonly TreeData[] = [
  { id: 'limiar', deidadeId: 'mulher-carmesim', name: 'Limiar', color: '#861c30', radius: 0, speed: 0, modelPath: '/models/trees/mulher-carmesim.glb' },
  { id: 'genese', deidadeId: 'aethel', name: 'Gênese', color: '#d6789c', radius: 8, speed: 0.1, modelPath: '/models/trees/aethel.glb' },
  { id: 'eon', deidadeId: 'chronus', name: 'Éon', color: '#a88a48', radius: 12, speed: 0.05, modelPath: '/models/trees/chronus.glb' },
  { id: 'aletheia', deidadeId: 'ousias', name: 'Alétheia', color: '#dec658', radius: 15, speed: 0.12, modelPath: '/models/trees/ousias.glb' },
  { id: 'anima', deidadeId: 'haemus', name: 'Anima', color: '#56ac5c', radius: 18, speed: 0.09, modelPath: '/models/trees/haemus.glb' },
  { id: 'baluarte', deidadeId: 'moros', name: 'Baluarte', color: '#745234', radius: 22, speed: 0.07, modelPath: '/models/trees/moros.glb' },
  { id: 'matriz', deidadeId: 'aperion', name: 'Matriz', color: '#8454bc', radius: 26, speed: 0.06, modelPath: '/models/trees/aperion.glb' },
  { id: 'axis', deidadeId: 'keryx', name: 'A.X.I.S', color: '#35d8ec', radius: 30, speed: 0.15, modelPath: '/models/trees/axis.glb' },
  { id: 'vortice', deidadeId: 'ignis', name: 'Vórtice', color: '#de722a', radius: 35, speed: 0.2, modelPath: '/models/trees/ignis.glb' },
  { id: 'abismo', deidadeId: 'erebus', name: 'Abismo', color: '#221e28', radius: 40, speed: 0.08, modelPath: '/models/trees/erebus.glb' },
];
