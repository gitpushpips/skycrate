import { create } from 'zustand'

/**
 * Régime moteur courant (0..1) + postcombustion, partagé entre la jauge du hangar
 * et l'animation des hélices/flammes (`scenes/Plane`). En vol, `PlaneRig` l'écrit
 * depuis la manette réelle ; au hangar, la jauge `ThrottleGauge` le pilote pour
 * prévisualiser. Lu via `getState()` dans les `useFrame` (aucun re-render).
 */
interface ThrottleState {
  /** Régime 0..1 (|throttle|). */
  level: number
  /** Postcombustion active. */
  boost: boolean
  setLevel: (level: number) => void
  setBoost: (boost: boolean) => void
  set: (level: number, boost: boolean) => void
}

export const useThrottle = create<ThrottleState>((set) => ({
  level: 0,
  boost: false,
  setLevel: (level) => set({ level }),
  setBoost: (boost) => set({ boost }),
  set: (level, boost) => set({ level, boost }),
}))
