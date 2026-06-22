import { create } from 'zustand'
import { J1_AIRCRAFT } from '../core/build/j1'
import type { Aircraft } from '../core/build/graph'

/**
 * État de l'éditeur (Jalon 2) : le graphe d'avion en cours d'édition + le mode
 * (hangar ↔ vol d'essai) + la pièce sélectionnée dans la palette (pour la pose,
 * Jalon 2-C). Le graphe est compilé à la volée par App pour le visuel et la physique.
 */
export type GameMode = 'hangar' | 'flight'

interface BuildState {
  aircraft: Aircraft
  mode: GameMode
  /** Pièce de la palette sélectionnée pour la pose (Jalon 2-C). */
  selectedPartId: string | null
  setMode: (mode: GameMode) => void
  setAircraft: (aircraft: Aircraft) => void
  selectPart: (partId: string | null) => void
}

export const useBuild = create<BuildState>((set) => ({
  aircraft: J1_AIRCRAFT,
  mode: 'hangar',
  selectedPartId: null,
  setMode: (mode) => set({ mode }),
  setAircraft: (aircraft) => set({ aircraft }),
  selectPart: (selectedPartId) => set({ selectedPartId }),
}))
