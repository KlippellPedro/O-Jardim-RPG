import { usePerformanceStore } from '../store/usePerformanceStore';
import { vibrar as vibrarComPadrao, type TipoDeVibracao } from './vibracao';

/** Vibra se a pessoa não desligou a vibração em Configurações, Preferências. */
export const vibrar = (tipo: TipoDeVibracao): boolean => (
  vibrarComPadrao(tipo, { ligada: usePerformanceStore.getState().vibracao !== false })
);
