import { create } from 'zustand'

/** Régime réel d'un moteur (animation hélice/flamme), publié par PlaneRig. */
export interface EngineActual {
  level: number
  boost: boolean
}

/**
 * Manette des gaz (S2). Deux couches :
 *
 * CONSIGNE (vol) — régime continu 0..1, rampé au clavier (Maj +, Ctrl −, dans
 * `PlaneRig` au pas fixe) ou glissé aux jauges du HUD (`ui/ThrottlePanel`).
 * `linked` (défaut) : un régime `master` pour tous les moteurs ; délié :
 * `perEngine[nodeId]` par moteur. `reverse` = inverse de poussée (C maintenu).
 *
 * ANIMATION — régime RÉEL par moteur publié par `PlaneRig` (`actual`, avec la
 * postcombustion), lu par les hélices/flammes (`scenes/Plane`) via `getState()`
 * dans les `useFrame` (pas de re-render). Au hangar, la jauge `ThrottleGauge`
 * écrit `level`/`boost` (aperçu global, `actual` vide ⇒ repli global).
 */
interface ThrottleState {
  // Consigne (vol)
  master: number
  linked: boolean
  perEngine: Record<string, number>
  reverse: boolean
  // Animation (réel)
  level: number
  boost: boolean
  actual: Record<string, EngineActual>
  /** Glisser la jauge maître re-lie tous les moteurs. */
  setMaster: (v: number) => void
  /** Glisser une jauge individuelle délie automatiquement. */
  setEngine: (id: string, v: number) => void
  setLinked: (linked: boolean) => void
  setLevel: (level: number) => void
  setBoost: (boost: boolean) => void
  /** Consigne + réels remis à zéro (reset vol / retour hangar). */
  resetCommand: () => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const useThrottle = create<ThrottleState>((set) => ({
  master: 0,
  linked: true,
  perEngine: {},
  reverse: false,
  level: 0,
  boost: false,
  actual: {},
  setMaster: (v) => set({ master: clamp01(v), linked: true }),
  setEngine: (id, v) =>
    set((s) => ({ linked: false, perEngine: { ...s.perEngine, [id]: clamp01(v) } })),
  setLinked: (linked) => set({ linked }),
  setLevel: (level) => set({ level }),
  setBoost: (boost) => set({ boost }),
  resetCommand: () =>
    set({ master: 0, linked: true, perEngine: {}, reverse: false, level: 0, boost: false, actual: {} }),
}))
