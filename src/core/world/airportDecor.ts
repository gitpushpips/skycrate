import { mulberry32 } from '../rng'
import { START_AIRPORT } from './world'
import {
  classifyBiome,
  PAD_MARGIN_L,
  PAD_MARGIN_W,
  type AirportSite,
  type BiomeTag,
  type WorldData,
} from './airports'

/**
 * Décor d'aérodrome (S5) — DONNÉES pures, déterministes par seed : bâtiments
 * (hangars, tour de contrôle, citernes de carburant, caisses de cargo), feux de
 * bord de piste et gyrophare, colorés PAR BIOME. Le rendu (`AirportDecor.tsx`)
 * instancie chaque archétype en un seul draw call pour TOUS les aérodromes ;
 * la physique (`FlightScene`) pose un collider fixe par bâtiment. Les pads de
 * ravitaillement (avion posé + quasi arrêté ⇒ plein) sortent aussi d'ici.
 */
export type DecorKind =
  | 'apron' // dalle de parking (visuel seul)
  | 'hangar' // corps du hangar
  | 'hangarRoof' // toit à deux pans (prisme)
  | 'hangarDoor' // porte (quad sombre côté piste)
  | 'tower' // fût de la tour de contrôle
  | 'towerCab' // vigie vitrée
  | 'beacon' // gyrophare (pulse animé côté rendu)
  | 'tank' // citerne de carburant (station de ravitaillement)
  | 'crate' // caisse de cargo
  | 'edgeLight' // feu de bord de piste (émissif)

export interface DecorInstance {
  kind: DecorKind
  position: [number, number, number]
  rotY: number
  scale: [number, number, number]
  color?: string
}

/** Collider fixe (cuboïde orienté) d'un bâtiment. */
export interface DecorCollider {
  position: [number, number, number]
  rotY: number
  half: [number, number, number]
}

/** Zone de ravitaillement : rectangle du pad (repère local piste, cf. flatten). */
export interface RefuelPad {
  name: string
  x: number
  z: number
  y: number
  cos: number
  sin: number
  hw: number
  hl: number
}

export interface AirportDecorData {
  items: DecorInstance[]
  colliders: DecorCollider[]
  refuelPads: RefuelPad[]
}

/** Couleurs de bâtiments par biome (hangar / toit) — identité locale lisible. */
const BIOME_STYLE: Record<BiomeTag, { hangar: string; roof: string }> = {
  prairie: { hangar: '#b0503a', roof: '#e8e0cc' }, // grange rouge, toit crème
  forest: { hangar: '#54704a', roof: '#5f4a33' }, // vert sapin, toit brun
  desert: { hangar: '#cdb277', roof: '#b46a45' }, // adobe sable, toit terracotta
  snow: { hangar: '#5f7280', roof: '#e9eef3' }, // gris ardoise, toit enneigé
}

const C_TOWER = '#c9c4b8'
const C_CAB = '#12202e'
const C_TANK = '#d1683a'
const C_CRATE = '#a5793f'
const C_APRON = '#8f959a'

interface SiteLike {
  name: string
  x: number
  z: number
  padH: number
  heading: number
  runwayLength: number
  runwayWidth: number
  biome: BiomeTag
  padHalfWidth: number
  padHalfLength: number
}

/** Génère le décor d'UN aérodrome (repère local : x = travers, z = long de piste). */
function decorateSite(site: SiteLike, seed: number, out: AirportDecorData) {
  const rng = mulberry32((seed ^ Math.round(site.x * 7 + site.z * 13)) >>> 0)
  const cos = Math.cos(site.heading)
  const sin = Math.sin(site.heading)
  const { runwayLength: L, runwayWidth: W, padH } = site
  const e = W / 2 // bord de piste

  /** local (lx travers, ly hauteur, lz long) → monde. */
  const at = (lx: number, ly: number, lz: number): [number, number, number] => [
    site.x + lx * cos + lz * sin,
    padH + ly,
    site.z - lx * sin + lz * cos,
  ]
  const push = (
    kind: DecorKind,
    lx: number,
    ly: number,
    lz: number,
    scale: [number, number, number],
    color?: string,
    localRot = 0,
  ) => {
    out.items.push({ kind, position: at(lx, ly, lz), rotY: site.heading + localRot, scale, color })
  }
  const solid = (lx: number, ly: number, lz: number, half: [number, number, number]) => {
    out.colliders.push({ position: at(lx, ly, lz), rotY: site.heading, half })
  }

  const style = BIOME_STYLE[site.biome]
  const small = L < 160
  const large = L >= 240
  // Le village d'aérodrome vit sur le flanc droit, vers le bout de piste sud
  // (= côté spawn sur l'aérodrome de départ : on voit le décor en démarrant).
  const zC = L * 0.2

  // Dalle de parking (apron).
  const apronL = large ? 40 : 28
  push('apron', e + 14, 0.015, zC, [27, 1, apronL], C_APRON)

  // Hangar(s) : corps + toit à deux pans + porte côté piste.
  const hangars = large ? 2 : 1
  const hs = small ? 0.8 : 1
  for (let i = 0; i < hangars; i++) {
    const hz = zC - 8 + i * 19
    const hw = 13 * hs // largeur (le long de la piste)
    const hd = 11 * hs // profondeur (travers)
    const hh = 4.6 * hs
    const hx = e + 19
    push('hangar', hx, hh / 2, hz, [hd, hh, hw], style.hangar)
    push('hangarRoof', hx, hh, hz, [hd * 1.08, 2.6 * hs, hw * 1.04], style.roof)
    // Porte : quad face à la piste (largeur en X géométrie, tournée de −90°).
    push('hangarDoor', hx - hd / 2 - 0.06, hh * 0.42, hz, [hw * 0.72, hh * 0.8, 1], undefined, -Math.PI / 2)
    solid(hx, (hh + 2.6 * hs) / 2, hz, [hd / 2, (hh + 2.6 * hs) / 2, hw / 2])
  }

  // Tour de contrôle + gyrophare (aérodromes moyens et grands).
  if (!small) {
    const tx = e + 10
    const tz = zC + (large ? 26 : 18)
    const th = large ? 11 : 8.5
    push('tower', tx, 0, tz, [1, th, 1], C_TOWER)
    push('towerCab', tx, th + 1.1, tz, [3.4, 2.2, 3.4], C_CAB)
    push('beacon', tx, th + 2.6, tz, [1, 1, 1])
    solid(tx, (th + 2.2) / 2, tz, [1.8, (th + 2.2) / 2, 1.8])
  }

  // Citerne de carburant = la station de ravitaillement (toujours présente).
  const kx = e + 9
  const kz = zC + apronL / 2 + 4
  push('tank', kx, 0, kz, [1, 1, 1], C_TANK)
  solid(kx, 1.4, kz, [1.6, 1.4, 2.3])

  // Caisses de cargo éparpillées sur l'apron (annonce des missions cargo).
  const nCrates = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < nCrates; i++) {
    const s = 0.9 + rng() * 0.6
    const cx = e + 8 + rng() * 9
    const cz = zC - apronL / 2 + 3 + rng() * (apronL - 6)
    push('crate', cx, s / 2, cz, [s, s, s], C_CRATE, rng() * Math.PI)
    if (rng() < 0.35) push('crate', cx, s + s * 0.35, cz, [s * 0.7, s * 0.7, s * 0.7], C_CRATE, rng() * Math.PI)
  }

  // Feux de bord de piste (émissifs) — les deux rives, tout du long.
  const nL = Math.max(6, Math.round(L / 14))
  for (let i = 0; i <= nL; i++) {
    const lz = -L / 2 + (i / nL) * L
    push('edgeLight', -(e + 1.3), 0.32, lz, [1, 1, 1])
    push('edgeLight', e + 1.3, 0.32, lz, [1, 1, 1])
  }

  // Pad de ravitaillement = l'emprise plate de l'aérodrome.
  out.refuelPads.push({
    name: site.name,
    x: site.x,
    z: site.z,
    y: padH,
    cos,
    sin,
    hw: site.padHalfWidth,
    hl: site.padHalfLength,
  })
}

function siteFromAirport(a: AirportSite): SiteLike {
  return {
    name: a.name,
    x: a.position[0],
    z: a.position[2],
    padH: a.position[1],
    heading: a.heading,
    runwayLength: a.runwayLength,
    runwayWidth: a.runwayWidth,
    biome: a.biome,
    padHalfWidth: a.padHalfWidth,
    padHalfLength: a.padHalfLength,
  }
}

/** Décor de tout le monde (aérodrome de départ + générés), mémoïsé par WorldData. */
const cache = new WeakMap<WorldData, AirportDecorData>()
export function buildAirportDecor(world: WorldData): AirportDecorData {
  const hit = cache.get(world)
  if (hit) return hit

  const out: AirportDecorData = { items: [], colliders: [], refuelPads: [] }
  const seed = world.terrain.params.seed

  // Aérodrome de départ : biome hérité du climat local (comme les générés).
  const [sx, , sz] = START_AIRPORT.position
  const { temperature, humidity } = world.terrain.climateAt(sx, sz)
  decorateSite(
    {
      name: START_AIRPORT.name,
      x: sx,
      z: sz,
      padH: START_AIRPORT.position[1],
      heading: START_AIRPORT.heading,
      runwayLength: START_AIRPORT.runwayLength,
      runwayWidth: START_AIRPORT.runwayWidth,
      biome: classifyBiome(temperature, humidity),
      padHalfWidth: START_AIRPORT.runwayWidth / 2 + PAD_MARGIN_W,
      padHalfLength: START_AIRPORT.runwayLength / 2 + PAD_MARGIN_L,
    },
    seed,
    out,
  )
  for (const a of world.airports) decorateSite(siteFromAirport(a), seed, out)

  cache.set(world, out)
  return out
}
