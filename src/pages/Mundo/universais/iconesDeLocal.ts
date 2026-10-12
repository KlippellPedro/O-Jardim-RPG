import { Apple, Bell, Castle, Cpu, DoorOpen, Home, Lamp, Landmark, Library, Moon, RadioTower, Route, SunDim, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconeDeLocal } from './identidadesLocal';

/** Cada local tem um ícone no medalhão da ficha e na lista. */
export const ICONES_DE_LOCAL: Record<IconeDeLocal, LucideIcon> = {
  banco: Landmark,
  castelo: Castle,
  rotas: Route,
  torre: RadioTower,
  biblioteca: Library,
  portas: DoorOpen,
  sino: Bell,
  lamparina: Lamp,
  armazem: Warehouse,
  casa: Home,
  pomar: Apple,
  lua: Moon,
  farol: SunDim,
  circuito: Cpu,
};
