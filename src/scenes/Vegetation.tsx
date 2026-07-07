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
const SPAWN_CLEAR = 300 // zone dégagée autour du spawn (pad + piste, décor dédié)

type VegType = 'conifer' | 'leafy' | 'cactus' | 'rock'

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
    const pTree = slope < 0.45 ? 0.62 * forestF + 0.05 * (1 - desertF) * (1 - 0.5 * snowF) : 0
    const pCact = slope < 0.5 ? 0.12 * desertF : 0
    const pRock = 0.03 + 0.06 * smoothstep(0.35, 0.8, slope) + 0.02 * snowF + 0.04 * desertF

    let type: VegType
    if (roll < pTree) {
      const coniferShare = 1 - smoothstep(0.45, 0.62, t) // froid → conifères
      type = sub < Math.max(0.25, coniferShare) ? 'conifer' : 'leafy'
    } else if (roll < pTree + pCact) type = 'cactus'
    else if (roll < pTree + pCact + pRock) type = 'rock'
    else continue

    const s = type === 'rock' ? 0.5 + size * 1.1 : 0.75 + size * 0.7
    out.push({ type, x, y: h - 0.12, z, s, rot, tint, snow: snowF })
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
  return { coniferTrunk, coniferFoliage, leafyTrunk, leafyCrown, cactus, rock }
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
    if (!conifTrunk || !conifFol || !lfTrunk || !lfCrown || !cact || !rock) return

    let nConif = 0
    let nLeafy = 0
    let nCact = 0
    let nRock = 0
    for (const list of s.chunks.values()) {
      for (const v of list) {
        tmpP.set(v.x, v.y, v.z)
        tmpQ.setFromEuler(tmpE.set(0, v.rot, 0))
        if (v.type === 'rock') tmpS.set(v.s, v.s * (0.5 + 0.4 * v.tint), v.s)
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
        }
      }
    }
    conifTrunk.count = nConif
    conifFol.count = nConif
    lfTrunk.count = nLeafy
    lfCrown.count = nLeafy
    cact.count = nCact
    rock.count = nRock
    for (const mesh of [conifTrunk, conifFol, lfTrunk, lfCrown, cact, rock]) {
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
    </group>
  )
}
