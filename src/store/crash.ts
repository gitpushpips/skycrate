import { create } from 'zustand'

/**
 * État de crash (chantier C1-C5). Alimenté par la détection d'impact de
 * `PlaneRig` (terre : C1 ; eau : C3/C4) ; consommé par le HUD, les effets
 * (explosion C2 / naufrage C4) et le respawn (C5).
 */
export type CrashCause =
  | 'impact' // impact trop dur avec le monde (vitesse d'approche > seuil fatal)
  | 'structure' // pièce non-train au sol à vitesse notable (flanc, ventre, cockpit)
  | 'water' // naufrage (submersion > seuil, C4)

interface CrashState {
  crashed: boolean
  cause: CrashCause | null
  /** Position du crash (repère monde) — ancre des effets visuels. */
  position: [number, number, number]
  crash: (cause: CrashCause, position: [number, number, number]) => void
  reset: () => void
}

export const useCrash = create<CrashState>((set) => ({
  crashed: false,
  cause: null,
  position: [0, 0, 0],
  crash: (cause, position) => set({ crashed: true, cause, position }),
  reset: () => set({ crashed: false, cause: null, position: [0, 0, 0] }),
}))
