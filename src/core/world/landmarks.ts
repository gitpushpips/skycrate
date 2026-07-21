import { mulberry32 } from '../rng'
import { SEA_Y, START_AIRPORT } from './world'
import type { WorldData } from './airports'

/**
 * Repères de paysage (détails du monde) : quelques constructions/formations
 * remarquables posées aux endroits qui s'y prêtent, pour donner au monde des
 * points d'accroche mémorisables (navigation à vue — rappel : le seul repère
 * de cap est le soleil au nord). Déterministes par seed, comme tout le reste.
 *
 * Le choix des sites est un BALAYAGE du terrain avec un score par type : on ne
 * pose pas un repère « au hasard », on cherche l'endroit qui lui correspond
 * (le mât va au point culminant, l'épave sur une plage, etc.).
 */
export type LandmarkKind =
  | 'peakMast' // mât à haubans sur le point culminant
  | 'arch' // arche rocheuse (désert / terrain sec et pentu)
  | 'wreck' // épave échouée sur une plage
  | 'stones' // cercle de pierres levées sur un plateau herbeux

export interface Landmark {
  kind: LandmarkKind
  position: [number, number, number]
  rotY: number
  scale: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Écart minimal entre deux repères (m) — éviter les grappes. */
const MIN_SEPARATION = 500
/** Zone tenue libre autour du spawn (pad + village d'aérodrome). */
const SPAWN_CLEAR = 300

interface Sample {
  x: number
  z: number
  h: number
  slope: number
  t: number
  u: number
}

const cache = new WeakMap<WorldData, Landmark[]>()

export function buildLandmarks(world: WorldData): Landmark[] {
  const hit = cache.get(world)
  if (hit) return hit

  const { terrain } = world
  const R = terrain.params.worldRadius
  const rng = mulberry32((terrain.params.seed + 4242) >>> 0)
  const [spawnX, , spawnZ] = START_AIRPORT.position

  // Emprises d'aérodromes à éviter (mêmes rectangles orientés que le flatten).
  const pads = world.airports.map((a) => ({
    x: a.position[0],
    z: a.position[2],
    cos: Math.cos(a.heading),
    sin: Math.sin(a.heading),
    hw: a.padHalfWidth + 40,
    hl: a.padHalfLength + 40,
  }))
  const inPad = (x: number, z: number) =>
    pads.some((p) => {
      const dx = x - p.x
      const dz = z - p.z
      const lx = dx * p.cos - dz * p.sin
      const lz = dx * p.sin + dz * p.cos
      return Math.abs(lx) < p.hw && Math.abs(lz) < p.hl
    })

  // ——— Balayage : un échantillon tous les ~2R/N mètres ———
  const N = 56
  const step = (R * 2) / N
  const samples: Sample[] = []
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const x = -R + i * step
      const z = -R + j * step
      if (Math.hypot(x, z) > R * 0.98) continue
      if (Math.hypot(x - spawnX, z - spawnZ) < SPAWN_CLEAR) continue
      if (inPad(x, z)) continue
      const h = terrain.heightAt(x, z)
      const e = 8
      const slope =
        Math.hypot(
          terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z),
          terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e),
        ) /
        (2 * e)
      const { temperature, humidity } = terrain.climateAt(x, z, h)
      samples.push({ x, z, h, slope, t: temperature, u: humidity })
    }
  }

  const chosen: Landmark[] = []
  const farEnough = (x: number, z: number) =>
    chosen.every((l) => Math.hypot(l.position[0] - x, l.position[2] - z) > MIN_SEPARATION)

  /**
   * Retient le meilleur site d'un type selon un score (0 = inéligible).
   * `sink` enfonce la base dans le sol : ces structures ont une assise PLATE,
   * or le terrain ne l'est jamais tout à fait — sans ça un côté flotte.
   */
  const place = (kind: LandmarkKind, score: (s: Sample) => number, sink: number, scale = 1) => {
    let best: Sample | null = null
    let bestScore = 0
    for (const s of samples) {
      const v = score(s)
      if (v <= bestScore) continue
      if (!farEnough(s.x, s.z)) continue
      bestScore = v
      best = s
    }
    if (!best) return
    chosen.push({
      kind,
      position: [best.x, terrain.heightAt(best.x, best.z) - sink, best.z],
      rotY: rng() * Math.PI * 2,
      scale,
    })
  }

  // ⚠️ Scores PROGRESSIFS (pas de seuils durs) : la pente est pénalisée en
  // continu plutôt qu'éliminatoire — un site est toujours trouvé, mais le
  // plus plat gagne. Avec des seuils durs, un monde sans site parfait se
  // retrouvait sans repère du tout.

  // Mât : haut ET posable — un sommet à 25° ferait flotter le socle.
  place('peakMast', (s) => (s.h < 30 ? 0 : s.h * (1 - smoothstep(0.1, 0.32, s.slope))), 0.5)

  // Arche rocheuse : terrain sec et chaud, du relief mais une assise tenable.
  place(
    'arch',
    (s) => {
      if (s.h < 12) return 0
      const dry = 1 - smoothstep(0.25, 0.55, s.u)
      const warm = smoothstep(0.45, 0.7, s.t)
      const relief = 0.3 + Math.min(s.slope, 0.4) // un peu de pente = plus spectaculaire
      const posable = 1 - smoothstep(0.32, 0.55, s.slope) // mais pas une paroi
      return dry * warm * relief * posable * (1 + s.h / 60)
    },
    1.2,
  )

  // Épave : plage — juste au-dessus de l'eau et bien plate (à demi ensablée).
  place(
    'wreck',
    (s) => {
      if (s.h < SEA_Y + 0.3 || s.h > SEA_Y + 2.2) return 0
      return (1 - smoothstep(0.02, 0.16, s.slope)) * 2
    },
    0.9,
  )

  // Cercle de pierres : plateau herbeux dégagé, en léger surplomb.
  place(
    'stones',
    (s) => {
      if (s.h < 8) return 0
      const green = smoothstep(0.35, 0.65, s.u) * smoothstep(0.3, 0.6, s.t)
      return green * (1 - smoothstep(0.04, 0.12, s.slope)) * (1 + s.h / 40)
    },
    0.35,
  )

  cache.set(world, chosen)
  return chosen
}
