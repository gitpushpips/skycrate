/**
 * Monde ouvert (spec §10) : îles séparées par l'océan, aéroports avec pistes de
 * longueurs variées. Convention de cap : **soleil = NORD = -Z** (`orientation.ts`).
 *
 * Modèle « monde minimal » : chaque île est un plateau plat au niveau `TOP_Y`
 * (posable), l'océan est en dessous. Le désert est *gated* (débloqué plus tard) ;
 * on stocke juste le drapeau pour la logique future.
 */
export type Biome = 'green' | 'snow' | 'desert'

export interface Island {
  id: string
  name: string
  biome: Biome
  /** Centre (x, z) dans le repère monde. */
  center: readonly [number, number]
  /** Rayon du plateau (m). */
  radius: number
  /** Accessible d'emblée (le désert est débloqué après les autres — spec §10). */
  gated?: boolean
}

export interface Airport {
  id: string
  name: string
  islandId: string
  /** Centre de piste (repère monde ; y = TOP_Y). */
  position: readonly [number, number, number]
  /** Cap de la piste (rad, 0 = axe nord-sud/-Z). */
  heading: number
  runwayLength: number
  runwayWidth: number
}

/** Altitude du plateau des îles (= sol posable). L'océan est plus bas. */
export const TOP_Y = 0
/** Niveau de l'océan (sous les plateaux). */
export const SEA_Y = -3
/** Rayon du monde ; au-delà = hors-limites (avertissement + timer). */
export const WORLD_RADIUS = 2200

export const ISLANDS: readonly Island[] = [
  { id: 'start', name: 'Île de départ', biome: 'green', center: [0, 0], radius: 150 },
  { id: 'snow', name: 'Île enneigée', biome: 'snow', center: [-520, -680], radius: 165 },
  { id: 'desert', name: 'Base désertique', biome: 'desert', center: [760, 560], radius: 180, gated: true },
]

export const AIRPORTS: readonly Airport[] = [
  // Départ : piste moyenne, plein axe nord-sud.
  { id: 'ap.start', name: 'Aérodrome de départ', islandId: 'start', position: [0, TOP_Y, 0], heading: 0, runwayLength: 170, runwayWidth: 14 },
  // Neige : piste COURTE (court-terrain requis).
  { id: 'ap.snow', name: 'Piste des neiges', islandId: 'snow', position: [-520, TOP_Y, -680], heading: 0.5, runwayLength: 110, runwayWidth: 12 },
  // Désert : piste LONGUE (gros porteurs / jets).
  { id: 'ap.desert', name: 'Base désertique', islandId: 'desert', position: [760, TOP_Y, 560], heading: 1.15, runwayLength: 250, runwayWidth: 18 },
]

/** Aéroport de départ (spawn de l'avion). */
export const START_AIRPORT = AIRPORTS[0]

export function islandById(id: string): Island | undefined {
  return ISLANDS.find((i) => i.id === id)
}
