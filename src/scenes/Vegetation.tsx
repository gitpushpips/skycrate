import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../core/rng'
import { palette } from './palette'
import { SEA_Y, START_AIRPORT } from '../core/world/world'
import type { Terrain } from '../core/world/terrain'
import type { AirportSite } from '../core/world/airports'

/**
 * Végétation par biome (3+C) — instanciée et streamée par chunk (même découpe
 * que le terrain) : conifères/feuillus selon la forêt (humidité), cactus au
 * désert (chaud + sec), rochers sur pentes/déserts/froid. Densités CONTINUES
 * (mêmes champs climat que la couleur du sol) ⇒ les lisières se fondent.
 * 6 draw calls au total (InstancedMesh par archétype), placement déterministe
 * par chunk (seed ⊕ coordonnées) ⇒ un seed = les mêmes arbres.
 */
const CHUNK_SIZE = 256 // même taille que Terrain.tsx
const ATTEMPTS = 70 // candidats par chunk (× densité leva)
const TREE_MAX = 2600 // par type d'arbre
const CACTUS_MAX = 900
const ROCK_MAX = 1600
const BUSH_MAX = 2600
const PALM_MAX = 700
const DEAD_MAX = 700
const BOULDER_MAX = 1100
const SCREE_MAX = 2600
const TUFT_MAX = 2400
const SPAWN_CLEAR = 300 // zone dégagée autour du spawn (pad + piste, décor dédié)
/** Touffes d'herbe : détail de PROXIMITÉ (invisible en altitude) ⇒ semées
 *  partout mais n'écrivent leurs matrices que dans ce rayon autour de la
 *  caméra, sinon le compteur exploserait pour rien. */
const TUFT_RADIUS = 260
const TUFT_ATTEMPTS = 90 // candidats supplémentaires par chunk (herbe rase)

type VegType =
  | 'conifer'
  | 'leafy'
  | 'cactus'
  | 'rock'
  | 'bush' // arbustes : comblent le vide entre l'herbe et les arbres
  | 'palm' // palmiers : littoral chaud
  | 'dead' // arbres morts : lisières froides/sèches
  | 'boulder' // gros blocs : pentes et montagnes
  | 'scree' // pierraille : éboulis de pente et désert
  | 'tuft' // touffes d'herbe : détail au sol

interface VegInstance {
  type: VegType
  x: number
  y: number
  z: number
  s: number
  rot: number
  tint: number
  snow: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Emprise d'aérodrome précalculée (exclusion de végétation). */
interface PadZone {
  x: number
  z: number
  cos: number
  sin: number
  hw: number
  hl: number
  bound2: number
}

function padZones(airports: AirportSite[]): PadZone[] {
  return airports.map((a) => {
    const hw = a.padHalfWidth + 8
    const hl = a.padHalfLength + 8
    const bound = Math.hypot(hw, hl) + 1
    return {
      x: a.position[0],
      z: a.position[2],
      cos: Math.cos(a.heading),
      sin: Math.sin(a.heading),
      hw,
      hl,
      bound2: bound * bound,
    }
  })
}

function inPad(zones: PadZone[], x: number, z: number): boolean {
  for (const zn of zones) {
    const dx = x - zn.x
    const dz = z - zn.z
    if (dx * dx + dz * dz > zn.bound2) continue
    const lx = dx * zn.cos - dz * zn.sin
    const lz = dx * zn.sin + dz * zn.cos
    if (Math.abs(lx) < zn.hw && Math.abs(lz) < zn.hl) return true
  }
  return false
}

function genChunk(
  terrain: Terrain,
  zones: PadZone[],
  snowTemp: number,
  density: number,
  cx: number,
  cz: number,
): VegInstance[] {
  const rng = mulberry32(((cx * 73856093) ^ (cz * 19349663) ^ terrain.params.seed) >>> 0)
  const [sx, , sz] = START_AIRPORT.position
  const out: VegInstance[] = []
  const n = Math.round(ATTEMPTS * density)
  for (let i = 0; i < n; i++) {
    const x = cx * CHUNK_SIZE + rng() * CHUNK_SIZE
    const z = cz * CHUNK_SIZE + rng() * CHUNK_SIZE
    const roll = rng()
    const sub = rng()
    const tint = rng()
    const rot = rng() * Math.PI * 2
    const size = rng()
    if (Math.hypot(x - sx, z - sz) < SPAWN_CLEAR) continue
    if (inPad(zones, x, z)) continue // emprises d'aérodromes : nues
    const h = terrain.heightAt(x, z)
    if (h < SEA_Y + 3) continue // eau + plages : nues
    const e = 4
    const slope =
      Math.hypot(
        terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z),
        terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e),
      ) /
      (2 * e)
    const { temperature: t, humidity: u } = terrain.climateAt(x, z, h)
    const snowF = 1 - smoothstep(snowTemp, snowTemp + 0.1, t)
    const desertF = smoothstep(0.6, 0.75, t) * (1 - smoothstep(0.3, 0.5, u))
    const forestF = smoothstep(0.5, 0.7, u) * (1 - desertF) * (1 - 0.55 * snowF)
    const steepF = smoothstep(0.35, 0.8, slope)
    const coastF = 1 - smoothstep(SEA_Y + 4, SEA_Y + 12, h) // frange littorale
    const pTree = slope < 0.45 ? 0.5 * forestF + 0.04 * (1 - desertF) * (1 - 0.5 * snowF) : 0
    // Palmiers : chaud ET au bord de l'eau — ils donnent son caractère au littoral.
    const pPalm =
      slope < 0.3 ? 0.3 * coastF * smoothstep(0.55, 0.75, t) * (1 - 0.7 * desertF) : 0
    // Arbustes : le couvert le plus commun (y compris armoise du désert).
    const pBush =
      slope < 0.5 ? 0.16 * (1 - desertF) * (1 - 0.7 * snowF) + 0.07 * desertF : 0.03
    // Arbres morts : rares, sur les lisières sèches ou froides.
    const pDead = slope < 0.45 ? 0.03 * (desertF + snowF) * (1 - forestF) : 0
    const pCact = slope < 0.5 ? 0.1 * desertF : 0
    const pRock = 0.025 + 0.04 * steepF + 0.02 * snowF + 0.03 * desertF
    const pBoulder = 0.015 + 0.045 * steepF + 0.02 * snowF
    const pScree = 0.09 * steepF + 0.05 * desertF

    let type: VegType
    let acc = pTree
    if (roll < acc) {
      const coniferShare = 1 - smoothstep(0.45, 0.62, t) // froid → conifères
      type = sub < Math.max(0.25, coniferShare) ? 'conifer' : 'leafy'
    } else if (roll < (acc += pPalm)) type = 'palm'
    else if (roll < (acc += pBush)) type = 'bush'
    else if (roll < (acc += pDead)) type = 'dead'
    else if (roll < (acc += pCact)) type = 'cactus'
    else if (roll < (acc += pBoulder)) type = 'boulder'
    else if (roll < (acc += pRock)) type = 'rock'
    else if (roll < acc + pScree) type = 'scree'
    else continue

    const s =
      type === 'rock' ? 0.5 + size * 1.1
      : type === 'boulder' ? 1.1 + size * 1.9
      : type === 'scree' ? 0.3 + size * 0.5
      : type === 'bush' ? 0.5 + size * 0.6
      : type === 'palm' ? 0.9 + size * 0.5
      : 0.75 + size * 0.7
    out.push({ type, x, y: h - 0.12, z, s, rot, tint, snow: snowF })
  }

  // Herbe rase : passe SÉPARÉE (elle ne doit pas concurrencer les arbres dans
  // le tirage) — dense là où c'est vert, absente au désert, sur la neige et
  // sur les fortes pentes.
  const nT = Math.round(TUFT_ATTEMPTS * density)
  for (let i = 0; i < nT; i++) {
    const x = cx * CHUNK_SIZE + rng() * CHUNK_SIZE
    const z = cz * CHUNK_SIZE + rng() * CHUNK_SIZE
    const roll = rng()
    const rot = rng() * Math.PI * 2
    const size = rng()
    const tint = rng()
    if (Math.hypot(x - sx, z - sz) < SPAWN_CLEAR) continue
    if (inPad(zones, x, z)) continue
    const h = terrain.heightAt(x, z)
    if (h < SEA_Y + 3) continue
    const e = 4
    const slope =
      Math.hypot(
        terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z),
        terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e),
      ) /
      (2 * e)
    if (slope > 0.5) continue
    const { temperature: t, humidity: u } = terrain.climateAt(x, z, h)
    const snowF = 1 - smoothstep(snowTemp, snowTemp + 0.1, t)
    const desertF = smoothstep(0.6, 0.75, t) * (1 - smoothstep(0.3, 0.5, u))
    const grassF = (1 - desertF) * (1 - snowF) * smoothstep(0.12, 0.45, u)
    if (roll > 0.55 * grassF) continue
    out.push({ type: 'tuft', x, y: h - 0.05, z, s: 0.7 + size * 0.7, rot, tint, snow: snowF })
  }
  return out
}

// ——— Géométries (repère local : base au sol, y vers le haut) ———
function makeGeometries() {
  const coniferTrunk = new THREE.CylinderGeometry(0.13, 0.2, 1.3, 5)
  coniferTrunk.translate(0, 0.55, 0)
  const coniferFoliage = new THREE.ConeGeometry(1.25, 2.7, 6)
  coniferFoliage.translate(0, 2.4, 0)
  const leafyTrunk = new THREE.CylinderGeometry(0.12, 0.18, 1.7, 5)
  leafyTrunk.translate(0, 0.75, 0)
  const leafyCrown = new THREE.IcosahedronGeometry(1.15, 0)
  leafyCrown.scale(1, 0.85, 1)
  leafyCrown.translate(0, 2.3, 0)
  const arm1 = new THREE.CylinderGeometry(0.11, 0.13, 0.8, 5)
  arm1.translate(0.42, 1.2, 0)
  const arm2 = new THREE.CylinderGeometry(0.11, 0.13, 0.6, 5)
  arm2.translate(-0.38, 1.0, 0)
  const trunk = new THREE.CylinderGeometry(0.26, 0.3, 1.9, 6)
  trunk.translate(0, 0.95, 0)
  const cactus = mergeGeometries([trunk, arm1, arm2])
  const rock = new THREE.IcosahedronGeometry(0.85, 0)
  rock.translate(0, 0.3, 0)

  // Arbuste : 3 lobes soudés, aplatis — silhouette basse et touffue.
  const bushParts = [
    [0, 0.5, 0, 0.75],
    [0.45, 0.36, 0.2, 0.5],
    [-0.35, 0.4, -0.25, 0.55],
  ].map(([bx, by, bz, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 0)
    g.scale(1, 0.78, 1)
    g.translate(bx, by, bz)
    return g
  })
  const bush = mergeGeometries(bushParts)
  for (const g of bushParts) g.dispose()

  // Palmier : stipe légèrement incliné + couronne de palmes retombantes.
  const palmTrunk = new THREE.CylinderGeometry(0.16, 0.28, 4.4, 6)
  palmTrunk.translate(0, 2.2, 0)
  palmTrunk.rotateZ(0.09)
  const frondParts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const g = new THREE.ConeGeometry(0.42, 2.5, 4)
    g.rotateZ(Math.PI / 2) // couchée, pointe vers +X
    g.translate(1.15, 0, 0)
    g.rotateZ(-0.5) // retombe
    g.rotateY(a)
    g.translate(0, 4.4, 0)
    frondParts.push(g)
  }
  const palmFronds = mergeGeometries(frondParts)
  for (const g of frondParts) g.dispose()

  // Arbre mort : tronc nu + 3 branches sèches.
  const deadParts: THREE.BufferGeometry[] = []
  const dTrunk = new THREE.CylinderGeometry(0.1, 0.2, 2.6, 5)
  dTrunk.translate(0, 1.3, 0)
  deadParts.push(dTrunk)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4
    const g = new THREE.CylinderGeometry(0.05, 0.09, 1.2, 4)
    g.translate(0, 0.6, 0)
    g.rotateZ(0.9)
    g.rotateY(a)
    g.translate(0, 1.5 + i * 0.35, 0)
    deadParts.push(g)
  }
  const dead = mergeGeometries(deadParts)
  for (const g of deadParts) g.dispose()

  // Gros bloc : icosaèdre irrégulier (échelle non uniforme par instance).
  const boulder = new THREE.IcosahedronGeometry(1, 0)
  boulder.translate(0, 0.55, 0)

  // Pierraille : éclat plat.
  const scree = new THREE.IcosahedronGeometry(0.5, 0)
  scree.scale(1.3, 0.42, 1)
  scree.translate(0, 0.1, 0)

  // Touffe d'herbe : 3 lames croisées (2 triangles chacune).
  const tuftParts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 3; i++) {
    const g = new THREE.ConeGeometry(0.11, 0.62, 3)
    g.translate(0, 0.31, 0)
    g.rotateZ((i - 1) * 0.32)
    g.rotateY((i / 3) * Math.PI)
    tuftParts.push(g)
  }
  const tuft = mergeGeometries(tuftParts)
  for (const g of tuftParts) g.dispose()

  return {
    coniferTrunk, coniferFoliage, leafyTrunk, leafyCrown, cactus, rock,
    bush, palmTrunk, palmFronds, dead, boulder, scree, tuft,
  }
}

const trunkMat = new THREE.MeshStandardMaterial({ color: palette.treeTrunk, flatShading: true })
// Blanc + couleur PAR INSTANCE (setColorAt) : teinte de variété + poudrage neige.
const tintMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true })

const C_FOLIAGE = new THREE.Color(palette.treeFoliage)
const C_FOLIAGE_ALT = new THREE.Color(palette.treeFoliageAlt)
const C_SNOW = new THREE.Color(palette.biomeSnow)
const C_CACTUS = new THREE.Color(palette.cactus)
const C_CACTUS_ALT = new THREE.Color('#6da457')
const C_ROCK = new THREE.Color(palette.terrainRock)
const C_BUSH = new THREE.Color('#4f7a3c')
const C_BUSH_DRY = new THREE.Color('#8a8a52') // armoise / buisson sec
const C_PALM = new THREE.Color('#5f9b46')
const C_DEAD = new THREE.Color('#8a7358') // bois mort grisé
const C_GRASS = new THREE.Color('#7fa848')
const C_GRASS_DRY = new THREE.Color('#a8a35c')

const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpE = new THREE.Euler()
const tmpP = new THREE.Vector3()
const tmpS = new THREE.Vector3()
const tmpC = new THREE.Color()

export function Vegetation({
  terrain,
  airports,
  snowTemp,
  density,
  radius,
}: {
  terrain: Terrain
  airports: AirportSite[]
  snowTemp: number
  density: number
  radius: number
}) {
  const geos = useMemo(makeGeometries, [])
  const zones = useMemo(() => padZones(airports), [airports])
  const coniferTrunkRef = useRef<THREE.InstancedMesh>(null)
  const coniferFoliageRef = useRef<THREE.InstancedMesh>(null)
  const leafyTrunkRef = useRef<THREE.InstancedMesh>(null)
  const leafyCrownRef = useRef<THREE.InstancedMesh>(null)
  const cactusRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const bushRef = useRef<THREE.InstancedMesh>(null)
  const palmTrunkRef = useRef<THREE.InstancedMesh>(null)
  const palmFrondsRef = useRef<THREE.InstancedMesh>(null)
  const deadRef = useRef<THREE.InstancedMesh>(null)
  const boulderRef = useRef<THREE.InstancedMesh>(null)
  const screeRef = useRef<THREE.InstancedMesh>(null)
  const tuftRef = useRef<THREE.InstancedMesh>(null)
  const st = useRef({ cell: '', chunks: new Map<string, VegInstance[]>() })

  useEffect(() => {
    st.current = { cell: '', chunks: new Map() }
  }, [terrain, zones, snowTemp, density, radius])

  useFrame(({ camera }) => {
    const s = st.current
    const ccx = Math.floor(camera.position.x / CHUNK_SIZE)
    const ccz = Math.floor(camera.position.z / CHUNK_SIZE)
    const cell = `${ccx},${ccz}`
    if (cell === s.cell) return
    s.cell = cell

    // Chunks voulus autour de la caméra (génération = qq centaines de bruits,
    // assez léger pour tout faire au changement de cellule).
    const r = Math.ceil(radius / CHUNK_SIZE)
    const wanted = new Set<string>()
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = ccx + dx
        const cz = ccz + dz
        const centerX = (cx + 0.5) * CHUNK_SIZE
        const centerZ = (cz + 0.5) * CHUNK_SIZE
        if (Math.hypot(centerX - camera.position.x, centerZ - camera.position.z) > radius) continue
        if (Math.hypot(centerX, centerZ) > terrain.params.worldRadius + CHUNK_SIZE) continue
        const key = `${cx},${cz}`
        wanted.add(key)
        if (!s.chunks.has(key))
          s.chunks.set(key, genChunk(terrain, zones, snowTemp, density, cx, cz))
      }
    }
    for (const key of s.chunks.keys()) if (!wanted.has(key)) s.chunks.delete(key)

    // Réécriture complète des matrices/couleurs (quelques milliers de composes,
    // uniquement au changement de cellule).
    const conifTrunk = coniferTrunkRef.current
    const conifFol = coniferFoliageRef.current
    const lfTrunk = leafyTrunkRef.current
    const lfCrown = leafyCrownRef.current
    const cact = cactusRef.current
    const rock = rockRef.current
    const bush = bushRef.current
    const palmT = palmTrunkRef.current
    const palmF = palmFrondsRef.current
    const dead = deadRef.current
    const boulder = boulderRef.current
    const scree = screeRef.current
    const tuft = tuftRef.current
    if (!conifTrunk || !conifFol || !lfTrunk || !lfCrown || !cact || !rock) return
    if (!bush || !palmT || !palmF || !dead || !boulder || !scree || !tuft) return

    let nConif = 0
    let nLeafy = 0
    let nCact = 0
    let nRock = 0
    let nBush = 0
    let nPalm = 0
    let nDead = 0
    let nBoulder = 0
    let nScree = 0
    let nTuft = 0
    const tuftR2 = TUFT_RADIUS * TUFT_RADIUS
    for (const list of s.chunks.values()) {
      for (const v of list) {
        // Herbe : détail de proximité — ignorée au-delà du rayon court.
        if (v.type === 'tuft') {
          const dx = v.x - camera.position.x
          const dz = v.z - camera.position.z
          if (dx * dx + dz * dz > tuftR2) continue
        }
        tmpP.set(v.x, v.y, v.z)
        tmpQ.setFromEuler(tmpE.set(0, v.rot, 0))
        if (v.type === 'rock') tmpS.set(v.s, v.s * (0.5 + 0.4 * v.tint), v.s)
        else if (v.type === 'boulder') tmpS.set(v.s, v.s * (0.6 + 0.5 * v.tint), v.s * (0.8 + 0.4 * v.tint))
        else if (v.type === 'scree') tmpS.set(v.s * (0.8 + 0.5 * v.tint), v.s, v.s)
        else tmpS.set(v.s, v.s, v.s)
        tmpM.compose(tmpP, tmpQ, tmpS)
        if (v.type === 'conifer' && nConif < TREE_MAX) {
          conifTrunk.setMatrixAt(nConif, tmpM)
          conifFol.setMatrixAt(nConif, tmpM)
          tmpC.copy(C_FOLIAGE).lerp(C_FOLIAGE_ALT, v.tint).lerp(C_SNOW, v.snow * 0.8)
          conifFol.setColorAt(nConif, tmpC)
          nConif++
        } else if (v.type === 'leafy' && nLeafy < TREE_MAX) {
          lfTrunk.setMatrixAt(nLeafy, tmpM)
          lfCrown.setMatrixAt(nLeafy, tmpM)
          tmpC.copy(C_FOLIAGE_ALT).lerp(C_FOLIAGE, v.tint * 0.7).lerp(C_SNOW, v.snow * 0.6)
          lfCrown.setColorAt(nLeafy, tmpC)
          nLeafy++
        } else if (v.type === 'cactus' && nCact < CACTUS_MAX) {
          cact.setMatrixAt(nCact, tmpM)
          tmpC.copy(C_CACTUS).lerp(C_CACTUS_ALT, v.tint)
          cact.setColorAt(nCact, tmpC)
          nCact++
        } else if (v.type === 'rock' && nRock < ROCK_MAX) {
          rock.setMatrixAt(nRock, tmpM)
          tmpC.copy(C_ROCK)
            .multiplyScalar(0.85 + 0.3 * v.tint)
            .lerp(C_SNOW, v.snow * 0.5)
          rock.setColorAt(nRock, tmpC)
          nRock++
        } else if (v.type === 'bush' && nBush < BUSH_MAX) {
          bush.setMatrixAt(nBush, tmpM)
          tmpC.copy(C_BUSH).lerp(C_BUSH_DRY, v.tint).lerp(C_SNOW, v.snow * 0.7)
          bush.setColorAt(nBush, tmpC)
          nBush++
        } else if (v.type === 'palm' && nPalm < PALM_MAX) {
          palmT.setMatrixAt(nPalm, tmpM)
          palmF.setMatrixAt(nPalm, tmpM)
          tmpC.copy(C_PALM).lerp(C_FOLIAGE, v.tint * 0.5)
          palmF.setColorAt(nPalm, tmpC)
          nPalm++
        } else if (v.type === 'dead' && nDead < DEAD_MAX) {
          dead.setMatrixAt(nDead, tmpM)
          tmpC.copy(C_DEAD).multiplyScalar(0.85 + 0.3 * v.tint)
          dead.setColorAt(nDead, tmpC)
          nDead++
        } else if (v.type === 'boulder' && nBoulder < BOULDER_MAX) {
          boulder.setMatrixAt(nBoulder, tmpM)
          tmpC.copy(C_ROCK)
            .multiplyScalar(0.78 + 0.34 * v.tint)
            .lerp(C_SNOW, v.snow * 0.55)
          boulder.setColorAt(nBoulder, tmpC)
          nBoulder++
        } else if (v.type === 'scree' && nScree < SCREE_MAX) {
          scree.setMatrixAt(nScree, tmpM)
          tmpC.copy(C_ROCK)
            .multiplyScalar(0.9 + 0.35 * v.tint)
            .lerp(C_SNOW, v.snow * 0.6)
          scree.setColorAt(nScree, tmpC)
          nScree++
        } else if (v.type === 'tuft' && nTuft < TUFT_MAX) {
          tuft.setMatrixAt(nTuft, tmpM)
          tmpC.copy(C_GRASS).lerp(C_GRASS_DRY, v.tint)
          tuft.setColorAt(nTuft, tmpC)
          nTuft++
        }
      }
    }
    conifTrunk.count = nConif
    conifFol.count = nConif
    lfTrunk.count = nLeafy
    lfCrown.count = nLeafy
    cact.count = nCact
    rock.count = nRock
    bush.count = nBush
    palmT.count = nPalm
    palmF.count = nPalm
    dead.count = nDead
    boulder.count = nBoulder
    scree.count = nScree
    tuft.count = nTuft
    for (const mesh of [conifTrunk, conifFol, lfTrunk, lfCrown, cact, rock,
                        bush, palmT, palmF, dead, boulder, scree, tuft]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh
        ref={coniferTrunkRef}
        args={[geos.coniferTrunk, trunkMat, TREE_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={coniferFoliageRef}
        args={[geos.coniferFoliage, tintMat, TREE_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={leafyTrunkRef}
        args={[geos.leafyTrunk, trunkMat, TREE_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={leafyCrownRef}
        args={[geos.leafyCrown, tintMat, TREE_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={cactusRef}
        args={[geos.cactus, tintMat, CACTUS_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={rockRef}
        args={[geos.rock, tintMat, ROCK_MAX]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh ref={bushRef} args={[geos.bush, tintMat, BUSH_MAX]} castShadow frustumCulled={false} />
      <instancedMesh
        ref={palmTrunkRef}
        args={[geos.palmTrunk, trunkMat, PALM_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={palmFrondsRef}
        args={[geos.palmFronds, tintMat, PALM_MAX]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh ref={deadRef} args={[geos.dead, tintMat, DEAD_MAX]} castShadow frustumCulled={false} />
      <instancedMesh
        ref={boulderRef}
        args={[geos.boulder, tintMat, BOULDER_MAX]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh ref={screeRef} args={[geos.scree, tintMat, SCREE_MAX]} frustumCulled={false} />
      {/* Herbe : ni ombre portée ni réception — c'est du détail de sol, et
          l'ombrer coûterait autant que tout le reste réuni. */}
      <instancedMesh ref={tuftRef} args={[geos.tuft, tintMat, TUFT_MAX]} frustumCulled={false} />
    </group>
  )
}
