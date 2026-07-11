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
  /** Lacs (3+B) : longueur d'onde du champ de bassins (m) + creusement (m). */
  lakeWavelength: number
  lakeDepth: number
  /** Climat (3+C) : longueurs d'onde des champs température/humidité (m). */
  tempWavelength: number
  humidityWavelength: number
  /** Refroidissement par mètre d'altitude (la neige d'altitude en découle). */
  altitudeLapse: number
  /** Aérodromes (3+D) : nombre cible, espacement min (m), altitude max du site
   *  (m) et dénivelé max toléré sur l'emprise avant rejet (m). */
  airportCount: number
  airportMinDist: number
  airportMaxAlt: number
  airportFlatness: number
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
  lakeWavelength: 700,
  lakeDepth: 12,
  tempWavelength: 1600,
  humidityWavelength: 1100,
  altitudeLapse: 0.0045,
  airportCount: 10,
  airportMinDist: 700,
  airportMaxAlt: 55,
  // 7 → 10 (S5) : l'emprise élargie (pistes + marges décor) durcissait le
  // filtre de site — sans ce relèvement, ~5 aérodromes au lieu de ~8.
  airportFlatness: 10,
}

/** Pad du spawn : rayon plat + largeur du fondu vers le relief (m). Rayon
 *  porté à 220 (S5) pour couvrir la piste de départ rallongée (340 m, demi 170). */
export const SPAWN_PAD_RADIUS = 220
export const SPAWN_PAD_FALLOFF = 110

/** Fond marin (sous le niveau de la mer) vers lequel fond le bord du monde. */
const SEA_BED_Y = SEA_Y - 9

/** Climat local, normalisé 0..1 (0 = froid/sec, 1 = chaud/humide). */
export interface Climate {
  temperature: number
  humidity: number
}

export interface Terrain {
  params: TerrainParams
  /** Altitude du sol au point (x, z) du repère monde. */
  heightAt(x: number, z: number): number
  /**
   * Climat au point (x, z) — température (bruit − refroidissement d'altitude)
   * × humidité (bruit indépendant). Passer `h` si déjà connue (évite un
   * recalcul de heightAt).
   */
  climateAt(x: number, z: number, h?: number): Climate
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
  const basins = makeFbm2D(p.seed + 404)
  const temp = makeFbm2D(p.seed + 505)
  const humid = makeFbm2D(p.seed + 606)

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
  const basinP: FbmParams = { octaves: 3, frequency: 1 / p.lakeWavelength, gain: 0.5, lacunarity: 2 }
  const tempP: FbmParams = { octaves: 3, frequency: 1 / p.tempWavelength, gain: 0.5, lacunarity: 2 }
  const humidP: FbmParams = { octaves: 3, frequency: 1 / p.humidityWavelength, gain: 0.5, lacunarity: 2 }

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

    // Lacs (3+B) : bassins localisés creusés dans le relief — là où le terrain
    // est déjà bas (plaines), la dépression passe sous le niveau de la mer et
    // se remplit d'eau ; en zone haute elle ne fait qu'une vallée.
    const b = smoothstep(0.6, 0.78, 0.5 + 0.5 * basins(x, z, basinP))
    h -= b * p.lakeDepth

    // Bord du monde → océan (rayon perturbé pour un littoral organique).
    const d = Math.hypot(x, z) * (1 + p.coastWobble * coast(x, z, coastP))
    const c = 1 - smoothstep(p.worldRadius * (1 - p.shoreFalloff), p.worldRadius, d)
    h = lerp(SEA_BED_Y, h, c)

    // Pad du spawn (plat à TOP_Y, fondu doux vers le relief).
    const dp = Math.hypot(x - sx, z - sz)
    const w = smoothstep(SPAWN_PAD_RADIUS, SPAWN_PAD_RADIUS + SPAWN_PAD_FALLOFF, dp)
    return lerp(TOP_Y, h, w)
  }

  // Étalement des champs climat : le fBm brut sature rarement ±1 (les extrêmes
  // chaud/sec n'existeraient presque pas) → remap smoothstep. La température
  // est remappée BIAISÉE CHAUD : le grand froid devient rare au niveau de la
  // mer, et seule l'altitude (lapse fort) atteint les températures de neige ⇒
  // sommets blancs garantis sans moitié de monde enneigée (plaines neigeuses
  // = seulement le cœur des blobs les plus froids).
  const climateAt = (x: number, z: number, h = heightAt(x, z)): Climate => ({
    temperature: clamp01(
      smoothstep(-0.9, 0.55, temp(x, z, tempP)) - Math.max(0, h - TOP_Y) * p.altitudeLapse,
    ),
    humidity: smoothstep(-0.62, 0.62, humid(x, z, humidP)),
  })

  return { params: p, heightAt, climateAt }
}
