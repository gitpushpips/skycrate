import { makeFbm2D, type FbmParams } from './noise'
import { SEA_Y, TOP_Y, WORLD_RADIUS, START_AIRPORT } from './world'

/**
 * Terrain procédural (3+A) : heightmap continue seedée, composée de
 *  - collines/vallées : fBm signé (plaines vivantes) ;
 *  - massifs : masque « montagnosité » basse fréquence × crêtes toujours
 *    positives (1-|fBm|) ⇒ montagnes localisées, pas de relief uniforme ;
 *  - bord du monde : la terre fond vers le fond marin (monde fini bordé
 *    d'océan), littoral rendu irrégulier par un wobble du rayon ;
 *  - pad du spawn : disque aplani à TOP_Y autour de l'aérodrome de départ
 *    (curation temporaire — remplacée par le flatten générique des
 *    aérodromes en 3+D).
 *
 * Tout est piloté par `TerrainParams` (exposé en leva, cf. worldControls) :
 * un seed + les mêmes params ⇒ exactement le même monde. 🟡 Toutes les
 * valeurs par défaut sont hors dossier (calibrage feel).
 */
export interface TerrainParams {
  seed: number
  /** Rayon du monde (m) ; au-delà = océan (et hors-limites, 3+E). */
  worldRadius: number
  /** Élévation moyenne des terres au-dessus de TOP_Y (m). */
  baseElevation: number
  /** Collines : longueur d'onde (m) + amplitude (m) du fBm de base. */
  hillWavelength: number
  hillHeight: number
  octaves: number
  gain: number
  lacunarity: number
  /** Massifs : longueur d'onde du masque (m), hauteur ajoutée (m), contraste du masque. */
  mountainWavelength: number
  mountainHeight: number
  mountainSharpness: number
  /** Côte : fraction du rayon sur laquelle la terre fond vers l'océan. */
  shoreFalloff: number
  /** Irrégularité du littoral (0 = continent circulaire). */
  coastWobble: number
}

/** Défauts calibrés au feeling (seed du jour de création du monde). */
export const DEFAULT_TERRAIN: TerrainParams = {
  seed: 20260707,
  worldRadius: WORLD_RADIUS,
  baseElevation: 6,
  hillWavelength: 420,
  hillHeight: 14,
  octaves: 5,
  gain: 0.5,
  lacunarity: 2,
  mountainWavelength: 1500,
  mountainHeight: 110,
  mountainSharpness: 2.2,
  shoreFalloff: 0.3,
  coastWobble: 0.35,
}

/** Pad du spawn : rayon plat + largeur du fondu vers le relief (m). */
export const SPAWN_PAD_RADIUS = 150
export const SPAWN_PAD_FALLOFF = 110

/** Fond marin (sous le niveau de la mer) vers lequel fond le bord du monde. */
const SEA_BED_Y = SEA_Y - 9

export interface Terrain {
  params: TerrainParams
  /** Altitude du sol au point (x, z) du repère monde. */
  heightAt(x: number, z: number): number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

export function makeTerrain(params: TerrainParams): Terrain {
  const p = params
  // Champs de bruit indépendants (seeds décalés, déterministes).
  const hills = makeFbm2D(p.seed)
  const ridges = makeFbm2D(p.seed + 101)
  const mask = makeFbm2D(p.seed + 202)
  const coast = makeFbm2D(p.seed + 303)

  const hillP: FbmParams = {
    octaves: p.octaves,
    frequency: 1 / p.hillWavelength,
    gain: p.gain,
    lacunarity: p.lacunarity,
  }
  // Crêtes un peu plus serrées que le masque (détail des massifs).
  const ridgeP: FbmParams = { octaves: 4, frequency: 2 / p.mountainWavelength, gain: 0.5, lacunarity: 2.1 }
  const maskP: FbmParams = { octaves: 3, frequency: 1 / p.mountainWavelength, gain: 0.5, lacunarity: 2 }
  const coastP: FbmParams = { octaves: 3, frequency: 1 / 900, gain: 0.55, lacunarity: 2 }

  const [sx, , sz] = START_AIRPORT.position

  const heightAt = (x: number, z: number): number => {
    // Montagnosité : masque basse fréquence remappé par smoothstep contrasté
    // (le fBm brut ne sature jamais ±1 ⇒ un simple pow n'atteint jamais 1 et
    // les sommets plafonnaient à ~40 % de mountainHeight). Ici m atteint 1 au
    // cœur des massifs ⇒ mountainHeight ≈ hauteur de sommet réelle.
    const mRaw = 0.5 + 0.5 * mask(x, z, maskP)
    const mWidth = 0.5 / p.mountainSharpness
    const m = smoothstep(0.58 - mWidth, 0.58 + mWidth, mRaw)
    const ridge = Math.pow(1 - Math.abs(ridges(x, z, ridgeP)), 1.6)
    let h =
      TOP_Y + p.baseElevation + hills(x, z, hillP) * p.hillHeight + m * ridge * p.mountainHeight

    // Bord du monde → océan (rayon perturbé pour un littoral organique).
    const d = Math.hypot(x, z) * (1 + p.coastWobble * coast(x, z, coastP))
    const c = 1 - smoothstep(p.worldRadius * (1 - p.shoreFalloff), p.worldRadius, d)
    h = lerp(SEA_BED_Y, h, c)

    // Pad du spawn (plat à TOP_Y, fondu doux vers le relief).
    const dp = Math.hypot(x - sx, z - sz)
    const w = smoothstep(SPAWN_PAD_RADIUS, SPAWN_PAD_RADIUS + SPAWN_PAD_FALLOFF, dp)
    return lerp(TOP_Y, h, w)
  }

  return { params: p, heightAt }
}
