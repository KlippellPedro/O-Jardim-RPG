import { create } from 'zustand';

// Painel do SettingsMenu (offcanvas de engrenagem) precisa ser aberto tanto
// pelo próprio menu quanto por botões de outras telas (ex.: "Vincular Discord"
// no Cofre abre Minha Conta) - por isso o estado vive num store à parte em vez
// de useState local. Mesas e campanhas não passam por aqui: moram na página da Campanha.
export type SettingsPanelType = 'conta' | 'avisos' | 'preferencias' | null;

interface SettingsPanelState {
  activePanel: SettingsPanelType;
  openPanel: (panel: SettingsPanelType) => void;
  closePanel: () => void;
}

export const useSettingsPanelStore = create<SettingsPanelState>((set) => ({
  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
}));
