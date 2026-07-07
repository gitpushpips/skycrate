import { mulberry32 } from '../rng'
import { makeTerrain, type Terrain, type TerrainParams } from './terrain'
import { SEA_Y, START_AIRPORT, type Airport } from './world'

/**
 * Aérodromes parsemés (3+D) : échantillonnage à distance minimale (type
 * Poisson-disk par rejet), filtrage de site (ni eau, ni trop haut, ni trop
 * pentu), pistes de longueurs variées, biome hérité du climat local, et
 * APLANISSEMENT local du terrain (rectangle orienté au cap + fondu) pour une
 * piste plane intégrée au relief. Déterministe : un seed ⇒ les mêmes
 * aérodromes.
 */
export type BiomeTag = 'prairie' | 'forest' | 'desert' | 'snow'

export interface AirportSite extends Airport {
  biome: BiomeTag
  /** Demi-emprise du pad aplani (marges comprises) — flatten, collider, végétation. */
  padHalfWidth: number
  padHalfLength: number
}

export interface WorldData {
  terrain: Terrain
  /** Aérodromes générés (l'aérodrome de départ, fixe, n'en fait pas partie). */
  airports: AirportSite[]
}

/** Classes de pistes (courte ⇒ court-terrain requis, cf. spec §10). */
const RUNWAY_CLASSES = [
  { length: 120, width: 12 },
  { length: 170, width: 14 },
  { length: 260, width: 18 },
] as const

/** Banque de noms par biome (génériques, aucun nom réel). */
const NAMES: Record<BiomeTag, readonly string[]> = {
  prairie: ['Les Prés', 'Val-Doux', 'Beauchamp', 'La Plaine', 'Les Meules', 'Clocheville'],
  forest: ['Bois-Noir', 'La Clairière', 'Sapinière', 'Chêne-Creux', 'Sous-Bois', 'La Futaie'],
  desert: ['Les Dunes', 'Roc-Rouge', "L'Oasis", 'Pierre-Sèche', 'Mirage', 'Trois-Cactus'],
  snow: ['Col-Blanc', 'Givre', 'Poudreuse', 'Pic-Perdu', 'Congère', 'Verglas'],
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Étiquette de biome depuis le climat (mêmes seuils que la végétation). */
function classifyBiome(t: number, u: number): BiomeTag {
  if (t < 0.16) return 'snow'
  const desertF = smoothstep(0.6, 0.75, t) * (1 - smoothstep(0.3, 0.5, u))
  if (desertF > 0.5) return 'desert'
  if (smoothstep(0.5, 0.7, u) * (1 - desertF) > 0.5) return 'forest'
  return 'prairie'
}

/** Marges du pad aplani autour de la piste. */
const PAD_MARGIN_W = 16
const PAD_MARGIN_L = 24
/** Largeur du fondu pad → relief (m). */
export const PAD_FALLOFF = 60

function generateAirports(raw: Terrain): AirportSite[] {
  const p = raw.params
  const rng = mulberry32((p.seed + 707) >>> 0)
  const sites: AirportSite[] = []
  const usedNames = new Set<string>()
  // Rester dans la zone de pleine élévation (le fondu côtier est en pente).
  const rMax = p.worldRadius * (1 - p.shoreFalloff * 0.6)
  const [sx, , sz] = START_AIRPORT.position

  /** Teste une emprise (centre + cap + classe) : hauteur moyenne ou null si rejet. */
  const probeSite = (x: number, z: number, heading: number, cls: (typeof RUNWAY_CLASSES)[number]) => {
    const ax = Math.sin(heading) // axe de piste (repère monde)
    const az = Math.cos(heading)
    const px = az // perpendiculaire
    const pz = -ax
    const hl = cls.length / 2 + PAD_MARGIN_L
    const hw = cls.width / 2 + PAD_MARGIN_W
    let min = Infinity
    let max = -Infinity
    let sum = 0
    let n = 0
    for (let i = -3; i <= 3; i++) {
      for (let j = -1; j <= 1; j++) {
        const h = raw.heightAt(x + ax * (i / 3) * hl + px * j * hw, z + az * (i / 3) * hl + pz * j * hw)
        if (h < SEA_Y + 4.5) return null // immergé / plage
        min = Math.min(min, h)
        max = Math.max(max, h)
        sum += h
        n++
      }
    }
    const mean = sum / n
    if (mean > p.airportMaxAlt) return null
    // Tolérance proportionnelle à l'emprise : une grande piste accepte plus de
    // dénivelé (le flatten l'absorbe), sinon les 260 m n'existeraient jamais.
    if (max - min > p.airportFlatness * (cls.length / 170)) return null
    return mean
  }

  let attempts = 0
  while (sites.length < p.airportCount && attempts++ < p.airportCount * 300) {
    const r = rMax * Math.sqrt(rng())
    const th = rng() * Math.PI * 2
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    const heading0 = rng() * Math.PI
    const clsIndex = Math.floor(rng() * RUNWAY_CLASSES.length)

    // Espacement minimal (spawn compris).
    if (Math.hypot(x - sx, z - sz) < p.airportMinDist) continue
    if (
      sites.some((s) => Math.hypot(s.position[0] - x, s.position[2] - z) < p.airportMinDist)
    )
      continue

    // Chercher une emprise qui passe : 4 caps essayés, puis repli sur une
    // piste plus courte si le site est trop bosselé pour la classe tirée.
    let cls: (typeof RUNWAY_CLASSES)[number] | null = null
    let heading = heading0
    let mean: number | null = null
    for (let ci = clsIndex; ci >= 0 && mean === null; ci--) {
      for (let hi = 0; hi < 4 && mean === null; hi++) {
        const hTry = heading0 + (hi * Math.PI) / 4
        mean = probeSite(x, z, hTry, RUNWAY_CLASSES[ci])
        if (mean !== null) {
          cls = RUNWAY_CLASSES[ci]
          heading = hTry % Math.PI
        }
      }
    }
    if (mean === null || cls === null) continue
    const hl = cls.length / 2 + PAD_MARGIN_L
    const hw = cls.width / 2 + PAD_MARGIN_W

    const { temperature, humidity } = raw.climateAt(x, z, mean)
    const biome = classifyBiome(temperature, humidity)
    const bank = NAMES[biome]
    let name = bank[Math.floor(rng() * bank.length)]
    if (usedNames.has(name)) name = `${name} II`
    if (usedNames.has(name)) continue
    usedNames.add(name)

    sites.push({
      id: `ap.gen.${sites.length}`,
      name,
      position: [x, mean, z],
      heading,
      runwayLength: cls.length,
      runwayWidth: cls.width,
      biome,
      padHalfWidth: hw,
      padHalfLength: hl,
    })
  }
  return sites
}

/** Terrain enveloppé : aplanit chaque emprise d'aérodrome vers sa hauteur de pad. */
function flattenForAirports(raw: Terrain, sites: AirportSite[]): Terrain {
  if (sites.length === 0) return raw
  const zones = sites.map((s) => {
    const cos = Math.cos(s.heading)
    const sin = Math.sin(s.heading)
    const bound = Math.hypot(s.padHalfWidth, s.padHalfLength) + PAD_FALLOFF + 1
    return {
      x: s.position[0],
      z: s.position[2],
      padH: s.position[1],
      cos,
      sin,
      hw: s.padHalfWidth,
      hl: s.padHalfLength,
      bound2: bound * bound,
    }
  })

  const heightAt = (x: number, z: number): number => {
    let h = raw.heightAt(x, z)
    for (const zn of zones) {
      const dx = x - zn.x
      const dz = z - zn.z
      if (dx * dx + dz * dz > zn.bound2) continue
      // Repère local piste (largeur en x, longueur en z).
      const lx = dx * zn.cos - dz * zn.sin
      const lz = dx * zn.sin + dz * zn.cos
      const dOut = Math.hypot(Math.max(Math.abs(lx) - zn.hw, 0), Math.max(Math.abs(lz) - zn.hl, 0))
      h = lerp(zn.padH, h, smoothstep(0, PAD_FALLOFF, dOut))
    }
    return h
  }

  return {
    params: raw.params,
    heightAt,
    climateAt: (x, z, h = heightAt(x, z)) => raw.climateAt(x, z, h),
  }
}

/**
 * Monde compilé (terrain aplani + aérodromes), mémoïsé par valeur des params :
 * World (rendu) et FlightScene (colliders) partagent la même instance.
 */
let cache: { key: string; world: WorldData } | null = null
export function buildWorld(params: TerrainParams): WorldData {
  const key = JSON.stringify(params)
  if (cache?.key === key) return cache.world
  const raw = makeTerrain(params)
  const airports = generateAirports(raw)
  const world: WorldData = { terrain: flattenForAirports(raw, airports), airports }
  cache = { key, world }
  return world
}
