/**
 * Monde ouvert (spec §10) : grande masse continentale continue bordée d'océan
 * (divergence assumée vs l'archipel d'Aviassembly), relief procédural seedé
 * (cf. `terrain.ts`). Convention de cap : **soleil = NORD = -Z** (`orientation.ts`).
 *
 * 3+A : seul l'aérodrome de départ existe (spawn) ; les autres seront parsemés
 * procéduralement (Poisson-disk + flatten local) en 3+D.
 */
/** Revêtement de piste (S5) : bitume marqué, ou surface naturelle non peinte. */
export type RunwaySurface = 'asphalt' | 'grass' | 'dirt'

export interface Airport {
  id: string
  name: string
  /** Centre de piste (repère monde ; y = TOP_Y). */
  position: readonly [number, number, number]
  /** Cap de la piste (rad, 0 = axe nord-sud/-Z). */
  heading: number
  runwayLength: number
  runwayWidth: number
  /** Revêtement (défaut = bitume si absent). */
  surface?: RunwaySurface
}

/** Altitude de référence du sol au spawn (= piste de départ). */
export const TOP_Y = 0
/** Niveau de la mer. */
export const SEA_Y = -3
/** Rayon du monde ; au-delà = océan puis hors-limites (avertissement + timer, 3+E). */
export const WORLD_RADIUS = 2200

export const AIRPORTS: readonly Airport[] = [
  { id: 'ap.start', name: 'Aérodrome de départ', position: [0, TOP_Y, 0], heading: 0, runwayLength: 340, runwayWidth: 22, surface: 'asphalt' },
]

/** Aéroport de départ (spawn de l'avion). */
export const START_AIRPORT = AIRPORTS[0]
