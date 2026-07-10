import { create } from 'zustand'

/**
 * État de vol affiché par le HUD (étape 6). Mis à jour par PlaneRig à cadence
 * réduite (≈15 Hz) via `useHud.setState(...)` — découple la physique (60 Hz, pas
 * fixe) du rendu DOM du HUD. Le HUD lit via des sélecteurs zustand.
 */
export interface HudState {
  /** Vitesse air (m/s). */
  speed: number
  /** Altitude (m). */
  altitude: number
  /** Carburant restant (unités). */
  fuel: number
  /** Capacité carburant (unités). */
  fuelMax: number
  /** Survitesse structurelle : > 80 % de la vitesse de rupture (règle 5). */
  overspeed: boolean
  /** Une surface a cassé (vitesse > strength×100). */
  broken: boolean
  /** Plus de carburant. */
  outOfFuel: boolean
  /** Train cassé (atterrissage trop dur, S4-D — rupture light). */
  gearBroken: boolean
  /** Train rétractable rentré (G). */
  gearUp: boolean
  /** Position XZ (repère monde) + cap (rad, 0 = nord) — carte + hors-limites (3+E). */
  x: number
  z: number
  heading: number
  /** Compte à rebours hors-limites (s) ; null = dans les limites. */
  oobSeconds: number | null
}

export const useHud = create<HudState>(() => ({
  speed: 0,
  altitude: 0,
  fuel: 0,
  fuelMax: 100,
  overspeed: false,
  broken: false,
  outOfFuel: false,
  gearBroken: false,
  gearUp: false,
  x: 0,
  z: 0,
  heading: 0,
  oobSeconds: null,
}))
