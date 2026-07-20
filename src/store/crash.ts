import { create } from 'zustand'

/**
 * État de crash (chantier C1-C5). Alimenté par la détection d'impact de
 * `PlaneRig` (terre : C1 ; eau : C3/C4) ; consommé par le HUD, les effets
 * (explosion + débris C2 / naufrage C4) et le respawn (C5).
 */
export type CrashCause =
  | 'impact' // impact trop dur avec le monde (vitesse d'approche > seuil fatal)
  | 'structure' // pièce non-train au sol à vitesse notable (flanc, ventre, cockpit)
  | 'water' // naufrage (submersion > seuil, C4)

/** Transform + vitesse capturés À l'instant du crash — ancre des effets C2/C4
 *  (les débris héritent de la pose et d'une part de la vitesse). */
export interface CrashPose {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  velocity: [number, number, number]
}

interface CrashState {
  crashed: boolean
  cause: CrashCause | null
  pose: CrashPose | null
  /** Fondu de réapparition en cours (C5) — masque le repositionnement. */
  respawning: boolean
  crash: (cause: CrashCause, pose: CrashPose) => void
  setRespawning: (v: boolean) => void
  reset: () => void
}

export const useCrash = create<CrashState>((set) => ({
  crashed: false,
  cause: null,
  pose: null,
  respawning: false,
  crash: (cause, pose) => set({ crashed: true, cause, pose }),
  setRespawning: (v) => set({ respawning: v }),
  reset: () => set({ crashed: false, cause: null, pose: null, respawning: false }),
}))
